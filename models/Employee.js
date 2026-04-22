import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
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
    company_name: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: false,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    personal_email: {
        type: String,
        default: null,
        trim: true
    },
    business_email: {
        type: String,
        default: null,
        trim: true
    },
    phone: {
        type: String,
        default: null,
        trim: true
    },
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
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    }
}, { timestamps: true });

export default mongoose.model("Employee", employeeSchema);
