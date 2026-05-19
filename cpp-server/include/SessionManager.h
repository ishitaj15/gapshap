#pragma once
#include <string>
#include <unordered_map>
#include <mutex>

class SessionManager {
public:
    // Register a user's file descriptor
    void addSession(const std::string& userId, int fd);

    // Remove a session by fd
    void removeSession(int fd);

    // Get fd for a userId
    int getFd(const std::string& userId);

    // Get userId for a fd
    std::string getUserId(int fd);

private:
    std::unordered_map<std::string, int> userToFd_;
    std::unordered_map<int, std::string> fdToUser_;
    std::mutex mutex_;
};