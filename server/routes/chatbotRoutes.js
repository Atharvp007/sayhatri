const express = require("express");

const router = express.Router();

const {
    sendChatbotMessage
} = require("../controllers/chatbotController");

const authMiddleware = require("../middleware/authMiddleware");

router.post(
    "/message",
    authMiddleware,
    sendChatbotMessage
);

module.exports = router;