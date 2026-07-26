# GapShap 💬
### Baaten Jo Jodein 

> A real-time chat system built from scratch to explore systems-level engineering: a custom C++17 epoll-based TCP server for message routing, JWT-secured REST APIs, and a React frontend, fully containerized with Docker Compose.

<!-- DEMO GIF: replace the path below with your recording once ready. -->
<!-- Record two browser windows chatting live with the C++ server logs visible routing messages. Export as GIF (ScreenToGif) or link a Loom. -->

![GapShap demo](docs/demo.gif)

*Two users messaging in real time, with the C++ server routing each message over the custom binary protocol.*

---

## 🚀 Try It in 3 Commands

The whole stack is containerized, so the full system runs locally in about a minute:

```bash
docker compose up -d                         # PostgreSQL + C++ epoll server
cd server && npm install && npm run dev      # Node.js backend
cd client && npm install && npm run dev      # React frontend (new terminal)
```

Then open **http://localhost:5173** and sign up two users in two browser windows to see real-time messaging.

> For a systems project like this, a one-command local run is the intended way to try it. Any reviewer with Docker can have the full stack live in under a minute.

---

## 🎯 Why I Built This

Most chat apps stop at Socket.io. I wanted to go a layer deeper and build the real-time routing engine myself: a non-blocking C++ TCP server using Linux epoll, a custom binary wire protocol between Node.js and C++, and authentication from scratch. The goal was to understand how real-time systems work beneath the framework, not to reach for a library.

---

## 🏗️ Architecture

Browser (React) --Socket.io--> Node.js --Raw TCP--> C++ epoll Server
| | |
+---------------- PostgreSQL <--------------------------+


| Component | Responsibility |
|-----------|----------------|
| **Node.js** | REST API, JWT auth, Socket.io, rate limiting, message history |
| **C++ server** | Real-time message routing, session management, DB persistence |
| **PostgreSQL** | Users, conversations, messages, refresh tokens |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend API | Node.js + Express + Socket.io |
| Real-time Engine | C++17 + Linux epoll (edge-triggered, EPOLLET) |
| Database | PostgreSQL 16 |
| Infrastructure | Docker + Docker Compose |
| Load Testing | k6 |

---

## ✨ Features

| Feature | Details |
|---------|---------|
| ⚡ Real-time messaging | Socket.io to Node.js to TCP to C++ server |
| 🔒 JWT authentication | Access + refresh token rotation |
| 🔑 Password security | bcrypt (cost factor 10) + strength validation |
| 🛡️ Rate limiting | Sliding window: 10 attempts / 15 min per IP |
| 🔄 Auto token refresh | Axios interceptor silently refreshes expired tokens |
| 💬 Conversation sidebar | Last message preview, sorted by recency |
| 📜 Message history | Loaded from PostgreSQL on conversation open |
| 🔍 User search | Search by username; UUIDs used internally |
| 🟢 Online/offline status | Real-time presence via Socket.io events |
| 🔔 Unread badges | Client-side counter, resets on conversation open |
| ✍️ Typing indicators | 3-second auto-clear timeout as a safety net |
| 🕐 Timestamps | Per-message time + date separators between days |
| ⌨️ Shift+Enter | New line without sending |

---

## ⚡ Performance

Load tested with **k6** against the Node.js REST API, at 50 concurrent virtual users over a 3-stage ramp (10 → 50 → 0 VUs, 50s). The test exercises the conversation-list, message-history, and health endpoints.

| Metric | Result |
|--------|--------|
| p95 latency (all requests) | 17.82 ms |
| p95 latency (message history, hits Postgres) | 19.83 ms |
| Error rate | 0.00% (0 / 2,641 requests) |
| Checks passed | 100% (2,631 / 2,631) |
| Throughput | ~50 req/s sustained (at 50 VUs) |

> Scope note: this benchmark measures the Node.js API + PostgreSQL read path under load. The real-time C++ routing path is exercised manually, not in this test. Throughput reflects the 50-VU configuration, not a measured ceiling.

---

## 🔑 Key Engineering Decisions

| Decision | Rationale |
|----------|-----------|
| `CHECK (user_a < user_b)` | Enforces canonical ordering, preventing duplicate conversation rows at the DB level without application logic |
| Edge-triggered epoll (EPOLLET) | Fires once on state change and requires fully draining the buffer, trading complexity for fewer syscalls under concurrency |
| SHA-256 refresh token hashing | Raw tokens are never stored, so a DB leak cannot expose valid sessions |
| Sliding window rate limiting | Avoids the boundary-gaming that fixed-window limiters are vulnerable to |
| UUID primary keys | Prevent sequential enumeration attacks (IDOR) |
| BIGSERIAL for messages | Faster inserts than UUID, with natural chronological ordering |
| Connection pooling | Reuses DB connections, avoiding per-request connection overhead |
| Binary TCP protocol | Length-prefix framing enables low-overhead IPC between Node.js and C++ |

---

## 📡 Binary Protocol (Node.js ↔ C++)

Custom length-prefixed framing for inter-process communication:

┌───────────┬────────┬────────────────────┐
│ Length │ Type │ Payload │
│ (4 bytes) │ (1 B) │ (JSON string) │
└───────────┴────────┴────────────────────┘


| Type | Hex | Description |
|------|-----|-------------|
| AUTH | `0x01` | Node.js registers a connected user with the C++ server |
| SEND_MESSAGE | `0x02` | New message forwarded to C++ for routing + persistence |
| DELIVER_MESSAGE | `0x03` | C++ delivers a message to an online recipient |
| USER_DISCONNECTED | `0x04` | Session cleanup on socket disconnect |
| ACK | `0x05` | Acknowledgement from the C++ server |
| ERROR | `0xFF` | Error response |

---

## 🗄️ Database Schema

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
  CHECK      (user_a < user_b),      -- prevents duplicate conversations
  UNIQUE     (user_a, user_b)
)

messages (
  id              BIGSERIAL PRIMARY KEY,  -- natural chronological ordering
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)

CREATE INDEX idx_conv_created ON messages(conversation_id, created_at DESC);

refresh_tokens (
  token_hash VARCHAR(255) PRIMARY KEY,  -- SHA-256 hash, never the raw token
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN DEFAULT FALSE
)
```

---

## 🔐 Security

- OWASP-aligned secure coding practices throughout
- Brute-force protection via sliding-window rate limiting (10 req / 15 min / IP)
- JWT rotation: short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- bcrypt password hashing with cost factor 10
- UUID primary keys prevent IDOR / object-enumeration attacks
- SHA-256 hashed refresh tokens, so a database leak cannot expose valid sessions
- Parameterized queries everywhere for SQL-injection prevention
- Login errors are deliberately generic ("Invalid credentials") to prevent user enumeration

---

## 📁 Project Structure

gapshap/
├── client/ # React + Vite + Tailwind frontend
│ └── src/
│ ├── pages/ # Login, Signup, Chat
│ └── lib/ # Axios interceptor (auto token refresh)
├── server/ # Node.js + Express backend
│ └── src/
│ ├── routes/ # auth.js, messages.js
│ ├── middleware/ # jwt.js, rateLimit.js
│ ├── services/ # db.js, cppBridge.js, tokenService.js
│ └── sockets/ # handler.js (Socket.io + C++ bridge)
├── cpp-server/ # C++17 epoll TCP server
│ ├── src/
│ │ ├── server/ # EpollServer, Connection, SessionManager
│ │ ├── protocol/ # BinaryProtocol (length-prefix framing)
│ │ ├── db/ # PostgresClient (libpqxx)
│ │ └── util/ # Logger
│ ├── include/ # Header files
│ ├── CMakeLists.txt
│ └── Dockerfile
├── load-test/
│ └── load_test.js # k6 load test (50 VUs, 3-stage ramp)
├── db/
│ └── init.sql # PostgreSQL schema
├── docs/
│ └── BENCHMARKS.md # Detailed load-test results
└── docker-compose.yml


---

## 🏁 Getting Started

**Prerequisites:** Docker Desktop, Node.js 20+

```bash
# 1. Start PostgreSQL + C++ server
docker compose up -d

# 2. Start Node.js backend
cd server && npm install && npm run dev

# 3. Start React frontend (new terminal)
cd client && npm install && npm run dev
```

Open **http://localhost:5173**

**Run load tests:**

```bash
# Install k6: https://k6.io/docs/get-started/installation/
cd load-test && k6 run load_test.js
```

---

## 👩‍💻 Author

**Ishita Jain** · Pre-final year B.Tech CSE (Cyber Security), LNCT&S Bhopal

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ishitaj15)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ishita-jain-179a68328)
