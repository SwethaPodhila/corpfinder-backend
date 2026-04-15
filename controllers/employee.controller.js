import XLSX from "xlsx";
import Employee from "../models/Employee.js";

/* =========================
   ✅ SINGLE ADD
========================= */
export const addEmployee = async (req, res) => {
    try {
        const {
            name,
            designation,
            company,
            city,
            state,
            country,
            email,
            phone,
            industry
        } = req.body;

        // 🔴 Required validation
        if (!name || !designation || !company || !city || !state || !country) {
            return res.status(400).json({ msg: "Required fields missing ❗" });
        }

        const employee = await Employee.create({
            name,
            designation,
            company,
            city,
            state,
            country,
            email,
            phone,
            industry
        });

        res.json({ msg: "Employee added", employee });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error" });
    }
};

/* =========================
   🔥 BULK UPLOAD
========================= */
export const uploadEmployees = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: "No file uploaded ❗" });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(sheet);

        if (!data.length) {
            return res.status(400).json({ msg: "Empty file ❗" });
        }

        // 🔥 Normalize keys (case insensitive)
        const normalizedData = data.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
                newRow[key.toLowerCase().trim()] = row[key];
            });
            return newRow;
        });

        const validData = [];
        const errors = [];
        const duplicates = [];

        const clean = (val) => val?.toString().trim();

        for (let i = 0; i < normalizedData.length; i++) {
            const item = normalizedData[i];

            const name = clean(item.name);
            const designation = clean(item.designation);
            const company = clean(item.company);
            const city = clean(item.city);
            const state = clean(item.state);
            const country = clean(item.country);

            const identifier = `${name || "Unknown"} (${company || "No Company"})`;

            const missingFields = [];

            if (!name) missingFields.push("name");
            if (!designation) missingFields.push("designation");
            if (!company) missingFields.push("company");
            if (!city) missingFields.push("city");
            if (!state) missingFields.push("state");
            if (!country) missingFields.push("country");

            // ❌ Missing fields
            if (missingFields.length > 0) {
                errors.push(`${identifier}: Missing → ${missingFields.join(", ")}`);
                continue;
            }

            const employeeData = {
                name,
                designation,
                company,
                city,
                state,
                country,
                email: clean(item.email) || null,
                phone: clean(item.phone) || null,
                industry: clean(item.industry) || null,
            };

            // 🔁 Duplicate check
            const exists = await Employee.findOne({
                name: employeeData.name,
                designation: employeeData.designation,
                company: employeeData.company,
                city: employeeData.city,
                state: employeeData.state,
                country: employeeData.country
            });

            if (exists) {
                duplicates.push(`${identifier}: Already exists`);
                continue;
            }

            validData.push(employeeData);
        }

        // ✅ Insert only valid
        if (validData.length > 0) {
            await Employee.insertMany(validData);
        }

        return res.json({
            msg: "Upload completed ✅",
            inserted: validData.length,
            errorsCount: errors.length,
            duplicateCount: duplicates.length,
            errors,
            duplicates
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Upload failed ❌" });
    }
};
