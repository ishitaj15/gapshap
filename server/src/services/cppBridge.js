const net     = require('net');
const process = require('process');

// Message types (must match C++ BinaryProtocol.h)
const MSG_AUTH              = 0x01;
const MSG_SEND_MESSAGE      = 0x02;
const MSG_DELIVER_MESSAGE   = 0x03;
const MSG_USER_DISCONNECTED = 0x04;
const MSG_ACK               = 0x05;
const MSG_ERROR             = 0xFF;

class CppBridge {
  constructor() {
    this.client     = null;
    this.connected  = false;
    this.buffer     = Buffer.alloc(0);
    this.onDeliver  = null; // callback when C++ delivers a message
  }

  // ─── Connect to C++ server ──────────────────────────────
  connect() {
    const host = process.env.CPP_SERVER_HOST || 'localhost';
    const port = parseInt(process.env.CPP_SERVER_PORT) || 9000;

    this.client = new net.Socket();

    this.client.connect(port, host, () => {
      console.log('[bridge] connected to C++ server');
      this.connected = true;
    });

    // Handle incoming data from C++
    this.client.on('data', (data) => {
      this.buffer = Buffer.concat([this.buffer, data]);
      this._processBuffer();
    });

    this.client.on('close', () => {
      console.log('[bridge] disconnected from C++ server');
      this.connected = false;
      // Reconnect after 3 seconds
      setTimeout(() => this.connect(), 3000);
    });

    this.client.on('error', (err) => {
      console.error('[bridge] error:', err.message);
    });
  }

  // ─── Send AUTH frame ────────────────────────────────────
  authenticate(userId) {
    this._send(MSG_AUTH, { userId });
  }

  // ─── Send message via C++ ───────────────────────────────
  sendMessage(conversationId, senderId, recipientId, content) {
    this._send(MSG_SEND_MESSAGE, {
      conversationId,
      senderId,
      recipientId,
      content,
    });
  }

  // ─── Notify C++ user disconnected ───────────────────────
  userDisconnected(userId) {
    this._send(MSG_USER_DISCONNECTED, { userId });
  }

  // ─── Encode and send a frame ────────────────────────────
  _send(type, payload) {
    if (!this.connected) {
      console.warn('[bridge] not connected, dropping message');
      return;
    }

    const json       = JSON.stringify(payload);
    const jsonBuf    = Buffer.from(json, 'utf8');
    const frame      = Buffer.alloc(5 + jsonBuf.length);

    // Write length (4 bytes big-endian)
    frame.writeUInt32BE(jsonBuf.length, 0);
    // Write type (1 byte)
    frame.writeUInt8(type, 4);
    // Write payload
    jsonBuf.copy(frame, 5);

    this.client.write(frame);
  }

  // ─── Parse incoming frames from C++ ─────────────────────
  _processBuffer() {
    while (this.buffer.length >= 5) {
      const length = this.buffer.readUInt32BE(0);

      if (this.buffer.length < 5 + length) break;

      const type    = this.buffer.readUInt8(4);
      const payload = this.buffer.slice(5, 5 + length).toString('utf8');

      // Remove processed frame from buffer
      this.buffer = this.buffer.slice(5 + length);

      this._handleFrame(type, payload);
    }
  }

  // ─── Handle frames from C++ ─────────────────────────────
  _handleFrame(type, payload) {
    try {
      const data = JSON.parse(payload);

      if (type === MSG_DELIVER_MESSAGE && this.onDeliver) {
        this.onDeliver(data);
      } else if (type === MSG_ACK) {
        console.log('[bridge] ACK:', data.status);
      } else if (type === MSG_ERROR) {
        console.error('[bridge] C++ error:', data);
      }
    } catch (err) {
      console.error('[bridge] failed to parse frame:', err.message);
    }
  }
}

// Singleton — one connection shared across the app
const bridge = new CppBridge();
module.exports = bridge;