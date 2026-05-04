const mongoose = require("mongoose");

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
