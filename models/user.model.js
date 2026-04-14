import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    phone: String,
    password: String,

    isVerified: { type: Boolean, default: false },

    otp: String,
    otpExpiry: Date,

    status: { type: String, default: "ACTIVE" },

    trialEndsAt: Date,

    planId: { type: Number, default: 1 }
});

const User = mongoose.model("User", userSchema);

export default User;