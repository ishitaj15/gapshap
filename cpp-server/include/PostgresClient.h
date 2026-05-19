#pragma once
#include <string>
#include <pqxx/pqxx>

class PostgresClient {
public:
    PostgresClient(const std::string& connStr);

    void saveMessage(
        const std::string& conversationId,
        const std::string& senderId,
        const std::string& content
    );

private:
    pqxx::connection conn_;
};