const { cashfree } = require("../config/cashfree");
const User = require("../models/user.model");
const { PLAN_CONFIG } = require("../utils/planConfig");
const { activatePlan } = require("../utils/activatePlan");
const Payment = require("../models/payment");
const crypto = require("crypto");
const axios = require("axios");

// 💱 simple conversion (you can replace with real FX API later)
const USD_TO_INR = 1;

const CASHFREE_SECRET = process.env.CF_SECRET_KEY || "your_cashfree_secret_here";

const createSubscription = async (req, res) => {
    try {

        const { planName } = req.body;

        const plan = PLAN_CONFIG[planName];

        if (!plan) {
            return res.status(400).json({
                message: "Invalid plan"
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const subscriptionId = "sub_" + Date.now();

        // save payment
        await Payment.create({
            orderId: subscriptionId,
            userId: user._id,
            planName,
            amount: plan.price,
            status: "PENDING"
        });

        // correct cashfree subscription payload
        const request = {

            subscription_id: subscriptionId,

            customer_details: {
                customer_id: user._id.toString(),
                customer_email: user.email,
                customer_phone: user.phone || "9999999999"
            },

            subscription_meta: {
                return_url:
                    "https://your-frontend-url.com/success"
            },

            plan_info: {
                plan_name: planName,
                plan_type: "PERIODIC",
                plan_max_cycles: 0,
                plan_recurring_amount: plan.price,
                plan_interval_type: "MONTH",
                plan_intervals: 1
            }
        };

        // direct API call
        const response = await axios.post(
            "https://sandbox.cashfree.com/pg/subscriptions",
            request,
            {
                headers: {
                    "x-client-id": process.env.CF_APP_ID,
                    "x-client-secret": process.env.CF_SECRET_KEY,
                    "x-api-version": "2023-08-01",
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("SUBSCRIPTION RESPONSE:", response.data);

        return res.json({
            subscriptionId,
            paymentLink: response.data.payment_link
        });

    } catch (err) {

        console.log(
            "Create Subscription Error:",
            err.response?.data || err.message
        );

        return res.status(500).json({
            message: "Subscription failed"
        });
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