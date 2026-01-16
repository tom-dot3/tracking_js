const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

// Tăng limit lên một chút và thêm urlencoded (đề phòng)
app.use(bodyParser.json({ limit: "4mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "4mb" }));
app.use(express.static("public"));

// Debug middleware - log mọi request đến server (rất hữu ích để biết request có đến không)
app.use((req, res, next) => {
  console.log(`→ ${req.method} ${req.originalUrl}  |  IP: ${req.ip}`);
  console.log(`   Headers: Content-Type = ${req.headers['content-type'] || 'none'}`);
  if (req.method === 'POST') {
    console.log(`   Body size (raw): ${req.headers['content-length'] || 'unknown'} bytes`);
  }
  next();
});

function createLogEntry(type, req, extra = {}) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
             req.headers["cf-connecting-ip"] ||
             req.socket.remoteAddress ||
             "unknown";

  return {
    type,
    timestamp: new Date().toISOString(),
    ip,
    userAgent: req.headers["user-agent"] || "unknown",
    url: req.originalUrl || req.url,
    method: req.method,
    ...extra,
  };
}

// Log request thông thường (giữ nguyên của bạn)
app.use((req, res, next) => {
  if (req.url === "/favicon.ico") return next();

  const logEntry = createLogEntry("request", req);
  console.log("[REQUEST]", JSON.stringify(logEntry, null, 2));
  next();
});

app.get("/", (req, res) => {
  const logEntry = createLogEntry("page_visit", req, {
    referrer: req.headers.referer || req.headers.referrer || "direct"
  });

  console.log("[PAGE VISIT]", JSON.stringify(logEntry, null, 2));

  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── ĐIỂM QUAN TRỌNG: Route nhận fingerprint ──
app.post("/fingerprint", (req, res) => {
  // Debug cực chi tiết để biết vấn đề nằm ở đâu
  console.log("╔══════════════════ /fingerprint CALLED ══════════════════╗");
  console.log("Body received? ", !!req.body);
  console.log("Body keys count: ", req.body ? Object.keys(req.body).length : 0);
  
  if (!req.body || Object.keys(req.body).length === 0) {
    console.log("⚠️ WARNING: Body rỗng hoặc không parse được!");
    console.log("Raw body (nếu có):", req.body);
    return res.status(400).json({ error: "Empty fingerprint data" });
  }

  const logEntry = createLogEntry("fingerprint", req, {
    fingerprintData: req.body
  });

  console.log("[FINGERPRINT] ── Dữ liệu nhận được đầy đủ ──");
  console.log(JSON.stringify(logEntry, null, 2));
  console.log("╚════════════════════════════════════════════════════════╝\n");

  res.json({ status: "ok", receivedAt: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error("[ERROR] ── Có lỗi xảy ra ──");
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
