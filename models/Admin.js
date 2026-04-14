// models/Admin.js
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["superadmin", "subadmin"],
        default: "subadmin"
    }
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema);