import React, { useState } from "react";

const SafetyChatbot = ({
    location,
    route = null
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const [message, setMessage] = useState("");

    const [messages, setMessages] = useState([
        {
            role: "assistant",
            text: "Hi! I'm Sahyatri AI. I can help you with your route, nearby places and safety-related questions."
        }
    ]);

    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!message.trim() || loading) {
            return;
        }

        if (!location) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: "I need your current location to provide route and nearby-place information."
                }
            ]);

            return;
        }

        const userMessage = message.trim();

        setMessages((prev) => [
            ...prev,
            {
                role: "user",
                text: userMessage
            }
        ]);

        setMessage("");
        setLoading(true);

        try {
            const token =
                localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:5000/api/chatbot/message",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",

                        ...(token
                            ? {
                                  Authorization:
                                      `Bearer ${token}`
                              }
                            : {})
                    },

                    body: JSON.stringify({
                        message: userMessage,

                        location: {
                            lat: location.lat,
                            lon: location.lon
                        },

                        route
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to get AI response"
                );
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: data.answer
                }
            ]);

        } catch (error) {
            console.error(
                "Chatbot Error:",
                error
            );

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: "Sorry, I couldn't process your request right now."
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="
                        fixed
                        bottom-6
                        right-6
                        z-50
                        h-14
                        w-14
                        rounded-full
                        bg-blue-600
                        text-white
                        shadow-lg
                        hover:bg-blue-700
                        transition
                        flex
                        items-center
                        justify-center
                        text-2xl
                    "
                >
                    🤖
                </button>
            )}

            {isOpen && (
                <div
                    className="
                        fixed
                        bottom-6
                        right-6
                        z-50
                        w-[360px]
                        max-w-[calc(100vw-32px)]
                        h-[550px]
                        bg-white
                        rounded-2xl
                        shadow-2xl
                        border
                        flex
                        flex-col
                        overflow-hidden
                    "
                >
                    {/* Header */}

                    <div
                        className="
                            bg-blue-600
                            text-white
                            px-4
                            py-3
                            flex
                            items-center
                            justify-between
                        "
                    >
                        <div>
                            <h3 className="font-semibold">
                                Sahyatri AI
                            </h3>

                            <p className="text-xs text-blue-100">
                                Route & Safety Assistant
                            </p>
                        </div>

                        <button
                            onClick={() =>
                                setIsOpen(false)
                            }
                            className="
                                text-xl
                                hover:text-gray-200
                            "
                        >
                            ×
                        </button>
                    </div>

                    {/* Messages */}

                    <div
                        className="
                            flex-1
                            overflow-y-auto
                            p-4
                            space-y-3
                            bg-gray-50
                        "
                    >
                        {messages.map(
                            (msg, index) => (
                                <div
                                    key={index}
                                    className={
                                        msg.role ===
                                        "user"
                                            ? "flex justify-end"
                                            : "flex justify-start"
                                    }
                                >
                                    <div
                                        className={
                                            msg.role ===
                                            "user"
                                                ? "bg-blue-600 text-white px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%] text-sm"
                                                : "bg-white text-gray-800 px-3 py-2 rounded-2xl rounded-bl-sm max-w-[85%] text-sm shadow-sm border"
                                        }
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            )
                        )}

                        {loading && (
                            <div className="flex justify-start">
                                <div
                                    className="
                                        bg-white
                                        border
                                        px-3
                                        py-2
                                        rounded-2xl
                                        text-sm
                                        text-gray-500
                                    "
                                >
                                    Thinking...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}

                    <div
                        className="
                            border-t
                            bg-white
                            p-3
                            flex
                            gap-2
                        "
                    >
                        <input
                            type="text"
                            value={message}
                            onChange={(e) =>
                                setMessage(
                                    e.target.value
                                )
                            }
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your route..."
                            disabled={loading}
                            className="
                                flex-1
                                border
                                rounded-xl
                                px-3
                                py-2
                                text-sm
                                outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        />

                        <button
                            onClick={sendMessage}
                            disabled={
                                loading ||
                                !message.trim()
                            }
                            className="
                                bg-blue-600
                                text-white
                                px-4
                                rounded-xl
                                hover:bg-blue-700
                                disabled:opacity-50
                            "
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default SafetyChatbot;