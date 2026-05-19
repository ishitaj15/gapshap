#include "Logger.h"
#include <iostream>
#include <chrono>
#include <ctime>

static std::string timestamp() {
    auto now  = std::chrono::system_clock::now();
    auto time = std::chrono::system_clock::to_time_t(now);
    std::string ts(std::ctime(&time));
    ts.pop_back(); // remove newline
    return ts;
}

void Logger::info(const std::string& msg) {
    std::cout << "[" << timestamp() << "] [INFO]  " << msg << std::endl;
}

void Logger::error(const std::string& msg) {
    std::cerr << "[" << timestamp() << "] [ERROR] " << msg << std::endl;
}

void Logger::debug(const std::string& msg) {
    std::cout << "[" << timestamp() << "] [DEBUG] " << msg << std::endl;
}