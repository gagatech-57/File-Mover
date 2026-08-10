# File Mover 📁

**File Mover** is a simple, modern, fast, zero-login file-sharing web application built on temporary **Sender ↔ Receiver** sharing sessions, powered by **MongoDB Atlas** and **Socket.IO**.

---

## 🌟 Key Features

- **No User Accounts / Zero Authentication**: No registration, passwords, JWT, or permanent user profiles.
- **Three 6-Digit Codes & QR Scanning**: Cryptographically secure 6-digit numeric verification codes generated on session creation alongside single-use QR tokens.
- **Real-Time Socket.IO Telemetry**: Live connection status badges (`Sender Online`, `Receiver Connected ✓`), upload speeds (MB/s), and progress animations.
- **Memory-Safe File Transfers**: Supports multiple files, Drag & Drop, individual downloads, and **Download All (ZIP)** archive streaming.
- **Automatic Browser Downloads**: Incoming files automatically trigger browser downloads on the Receiver side.
- **MongoDB Atlas Integration with Auto-TTL Expiry**: Temporary session records and temporary disk uploads are automatically purged after expiration.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Install Dependencies

```bash
# Install root, server, and client dependencies
npm run install:all
```

### 3. Environment Setup
Create `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/fileshare
SESSION_EXPIRATION_MINUTES=20
MAX_FILE_SIZE_BYTES=524288000
```

### 4. Run Development Servers

```bash
# Run server
npm run dev:server

# Run client
npm run dev:client
```

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, Lucide Icons, Socket.io-client, HTML5-Qrcode, QRCode
- **Backend**: Node.js, Express.js, Socket.IO, Multer, Archiver, Helmet, Express Rate Limit
- **Database**: MongoDB Atlas (Mongoose TTL indexes)
