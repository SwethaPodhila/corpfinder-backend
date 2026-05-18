import cloudinary from "../config/cloudinary.js";
import DownloadHistory from "../models/dowloads.js";
import User from "../models/user.model.js";

// =====================================
// PLAN LIMIT FUNCTION
// =====================================

const getPlanLimit = (planName) => {

    switch (planName?.toLowerCase()) {

        case "premium":
            return {
                limit: 1000,
                type: "day"
            };

        case "pro":
            return {
                limit: 500,
                type: "day"
            };

        case "free":
        default:
            return {
                limit: 50,
                type: "month"
            };
    }
};

// =====================================
// CHECK DOWNLOAD LIMIT
// =====================================

export const checkDownloadLimit =
    async (req, res) => {

        try {

            console.log(
                "🔥 CHECK DOWNLOAD LIMIT API"
            );

            const user =
                await User.findById(
                    req.userId
                );

            if (!user) {

                return res.status(404).json({

                    success: false,

                    msg: "User not found"
                });
            }

            // =====================================
            // PLAN LIMIT
            // =====================================

            const { limit, type } =
                getPlanLimit(
                    user.planName
                );

            const now =
                new Date();

            let startDate;

            // =====================================
            // DATE FILTER
            // =====================================

            if (type === "day") {

                startDate =
                    new Date(

                        now.getFullYear(),

                        now.getMonth(),

                        now.getDate()
                    );

            } else {

                startDate =
                    new Date(

                        now.getFullYear(),

                        now.getMonth(),

                        1
                    );
            }

            // =====================================
            // TOTAL DOWNLOADED
            // =====================================

            const history =
                await DownloadHistory.aggregate([

                    {
                        $match: {

                            userId:
                                req.userId,

                            createdAt: {
                                $gte:
                                    startDate
                            }
                        }
                    },

                    {
                        $group: {

                            _id: null,

                            total: {
                                $sum:
                                    "$recordCount"
                            }
                        }
                    }
                ]);

            const alreadyDownloaded =
                history[0]?.total || 0;

            // =====================================
            // REMAINING LIMIT
            // =====================================

            const remainingLimit =
                limit - alreadyDownloaded;

            // =====================================
            // LIMIT COMPLETED
            // =====================================

            if (remainingLimit <= 0) {

                return res.json({

                    success: false,

                    msg:

                        type === "day"

                            ? `Today's download limit completed (${limit})`

                            : `Monthly free download limit completed (${limit})`
                });
            }

            // =====================================
            // CREDIT CHECK
            // =====================================

            if (user.credits <= 0) {

                return res.json({

                    success: false,

                    msg: "No credits remaining"
                });
            }

            // =====================================
            // FINAL ALLOWED RECORDS
            // =====================================

            const allowedRecords =
                Math.min(

                    remainingLimit,

                    user.credits
                );

            // =====================================
            // SUCCESS
            // =====================================

            return res.json({

                success: true,

                allowedRecords,

                remainingLimit,

                credits:
                    user.credits,

                downloaded:
                    alreadyDownloaded,

                plan:
                    user.planName
            });

        } catch (err) {

            console.log(
                "❌ CHECK LIMIT ERROR:",
                err
            );

            return res.status(500).json({

                success: false,

                msg: "Server error"
            });
        }
    };

// =====================================
// UPLOAD DOWNLOAD
// =====================================

export const uploadDownload =
    async (req, res) => {

        try {

            console.log(
                "🔥 API HIT: /downloads/upload"
            );

            // =====================================
            // CHECK FILE
            // =====================================

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    msg: "No file uploaded"
                });
            }

            // =====================================
            // GET USER
            // =====================================

            const user =
                await User.findById(
                    req.userId
                );

            if (!user) {

                return res.status(404).json({

                    success: false,

                    msg: "User not found"
                });
            }

            // =====================================
            // PLAN LIMIT
            // =====================================

            const { limit, type } =
                getPlanLimit(
                    user.planName
                );

            const now =
                new Date();

            let startDate;

            // =====================================
            // DATE FILTER
            // =====================================

            if (type === "day") {

                startDate =
                    new Date(

                        now.getFullYear(),

                        now.getMonth(),

                        now.getDate()
                    );

            } else {

                startDate =
                    new Date(

                        now.getFullYear(),

                        now.getMonth(),

                        1
                    );
            }

            // =====================================
            // TOTAL DOWNLOADED
            // =====================================

            const history =
                await DownloadHistory.aggregate([

                    {
                        $match: {

                            userId:
                                req.userId,

                            createdAt: {
                                $gte:
                                    startDate
                            }
                        }
                    },

                    {
                        $group: {

                            _id: null,

                            total: {
                                $sum:
                                    "$recordCount"
                            }
                        }
                    }
                ]);

            const alreadyDownloaded =
                history[0]?.total || 0;

            // =====================================
            // REMAINING LIMIT
            // =====================================

            const remainingLimit =
                limit - alreadyDownloaded;

            // =====================================
            // LIMIT COMPLETED
            // =====================================

            if (remainingLimit <= 0) {

                return res.status(400).json({

                    success: false,

                    msg:

                        type === "day"

                            ? `Today's download limit completed (${limit})`

                            : `Monthly free download limit completed (${limit})`
                });
            }

            // =====================================
            // CREDIT CHECK
            // =====================================

            if (user.credits <= 0) {

                return res.status(400).json({

                    success: false,

                    msg: "No credits remaining"
                });
            }

            // =====================================
            // REQUESTED RECORDS
            // =====================================

            const requestedRecords =
                Number(
                    req.body.recordCount
                ) || 0;

            // =====================================
            // FINAL ALLOWED RECORDS
            // =====================================

            const allowedRecords =
                Math.min(

                    requestedRecords,

                    remainingLimit,

                    user.credits
                );

            // =====================================
            // NO RECORDS
            // =====================================

            if (allowedRecords <= 0) {

                return res.status(400).json({

                    success: false,

                    msg:
                        "Download limit exceeded"
                });
            }

            // =====================================
            // CLOUDINARY UPLOAD
            // =====================================

            const stream =
                cloudinary.uploader.upload_stream(

                    {
                        resource_type: "raw",

                        folder: "downloads",

                        use_filename: true,

                        unique_filename: false,

                        public_id:
                            req.body.name
                    },

                    async (
                        error,
                        uploaded
                    ) => {

                        // =====================================
                        // CLOUDINARY ERROR
                        // =====================================

                        if (error) {

                            console.log(
                                "❌ Cloudinary Upload Error:",
                                error
                            );

                            return res.status(500).json({

                                success: false,

                                msg: "Upload failed"
                            });
                        }

                        try {

                            // =====================================
                            // SAVE HISTORY
                            // =====================================

                            await DownloadHistory.create({

                                userId:
                                    req.userId,

                                fileUrl:
                                    uploaded.secure_url,

                                fileName:
                                    req.body.name,

                                recordCount:
                                    allowedRecords
                            });

                            // =====================================
                            // DEDUCT CREDITS
                            // =====================================

                            user.credits -=
                                allowedRecords;

                            await user.save();

                            // =====================================
                            // SUCCESS
                            // =====================================

                            return res.json({

                                success: true,

                                msg:
                                    "Download completed successfully",

                                downloaded:
                                    allowedRecords,

                                creditsLeft:
                                    user.credits,

                                remainingLimit:
                                    remainingLimit -
                                    allowedRecords
                            });

                        } catch (dbErr) {

                            console.log(
                                "❌ DB ERROR:",
                                dbErr
                            );

                            return res.status(500).json({

                                success: false,

                                msg:
                                    "Database save failed"
                            });
                        }
                    }
                );

            console.log(
                "🚀 STREAMING FILE TO CLOUDINARY"
            );

            stream.end(
                req.file.buffer
            );

        } catch (err) {

            console.log(
                "🔥 CONTROLLER ERROR:",
                err
            );

            return res.status(500).json({

                success: false,

                msg:
                    "Error uploading file"
            });
        }
    };

// =====================================
// GET DOWNLOAD HISTORY
// =====================================

export const getDownloads = async (req, res) => {
    try {

        const data =
            await DownloadHistory.find({

                userId:
                    req.userId

            }).sort({
                createdAt: -1
            });

        res.json(data);

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            msg:
                "Failed to fetch downloads"
        });
    }
};