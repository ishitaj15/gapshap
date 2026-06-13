# GapShap 💬
### *Baaten Jo Jodein — Words That Connect*

A production-grade real-time chat system featuring a custom **C++17 epoll-based TCP server** for message routing, JWT-secured REST APIs, and a React frontend — fully containerized with Docker Compose.

> Built to demonstrate systems-level engineering: custom binary protocols, non-blocking I/O, and secure authentication from scratch.

---

## Architecture
Browser (React) ──── Socket.io ────► Node.js ──── Raw TCP ────► C++ epoll Server

│                            │

└────── PostgreSQL ◄─────────┘

**Responsibility split:**
- **Node.js** — REST API, JWT auth, Socket.io, rate limiting, message history
- **C++ server** — real-time message routing, session management, DB persistence
- **PostgreSQL** — users, conversations, messages, refresh tokens

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend API | Node.js + Express + Socket.io |
| Real-time Engine | C++17 + Linux epoll (edge-triggered, `EPOLLET`) |
| Database | PostgreSQL 16 |
| Infrastructure | Docker + Docker Compose |
| Load Testing | k6 |

---

## Features

| Feature | Details |
|---|---|
| ⚡ Real-time messaging | Socket.io → Node.js → TCP → C++ server |
| 🔒 JWT authentication | Access + refresh token rotation |
| 🔑 Password security | bcrypt (cost factor 10) + strength validation |
| 🛡️ Rate limiting | Sliding window — 10 attempts / 15 min per IP |
| 🔄 Auto token refresh | Axios interceptor silently refreshes expired tokens |
| 💬 Conversation sidebar | Last message preview, sorted by recency |
| 📜 Message history | Loaded from PostgreSQL on conversation open |
| 🔍 User search | Search by username — UUIDs used internally |
| 🟢 Online/offline status | Real-time presence via Socket.io events |
| 🔔 Unread badges | Client-side counter, resets on conversation open |
| ✍️ Typing indicators | 3-second auto-clear timeout as safety net |
| 🕐 Timestamps | Per-message time + date separators between days |
| ⌨️ Shift+Enter | New line without sending |

---

## Performance

Load tested with **k6** — 50 concurrent virtual users, 3-stage ramp (10→50→0 VUs over 50s):

| Metric | Result |
|---|---|
| p50 latency | 8.37ms |
| p90 latency | 14.32ms |
| p95 latency | **17.82ms** |
| Error rate | **0.00%** |
| Throughput | 50 req/s |
| Total requests | 2,641 |
| Check success rate | 100% (2,631/2,631) |

---

## Key Engineering Decisions

| Decision | Rationale |
|---|---|
| `CHECK (user_a < user_b)` | Enforces canonical ordering — prevents duplicate conversation rows at DB level without application logic |
| Edge-triggered epoll (`EPOLLET`) | Requires draining buffer completely — fewer syscalls under high concurrency vs level-triggered |
| SHA-256 refresh token hashing | Raw tokens never stored — DB leak cannot expose valid sessions |
| Sliding window rate limiting | Prevents boundary gaming that fixed-window limiters are vulnerable to |
| UUID primary keys | Prevents sequential enumeration attacks (IDOR) |
| BIGSERIAL for messages | Faster inserts than UUID, provides natural chronological ordering |
| Connection pooling | Reuses DB connections — avoids per-request connection overhead |
| Binary TCP protocol | Length-prefix framing enables efficient, low-overhead IPC between Node.js and C++ |

---

## Binary Protocol (Node.js ↔ C++)

Custom framing protocol for inter-process communication:
┌──────────┬──────┬───────────────────┐

│  Length  │ Type │     Payload       │

│ (4 bytes)│ (1B) │   (JSON string)   │

└──────────┴──────┴───────────────────┘

| Type | Hex | Description |
|---|---|---|
| AUTH | `0x01` | Node.js registers connected user with C++ server |
| SEND_MESSAGE | `0x02` | New message forwarded to C++ for routing + persistence |
| DELIVER_MESSAGE | `0x03` | C++ delivers message to online recipient |
| USER_DISCONNECTED | `0x04` | Session cleanup on socket disconnect |
| ACK | `0x05` | Acknowledgement from C++ server |
| ERROR | `0xFF` | Error response |

---

## Database Schema

```sql
users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
)

conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a     UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b     UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK      (user_a < user_b),      -- prevents duplicates
  UNIQUE     (user_a, user_b)
)

messages (
  id              BIGSERIAL PRIMARY KEY,  -- natural ordering
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

CREATE INDEX idx_conv_created ON messages(conversation_id, created_at DESC);

refresh_tokens (
  token_hash VARCHAR(255) PRIMARY KEY,  -- SHA-256 hash, never raw
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN DEFAULT FALSE
)
```

---

## Security

- **OWASP-aligned** secure coding practices throughout
- Brute force protection via **sliding window rate limiting** (10 req / 15 min / IP)
- **JWT rotation** — short-lived access tokens (15min) + long-lived refresh tokens (7 days)
- **bcrypt** password hashing with cost factor 10
- **UUID primary keys** prevent IDOR / object enumeration attacks
- **SHA-256 hashed** refresh tokens — database leak cannot expose valid sessions
- Parameterized queries everywhere — SQL injection prevention

---

## Project Structure
gapshap/

├── client/                    # React + Vite + Tailwind frontend

│   └── src/

│       ├── pages/             # Login, Signup, Chat

│       └── lib/               # Axios interceptor (auto token refresh)

├── server/                    # Node.js + Express backend

│   └── src/

│       ├── routes/            # auth.js, messages.js

│       ├── middleware/        # jwt.js, rateLimit.js

│       ├── services/          # db.js, cppBridge.js, tokenService.js

│       └── sockets/           # handler.js (Socket.io + C++ bridge)

├── cpp-server/                # C++17 epoll TCP server

│   ├── src/

│   │   ├── server/            # EpollServer, Connection, SessionManager

│   │   ├── protocol/          # BinaryProtocol (length-prefix framing)

│   │   ├── db/                # PostgresClient (libpqxx)

│   │   └── util/              # Logger

│   ├── include/               # Header files

│   ├── CMakeLists.txt

│   └── Dockerfile

├── load-test/

│   └── load_test.js           # k6 load test (50 VUs, 3-stage ramp)

├── db/

│   └── init.sql               # PostgreSQL schema

├── docs/

│   └── BENCHMARKS.md          # Detailed load test results

└── docker-compose.yml

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 20+](https://nodejs.org/)

### Run Locally

```bash
# 1. Start PostgreSQL + C++ server
docker compose up -d

# 2. Start Node.js backend
cd server
npm install
npm run dev

# 3. Start React frontend (new terminal)
cd client
npm install
npm run dev
```

Open **http://localhost:5173**

### Run Load Tests

```bash
# Install k6: https://k6.io/docs/get-started/installation/
cd load-test
k6 run load_test.js
```

---

## Interview Notes

Key decisions worth discussing:

- **Why C++ for routing?** Node.js is single-threaded. Offloading real-time routing to a C++ epoll server means message delivery doesn't compete with auth/REST workloads.
- **Why edge-triggered epoll?** Forces the application to drain the buffer completely — reduces the number of epoll_wait syscalls under high connection counts.
- **Why hash refresh tokens?** If the database is compromised, hashed tokens cannot be used directly — attacker still needs the original random value.
- **Why `CHECK (user_a < user_b)`?** Eliminates an entire class of application-level bugs — duplicate conversations become a database impossibility, not a code concern.