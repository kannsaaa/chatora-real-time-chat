# Chatora

> **Talk. Laugh. Connect.**

Chatora is a full-stack real-time chat application focused on expressive, social conversations with a playful "Sweet Chaos" interface. Built with React and Node.js, Chatora combines instant WebSocket communication, comprehensive friendship controls, customizable group chats, message reply threads, and an interactive Chaos Mode designed to spark engaging conversations.

---

## ✨ Features

- **Real-Time One-to-One Messaging**: Instant bi-directional messaging powered by WebSockets with live delivery and persistent message history.
- **WebSocket Communication**: Authenticated, event-driven WebSocket connections handling live message delivery, presence updates, and real-time state synchronization.
- **User Authentication**: Secure registration and login flow utilizing bcrypt password hashing and JSON Web Tokens (JWT).
- **HTTP-Only Authentication Cookies**: Session tokens are stored in `httpOnly`, `sameSite` cookies, protecting authentication credentials from XSS and client-side inspection.
- **Unique Usernames & Profiles**: Custom handles (`@username`), personalized bios, and deterministic DiceBear avatar selection.
- **People Discovery & Search**: Global user directory search allowing users to find people by name or unique username.
- **Friend Requests & Management**: Full friendship lifecycle including sending requests, accepting, declining, and unfriending.
- **Block & Unblock Controls**: User-level blocking enforcement preventing blocked users from messaging, sending requests, or initiating conversations.
- **Online / Offline Presence**: Real-time presence indicators displaying active user connectivity across conversations and member lists.
- **Persistent Message History**: MongoDB-backed conversation history loaded smoothly on conversation selection.
- **Message Reply & Quoted Messages**: Reply directly to any message with highlighted quotation bubbles, click-to-scroll navigation, and temporary pulse animation.
- **Delete for Me**: Ability to hide individual messages or entire conversations locally for the current user without impacting the other participant.
- **Unsend for Everyone**: Sender-initiated message unsend with a 15-minute grace window, deleting the message across all clients and broadcasting instant removal via WebSockets.
- **Conversation Pinning**: Pin key conversations to the top of the chat list with persistent user-level preference storage.
- **Conversation Muting**: Mute notifications and activity indicators for specific conversations.
- **Mark Unread**: Toggle unread status on conversations to flag them for later review.
- **Group Chats**: Create group conversations with custom names, avatars, and member rosters.
- **Group Administration & Member Management**: Dedicated group admin roles with permissions to add members, remove members, or disband groups.
- **Group Messaging & Group Replies**: Multi-participant real-time chat supporting quoted replies and sender attribution.
- **Chaos Mode**: Interactive conversation game engine embedded in chat with seven distinct conversation-starter categories.
- **Sweet Chaos Visual Design**: Handcrafted warm-palette aesthetic with high-contrast typography, playful pastel accents, and responsive mobile-first layouts.

---

## 🌪️ Chaos Mode

Chaos Mode is Chatora's built-in conversation spark engine. Designed to rescue chats from awkward silences, users can trigger prompts in one-on-one or group chats across seven distinct modes:

1. **Random Question**: Thought-provoking and whimsical open-ended questions.
2. **Icebreaker**: Fun, low-pressure prompts designed to break the ice with new connections.
3. **Roast Battle**: Playful, good-natured banter and creative roasts to keep energy high.
4. **Would You Rather**: Dilemmas and scenarios that force fun and tough choices.
5. **Debate**: Friendly, spirited debate topics on everyday opinions and hot takes.
6. **Random Challenge**: Mini dares and interactive challenges to complete in real time.
7. **Quick Quiz**: Rapid-fire trivia questions covering diverse topics.

Prompts can be generated directly within the chat view and automatically sent into the active conversation to kickstart dialogue.

---

## 🎨 UI / Design ("Sweet Chaos")

Chatora features the bespoke **Sweet Chaos** design language, crafted to feel warm, welcoming, and expressive:

- **Warm Cream Canvas**: Soft `#FFF9F5` base background paired with `#FFFBF8` card surfaces, avoiding stark sterile whites.
- **Playful Pastel Accents**: Vibrant Strawberry Pink (`#FF6F91`), Sweet Peach (`#FF9E79`), and Soft Lavender (`#A78BFA`).
- **Dark Plum Typography**: Deep, high-contrast plum (`#241628` and `#34233A`) ensuring readable typography across all components.
- **Rounded Surfaces & Depth**: Generous border radii, soft border treatments (`border-stone-200/80`), and layered drop shadows.
- **Expressive Interactions**: Micro-animations, subtle badge bounces, responsive hover states, and smooth slide transitions.
- **Mobile-First Responsiveness**: Adaptive layouts that toggle seamlessly between conversation lists and active chats on mobile screens.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: JavaScript (ES Modules)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js
- **Server Framework**: Express.js
- **Real-Time Engine**: WebSocket (`ws`)
- **Database**: MongoDB
- **ODM**: Mongoose

### Security & Authentication
- **Tokens**: JSON Web Tokens (JWT)
- **Cookies**: HTTP-only, secure, `sameSite: "lax"` cookies
- **Password Hashing**: bcrypt (configurable salt rounds)
- **Validation**: Joi & Joi Password Complexity
- **Authorization**: Protected REST middleware and authenticated WebSocket handshake validation

### Email Service
- **Mailer**: Resend (HTTPS API integration for reliable email verification delivery)

---

## 🏗️ Architecture

Chatora maintains a clean separation of concerns between client presentation, stateless REST endpoints, and persistent real-time WebSocket communication:

```text
       ┌────────────────────────────────────────────────────────┐
       │                   Browser Client                       │
       │                   (React + Vite)                       │
       └──────────────┬───────────────────────────▲─────────────┘
                      │                           │
          HTTP / REST │                 WebSocket │ (Bi-directional)
         (Credentials)│                           │
                      ▼                           ▼
       ┌────────────────────────────────────────────────────────┐
       │             Node.js + Express Backend                  │
       ├──────────────────────────┬─────────────────────────────┤
       │   REST API Controllers   │      WebSocket Server       │
       │  - Auth & Cookies        │  - Real-time Message Relay  │
       │  - User Profiles & Search│  - Presence & Online Status │
       │  - Friends & Blocks      │  - Unsend Broadcasts        │
       │  - Groups Management     │  - Chaos Mode Prompts       │
       │  - Preferences & Pins    │                             │
       └──────────────────────────┴──────────────┬──────────────┘
                                                 │
                                                 │ Mongoose
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │       MongoDB Database      │
                                  │ (Users, Messages, Groups,   │
                                  │  Friendships, Preferences)  │
                                  └─────────────────────────────┘
```

- **REST API**: Handles authentication, user profiles, directory search, friendship requests, group administration, and preference persistence.
- **WebSocket Server**: Shares the HTTP server port to provide instant real-time message routing, unsend broadcasts, and online presence tracking.

---

## 📂 Project Structure

```text
Chatora/
├── client/
│   ├── src/
│   │   ├── assets/            # Static assets and icons
│   │   ├── components/        # Reusable UI components (Sidebar, ChatBox, Modals)
│   │   ├── context/           # React context providers (AuthContext, SocketContext)
│   │   ├── pages/             # Application views (Chat, People, Groups, Login, Signup)
│   │   ├── apiConfig.js       # Dynamic API and WebSocket endpoint resolver
│   │   ├── App.jsx            # Top-level application routing and layout
│   │   └── main.jsx           # React DOM entrypoint
│   ├── package.json           # Frontend dependencies and Vite scripts
│   ├── tailwind.config.js     # Tailwind design system configuration
│   └── vite.config.js         # Vite build configuration
│
├── server/
│   ├── controllers/           # Request handlers for auth, user, groups, conversations
│   ├── db/                    # MongoDB connection logic
│   ├── middleware/            # JWT verification and route authentication guards
│   ├── models/                # Mongoose schemas (User, Message, Group, Friendship)
│   ├── routes/                # Express route declarations
│   ├── scripts/               # Automated browser E2E test suites and utilities
│   ├── utils/                 # Email delivery, validation, and token helpers
│   ├── wsServer.js            # WebSocket server connection lifecycle and events
│   ├── index.js               # Application entrypoint and HTTP/WS server bootstrap
│   └── package.json           # Backend dependencies and scripts
│
├── .env.example               # Root workspace environment guidance
└── README.md                  # Project documentation
```

---

## 🚀 Local Development

### Prerequisites

- **Node.js** (v18.x or higher recommended)
- **npm** (v9.x or higher)
- **MongoDB** (local MongoDB instance running on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI)

### 1. Setup Backend

Navigate to the `server/` directory, install dependencies, and configure environment variables:

```bash
cd server
npm install
cp .env.example .env
```

Start the backend development server with nodemon:

```bash
npm run dev
```

*The server will boot on `http://localhost:4000` with WebSockets available at `ws://localhost:4000`.*

### 2. Setup Frontend

Open a second terminal, navigate to the `client/` directory, install dependencies, and configure environment variables:

```bash
cd client
npm install
cp .env.example .env
```

Start the Vite development server:

```bash
npm run dev
```

*The frontend application will be available at `http://localhost:5173`.*

---

## ⚙️ Environment Variables

### Backend Configuration (`server/.env`)

Create `server/.env` based on `server/.env.example`. **Never commit your `.env` file to version control.**

| Variable | Description | Example / Default |
|---|---|---|
| `DB` | MongoDB connection connection string | `mongodb://127.0.0.1:27017/chatapp` |
| `JWTPRIVATEKEY` | Secret key used for signing JWT tokens | `your_jwt_private_key_here` |
| `SALT` | Salt rounds for bcrypt hashing | `10` |
| `PORT` | Port for the Express and WebSocket server | `4000` |
| `BASE_URL` | Frontend client URL (CORS and email redirects) | `http://localhost:5173` |
| `NODE_ENV` | Application environment mode | `development` |
| `RESEND_API_KEY` | Resend API key for HTTPS email delivery | `your_resend_api_key_here` |
| `RESEND_FROM_EMAIL` | Sender email address *(e.g. `onboarding@resend.dev` or verified domain)* | `onboarding@resend.dev` |

### Frontend Configuration (`client/.env`)

Create `client/.env` based on `client/.env.example`:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend REST API | `http://localhost:4000` |
| `VITE_WS_URL` | URL of the backend WebSocket endpoint | `ws://localhost:4000` |

---

## 🌐 Local URLs

| Service | Protocol | Local URL |
|---|---|---|
| Frontend Client | HTTP | `http://localhost:5173` |
| Backend REST API | HTTP | `http://localhost:4000` |
| Real-Time WebSocket | WS | `ws://localhost:4000` |

---

## 🧪 Testing

Chatora includes comprehensive automated test suites located in `server/scripts/`. These scripts execute headless browser interactions via Puppeteer and direct API validations:

| Test Script | Description |
|---|---|
| `node scripts/testBrowserE2E.js` | Full end-to-end browser test verifying two-user real-time chat, friend requests, conversation menu actions, presence, and responsiveness. |
| `node scripts/testChaosBrowserE2E.js` | Browser E2E suite validating Chaos Mode generation, category switching, and prompt injection into active chats. |
| `node scripts/testGroupBrowserE2E.js` | Browser E2E suite validating group creation, member invitation, group message broadcasting, and admin management. |
| `node scripts/testReplyBrowserE2E.js` | Browser E2E suite verifying quoted reply creation, reply preview tags, message jumping, and visual pulse highlighting. |
| `node scripts/testDeletionFeature.js` | Automated test suite validating "Delete for Me" and the 15-minute "Unsend for Everyone" window. |
| `node scripts/testFriendshipFeature.js` | API test suite covering friend requests, accept/decline flows, unfriending, and blocking enforcement. |
| `node scripts/testConversationPreferences.js` | Test suite validating conversation pinning, muting, and unread toggle persistence. |
| `node scripts/testUsernameBioFeature.js` | Test suite verifying unique `@username` registration, bio updating, and profile validation. |

To execute any suite, ensure MongoDB and the backend/frontend servers are running, then run the script from the `server/` directory:

```bash
cd server
node scripts/testBrowserE2E.js
```

---

## 🔒 Security

Chatora incorporates modern web application security practices:

- **HTTP-Only Cookies**: Authentication tokens are transmitted in `httpOnly`, `sameSite: "lax"` cookies, protecting session tokens from client-side script injection.
- **Protected REST Endpoints**: Strict JWT middleware validation on all private routes (`/api/users`, `/api/conversations`, `/api/groups`, `/api/friends`).
- **Authenticated WebSocket Connections**: Validates authentication cookies during connection handshakes before allowing WebSocket event processing.
- **Robust Password Hashing**: Passwords hashed with bcrypt using configurable work factors before persistence.
- **Strict Input Validation**: Request payloads validated against Joi schemas to enforce data sanity.
- **Granular Authorization**: Enforces strict participant validation on direct messages, friendship actions, block lists, and group admin operations.
- **Safe Environment Isolation**: All sensitive credentials and database connection strings are isolated in local `.env` files guarded by `.gitignore`.

---

## 📄 License

This project is open-source and available under the [ISC License](LICENSE).
