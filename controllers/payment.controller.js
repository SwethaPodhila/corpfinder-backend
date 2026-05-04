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
        if (!plan) {
            return res.status(400).json({ message: "Invalid plan" });
        }

        const orderId = "order_" + Date.now();

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

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

        // ✅ Save payment in DB
        await Payment.create({
            orderId,
            userId: user._id,
            planName,
            amount: plan.price,
            status: "PENDING"
        });

        res.json({
            paymentSessionId: response.data.payment_session_id,
            orderId
        });

    } catch (err) {
        console.log("❌ Create Order Error:", err);
        res.status(500).json({ message: "Order creation failed" });
    }
};

/**
 * WEBHOOK
 */
const cashfreeWebhook = async (req, res) => {
    try {
        const event = req.body;

        if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {

            const orderId = event.data.order.order_id;
            const paymentId = event.data.payment.cf_payment_id;

            // ✅ Fetch from DB instead of Map
            const payment = await Payment.findOne({ orderId });

            if (!payment || payment.status === "SUCCESS") {
                return res.sendStatus(200);
            }

            const user = await User.findById(payment.userId);
            if (!user) return res.sendStatus(200);

            // ✅ Activate plan
            await activatePlan(user, payment.planName);

            // ✅ Update DB
            payment.status = "SUCCESS";
            payment.paymentId = paymentId;
            await payment.save();

            console.log("✅ Plan Activated:", payment.planName);
        }

        // (Optional) handle failure
        if (event.type === "PAYMENT_FAILED_WEBHOOK") {
            const orderId = event.data.order.order_id;

            await Payment.findOneAndUpdate(
                { orderId },
                { status: "FAILED" }
            );
        }

        res.sendStatus(200);

    } catch (err) {
        console.log("❌ Webhook Error:", err);
        res.sendStatus(500);
    }
};

module.exports = { createOrder, cashfreeWebhook };