#include "EpollServer.h"
#include "BinaryProtocol.h"
#include "Logger.h"
#include <sys/epoll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <fcntl.h>
#include <stdexcept>
#include <cstring>

// Simple JSON helpers (no external lib needed)
static std::string jsonGet(const std::string& json, const std::string& key) {
    std::string search = "\"" + key + "\":\"";
    auto pos = json.find(search);
    if (pos == std::string::npos) return "";
    pos += search.size();
    auto end = json.find("\"", pos);
    return json.substr(pos, end - pos);
}

EpollServer::EpollServer(int port, const std::string& dbConnStr)
    : port_(port), epollFd_(-1), serverFd_(-1), db_(dbConnStr)
{}

void EpollServer::run() {
    setupServerSocket();
    setupEpoll();

    Logger::info("C++ epoll server running on port " + std::to_string(port_));

    constexpr int MAX_EVENTS = 64;
    epoll_event events[MAX_EVENTS];

    while (true) {
        int n = epoll_wait(epollFd_, events, MAX_EVENTS, -1);
        for (int i = 0; i < n; i++) {
            if (events[i].data.fd == serverFd_) {
                acceptConnection();
            } else {
                handleClient(events[i].data.fd);
            }
        }
    }
}

void EpollServer::setupServerSocket() {
    serverFd_ = socket(AF_INET, SOCK_STREAM, 0);
    if (serverFd_ < 0) throw std::runtime_error("socket() failed");

    int opt = 1;
    setsockopt(serverFd_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    // Non-blocking
    fcntl(serverFd_, F_SETFL, O_NONBLOCK);

    sockaddr_in addr{};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port        = htons(port_);

    if (bind(serverFd_, (sockaddr*)&addr, sizeof(addr)) < 0)
        throw std::runtime_error("bind() failed");

    if (listen(serverFd_, SOMAXCONN) < 0)
        throw std::runtime_error("listen() failed");
}

void EpollServer::setupEpoll() {
    epollFd_ = epoll_create1(0);
    if (epollFd_ < 0) throw std::runtime_error("epoll_create1() failed");

    epoll_event ev{};
    ev.events  = EPOLLIN | EPOLLET; // Edge-triggered
    ev.data.fd = serverFd_;
    epoll_ctl(epollFd_, EPOLL_CTL_ADD, serverFd_, &ev);
}

void EpollServer::acceptConnection() {
    sockaddr_in clientAddr{};
    socklen_t   clientLen = sizeof(clientAddr);
    int clientFd = accept(serverFd_, (sockaddr*)&clientAddr, &clientLen);
    if (clientFd < 0) return;

    fcntl(clientFd, F_SETFL, O_NONBLOCK);

    epoll_event ev{};
    ev.events  = EPOLLIN | EPOLLET;
    ev.data.fd = clientFd;
    epoll_ctl(epollFd_, EPOLL_CTL_ADD, clientFd, &ev);

    connections_[clientFd] = std::make_shared<Connection>(clientFd);
    Logger::debug("New connection fd=" + std::to_string(clientFd));
}

void EpollServer::handleClient(int fd) {
    char buf[4096];
    auto& conn = connections_[fd];

    while (true) {
        ssize_t n = recv(fd, buf, sizeof(buf), 0);
        if (n <= 0) {
            if (n == 0 || (errno != EAGAIN && errno != EWOULDBLOCK)) {
                closeConnection(fd);
            }
            break;
        }
        conn->appendData(std::string(buf, n));
    }

    // Try to parse complete frames
    Frame frame;
  while (BinaryProtocol::decode(conn->buffer(), frame)) {
    handleFrame(fd, frame.payload, frame.type);
    // Remove only the processed frame, not the entire buffer
    conn->consumeBytes(5 + frame.payload.size());
}
}

void EpollServer::handleFrame(int fd, const std::string& payload, uint8_t type) {
    if (type == MSG_AUTH) {
        std::string userId = jsonGet(payload, "userId");
        if (!userId.empty()) {
            sessions_.addSession(userId, fd);
            Logger::info("User authenticated: " + userId);
            sendFrame(fd, MSG_ACK, "{\"status\":\"ok\"}");
        }
    }
    else if (type == MSG_SEND_MESSAGE) {
        std::string conversationId = jsonGet(payload, "conversationId");
        std::string senderId       = jsonGet(payload, "senderId");
        std::string recipientId    = jsonGet(payload, "recipientId");
        std::string content        = jsonGet(payload, "content");

        // Save to database
        db_.saveMessage(conversationId, senderId, content);

        // Deliver to recipient if online
        int recipientFd = sessions_.getFd(recipientId);
        if (recipientFd != -1) {
            sendFrame(recipientFd, MSG_DELIVER_MESSAGE, payload);
        }

        // ACK to sender
        sendFrame(fd, MSG_ACK, "{\"status\":\"delivered\"}");
    }
    else if (type == MSG_USER_DISCONNECTED) {
    std::string userId = jsonGet(payload, "userId");
    if (!userId.empty()) {
        sessions_.removeSessionByUserId(userId);
        Logger::info("User session removed: " + userId);
    }
}
}

void EpollServer::closeConnection(int fd) {
    std::string userId = sessions_.getUserId(fd);
    if (!userId.empty()) {
        sessions_.removeSession(fd);
        Logger::info("User disconnected: " + userId);
    }
    epoll_ctl(epollFd_, EPOLL_CTL_DEL, fd, nullptr);
    connections_.erase(fd);
    close(fd);
}

void EpollServer::sendFrame(int fd, uint8_t type, const std::string& payload) {
    std::string frame = BinaryProtocol::encode(type, payload);
    send(fd, frame.data(), frame.size(), 0);
}