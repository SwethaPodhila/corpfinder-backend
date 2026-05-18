const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
    uploadDownload,
    getDownloads,
    checkDownloadLimit
} = require("../controllers/dowloads.controller");

const {verifyUser} = require("../middleware/auth");

router.post("/upload", verifyUser, upload.single("file"), uploadDownload);
router.get("/history", verifyUser, getDownloads);
router.get("/check-limit", verifyUser, checkDownloadLimit);

module.exports = router;