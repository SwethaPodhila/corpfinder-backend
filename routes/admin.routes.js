const express = require("express");
const router = express.Router();

const {
    loginAdmin,
    registerAdmin,
    getAdmins,
    updateAdmin,
    deleteAdmin
} = require("../controllers/admin.controller");

// LOGIN
router.post("/login", loginAdmin);

// REGISTER
router.post("/register", registerAdmin);

// GET ALL ADMINS
router.get("/", getAdmins);

// UPDATE ADMIN
router.put("/:id", updateAdmin);

// DELETE ADMIN
router.delete("/:id", deleteAdmin);

module.exports = router;