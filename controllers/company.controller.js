import XLSX from "xlsx";
import Company from "../models/Company.js";

/* =========================
   ✅ SINGLE ADD
========================= */
export const addCompany = async (req, res) => {
    try {
        const {
            company_name,
            company_type,
            company_industry,
            company_address,
            company_website,
            company_city,
            company_state,
            company_country,
            company_phone,
            company_email,
            company_linkedin_url,
            company_founded,
            company_description
        } = req.body;

        // ✅ Required check
        if (!company_name || !company_type || !company_industry) {
            return res.status(400).json({
                msg: "Required fields missing ❗"
            });
        }

        // ✅ Duplicate check
        const exists = await Company.findOne({
            company_name,
            company_city,
            company_state,
            company_country
        });

        if (exists) {
            return res.status(400).json({
                msg: "Company already exists ❗"
            });
        }

        const company = await Company.create({
            company_name,
            company_type,
            company_industry,
            company_address,
            company_website,
            company_city,
            company_state,
            company_country,
            company_phone,
            company_email,
            company_linkedin_url,
            company_founded,
            company_description,
            adminId: req.adminId
        });

        res.json({
            msg: "Company added ✅",
            company
        });

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

        // 🔥 IMPORTANT: track duplicates inside file
        const seen = new Set();

        for (let i = 0; i < normalizedData.length; i++) {
            const item = normalizedData[i];

            const company_name = clean(item.company_name);
            const company_type = clean(item.company_type);
            const company_industry = clean(item.company_industry);
            const company_address = clean(item.company_address);
            const company_website = clean(item.company_website);
            const company_city = clean(item.company_city);
            const company_state = clean(item.company_state);
            const company_country = clean(item.company_country);
            const company_phone = clean(item.company_phone);
            const company_email = clean(item.company_email);
            const company_linkedin_url = clean(item.company_linkedin_url);
            const company_founded = clean(item.company_founded);
            const company_description = clean(item.company_description);

            const identifier = `${company_name || "Unknown"} (${company_city || "No City"})`;

            // 🔴 required validation
            const missingFields = [];

            if (!company_name) missingFields.push("company_name");
            if (!company_type) missingFields.push("company_type");
            if (!company_industry) missingFields.push("company_industry");

            if (missingFields.length > 0) {
                errors.push(`${identifier}: Missing → ${missingFields.join(", ")}`);
                continue;
            }

            // 🔥 UNIQUE KEY (FILE LEVEL)
            const uniqueKey = `${company_name}-${company_city}-${company_state}-${company_country}`.toLowerCase();

            // ❌ duplicate inside file
            if (seen.has(uniqueKey)) {
                duplicates.push(`${identifier}: Duplicate in file`);
                continue;
            }

            seen.add(uniqueKey);

            // ❌ duplicate in DB
            const exists = await Company.findOne({
                company_name,
                company_city,
                company_state,
                company_country
            });

            if (exists) {
                duplicates.push(`${identifier}: Already exists in DB`);
                continue;
            }

            validData.push({
                company_name,
                company_type,
                company_industry,
                company_address,
                company_website,
                company_city,
                company_state,
                company_country,
                company_phone,
                company_email,
                company_linkedin_url,
                company_founded,
                company_description,
                adminId: req.adminId
            });
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

export const updateCompanybyAll = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await Company.findByIdAndUpdate(
            id,           // ✅ remove adminId condition
            req.body,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ msg: "Company not found ❌" });
        }

        res.json({ msg: "Company updated ✅", company: updated });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Update failed ❌" });
    }
};

export const deleteCompanybyAll = async (req, res) => {
    try {
        console.log("🔥 DELETE COMPANY HIT");
        console.log("ADMIN ID:", req.adminId);

        const { id } = req.params;

        const deleted = await Company.findByIdAndDelete(id); // ✅ remove adminId

        if (!deleted) {
            return res.status(404).json({ msg: "Company not found ❌" });
        }

        return res.json({ msg: "Deleted successfully ✅" });

    } catch (err) {
        console.log("DELETE ERROR:", err);
        return res.status(500).json({ msg: "Server error ❌" });
    }
};