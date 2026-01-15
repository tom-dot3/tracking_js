const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();

app.use(bodyParser.json());
app.use(express.static("public"));

const LOG_FILE = "logs/visits.json";

function logData(data) {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
        logs = JSON.parse(fs.readFileSync(LOG_FILE));
    }
    logs.push(data);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

// Serve landing page
app.get("/", (req, res) => {
    const log = {
        type: "page_visit",
        time: new Date().toISOString(),
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        user_agent: req.headers["user-agent"],
        headers: req.headers
    };
    logData(log);
    res.sendFile(__dirname + "/public/index.html");
});

// Receive fingerprint
app.post("/fingerprint", (req, res) => {
    const log = {
        type: "fingerprint",
        time: new Date().toISOString(),
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        data: req.body
    };
    logData(log);
    res.json({ status: "ok" });
});

app.listen(3000, () => {
    console.log("[+] Tracking server running on http://localhost:3000");
});
