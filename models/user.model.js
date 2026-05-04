const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    phone: String,
    password: String,

    isVerified: { type: Boolean, default: false },

    otp: String,
    otpExpiry: Date,

    status: { type: String, default: "ACTIVE" },

    planId: { type: Number, default: 1 },
    planName: { type: String, default: "free" },

    credits: { type: Number, default: 50 },

    planStartDate: Date,
    planEndDate: Date,

    lastCreditReset: Date,

    trialEndsAt: Date
});

module.exports = mongoose.model("User", userSchema);