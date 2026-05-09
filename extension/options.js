/* global chrome */

const baseUrlEl = document.getElementById("baseUrl");
const tokenEl = document.getElementById("token");
const openInboxEl = document.getElementById("openInbox");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("save");

chrome.storage.sync.get(["baseUrl", "token", "openInbox"], (r) => {
  if (baseUrlEl) baseUrlEl.value = r.baseUrl || "http://localhost:3000";
  if (tokenEl) tokenEl.value = r.token || "";
  if (openInboxEl) openInboxEl.checked = r.openInbox !== false;
});

saveBtn?.addEventListener("click", () => {
  const baseUrl = (baseUrlEl?.value || "http://localhost:3000").replace(/\/$/, "");
  const token = tokenEl?.value?.trim() || "";
  const openInbox = !!openInboxEl?.checked;
  chrome.storage.sync.set({ baseUrl, token, openInbox }, () => {
    if (statusEl) statusEl.textContent = "Saved.";
  });
});
