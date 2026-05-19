FROM ubuntu:24.04

# Install build tools and dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libpqxx-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy source code
COPY . .

# Build the project
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --parallel

CMD ["./build/gapshap_cpp"]