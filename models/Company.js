const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
    company_name: {
        type: String,
        required: true
    },
    company_type: {
        type: String,
        required: true
    },
    company_industry: {
        type: String,
        required: true
    },
    company_address: String,
    company_website: String,
    company_city: String,
    company_state: String,
    company_country: String,
    company_phone: String,
    company_email: String,
    company_linkedin_url: String,
    company_founded: String,
    company_description: String,

    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);