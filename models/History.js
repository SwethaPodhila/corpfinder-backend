import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        query: {
            type: String,
            required: true,
            trim: true
        },
        resultCount: {
            type: Number,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

export default mongoose.model("SearchHistory", searchHistorySchema);