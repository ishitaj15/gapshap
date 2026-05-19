#include "BinaryProtocol.h"
#include <arpa/inet.h>
#include <cstring>
#include <stdexcept>

// ┌──────────┬──────┬───────────────────┐
// │  Length  │ Type │     Payload       │
// │ (4 bytes)│ (1B) │   (Length bytes)  │
// └──────────┴──────┴───────────────────┘

std::string BinaryProtocol::encode(uint8_t type, const std::string& payload) {
    std::string frame;
    frame.resize(5 + payload.size());

    // Write length as big-endian uint32
    uint32_t length = htonl(static_cast<uint32_t>(payload.size()));
    std::memcpy(&frame[0], &length, 4);

    // Write type
    frame[4] = type;

    // Write payload
    std::memcpy(&frame[5], payload.data(), payload.size());

    return frame;
}

bool BinaryProtocol::decode(const std::string& data, Frame& frame) {
    if (data.size() < 5) return false;

    // Read length
    uint32_t length;
    std::memcpy(&length, data.data(), 4);
    length = ntohl(length);

    if (data.size() < 5 + length) return false;

    // Read type
    frame.type = static_cast<uint8_t>(data[4]);

    // Read payload
    frame.payload = data.substr(5, length);

    return true;
}