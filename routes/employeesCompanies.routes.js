const express = require("express");
const multer = require("multer");
const path = require("path");

// ✅ controller import
const {
    addEmployee,
    uploadEmployees,
    getEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee,
    getEmployeeByIdUser
} = require("../controllers/employeecompanies.controller");

// ✅ middleware import
const { verifyAdmin, verifyUser } = require("../middleware/auth");

const router = express.Router();


// ✅ DISK STORAGE
const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + path.extname(file.originalname);

        cb(null, uniqueName);
    }
});


// ✅ multer config
const upload = multer({
    storage,

    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB
    }
});


router.post("/add", verifyAdmin, addEmployee);

router.post(
    "/upload",
    verifyAdmin,
    upload.single("file"),
    uploadEmployees
);

router.get("/allEmployees", verifyAdmin, getEmployees);

router.get("/:id", verifyAdmin, getEmployeeById);

router.put("/update/:id", verifyAdmin, updateEmployee);

router.delete("/delete/:id", verifyAdmin, deleteEmployee);

router.get("/user/:id", verifyUser, getEmployeeByIdUser);

module.exports = router;