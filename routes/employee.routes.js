const express = require("express");
const multer = require("multer");

const { verifyAdmin } = require("../middleware/auth.js");

const {
    addEmployee,
    uploadEmployees,
    getMyEmployees,
    updateEmployee,
    deleteEmployee,
    getAllEmployees,
    updateEmployeebyAll,
    deleteEmployeebyAll
} = require("../controllers/employee.controller");

const router = express.Router();

/* =========================
   ✅ FIX: memory storage for Excel
========================= */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* =========================
   🔐 EMPLOYEE ROUTES (ADMIN PROTECTED)
========================= */

router.post("/add-employee", verifyAdmin, addEmployee);
router.post(
    "/upload-employees",
    verifyAdmin,
    upload.single("file"),
    uploadEmployees
);
router.get("/my-employees", verifyAdmin, getMyEmployees);
router.put("/update-employee/:id", verifyAdmin, updateEmployee);
router.delete("/delete-employee/:id", verifyAdmin, deleteEmployee);
router.get("/all", verifyAdmin, getAllEmployees);
router.put("/update-by-all/:id", verifyAdmin, updateEmployeebyAll);
router.delete("/delete-by-all/:id", verifyAdmin, deleteEmployeebyAll);

module.exports = router;