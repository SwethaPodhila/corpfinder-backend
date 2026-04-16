const express = require("express");
const { getFilters, searchData } = require("../controllers/filter.controller");

const router = express.Router();

router.get("/filters", getFilters);
router.get("/search", searchData);

module.exports = router;