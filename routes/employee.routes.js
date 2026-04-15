const express = require("express");
const multer = require("multer");
const { addEmployee, uploadEmployees } = require("../controllers/employee.controller");

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/add-employee", addEmployee);
router.post("/upload-employees", upload.single("file"), uploadEmployees);

module.exports = router;