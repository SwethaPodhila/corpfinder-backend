import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    designation: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    email: {
        type: String,
        default: null
    },
    phone: {
        type: String,
        default: null
    },
    industry: {
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