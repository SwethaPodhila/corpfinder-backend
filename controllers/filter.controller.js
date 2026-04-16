import Employee from "../models/Employee.js";
import Company from "../models/Company.js";

/* =========================
   STOP WORDS (NOISE REMOVE)
========================= */
const STOP_WORDS = new Set([
    "i", "want", "looking", "for", "in", "the", "at", "to", "a", "an",
    "is", "are", "of", "on", "and", "job", "role"
]);

/* =========================
   DESIGNATION MAP (IMPORTANT FIX)
========================= */
const DESIGNATION_MAP = {
    manager: ["manager", "managers"],
    hr: ["hr", "human resource", "human resources"],
    developer: ["developer", "software developer", "software engineer", "programmer"],
    analyst: ["analyst", "analysts"],
    consultant: ["consultant", "consultants"],
    ceo: ["ceo", "chief executive officer"]
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
const buildSmartQuery = (keywords) => {
    if (!keywords.length) return {};

    return {
        $and: keywords.map(word => ({
            $or: [
                { name: new RegExp(word, "i") },
                { designation: new RegExp(word, "i") },
                { company: new RegExp(word, "i") },
                { industry: new RegExp(word, "i") },
                { city: new RegExp(word, "i") },
                { state: new RegExp(word, "i") },
                { country: new RegExp(word, "i") },
                { email: new RegExp(word, "i") },
                { description: new RegExp(word, "i") }
            ]
        }))
    };
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

        /* =========================
           STEP 2: EXPAND DESIGNATION
        ========================= */
        let expanded = [];

        tokens.forEach(t => {
            expanded.push(...expandWord(t));
        });

        expanded = [...new Set(expanded)];

        /* =========================
           STEP 3: BUILD QUERY
        ========================= */
        const smartQuery = buildSmartQuery(expanded);

        let employeeFilter = { ...smartQuery };
        let companyFilter = { ...smartQuery };

        /* =========================
           STEP 4: APPLY FILTERS
        ========================= */
        if (industry) {
            employeeFilter.industry = new RegExp(industry, "i");
        }

        if (designation) {
            employeeFilter.designation = new RegExp(designation, "i");
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
           STEP 5: FETCH DATA
        ========================= */
        let results = [];

        if (type === "companies") {
            results = await Company.find(companyFilter).limit(100);
        } else {
            results = await Employee.find(employeeFilter).limit(100);
        }

        /* =========================
           STEP 6: RELEVANCE RANKING
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

        res.json(results);

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Search failed ❌" });
    }
};