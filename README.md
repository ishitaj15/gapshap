# GapShap 💬

A production-grade real-time chat application with a custom C++ backend engine.

## Live Architecture
Browser (React) ──── Socket.io ────► Node.js ──── TCP ────► C++ epoll Server
│                        │
└──── PostgreSQL ◄───────┘

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend API | Node.js + Express + Socket.io |
| Real-time Engine | C++17 + Linux epoll (edge-triggered) |
| Database | PostgreSQL 16 |
| Infrastructure | Docker + Docker Compose |

## Features

- Real-time messaging via Socket.io + C++ TCP server
- JWT authentication with access + refresh tokens
- bcrypt password hashing
- Rate limiting on login (10 attempts / 15 min)
- Auto token refresh via axios interceptor
- Password strength validation
- Conversation sidebar with last message preview
- Message history loaded from PostgreSQL
- User search by username
- Online/offline status indicators
- Unread message badges

## Project Structure
gapshap/
├── client/          # React + Vite + Tailwind frontend
│   └── src/
│       ├── pages/   # Login, Signup, Chat
│       └── lib/     # Axios interceptor
├── server/          # Node.js + Express backend
│   └── src/
│       ├── routes/      # auth, messages
│       ├── middleware/  # JWT, rate limiting
│       ├── services/    # db, cppBridge, tokenService
│       └── sockets/     # Socket.io handler
├── cpp-server/      # C++ epoll TCP server
│   ├── src/
│   │   ├── server/    # EpollServer, Connection, SessionManager
│   │   ├── protocol/  # BinaryProtocol
│   │   ├── db/        # PostgresClient
│   │   └── util/      # Logger
│   └── Dockerfile
├── db/
│   └── init.sql     # PostgreSQL schema
└── docker-compose.yml

## Getting Started

### Prerequisites
- Docker Desktop
- Node.js 20+

### Run locally

```bash
# 1. Start database + C++ server
docker compose up -d

# 2. Start Node.js backend
cd server && npm install && npm run dev

# 3. Start React frontend
cd client && npm install && npm run dev
```

Open **http://localhost:5173**

## Database Schema

```sql
users           -- accounts with bcrypt hashed passwords
conversations   -- unique pairs of users (CHECK user_a < user_b)
messages        -- chat messages with conversation reference
refresh_tokens  -- hashed refresh tokens with expiry
```

## Binary Protocol (Node.js ↔ C++)
┌──────────┬──────┬───────────────────┐
│  Length  │ Type │     Payload       │
│ (4 bytes)│ (1B) │   (JSON string)   │
└──────────┴──────┴───────────────────┘

| Type | Value | Description |
|---|---|---|
| AUTH | 0x01 | User connected |
| SEND_MESSAGE | 0x02 | New message |
| DELIVER_MESSAGE | 0x03 | Deliver to recipient |
| USER_DISCONNECTED | 0x04 | User left |
| ACK | 0x05 | Acknowledgement |
| ERROR | 0xFF | Error |

## Key Engineering Decisions

- **UUID primary keys** — prevents enumeration attacks
- **CHECK (user_a < user_b)** — enforces one row per conversation pair
- **BIGSERIAL for messages** — faster inserts than UUID, natural ordering
- **Connection pool** — reuses DB connections instead of creating per request
- **epoll edge-triggered** — handles thousands of connections with minimal CPU
- **Token hashing** — refresh tokens stored as SHA-256 hashes, never raw
- **Usernames for display only** — UUIDs used internally for all operations