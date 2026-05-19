#pragma once
#include <string>
#include <cstdint>

// Message types
constexpr uint8_t MSG_AUTH             = 0x01;
constexpr uint8_t MSG_SEND_MESSAGE     = 0x02;
constexpr uint8_t MSG_DELIVER_MESSAGE  = 0x03;
constexpr uint8_t MSG_USER_DISCONNECTED = 0x04;
constexpr uint8_t MSG_ACK              = 0x05;
constexpr uint8_t MSG_ERROR            = 0xFF;

struct Frame {
    uint8_t     type;
    std::string payload; // JSON string
};

class BinaryProtocol {
public:
    // Encode a frame into bytes to send
    static std::string encode(uint8_t type, const std::string& payload);

    // Decode bytes into a Frame
    static bool decode(const std::string& data, Frame& frame);
};