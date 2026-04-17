import Employee from "../models/Employee.js";
import Company from "../models/Company.js";

/* =========================
   STOP WORDS (NOISE REMOVE)
========================= */
const STOP_WORDS = new Set([
    "i", "want", "looking", "for", "in", "the", "at", "to", "a", "an",
    "is", "are", "of", "on", "and", "job", "role", "employees", "company", "companies", "people", "search", "find", "with", "that", "this", "list",
    "show", "me", "all", "any", "some", "my", "your", "his", "her", "its", "our", "their", "what", "which", "who", "whom", "whose", "where", "when", "why", "how",
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
           STEP 2: EXPAND KEYWORDS
        ========================= */
        let expanded = [];

        tokens.forEach(t => {
            expanded.push(...expandWord(t));
        });

        expanded = [...new Set(expanded)];

        /* =========================
           STEP 3: SMART QUERY (SAFE)
        ========================= */
        const smartQuery = tokens.length
            ? buildSmartQuery(tokens)
            : {};

        /* =========================
           STEP 4: BASE FILTERS
        ========================= */
        let employeeFilter = { ...smartQuery };
        let companyFilter = { ...smartQuery };

        console.log("REQ QUERY:", req.query);
        console.log("EMP FILTER BEFORE:", employeeFilter);

        // 🔥 DIRECT FILTERS (IMPORTANT FIX)
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
           STEP 5: FETCH DATA
        ========================= */
        let results = [];

        if (type === "companies") {
            results = await Company.find(companyFilter).limit(100);
        } else {
            results = await Employee.find(employeeFilter).limit(100);
        }

        /* =========================
           STEP 6: RANKING
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