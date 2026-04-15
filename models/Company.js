const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
    name: String,
    country: String,
    state: String,
    city: String,
    description: String,

    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);
