/**
 * Pure DOM snapshot for FindMyNetwork — no chrome.* APIs.
 * Exposed as globalThis.__fmnExtractPage for the content script and scripting.executeScript fallback.
 */
(function () {
  "use strict";

  function text(el) {
    return el?.textContent?.trim() || "";
  }

  function meta(prop) {
    return (
      document.querySelector(`meta[property="${prop}"]`)?.getAttribute("content")?.trim() || ""
    );
  }

  function metaName(name) {
    return document.querySelector(`meta[name="${name}"]`)?.getAttribute("content")?.trim() || "";
  }

  function resolveUrl(href, base) {
    try {
      return new URL(href, base).href;
    } catch {
      return "";
    }
  }

  globalThis.__fmnExtractPage = function __fmnExtractPage() {
    const url = window.location.href;

    let canonicalHref =
      document.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() || "";
    const sourceUrl = (canonicalHref ? resolveUrl(canonicalHref, url) : url) || url;

    let pageKind = "generic";
    let suggestedKind = "unknown";
    if (/ycombinator\.com\/companies\//i.test(url)) {
      pageKind = "yc_company";
      suggestedKind = "company";
    } else if (/ycombinator\.com\/jobs/i.test(url)) {
      pageKind = "yc_jobs";
      suggestedKind = "unknown";
    }

    const ogTitle = meta("og:title") || metaName("twitter:title");
    const ogDesc = meta("og:description") || metaName("description");
    const h1 = text(document.querySelector("h1"));
    const docTitle = document.title?.trim() || "";
    const label = (ogTitle || h1 || docTitle).replace(/\s+/g, " ").trim().slice(0, 500);

    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./i, "");
    } catch {
      /* ignore */
    }

    let website = "";
    const anchors = document.querySelectorAll("a[href]");
    for (const a of anchors) {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("http")) continue;
      const abs = resolveUrl(href, url);
      if (!abs) continue;
      try {
        const u = new URL(abs);
        const h = u.hostname.replace(/^www\./i, "");
        if (!h || h === host) continue;
        if (
          /^(ycombinator\.com|linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com)$/i.test(
            h,
          ) ||
          h.endsWith(".linkedin.com")
        ) {
          continue;
        }
        website = abs.slice(0, 2000);
        break;
      } catch {
        /* ignore */
      }
    }

    let bodySnippet = "";
    try {
      const raw = document.body?.innerText || "";
      bodySnippet = raw.replace(/\s+/g, " ").trim().slice(0, 12000);
    } catch {
      /* ignore */
    }

    const rawParts = [
      ogTitle && `og:title: ${ogTitle}`,
      ogDesc && `og:description: ${ogDesc}`,
      h1 && `h1: ${h1}`,
      `url: ${url}`,
      bodySnippet && `visible_text:\n${bodySnippet}`,
    ];
    const rawExtract = rawParts.filter(Boolean).join("\n\n").slice(0, 24000);

    const confidence =
      pageKind === "yc_company" ? 0.65 : pageKind === "yc_jobs" ? 0.45 : 0.35;

    return {
      sourceUrl: sourceUrl.slice(0, 2000),
      pageKind,
      suggestedKind,
      payload: {
        label: (label || url).slice(0, 500),
        description: (ogDesc || "").slice(0, 4000),
        website,
        title: "",
        rawExtract: rawExtract || label || url,
        confidence,
      },
    };
  };
})();
