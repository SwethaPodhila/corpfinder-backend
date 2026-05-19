const express = require("express");
const router = express.Router();

const { createSubscription } = require("../controllers/paymentController12.js");
const { verifyUser } = require("../middleware/auth");

// ✅ normal API
router.post("/create-order", verifyUser, createOrder);

// 🔥 FIXED webhook route
//router.post("/webhook", cashfreeWebhook);

module.exports = router;