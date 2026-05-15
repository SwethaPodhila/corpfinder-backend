import Employee from "../models/EmployeeCompany.js";
//import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import csv from "csv-parser";

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

        console.log("🚀 Upload API hit");

        if (!req.file) {

            return res.status(400).json({
                msg: "No file uploaded ❌"
            });
        }

        console.log("✅ File received:", req.file.originalname);

        let insertedCount = 0;
        let duplicateCount = 0;
        let errorsCount = 0;

        let batch = [];

        const BATCH_SIZE = 500;

        const clean = (val) =>
            val?.toString().trim() || null;

        // ✅ Batch Insert Function
        const processBatch = async () => {

            if (batch.length === 0) return;

            try {

                const result = await Employee.insertMany(
                    batch,
                    {
                        ordered: false
                    }
                );

                insertedCount += result.length;

                console.log(
                    `✅ Batch inserted: ${result.length}`
                );

            } catch (err) {

                // ✅ Handle duplicates
                if (err.writeErrors) {

                    duplicateCount +=
                        err.writeErrors.length;

                    insertedCount +=
                        err.result?.result?.nInserted ||
                        0;

                    console.log(
                        `⚠️ Duplicates skipped: ${err.writeErrors.length}`
                    );

                } else {

                    console.log(
                        "💥 Batch Insert Error:",
                        err.message
                    );
                }
            }

            // ✅ Clear memory
            batch = [];
        };

        // ✅ Stream CSV
        const stream = fs
            .createReadStream(req.file.path)
            .pipe(csv());

        stream.on("data", async (row) => {

            stream.pause();

            try {

                // ✅ Normalize Keys
                const item = {};

                Object.keys(row).forEach((key) => {

                    item[key.toLowerCase().trim()] =
                        row[key];
                });

                // 👤 Employee
                const first_name =
                    clean(item.first_name);

                const last_name =
                    clean(item.last_name);

                const designation =
                    clean(item.designation);

                const personal_email =
                    clean(item.personal_email);

                const business_email =
                    clean(item.business_email);

                const phone =
                    clean(item.phone);

                const city =
                    clean(item.city);

                const state =
                    clean(item.state);

                const country =
                    clean(item.country);

                const linkedin_id =
                    clean(item.linkedin_id);

                const linkedin_url =
                    clean(item.linkedin_url);

                const description =
                    clean(item.description);

                // 🏢 Company
                const company_name =
                    clean(item.company_name);

                const company_email =
                    clean(item.company_email);

                const company_phone =
                    clean(item.company_phone);

                const company_type =
                    clean(item.company_type);

                const company_industry =
                    clean(item.company_industry);

                const company_address =
                    clean(item.company_address);

                const company_website =
                    clean(item.company_website);

                const company_city =
                    clean(item.company_city);

                const company_state =
                    clean(item.company_state);

                const company_country =
                    clean(item.company_country);

                const company_linkedin_url =
                    clean(item.company_linkedin_url);

                const company_founded =
                    clean(item.company_founded);

                const company_description =
                    clean(item.company_description);

                // ✅ Validation
                if (
                    !first_name ||
                    !designation ||
                    !company_name ||
                    !city ||
                    !country ||
                    !personal_email ||
                    !phone ||
                    !company_type ||
                    !company_industry
                ) {

                    errorsCount++;

                    stream.resume();

                    return;
                }

                // ✅ Push to batch
                batch.push({

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

                    description,

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

                // ✅ Insert batch
                if (batch.length >= BATCH_SIZE) {

                    await processBatch();
                }

            } catch (err) {

                console.log(
                    "💥 Row Processing Error:",
                    err.message
                );

                errorsCount++;
            }

            stream.resume();
        });

        // ✅ Stream End
        stream.on("end", async () => {

            try {

                // ✅ Final Batch
                await processBatch();

                console.log("🎉 Upload completed");

                // ✅ Delete uploaded file
                if (
                    req.file?.path &&
                    fs.existsSync(req.file.path)
                ) {

                    fs.unlinkSync(req.file.path);

                    console.log(
                        "🗑 Uploaded file deleted"
                    );
                }

                return res.status(200).json({

                    success: true,

                    msg: "Upload completed ✅",

                    inserted: insertedCount,

                    duplicates: duplicateCount,

                    errors: errorsCount
                });

            } catch (err) {

                console.log(
                    "💥 Final Batch Error:",
                    err.message
                );

                return res.status(500).json({

                    success: false,

                    msg: "Final batch failed ❌"
                });
            }
        });

        // ✅ Stream Error
        stream.on("error", async (err) => {

            console.log(
                "💥 Stream Error:",
                err.message
            );

            if (
                req.file?.path &&
                fs.existsSync(req.file.path)
            ) {

                fs.unlinkSync(req.file.path);
            }

            return res.status(500).json({

                success: false,

                msg: "CSV processing failed ❌"
            });
        });

    } catch (err) {

        console.log(
            "💥 Upload Error:",
            err.message
        );

        // ✅ Delete uploaded file
        if (
            req.file?.path &&
            fs.existsSync(req.file.path)
        ) {

            fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({

            success: false,

            msg: "Upload failed ❌",

            error: err.message
        });
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