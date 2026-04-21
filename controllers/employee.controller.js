import XLSX from "xlsx";
import Employee from "../models/Employee.js";

/* =========================
   ✅ SINGLE ADD EMPLOYEE
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
            industry,
            description
        } = req.body;

        if (!name || !designation || !company || !city || !state || !country) {
            return res.status(400).json({ msg: "Required fields missing ❗" });
        }

        const exists = await Employee.findOne({
            name,
            email,
            company,
            adminId: req.adminId
        });

        if (exists) {
            return res.status(400).json({ msg: "Employee already exists ❗" });
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
            industry,
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

        // normalize keys
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
            const email = clean(item.email);
            const phone = clean(item.phone);
            const industry = clean(item.industry);
            const description = clean(item.description);

            const identifier = `${name || "Unknown"} (${email || "No Email"})`;

            const missingFields = [];

            if (!name) missingFields.push("name");
            if (!designation) missingFields.push("designation");
            if (!company) missingFields.push("company");
            if (!city) missingFields.push("city");
            if (!state) missingFields.push("state");
            if (!country) missingFields.push("country");

            if (missingFields.length > 0) {
                errors.push(`${identifier}: Missing → ${missingFields.join(", ")}`);
                continue;
            }

            const exists = await Employee.findOne({
                email,
                company,
                designation,
                state,
                city,
                adminId: req.adminId
            });

            if (exists) {
                duplicates.push(`${identifier}: Already exists`);
                continue;
            }

            validData.push({
                name,
                designation,
                company,
                city,
                state,
                country,
                email,
                phone,
                industry,
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