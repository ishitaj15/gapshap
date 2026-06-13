import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const msgFetchDuration = new Trend('msg_fetch_duration');
const convFetchDuration = new Trend('conv_fetch_duration');
const errorRate = new Rate('error_rate');

const TEST_USERS = [
  { email: 'alex@test.com',  password: 'test1234'  },
  { email: 'sushi@test.com', password: 'Sushi@31'  },
  { email: 'test1@load.com', password: 'Test@1234' },
  { email: 'test2@load.com', password: 'Test@1234' },
  { email: 'test3@load.com', password: 'Test@1234' },
  { email: 'test4@load.com', password: 'Test@1234' },
  { email: 'test5@load.com', password: 'Test@1234' },
  { email: 'test6@load.com', password: 'Test@1234' },
  { email: 'test7@load.com', password: 'Test@1234' },
  { email: 'test8@load.com', password: 'Test@1234' },
];

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0  },
  ],
  thresholds: {
    http_req_duration:  ['p(95)<500'],
    msg_fetch_duration: ['p(95)<300'],
    error_rate:         ['rate<0.1'],
  },
};

const BASE_URL = 'http://localhost:3001/api';

// ─── Setup: login all users ONCE before test starts ───────
export function setup() {
  const tokens = [];
  for (const user of TEST_USERS) {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res.status === 200) {
      const body = JSON.parse(res.body);
      tokens.push(body.accessToken);
      console.log(`✅ Logged in: ${user.email}`);
    } else {
      console.log(`❌ Failed: ${user.email} — ${res.status}`);
    }
  }
  console.log(`Tokens ready: ${tokens.length}`);
  return { tokens };
}

// ─── Main test: reuse tokens, test real endpoints ─────────
export default function (data) {
  const token = data.tokens[__VU % data.tokens.length];

  if (!token) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 1. Fetch conversations
  const convRes = http.get(`${BASE_URL}/messages/`, { headers });
  convFetchDuration.add(convRes.timings.duration);

  const convOk = check(convRes, {
    'conversations status 200': r => r.status === 200,
  });
  errorRate.add(!convOk);

  // 2. Fetch message history
  try {
    const convData = JSON.parse(convRes.body);
    if (convData.conversations && convData.conversations.length > 0) {
      const convId = convData.conversations[0].conversation_id;
      const msgRes = http.get(`${BASE_URL}/messages/${convId}`, { headers });
      msgFetchDuration.add(msgRes.timings.duration);
      check(msgRes, {
        'messages status 200': r => r.status === 200,
      });
    }
  } catch { }

  // 3. Health check
  const healthRes = http.get('http://localhost:3001/health');
  check(healthRes, {
    'health check ok': r => r.status === 200,
  });

  sleep(1);
}