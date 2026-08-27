/* =====================================================================
   ∑ Calc License Validator — Cloudflare Worker v2
   建立日期：2026-05-14
   版本：2.4.1（2026-07-22：/health 加 paypal_client_id_hash，供前端 fail-loud cross-check）
   版本：2.4.2（2026-08-27：main catch 不再把 err.stack 回客戶端，避免內部細節洩漏）
        2.4.0（2026-05-29：JWT 加 tier 欄位 — Phase 2.3 Freemium 上線）
        2.3.0（2026-05-16：/webhook/paypal 加入來源 IP 觀察 log-only）

   端點：
     GET  /health              → 健康檢查（含 KV ping）
     POST /license/issue       → 簽發 JWT（必須 KV 中存在且 active）+ rate limited
     POST /license/validate    → 驗證 JWT（含 KV 撤銷檢查）
     POST /webhook/paypal      → PayPal Webhook 接收（驗簽後更新 KV）
     GET  /subscription/:id    → 查訂閱狀態（除錯用）

   必要 Bindings（在 Cloudflare Dashboard 設定）：
     LICENSES                  → KV namespace
     SECRET_KEY                → Secret（JWT 簽名用）
     PAYPAL_CLIENT_ID          → Secret（PayPal OAuth）
     PAYPAL_CLIENT_SECRET      → Secret（PayPal OAuth）
     PAYPAL_WEBHOOK_ID         → Plaintext（Webhook 驗簽用）
     PAYPAL_API_BASE           → Plaintext（https://api-m.paypal.com）

   Rate limiting（v2.2.0）：純 KV-based，不需任何額外 binding。
     - Cloudflare Rate Limiting binding 經實測：Dashboard 編輯器部署下
       計數器不能跨請求，故棄用。改用 KV fixed-window。
     - 速率值寫死在程式碼常數（RL_ISSUE_*），調整改常數重部署即可。

   KV 資料結構：
     sub:{subscriptionId}      → { status, planId, activatedAt, ... }
     evt:{eventId}             → 1（30 天 TTL，去重）
     oauth:token               → { token, expiresAt }（緩存 8 小時）

   JWT payload（v2.4.0+）：
     { sub, type, plan, tier, iat, exp }
     - tier：'pro'（目前所有 active 訂閱者皆 pro；保留欄位以利未來多層擴充）
     - 無 tier 欄位的舊 token（v2.3.0 以前簽發）視為 'pro' 以維持向下相容
   ===================================================================== */

const ALGORITHM = 'HS256';
const JWT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 天（短期）
const EVENT_DEDUP_TTL = 30 * 24 * 60 * 60; // 30 天
const OAUTH_CACHE_TTL = 8 * 60 * 60;       // 8 小時

// KV-based rate limiting（取代 Cloudflare RL binding——該 binding
// 在 Dashboard 編輯器部署下不能跨請求計數）。調整改這裡重部署即可。
const RL_ISSUE_IP_LIMIT   = 10;        // 每 IP
const RL_ISSUE_IP_WINDOW  = 60;        // 60 秒
const RL_ISSUE_SUB_LIMIT  = 5;         // 每 subscriptionId
const RL_ISSUE_SUB_WINDOW = 60 * 60;   // 3600 秒（KV 支援任意窗口）

// PayPal webhook 來源 IP 觀察（log-only，v2.3.0）。
// 官方公布 CIDR（Live+Sandbox 共用）。PayPal 明言不保證穩定且不建議
// allowlist，故此處僅 console.warn 記錄、絕不封鎖——零誤殺、收集真實
// 流量數據後再決定是否升級為封鎖。
const PAYPAL_WEBHOOK_CIDRS = [
  '64.4.240.0/21', '64.4.248.0/22', '66.211.168.0/22', '91.243.72.0/23',
  '173.0.80.0/20', '185.177.52.0/22', '192.160.215.0/24', '198.54.216.0/23'
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

/* =====================================================================
   Base64URL helpers
   ===================================================================== */
function base64UrlEncodeBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(str) {
  return base64UrlEncodeBuffer(new TextEncoder().encode(str));
}

function base64UrlDecodeBuffer(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeString(str) {
  return new TextDecoder().decode(base64UrlDecodeBuffer(str));
}

/* =====================================================================
   JWT
   ===================================================================== */
async function createJWT(payload, secret) {
  const header = { alg: ALGORITHM, typ: 'JWT' };
  const headerStr = base64UrlEncodeString(JSON.stringify(header));
  const payloadStr = base64UrlEncodeString(JSON.stringify(payload));
  const message = `${headerStr}.${payloadStr}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return `${message}.${base64UrlEncodeBuffer(sigBuf)}`;
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerStr, payloadStr, signatureStr] = parts;
    const message = `${headerStr}.${payloadStr}`;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const signature = base64UrlDecodeBuffer(signatureStr);
    const valid = await crypto.subtle.verify(
      'HMAC', key, signature, new TextEncoder().encode(message)
    );
    if (!valid) return null;
    const payload = JSON.parse(base64UrlDecodeString(payloadStr));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

/* =====================================================================
   KV helpers
   ===================================================================== */
const KV_KEY_SUB    = (subId)   => `sub:${subId}`;
const KV_KEY_EVENT  = (eventId) => `evt:${eventId}`;
const KV_KEY_OAUTH  = () => `oauth:token`;
const KV_KEY_RL     = (scope, id, bucket) => `rl:${scope}:${id}:${bucket}`;

async function getSubscription(env, subId) {
  const raw = await env.LICENSES.get(KV_KEY_SUB(subId));
  return raw ? JSON.parse(raw) : null;
}

async function setSubscription(env, subId, data) {
  const merged = { subscriptionId: subId, ...data, updatedAt: new Date().toISOString() };
  await env.LICENSES.put(KV_KEY_SUB(subId), JSON.stringify(merged));
  return merged;
}

async function isEventProcessed(env, eventId) {
  const seen = await env.LICENSES.get(KV_KEY_EVENT(eventId));
  return seen !== null;
}

async function markEventProcessed(env, eventId) {
  await env.LICENSES.put(KV_KEY_EVENT(eventId), '1', { expirationTtl: EVENT_DEDUP_TTL });
}

/* =====================================================================
   KV-based fixed-window rate limiter
   - 近似限速：KV 最終一致 + 無原子遞增，並發 burst 可能略超出，
     但足以擋「持續濫用 / license 工廠」這個真實威脅模型。
     精準配額需 Durable Objects（未來升級路徑，需 wrangler 部署）。
   - KV 故障時 graceful degrade（放行，不誤殺合法用戶）
   - 回 { ok: boolean, retryAfter: number(秒) }
   ===================================================================== */
async function kvRateLimit(env, scope, id, limit, windowSeconds) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const bucket = Math.floor(now / windowSeconds);
    const key = KV_KEY_RL(scope, id, bucket);
    const raw = await env.LICENSES.get(key);
    const count = raw ? (parseInt(raw, 10) || 0) : 0;
    if (count >= limit) {
      const retryAfter = (bucket + 1) * windowSeconds - now;
      return { ok: false, retryAfter: Math.max(retryAfter, 1) };
    }
    // KV expirationTtl 最低 60s；windowSeconds 皆 >= 60，+60 buffer 防邊界
    await env.LICENSES.put(key, String(count + 1), {
      expirationTtl: windowSeconds + 60
    });
    return { ok: true, retryAfter: 0 };
  } catch (e) {
    console.warn('kvRateLimit error (allowing):', e?.message);
    return { ok: true, retryAfter: 0 };
  }
}

/* =====================================================================
   Tier 推導（v2.4.0 — Phase 2.3 Freemium）
   - 目前所有 active 訂閱（monthly / annual）皆映射為 'pro'
   - 留擴充點：未來若有 enterprise / lifetime / team 等層級，
     可在 KV sub:{id} 顯式存 tier 欄位並優先採用
   ===================================================================== */
function deriveTier(sub) {
  // 1. 顯式優先：若 KV 已有 tier 欄位（未來擴充）直接用
  if (sub && typeof sub.tier === 'string') return sub.tier;
  // 2. 預設：active 訂閱者皆 pro
  return 'pro';
}

/* =====================================================================
   PayPal OAuth（取 access token，緩存 8 小時）
   ===================================================================== */
async function getPayPalAccessToken(env) {
  // 先看 KV 緩存
  const cached = await env.LICENSES.get(KV_KEY_OAUTH());
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed.expiresAt > Date.now()) return parsed.token;
  }

  // 重新取
  const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${env.PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) {
    throw new Error(`PayPal OAuth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const expiresAt = Date.now() + OAUTH_CACHE_TTL * 1000;
  await env.LICENSES.put(KV_KEY_OAUTH(), JSON.stringify({ token: data.access_token, expiresAt }), {
    expirationTtl: OAUTH_CACHE_TTL
  });
  return data.access_token;
}

/* =====================================================================
   PayPal Webhook 簽名驗證
   ===================================================================== */
async function verifyPayPalWebhook(env, headers, bodyJson) {
  const accessToken = await getPayPalAccessToken(env);
  const verifyBody = {
    transmission_id:   headers.get('paypal-transmission-id'),
    transmission_time: headers.get('paypal-transmission-time'),
    cert_url:          headers.get('paypal-cert-url'),
    auth_algo:         headers.get('paypal-auth-algo'),
    transmission_sig:  headers.get('paypal-transmission-sig'),
    webhook_id:        env.PAYPAL_WEBHOOK_ID,
    webhook_event:     bodyJson
  };

  // 缺任一 header 直接判 fail
  for (const k of ['transmission_id','transmission_time','cert_url','auth_algo','transmission_sig']) {
    if (!verifyBody[k]) {
      return { verified: false, error: `Missing header: paypal-${k.replace(/_/g, '-')}` };
    }
  }

  const res = await fetch(`${env.PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(verifyBody)
  });

  if (!res.ok) {
    const text = await res.text();
    return { verified: false, error: `Verify API failed: ${res.status} ${text}` };
  }
  const data = await res.json();
  return { verified: data.verification_status === 'SUCCESS', detail: data };
}

/* =====================================================================
   PayPal Webhook 事件處理
   ===================================================================== */
async function handleWebhookEvent(env, event) {
  const eventType = event.event_type;
  const resource = event.resource || {};
  const now = new Date().toISOString();

  // 從事件中取出 subscriptionId（不同事件型別位置不同）
  let subId = null;
  if (eventType.startsWith('BILLING.SUBSCRIPTION.')) {
    subId = resource.id;  // resource 就是 subscription
  } else if (eventType.startsWith('PAYMENT.SALE.')) {
    subId = resource.billing_agreement_id;  // sale 內含 subscription 參照
  } else if (eventType.startsWith('CUSTOMER.DISPUTE.')) {
    // dispute 通常需要從 disputed_transactions 找
    const txs = resource.disputed_transactions || [];
    if (txs.length > 0) subId = txs[0].seller_transaction_id;
  }

  if (!subId) {
    return { handled: false, reason: 'no subscriptionId found in event' };
  }

  const existing = (await getSubscription(env, subId)) || {};
  const baseUpdate = {
    ...existing,
    lastEventAt: now,
    lastEventType: eventType,
    lastEventId: event.id,
  };

  // 狀態映射
  let statusUpdate = {};
  switch (eventType) {
    case 'BILLING.SUBSCRIPTION.CREATED':
      statusUpdate = { status: 'pending', planId: resource.plan_id, createdAt: now };
      break;
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
      statusUpdate = { status: 'active', planId: resource.plan_id, activatedAt: now };
      break;
    case 'BILLING.SUBSCRIPTION.UPDATED':
      statusUpdate = { planId: resource.plan_id || existing.planId };
      break;
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
      statusUpdate = { status: 'suspended', suspendedAt: now };
      break;
    case 'BILLING.SUBSCRIPTION.CANCELLED':
      statusUpdate = { status: 'cancelled', cancelledAt: now };
      break;
    case 'BILLING.SUBSCRIPTION.EXPIRED':
      statusUpdate = { status: 'expired', expiredAt: now };
      break;
    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
      statusUpdate = {
        lastPaymentFailedAt: now,
        paymentFailedCount: (existing.paymentFailedCount || 0) + 1
      };
      break;
    case 'PAYMENT.SALE.COMPLETED':
      statusUpdate = {
        lastPaymentAt: now,
        paymentCount: (existing.paymentCount || 0) + 1,
        lastPaymentAmount: resource.amount?.total
      };
      break;
    case 'PAYMENT.SALE.REFUNDED':
      statusUpdate = { status: 'refunded', refundedAt: now };
      break;
    case 'CUSTOMER.DISPUTE.CREATED':
      statusUpdate = { status: 'disputed', disputedAt: now };
      break;
    default:
      // 不認識的事件：仍記錄 lastEventType 但不改 status
      break;
  }

  await setSubscription(env, subId, { ...baseUpdate, ...statusUpdate });
  return { handled: true, subscriptionId: subId, status: statusUpdate.status || existing.status };
}

/* =====================================================================
   Route handlers
   ===================================================================== */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function handleHealth(env) {
  // 順便 ping KV
  let kvOk = false;
  try {
    await env.LICENSES.get('__healthcheck__');
    kvOk = true;
  } catch (e) {
    kvOk = false;
  }
  // 前端 fail-loud cross-check 用：讓 pro-config.js 的 PAYPAL_CLIENT_ID 打錯字/前後端不同步時能自我偵測
  // （2026-06-14 PayPal Client ID 打錯字事故：eIIo vs eIlo 肉眼幾乎不可辨，曾造成 PayPal 按鈕整整消失）
  const paypalClientIdHash = env.PAYPAL_CLIENT_ID
    ? (await sha256Hex(env.PAYPAL_CLIENT_ID)).slice(0, 12)
    : null;
  return jsonResponse({
    status: 'ok',
    version: '2.4.2',
    timestamp: new Date().toISOString(),
    kv: kvOk,
    rateLimit: 'kv',
    webhookIpObserve: 'log-only',
    freemium: 'tier-in-jwt',
    paypal_client_id_hash: paypalClientIdHash
  });
}

function rateLimitedResponse(scope, retryAfterSeconds) {
  return new Response(
    JSON.stringify({
      error: 'rate limit exceeded',
      scope,
      hint: `too many requests; try again in ~${retryAfterSeconds}s`
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
        ...CORS_HEADERS
      }
    }
  );
}

async function handleIssue(request, env) {
  const body = await request.json().catch(() => ({}));
  const subscriptionId = body.subscriptionId;

  if (!subscriptionId) {
    return jsonResponse({ error: 'subscriptionId required' }, 400);
  }

  // ---------- Rate limiting (KV-based) ----------
  // Layer 1: per IP — 抗 DDoS / 一般機器人
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipRl = await kvRateLimit(env, 'ip', ip, RL_ISSUE_IP_LIMIT, RL_ISSUE_IP_WINDOW);
  if (!ipRl.ok) {
    return rateLimitedResponse('per-ip', ipRl.retryAfter);
  }

  // Layer 2: per subscriptionId — 抗 license 工廠濫用（leaked subId）
  const subRl = await kvRateLimit(env, 'sub', subscriptionId, RL_ISSUE_SUB_LIMIT, RL_ISSUE_SUB_WINDOW);
  if (!subRl.ok) {
    return rateLimitedResponse('per-subscription', subRl.retryAfter);
  }
  // ---------- /Rate limiting ----------

  // 查 KV：訂閱必須存在
  const sub = await getSubscription(env, subscriptionId);
  if (!sub) {
    return jsonResponse({
      error: 'subscription not found',
      hint: 'wait a few seconds — PayPal webhook may still be in flight'
    }, 404);
  }

  // 狀態必須是 active
  if (sub.status !== 'active') {
    return jsonResponse({
      error: 'subscription not active',
      currentStatus: sub.status
    }, 403);
  }

  // 簽 JWT（短期 7 天，前端需週期呼叫 validate 來 refresh 信任）
  // v2.4.0+：payload 加 tier 欄位（Phase 2.3 Freemium）
  const now = Math.floor(Date.now() / 1000);
  const tier = deriveTier(sub);
  const payload = {
    sub: subscriptionId,
    type: 'license',
    plan: sub.planId,
    tier,
    iat: now,
    exp: now + JWT_TTL_SECONDS
  };
  const token = await createJWT(payload, env.SECRET_KEY);
  return jsonResponse({
    success: true,
    token,
    subscriptionId,
    expiresIn: `${JWT_TTL_SECONDS / 86400} days`,
    status: sub.status,
    plan: sub.planId,
    tier
  });
}

async function handleValidate(request, env) {
  const body = await request.json().catch(() => ({}));
  const token = body.token;

  if (!token) return jsonResponse({ valid: false, error: 'token required' }, 400);

  const payload = await verifyJWT(token, env.SECRET_KEY);
  if (!payload) return jsonResponse({ valid: false, error: 'invalid or expired token' }, 401);

  // KV 撤銷檢查
  const sub = await getSubscription(env, payload.sub);
  if (!sub) {
    return jsonResponse({ valid: false, error: 'subscription not found in KV' }, 401);
  }
  if (sub.status !== 'active') {
    return jsonResponse({
      valid: false,
      error: 'subscription no longer active',
      currentStatus: sub.status
    }, 401);
  }

  // v2.4.0+：回傳 tier。優先用 JWT payload 內的（簽發時點的快照），
  // 若是舊 token（無 tier）則 fallback 到當下 KV 推導，
  // 再 fallback 'pro' 以維持向下相容（v2.3.0 以前簽發的 token 全是 pro）。
  const tier = payload.tier || deriveTier(sub) || 'pro';

  return jsonResponse({
    valid: true,
    subscriptionId: payload.sub,
    plan: sub.planId,
    tier,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    subscriptionStatus: sub.status
  });
}

function ipv4ToInt(ip) {
  const parts = String(ip).split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = (n * 256) + o;
  }
  return n >>> 0;
}

// 僅支援 IPv4（PayPal 公布範圍皆 IPv4）。非 IPv4 / 無法解析 → 視為「不在範圍」
function ipInPayPalRange(ip) {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return false;
  for (const cidr of PAYPAL_WEBHOOK_CIDRS) {
    const [base, bitsStr] = cidr.split('/');
    const baseInt = ipv4ToInt(base);
    if (baseInt === null) continue;
    const bits = Number(bitsStr);
    const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
    if ((ipInt & mask) === (baseInt & mask)) return true;
  }
  return false;
}

async function handleWebhook(request, env) {
  const bodyText = await request.text();
  let bodyJson;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch (e) {
    return jsonResponse({ error: 'invalid json' }, 400);
  }

  // 0. 來源 IP 觀察（log-only，v2.3.0）：記錄非 PayPal IP，不封鎖
  const srcIp = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!ipInPayPalRange(srcIp)) {
    console.warn(
      `[webhook-ip-observe] non-PayPal source IP: ${srcIp} ` +
      `event=${bodyJson?.event_type || 'unknown'} id=${bodyJson?.id || 'none'}`
    );
  }

  // 1. 驗簽
  const verifyResult = await verifyPayPalWebhook(env, request.headers, bodyJson);
  if (!verifyResult.verified) {
    console.error('Webhook signature verification failed:', verifyResult.error);
    return jsonResponse({ error: 'signature verification failed', detail: verifyResult.error }, 401);
  }

  // 2. 冪等性：去重
  const eventId = bodyJson.id;
  if (eventId && await isEventProcessed(env, eventId)) {
    return jsonResponse({ status: 'duplicate', eventId });
  }

  // 3. 處理事件
  const result = await handleWebhookEvent(env, bodyJson);

  // 4. 標記已處理
  if (eventId) await markEventProcessed(env, eventId);

  return jsonResponse({ status: 'ok', eventType: bodyJson.event_type, result });
}

async function handleGetSubscription(env, subId) {
  const sub = await getSubscription(env, subId);
  if (!sub) return jsonResponse({ error: 'not found' }, 404);
  return jsonResponse(sub);
}

/* =====================================================================
   Main entry
   ===================================================================== */
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // GET /health
      if (path === '/health' && request.method === 'GET') {
        return handleHealth(env);
      }

      // POST /license/issue
      if (path === '/license/issue' && request.method === 'POST') {
        return handleIssue(request, env);
      }

      // POST /license/validate
      if (path === '/license/validate' && request.method === 'POST') {
        return handleValidate(request, env);
      }

      // POST /webhook/paypal
      if (path === '/webhook/paypal' && request.method === 'POST') {
        return handleWebhook(request, env);
      }

      // GET /subscription/:id
      const subMatch = path.match(/^\/subscription\/(.+)$/);
      if (subMatch && request.method === 'GET') {
        return handleGetSubscription(env, subMatch[1]);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      // 詳細錯誤（stack、可能含 PayPal 回應內文）只進 server log，不回客戶端（避免內部細節洩漏）
      console.error('Worker error:', err && err.stack ? err.stack : err);
      return jsonResponse({ error: 'internal server error' }, 500);
    }
  }
};
