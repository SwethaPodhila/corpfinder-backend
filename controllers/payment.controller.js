const { cashfree } = require("../config/cashfree");
const User = require("../models/user.model");
const { PLAN_CONFIG } = require("../utils/planConfig");
const { activatePlan } = require("../utils/activatePlan");
const Payment = require("../models/payment");
const crypto = require("crypto");

// 💱 simple conversion (you can replace with real FX API later)
const USD_TO_INR = 1;

const CASHFREE_SECRET = process.env.CF_SECRET_KEY || "your_cashfree_secret_here";

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

const verifySignature = (rawBody, signature, timestamp) => {
    console.log("\n🔐 ===== SIGNATURE DEBUG START =====");

    console.log("📦 RawBody:", rawBody);
    console.log("📨 Received Signature:", signature);
    console.log("⏱️ Timestamp:", timestamp);

    const signedPayload = timestamp + rawBody;

    console.log("🧩 SignedPayload (timestamp + body):", signedPayload);

    const expectedSignature = crypto
        .createHmac("sha256", CASHFREE_SECRET)
        .update(signedPayload)
        .digest("base64");

    console.log("🔐 Expected Signature:", expectedSignature);

    const isMatch = expectedSignature === signature;

    console.log(isMatch ? "✅ SIGNATURE MATCH" : "❌ SIGNATURE MISMATCH");
    console.log("🔐 ===== SIGNATURE DEBUG END =====\n");

    return isMatch;
};

const cashfreeWebhook = async (req, res) => {
    try {
        console.log("\n🚀 ===== WEBHOOK HIT =====");

        console.log("📨 Headers:", req.headers);

        const rawBody = req.body.toString("utf8");

        const signature =
            req.headers["x-webhook-signature"] ||
            req.headers["x-cashfree-signature"];

        const timestamp = req.headers["x-webhook-timestamp"];

        console.log("📦 RawBody from middleware:", rawBody);
        console.log("📨 Signature header:", signature);
        console.log("⏱️ Timestamp header:", timestamp);

        /* if (!rawBody) {
             console.log("❌ rawBody is missing → middleware issue");
         }*/

        if (!signature) {
            console.log("❌ signature missing");
        }

        if (!timestamp) {
            console.log("❌ timestamp missing");
        }

        const isValid = verifySignature(rawBody, signature, timestamp);

        if (!isValid) {
            console.log("❌ FINAL RESULT: Invalid webhook signature");
            return res.sendStatus(401);
        }

        console.log("✅ FINAL RESULT: Signature Verified");

        const event = JSON.parse(rawBody);

        console.log("📢 Event Type:", event.type);

        const orderId = event?.data?.order?.order_id;
        console.log("🧾 Order ID:", orderId);

        const payment = await Payment.findOne({ orderId });

        if (!payment) {
            console.log("❌ Payment not found in DB");
            return res.sendStatus(200);
        }

        console.log("💾 Payment status in DB:", payment.status);

        if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
            console.log("💰 PAYMENT SUCCESS CASE");

            if (payment.status === "SUCCESS") {
                console.log("♻️ Already processed");
                return res.sendStatus(200);
            }

            const user = await User.findById(payment.userId);

            if (!user) {
                console.log("❌ User not found");
                return res.sendStatus(200);
            }

            console.log("👤 User found:", user.email);

            await activatePlan(user, payment.planName);
            console.log("🎁 Plan activated");

            payment.status = "SUCCESS";
            payment.paymentId = event?.data?.payment?.cf_payment_id;

            await payment.save();

            console.log("✅ Payment updated in DB");
        }

        if (event.type === "PAYMENT_FAILED_WEBHOOK") {
            console.log("❌ PAYMENT FAILED CASE");

            payment.status = "FAILED";
            await payment.save();
        }

        console.log("🏁 WEBHOOK DONE\n");
        return res.sendStatus(200);

    } catch (err) {
        console.log("🔥 Webhook Error:", err);
        return res.sendStatus(500);
    }
};

module.exports = { createOrder, cashfreeWebhook };