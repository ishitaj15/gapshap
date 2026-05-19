#include "PostgresClient.h"
#include "Logger.h"

PostgresClient::PostgresClient(const std::string& connStr)
    : conn_(connStr)
{
    Logger::info("Connected to PostgreSQL");
}

void PostgresClient::saveMessage(
    const std::string& conversationId,
    const std::string& senderId,
    const std::string& content)
{
    try {
        pqxx::work txn(conn_);
        txn.exec_params(
            "INSERT INTO messages (conversation_id, sender_id, content) "
            "VALUES ($1, $2, $3)",
            conversationId, senderId, content
        );
        txn.commit();
    } catch (const std::exception& e) {
        Logger::error(std::string("saveMessage failed: ") + e.what());
    }
}