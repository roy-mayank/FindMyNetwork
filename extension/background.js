/* global chrome */

async function getSettings() {
  const sync = await chrome.storage.sync.get(["baseUrl", "token", "openInbox"]);
  const baseUrl = (sync.baseUrl || "http://localhost:3000").replace(/\/$/, "");
  const token = sync.token || "";
  const openInbox = sync.openInbox !== false;
  return { baseUrl, token, openInbox };
}

async function sendCapture(body) {
  const { baseUrl, token } = await getSettings();
  if (!token) {
    throw new Error("Set API token in extension options (same value as FINDMYNETWORK_API_SECRET).");
  }
  const res = await fetch(`${baseUrl}/api/captures`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  return JSON.parse(text || "{}");
}

function isCapturableUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  if (/^chrome:\/\//i.test(url) || /^edge:\/\//i.test(url) || /^about:/i.test(url)) return false;
  if (/^https:\/\/chrome\.google\.com\/webstore/i.test(url)) return false;
  return true;
}

/**
 * Read snapshot from tab: prefer content script, else inject extract-core.js (e.g. tab opened before reload).
 */
async function extractFromTab(tabId) {
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: "EXTRACT" });
    if (r && typeof r === "object" && r.sourceUrl) return r;
  } catch {
    /* content script missing or page restricted */
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["extract-core.js"],
  });
  const injected = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const fn = globalThis.__fmnExtractPage;
      return typeof fn === "function" ? fn() : null;
    },
  });
  const result = injected?.[0]?.result;
  if (result && typeof result === "object" && result.sourceUrl) return result;
  return null;
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;
  if (!isCapturableUrl(tab.url)) {
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#b45309" });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: "" }), 3000);
    return;
  }

  try {
    const extracted = await extractFromTab(tab.id);
    if (!extracted || typeof extracted !== "object") {
      throw new Error(
        "Could not read this page (restricted URL, or reload the tab after installing the extension).",
      );
    }
    await sendCapture(extracted);
    const { baseUrl, openInbox } = await getSettings();
    if (openInbox) {
      await chrome.tabs.create({ url: `${baseUrl}/collect/inbox`, active: true });
    }
    await chrome.action.setBadgeText({ tabId: tab.id, text: "OK" });
    await chrome.action.setBadgeBackgroundColor({ color: "#047857" });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: "" }), 2500);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[FindMyNetwork]", msg);
    await chrome.action.setBadgeText({ tabId: tab.id, text: "x" });
    await chrome.action.setBadgeBackgroundColor({ color: "#b91c1c" });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: "" }), 4000);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SAVE_CAPTURE" && message.body) {
    const tabId = sender.tab?.id;
    sendCapture(message.body)
      .then(async (json) => {
        const { baseUrl, openInbox } = await getSettings();
        if (openInbox) {
          await chrome.tabs.create({ url: `${baseUrl}/collect/inbox`, active: true });
        }
        if (tabId) {
          await chrome.action.setBadgeText({ tabId, text: "OK" });
          await chrome.action.setBadgeBackgroundColor({ color: "#047857" });
          setTimeout(() => chrome.action.setBadgeText({ tabId, text: "" }), 2500);
        }
        sendResponse({ ok: true, json });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[FindMyNetwork]", msg);
        if (tabId) {
          chrome.action.setBadgeText({ tabId, text: "x" });
          chrome.action.setBadgeBackgroundColor({ color: "#b91c1c" });
          setTimeout(() => chrome.action.setBadgeText({ tabId, text: "" }), 4000);
        }
        sendResponse({ ok: false, error: msg });
      });
    return true;
  }
  return false;
});
