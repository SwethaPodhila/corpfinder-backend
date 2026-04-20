const mongoose = require("mongoose");

const downloadSchema = new mongoose.Schema({
    userId: String,
    fileUrl: String,
    fileName: String,
    recordCount: Number
}, { timestamps: true });

module.exports = mongoose.model("DownloadHistory", downloadSchema);