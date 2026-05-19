#include "Connection.h"

Connection::Connection(int fd) : fd_(fd) {}

void Connection::appendData(const std::string& data) {
    buffer_ += data;
}

void Connection::clearBuffer() {
    buffer_.clear();
}