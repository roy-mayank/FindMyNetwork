/* global chrome */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "EXTRACT") {
    try {
      const fn = globalThis.__fmnExtractPage;
      sendResponse(typeof fn === "function" ? fn() : null);
    } catch {
      sendResponse(null);
    }
    return true;
  }
  return false;
});

function injectButton() {
  if (document.getElementById("fmn-capture-root")) return;
  const root = document.createElement("div");
  root.id = "fmn-capture-root";
  root.style.cssText =
    "position:fixed;bottom:16px;right:16px;z-index:2147483646;font-family:system-ui,sans-serif;";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Save to FindMyNetwork";
  btn.style.cssText =
    "cursor:pointer;border-radius:9999px;border:2px solid #7c3aed;background:linear-gradient(135deg,#0ea5e9,#7c3aed);color:#fff;font-weight:700;font-size:12px;padding:10px 14px;box-shadow:0 4px 14px rgba(124,58,237,0.35);";
  btn.addEventListener("click", () => {
    btn.disabled = true;
    const fn = globalThis.__fmnExtractPage;
    const body = typeof fn === "function" ? fn() : null;
    if (!body) {
      btn.disabled = false;
      btn.textContent = "Could not capture";
      return;
    }
    chrome.runtime.sendMessage({ type: "SAVE_CAPTURE", body }, (res) => {
      btn.disabled = false;
      if (chrome.runtime.lastError) {
        btn.textContent = "Extension error";
        return;
      }
      if (res?.ok) {
        btn.textContent = "Saved — check inbox";
        btn.style.opacity = "0.9";
      } else {
        btn.textContent = res?.error ? "Error (see console)" : "Save failed";
        console.error(res?.error);
      }
    });
  });
  root.appendChild(btn);
  document.documentElement.appendChild(root);
}

injectButton();
