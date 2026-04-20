const cloudinary = require("../config/cloudinary").default;
const DownloadHistory = require("../models/dowloads");

exports.uploadDownload = async (req, res) => {
    try {
        console.log("Received file:", req.file?.originalname);

        if (!req.file) {
            return res.status(400).json({ msg: "No file uploaded" });
        }

        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                folder: "downloads",
                use_filename: true,
                unique_filename: false,
                public_id: req.body.name
            },
            async (error, uploaded) => {
                if (error) {
                    console.log(error);
                    return res.status(500).json({ msg: "Upload failed" });
                }

                await DownloadHistory.create({
                    userId: req.userId,
                    fileUrl: uploaded.secure_url,
                    fileName: req.body.name,
                    recordCount: req.body.recordCount
                });

                res.json({ msg: "Saved successfully" });
            }
        );

        stream.end(req.file.buffer);

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Error uploading file" });
    }
};

exports.getDownloads = async (req, res) => {
    try {
        const data = await DownloadHistory.find({
            userId: req.userId
        }).sort({ createdAt: -1 });

        res.json(data);
    } catch (err) {
        res.status(500).json({ msg: "Failed to fetch downloads" });
    }
};