import Employee from "../models/Employee.js";
import Company from "../models/Company.js";

/* =========================
   GET FILTERS
========================= */
export const getFilters = async (req, res) => {
    try {
        const industries = await Employee.distinct("industry");
        const designations = await Employee.distinct("designation");

        const countries = await Company.distinct("country");
        const states = await Company.distinct("state");
        const cities = await Company.distinct("city");

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
   SEARCH DATA (FIXED)
========================= */
export const searchData = async (req, res) => {
    try {
        const {
            query,
            type,
            industry,
            designation,
            country,
            state,
            city
        } = req.query;

        let employeeFilter = {};
        let companyFilter = {};

        /* =========================
           TEXT SEARCH (PARTIAL)
        ========================= */
        if (query && query.trim()) {
            const words = query.trim().split(/\s+/);

            const regexes = words.map(w => ({
                $regex: w,
                $options: "i"
            }));

            employeeFilter.$or = [
                { name: { $in: regexes } },
                { company: { $in: regexes } },
                { designation: { $in: regexes } },
                { city: { $in: regexes } },
                { state: { $in: regexes } }
            ];

            companyFilter.$or = [
                { name: { $in: regexes } },
                { description: { $in: regexes } },
                { city: { $in: regexes } },
                { state: { $in: regexes } }
            ];
        }

        /* =========================
           FILTERS (SAFE + PARTIAL)
        ========================= */

        if (industry && industry.trim()) {
            employeeFilter.industry = {
                $regex: industry.trim(),
                $options: "i"
            };
        }

        if (designation && designation.trim()) {
            employeeFilter.designation = {
                $regex: designation.trim(),
                $options: "i"
            };
        }

        if (country && country.trim()) {
            const regex = { $regex: country.trim(), $options: "i" };
            employeeFilter.country = regex;
            companyFilter.country = regex;
        }

        if (state && state.trim()) {
            const regex = { $regex: state.trim(), $options: "i" };
            employeeFilter.state = regex;
            companyFilter.state = regex;
        }

        if (city && city.trim()) {
            const regex = { $regex: city.trim(), $options: "i" };
            employeeFilter.city = regex;
            companyFilter.city = regex;
        }

        /* =========================
           FETCH DATA BASED ON TAB
        ========================= */

        let data = [];

        if (type === "companies") {
            data = await Company.find(companyFilter).sort({ createdAt: -1 });
        } else {
            data = await Employee.find(employeeFilter).sort({ createdAt: -1 });
        }

        res.json(data);

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Search failed ❌" });
    }
};