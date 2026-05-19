#pragma once
#include "SessionManager.h"
#include "PostgresClient.h"
#include "Connection.h"
#include <unordered_map>
#include <memory>
#include <string>

class EpollServer {
public:
    EpollServer(int port, const std::string& dbConnStr);
    void run();

private:
    int           port_;
    int           epollFd_;
    int           serverFd_;
    SessionManager sessions_;
    PostgresClient db_;

    std::unordered_map<int, std::shared_ptr<Connection>> connections_;

    void setupServerSocket();
    void setupEpoll();
    void acceptConnection();
    void handleClient(int fd);
    void handleFrame(int fd, const std::string& payload, uint8_t type);
    void closeConnection(int fd);
    void sendFrame(int fd, uint8_t type, const std::string& payload);
};