const {
    generateChatbotResponse
} = require("../services/chatbotService");

const {
    getNearbyPlaces
} = require("../services/geoapifyService");

const sendChatbotMessage = async (req, res) => {
    try {
        const {
            message,
            location,
            route
        } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        if (
            !location ||
            typeof location.lat !== "number" ||
            typeof location.lon !== "number"
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid location is required"
            });
        }

        let nearbyPlaces = [];

        try {
            nearbyPlaces = await getNearbyPlaces(
                location.lat,
                location.lon
            );
        } catch (error) {
            console.error(
                "Nearby places error:",
                error.message
            );
        }

        const answer = await generateChatbotResponse({
            message,
            location,
            route,
            nearbyPlaces
        });

        return res.status(200).json({
            success: true,
            answer,
            nearbyPlaces
        });

    } catch (error) {
        console.error(
            "Chatbot Controller Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Something went wrong while processing your request"
        });
    }
};

module.exports = {
    sendChatbotMessage
};