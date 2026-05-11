import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";
import crypto from "crypto";

// ==========================================
// TOLL ROUTER OSS - IN-MEMORY STATE
// ==========================================

export interface LogEntry {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  ip: string;
  status: number;
  latency: number;
  blocked: boolean;
  ruleId?: string;
}

export interface Policy {
  id: string;
  type: "allow" | "block" | "rate-limit";
  target: "ip" | "path" | "api-key";
  match: string;
  limit?: number;
  windowMs?: number;
  burst?: number;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  action: string;
  resource: string;
  details: string;
  user: string;
}

export interface RateLimitState {
  count: number;
  resetAt: number;
}

// In-Memory Data Stores
const logs: LogEntry[] = [];
let policies: Policy[] = [
  { id: "default-1", type: "block", target: "path", match: "/gateway/admin" },
  { id: "default-2", type: "block", target: "ip", match: "192.168.1.100" }
];
const rateLimits = new Map<string, RateLimitState>();
const customBuckets = new Map<string, { tokens: number; lastRefill: number }>();
const auditLogs: AuditLog[] = [];

// Global Gateway Configuration
const GLOBAL_RL_WINDOW_MS = 60000; // 1 Minute
const GLOBAL_RL_MAX_REQUESTS = 30; // Max requests per minute per IP
const MAX_POLICIES = 5; // Free OSS version hardcoded limit
const KEEP_LOGS_COUNT = 500; // Rolling window of logs

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function addLog(log: Omit<LogEntry, "id" | "timestamp">) {
  logs.unshift({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...log,
  });
  if (logs.length > KEEP_LOGS_COUNT) logs.pop();
}

function addAuditLog(action: string, resource: string, details: string) {
  auditLogs.unshift({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    action,
    resource,
    details,
    user: "local-admin",
  });
  if (auditLogs.length > 500) auditLogs.pop();
}

function getClientIp(req: Request): string {
  // Try to use a simulated IP header for easy local testing, fallback to real IP
  return (req.headers['x-mock-ip'] as string) || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
}

// ==========================================
// MIDDLEWARE: CORE TOLL ROUTER
// ==========================================

const tollRouterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const ip = getClientIp(req);
  const reqPath = req.originalUrl;
  
  const recordAndDeny = (status: number, message: string, ruleId: string) => {
    const latency = Date.now() - startTime;
    addLog({
      method: req.method,
      path: reqPath,
      ip,
      status,
      latency,
      blocked: true,
      ruleId,
    });
    // Send response directly since we are blocking
    res.status(status).json({ error: "Toll Router OSS: Request Blocked", reason: message, ruleId });
  };

  // 1. Rate Limiting Check
  const now = Date.now();
  let rl = rateLimits.get(ip);
  if (!rl || rl.resetAt <= now) {
    rl = { count: 0, resetAt: now + GLOBAL_RL_WINDOW_MS };
  }
  rl.count++;
  rateLimits.set(ip, rl);

  if (rl.count > GLOBAL_RL_MAX_REQUESTS) {
    return recordAndDeny(429, "Too Many Requests", "global-rate-limit");
  }

  // 2. Policy Evaluation
  for (const policy of policies) {
    let isMatch = false;
    let matchKey = "";
    
    if (policy.target === "ip" && (policy.match === ip || policy.match === "*")) { isMatch = true; matchKey = ip; }
    if (policy.target === "path" && (reqPath.includes(policy.match) || policy.match === "*")) { isMatch = true; matchKey = reqPath; }
    const reqApiKey = req.headers['x-api-key'] as string;
    if (policy.target === "api-key" && (reqApiKey === policy.match || policy.match === "*")) { isMatch = true; matchKey = reqApiKey || 'anonymous'; }

    if (isMatch) {
      if (policy.type === "block") {
        return recordAndDeny(403, "Blocked by Administrator Policy", policy.id);
      }
      
      if (policy.type === "rate-limit" && policy.limit && policy.windowMs) {
        const key = `${policy.id}:${matchKey}`;
        const burstLimit = policy.burst || policy.limit;
        const now = Date.now();
        let bucket = customBuckets.get(key);
        
        if (!bucket) {
          bucket = { tokens: burstLimit, lastRefill: now };
        }
        
        const refillRateMs = policy.limit / policy.windowMs;
        const elapsed = now - bucket.lastRefill;
        const refill = elapsed * refillRateMs;
        
        bucket.tokens = Math.min(burstLimit, bucket.tokens + refill);
        bucket.lastRefill = now;
        
        if (bucket.tokens >= 1) {
          bucket.tokens -= 1;
          customBuckets.set(key, bucket);
        } else {
          customBuckets.set(key, bucket);
          return recordAndDeny(429, "Custom Rate Limit Exceeded", policy.id);
        }
      }
      
      // If type === "allow", it bypasses further block checks for this specific target
    }
  }

  // 3. Request Allowed -> Hook into response to log success latency
  res.on("finish", () => {
    // Only log if not already intercepted (i.e. blocked requests are logged above)
    if (res.statusCode !== 403 && res.statusCode !== 429) {
      addLog({
        method: req.method,
        path: reqPath,
        ip,
        status: res.statusCode,
        latency: Date.now() - startTime,
        blocked: false,
      });
    }
  });

  next();
};

// ==========================================
// SERVER SETUP
// ==========================================

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === 1. TOLL ROUTER GATEWAY ROUTES ===
  
  // Attach Core Middleware
  app.use("/gateway", tollRouterMiddleware);
  
  // Attach Proxy to a mock upstream service / any other target
  app.use(
    "/gateway",
    createProxyMiddleware({
      target: `http://localhost:${PORT}/mock-upstream`,
      pathRewrite: { "^/gateway": "" },
      changeOrigin: true
    }) as any
  );

  // Mock Upstream Service (Simulating the API we are protecting)
  app.all("/mock-upstream/*", (req, res) => {
    // Simulate some upstream latency
    setTimeout(() => {
      res.json({
        service: "Mock Upstream API",
        message: "Your request was processed successfully!",
        echoPath: req.path,
        timestamp: new Date().toISOString()
      });
    }, Math.floor(Math.random() * 120) + 10);
  });

  // === 2. LOCAL DASHBOARD API ===

  app.get("/api/stats", (req, res) => {
    const totalRequests = logs.length;
    const blockedRequests = logs.filter((l) => l.blocked).length;
    const blockRate = totalRequests === 0 ? 0 : Math.round((blockedRequests / totalRequests) * 100);
    const avgLatency = totalRequests === 0 
      ? 0 
      : Math.round(logs.reduce((acc, l) => acc + l.latency, 0) / totalRequests);
      
    res.json({
      totalRequests,
      blockedRequests,
      blockRate,
      avgLatency,
      activeRateLimits: rateLimits.size
    });
  });

  app.get("/api/logs", (req, res) => {
    res.json(logs.slice(0, 100)); // Return latest 100
  });

  app.get("/api/audit-logs", (req, res) => {
    res.json(auditLogs.slice(0, 100));
  });

  app.get("/api/policies", (req, res) => {
    res.json(policies);
  });

  app.post("/api/policies", (req, res) => {
    if (policies.length >= MAX_POLICIES) {
      return res.status(400).json({ error: `Free Limit Reached: Maximum ${MAX_POLICIES} policies allowed.` });
    }
    const { type, target, match, limit, windowMs, burst } = req.body;
    if (!type || !target || !match || match.trim() === '') {
      return res.status(400).json({ error: "Invalid policy parameters." });
    }

    const newPolicy: Policy = {
      id: crypto.randomUUID(),
      type,
      target,
      match: match.trim(),
      limit: limit ? parseInt(limit) : undefined,
      windowMs: windowMs ? parseInt(windowMs) : undefined,
      burst: burst ? parseInt(burst) : undefined
    };
    policies.push(newPolicy);
    addAuditLog("Policy Added", "Policies", `Added ${type} policy targeting ${target}`);
    res.json(newPolicy);
  });

  app.delete("/api/policies/:id", (req, res) => {
    const policy = policies.find(p => p.id === req.params.id);
    if(policy) {
        addAuditLog("Policy Removed", "Policies", `Removed ${policy.type} policy targeting ${policy.target}`);
    }
    policies = policies.filter(p => p.id !== req.params.id);
    res.json({ success: true });
  });

  // === 3. VITE FRONTEND MIDDLEWARE ===

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Toll Router OSS running on http://localhost:${PORT}`);
  });
}

startServer();
