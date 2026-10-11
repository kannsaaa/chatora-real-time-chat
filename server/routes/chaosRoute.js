// chaosRoute.js
const express = require("express");
const { generateChaos } = require("../controllers/chaosController");

const router = express.Router();

// POST /api/chaos/generate
router.post("/generate", generateChaos);

module.exports = router;
