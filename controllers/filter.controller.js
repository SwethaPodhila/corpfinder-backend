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
        const { query = "" } = req.query;

        console.log("🔥 Incoming Query:", query);

        /* ================= STOP WORDS ================= */
        const STOP_WORDS = new Set([
            "i", "want", "looking", "for", "in", "the", "at", "to", "a", "an",
            "need", "find", "city", "state", "country", "industry", "designation",
            "work", "with", "iam", "is", "are", "of", "on", "and", "job", "role",
            "employees", "company", "companies", "people", "search", "find",
            "that", "this", "list", "show", "me", "all", "any", "some"
        ]);

        /* ================= TOKENIZE ================= */
        const tokens = query
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter(w => w && !STOP_WORDS.has(w));

        console.log("🧠 Clean Tokens:", tokens);

        if (!tokens.length) {
            return res.json({ success: true, data: [] });
        }

        /* ================= FETCH EMPLOYEES ================= */
        const employees = await Employee.find({});

        console.log("📦 TOTAL EMPLOYEES:", employees.length);

        /* ================= SCORING ================= */
        const scored = employees.map(emp => {

            const text = [
                emp.first_name,
                emp.last_name,
                emp.designation,
                emp.company_name,
                emp.company_industry,
                emp.city,
                emp.state,
                emp.country
            ].join(" ").toLowerCase();

            let score = 0;

            tokens.forEach(t => {
                if (text.includes(t)) {
                    score++;
                }
            });

            return {
                ...emp.toObject(),
                score
            };
        });

        /* ================= FILTER + SORT ================= */
        const filtered = scored
            .filter(emp => emp.score >= 1)
            .sort((a, b) => b.score - a.score);

        console.log("🎯 FINAL RESULTS:", filtered.length);

        /* ================= SAVE SEARCH HISTORY ================= */
        if (req.userId) {
            try {
                const normalizedQuery = query.trim().toLowerCase();

                // 🔍 check last search by same user
                const lastSearch = await SearchHistory.findOne({ userId: req.userId })
                    .sort({ createdAt: -1 });

                // 🚫 if same query as last time → don't save
                if (lastSearch && lastSearch.query.toLowerCase() === normalizedQuery) {
                    console.log("⛔ Duplicate search ignored");
                } else {
                    await SearchHistory.create({
                        userId: req.userId,
                        query: normalizedQuery,
                        resultCount: filtered.length
                    });

                    console.log("📝 Search history saved");
                }

            } catch (err) {
                console.log("⚠️ History save failed:", err.message);
            }
        }

        return res.json({
            success: true,
            data: filtered
        });

    } catch (err) {
        console.log("❌ ERROR:", err);
        res.status(500).json({
            success: false,
            msg: "Search failed"
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