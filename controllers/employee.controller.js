import XLSX from "xlsx";
import Employee from "../models/Employee.js";

/* =========================
   ✅ SINGLE ADD EMPLOYEE
========================= */
export const addEmployee = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            designation,
            company_name,
            city,
            state,
            country,
            personal_email,
            business_email,
            phone,
            linkedin_id,
            linkedin_url,
            description
        } = req.body;

        // 🔴 REQUIRED VALIDATION
        if (
            !first_name ||
            !designation ||
            !company_name ||
            !city ||
            !state ||
            !country
        ) {
            return res.status(400).json({ msg: "Required fields missing ❗" });
        }

        // 🔍 DUPLICATE CHECK
        const exists = await Employee.findOne({
            first_name,
            company_name,
            designation,
            city,
            state,
            adminId: req.adminId
        });

        if (exists) {
            return res.status(400).json({ msg: "Employee already exists ❗" });
        }

        const employee = await Employee.create({
            first_name,
            last_name,
            designation,
            company_name,
            city,
            state,
            country,
            personal_email,
            business_email,
            phone,
            linkedin_id,
            linkedin_url,
            description: description || null,
            adminId: req.adminId
        });

        res.json({ msg: "Employee added ✅", employee });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error ❌" });
    }
};

/* =========================
   🔥 BULK UPLOAD EMPLOYEES
========================= */
export const uploadEmployees = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: "No file uploaded ❗" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(sheet);

        if (!data.length) {
            return res.status(400).json({ msg: "Empty file ❗" });
        }

        // 🔥 normalize keys
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

        // 🔥 NEW: track duplicates inside file
        const seen = new Set();

        for (let i = 0; i < normalizedData.length; i++) {
            const item = normalizedData[i];

            const first_name = clean(item.first_name);
            const last_name = clean(item.last_name);
            const designation = clean(item.designation);
            const company_name = clean(item.company_name);
            const city = clean(item.city);
            const state = clean(item.state);
            const country = clean(item.country);
            const personal_email = clean(item.personal_email);
            const business_email = clean(item.business_email);
            const phone = clean(item.phone);
            const linkedin_id = clean(item.linkedin_id);
            const linkedin_url = clean(item.linkedin_url);
            const description = clean(item.description);

            const identifier = `${first_name || "Unknown"} (${personal_email || "No Email"})`;

            // 🔴 required validation
            const missingFields = [];

            if (!first_name) missingFields.push("first_name");
            if (!designation) missingFields.push("designation");
            if (!company_name) missingFields.push("company_name");
            if (!city) missingFields.push("city");
            if (!country) missingFields.push("country");

            if (missingFields.length > 0) {
                errors.push(`${identifier}: Missing → ${missingFields.join(", ")}`);
                continue;
            }

            // 🔥 UNIQUE KEY (file level)
            const uniqueKey = `${first_name}-${designation}-${company_name}-${city}-${state}-${country}`.toLowerCase();

            // ❌ duplicate inside file
            if (seen.has(uniqueKey)) {
                duplicates.push(`${identifier}: Duplicate in file`);
                continue;
            }

            seen.add(uniqueKey);

            // ❌ duplicate in DB
            const exists = await Employee.findOne({
                first_name,
                company_name,
                designation,
                city,
                state,
                adminId: req.adminId
            });

            if (exists) {
                duplicates.push(`${identifier}: Already exists in DB`);
                continue;
            }

            validData.push({
                first_name,
                last_name,
                designation,
                company_name,
                city,
                state,
                country,
                personal_email,
                business_email,
                phone,
                linkedin_id,
                linkedin_url,
                description: description || null,
                adminId: req.adminId
            });
        }

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

/* =========================
   📌 GET MY EMPLOYEES
========================= */
export const getMyEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({ adminId: req.adminId });
        res.json(employees);
    } catch (err) {
        res.status(500).json({ msg: "Server error ❌" });
    }
};

/* =========================
   ✏️ UPDATE EMPLOYEE
========================= */
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await Employee.findOneAndUpdate(
            { _id: id, adminId: req.adminId },
            req.body,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ msg: "Employee not found ❌" });
        }

        res.json({ msg: "Employee updated ✅", employee: updated });

    } catch (err) {
        res.status(500).json({ msg: "Update failed ❌" });
    }
};

/* =========================
   🗑️ DELETE EMPLOYEE
========================= */
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Employee.findOneAndDelete({
            _id: id,
            adminId: req.adminId
        });

        if (!deleted) {
            return res.status(404).json({ msg: "Employee not found ❌" });
        }

        res.json({ msg: "Deleted successfully ✅" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error ❌" });
    }
};

export const getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.find()
            .populate("adminId", "username") // 🔥 admin details
            .sort({ createdAt: -1 });
        //console.log(JSON.stringify(employees, null, 2));
        res.json(employees);

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error ❌" });
    }
};

export const updateEmployeebyAll = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await Employee.findByIdAndUpdate(
            id,
            req.body,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ msg: "Employee not found ❌" });
        }

        res.json({
            msg: "Employee updated successfully ✅",
            employee: updated
        });

    } catch (err) {
        res.status(500).json({ msg: "Update failed ❌" });
    }
};

export const deleteEmployeebyAll = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Employee.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ msg: "Employee not found ❌" });
        }

        res.json({ msg: "Deleted successfully ✅" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error ❌" });
    }
};
