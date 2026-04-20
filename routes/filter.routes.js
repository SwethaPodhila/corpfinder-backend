const express = require("express");
const { getFilters, searchData, getSearchHistory, deleteSearchHistory, clearSearchHistory } = require("../controllers/filter.controller");
const { verifyUser } = require("../middleware/auth");

const router = express.Router();

router.get("/filters", getFilters);
router.get("/search", verifyUser, searchData);

router.get("/history", verifyUser, getSearchHistory);
router.delete("/history/:id", verifyUser, deleteSearchHistory);
router.delete("/history", verifyUser, clearSearchHistory);

module.exports = router;