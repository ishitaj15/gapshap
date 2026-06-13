# GapShap 💬
### Baaten Jo Jodein

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
| Load Testing | k6 |

## Features

- ⚡ Real-time messaging via Socket.io + C++ TCP server
- 🔒 JWT authentication with access + refresh tokens
- 🔑 bcrypt password hashing with strength validation
- 🛡️ Rate limiting (sliding window — 10 attempts / 15 min per IP)
- 🔄 Auto token refresh via axios interceptor
- 💬 Conversation sidebar with last message preview
- 📜 Message history loaded from PostgreSQL
- 🔍 User search by username
- 🟢 Online/offline status indicators
- 🔔 Unread message badges
- ✍️ Typing indicators
- 🕐 Message timestamps with date separators
- ⌨️ Shift+Enter for new lines
- 📊 Load tested with k6 — p95 latency 17ms at 50 concurrent users

## Performance

| Metric | Value |
|---|---|
| p50 latency | 8.37ms |
| p95 latency | 17.82ms |
| Concurrent users tested | 50 |
| Error rate | 0.00% |
| Throughput | 50 req/s |

## Key Engineering Decisions

| Decision | Why |
|---|---|
| `CHECK (user_a < user_b)` | Prevents duplicate conversation rows at DB level |
| Edge-triggered epoll (`EPOLLET`) | Fewer syscalls under high load vs level-triggered |
| SHA-256 refresh token hashing | DB leak can't expose valid tokens |
| Sliding window rate limiting | Can't game it by timing requests at boundaries |
| UUIDs for all IDs | Prevents user enumeration attacks |
| Connection pool | Reuses DB connections instead of creating per request |
| BIGSERIAL for messages | Faster inserts than UUID, natural chronological ordering |

## Project Structure
gapshap/

├── client/              # React + Vite + Tailwind frontend

│   └── src/

│       ├── pages/       # Login, Signup, Chat

│       └── lib/         # Axios interceptor

├── server/              # Node.js + Express backend

│   └── src/

│       ├── routes/      # auth, messages

│       ├── middleware/  # JWT, rate limiting

│       ├── services/    # db, cppBridge, tokenService

│       └── sockets/     # Socket.io handler

├── cpp-server/          # C++ epoll TCP server

│   ├── src/

│   │   ├── server/      # EpollServer, Connection, SessionManager

│   │   ├── protocol/    # BinaryProtocol

│   │   ├── db/          # PostgresClient

│   │   └── util/        # Logger

│   └── Dockerfile

├── load-test/

│   └── load_test.js     # k6 load test script

├── db/

│   └── init.sql         # PostgreSQL schema

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

### Run Load Tests

```bash
# Install k6: https://k6.io/docs/get-started/installation/
cd load-test
k6 run load_test.js
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

## Database Schema

```sql
users           -- accounts with bcrypt hashed passwords
conversations   -- unique pairs (CHECK user_a < user_b)
messages        -- chat messages with BIGSERIAL id for ordering
refresh_tokens  -- SHA-256 hashed tokens with expiry
```

## Security

- OWASP-aligned secure coding practices
- Brute force protection via sliding window rate limiting
- JWT access/refresh token rotation prevents session hijacking
- bcrypt password hashing (cost factor 10)
- UUID primary keys prevent object enumeration (IDOR) attacks
- Refresh tokens stored as SHA-256 hashes — DB leak safe