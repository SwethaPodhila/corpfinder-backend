const express = require("express");
const multer = require("multer");

// ✅ controller import
const {
    addEmployee,
    uploadEmployees,
    getEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee
} = require("../controllers/employeecompanies.controller");

// ✅ middleware import
const { verifyAdmin } = require("../middleware/auth");

const router = express.Router();

// 🔹 Multer config
const upload = multer({
    storage: multer.memoryStorage()
});

router.post("/add", verifyAdmin, addEmployee);
router.post("/upload", verifyAdmin, upload.single("file"), uploadEmployees);

router.get("/allEmployees", verifyAdmin, getEmployees);
router.get("/:id", verifyAdmin, getEmployeeById);
router.put("/update/:id", verifyAdmin, updateEmployee);
router.delete("/delete/:id", verifyAdmin, deleteEmployee);

module.exports = router;