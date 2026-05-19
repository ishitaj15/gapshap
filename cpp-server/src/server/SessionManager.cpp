#include "SessionManager.h"

void SessionManager::addSession(const std::string& userId, int fd) {
    std::lock_guard<std::mutex> lock(mutex_);
    userToFd_[userId] = fd;
    fdToUser_[fd]     = userId;
}

void SessionManager::removeSession(int fd) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = fdToUser_.find(fd);
    if (it != fdToUser_.end()) {
        userToFd_.erase(it->second);
        fdToUser_.erase(it);
    }
}

int SessionManager::getFd(const std::string& userId) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = userToFd_.find(userId);
    return it != userToFd_.end() ? it->second : -1;
}

std::string SessionManager::getUserId(int fd) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = fdToUser_.find(fd);
    return it != fdToUser_.end() ? it->second : "";
}