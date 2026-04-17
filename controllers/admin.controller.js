// controllers/adminController.js
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 🔥 username OR email format check
        let admin;

        if (username.includes("@")) {
            // email la undi → username field lo email save ayyi untundi
            admin = await Admin.findOne({ username: username.toLowerCase() });
        } else {
            // normal username
            admin = await Admin.findOne({ username });
        }

        if (!admin) {
            return res.status(400).json({ msg: "Admin not found" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(400).json({ msg: "Invalid password" });
        }

        const token = jwt.sign(
            {
                id: admin._id,
                role: admin.role,
                username: admin.username
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ token });

    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
};

exports.registerAdmin = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // 🔒 VALIDATION
        if (!username || username.trim().length < 3) {
            return res.status(400).json({ msg: "Username must be at least 3 characters" });
        }

        if (!password || password.length < 3) {
            return res.status(400).json({ msg: "Password must be at least 3 characters" });
        }

        if (!role) {
            return res.status(400).json({ msg: "Role is required" });
        }

        // 🔥 OPTIONAL SECURITY (recommended)
        if (role === "superadmin") {
            return res.status(403).json({ msg: "Cannot create super admin" });
        }

        // already exists check
        const existing = await Admin.findOne({ username: username.toLowerCase() });

        if (existing) {
            return res.status(400).json({ msg: "Admin already exists" });
        }

        // password hash
        const hashedPassword = await bcrypt.hash(password, 10);

        // create admin
        const newAdmin = await Admin.create({
            username: username.toLowerCase().trim(),
            password: hashedPassword,
            role: role // 🔥 dynamic role
        });

        res.json({
            msg: "Admin Created Successfully",
            admin: newAdmin
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error" });
    }
};

// GET ALL ADMINS
exports.getAdmins = async (req, res) => {
    try {
        const admins = await Admin
            .find({ role: "subadmin" }) // 🔥 only subadmins
            .select("-password");

        res.json(admins);

    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
};

// UPDATE ADMIN
exports.updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;

        let updateData = {};

        // 🔒 USERNAME VALIDATION
        if (username) {
            if (username.trim().length < 3) {
                return res.status(400).json({ msg: "Username must be at least 3 characters" });
            }
            updateData.username = username.toLowerCase().trim();
        }

        // 🔒 PASSWORD VALIDATION
        if (password) {
            if (password.length < 3) {
                return res.status(400).json({ msg: "Password must be at least 3 characters" });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        // 🔒 ROLE UPDATE (optional but controlled)
        if (role) {
            // ⚠️ SECURITY (recommended)
            if (role === "superadmin") {
                return res.status(403).json({ msg: "Cannot assign super admin role" });
            }

            updateData.role = role;
        }

        const updatedAdmin = await Admin.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).select("-password");

        res.json(updatedAdmin);

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error" });
    }
};

// DELETE ADMIN
exports.deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        await Admin.findByIdAndDelete(id);

        res.json({ msg: "Admin deleted successfully" });

    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
};