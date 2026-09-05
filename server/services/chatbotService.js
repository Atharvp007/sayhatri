const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function generateChatbotResponse({
    message,
    location,
    route,
    nearbyPlaces
}) {
    const systemInstruction = `
You are Sahyatri AI, an intelligent travel and women's safety assistant.

Your job is to help the user with:
1. Route planning
2. Nearby places
3. Safety-related suggestions
4. Trip guidance
5. Questions about the user's current route

IMPORTANT RULES:

- Use the provided location, route and nearby places as the primary source of information.
- Do not invent nearby places.
- Do not claim that a place exists unless it appears in the provided nearby places.
- If the provided data is insufficient, clearly say that you do not have enough information.
- Give practical and concise answers.
- Prioritize safety when discussing routes.
- If the user asks about nearby hospitals, police stations, pharmacies, restaurants, etc., use the provided nearby places.
- If the user asks about route safety, use the provided route information.
- Never claim that you have live information unless it is provided in the context.
- Do not reveal API keys or internal implementation details.
`;

    const context = {
        currentLocation: location || null,
        route: route || null,
        nearbyPlaces: nearbyPlaces || []
    };

    const prompt = `
User question:
${message}

Current Sahyatri context:

${JSON.stringify(context, null, 2)}

Answer the user's question using the context above.

If recommending a nearby place, mention:
- Name
- Type/category
- Distance if available
- Address if available

If discussing the route, mention relevant route information such as:
- Distance
- Estimated travel time
- Route status
- Safety information if available

Keep the response easy to understand.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: prompt,
            config: {
                systemInstruction,
                temperature: 0.3,
                maxOutputTokens: 500
            }
        });

        return response.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("Unable to generate AI response");
    }
}

module.exports = {
    generateChatbotResponse
};