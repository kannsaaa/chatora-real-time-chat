let rawBaseUrl;
let rawSocketUrl;

if (import.meta.env.VITE_NODE_ENV === "production" || import.meta.env.PROD) {
  rawBaseUrl = import.meta.env.VITE_API_URL || "https://chatora-real-time-chat.onrender.com";
  rawSocketUrl = import.meta.env.VITE_WS_URL || "wss://chatora-real-time-chat.onrender.com";
} else {
  rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
  rawSocketUrl = import.meta.env.VITE_WS_URL || "ws://localhost:4000";
}

const baseUrl = (rawBaseUrl || "").trim().replace(/\/+$/, "");
const socketUrl = (rawSocketUrl || "").trim().replace(/\/+$/, "");

export { baseUrl, socketUrl };

