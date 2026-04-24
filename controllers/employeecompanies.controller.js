import Employee from "../models/EmployeeCompany.js";
import XLSX from "xlsx";

export const addEmployee = async (req, res) => {
    try {
        const data = req.body;

        // 🔴 Required validation (important fields)
        const requiredFields = [
            "first_name",
            "designation",
            "company_name",
            "city",
            "country",
            "personal_email",
            "phone",
            "company_email",
            "company_phone",
            "company_type",
            "company_industry"
        ];

        const missing = requiredFields.filter(f => !data[f]);

        if (missing.length) {
            return res.status(400).json({
                msg: `Missing fields: ${missing.join(", ")}`
            });
        }

        // 🔍 Duplicate check
        const exists = await Employee.findOne({
            first_name: data.first_name,
            company_name: data.company_name,
            designation: data.designation,
            city: data.city,
            country: data.country
        });

        if (exists) {
            return res.status(400).json({ msg: "Employee already exists ❗" });
        }

        const employee = await Employee.create({
            ...data,
            adminId: req.adminId
        });

        res.json({ msg: "Added ✅", employee });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error ❌" });
    }
};

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

        const seen = new Set();

        for (let i = 0; i < normalizedData.length; i++) {
            const item = normalizedData[i];

            // 👤 Employee
            const first_name = clean(item.first_name);
            const last_name = clean(item.last_name);
            const designation = clean(item.designation);

            const personal_email = clean(item.personal_email);
            const business_email = clean(item.business_email);
            const phone = clean(item.phone);

            const city = clean(item.city);
            const state = clean(item.state);
            const country = clean(item.country);

            const linkedin_id = clean(item.linkedin_id);
            const linkedin_url = clean(item.linkedin_url);
            const description = clean(item.description);

            // 🏢 Company
            const company_name = clean(item.company_name);
            const company_email = clean(item.company_email);
            const company_phone = clean(item.company_phone);
            const company_type = clean(item.company_type);
            const company_industry = clean(item.company_industry);
            const company_address = clean(item.company_address);
            const company_website = clean(item.company_website);
            const company_city = clean(item.company_city);
            const company_state = clean(item.company_state);
            const company_country = clean(item.company_country);
            const company_linkedin_url = clean(item.company_linkedin_url);
            const company_founded = clean(item.company_founded);
            const company_description = clean(item.company_description);

            const identifier = `${first_name || "Unknown"} (${business_email || "No Email"})`;

            // 🔴 REQUIRED VALIDATION (UPDATED)
            const missingFields = [];

            if (!first_name) missingFields.push("first_name");
            if (!designation) missingFields.push("designation");
            if (!company_name) missingFields.push("company_name");
            if (!city) missingFields.push("city");
            if (!country) missingFields.push("country");

            if (!personal_email) missingFields.push("personal_email");
            if (!phone) missingFields.push("phone");

            //if (!company_email) missingFields.push("company_email");
            //if (!company_phone) missingFields.push("company_phone");
            if (!company_type) missingFields.push("company_type");
            if (!company_industry) missingFields.push("company_industry");

            if (missingFields.length > 0) {
                errors.push(`${identifier}: Missing → ${missingFields.join(", ")}`);
                continue;
            }

            // 🔥 UNIQUE KEY
            const uniqueKey = `${first_name}-${designation}-${company_name}-${city}-${state}-${country}`.toLowerCase();

            if (seen.has(uniqueKey)) {
                duplicates.push(`${identifier}: Duplicate in file`);
                continue;
            }

            seen.add(uniqueKey);

            // ❌ DB duplicate
            const exists = await Employee.findOne({
                first_name,
                company_name,
                designation,
                city,
                state,
                country
            });

            if (exists) {
                duplicates.push(`${identifier}: Already exists in DB`);
                continue;
            }

            validData.push({
                // employee
                first_name,
                last_name,
                designation,
                personal_email,
                business_email,
                phone,
                city,
                state,
                country,
                linkedin_id,
                linkedin_url,
                description: description || null,

                // company
                company_name,
                company_email,
                company_phone,
                company_type,
                company_industry,
                company_address,
                company_website,
                company_city,
                company_state,
                company_country,
                company_linkedin_url,
                company_founded,
                company_description,

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

export const getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({ adminId: req.adminId })
            .sort({ createdAt: -1 });

        res.json({ count: employees.length, employees });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Fetch failed ❌" });
    }
};

export const getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findOne({
            _id: req.params.id,
            adminId: req.adminId
        });

        if (!employee) {
            return res.status(404).json({ msg: "Employee not found ❗" });
        }

        res.json(employee);

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Error fetching employee ❌" });
    }
};

export const updateEmployee = async (req, res) => {
    try {
        const updates = req.body;

        const employee = await Employee.findOneAndUpdate(
            {
                _id: req.params.id,
                adminId: req.adminId
            },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!employee) {
            return res.status(404).json({ msg: "Employee not found ❗" });
        }

        res.json({ msg: "Updated successfully ✅", employee });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Update failed ❌" });
    }
};

export const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findOneAndDelete({
            _id: req.params.id,
            adminId: req.adminId
        });

        if (!employee) {
            return res.status(404).json({ msg: "Employee not found ❗" });
        }

        res.json({ msg: "Deleted successfully 🗑️" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Delete failed ❌" });
    }
};

export const getEmployeeByIdUser = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ msg: "Employee not found ❗" });
        }

        res.json(employee);

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Error fetching employee ❌" });
    }
};