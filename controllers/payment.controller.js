const { cashfree } = require("../config/cashfree");
const User = require("../models/user.model");
const { PLAN_CONFIG } = require("../utils/planConfig");
const { activatePlan } = require("../utils/activatePlan");
const Payment = require("../models/payment");
const crypto = require("crypto");

// 💱 simple conversion (you can replace with real FX API later)
const USD_TO_INR = 1;

const CASHFREE_SECRET = process.env.CF_SECRET || "your_cashfree_secret_here";

const createOrder = async (req, res) => {
    try {
        const { planName } = req.body;

        const plan = PLAN_CONFIG[planName];
        if (!plan) return res.status(400).json({ message: "Invalid plan" });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const orderId = "order_" + Date.now();

        // 💰 convert USD → INR
        const amountInINR = plan.currency === "USD"
            ? Math.round(plan.price * USD_TO_INR)
            : plan.price;

        // Save payment
        await Payment.create({
            orderId,
            userId: user._id,
            planName,
            amount: plan.price,
            status: "PENDING"
        });

        const request = {
            order_id: orderId,
            order_amount: amountInINR,
            order_currency: "INR",
            customer_details: {
                customer_id: user._id.toString(),
                customer_email: user.email,
                customer_phone: user.phone || "9999999999"
            }
        };

        const response = await cashfree.PGCreateOrder(request);

        res.json({
            paymentSessionId: response.data.payment_session_id,
            orderId
        });

    } catch (err) {
        console.log("Create Order Error:", err);
        res.status(500).json({ message: "Payment failed" });
    }
};

const verifySignature = (rawBody, signature) => {
    const expectedSignature = crypto
        .createHmac("sha256", CASHFREE_SECRET)
        .update(rawBody)
        .digest("base64");

    return expectedSignature === signature;
};

const cashfreeWebhook = async (req, res) => {
    try {
        const event = req.body;

        const signature = req.headers["x-webhook-signature"];

        // 🔐 1. SECURITY CHECK (VERY IMPORTANT)
        const isValid = verifySignature(req.rawBody, signature);

        if (!isValid) {
            console.log("❌ Invalid webhook signature");
            return res.sendStatus(401);
        }

        const orderId = event?.data?.order?.order_id;

        // 🔎 2. Find payment
        const payment = await Payment.findOne({ orderId });

        if (!payment) return res.sendStatus(200);

        // =========================
        // ✅ PAYMENT SUCCESS
        // =========================
        if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {

            // 🔁 Idempotency check (avoid duplicate processing)
            if (payment.status === "SUCCESS") {
                return res.sendStatus(200);
            }

            const user = await User.findById(payment.userId);
            if (!user) return res.sendStatus(200);

            // 🎁 Activate plan
            await activatePlan(user, payment.planName);

            // 💾 Update DB
            payment.status = "SUCCESS";
            payment.paymentId = event?.data?.payment?.cf_payment_id;

            await payment.save();

            console.log("✅ PLAN ACTIVATED:", payment.planName);
        }

        // =========================
        // ❌ PAYMENT FAILED
        // =========================
        if (event.type === "PAYMENT_FAILED_WEBHOOK") {

            if (payment.status !== "FAILED") {
                payment.status = "FAILED";
                await payment.save();
            }

            console.log("❌ PAYMENT FAILED:", orderId);
        }

        // Always acknowledge
        return res.sendStatus(200);

    } catch (err) {
        console.log("🔥 Webhook Error:", err);
        return res.sendStatus(500);
    }
};

module.exports = { createOrder, cashfreeWebhook };