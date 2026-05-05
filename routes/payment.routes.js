const express = require("express");
const router = express.Router();

const { createOrder, cashfreeWebhook } = require("../controllers/payment.controller");
const { verifyUser } = require("../middleware/auth");

// ✅ normal API
router.post("/create-order", verifyUser, createOrder);

// 🔥 FIXED webhook route
router.post(
    "/webhook",
    express.raw({ type: "application/json" }), // 👈 VERY IMPORTANT
    (req, res, next) => {
        req.rawBody = req.body.toString(); // 👈 raw string
        try {
            req.body = JSON.parse(req.rawBody); // convert to JSON
        } catch (err) { }
        next();
    },
    cashfreeWebhook
);

module.exports = router;