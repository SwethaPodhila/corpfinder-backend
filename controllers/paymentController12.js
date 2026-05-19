const { cashfree } = require("../config/cashfree");
const User = require("../models/user.model");
const { PLAN_CONFIG } = require("../utils/planConfig");
const { activatePlan } = require("../utils/activatePlan");
const Payment = require("../models/payment");
const crypto = require("crypto");

// 💱 simple conversion (you can replace with real FX API later)
const USD_TO_INR = 1;

const CASHFREE_SECRET = process.env.CF_SECRET_KEY || "your_cashfree_secret_here";

const createSubscription = async (req, res) => {
    try {
        const { planName } = req.body;

        const plan = PLAN_CONFIG[planName];
        if (!plan) return res.status(400).json({ message: "Invalid plan" });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const subscriptionId = "sub_" + Date.now();

        // 💾 Save initial subscription record
        const payment = await Payment.create({
            orderId: subscriptionId,
            userId: user._id,
            planName,
            amount: plan.price,
            status: "PENDING"
        });

        // 👉 Instead of PGCreateOrder, you would call SUBSCRIPTION API
        const request = {
            subscription_id: subscriptionId,
            customer_details: {
                customer_id: user._id.toString(),
                customer_email: user.email,
                customer_phone: user.phone || "9999999999"
            },
            plan_details: {
                plan_name: planName,
                plan_price: plan.price,
                billing_cycle: "MONTHLY"
            },
            return_url: "https://your-frontend-url.com/success"
        };

        const response = await cashfree.PGCreateSubscription(request);

        return res.json({
            subscriptionSessionId: response.data.subscription_session_id,
            subscriptionId
        });

    } catch (err) {
        console.log("Create Subscription Error:", err);
        res.status(500).json({ message: "Subscription failed" });
    }
};

const cashfreeWebhook = async (req, res) => {
    try {
        const rawBody = req.body.toString("utf8");
        const event = JSON.parse(rawBody);

        const subscriptionId = event?.data?.subscription?.subscription_id;

        const payment = await Payment.findOne({ orderId: subscriptionId });

        if (!payment) return res.sendStatus(200);

        // 🔥 FIRST TIME ACTIVATION
        if (event.type === "SUBSCRIPTION_CREATED") {
            payment.status = "SUCCESS";
            await payment.save();

            const user = await User.findById(payment.userId);
            await activatePlan(user, payment.planName);
        }

        // 🔥 MONTHLY AUTO DEDUCTION SUCCESS
        if (event.type === "SUBSCRIPTION_CHARGED") {
            const user = await User.findById(payment.userId);
            await activatePlan(user, payment.planName);
        }

        // ❌ FAILED PAYMENT
        if (event.type === "SUBSCRIPTION_FAILED") {
            payment.status = "FAILED";
            await payment.save();
        }

        return res.sendStatus(200);

    } catch (err) {
        console.log("Webhook Error:", err);
        return res.sendStatus(500);
    }
};

module.exports = {
    createSubscription,
    cashfreeWebhook
};