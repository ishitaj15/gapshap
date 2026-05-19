#include "EpollServer.h"
#include "Logger.h"
#include <cstdlib>
#include <string>

int main() {
    // Read config from environment variables
    std::string dbHost = std::getenv("DB_HOST")     ? std::getenv("DB_HOST")     : "localhost";
    std::string dbPort = std::getenv("DB_PORT")     ? std::getenv("DB_PORT")     : "5432";
    std::string dbName = std::getenv("DB_NAME")     ? std::getenv("DB_NAME")     : "gapshap";
    std::string dbUser = std::getenv("DB_USER")     ? std::getenv("DB_USER")     : "gapshap";
    std::string dbPass = std::getenv("DB_PASSWORD") ? std::getenv("DB_PASSWORD") : "";

    std::string connStr =
        "host="     + dbHost +
        " port="    + dbPort +
        " dbname="  + dbName +
        " user="    + dbUser +
        " password=" + dbPass;

    Logger::info("Starting GapShap C++ server...");

    try {
        EpollServer server(9000, connStr);
        server.run();
    } catch (const std::exception& e) {
        Logger::error(std::string("Fatal error: ") + e.what());
        return 1;
    }

    return 0;
}