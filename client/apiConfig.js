let baseUrl;
let socketUrl;

if (import.meta.env.VITE_NODE_ENV === "production" || import.meta.env.PROD) {
  baseUrl = import.meta.env.VITE_API_URL || "https://chatora-real-time-chat.onrender.com";
  socketUrl = import.meta.env.VITE_WS_URL || "wss://chatora-real-time-chat.onrender.com";
} else {
  baseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
  socketUrl = import.meta.env.VITE_WS_URL || "ws://localhost:4000";
}

export { baseUrl, socketUrl };

