(() => {
  "use strict";

  // The profile universe is generated from exact decimal-string IDs. IDs are
  // never converted to Number; arithmetic for adjacent IDs is string-based.
  const CONFIG = {
    initialBatch: 15,
    batchSize: 12,
    prefetchRows: 3,
    maxDomCards: 48,
    multiplicationDefault: false
  };

  const $ = (selector) => document.querySelector(selector);
  const feed = $("#feed");
  const sentinel = $("#feed-sentinel");
  const feedView = $("#feed-view");
  const profileView = $("#profile-view");
  const detail = $("#profile-detail");
  const searchInput = $("#profile-search");
  const searchError = $("#search-error");
  const loadedCount = $("#loaded-count");
  const feedStatus = $("#feed-status");
  let generatedCount = 0;
  let nextFeedId = "1";
  let loading = false;
  let observer = null;
  let recoveryTimer = null;
  let multiplication = CONFIG.multiplicationDefault;
  let multiplier = 1n;
  let currentId = null;
  let previousViewWasProfile = false;
  let lastDiscoveryId = "0";
  let generationToken = 0;

  const NAME_A = ["Astra", "Veyra", "Nyx", "Orion", "Caeli", "Vanta", "Zyra", "Elyx", "Nova", "Kairo", "Luma", "Oryn", "Aether", "Vexa", "Cyran", "Ivara", "Sol", "Nexa", "Thalen", "Mira"];
  const NAME_B = ["quon", "vex", "aris", "yra", "ion", "ora", "eth", "axis", "une", "orae", "ryn", "elis", "ovan", "ique", "ara", "eon", "alis", "yx", "ora", "en"];
  const CATEGORIES = ["ORBITAL", "SYNTHETIC", "COSMIC", "QUANTUM", "ECHO", "CELESTIAL", "LUMINAL", "UNKNOWN"];
  const DESCRIPTIONS = [
    "A signal moving quietly between the known and the unexplored.",
    "An identity shaped by patterns at the edge of a distant orbit.",
    "A quiet observer in a universe that never reaches its boundary.",
    "A unique coordinate in the expanding architecture of reality.",
    "A resonance formed from light, memory, and endless possibility.",
    "A traveler following a path that exists only as it is discovered.",
    "A new configuration in the living constellation of identities.",
    "A fragment of the infinite, carrying its own signature."
  ];
  const SYMBOLS = ["✧", "◈", "⌬", "⟡", "⦿", "◇", "⊹", "⟁", "◉", "✦", "⌘", "⟢"];
  const PALETTE = ["#9d7cff", "#6ce9f2", "#c084fc", "#818cf8", "#e879f9", "#67e8c5", "#a5b4fc", "#f0abfc"];

  function normalizeId(raw) {
    if (typeof raw !== "string" || !/^[0-9]+$/.test(raw)) return null;
    const stripped = raw.replace(/^0+/, "");
    return stripped.length ? stripped : null;
  }

  function compareIds(a, b) {
    if (a.length !== b.length) return a.length < b.length ? -1 : 1;
    return a === b ? 0 : (a < b ? -1 : 1);
  }

  function addOne(id) {
    const digits = id.split("");
    let carry = 1;
    for (let i = digits.length - 1; i >= 0 && carry; i--) {
      const value = digits[i].charCodeAt(0) - 48 + carry;
      digits[i] = String(value % 10);
      carry = value >= 10 ? 1 : 0;
    }
    if (carry) digits.unshift("1");
    return digits.join("");
  }

  function subtractOne(id) {
    if (id === "1") return "1";
    const digits = id.split("");
    let borrow = 1;
    for (let i = digits.length - 1; i >= 0 && borrow; i--) {
      let value = digits[i].charCodeAt(0) - 48 - borrow;
      if (value < 0) { value = 9; borrow = 1; } else borrow = 0;
      digits[i] = String(value);
    }
    return digits.join("").replace(/^0+/, "") || "1";
  }

  // Stable string hash: reads all ID digits without numeric conversion.
  function hashId(id, salt = "") {
    let h1 = 2166136261 >>> 0;
    const input = `${salt}:${id}`;
    for (let i = 0; i < input.length; i++) {
      h1 ^= input.charCodeAt(i);
      h1 = Math.imul(h1, 16777619) >>> 0;
    }
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x7feb352d) >>> 0;
    h1 ^= h1 >>> 15;
    return h1 >>> 0;
  }

  function choose(list, hash) { return list[hash % list.length]; }

  function createProfile(id) {
    const h = hashId(id);
    const h2 = hashId(id, "secondary");
    const h3 = hashId(id, "tertiary");
    const name = choose(NAME_A, h) + choose(NAME_B, h2);
    const category = choose(CATEGORIES, h3);
    const symbol = choose(SYMBOLS, hashId(id, "symbol"));
    return {
      id,
      name,
      category,
      symbol,
      description: choose(DESCRIPTIONS, hashId(id, "description")),
      trait: choose(["Resonance", "Signal", "Frequency", "Orbit", "Spectrum", "Dimension", "Pulse", "Current"], hashId(id, "trait")),
      value: choose(["Violet / Cyan", "Dark matter", "Phase-shifted", "Deep space", "Quantum drift", "Stellar glass", "Night spectrum", "Lunar static"], hashId(id, "value")),
      coordinate: `${(h % 997) + 1}.${(h2 % 89) + 10} / ${(h3 % 991) + 1}`,
      signature: h.toString(16).toUpperCase().padStart(8, "0"),
      color: choose(PALETTE, hashId(id, "color"))
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function profileCard(profile) {
    const card = document.createElement("article");
    card.className = "profile-card";
    card.dataset.id = profile.id;
    card.style.setProperty("--glow", profile.color);
    card.innerHTML = `
      <div class="card-top">
        <div class="avatar" aria-hidden="true">${escapeHtml(profile.symbol)}</div>
        <div>
          <h3 class="profile-name">${escapeHtml(profile.name)}</h3>
          <p class="profile-id">ID / ${escapeHtml(profile.id)}</p>
        </div>
      </div>
      <p class="card-description">${escapeHtml(profile.description)}</p>
      <div class="card-bottom">
        <span class="category">${escapeHtml(profile.category)}</span>
        <button class="open-profile" type="button" data-open-id="${escapeHtml(profile.id)}">Open identity ↗</button>
      </div>`;
    return card;
  }

  function showError(message) {
    searchError.textContent = message;
    searchError.classList.add("visible");
  }
  function clearError() {
    searchError.textContent = "";
    searchError.classList.remove("visible");
  }

  function renderBatch(count) {
    if (loading) return;
    loading = true;
    const token = ++generationToken;
    requestAnimationFrame(() => {
      if (token !== generationToken) { loading = false; return; }
      try {
        const fragment = document.createDocumentFragment();
        let added = 0;
        const target = Math.max(1, Math.min(count, 120));
        while (added < target) {
          const id = nextFeedId;
          nextFeedId = addOne(nextFeedId);
          fragment.appendChild(profileCard(createProfile(id)));
          generatedCount++;
          added++;
        }
        feed.appendChild(fragment);
        loadedCount.textContent = String(generatedCount);
        virtualizeFeed();
        feedStatus.textContent = "";
      } catch (error) {
        feedStatus.textContent = "This batch paused. The stream will retry as you continue scrolling.";
        console.error("VYRAQUON batch error:", error);
      } finally {
        loading = false;
        scheduleRecovery();
      }
    });
  }

  function virtualizeFeed() {
    // Keep a bounded DOM window. The deterministic IDs let removed cards be recreated.
    while (feed.children.length > CONFIG.maxDomCards) {
      const first = feed.firstElementChild;
      if (!first) break;
      const height = first.getBoundingClientRect().height;
      const margin = 15;
      first.remove();
      // Do not change scroll position: the removed item was already above the active viewport
      // under normal prefetch operation. If it was not, compensate by its measured height.
      if (height > 0 && first.getBoundingClientRect().top < 0) {
        // no-op by design; browser scroll anchoring preserves the viewport
      }
    }
  }

  function setupObserver() {
    if ("IntersectionObserver" in window) {
      try {
        observer = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) requestMore();
        }, { root: null, rootMargin: "900px 0px", threshold: 0 });
        observer.observe(sentinel);
      } catch (error) {
        observer = null;
      }
    }
    // Recovery path: scroll/resize checks do not depend on IntersectionObserver.
    window.addEventListener("scroll", checkNearBottom, { passive: true });
    window.addEventListener("resize", checkNearBottom, { passive: true });
    scheduleRecovery();
  }

  function checkNearBottom() {
    if (feedView.classList.contains("hidden")) return;
    const distance = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    if (distance < 1100) requestMore();
  }

  function scheduleRecovery() {
    clearTimeout(recoveryTimer);
    recoveryTimer = setTimeout(() => {
      if (!feedView.classList.contains("hidden") && !loading) {
        checkNearBottom();
        // Fill short viewports without waiting for a scroll event.
        if (feed.children.length < 8 || document.documentElement.scrollHeight < window.innerHeight + 300) requestMore();
      }
      scheduleRecovery();
    }, 1400);
  }

  function requestMore() {
    if (loading || feedView.classList.contains("hidden")) return;
    let count = CONFIG.batchSize;
    if (multiplication) {
      multiplier *= 2n;
      // Multiplier is unbounded; a cycle is intentionally bounded to keep devices responsive.
      const safeMultiplier = multiplier > 10n ? 10n : multiplier;
      count = Number(BigInt(CONFIG.batchSize) * safeMultiplier);
      $("#multiplication-toggle").textContent = `×${multiplier.toString()}`;
      $("#multiplication-toggle").setAttribute("aria-label", `Multiplication mode enabled, current multiplier ${multiplier.toString()}`);
    }
    renderBatch(count);
  }

  function goToProfile(rawId, push = true) {
    const id = normalizeId(rawId);
    if (!id) {
      showError("Enter a positive ID using decimal digits only (for example, 123456).");
      return;
    }
    clearError();
    const profile = createProfile(id);
    previousViewWasProfile = !profileView.classList.contains("hidden");
    currentId = id;
    if (push) history.pushState({ profileId: id }, "", `#/profile/${id}`);
    renderProfile(profile);
    feedView.classList.add("hidden");
    profileView.classList.remove("hidden");
    window.scrollTo(0, 0);
  }

  function renderProfile(profile) {
    detail.innerHTML = `
      <article class="detail-shell" style="--glow:${profile.color}">
        <p class="eyebrow"><span class="live-dot"></span> IDENTITY RECORD / ${escapeHtml(profile.category)}</p>
        <div class="detail-top">
          <div class="detail-avatar" aria-hidden="true">${escapeHtml(profile.symbol)}</div>
          <div><h1>${escapeHtml(profile.name)}</h1><p class="detail-id">PROFILE ID · ${escapeHtml(profile.id)}</p></div>
        </div>
        <p class="detail-description">${escapeHtml(profile.description)}</p>
        <div class="attribute-grid">
          <div class="attribute"><span>Classification</span><b>${escapeHtml(profile.category)}</b></div>
          <div class="attribute"><span>Core trait</span><b>${escapeHtml(profile.trait)}</b></div>
          <div class="attribute"><span>Signature</span><b>${escapeHtml(profile.signature)}</b></div>
          <div class="attribute"><span>Coordinates</span><b>${escapeHtml(profile.coordinate)}</b></div>
          <div class="attribute"><span>Visual spectrum</span><b>${escapeHtml(profile.value)}</b></div>
          <div class="attribute"><span>Identity status</span><b>Deterministic · Stable</b></div>
        </div>
        <div class="detail-actions">
          <button class="action-button primary" data-action="copy-url">Copy profile link</button>
          <button class="action-button" data-action="copy-id">Copy profile ID</button>
          <button class="action-button" data-action="random">Discover another</button>
          <button class="action-button" data-action="related">Related identity</button>
        </div>
        <div class="detail-nav">
          <button data-action="previous">← Previous profile</button>
          <button data-action="next">Next profile →</button>
        </div>
      </article>`;
  }

  function returnToFeed(push = true) {
    if (push) history.pushState({ feed: true }, "", "#/");
    profileView.classList.add("hidden");
    feedView.classList.remove("hidden");
    currentId = null;
    window.scrollTo(0, 0);
    scheduleRecovery();
  }

  function randomId() {
    // A practical random decimal ID; arbitrary-length direct IDs remain supported by search.
    const digits = 10 + Math.floor(Math.random() * 20);
    let id = String(1 + Math.floor(Math.random() * 9));
    for (let i = 1; i < digits; i++) id += String(Math.floor(Math.random() * 10));
    if (id === lastDiscoveryId) return addOne(id);
    lastDiscoveryId = id;
    return id;
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement("textarea");
        input.value = text;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand("copy");
        input.remove();
        if (!ok) throw new Error("Clipboard unavailable");
      }
      feedStatus.textContent = "Copied to clipboard.";
      setTimeout(() => { if (feedStatus.textContent === "Copied to clipboard.") feedStatus.textContent = ""; }, 1800);
    } catch {
      feedStatus.textContent = "Copy was blocked by this browser. You can copy the visible ID or URL manually.";
    }
  }

  $("#search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    goToProfile(searchInput.value);
  });
  $("#search-toggle").addEventListener("click", () => {
    if (feedView.classList.contains("hidden")) {
      returnToFeed();
    }
    searchInput.focus();
    searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#multiplication-toggle").addEventListener("click", (event) => {
    multiplication = !multiplication;
    multiplier = 1n;
    const button = event.currentTarget;
    button.textContent = multiplication ? "×2" : "×";
    button.classList.toggle("active", multiplication);
    button.title = multiplication ? "Multiplication mode on: batches grow by powers of two (per-cycle work remains bounded)" : "Multiplication mode off";
  });
  $("#back-to-feed").addEventListener("click", () => returnToFeed());
  feed.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-id]");
    if (button) goToProfile(button.dataset.openId);
  });
  detail.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || !currentId) return;
    const action = button.dataset.action;
    if (action === "copy-id") await copyText(currentId);
    else if (action === "copy-url") await copyText(`${location.origin}${location.pathname}#/profile/${currentId}`);
    else if (action === "previous") goToProfile(subtractOne(currentId));
    else if (action === "next") goToProfile(addOne(currentId));
    else if (action === "random") goToProfile(randomId());
    else if (action === "related") {
      const h = hashId(currentId, "related");
      const suffix = String((h % 999999) + 1);
      goToProfile(addOne(currentId.slice(-Math.min(currentId.length, 20)) + suffix));
    }
  });

  window.addEventListener("popstate", () => routeFromHash(false));
  window.addEventListener("hashchange", () => routeFromHash(false));

  function routeFromHash(pushIfMissing = false) {
    const match = location.hash.match(/^#\/profile\/([0-9]+)$/);
    if (match) {
      const id = normalizeId(match[1]);
      if (id) {
        // Avoid rendering the same route twice when both popstate and hashchange fire.
        if (currentId !== id || profileView.classList.contains("hidden")) goToProfile(id, false);
        return;
      }
    }
    if (currentId !== null || profileView.classList.contains("hidden")) returnToFeed(false);
    if (pushIfMissing && !location.hash) history.replaceState({ feed: true }, "", "#/");
  }

  // Initial stream and direct-link support.
  setupObserver();
  renderBatch(CONFIG.initialBatch);
  if (location.hash.startsWith("#/profile/")) routeFromHash();
  else history.replaceState({ feed: true }, "", location.hash || "#/");

  // A defensive check if browser layout/observer behavior changes after tab restore.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { checkNearBottom(); scheduleRecovery(); }
  });
})();
