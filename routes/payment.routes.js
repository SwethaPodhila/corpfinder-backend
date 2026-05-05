const express = require("express");
const router = express.Router();

const { createOrder, cashfreeWebhook } = require("../controllers/payment.controller");
const { verifyUser } = require("../middleware/auth");

// ✅ normal API
router.post("/create-order", verifyUser, createOrder);

// 🔥 FIXED webhook route
router.post("/webhook", cashfreeWebhook);

module.exports = router;