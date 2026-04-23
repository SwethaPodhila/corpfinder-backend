import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({

    // 👤 Employee Details
    first_name: {
        type: String,
        required: true,
        trim: true
    },
    last_name: {
        type: String,
        default: null,
        trim: true
    },
    designation: {
        type: String,
        required: true,
        trim: true
    },

    // 📧 Employee Contact (REQUIRED)
    personal_email: {
        type: String,
        required: true,
        trim: true
    },
    business_email: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },

    // 🌍 Employee Location
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },

    // 🔗 Employee Social
    linkedin_id: {
        type: String,
        default: null
    },
    linkedin_url: {
        type: String,
        default: null
    },
    description: {
        type: String,
        default: null
    },

    // 🏢 Company Details (FULL — emi miss kaledu)
    company_name: {
        type: String,
        required: true,
        trim: true
    },
    company_type: {
        type: String,
        required: true
    },
    company_industry: {
        type: String,
        required: true
    },
    company_address: {
        type: String
    },
    company_website: {
        type: String
    },
    company_city: {
        type: String
    },
    company_state: {
        type: String
    },
    company_country: {
        type: String
    },

    // 📞 Company Contact (REQUIRED)
    company_phone: {
        type: String,
        required: false //this is required
    },
    company_email: {
        type: String,
        required: false  //this is required
    },

    company_linkedin_url: {
        type: String
    },
    company_founded: {
        type: String
    },
    company_description: {
        type: String
    },

    // 🔐 Admin
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    }

}, { timestamps: true });

export default mongoose.model("Employee", employeeSchema);