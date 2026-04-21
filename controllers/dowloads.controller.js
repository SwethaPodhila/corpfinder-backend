const cloudinary = require("../config/cloudinary").default;
const DownloadHistory = require("../models/dowloads");

exports.uploadDownload = async (req, res) => {
    try {
        console.log("🔥 API HIT: /downloads/upload");
        console.log("📦 Headers:", req.headers);

        console.log("📄 Body:", req.body);
        console.log("📁 File received:", req.file);

        if (!req.file) {
            console.log("❌ No file received in req.file");
            return res.status(400).json({ msg: "No file uploaded" });
        }

        console.log("📌 File Name:", req.file.originalname);
        console.log("📌 File Size:", req.file.size);

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
                    console.log("❌ Cloudinary Upload Error:", error);
                    return res.status(500).json({ msg: "Upload failed" });
                }

                console.log("☁️ Cloudinary Upload Success:");
                console.log("URL:", uploaded.secure_url);

                try {
                    const saved = await DownloadHistory.create({
                        userId: req.userId,
                        fileUrl: uploaded.secure_url,
                        fileName: req.body.name,
                        recordCount: req.body.recordCount
                    });

                    console.log("💾 DB Saved:", saved);

                    return res.json({ msg: "Saved successfully" });

                } catch (dbErr) {
                    console.log("❌ DB Error:", dbErr);
                    return res.status(500).json({ msg: "DB save failed" });
                }
            }
        );

        console.log("🚀 Streaming file to Cloudinary...");
        stream.end(req.file.buffer);

    } catch (err) {
        console.log("🔥 Controller Error:", err);
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