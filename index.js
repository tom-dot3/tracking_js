const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.static("public"));

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

app.use((req, res, next) => {
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

// Nhận fingerprint
app.post("/fingerprint", (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Empty fingerprint data" });
  }

  const logEntry = createLogEntry("fingerprint", req, {
    fingerprintData: req.body
  });

  console.log("[FINGERPRINT]", JSON.stringify(logEntry, null, 2));

  res.json({ status: "ok", receivedAt: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ error: "Internal server error" });
});

// Export cho Vercel
module.exports = app;
