import Employee from "../models/Employee.js";
import Company from "../models/Company.js";
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
const expandWord = (word) => {
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
const buildSmartQuery = (tokens) => {
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
};

/* =========================
   SMART SEARCH API (FIXED)
========================= */
export const searchData = async (req, res) => {
    try {
        const {
            query = "",
            type = "people",
            industry,
            designation,
            country,
            state,
            city
        } = req.query;

       // console.log("🔥 Incoming Query:", req.query);

        /* =========================
           STOP WORDS
        ========================= */
        const STOP_WORDS = new Set([
            "i", "want", "looking", "for", "in", "the", "at", "to", "a", "an", "need",
            "find", "city", "state", "country", "industry", "designation", "and",
            "is", "are", "of", "on", "with", "me", "show", "all", "any", "some"
        ]);

        /* =========================
           TOKENIZE (CLEAN INPUT)
        ========================= */
        const tokens = query
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter(w => w && !STOP_WORDS.has(w));

        //console.log("🧠 Tokens:", tokens);

        if (!query || tokens.length === 0) {
            return res.json({
                msg: "Please enter valid keyword",
                data: []
            });
        }

        /* =========================
           PHRASE MATCH (IMPORTANT)
        ========================= */
        const phraseMatch = query.match(/"([^"]+)"/);
        const phrase = phraseMatch ? phraseMatch[1] : null;

        //console.log("📌 Phrase:", phrase);

        /* =========================
           EMPLOYEE FILTER (STRICT AND LOGIC)
        ========================= */
        let employeeFilter = {
            $and: tokens.map(t => ({
                $or: [
                    { first_name: new RegExp(t, "i") },
                    { last_name: new RegExp(t, "i") },
                    { designation: new RegExp(t, "i") },
                    { company_name: new RegExp(t, "i") },
                    { city: new RegExp(t, "i") },
                    { state: new RegExp(t, "i") },
                    { country: new RegExp(t, "i") }
                ]
            }))
        };

        /* =========================
           COMPANY FILTER
        ========================= */
        let companyFilter = {
            $and: tokens.map(t => ({
                $or: [
                    { company_name: new RegExp(t, "i") },
                    { company_industry: new RegExp(t, "i") },
                    { company_city: new RegExp(t, "i") },
                    { company_state: new RegExp(t, "i") },
                    { company_country: new RegExp(t, "i") }
                ]
            }))
        };

        /* =========================
           FILTER EXTENSIONS (UI FILTERS)
        ========================= */
        if (designation) {
            employeeFilter.$and.push({
                designation: new RegExp(designation, "i")
            });
        }

        if (industry) {
            companyFilter.$and.push({
                company_industry: new RegExp(industry, "i")
            });
        }

        if (country) {
            employeeFilter.$and.push({ country: new RegExp(country, "i") });
            companyFilter.$and.push({ company_country: new RegExp(country, "i") });
        }

        if (state) {
            employeeFilter.$and.push({ state: new RegExp(state, "i") });
            companyFilter.$and.push({ company_state: new RegExp(state, "i") });
        }

        if (city) {
            employeeFilter.$and.push({ city: new RegExp(city, "i") });
            companyFilter.$and.push({ company_city: new RegExp(city, "i") });
        }

        /* =========================
           FETCH DATA
        ========================= */
        let results;

        if (type === "companies") {
            results = await Company.find(companyFilter).limit(100);
        } else {
            results = await Employee.find(employeeFilter).limit(100);
        }

        console.log("📦 RESULTS:", results.length);

        /* =========================
           SMART RANKING (NO JSON STRINGIFY)
        ========================= */
        const scoreText = (obj) => {
            const text = [
                obj.first_name,
                obj.last_name,
                obj.designation,
                obj.company_name,
                obj.company_industry,
                obj.city,
                obj.state,
                obj.country
            ].join(" ").toLowerCase();

            return tokens.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
        };

        results = results.sort((a, b) => scoreText(b) - scoreText(a));

        /* =========================
           RESPONSE
        ========================= */
        return res.json({
            success: true,
            data: results
        });

    } catch (err) {
        console.log("❌ ERROR:", err);
        res.status(500).json({ msg: "Search failed ❌" });
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