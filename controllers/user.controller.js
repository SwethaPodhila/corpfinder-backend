const bcrypt = require("bcrypt");
const User = require("../models/user.model").default;
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

// ================= OTP MAIL =================
const sendOtpMail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "OTP Verification",
        text: `Your OTP is ${otp}`
    });
};

// ================= REGISTER =================
const register = async (req, res) => {
    try {
        // console.log("BODY:", req.body);

        const { fullName, email, phone, password, planId } = req.body;

        //  console.log("🔎 Checking user exists...");

        // ✅ FIXED (NO "where")
        const exist = await User.findOne({ email });

        if (exist) {
            return res.status(400).json({ msg: "User already exists" });
        }

        const hash = await bcrypt.hash(password, 10);

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        //console.log("💾 Creating user...");

        const newUser = await User.create({
            fullName,
            email,
            phone,
            password: hash,
            otp,
            otpExpiry: new Date(Date.now() + 2 * 60 * 1000),
            trialEndsAt,
            planId: planId || 1,
            status: "ACTIVE",
            isVerified: false
        });

        console.log("USER CREATED:", newUser._id);

        console.log("📧 Sending OTP...");
        await sendOtpMail(email, otp);

        return res.json({
            msg: "OTP sent successfully",
            email
        });

    } catch (err) {
        console.log("REGISTER ERROR:", err);
        return res.status(500).json({ msg: err.message });
    }
};

// ================= VERIFY OTP =================
const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user)
            return res.status(404).json({ msg: "User not found" });

        if (String(user.otp) !== String(otp))
            return res.status(400).json({ msg: "Invalid OTP" });

        if (new Date() > user.otpExpiry)
            return res.status(400).json({ msg: "OTP expired" });

        // ✅ update user
        user.isVerified = true;
        user.otp = null;
        user.otpExpiry = null;

        await user.save();

        // 🔥 JWT TOKEN CREATE (same like login)
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                planId: user.planId,
                status: user.status
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            msg: "Email verified successfully",
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                planId: user.planId,
                status: user.status
            }
        });

    } catch (err) {
        return res.status(500).json({ msg: err.message });
    }
};

// ================= RESEND OTP =================
const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user)
            return res.status(404).json({ msg: "User not found" });

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 2 * 60 * 1000);

        await user.save();

        await sendOtpMail(email, otp);

        return res.json({ msg: "OTP resent successfully" });

    } catch (err) {
        return res.status(500).json({ msg: err.message });
    }
};

// ================= LOGIN =================
const login = async (req, res) => {
    try {
        //console.log("🚀 LOGIN API CALLED");
        //console.log("BODY:", req.body);

        const { email, password } = req.body;

        // 🔎 Find user
        const user = await User.findOne({ email });
        //  console.log("USER:", user?.email);

        if (!user)
            return res.status(404).json({ msg: "User not found" });

        // ✅ Email verify check
        if (!user.isVerified)
            return res.status(403).json({ msg: "Verify email first" });

        // ⏳ Trial expiry check
        if (new Date() > user.trialEndsAt) {
            user.status = "INACTIVE";
            await user.save();

            return res.status(403).json({
                msg: "Trial expired. Please upgrade plan"
            });
        }

        // ❌ Status check
        if (user.status === "INACTIVE")
            return res.status(403).json({ msg: "Account inactive" });

        // 🔐 Password check
        const match = await bcrypt.compare(password, user.password);

        if (!match)
            return res.status(400).json({ msg: "Invalid credentials" });

        // 🔥 JWT TOKEN CREATE
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                planId: user.planId,
                status: user.status
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        console.log("✅ LOGIN SUCCESS");

        // ✅ Response
        return res.json({
            msg: "Login success",
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                planId: user.planId,
                status: user.status
            }
        });

    } catch (err) {
        console.log("🔥 LOGIN ERROR:", err);
        return res.status(500).json({ msg: err.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select("-password -otp -otpExpiry"); // 🔐 sensitive fields remove

        res.json(users);

    } catch (err) {
        console.log("GET USERS ERROR:", err);
        res.status(500).json({ msg: "Server error" });
    }
};

module.exports = {
    register,
    verifyOtp,
    resendOtp,
    login,
    getUsers
};