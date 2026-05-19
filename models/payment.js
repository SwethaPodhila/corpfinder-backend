const mongoose = require("mongoose");
/*
const paymentSchema = new mongoose.Schema({
    orderId: String,
    paymentId: String,

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    planName: String,
    amount: Number,

    status: {
        type: String,
        enum: ["PENDING", "SUCCESS", "FAILED"],
        default: "PENDING"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Payment", paymentSchema);
*/

const paymentSchema = new mongoose.Schema({
    // 🔥 For one-time OR subscription reference
    orderId: String,

    paymentId: String,

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    planName: String,

    amount: Number,

    // 🔥 NEW: differentiate type
    type: {
        type: String,
        enum: ["ONE_TIME", "SUBSCRIPTION"],
        default: "ONE_TIME"
    },

    // 🔥 NEW: subscription tracking
    subscriptionId: String,
    mandateId: String,

    // 🔥 NEW: billing info
    billingCycle: {
        type: String,
        enum: ["MONTHLY", "YEARLY"],
        default: "MONTHLY"
    },

    nextBillingDate: Date,

    // existing status
    status: {
        type: String,
        enum: ["PENDING", "SUCCESS", "FAILED", "ACTIVE", "CANCELLED"],
        default: "PENDING"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Payment", paymentSchema);