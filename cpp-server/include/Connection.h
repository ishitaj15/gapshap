#pragma once
#include <string>

class Connection {
public:
    Connection(int fd);

    int         fd()     const { return fd_; }
    std::string buffer() const { return buffer_; }

    void appendData(const std::string& data);
    void clearBuffer();

private:
    int         fd_;
    std::string buffer_;
};