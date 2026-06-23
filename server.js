import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import router from "./routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", router);

// Serve HTML pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/report", (req, res) => res.sendFile(path.join(__dirname, "public", "report.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "public", "dashboard.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/analytics", (req, res) => res.sendFile(path.join(__dirname, "public", "analytics.html")));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║         CivicAI Swarm — Server Ready         ║
╠══════════════════════════════════════════════╣
║  Local:   http://localhost:${PORT}              ║
║  API:     http://localhost:${PORT}/api          ║
╚══════════════════════════════════════════════╝
  `);
});