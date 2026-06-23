// ── Config ────────────────────────────────────────────────────────────────────
const API = "/api";
 
// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = "info", duration = 3500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ"}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateY(20px)"; toast.style.transition = "all 0.3s"; setTimeout(() => toast.remove(), 300); }, duration);
}
 
// ── API Helper ────────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(API + url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "API error");
  return data;
}
 
// ── Severity Helpers ──────────────────────────────────────────────────────────
function severityClass(s) {
  return { Critical: "critical", High: "high", Medium: "medium", Low: "low" }[s] || "medium";
}
 
function severityColor(s) {
  return { Critical: "#d63b3b", High: "#e07d10", Medium: "#1a6cf5", Low: "#0d9e6a" }[s] || "#1a6cf5";
}
 
function priorityColor(score) {
  if (score >= 80) return "#d63b3b";
  if (score >= 60) return "#e07d10";
  if (score >= 40) return "#1a6cf5";
  return "#0d9e6a";
}
 
function statusBadge(status) {
  const map = { Open: "badge-open", "In Progress": "badge-progress", Resolved: "badge-resolved", Closed: "badge-closed" };
  return `<span class="badge ${map[status] || "badge-open"}">${status}</span>`;
}
 
function severityBadge(severity) {
  return `<span class="badge badge-${severityClass(severity)}">${severity}</span>`;
}
 
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
 
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
 
// ── Nav active state ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  document.querySelectorAll(".nav-links a").forEach((a) => {
    a.classList.remove("active");
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
});
 
// ── Tabs ──────────────────────────────────────────────────────────────────────
function initTabs(container) {
  const el = container || document;
  el.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      const parent = btn.closest(".tabs-wrapper") || document;
      parent.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      parent.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      parent.querySelector(`#${target}`)?.classList.add("active");
    });
  });
}
 
// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(html) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector(".modal-close")?.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
  return overlay;
}
 
// ── Bar chart ─────────────────────────────────────────────────────────────────
function renderBarChart(container, data, color = "#1a6cf5") {
  const max = Math.max(...Object.values(data), 1);
  container.innerHTML = `<div class="chart-bar-wrap">
    ${Object.entries(data).sort((a,b)=>b[1]-a[1]).map(([label, val]) => `
      <div class="chart-bar-row">
        <span class="chart-bar-label">${label}</span>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${(val/max)*100}%;background:${color}"></div>
        </div>
        <span class="chart-bar-val">${val}</span>
      </div>
    `).join("")}
  </div>`;
}
 
// ── Expose globals ────────────────────────────────────────────────────────────
window.showToast = showToast;
window.apiFetch = apiFetch;
window.severityClass = severityClass;
window.severityColor = severityColor;
window.priorityColor = priorityColor;
window.statusBadge = statusBadge;
window.severityBadge = severityBadge;
window.timeAgo = timeAgo;
window.formatDate = formatDate;
window.initTabs = initTabs;
window.openModal = openModal;
window.renderBarChart = renderBarChart;