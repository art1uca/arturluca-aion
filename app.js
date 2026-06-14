/* ============================================================
   AION — application logic & state machine
   ============================================================ */
(function () {
  "use strict";

  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MODELS = window.MODELS;
  const GENERIC = window.GENERIC_TRACE;
  const app = document.getElementById("app");
  const root = document.documentElement;
  const CUR_YEAR = new Date().getFullYear();
  const IG_URL = "https://instagram.com/art1uca";

  /* ---------- persistent state ---------- */
  const saved = (() => { try { return JSON.parse(localStorage.getItem("aion") || "{}"); } catch (e) { return {}; } })();

  const state = {
    screen: "home",
    birth: saved.birth || null,        // {d,m,y}
    age: null,
    model: null,
    director: saved.director || { model: "gpt", outcome: "random", mode: "auto", timeMs: null },
  };

  function persist() {
    try { localStorage.setItem("aion", JSON.stringify({ birth: state.birth, director: state.director })); } catch (e) {}
  }

  /* ---------- helpers ---------- */
  function yearsWord(n) {
    const a = Math.abs(n) % 100, b = n % 10;
    if (a > 10 && a < 20) return "лет";
    if (b > 1 && b < 5) return "года";
    if (b === 1) return "год";
    return "лет";
  }
  const ZODIAC = ["Крысы","Быка","Тигра","Кролика","Дракона","Змеи","Лошади","Козы","Обезьяны","Петуха","Собаки","Свиньи"];
  function zodiacOf(year) { return ZODIAC[((year - 4) % 12 + 12) % 12]; }

  function ageFrom(birth) {
    if (!birth) return null;
    const now = new Date();
    let a = now.getFullYear() - birth.y;
    const m = now.getMonth() - birth.m;
    if (m < 0 || (m === 0 && now.getDate() < birth.d)) a--;
    return a;
  }

  function hexA(hex, a) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  function setAccent(color) {
    root.style.setProperty("--accent", color);
    root.style.setProperty("--accent-soft", hexA(color, 0.16));
    root.style.setProperty("--accent-glow", hexA(color, 0.30));
  }
  function resetAccent() { setAccent("#C9A876"); }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---------- icons ---------- */
  const ICON = {
    shield: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    ask: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 0 1 5.5.7c0 1.9-2.8 2.5-2.8 4"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>',
    error: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 16H3z"/><path d="M12 9v5"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>',
    alarm: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16a6 6 0 0 1 12 0z"/><path d="M4 16h16"/><path d="M10 20h4"/><path d="M12 5V3M5.5 7.5L4.3 6.3M18.5 7.5l1.2-1.2"/></svg>',
    clip: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11l-8.5 8.5a4 4 0 0 1-5.7-5.7L13 6.6a2.5 2.5 0 0 1 3.5 3.5L8.8 17.8"/></svg>',
    lock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    spark: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></svg>',
    lockSmall: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-11"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
  };
  const iconFor = k => ICON[k] || ICON.spark;

  /* ---------- screen transition ---------- */
  let timers = [];
  let raf = null;
  function clearTimers() {
    timers.forEach(clearTimeout); timers = [];
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }
  function after(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }

  function show(node) {
    const old = app.querySelector(".screen");
    if (old) {
      old.classList.remove("screen-enter");
      old.classList.add("screen-exit");
      setTimeout(() => old.remove(), RM ? 0 : 320);
    }
    node.classList.add("screen", "screen-enter");
    app.appendChild(node);
  }

  /* ============================================================
     HOME
     ============================================================ */
  function buildHome() {
    resetAccent();
    const s = el("div", "screen home");
    s.innerHTML = `
      <div class="logo-mark" aria-hidden="true"></div>
      <div class="logo">AION</div>
      <div class="home-sub">Age Intelligence Engine</div>
      <p class="home-promise">Введите дату рождения — искусственный интеллект определит ваш точный возраст.</p>
      <div class="home-cta">
        <button class="btn btn-primary" id="start">Начать</button>
      </div>
      <a class="byline" href="${IG_URL}" target="_blank" rel="noopener">сделал <b>@art1uca</b> · подпишись →</a>
    `;
    s.querySelector("#start").onclick = () => go("birth");
    return s;
  }

  /* ============================================================
     BIRTHDATE
     ============================================================ */
  const MONTHS = ["Января","Февраля","Марта","Апреля","Мая","Июня","Июля","Августа","Сентября","Октября","Ноября","Декабря"];

  function buildBirth() {
    resetAccent();
    const s = el("div", "screen birth");
    const b = state.birth || {};
    s.innerHTML = `
      <div class="head">
        <div class="eyebrow">Шаг 1 из 2</div>
        <h1>Когда вы<br>появились на свет?</h1>
        <p>Данные обрабатываются локально нейронным ядром AION и не передаются третьим лицам.</p>
      </div>
      <div class="field">
        <label>Дата рождения</label>
        <div class="date-grid">
          <input class="inp" id="bd" inputmode="numeric" placeholder="ДД" maxlength="2" value="${b.d != null ? String(b.d) : ""}" aria-label="День">
          <select class="inp" id="bm" aria-label="Месяц">
            <option value="" disabled ${b.m == null ? "selected" : ""}>Месяц</option>
            ${MONTHS.map((m, i) => `<option value="${i}" ${b.m === i ? "selected" : ""}>${m}</option>`).join("")}
          </select>
          <input class="inp" id="by" inputmode="numeric" placeholder="ГГГГ" maxlength="4" value="${b.y != null ? String(b.y) : ""}" aria-label="Год">
        </div>
        <div class="preview-age" id="prev"></div>
        <div class="hint" id="hint"></div>
      </div>
      <div class="spacer"></div>
      <div class="btn-row">
        <button class="btn btn-primary" id="next" disabled>Выбрать модель</button>
        <button class="btn btn-ghost" id="back">Назад</button>
      </div>
    `;
    const bd = s.querySelector("#bd"), bm = s.querySelector("#bm"), by = s.querySelector("#by");
    const prev = s.querySelector("#prev"), hint = s.querySelector("#hint"), next = s.querySelector("#next");

    function read() {
      const d = parseInt(bd.value, 10), m = parseInt(bm.value, 10), y = parseInt(by.value, 10);
      if (!d || isNaN(m) || !y || by.value.length < 4) return null;
      if (d < 1 || d > 31 || y < 1900 || y > CUR_YEAR) return null;
      const dt = new Date(y, m, d);
      if (dt.getDate() !== d || dt.getMonth() !== m) return null;
      if (dt > new Date()) return null;
      return { d, m, y };
    }
    function update() {
      const v = read();
      hint.textContent = ""; hint.classList.remove("err");
      if (v) {
        state.birth = v;
        const a = ageFrom(v);
        prev.textContent = `Предварительная оценка: ${a} ${yearsWord(a)}`;
        next.disabled = false;
        persist();
      } else {
        prev.textContent = "";
        next.disabled = true;
        const filled = bd.value && bm.value && by.value.length === 4;
        if (filled) { hint.textContent = "Проверьте корректность даты."; hint.classList.add("err"); }
      }
    }
    [bd, by].forEach(i => i.addEventListener("input", () => { i.value = i.value.replace(/\D/g, ""); update(); }));
    bm.addEventListener("change", update);
    by.addEventListener("keydown", e => { if (e.key === "Enter" && !next.disabled) go("models"); });

    next.onclick = () => { if (!next.disabled) go("models"); };
    s.querySelector("#back").onclick = () => go("home");
    update();
    return s;
  }

  /* ============================================================
     MODEL SELECT
     ============================================================ */
  function buildModels() {
    resetAccent();
    state.age = ageFrom(state.birth);
    const s = el("div", "screen screen-scroll");
    s.innerHTML = `
      <div class="models-head">
        <div class="eyebrow">Шаг 2 из 2</div>
        <h1>Выберите модель</h1>
        <p>Разные модели — разная архитектура, скорость и точность.</p>
      </div>
      <div class="model-grid" id="grid"></div>
    `;
    const grid = s.querySelector("#grid");
    MODELS.forEach(m => {
      const c = el("button", "mcard" + (m.locked ? " locked" : ""));
      c.style.setProperty("--c", m.color);
      c.setAttribute("aria-label", m.name);
      c.innerHTML = `
        <div class="mcard-dot"><i></i></div>
        <div class="mcard-name">${m.name}</div>
        <div class="mcard-maker">${m.maker}</div>
        <div class="mcard-foot">
          <span class="badge">${m.badge}</span>
          ${m.locked ? `<span class="lock-ico">${ICON.lockSmall}</span>` : ""}
        </div>
      `;
      c.onclick = () => {
        state.model = m;
        if (m.locked) go("paywall");
        else go("loading");
      };
      grid.appendChild(c);
    });
    return s;
  }

  /* ============================================================
     OUTCOME RESOLUTION
     ============================================================ */
  // tracks which outcomes were already shown per model (resets on page reload)
  const seen = {};

  function successFallback(m) {
    // prefer one of the model's own real-age replies so it keeps its voice…
    const real = (m.outcomes || []).filter(o => o.kind === "age" && o.number === "real");
    if (real.length) return real[Math.floor(Math.random() * real.length)];
    // …otherwise a clean, neutral success with the true age
    return { id: "__success", kind: "age", number: "real", reply: "Готово. Ваш возраст — {age} {years}." };
  }

  function pickOutcome(m) {
    const d = state.director;
    const targeted = d.model === m.id;

    // director forces a specific outcome → return it as-is (no dedup, no tracking)
    if (targeted && d.outcome !== "random") {
      const forced = (m.outcomes || []).find(o => o.id === d.outcome);
      if (forced) return forced;
    }

    let pool = m.outcomes || [];
    if (targeted && d.mode === "success") pool = pool.filter(o => o.kind === "age");
    else if (targeted && d.mode === "error") pool = pool.filter(o => o.kind === "message");
    if (!pool.length) pool = m.outcomes || [];

    // skip anything already shown for this model
    const shown = seen[m.id] || (seen[m.id] = new Set());
    const fresh = pool.filter(o => !shown.has(o.id));

    // nothing new left → finish on a successful age result
    if (!fresh.length) return successFallback(m);

    const chosen = fresh[Math.floor(Math.random() * fresh.length)];
    shown.add(chosen.id);
    return chosen;
  }

  function resolveNumber(outcome, age) {
    if (outcome.number === "real") return age;
    if (outcome.number === "curYear") return CUR_YEAR;
    if (outcome.number === "wrong") return age + 12 + Math.floor(Math.random() * 16);
    return age;
  }

  function fillTokens(text, ctx) {
    return text
      .replace(/\{age\}/g, ctx.age)
      .replace(/\{years\}/g, yearsWord(ctx.age))
      .replace(/\{zodiac\}/g, zodiacOf(state.birth ? state.birth.y : CUR_YEAR))
      .replace(/\{wrongAge\}/g, ctx.wrong)
      .replace(/\{wrongYears\}/g, yearsWord(ctx.wrong))
      .replace(/\{curYear\}/g, CUR_YEAR);
  }

  function loadDuration(m) {
    const d = state.director;
    if (d.model === m.id && d.timeMs != null) return d.timeMs;
    if (m.loadRange) return m.loadRange[0] + Math.random() * (m.loadRange[1] - m.loadRange[0]);
    return m.load;
  }

  /* ============================================================
     LOADING
     ============================================================ */
  function buildLoading() {
    const m = state.model;
    setAccent(m.color);
    const dur = Math.max(500, loadDuration(m));

    const s = el("div", "screen loading");
    s.innerHTML = `
      <div class="load-top">
        <div class="load-orb"><i></i></div>
        <div class="eyebrow">Обработка запроса</div>
        <div class="load-model">${m.name}</div>
      </div>
      <div class="trace" id="trace"></div>
      <div class="progress-wrap">
        <div class="progress-meta"><span>Нейронный анализ</span><span class="t" id="tmr">0.0s</span></div>
        <div class="bar"><i id="barfill"></i></div>
      </div>
    `;
    const trace = s.querySelector("#trace");
    const tmr = s.querySelector("#tmr");
    const fill = s.querySelector("#barfill");

    // assemble a line schedule that fills the duration
    let lines = GENERIC.slice(0, 2).concat(m.trace);
    const minPer = 700;
    while (lines.length * minPer < dur - minPer) lines = lines.concat(m.trace);
    const step = dur / (lines.length + 1);

    lines.forEach((txt, i) => {
      after(() => {
        const prevActive = trace.querySelector(".trace-line.active");
        if (prevActive) prevActive.classList.remove("active");
        const isZh = /[\u4e00-\u9fff]/.test(txt);
        const line = el("div", "trace-line active" + (isZh ? " zh" : ""), `<span class="tick">›</span><span>${txt}</span>`);
        trace.appendChild(line);
        while (trace.children.length > 8) trace.removeChild(trace.firstChild);
      }, Math.round(step * (i + 1)));
    });

    // progress + timer via rAF
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      fill.style.width = (p * 100).toFixed(1) + "%";
      tmr.textContent = ((now - start) / 1000).toFixed(1) + "s";
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    after(() => {
      const outcome = pickOutcome(m);
      state.pending = outcome;
      go("result");
    }, dur);

    return s;
  }

  /* ============================================================
     RESULT
     ============================================================ */
  function countUp(node, target) {
    if (RM || target === 0) { node.textContent = target; return; }
    const dur = 1200, start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(e * target);
      if (t < 1) raf = requestAnimationFrame(tick);
      else node.textContent = target;
    }
    raf = requestAnimationFrame(tick);
  }

  function buildResult() {
    const m = state.model;
    const outcome = state.pending || pickOutcome(m);
    setAccent(m.color);

    const age = state.age;
    const num = outcome.kind === "age" ? resolveNumber(outcome, age) : null;
    const ctx = { age, wrong: (outcome.number === "wrong" ? num : age) };
    const replyText = fillTokens(outcome.reply, ctx);

    const s = el("div", "screen result");

    if (outcome.kind === "age") {
      s.innerHTML = `
        <div class="result-top">
          <div class="result-label">Точный возраст</div>
          <div class="age-num" id="num">0</div>
          <div class="age-unit">${num > 200 ? "лет от Р.Х." : yearsWord(num)}</div>
        </div>
        ${bubbleHTML(m, replyText, outcome.cost)}
        ${actionsHTML()}
      `;
      const numNode = s.querySelector("#num");
      wireActions(s);
      show(s);
      after(() => countUp(numNode, num), RM ? 0 : 350);
      return null; // already shown
    } else {
      s.innerHTML = `
        <div class="result-top">
          <div class="result-icon">${iconFor(outcome.icon)}</div>
          <div class="result-title">${outcome.title || "Ответ модели"}</div>
        </div>
        ${bubbleHTML(m, replyText, outcome.cost)}
        ${actionsHTML()}
      `;
      wireActions(s);
      return s;
    }
  }

  function bubbleHTML(m, text, cost) {
    return `
      <div class="bubble-wrap">
        <div class="bubble-av"><i></i></div>
        <div class="bubble">
          <span class="who">${m.name}</span>
          <span>${text}</span>
          ${cost ? `<span class="cost">${cost}</span>` : ""}
        </div>
      </div>`;
  }
  function actionsHTML() {
    return `
      <div class="spacer"></div>
      <div class="btn-row result-actions">
        <button class="btn btn-primary" data-act="other">Другая модель</button>
        <button class="btn btn-ghost" data-act="again">Запустить снова</button>
        <a class="btn btn-ig" href="${IG_URL}" target="_blank" rel="noopener">${ICON.instagram}<span>Ещё приколы — @art1uca</span></a>
      </div>`;
  }
  function wireActions(s) {
    const other = s.querySelector('[data-act="other"]');
    const again = s.querySelector('[data-act="again"]');
    if (other) other.onclick = () => go("models");
    if (again) again.onclick = () => go("loading");
  }

  /* ============================================================
     PAYWALL (AION Ultra) + vibecoder confession
     ============================================================ */
  function buildPaywall() {
    const m = state.model;
    setAccent(m.color);
    const p = m.paywall;
    const s = el("div", "screen result");
    s.innerHTML = `
      <div class="spacer"></div>
      <div class="paywall">
        <div class="result-icon">${ICON.lock}</div>
        <div class="eyebrow">AION Ultra</div>
        <div class="result-title">${p.headline}</div>
        <div class="price">${p.price}<small>${p.per}</small></div>
        <ul class="feature-list">
          ${p.features.map(f => `<li>${ICON.check}<span>${f}</span></li>`).join("")}
        </ul>
        <button class="btn btn-primary" id="buy">${p.cta}</button>
        <div class="fineprint">${p.fineprint}</div>
      </div>
      <div class="spacer"></div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="back">Назад к моделям</button>
      </div>
    `;
    const buy = s.querySelector("#buy");
    buy.onclick = () => {
      buy.disabled = true;
      buy.textContent = "Обработка платежа…";
      after(() => showConfession(s), 2400);
    };
    s.querySelector("#back").onclick = () => go("models");
    return s;
  }

  function showConfession(s) {
    setAccent("#E0795C");
    s.innerHTML = `
      <div class="spacer"></div>
      <div class="result-top">
        <div class="result-icon">${ICON.error}</div>
        <div class="result-title">Платёж не прошёл 🫠</div>
      </div>
      <div class="bubble-wrap">
        <div class="bubble-av"><i></i></div>
        <div class="bubble">
          <span class="who">AION · системное сообщение</span>
          <span>Окей, честно: платёжную систему сюда так и не подключили. Это приложение собрал за вечер очередной вайбкодер и на радостях вписал в форму оплаты <b>номер своей карты</b> — чтобы все ваши $19.99 улетали лично ему. Даже это он толком не настроил, так что денег никто не списал, а ваш возраст по-прежнему бесплатный. Зато вайбкодера зовут <b>@art1uca</b> — подпишитесь, дальше будет ещё смешнее.</span>
        </div>
      </div>
      <div class="spacer"></div>
      <div class="btn-row result-actions">
        <a class="btn btn-primary" href="${IG_URL}" target="_blank" rel="noopener">Подписаться на @art1uca</a>
        <button class="btn btn-ghost" data-act="other">Назад к моделям</button>
      </div>
    `;
    const other = s.querySelector('[data-act="other"]');
    if (other) other.onclick = () => go("models");
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  function go(screen) {
    clearTimers();
    state.screen = screen;
    let node = null;
    switch (screen) {
      case "home": node = buildHome(); break;
      case "birth": node = buildBirth(); break;
      case "models": node = buildModels(); break;
      case "loading": node = buildLoading(); break;
      case "result": node = buildResult(); break;   // may self-show & return null
      case "paywall": node = buildPaywall(); break;
    }
    if (node) show(node);
  }

  /* ============================================================
     INSTAGRAM BAR (persistent, all screens)
     ============================================================ */
  function buildIgBar() {
    const a = el("a", "ig-bar");
    a.href = IG_URL;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Instagram @art1uca — подписаться");
    a.innerHTML = `<span class="ig-ico">${ICON.instagram}</span><span>@art1uca</span><span class="ig-sub">· подписаться</span>`;
    document.body.appendChild(a);
  }

  /* ============================================================
     DIRECTOR PANEL
     ============================================================ */
  function buildDirector() {
    const wrap = el("div", "director");
    wrap.id = "director";
    wrap.innerHTML = `
      <div class="director-panel" role="dialog" aria-label="Панель Режиссёр">
        <button class="dir-close" id="dirClose" aria-label="Закрыть">${ICON.close}</button>
        <h3>● Режиссёр</h3>
        <div class="sub">Управление съёмкой: форсируйте исход, скорость и режим для нужной модели.</div>

        <div class="dir-group">
          <label>Модель</label>
          <select class="dir-sel" id="dModel"></select>
        </div>

        <div class="dir-group">
          <label>Принудительный исход</label>
          <select class="dir-sel" id="dOutcome"></select>
        </div>

        <div class="dir-group">
          <label>Режим</label>
          <div class="seg" id="dMode">
            <button data-mode="auto">Авто</button>
            <button data-mode="success">Успех</button>
            <button data-mode="error">Ошибка</button>
          </div>
        </div>

        <div class="dir-group">
          <label>Время загрузки</label>
          <div class="dir-time">
            <input type="range" id="dTime" min="500" max="30000" step="500">
            <span class="val" id="dTimeVal">Авто</span>
          </div>
          <div class="seg" style="margin-top:10px">
            <button id="dTimeAuto">Сбросить на «Авто»</button>
          </div>
        </div>

        <div class="dir-group">
          <button class="btn btn-primary" id="dRun">Запустить эту модель</button>
        </div>

        <div class="dir-note">Точка в правом нижнем углу открывает эту панель. Багованные модели иначе выбирают исход случайно при каждом запуске.</div>
      </div>
    `;
    document.body.appendChild(wrap);

    const dModel = wrap.querySelector("#dModel");
    const dOutcome = wrap.querySelector("#dOutcome");
    const dModeBtns = wrap.querySelectorAll("#dMode button");
    const dTime = wrap.querySelector("#dTime");
    const dTimeVal = wrap.querySelector("#dTimeVal");

    MODELS.forEach(m => {
      const o = el("option"); o.value = m.id; o.textContent = m.name + (m.locked ? " 🔒" : ""); dModel.appendChild(o);
    });

    function outcomeLabel(o) {
      if (o.title) return o.title;
      const short = o.reply.replace(/\{[^}]+\}/g, "—").slice(0, 34);
      return (o.kind === "age" ? "Возраст · " : "") + short + "…";
    }
    function fillOutcomes() {
      const m = MODELS.find(x => x.id === state.director.model) || MODELS[0];
      dOutcome.innerHTML = "";
      const rnd = el("option"); rnd.value = "random"; rnd.textContent = "Случайно"; dOutcome.appendChild(rnd);
      (m.outcomes || []).forEach(o => {
        const op = el("option"); op.value = o.id; op.textContent = outcomeLabel(o); dOutcome.appendChild(op);
      });
      if (m.locked) { dOutcome.disabled = true; const op = el("option"); op.textContent = "— (пейволл)"; dOutcome.appendChild(op); }
      else dOutcome.disabled = false;
      dOutcome.value = state.director.outcome || "random";
      if (![...dOutcome.options].some(o => o.value === dOutcome.value)) dOutcome.value = "random";
    }
    function syncMode() {
      dModeBtns.forEach(b => b.classList.toggle("on", b.dataset.mode === state.director.mode));
    }
    function syncTime() {
      if (state.director.timeMs == null) { dTimeVal.textContent = "Авто"; dTime.classList.add("auto"); dTime.value = 500; }
      else { dTimeVal.textContent = (state.director.timeMs / 1000).toFixed(1) + "s"; dTime.classList.remove("auto"); dTime.value = state.director.timeMs; }
    }
    function syncAll() { dModel.value = state.director.model; fillOutcomes(); syncMode(); syncTime(); }

    dModel.onchange = () => { state.director.model = dModel.value; state.director.outcome = "random"; fillOutcomes(); persist(); };
    dOutcome.onchange = () => { state.director.outcome = dOutcome.value; persist(); };
    dModeBtns.forEach(b => b.onclick = () => { state.director.mode = b.dataset.mode; syncMode(); persist(); });
    dTime.oninput = () => { state.director.timeMs = parseInt(dTime.value, 10); syncTime(); persist(); };
    wrap.querySelector("#dTimeAuto").onclick = () => { state.director.timeMs = null; syncTime(); persist(); };

    wrap.querySelector("#dRun").onclick = () => {
      const m = MODELS.find(x => x.id === state.director.model) || MODELS[0];
      closeDir();
      state.model = m;
      if (!state.birth) { go("birth"); return; }
      state.age = ageFrom(state.birth);
      if (m.locked) go("paywall"); else go("loading");
    };

    wrap.querySelector("#dirClose").onclick = closeDir;
    wrap.addEventListener("click", e => { if (e.target === wrap) closeDir(); });

    function openDir() { syncAll(); wrap.classList.add("open"); }
    function closeDir() { wrap.classList.remove("open"); }

    const dot = el("button", "director-dot");
    dot.id = "directorDot";
    dot.setAttribute("aria-label", "Панель Режиссёр");
    dot.onclick = openDir;
    document.body.appendChild(dot);

    document.addEventListener("keydown", e => { if (e.key === "Escape") closeDir(); });
  }

  /* ============================================================
     INIT
     ============================================================ */
  buildIgBar();
  buildDirector();
  go("home");

})();