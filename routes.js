import express from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import multer from "multer";
import {
  classifyIssue,
  detectSeverity,
  detectDuplicates,
  scorePriority,
  recommendResolution,
  predictTrends,
  analyzeIssueImage,
  fullIssueAnalysis,
} from "./gemini.js";

const router = express.Router();
const DB_PATH = path.resolve("data/issues.json");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── DB helpers ────────────────────────────────────────────────────────────────

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify({ issues: [], analytics: {} }));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── Issues CRUD ───────────────────────────────────────────────────────────────

// GET all issues
router.get("/issues", (req, res) => {
  const db = readDB();
  let issues = db.issues;

  const { category, severity, status, ward, limit = 100, offset = 0 } = req.query;
  if (category) issues = issues.filter((i) => i.category === category);
  if (severity) issues = issues.filter((i) => i.severity === severity);
  if (status) issues = issues.filter((i) => i.status === status);
  if (ward) issues = issues.filter((i) => i.location?.toLowerCase().includes(ward.toLowerCase()));

  const total = issues.length;
  issues = issues
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(Number(offset), Number(offset) + Number(limit));

  res.json({ success: true, total, issues });
});

// GET single issue
router.get("/issues/:id", (req, res) => {
  const db = readDB();
  const issue = db.issues.find((i) => i.id === req.params.id);
  if (!issue) return res.status(404).json({ success: false, error: "Issue not found" });
  res.json({ success: true, issue });
});

// POST create issue (with full AI pipeline)
router.post("/issues", async (req, res) => {
  try {
    const { title, description, location, reporter_name, reporter_email, ward } = req.body;
    if (!title || !description || !location) {
      return res.status(400).json({ success: false, error: "title, description, location required" });
    }

    const db = readDB();
    const analysis = await fullIssueAnalysis(title, description, location, db.issues);

    const now = new Date().toISOString();
    const issue = {
      id: uuidv4(),
      title,
      description,
      location,
      ward: ward || location,
      reporter_name: reporter_name || "Anonymous",
      reporter_email: reporter_email || "",
      status: "Open",
      created_at: now,
      updated_at: now,
      report_count: 1,
      upvotes: 0,
      days_open: 0,
      images: [],
      comments: [],
      history: [{ action: "Created", timestamp: now, actor: "System" }],
      // AI Results
      category: analysis.classification.category,
      subcategory: analysis.classification.subcategory,
      department: analysis.classification.department,
      tags: analysis.classification.tags,
      severity: analysis.severity.severity,
      severity_score: analysis.severity.severity_score,
      impact_area: analysis.severity.impact_area,
      affected_people_estimate: analysis.severity.affected_people_estimate,
      health_risk: analysis.severity.health_risk,
      safety_risk: analysis.severity.safety_risk,
      priority_score: analysis.priority.priority_score,
      priority_label: analysis.priority.priority_label,
      sla_hours: analysis.priority.sla_hours,
      escalate_immediately: analysis.priority.escalate_immediately,
      resolution: analysis.resolution,
      is_duplicate: analysis.duplicates.is_duplicate,
      duplicate_ids: analysis.duplicates.duplicate_ids || [],
    };

    db.issues.push(issue);
    writeDB(db);

    res.status(201).json({ success: true, issue, analysis });
  } catch (err) {
    console.error("POST /issues error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH update issue status
router.patch("/issues/:id", (req, res) => {
  const db = readDB();
  const idx = db.issues.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Not found" });

  const allowed = ["status", "assigned_to", "notes", "estimated_completion"];
  const now = new Date().toISOString();
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) db.issues[idx][field] = req.body[field];
  });
  db.issues[idx].updated_at = now;
  db.issues[idx].history.push({
    action: `Updated: ${Object.keys(req.body).join(", ")}`,
    timestamp: now,
    actor: req.body.actor || "Admin",
  });

  writeDB(db);
  res.json({ success: true, issue: db.issues[idx] });
});

// DELETE issue
router.delete("/issues/:id", (req, res) => {
  const db = readDB();
  const idx = db.issues.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Not found" });
  db.issues.splice(idx, 1);
  writeDB(db);
  res.json({ success: true });
});

// POST upvote
router.post("/issues/:id/upvote", (req, res) => {
  const db = readDB();
  const issue = db.issues.find((i) => i.id === req.params.id);
  if (!issue) return res.status(404).json({ success: false, error: "Not found" });
  issue.upvotes = (issue.upvotes || 0) + 1;
  issue.report_count = (issue.report_count || 1) + 1;
  writeDB(db);
  res.json({ success: true, upvotes: issue.upvotes });
});

// POST comment
router.post("/issues/:id/comments", (req, res) => {
  const db = readDB();
  const issue = db.issues.find((i) => i.id === req.params.id);
  if (!issue) return res.status(404).json({ success: false, error: "Not found" });
  const comment = {
    id: uuidv4(),
    text: req.body.text,
    author: req.body.author || "Anonymous",
    timestamp: new Date().toISOString(),
  };
  issue.comments = issue.comments || [];
  issue.comments.push(comment);
  writeDB(db);
  res.json({ success: true, comment });
});

// ── AI Endpoints ──────────────────────────────────────────────────────────────

// POST analyze image
router.post("/ai/analyze-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No image provided" });
    const base64 = req.file.buffer.toString("base64");
    const result = await analyzeIssueImage(base64, req.file.mimetype);
    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST get resolution recommendations for existing issue
router.post("/ai/recommend/:id", async (req, res) => {
  try {
    const db = readDB();
    const issue = db.issues.find((i) => i.id === req.params.id);
    if (!issue) return res.status(404).json({ success: false, error: "Not found" });
    const resolution = await recommendResolution(issue);
    issue.resolution = resolution;
    writeDB(db);
    res.json({ success: true, resolution });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST re-analyze priority
router.post("/ai/reprioritize/:id", async (req, res) => {
  try {
    const db = readDB();
    const issue = db.issues.find((i) => i.id === req.params.id);
    if (!issue) return res.status(404).json({ success: false, error: "Not found" });
    issue.days_open = Math.floor((Date.now() - new Date(issue.created_at)) / 86400000);
    const priority = await scorePriority(issue);
    Object.assign(issue, priority);
    writeDB(db);
    res.json({ success: true, priority });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET trend predictions
router.get("/ai/trends", async (req, res) => {
  try {
    const db = readDB();
    const trends = await predictTrends(db.issues);
    res.json({ success: true, trends });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────

router.get("/analytics", (req, res) => {
  const db = readDB();
  const issues = db.issues;

  const byCategory = {};
  const bySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const byStatus = { Open: 0, "In Progress": 0, Resolved: 0, Closed: 0 };
  const byWard = {};
  const byDepartment = {};
  const resolutionTimes = [];
  const dailyTrend = {};

  issues.forEach((issue) => {
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    byStatus[issue.status] = (byStatus[issue.status] || 0) + 1;
    byWard[issue.ward] = (byWard[issue.ward] || 0) + 1;
    byDepartment[issue.department] = (byDepartment[issue.department] || 0) + 1;

    const day = issue.created_at?.split("T")[0];
    if (day) dailyTrend[day] = (dailyTrend[day] || 0) + 1;

    if (issue.status === "Resolved" && issue.resolved_at) {
      const days = Math.floor(
        (new Date(issue.resolved_at) - new Date(issue.created_at)) / 86400000
      );
      resolutionTimes.push(days);
    }
  });

  const avgResolution =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

  const topWards = Object.entries(byWard)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ward, count]) => ({ ward, count }));

  res.json({
    success: true,
    analytics: {
      total: issues.length,
      byCategory,
      bySeverity,
      byStatus,
      byWard,
      byDepartment,
      topWards,
      dailyTrend,
      avgResolutionDays: Math.round(avgResolution * 10) / 10,
      criticalOpen: issues.filter((i) => i.severity === "Critical" && i.status === "Open").length,
      resolvedThisWeek: issues.filter((i) => {
        if (i.status !== "Resolved") return false;
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        return new Date(i.updated_at) > weekAgo;
      }).length,
    },
  });
});

// ── Seed data endpoint ────────────────────────────────────────────────────────

router.post("/seed", async (req, res) => {
  const db = readDB();
  if (db.issues.length > 0) return res.json({ success: true, message: "DB already has data" });

  const seeds = [
    {
      title: "Large pothole on MG Road near bus stop",
      description: "A massive pothole has developed on MG Road near the City Bus Stop No. 14. Multiple vehicles have been damaged and two minor accidents reported this week. The pothole is about 2 feet wide and 8 inches deep.",
      location: "MG Road, Ward 7",
      ward: "Ward 7",
    },
    {
      title: "Overflowing sewage drain in Sector 4",
      description: "The main drainage pipe on Sector 4 B-block has been overflowing for 3 days. Sewage water is flooding the street and entering homes. Strong foul smell and mosquito breeding.",
      location: "Sector 4, B-Block",
      ward: "Ward 12",
    },
    {
      title: "Street lights not working on Nehru Nagar road",
      description: "All 8 street lights on the main road of Nehru Nagar have been non-functional for 2 weeks. The area is completely dark at night creating safety concerns especially for women.",
      location: "Nehru Nagar Main Road",
      ward: "Ward 3",
    },
    {
      title: "Illegal garbage dumping near school",
      description: "People are illegally dumping construction waste and garbage near Government Primary School on Station Road. Children are playing near this waste which is a serious health hazard.",
      location: "Station Road, near GPS School",
      ward: "Ward 5",
    },
    {
      title: "Water supply disruption for 5 days",
      description: "Our entire colony (approx 200 households) has not received piped water supply for 5 consecutive days. We are forced to buy water at high cost from tankers.",
      location: "Green Park Colony, Phase 2",
      ward: "Ward 9",
    },
  ];

  const createdIssues = [];
  for (const seed of seeds) {
    try {
      const analysis = await fullIssueAnalysis(
        seed.title,
        seed.description,
        seed.location,
        createdIssues
      );
      const now = new Date(Date.now() - Math.random() * 7 * 86400000).toISOString();
      const issue = {
        id: uuidv4(),
        ...seed,
        reporter_name: ["Raj Kumar", "Priya Singh", "Mohammed Ali", "Sunita Devi", "Amit Sharma"][
          Math.floor(Math.random() * 5)
        ],
        reporter_email: "citizen@example.com",
        status: ["Open", "In Progress", "Open", "Open", "Resolved"][
          Math.floor(Math.random() * 5)
        ],
        created_at: now,
        updated_at: now,
        report_count: Math.floor(Math.random() * 20) + 1,
        upvotes: Math.floor(Math.random() * 50),
        days_open: Math.floor(Math.random() * 14),
        images: [],
        comments: [],
        history: [{ action: "Created", timestamp: now, actor: "System" }],
        category: analysis.classification.category,
        subcategory: analysis.classification.subcategory,
        department: analysis.classification.department,
        tags: analysis.classification.tags,
        severity: analysis.severity.severity,
        severity_score: analysis.severity.severity_score,
        impact_area: analysis.severity.impact_area,
        affected_people_estimate: analysis.severity.affected_people_estimate,
        health_risk: analysis.severity.health_risk,
        safety_risk: analysis.severity.safety_risk,
        priority_score: analysis.priority.priority_score,
        priority_label: analysis.priority.priority_label,
        sla_hours: analysis.priority.sla_hours,
        escalate_immediately: analysis.priority.escalate_immediately,
        resolution: analysis.resolution,
        is_duplicate: false,
        duplicate_ids: [],
      };
      createdIssues.push(issue);
      db.issues.push(issue);
    } catch (e) {
      console.error("Seed error:", e.message);
    }
  }
  writeDB(db);
  res.json({ success: true, seeded: createdIssues.length });
});

export default router;