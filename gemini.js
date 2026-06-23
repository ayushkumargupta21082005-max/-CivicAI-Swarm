import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const visionModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeJSON(text) {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function safeGeminiCall(fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    console.log("Gemini Error:", error.message);
    return fallback;
  }
}

// ── 1. Issue Classification ───────────────────────────────────────────────────

export async function classifyIssue(title, description, location) {
  const prompt = `You are a civic issue classification AI. Analyze this community problem report and respond ONLY with a JSON object.

Issue Title: ${title}
Description: ${description}
Location: ${location}

Respond with ONLY this JSON (no markdown, no explanation):
{
  "category": "<one of: Roads & Infrastructure, Water & Sanitation, Electricity, Public Safety, Environment, Parks & Recreation, Noise Pollution, Animal Control, Waste Management, Public Transport, Housing, Healthcare, Education, Other>",
  "subcategory": "<specific subcategory>",
  "department": "<responsible government department>",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": <0-100>
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return safeJSON(text) || {
    category: "Other",
    subcategory: "General",
    department: "Municipal Corporation",
    tags: ["community"],
    confidence: 50,
  };
}

// ── 2. Severity Detection ─────────────────────────────────────────────────────

export async function detectSeverity(title, description, category) {
  const prompt = `You are a civic issue severity assessment AI. Evaluate the urgency and impact of this community issue. Respond ONLY with a JSON object.

Title: ${title}
Description: ${description}
Category: ${category}

Respond with ONLY this JSON:
{
  "severity": "<Critical|High|Medium|Low>",
  "severity_score": <1-10>,
  "impact_area": "<Individual|Block|Neighborhood|Ward|City>",
  "affected_people_estimate": <number>,
  "health_risk": <true|false>,
  "safety_risk": <true|false>,
  "reasoning": "<one sentence explanation>"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return safeJSON(text) || {
    severity: "Medium",
    severity_score: 5,
    impact_area: "Neighborhood",
    affected_people_estimate: 100,
    health_risk: false,
    safety_risk: false,
    reasoning: "Standard community issue requiring attention.",
  };
}

// ── 3. Duplicate Detection ────────────────────────────────────────────────────

export async function detectDuplicates(newIssue, existingIssues) {
  if (!existingIssues || existingIssues.length === 0) {
    return { is_duplicate: false, duplicates: [] };
  }

  const existingSummary = existingIssues
    .slice(0, 20)
    .map((i) => `ID:${i.id} | ${i.title} | ${i.location} | ${i.category}`)
    .join("\n");

  const prompt = `You are a duplicate detection AI for a civic issue tracker. Check if the new report is a duplicate of any existing issue. Respond ONLY with JSON.

NEW ISSUE:
Title: ${newIssue.title}
Description: ${newIssue.description}
Location: ${newIssue.location}

EXISTING ISSUES:
${existingSummary}

Respond with ONLY this JSON:
{
  "is_duplicate": <true|false>,
  "duplicate_ids": ["id1", "id2"],
  "similarity_scores": {"id1": <0-100>, "id2": <0-100>},
  "recommendation": "<merge|ignore|new_report>"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return (
    safeJSON(text) || {
      is_duplicate: false,
      duplicate_ids: [],
      similarity_scores: {},
      recommendation: "new_report",
    }
  );
}

// ── 4. Priority Scoring ───────────────────────────────────────────────────────

export async function scorePriority(issue) {
  const prompt = `You are a civic issue prioritization AI. Calculate a comprehensive priority score for this issue. Respond ONLY with JSON.

Issue Data:
- Title: ${issue.title}
- Category: ${issue.category}
- Severity: ${issue.severity}
- Affected People: ${issue.affected_people_estimate || "unknown"}
- Health Risk: ${issue.health_risk}
- Safety Risk: ${issue.safety_risk}
- Reports Count: ${issue.report_count || 1}
- Days Open: ${issue.days_open || 0}

Respond with ONLY this JSON:
{
  "priority_score": <0-100>,
  "priority_label": "<P1-Critical|P2-High|P3-Medium|P4-Low>",
  "urgency_factor": <1-10>,
  "impact_factor": <1-10>,
  "community_demand_factor": <1-10>,
  "escalate_immediately": <true|false>,
  "sla_hours": <number of hours to resolve>
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return (
    safeJSON(text) || {
      priority_score: 50,
      priority_label: "P3-Medium",
      urgency_factor: 5,
      impact_factor: 5,
      community_demand_factor: 5,
      escalate_immediately: false,
      sla_hours: 72,
    }
  );
}

// ── 5. Resolution Recommendation ─────────────────────────────────────────────

export async function recommendResolution(issue) {
  const prompt = `You are a civic resolution advisor AI. Provide actionable resolution steps for this community issue. Respond ONLY with JSON.

Issue:
- Title: ${issue.title}
- Category: ${issue.category}
- Description: ${issue.description}
- Location: ${issue.location}
- Severity: ${issue.severity}
- Department: ${issue.department}

Respond with ONLY this JSON:
{
  "immediate_actions": ["action1", "action2"],
  "short_term_steps": ["step1", "step2", "step3"],
  "long_term_solution": "description of permanent fix",
  "responsible_teams": ["team1", "team2"],
  "estimated_resolution_days": <number>,
  "resources_needed": ["resource1", "resource2"],
  "success_metrics": ["metric1", "metric2"],
  "citizen_advisory": "what citizens can do meanwhile"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return (
    safeJSON(text) || {
      immediate_actions: ["Acknowledge the report", "Dispatch inspection team"],
      short_term_steps: ["Assess damage", "Arrange repair crew", "Execute fix"],
      long_term_solution: "Systematic maintenance program",
      responsible_teams: ["Municipal Works"],
      estimated_resolution_days: 7,
      resources_needed: ["Labor", "Materials"],
      success_metrics: ["Issue resolved", "No recurrence in 30 days"],
      citizen_advisory: "Avoid the affected area until resolved.",
    }
  );
}

// ── 6. Trend Prediction ───────────────────────────────────────────────────────

export async function predictTrends(issuesData) {
  const summary = issuesData
    .slice(0, 50)
    .map(
      (i) =>
        `${i.category}|${i.severity}|${i.location}|${new Date(i.created_at).toLocaleDateString()}`
    )
    .join("\n");

  const prompt = `You are a civic trend analysis AI. Analyze these community issues and predict emerging trends. Respond ONLY with JSON.

Recent Issues (category|severity|location|date):
${summary}

Total Issues: ${issuesData.length}

Respond with ONLY this JSON:
{
  "hot_categories": [{"category": "name", "trend": "rising|stable|declining", "percentage": <number>}],
  "emerging_problems": ["problem1", "problem2"],
  "high_risk_areas": ["area1", "area2"],
  "predicted_next_week": ["likely issue type 1", "likely issue type 2"],
  "seasonal_pattern": "description of seasonal trends",
  "intervention_suggestions": ["suggestion1", "suggestion2"],
  "overall_community_health": "<Excellent|Good|Fair|Poor|Critical>",
  "health_score": <0-100>
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return (
    safeJSON(text) || {
      hot_categories: [],
      emerging_problems: [],
      high_risk_areas: [],
      predicted_next_week: [],
      seasonal_pattern: "No clear seasonal pattern detected.",
      intervention_suggestions: [],
      overall_community_health: "Fair",
      health_score: 60,
    }
  );
}

// ── 7. Vision Analysis (Image-based issues) ───────────────────────────────────

export async function analyzeIssueImage(base64Image, mimeType = "image/jpeg") {
  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType,
    },
  };

  const prompt = `You are a civic issue detection AI analyzing a photo of a community problem. Respond ONLY with JSON.

Analyze this image and identify:
- What civic issue is visible
- The severity
- The type of infrastructure or area affected

Respond with ONLY this JSON:
{
  "detected_issue": "brief description of what's wrong",
  "category": "<Roads & Infrastructure|Water & Sanitation|Electricity|Public Safety|Environment|Waste Management|Other>",
  "severity": "<Critical|High|Medium|Low>",
  "confidence": <0-100>,
  "suggested_title": "short issue title",
  "suggested_description": "detailed description for the report",
  "visible_hazards": ["hazard1", "hazard2"]
}`;

  const result = await visionModel.generateContent([prompt, imagePart]);
  const text = result.response.text();
  return (
    safeJSON(text) || {
      detected_issue: "Unable to analyze image",
      category: "Other",
      severity: "Medium",
      confidence: 0,
      suggested_title: "Community Issue",
      suggested_description: "Please add a description.",
      visible_hazards: [],
    }
  );
}

// ── 8. Batch AI Analysis (full pipeline) ─────────────────────────────────────

export async function fullIssueAnalysis(title, description, location, existingIssues = []) {

  const classification = await safeGeminiCall(
    () => classifyIssue(title, description, location),
    {
      category: "Roads & Infrastructure",
      subcategory: "General",
      department: "Municipal Corporation",
      tags: ["community"],
      confidence: 50,
    }
  );

  const severity = await safeGeminiCall(
    () => detectSeverity(title, description, classification.category),
    {
      severity: "Medium",
      severity_score: 5,
      impact_area: "Neighborhood",
      affected_people_estimate: 100,
      health_risk: false,
      safety_risk: false,
      reasoning: "Fallback severity assessment",
    }
  );

  const enrichedIssue = {
    title,
    description,
    location,
    ...classification,
    ...severity,
  };

  const duplicates = await safeGeminiCall(
    () => detectDuplicates({ title, description, location }, existingIssues),
    {
      is_duplicate: false,
      duplicate_ids: [],
      similarity_scores: {},
      recommendation: "new_report",
    }
  );

  const priority = await safeGeminiCall(
    () => scorePriority(enrichedIssue),
    {
      priority_score: 50,
      priority_label: "P3-Medium",
      urgency_factor: 5,
      impact_factor: 5,
      community_demand_factor: 5,
      escalate_immediately: false,
      sla_hours: 72,
    }
  );

  const resolution = await safeGeminiCall(
    () => recommendResolution(enrichedIssue),
    {
      immediate_actions: ["Acknowledge report"],
      short_term_steps: ["Inspect issue", "Assign team"],
      long_term_solution: "Scheduled maintenance",
      responsible_teams: ["Municipal Works"],
      estimated_resolution_days: 7,
      resources_needed: ["Labor"],
      success_metrics: ["Issue resolved"],
      citizen_advisory: "Avoid affected area until fixed",
    }
  );

  return {
    classification,
    severity,
    duplicates,
    priority,
    resolution,
  };
}