import XLSX from "xlsx";
import Company from "../models/Company.js";

/* =========================
   ✅ SINGLE ADD
========================= */
export const addCompany = async (req, res) => {
    try {
        const { name, country, state, city, description } = req.body;

        if (!name || !country || !state || !city) {
            return res.status(400).json({ msg: "Required fields missing ❗" });
        }

        const exists = await Company.findOne({ name, country, state, city });

        if (exists) {
            return res.status(400).json({ msg: "Company already exists ❗" });
        }

        const company = await Company.create({
            name,
            country,
            state,
            city,
            description: description || null,
            adminId: req.adminId   // 🔥 IMPORTANT
        });

        res.json({ msg: "Company added ✅", company });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error ❌" });
    }
};


/* =========================
   🔥 BULK UPLOAD
========================= */
export const uploadCompanies = async (req, res) => {
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
            const country = clean(item.country);
            const state = clean(item.state);
            const city = clean(item.city);
            const description = clean(item.description);

            const identifier = `${name || "Unknown"} (${city || "No City"})`;

            const missingFields = [];

            if (!name) missingFields.push("name");
            if (!country) missingFields.push("country");
            if (!state) missingFields.push("state");
            if (!city) missingFields.push("city");

            if (missingFields.length > 0) {
                errors.push(`${identifier}: Missing → ${missingFields.join(", ")}`);
                continue;
            }

            const companyData = {
                name,
                country,
                state,
                city,
                description: description || null,
                adminId: req.adminId
            };

            const exists = await Company.findOne({
                name,
                country,
                state,
                city
            });

            if (exists) {
                duplicates.push(`${identifier}: Already exists`);
                continue;
            }

            validData.push(companyData);
        }

        if (validData.length > 0) {
            await Company.insertMany(validData);
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

export const getMyCompanies = async (req, res) => {
    try {
        const companies = await Company.find({ adminId: req.adminId });

        res.json(companies);

    } catch (err) {
        res.status(500).json({ msg: "Server error ❌" });
    }
};

export const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await Company.findOneAndUpdate(
            { _id: id, adminId: req.adminId }, // 🔥 only owner can update
            req.body,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ msg: "Company not found ❌" });
        }

        res.json({ msg: "Company updated ✅", company: updated });

    } catch (err) {
        res.status(500).json({ msg: "Update failed ❌" });
    }
};

export const deleteCompany = async (req, res) => {
    try {
        console.log("🔥 DELETE COMPANY HIT");
        console.log("ADMIN ID:", req.adminId);

        const adminId = req.adminId;
        const { id } = req.params;

        const deleted = await Company.findOneAndDelete({
            _id: id,
            adminId
        });

        if (!deleted) {
            return res.status(404).json({ msg: "Not found" });
        }

        return res.json({ msg: "Deleted successfully" });

    } catch (err) {
        console.log("DELETE ERROR:", err);
        return res.status(500).json({ msg: "Server error" });
    }
};

export const getAllCompanies = async (req, res) => {
    try {
        const companies = await Company.find()
            .populate("adminId", "username") // 🔥 only these fields from Admin
            .sort({ createdAt: -1 });

        res.json(companies);

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error ❌" });
    }
};