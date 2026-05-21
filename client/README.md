# GapShap 💬

A production-grade real-time chat application with a custom C++ backend engine.

## Architecture

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
- JWT authentication with refresh tokens
- bcrypt password hashing
- Rate limiting on login (10 attempts / 15 min)
- Auto token refresh via axios interceptor
- Password strength validation
- Persistent message history

## Project Structure
gapshap/
├── client/          # React frontend
├── server/          # Node.js backend
├── cpp-server/      # C++ epoll TCP server
├── db/              # PostgreSQL schema
└── docker-compose.yml

## Getting Started

### Prerequisites
- Docker Desktop
- Node.js 20+

### Run locally

```bash
# Start database + C++ server
docker compose up -d

# Start Node.js backend
cd server && npm install && npm run dev

# Start React frontend
cd client && npm install && npm run dev
```

Open http://localhost:5173

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

## Database Schema

- `users` — accounts with bcrypt hashed passwords
- `conversations` — unique pairs of users
- `messages` — chat messages with conversation reference
- `refresh_tokens` — hashed refresh tokens with expiry

