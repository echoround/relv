// Relvaload.ee — Online visitors widget (frontend)
// Requires a backend endpoint (default: /api/online) that returns JSON with { siteOnline, pageOnline }.

(() => {
  const DEFAULTS = {
    endpoint: "/api/online", // change if your backend lives elsewhere
    intervalMs: 15000,       // polling interval while tab is visible
    timeoutMs: 4500,         // request timeout
    mode: "site",            // "site" or "page"
  };

  const cfg = Object.assign({}, DEFAULTS, (window.RELVALOAD_ONLINE_CONFIG || {}));

  const STORAGE_VISITOR = "rv_vid";
  const STORAGE_TAB = "rv_tid";
    
    const DISPLAY_OFFSET = 11;


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
          <span class="online-label">külastajat</span>
        </span>
      `;
      document.body.appendChild($root);
    }

    $count = $root.querySelector(".online-count");
    $label = $root.querySelector(".online-label");
  };

  const etLabel = (n) => (n === 1 ? "külastaja online" : "külastajat online");

  const setCount = (n + DISPLAY_OFFSET) => {
    ensureWidget();
    if (typeof n === "number" && Number.isFinite(n) && n >= 0) {
      $count.textContent = String(n);
      $label.textContent = etLabel(n);

      $root.classList.remove("is-bump");
      void $root.offsetWidth; // reflow
      $root.classList.add("is-bump");
    } else {
      $count.textContent = "—";
      $label.textContent = "külastajat online";
    }
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

        const raw = cfg.mode === "page"
          ? Number(data.pageOnline)
          : Number(data.siteOnline ?? data.online);

        setCount(Math.max(0, raw + DISPLAY_OFFSET));

      setOnline(true);
    } catch {
      setOnline(false);
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

    // Poll only when visible (battery/data friendly)
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

