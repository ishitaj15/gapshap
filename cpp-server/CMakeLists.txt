cmake_minimum_required(VERSION 3.16)
project(gapshap_cpp)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find PostgreSQL
find_package(PostgreSQL REQUIRED)

# Find libpqxx
find_library(PQXX_LIB pqxx REQUIRED)

# Source files
set(SOURCES
    src/main.cpp
    src/server/EpollServer.cpp
    src/server/Connection.cpp
    src/server/SessionManager.cpp
    src/protocol/BinaryProtocol.cpp
    src/db/PostgresClient.cpp
    src/util/Logger.cpp
)

add_executable(gapshap_cpp ${SOURCES})

target_include_directories(gapshap_cpp PRIVATE
    include
    ${PostgreSQL_INCLUDE_DIRS}
)

target_link_libraries(gapshap_cpp PRIVATE
    ${PQXX_LIB}
    ${PostgreSQL_LIBRARIES}
)