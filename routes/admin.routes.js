const express = require("express");
const router = express.Router();

const {
    loginAdmin,
    registerAdmin,
    getAdmins,
    updateAdmin,
    deleteAdmin
} = require("../controllers/admin.controller");

router.post("/login", loginAdmin);
router.post("/register", registerAdmin);
router.get("/", getAdmins);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

module.exports = router;