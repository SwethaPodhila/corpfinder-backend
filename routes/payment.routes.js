const express = require("express");
const router = express.Router();

const { createOrder, cashfreeWebhook } = require("../controllers/payment.controller");
const { verifyUser } = require("../middleware/auth");

router.post("/create-order", verifyUser, createOrder);
router.post("/webhook", cashfreeWebhook);

module.exports = router;   // ✅ VERY IMPORTANT