const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");

router.post("/register", userController.register);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.post("/login", userController.login);

module.exports = router;