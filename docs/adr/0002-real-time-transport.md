# ADR 0002: Real-time Transport Layer

## Status
Proposed

## Context
The system requires low-latency, bidirectional, real-time message exchange between the trading clients (browsers) and the matching engine gateway:
- Client to server: Submit orders, cancel orders.
- Server to client: Order execution reports (acks, fills, cancels), order book delta/snapshot broadcasts.

We evaluated three transport strategies:

### Option A: Server-Sent Events (SSE) + HTTP POST
- **Pattern:** Clients use standard HTTP POST request to submit orders; they subscribe to an HTTP event stream (SSE) for real-time updates.
- **Pros:** Native browser support, works over HTTP/2, automatic reconnection, text-based.
- **Cons:** Unidirectional. Order submission requires a separate HTTP handshake (TCP/TLS setup overhead if not reused), which increases latency compared to keeping a hot socket connection.

### Option B: Raw WebSockets (`ws` library)
- **Pattern:** Bidirectional connection using a raw TCP WebSocket upgrade.
- **Pros:** Lowest overhead, minimal protocol footprint, highly standard.
- **Cons:** Requires manual implementation of heartbeat/pings to detect dead connections, manual reconnection policies, and packet formatting/routing.

### Option C: Socket.io
- **Pattern:** Bidirectional abstraction framework layered on top of Engine.io (WebSockets with HTTP long-polling fallback).
- **Pros:**
  - Robust built-in reconnection logic and backoff.
  - Heartbeats/Ping-pong out of the box to quickly discover dead sockets.
  - Multi-room broadcasting (essential for sharding order feeds per symbol).
  - Clean separation of event names (e.g. `order:submit`, `book:update`) instead of wrapping everything in custom JSON envelopes on a single channel.
- **Cons:** Slight library overhead and custom handshake protocol. Must run on a persistent Node.js server (cannot be run in serverless functions like Vercel).

---

## Decision
We select **Option C: Socket.io**.
By decoupling the WebSocket Gateway from Vercel (running it on a persistent container platform like Railway or Fly.io), we avoid serverless connection limits. Socket.io provides the best balance of low latency, structural messaging features (rooms, events), and reconnection robustness.

## Consequences
- We will build `apps/engine` as a persistent Node.js process using HTTP + Socket.io.
- The React client in `apps/web` will establish a connection to the external gateway server url (reverting to localhost in development).
- We will configure a Redis adapter (Upstash Redis) for Socket.io in Phase 2 to allow horizontal scaling (multiple instances of Socket.io gateways broadcasting consistent book delta streams).
