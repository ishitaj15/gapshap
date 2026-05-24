#include "Connection.h"

Connection::Connection(int fd) : fd_(fd) {}

void Connection::appendData(const std::string& data) {
    buffer_ += data;
}

void Connection::clearBuffer() {
    buffer_.clear();
}

void Connection::consumeBytes(size_t n) {
    if (n >= buffer_.size())
        buffer_.clear();
    else
        buffer_ = buffer_.substr(n);
}