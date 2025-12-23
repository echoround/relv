// Relvaload.ee — Online visitors widget (frontend)
// Expects an endpoint (default: /api/online) returning JSON like { siteOnline, pageOnline } (or { online }).

(() => {
  const DEFAULTS = {
    endpoint: "/api/online",
    intervalMs: 15000,
    timeoutMs: 4500,
    mode: "site",          // "site" or "page"
    displayOffset: 11,     // show +11
  };

  const cfg = Object.assign({}, DEFAULTS, (window.RELVALOAD_ONLINE_CONFIG || {}));
  const DISPLAY_OFFSET = Number.isFinite(Number(cfg.displayOffset)) ? Number(cfg.displayOffset) : 11;

  const STORAGE_VISITOR = "rv_vid";
  const STORAGE_TAB = "rv_tid";

  const getOrCreateId = (storage, key, prefix) => {
    try {
      const existing = storage.getItem(key);
      if (existing) return existing;

      const bytes = new Uint8Array(16);
      (window.crypto || window.msCrypto).getRandomValues(bytes);
      const id = prefix + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
      storage.setItem(key, id);
      return id;
    } catch {
      const id = prefix + Math.random().toString(16).slice(2) + Date.now().toString(16);
      try { storage.setItem(key, id); } catch {}
      return id;
    }
  };

  const visitorId = getOrCreateId(window.localStorage, STORAGE_VISITOR, "v_");
  const tabId = getOrCreateId(window.sessionStorage, STORAGE_TAB, "t_");

  let $root, $count, $label;
  let lastShown = null;

  const ensureWidget = () => {
    if ($root) return;

    $root = document.getElementById("rv-online-widget");
    if (!$root) {
      $root = document.createElement("div");
      $root.id = "rv-online-widget";
      $root.className = "online-pill is-offline";
      $root.setAttribute("role", "status");
      $root.setAttribute("aria-live", "polite");
      $root.innerHTML = `
        <span class="online-dot" aria-hidden="true"></span>
        <span class="online-text">
          <span class="online-count">—</span>
          <span class="online-label">külastajat online</span>
        </span>
      `;
      document.body.appendChild($root);
    }

    $count = $root.querySelector(".online-count");
    $label = $root.querySelector(".online-label");
  };

  const etLabel = (n) => (n === 1 ? "külastaja online" : "külastajat online");

  const setCount = (raw) => {
    ensureWidget();

    const base = Number(raw);
    if (!Number.isFinite(base) || base < 0) {
      if (lastShown === null) {
        $count.textContent = "—";
        $label.textContent = "külastajat online";
      }
      return;
    }

    const shown = Math.max(0, Math.floor(base)) + DISPLAY_OFFSET;
    lastShown = shown;

    $count.textContent = String(shown);
    $label.textContent = etLabel(shown);

    // micro “bump”
    $root.classList.remove("is-bump");
    void $root.offsetWidth;
    $root.classList.add("is-bump");
  };

  const setOnline = (isOnline) => {
    ensureWidget();
    $root.classList.toggle("is-offline", !isOnline);
  };

  const postJson = async (payload) => {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), cfg.timeoutMs);

    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
      signal: controller.signal,
    });

    clearTimeout(to);
    return res;
  };

  const ping = async (reason) => {
    ensureWidget();

    const payload = {
      visitorId,
      tabId,
      path: location.pathname,
      ref: document.referrer || "",
      reason: reason || "tick",
      ts: Date.now(),
    };

    try {
      const res = await postJson(payload);
      if (!res.ok) throw new Error("Bad status");

      const data = await res.json();

      const raw =
        cfg.mode === "page"
          ? Number(data.pageOnline ?? data.online)
          : Number(data.siteOnline ?? data.online);

      setCount(raw);
      setOnline(true);
    } catch {
      // keep last count if we had one; just show "offline" state
      setOnline(false);
      setCount(lastShown === null ? NaN : Math.max(0, lastShown - DISPLAY_OFFSET));
    }
  };

  const beacon = (reason) => {
    if (!navigator.sendBeacon) return;

    try {
      const payload = {
        visitorId,
        tabId,
        path: location.pathname,
        reason: reason || "pagehide",
        ts: Date.now(),
      };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(cfg.endpoint, blob);
    } catch {}
  };

  const start = () => {
    ensureWidget();
    ping("init");

    const intervalId = setInterval(() => {
      if (!document.hidden) ping("tick");
    }, cfg.intervalMs);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) ping("visible");
    });

    window.addEventListener("pageshow", () => ping("pageshow"));
    window.addEventListener("pagehide", () => beacon("pagehide"));
    window.addEventListener("beforeunload", () => beacon("beforeunload"));

    window.RELVALOAD_ONLINE_STOP = () => clearInterval(intervalId);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

