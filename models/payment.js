const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    orderId: String, // from Cashfree
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
    paymentId: String // from Cashfree webhook
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);