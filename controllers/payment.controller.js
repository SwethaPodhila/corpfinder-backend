const { cashfree } = require("../config/cashfree");
const User = require("../models/user.model");
const { PLAN_CONFIG } = require("../utils/planConfig");
const { activatePlan } = require("../utils/activatePlan");
const Payment = require("../models/payment");

/**
 * CREATE ORDER
 */
const createOrder = async (req, res) => {
    try {
        const { planName } = req.body;

        const plan = PLAN_CONFIG[planName];
        if (!plan) return res.status(400).json({ message: "Invalid plan" });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const orderId = "order_" + Date.now();

        // 1️⃣ Save payment first
        await Payment.create({
            orderId,
            userId: user._id,
            planName,
            amount: plan.price,
            status: "PENDING"
        });

        // 2️⃣ Cashfree request
        const request = {
            order_id: orderId,
            order_amount: plan.price,
            order_currency: "INR",
            customer_details: {
                customer_id: user._id.toString(),
                customer_email: user.email,
                customer_phone: user.phone
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

/**
 * WEBHOOK
 */
const cashfreeWebhook = async (req, res) => {
    try {
        console.log("🔥 Webhook Received:", req.body);
        const event = req.body;

        console.log("🔥 Webhook Received:", event.type);

        const orderId = event?.data?.order?.order_id;

        const payment = await Payment.findOne({ orderId });
        if (!payment) return res.sendStatus(200);

        // 🔥 SUCCESS
        if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {

            if (payment.status === "SUCCESS") {
                return res.sendStatus(200);
            }

            const user = await User.findById(payment.userId);
            if (!user) return res.sendStatus(200);

            await activatePlan(user, payment.planName);

            payment.status = "SUCCESS";
            payment.paymentId = event.data.payment.cf_payment_id;

            await payment.save();

            console.log("✅ PLAN ACTIVATED:", payment.planName);
        }

        // ❌ FAILED
        if (event.type === "PAYMENT_FAILED_WEBHOOK") {
            payment.status = "FAILED";
            await payment.save();
        }

        res.sendStatus(200);

    } catch (err) {
        console.log("Webhook Error:", err);
        res.sendStatus(500);
    }
};

module.exports = { createOrder, cashfreeWebhook };