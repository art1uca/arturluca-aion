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

  /* ---------- screen transition & easter eggs ---------- */
  let timers = [];
  let raf = null;
  let activeAudio = null;
  let matrixRaf = null;

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
  const seen = {};

  function successFallback(m) {
    const real = (m.outcomes || []).filter(o => o.kind === "age" && o.number === "real");
    if (real.length) return real[Math.floor(Math.random() * real.length)];
    return { id: "__success", kind: "age", number: "real", reply: "Готово. Ваш возраст — {age} {years}." };
  }

  function pickOutcome(m) {
    const d = state.director;
    const targeted = d.model === m.id;

    if (targeted && d.outcome !== "random") {
      const forced = (m.outcomes || []).find(o => o.id === d.outcome);
      if (forced) return forced;
    }

    let pool = m.outcomes || [];
    if (targeted && d.mode === "success") pool = pool.filter(o => o.kind === "age");
    else if (targeted && d.mode === "error") pool = pool.filter(o => o.kind === "message");
    if (!pool.length) pool = m.outcomes || [];

    const shown = seen[m.id] || (seen[m.id] = new Set());
    const fresh = pool.filter(o => !shown.has(o.id));

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
     RESULT & EASTER EGGS LOGIC
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

  function runEasterEggs(outcomeId) {
    // 1. Лифтовая музыка для очереди GigaChat
    if (outcomeId === "queue") {
      activeAudio = new Audio("https://cdn.pixabay.com/audio/2022/05/16/audio_db6591201e.mp3");
      activeAudio.loop = true;
      activeAudio.volume = 0.3;
      activeAudio.play().catch(e => console.log("Audio autoplay blocked"));
    }
    
    // 2. Матрица + звук тревоги для Fable 5
    if (outcomeId === "pentagon") {
      startMatrixEffect();
      activeAudio = new Audio("https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3");
      activeAudio.loop = true;
      activeAudio.volume = 0.4;
      activeAudio.play().catch(e => console.log("Audio autoplay blocked"));
    }

    // 3. Звук ошибки Windows XP + Синий Экран
    if (outcomeId === "bsod") {
      activeAudio = new Audio("https://www.myinstants.com/media/sounds/windows-xp-error.mp3");
      activeAudio.volume = 0.6;
      activeAudio.play().catch(e => console.log("Audio autoplay blocked"));
      showBSOD();
    }
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
      runEasterEggs(outcome.id);
      return null; 
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
      runEasterEggs(outcome.id);
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
        <a class="btn btn-ig" href="${IG_URL}" target="_blank" rel="noopener">${ICON.instagram}<span>Подпишись — @art1uca</span></a>
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
          <span>Окей, честно: платёжную систему сюда так и не подключили. Это приложение, которое должно заработать $1.000.000, собрал за вечер очередной вайбкодер и на радостях вписал в форму оплаты <b>номер своей карты</b> — чтобы ваши $19.99 улетали лично ему. Даже это он толком не настроил, так что денег никто не спишет, а возраст по-прежнему бесплатный. Зато вайбкодера зовут <b><a href="https://www.instagram.com/art1uca/">@art1uca</a></b> — подпишитесь, если понравилась идея.</span>
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
     ROUTER & CLEANUP
     ============================================================ */
  function go(screen) {
    // Очистка эффектов при уходе с экрана результата
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    const oldMatrix = document.getElementById("matrixCanvas");
    if (oldMatrix) oldMatrix.remove();
    if (matrixRaf) {
      cancelAnimationFrame(matrixRaf);
      matrixRaf = null;
    }
    const oldBsod = document.getElementById("bsodOverlay");
    if (oldBsod) oldBsod.remove();

    clearTimers();
    state.screen = screen;
    let node = null;
    switch (screen) {
      case "home": node = buildHome(); break;
      case "birth": node = buildBirth(); break;
      case "models": node = buildModels(); break;
      case "loading": node = buildLoading(); break;
      case "result": node = buildResult(); break;   
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
     MATRIX EFFECT
     ============================================================ */
  function startMatrixEffect() {
    const canvas = document.createElement("canvas");
    canvas.id = "matrixCanvas";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~".split("");
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = [];
    for (let x = 0; x < columns; x++) drops[x] = 1;

    function draw() {
      ctx.fillStyle = "rgba(20, 16, 13, 0.1)"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0F0"; 
      ctx.font = fontSize + "px 'Space Grotesk', monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      matrixRaf = requestAnimationFrame(draw);
    }
    
    matrixRaf = requestAnimationFrame(draw);
    setTimeout(() => canvas.style.opacity = "0.4", 100); 
  }

  /* ============================================================
     BLUE SCREEN OF DEATH (BSOD) EFFECT
     ============================================================ */
  function showBSOD() {
    const bsod = document.createElement("div");
    bsod.id = "bsodOverlay";
    // Стилизуем чистым инлайн-CSS под классический Windows экран смерти
    bsod.style.position = "fixed";
    bsod.style.top = "0";
    bsod.style.left = "0";
    bsod.style.width = "100vw";
    bsod.style.height = "100vh";
    bsod.style.backgroundColor = "#0000AA";
    bsod.style.color = "#FFF";
    bsod.style.fontFamily = "'Courier New', Courier, monospace";
    bsod.style.fontSize = "16px";
    bsod.style.padding = "8vmin";
    bsod.style.zIndex = "10000";
    bsod.style.display = "flex";
    bsod.style.flexDirection = "column";
    bsod.style.justifyContent = "center";
    bsod.style.boxSizing = "border-box";
    bsod.style.whiteSpace = "pre-wrap";
    bsod.style.lineHeight = "1.5";
    bsod.style.cursor = "pointer";

    bsod.innerHTML = `A problem has been detected and AION has been shut down to prevent damage
to your ego.

AGE_CALCULATION_EXCEPTION

If this is the first time you've seen this stop error screen,
restart your browser. If this screen appears again, follow
these steps:

Check to make sure any new dates or years are properly calculated.
If this is a new installation, ask your hardware or software manufacturer
for any AION updates you might need.

If problems continue, disable or remove any newly installed vibe-coders.
Disable BIOS memory options such as caching or shadowing.

Technical information:
*** STOP: 0x000000FACE (0x00000000, 0x00000000, 0x00000000, 0x00000000)

Press any key or click to continue_`;

    document.body.appendChild(bsod);

    // Функция возврата (имитация перезагрузки)
    function dismiss(e) {
      bsod.remove();
      document.removeEventListener("keydown", dismiss);
      go("models"); // Возвращаем пользователя обратно в живой интерфейс
    }

    // Добавляем задержку 0.5с, чтобы юзер не прокликал экран случайно
    setTimeout(() => {
      document.addEventListener("keydown", dismiss);
      bsod.addEventListener("click", dismiss);
    }, 500);
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