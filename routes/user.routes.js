const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const { verifyUser } = require("../middleware/auth");

router.post("/register", userController.register);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.post("/login", userController.login);
router.get("/users", userController.getUsers); // 🔥 GET all users
router.get("/status",verifyUser, userController.getUserStatus); // 🔥 GET current user's plan & credit
router.post("/deduct-credits", userController.deductCredits); // 🔥 DEDUCT credits after each use

module.exports = router;