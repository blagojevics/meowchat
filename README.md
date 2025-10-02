# MeowChat 🐱💬

A modern, secure real-time chat application built with Node.js, React, and Firebase.

## Features

### 🔐 Security Features
- **End-to-End Encryption**: Military-grade AES-256 encryption for all messages
- **RSA Key Exchange**: Secure 2048-bit RSA key exchange for perfect forward secrecy
- **Hybrid Authentication**: Supports both local MongoDB users and Firebase authentication
- **Google OAuth Integration**: Seamless sign-in with Google accounts
- **Password Security**: PBKDF2 key derivation with salt for password protection

### 💬 Chat Features
- **Real-time Messaging**: Instant message delivery using Socket.io
- **Private Chats**: Secure one-on-one conversations
- **Group Chats**: Multi-user encrypted chat rooms
- **Message History**: Persistent chat history with MongoDB
- **User Presence**: Real-time online/offline status

### 🎨 User Experience
- **Modern UI**: Clean, responsive design with Material-UI
- **Mobile Responsive**: Works seamlessly on all devices
- **Real-time Updates**: Live message delivery and user status

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** for data persistence
- **Socket.io** for real-time communication
- **Firebase Admin SDK** for authentication
- **Military-grade encryption** with crypto module

### Frontend
- **React** with Vite
- **Material-UI** for components
- **Firebase SDK** for authentication
- **Socket.io Client** for real-time messaging

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally
- Firebase project set up
- pnpm package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meowchat
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` files in both `backend/` and `frontend-vite/` folders to `.env` and fill in your values.

4. **Set up Firebase**
   - Create a Firebase project
   - Enable Authentication with Google provider
   - Download service account key as `serviceAccountKey.json` in backend folder
   - Add your domain to Firebase authorized domains

5. **Start the application**
   ```bash
   pnpm dev
   ```

This will start both the backend (port 5000) and frontend (port 5173) concurrently.

## Project Structure

```
meowchat/
├── backend/                 # Express.js API server
│   ├── config/             # Database and Firebase config
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   ├── services/          # Business logic and encryption
│   ├── socket/            # Socket.io handlers
│   └── server.js          # Main server file
├── frontend-vite/          # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Main pages
│   │   └── utils/         # Utility functions
└── package.json           # Workspace configuration
```

## Development

```bash
pnpm dev          # Runs both backend and frontend
pnpm dev:frontend # Runs only frontend
pnpm dev:backend  # Runs only backend
```

## Security

- **End-to-End Encryption**: AES-256 with RSA-2048 key exchange
- **Authentication**: Hybrid Firebase + local MongoDB system
- **Data Protection**: PBKDF2 key derivation and secure storage

---

Built with ❤️ using modern web technologies and security best practices.