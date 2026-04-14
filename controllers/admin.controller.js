// controllers/adminController.js
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // check admin
        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(400).json({ msg: "Admin not found" });
        }

        // password check
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(400).json({ msg: "Invalid password" });
        }

        // token create
        const token = jwt.sign(
            {
                id: admin._id,
                role: admin.role
            },
            "SECRET_KEY",
            { expiresIn: "1d" }
        );

        res.json({ token });

    } catch (err) {
        res.status(500).json({ msg: "Server error" });
    }
};