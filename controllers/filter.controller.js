import Employee from "../models/EmployeeCompany.js";
import SearchHistory from "../models/History.js";

/* =========================
   STOP WORDS (NOISE REMOVE)
========================= */
const STOP_WORDS = new Set([
    "i", "want", "looking", "for", "in", "the", "at", "to", "a", "an", "need", "find", "city", "state", "country", "industry", "designation", "work", "with",
    "iam", "is", "are", "of", "on", "and", "job", "role", "employees", "company", "companies", "people", "search", "find", "with", "that", "this", "list",
    "show", "me", "all", "any", "some", "my", "your", "his", "her", "its", "our", "their", "what", "which", "who", "whom", "whose", "where", "when", "why", "how",
]);

/* =========================
   DESIGNATION MAP (IMPORTANT FIX)
========================= */
const DESIGNATION_MAP = {
    developer: [
        "developer", "developers",
        "software developer", "software developers",
        "software engineer", "software engineers",
        "programmer", "programmers",
        "coder", "coders"
    ],
    manager: ["manager", "managers", "project manager", "project managers", "product manager", "product managers"],
    hr: ["hr", "hrs", "hr's", "human resource", "human resources", "hr manager", "hr managers"],
    analyst: ["analyst", "analysts", "data analyst", "data analysts", "business analyst", "business analysts"],
    consultant: ["consultant", "consultants", "business consultant", "business consultants", "management consultant", "management consultants"],
    ceo: ["ceo", "chief executive officer", "founder", "co-founder", "owner"],
    cto: ["cto", "chief technology officer", "chief technical officer"],
    cfo: ["cfo", "chief financial officer"],
    coo: ["coo", "chief operating officer"],
};

/* =========================
   TOKENIZER (CLEAN INPUT)
========================= */
const tokenize = (text) => {
    if (!text) return [];

    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w && !STOP_WORDS.has(w));
};

/* =========================
   EXPAND SYNONYMS
========================= */
/*const expandWord = (word) => {
    for (let key in DESIGNATION_MAP) {
        if (DESIGNATION_MAP[key].includes(word)) {
            return DESIGNATION_MAP[key];
        }
    }
    return [word];
};

/* =========================
   SMART QUERY BUILDER
========================= */
/*const buildSmartQuery = (tokens) => {
    if (!tokens.length) return {};

    return {
        $and: tokens.map(word => {
            const variations = expandWord(word); // synonyms

            return {
                $or: variations.map(v => ({
                    $or: [
                        { name: new RegExp(v, "i") },
                        { designation: new RegExp(v, "i") },
                        { company: new RegExp(v, "i") },
                        { industry: new RegExp(v, "i") },
                        { city: new RegExp(v, "i") },
                        { state: new RegExp(v, "i") },
                        { country: new RegExp(v, "i") },
                        { email: new RegExp(v, "i") },
                        { description: new RegExp(v, "i") }
                    ]
                }))
            };
        })
    };
}; */

/* =========================
   SMART SEARCH API (FIXED)
========================= */
export const searchData = async (req, res) => {
    try {

        const {
            query = "",
            country = "",
            state = "",
            city = "",
            designation = "",
            industry = "",
            page = 1,
            limit = 50
        } = req.query;

        console.log("🔥 Incoming Query:", query);

        console.log("🎯 Filters:", {
            country,
            state,
            city,
            designation,
            industry
        });

        const STOP_WORDS = new Set([
            "i", "want", "looking", "for", "in", "the", "at", "to", "a", "an",
            "need", "find", "city", "state", "country", "industry", "designation",
            "work", "with", "iam", "is", "are", "of", "on", "and", "job", "role",
            "employees", "company", "companies", "people", "search", "find",
            "that", "this", "list", "show", "me", "all", "any", "some"
        ]);

        /* =======================================================
           CLEAN TOKENS
        ======================================================= */

        const tokens = query
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter(word => word && !STOP_WORDS.has(word));

        console.log("🧠 TOKENS:", tokens);

        const escapeRegex = (text) =>
            text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        /* =======================================================
           BUILD QUERY
        ======================================================= */

        const andConditions = [];

        /* ---------------- QUERY TOKENS (AND LOGIC) ---------------- */

        tokens.forEach(token => {

            const regex = new RegExp(escapeRegex(token), "i");

            andConditions.push({
                $or: [
                    { first_name: regex },
                    { last_name: regex },
                    { designation: regex },
                    { company_name: regex },
                    { company_industry: regex },
                    { city: regex },
                    { state: regex },
                    { country: regex }
                ]
            });

        });

        /* ---------------- FILTERS ---------------- */

        if (country) {
            andConditions.push({
                country: new RegExp(escapeRegex(country), "i")
            });
        }

        if (state) {
            andConditions.push({
                state: new RegExp(escapeRegex(state), "i")
            });
        }

        if (city) {
            andConditions.push({
                city: new RegExp(escapeRegex(city), "i")
            });
        }

        if (designation) {
            andConditions.push({
                designation: new RegExp(escapeRegex(designation), "i")
            });
        }

        if (industry) {
            andConditions.push({
                company_industry: new RegExp(escapeRegex(industry), "i")
            });
        }

        /* =======================================================
           FINAL MONGO QUERY
        ======================================================= */

        const mongoQuery =
            andConditions.length > 0
                ? { $and: andConditions }
                : {};

        console.log(
            "🔥 Mongo Query:",
            JSON.stringify(mongoQuery, null, 2)
        );

        /* =======================================================
           PAGINATION
        ======================================================= */

        const pageNumber = Math.max(parseInt(page), 1);

        const limitNumber = Math.min(
            Math.max(parseInt(limit), 1),
            100
        );

        const skip = (pageNumber - 1) * limitNumber;

        /* =======================================================
           DATABASE SEARCH
        ======================================================= */

        const [finalResults, totalResults] = await Promise.all([

            Employee.find(mongoQuery)
                .skip(skip)
                .limit(limitNumber)
                .lean(),

            Employee.countDocuments(mongoQuery)

        ]);

        console.log("🎯 RESULTS:", finalResults.length);
        console.log("📦 TOTAL RESULTS:", totalResults);

        /* =======================================================
           SAVE SEARCH HISTORY
        ======================================================= */

        const userId = req.userId;

        console.log("👤 USER ID:", userId);

        if (userId && query.trim()) {

            const normalizedQuery = query.trim().toLowerCase();

            const existingSearch = await SearchHistory.findOne({
                userId,
                query: normalizedQuery
            });

            if (existingSearch) {

                /* UPDATE EXISTING SEARCH */

                await SearchHistory.updateOne(
                    { _id: existingSearch._id },
                    {
                        $set: {
                            resultCount: totalResults,
                            updatedAt: new Date()
                        },
                        $inc: {
                            searchCount: 1
                        }
                    }
                );

                console.log("🟡 SEARCH HISTORY UPDATED");

            } else {

                /* CREATE NEW SEARCH */

                await SearchHistory.create({
                    userId,
                    query: normalizedQuery,
                    originalQuery: query,
                    resultCount: totalResults,
                    searchCount: 1
                });

                console.log("🟢 SEARCH HISTORY SAVED");

            }
        }

        /* =======================================================
           RESPONSE
        ======================================================= */

        return res.status(200).json({
            success: true,

            pagination: {
                currentPage: pageNumber,
                totalPages: Math.ceil(totalResults / limitNumber),
                totalResults,
                limit: limitNumber
            },

            data: finalResults
        });

    } catch (err) {
        console.log("❌ ERROR:", err);

        return res.status(500).json({
            success: false,
            msg: "Search failed",
            error: err.message
        });

    }
};

/* =========================
   GET FILTERS
========================= */
export const getFilters = async (req, res) => {
    try {
        const industries = await Employee.distinct("industry");
        const designations = await Employee.distinct("designation");

        const countries = await Employee.distinct("country");
        const states = await Employee.distinct("state");
        const cities = await Employee.distinct("city");

        res.json({
            industries: industries.filter(Boolean),
            designations: designations.filter(Boolean),
            countries: countries.filter(Boolean),
            states: states.filter(Boolean),
            cities: cities.filter(Boolean)
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Failed to load filters ❌" });
    }
};

export const getSearchHistory = async (req, res) => {
    try {
        const history = await SearchHistory.find({
            userId: req.userId
        })
            .sort({ createdAt: -1 })
            .limit(30);

        res.json(history);

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Failed to fetch history" });
    }
};

export const deleteSearchHistory = async (req, res) => {
    try {
        await SearchHistory.deleteOne({
            _id: req.params.id,
            userId: req.userId
        });

        res.json({ msg: "Deleted successfully" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Delete failed" });
    }
};

export const clearSearchHistory = async (req, res) => {
    try {
        await SearchHistory.deleteMany({
            userId: req.userId
        });

        res.json({ msg: "History cleared" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Clear failed" });
    }
};