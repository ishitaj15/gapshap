# Load Test Results

## Setup
- Tool: k6 v2.0.0
- Concurrent users: 50 VUs
- Duration: 50 seconds (ramp up → sustain → ramp down)
- Endpoints tested: conversations, message history, health check

## Results

| Metric | Value |
|---|---|
| p50 latency | 8.37ms |
| p90 latency | 14.32ms |
| p95 latency | 17.82ms |
| p99 latency | ~262ms (max) |
| Error rate | 0.00% |
| Total requests | 2,641 |
| Throughput | 50 req/s |

## Conclusion
Server handles 50 concurrent users with sub-20ms p95 latency
and zero errors on all tested endpoints.