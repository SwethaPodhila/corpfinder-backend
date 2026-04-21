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
    hr: ["hr","hrs","hr's" ,"human resource", "human resources", "hr manager", "hr managers"],
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

        /* =========================
           STEP 1: CLEAN QUERY
        ========================= */
        const tokens = tokenize(query);

        if (!query || tokens.length === 0) {
            return res.json({
                msg: "Please enter a valid search keyword 🔍",
                results: []
            });
        }

        /* =========================
           STEP 2: EXPAND KEYWORDS
        ========================= */
        let expanded = [];
        tokens.forEach(t => expanded.push(...expandWord(t)));
        expanded = [...new Set(expanded)];

        const smartQuery = buildSmartQuery(tokens);

        let employeeFilter = { ...smartQuery };
        let companyFilter = { ...smartQuery };

        /* =========================
           STEP 3: DIRECT FILTERS
        ========================= */
        if (designation) {
            employeeFilter.designation = new RegExp(designation, "i");
        }

        if (industry) {
            employeeFilter.industry = new RegExp(industry, "i");
        }

        if (country) {
            employeeFilter.country = new RegExp(country, "i");
            companyFilter.country = new RegExp(country, "i");
        }

        if (state) {
            employeeFilter.state = new RegExp(state, "i");
            companyFilter.state = new RegExp(state, "i");
        }

        if (city) {
            employeeFilter.city = new RegExp(city, "i");
            companyFilter.city = new RegExp(city, "i");
        }

        /* =========================
           STEP 4: FETCH DATA
        ========================= */
        let results = [];

        if (type === "companies") {
            results = await Company.find(companyFilter).limit(100);
        } else {
            results = await Employee.find(employeeFilter).limit(100);
        }

        /* =========================
           STEP 5: RANKING
        ========================= */
        results = results.sort((a, b) => {
            const aText = JSON.stringify(a).toLowerCase();
            const bText = JSON.stringify(b).toLowerCase();

            let aScore = 0;
            let bScore = 0;

            expanded.forEach(k => {
                if (aText.includes(k)) aScore++;
                if (bText.includes(k)) bScore++;
            });

            return bScore - aScore;
        });

        /* =========================
           STEP 6: SAVE HISTORY (FIXED)
           - only when user exists
           - only when results > 0
           - no duplicates
        ========================= */
        if (req.userId && results.length > 0) {

            const existing = await SearchHistory.findOne({
                userId: req.userId,
                query: query.trim()
            });

            if (!existing) {
                await SearchHistory.create({
                    userId: req.userId,
                    query: query.trim(),
                    resultCount: results.length
                });
            }

            const count = await SearchHistory.countDocuments({
                userId: req.userId
            });

            if (count > 30) {
                const oldest = await SearchHistory.find({ userId: req.userId })
                    .sort({ createdAt: 1 })
                    .limit(count - 30);

                const idsToDelete = oldest.map(item => item._id);

                await SearchHistory.deleteMany({
                    _id: { $in: idsToDelete }
                });
            }
        }

        /* =========================
           FINAL RESPONSE
        ========================= */
        res.json(results);

    } catch (err) {
        console.log(err);
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