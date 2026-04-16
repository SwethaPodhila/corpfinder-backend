const express = require("express");
const router = express.Router();
const {
    addCompany,
    uploadCompanies,
    getMyCompanies,
    updateCompany,
    deleteCompany,
    getAllCompanies
} = require("../controllers/company.controller");
//import upload from "../middleware/upload.js";
const upload = require("../middleware/upload");

const { verifyAdmin } = require("../middleware/auth");

router.post("/add-company", verifyAdmin, addCompany);

// 🔥 BULK UPLOAD (IMPORTANT FIX)
router.post(
    "/upload-companies",
    verifyAdmin,
    upload.single("file"),
    uploadCompanies
);

router.get("/my-companies", verifyAdmin, getMyCompanies);
router.put("/update/:id", verifyAdmin, updateCompany);
router.delete("/delete/:id", verifyAdmin, deleteCompany);
router.get("/all", verifyAdmin,getAllCompanies);

module.exports = router;