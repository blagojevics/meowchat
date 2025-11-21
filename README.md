# MeowChat

_A full-stack, end-to-end encrypted chat application built for seamless, real-time communication._

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

MeowChat is a comprehensive messaging application designed for security, performance, and a rich user experience. It combines a robust Node.js backend with a modern React frontend to deliver real-time chat, end-to-end encryption, and seamless integration with the Meowgram social platform.

## ✨ Key Highlights

- ⚡️ **Real-Time Everything** - Instant message delivery, typing indicators, online presence, and message reactions powered by Socket.IO.
- 🔒 **End-to-End Encryption** - Secure conversations using RSA key pairs, ensuring only participants can read messages.
- 🔑 **Hybrid Authentication** - Seamlessly integrates Firebase Authentication (for Meowgram users & Google Sign-In) with a secure, JWT-based local session management system.
- 💬 **Rich Messaging Features** - Supports text, images, file attachments, replies, editing, and emoji reactions.
- 🚀 **Scalable & Modern Tech** - Built with Node.js, Express, MongoDB, and React 18 with Vite for a high-performance, developer-friendly stack.
- 🎨 **Customizable UI** - A clean, responsive interface with built-in dark and light mode support.

## 🐱 The Meowgram Connection

MeowChat is designed to work as a standalone application but also as a companion to Meowgram. The hybrid authentication system allows users to sign in with their existing Meowgram credentials, automatically syncing their profile information, including:

- Username and Bio
- Profile Picture
- Follower and Following Counts

This creates a unified ecosystem where users can seamlessly switch between social networking and private, secure messaging.

## 🚀 Features

### 🔐 Authentication & User Management

- **Hybrid Login System:** Log in locally or with a Meowgram/Google account via Firebase.
- **Secure Sessions:** JWT tokens for stateless API authentication with configurable expiration.
- **Profile Sync:** User data is automatically synced from Meowgram upon login.
- **Online Presence:** Real-time online/offline status tracking with "last seen" timestamps for all users.

### 💬 Real-Time Messaging

- **Instant Messaging:** WebSocket-based communication for zero-latency message delivery.
- **Typing Indicators:** See when other users in the chat are typing a message.
- **Message Reactions:** Add emoji reactions to messages, with updates synced to all participants.
- **Full CRUD:** Messages can be sent, edited (with history), and deleted (soft delete).
- **Reply System:** Create threaded conversations by replying directly to a specific message.

### 👥 Chat & Group Management

- **One-on-One & Group Chats:** Dynamically create private chats or groups with multiple participants.
- **Participant Management:** Add or remove users from group chats with proper permission checks.
- **Persistent History:** All conversations are stored securely, with infinite scroll to load older messages.
- **Chat Search:** Quickly find users to start new conversations.

### 🛡️ Security & Encryption

- **End-to-End Encryption (E2EE):** RSA key pairs are generated for each user, and messages are encrypted on the client before being sent.
- **Password Hashing:** User passwords for local accounts are hashed using bcrypt.
- **API Security:** Middleware stack includes Helmet for security headers, rate limiting to prevent abuse, and CORS policies.
- **Input Validation:** All incoming API requests are validated to prevent common vulnerabilities.

### 🎨 UI / UX

- **Responsive Design:** A mobile-first layout that adapts beautifully to any screen size, from phone to desktop.
- **Theme System:** Toggle between dark and light modes with user preferences saved locally.
- **Modern Interface:** A clean, two-panel layout with a chat list and a main conversation window.
- **File Uploads:** Drag-and-drop file uploader with progress indicators and image previews, powered by Cloudinary.

## 🛠 Technology Stack

| Backend                                 | Frontend                                |
| --------------------------------------- | --------------------------------------- |
| **Runtime:** Node.js                    | **Framework:** React 18 & Vite          |
| **Framework:** Express.js               | **Styling:** Custom CSS Modules         |
| **Database:** MongoDB & Mongoose        | **State Management:** React Context API |
| **Real-Time:** Socket.IO                | **Real-Time:** Socket.IO Client         |
| **Authentication:** JWT, Firebase Admin | **Authentication:** Firebase SDK        |
| **Security:** Bcrypt, Helmet, RSA       | **UI:** Modular & Reusable Components   |
| **File Storage:** Multer, Cloudinary    | **Build Tool:** Vite                    |

## 📦 Installation & Setup

To run this project locally, follow these steps:

### Prerequisites

- Node.js (v18.x or higher)
- npm or yarn
- MongoDB instance (local or cloud-based like MongoDB Atlas)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/meowchat.git
cd meowchat
```

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
pnpm install

# Create a .env file in the backend directory and add your credentials
# (see .env.example for required variables)
```

**backend/.env Example:**

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGIN=http://localhost:5173

# Firebase Admin SDK Configuration (from your Firebase project settings)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="your-firebase-private-key"

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
# Start the backend server
pnpm run dev
```

### 3. Frontend Setup

```bash
# Navigate to the frontend directory (from the root)
cd frontend-vite

# Install dependencies
pnpm install

# Create a .env file in the frontend-vite directory
```

**frontend-vite/.env Example:**

```env
# URL of your backend server
VITE_API_URL=http://localhost:5000

# Firebase Client SDK Configuration (get from Firebase Console)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

```bash
# Start the frontend development server
pnpm run dev
```

The application should now be running on [http://localhost:5173](http://localhost:5173).

## 🔮 Future Plans

- [ ] **Voice & Video Calls:** Integrating WebRTC for peer-to-peer audio and video communication.
- [ ] **Push Notifications:** Implementing service workers for browser push notifications when the app is in the background.
- [ ] **Advanced Group Management:** Adding roles (admin, moderator), permissions, and chat settings.
- [ ] **Customizable Themes:** Allowing users to select different color schemes beyond light/dark mode.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
