const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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
const {
    verifyAdmin,
    verifyUser
} = require("../middleware/auth");

const router = express.Router();


// ✅ Uploads folder path
const uploadPath = path.join(__dirname, "../uploads");


// ✅ Create uploads folder if not exists
if (!fs.existsSync(uploadPath)) {

    fs.mkdirSync(uploadPath, {
        recursive: true
    });
}


// ✅ Disk Storage Config
const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + "-" + file.originalname;

        cb(null, uniqueName);
    }
});


// ✅ Multer Config
const upload = multer({

    storage,

    limits: {
        fileSize: 1024 * 1024 * 1024 // 1GB
    }
});


// ✅ Routes
router.post(
    "/add",
    verifyAdmin,
    addEmployee
);

router.post(
    "/upload",
    verifyAdmin,
    upload.single("file"),
    uploadEmployees
);

router.get(
    "/allEmployees",
    verifyAdmin,
    getEmployees
);

router.get(
    "/:id",
    verifyAdmin,
    getEmployeeById
);

router.put(
    "/update/:id",
    verifyAdmin,
    updateEmployee
);

router.delete(
    "/delete/:id",
    verifyAdmin,
    deleteEmployee
);

router.get(
    "/user/:id",
    verifyUser,
    getEmployeeByIdUser
);

module.exports = router;