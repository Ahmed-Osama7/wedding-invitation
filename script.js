/**
 * Wedding invitation SPA — countdown, canvas signature, Firestore, i18n (AR/EN).
 * Firebase loads only when submitting forms so i18n/UI still run if CDN is slow or blocked.
 */
import { TRANSLATIONS, STORAGE_KEY, isLocale, DEFAULT_LANG } from './translations.js';

const FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

let firestoreApiPromise = null;

async function loadFirestoreApi() {
  if (!firestoreApiPromise) {
    firestoreApiPromise = (async () => {
      const [{ db }, firestoreMod] = await Promise.all([
        import('./firebase.js'),
        import(FIRESTORE_URL),
      ]);
      return {
        db,
        collection: firestoreMod.collection,
        addDoc: firestoreMod.addDoc,
        serverTimestamp: firestoreMod.serverTimestamp,
      };
    })();
  }
  return firestoreApiPromise;
}

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

/** Wedding moment: June 5, 2026 at 21:00 in the viewer's local timezone */
const WEDDING_DATE = new Date(2026, 5, 5, 21, 0, 0);

/** Canvas API instance set after DOM ready */
let signaturePad = null;

const SELECTORS = {
  loadingScreen: '#loading-screen',
  glitterCanvas: '#glitter-canvas',
  navToggle: '#nav-toggle',
  navBar: '.nav-bar',
  musicToggle: '#music-toggle',
  bgAudio: '#bg-audio',
  countdown: {
    days: '#cd-days',
    hours: '#cd-hours',
    minutes: '#cd-minutes',
    seconds: '#cd-seconds',
  },
  msgForm: '#guest-message-form',
  msgSubmit: '#msg-submit',
  msgStatus: '#msg-status',
  canvas: '#signature-pad',
  canvasClear: '#canvas-clear',
  rsvpForm: '#rsvp-form',
  rsvpSubmit: '#rsvp-submit',
  rsvpStatus: '#rsvp-status',
};

/* -------------------------------------------------------------------------- */
/* i18n                                                                       */
/* -------------------------------------------------------------------------- */

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

function getLocale() {
  const raw =
    document.documentElement.getAttribute('lang') ||
    document.documentElement.lang ||
    '';
  const lower = String(raw).toLowerCase();
  if (lower.startsWith('en')) return 'en';
  return 'ar';
}

/** Stored choice wins; otherwise site default is English */
function resolveInitialLang() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === 'ar') return 'ar';
    if (s === 'en') return 'en';
  } catch (_) {
    /* ignore */
  }
  return DEFAULT_LANG;
}

function formStrings() {
  return TRANSLATIONS[getLocale()].forms;
}

function applyLanguage(lang) {
  const next = isLocale(lang) ? lang : DEFAULT_LANG;
  const root = document.documentElement;
  const dir = next === 'ar' ? 'rtl' : 'ltr';
  root.lang = next;
  root.dir = dir;
  root.setAttribute('lang', next);
  root.setAttribute('dir', dir);

  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch (_) {}

  const t = TRANSLATIONS[next];

  document.title = t.meta.title;
  const metaDesc = document.getElementById('meta-description');
  if (metaDesc) metaDesc.setAttribute('content', t.meta.description);

  const metaCl = document.getElementById('meta-content-language');
  if (metaCl) metaCl.setAttribute('content', next);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const path = el.getAttribute('data-i18n');
    const val = getByPath(t, path);
    if (val !== undefined) el.textContent = val;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const path = el.getAttribute('data-i18n-placeholder');
    const val = getByPath(t, path);
    if (val !== undefined) el.setAttribute('placeholder', val);
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const raw = el.getAttribute('data-i18n-attr');
    if (!raw) return;
    raw.split('|').forEach((segment) => {
      if (!segment.trim()) return;
      const idx = segment.indexOf(':');
      if (idx === -1) return;
      const attr = segment.slice(0, idx).trim();
      const path = segment.slice(idx + 1).trim();
      const val = getByPath(t, path);
      if (attr && val !== undefined) el.setAttribute(attr, val);
    });
  });

  const langSwitch = document.getElementById('lang-switch');
  langSwitch?.classList.toggle('lang-switch--ar', next === 'ar');
  langSwitch?.classList.toggle('lang-switch--en', next === 'en');

  langSwitch?.querySelectorAll('[data-set-lang]').forEach((btn) => {
    const code = btn.getAttribute('data-set-lang');
    btn.setAttribute('aria-pressed', code === next ? 'true' : 'false');
  });

  window.requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

function initLanguageSwitcher() {
  const wrap = document.getElementById('lang-switch');
  if (!wrap) return;

  /** Direct listeners avoid failures when event.target is a text node (no .closest) */
  wrap.querySelectorAll('button[data-set-lang]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const next = btn.getAttribute('data-set-lang');
      if (!isLocale(next)) return;
      if (next === getLocale()) return;

      document.body.classList.add('is-switching-lang');
      applyLanguage(next);
      window.setTimeout(() => document.body.classList.remove('is-switching-lang'), 280);
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function $(sel, root = document) {
  return root.querySelector(sel);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* -------------------------------------------------------------------------- */
/* Loading screen                                                             */
/* -------------------------------------------------------------------------- */

function hideLoadingScreen(screen) {
  screen.classList.add('loading-screen--hide');
  screen.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    screen.style.display = 'none';
  }, 900);
}

function initLoadingScreen() {
  const screen = $(SELECTORS.loadingScreen);
  if (!screen) return;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    requestAnimationFrame(() => hideLoadingScreen(screen));
  };

  window.addEventListener('load', finish);
  setTimeout(() => {
    if (!finished) finish();
  }, 4500);
}

/* -------------------------------------------------------------------------- */
/* Canvas glitter — upward drift, pearls, bling crosses, full document height   */
/* -------------------------------------------------------------------------- */

const GLITTER_HEX = ['#8b1a3a', '#a02848', '#c0405a', '#6b1428'];
const WHITE_SPARKLE = 'rgba(255,255,255,0.9)';
const SOFT_PINK_SPARKLE = 'rgba(255,240,245,0.8)';

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
}

function parseColor(str) {
  if (str.startsWith('rgba')) {
    const m = str.match(/rgba\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
    if (m) {
      return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] };
    }
  }
  return hexToRgb(str);
}

function rgbaFromParsed(c, opacity) {
  const a = (c.a ?? 1) * opacity;
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

function pickGlitterColorStr() {
  const r = Math.random();
  if (r < 0.2) return WHITE_SPARKLE;
  if (r < 0.35) return SOFT_PINK_SPARKLE;
  return GLITTER_HEX[(Math.random() * GLITTER_HEX.length) | 0];
}

function docScrollHeight() {
  const el = document.documentElement;
  return Math.max(el.scrollHeight, document.body.scrollHeight, window.innerHeight);
}

function initGlitterCanvas() {
  const canvas = $(SELECTORS.glitterCanvas);
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const glitterCount = mobile ? 152 : 188;
  const blingCount = 17;
  const pearlCount = 22;

  let particles = [];
  let lastDocH = 0;
  let lastInnerW = 0;
  let framesSinceCheck = 0;
  let lastMs = performance.now();

  function buildParticles() {
    const h = docScrollHeight();
    const w = window.innerWidth;
    lastDocH = h;
    lastInnerW = w;
    particles = [];

    for (let i = 0; i < glitterCount; i++) {
      const colorStr = pickGlitterColorStr();
      const r = 0.5 + Math.random() * 1.5;
      particles.push({
        kind: 'glitter',
        anchorX: Math.random() * w,
        docY: Math.random() * h,
        vy: 0.3 + Math.random() * 0.5,
        hFreq: 0.38 + Math.random() * 0.42,
        hFreq2: 0.22 + Math.random() * 0.28,
        hPhase: Math.random() * Math.PI * 2,
        hPhase2: Math.random() * Math.PI * 2,
        hAmp: 10 + Math.random() * 16,
        r,
        colorStr,
        parsed: parseColor(colorStr),
        shadowBlur: 6 + Math.random() * 9,
        twFreq: 0.09 + Math.random() * 0.14,
        twPhase: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < blingCount; i++) {
      const arm = 2 + Math.random() * 2.5;
      particles.push({
        kind: 'bling',
        anchorX: Math.random() * w,
        docY: Math.random() * h,
        vy: 0.32 + Math.random() * 0.48,
        hFreq: 0.4 + Math.random() * 0.35,
        hFreq2: 0.25 + Math.random() * 0.2,
        hPhase: Math.random() * Math.PI * 2,
        hPhase2: Math.random() * Math.PI * 2,
        hAmp: 12 + Math.random() * 14,
        arm,
        shadowBlur: 15 + Math.random() * 10,
        twFreq: 0.28 + Math.random() * 0.35,
        twPhase: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < pearlCount; i++) {
      particles.push({
        kind: 'pearl',
        anchorX: Math.random() * w,
        docY: Math.random() * h,
        vy: 0.2 + Math.random() * 0.2,
        hFreq: 0.25 + Math.random() * 0.25,
        hFreq2: 0.18 + Math.random() * 0.15,
        hPhase: Math.random() * Math.PI * 2,
        hPhase2: Math.random() * Math.PI * 2,
        hAmp: 8 + Math.random() * 12,
        r: 2 + Math.random() * 2.5,
        pearlBlur: 8 + Math.random() * 4,
        opFreq: 0.055 + Math.random() * 0.06,
        opPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nh = docScrollHeight();
    if (particles.length === 0 || Math.abs(nh - lastDocH) > 48 || vw !== lastInnerW) {
      buildParticles();
    }
    lastInnerW = vw;
  }

  function wrapUpward(p, vw, docH) {
    if (p.docY < -35) {
      p.docY = docH + 40 + Math.random() * 100;
      p.anchorX = Math.random() * vw;
    }
  }

  function docXFor(p, tSec) {
    return (
      p.anchorX +
      Math.sin(tSec * p.hFreq + p.hPhase) * p.hAmp +
      Math.sin(tSec * p.hFreq2 + p.hPhase2) * 0.4
    );
  }

  function drawGlitter(p, sx, sy, opacity, tSec) {
    const c = p.parsed;
    ctx.save();
    ctx.shadowBlur = p.shadowBlur;
    ctx.shadowColor = rgbaFromParsed(c, opacity * 0.92);
    ctx.fillStyle = rgbaFromParsed(c, opacity);
    ctx.beginPath();
    ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
    ctx.fill();

    const isBurgundy =
      p.colorStr.startsWith('#') ||
      (p.colorStr.startsWith('rgba') && p.parsed.r < 250 && p.r >= 1.5);
    if (isBurgundy && p.r >= 1.5) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(sx, sy, p.r * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBling(p, sx, sy, opacity, tSec) {
    const arm = p.arm;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.sin(tSec * 0.15 + p.hPhase) * 0.08);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = p.shadowBlur;
    ctx.shadowColor = '#ffffff';
    ctx.fillRect(-1, -arm, 2, arm * 2);
    ctx.fillRect(-arm, -1, arm * 2, 2);
    ctx.restore();
  }

  function drawPearl(p, sx, sy, opacity) {
    ctx.save();
    ctx.shadowBlur = p.pearlBlur;
    ctx.shadowColor = 'rgba(255,220,230,0.55)';
    const g = ctx.createRadialGradient(sx - p.r * 0.35, sy - p.r * 0.35, 0, sx, sy, p.r);
    g.addColorStop(0, `rgba(255,255,255,${opacity})`);
    g.addColorStop(0.55, `rgba(252,235,238,${opacity * 0.88})`);
    g.addColorStop(1, `rgba(220,180,190,${opacity * 0.42})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFrame(tSec, frameScale) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sy = window.scrollY;
    const docH = docScrollHeight();

    ctx.clearRect(0, 0, vw, vh);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.docY -= p.vy * frameScale;
      wrapUpward(p, vw, docH);
    }

    function paint(kind, drawer) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.kind !== kind) continue;
        const docX = docXFor(p, tSec);
        const screenY = p.docY - sy;
        if (screenY < -85 || screenY > vh + 85) continue;
        drawer(p, docX, screenY, tSec);
      }
    }

    paint('pearl', (p, docX, screenY, ts) => {
      const op = 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(ts * p.opFreq + p.opPhase));
      drawPearl(p, docX, screenY, op);
    });

    paint('glitter', (p, docX, screenY, ts) => {
      const tw = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(ts * p.twFreq + p.twPhase));
      drawGlitter(p, docX, screenY, tw, ts);
    });

    paint('bling', (p, docX, screenY, ts) => {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(ts * p.twFreq + p.twPhase));
      drawBling(p, docX, screenY, tw, ts);
    });
  }

  function drawStatic() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sy = window.scrollY;
    const tSec = 0;
    ctx.clearRect(0, 0, vw, vh);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const docX = docXFor(p, tSec);
      const screenY = p.docY - sy;
      if (screenY < -80 || screenY > vh + 80) continue;
      if (p.kind === 'glitter') {
        drawGlitter(p, docX, screenY, 0.45, tSec);
      } else if (p.kind === 'pearl') {
        drawPearl(p, docX, screenY, 0.68);
      } else {
        drawBling(p, docX, screenY, 0.55, tSec);
      }
    }
  }

  buildParticles();
  resizeCanvas();

  if (reduceMotion) {
    drawStatic();
    window.addEventListener(
      'resize',
      debounce(() => {
        resizeCanvas();
        drawStatic();
      }, 120)
    );
    window.addEventListener('scroll', () => drawStatic(), { passive: true });
    return;
  }

  function loop(tMs) {
    const dt = Math.min(tMs - lastMs, 48);
    lastMs = tMs;
    const frameScale = dt / 16.67;
    const tSec = tMs / 1000;

    framesSinceCheck += 1;
    if (framesSinceCheck >= 72) {
      framesSinceCheck = 0;
      const nh = docScrollHeight();
      if (Math.abs(nh - lastDocH) > 52) {
        buildParticles();
      }
    }

    drawFrame(tSec, frameScale);
    requestAnimationFrame(loop);
  }

  lastMs = performance.now();
  requestAnimationFrame(loop);

  window.addEventListener(
    'resize',
    debounce(() => {
      resizeCanvas();
    }, 100)
  );
}

/* -------------------------------------------------------------------------- */
/* Smooth scroll & nav                                                        */
/* -------------------------------------------------------------------------- */

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeMobileNav();
    });
  });
}

function initMobileNav() {
  const toggle = $(SELECTORS.navToggle);
  const nav = $(SELECTORS.navBar);
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('nav-bar--open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

function closeMobileNav() {
  const nav = $(SELECTORS.navBar);
  const toggle = $(SELECTORS.navToggle);
  if (nav) nav.classList.remove('nav-bar--open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

/* -------------------------------------------------------------------------- */
/* Background music toggle                                                    */
/* -------------------------------------------------------------------------- */

function initMusicToggle() {
  const btn = $(SELECTORS.musicToggle);
  const audio = $(SELECTORS.bgAudio);
  if (!btn || !audio) return;

  btn.addEventListener('click', async () => {
    const src = audio.querySelector('source')?.getAttribute('src');
    if (!src) {
      btn.classList.add('music-toggle--hint');
      setTimeout(() => btn.classList.remove('music-toggle--hint'), 2000);
      return;
    }
    try {
      if (audio.paused) {
        await audio.play();
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.add('music-toggle--on');
      } else {
        audio.pause();
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('music-toggle--on');
      }
    } catch {
      btn.classList.add('music-toggle--hint');
      setTimeout(() => btn.classList.remove('music-toggle--hint'), 2000);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Countdown                                                                  */
/* -------------------------------------------------------------------------- */

function updateCountdown() {
  const els = SELECTORS.countdown;
  const now = Date.now();
  let diff = WEDDING_DATE.getTime() - now;

  if (diff <= 0) {
    $(els.days).textContent = '00';
    $(els.hours).textContent = '00';
    $(els.minutes).textContent = '00';
    $(els.seconds).textContent = '00';
    document.querySelector('.countdown-grid')?.classList.add('countdown-grid--done');
    return;
  }

  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  $(els.days).textContent = pad2(days);
  $(els.hours).textContent = pad2(hours);
  $(els.minutes).textContent = pad2(minutes);
  $(els.seconds).textContent = pad2(seconds);

  [els.days, els.hours, els.minutes, els.seconds].forEach((sel) => {
    $(sel)?.classList.add('count-tick');
    requestAnimationFrame(() => $(sel)?.classList.remove('count-tick'));
  });
}

function initCountdown() {
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

/* -------------------------------------------------------------------------- */
/* Canvas signature                                                           */
/* -------------------------------------------------------------------------- */

function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasInk = false;
  let rect = canvas.getBoundingClientRect();

  const scale = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(245, 232, 224, 0.92)';
    ctx.lineWidth = 2.2;
    rect = canvas.getBoundingClientRect();
    hasInk = false;
  };

  scale();
  window.addEventListener('resize', debounce(scale, 200));

  function pos(ev) {
    const t = ev.touches ? ev.touches[0] : ev;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function start(ev) {
    ev.preventDefault();
    drawing = true;
    rect = canvas.getBoundingClientRect();
    const { x, y } = pos(ev);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(ev) {
    if (!drawing) return;
    ev.preventDefault();
    const { x, y } = pos(ev);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk = true;
  }

  function end() {
    drawing = false;
  }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);

  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  function clearPad() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk = false;
  }

  $(SELECTORS.canvasClear)?.addEventListener('click', clearPad);

  return {
    getDrawingPayload: () => (hasInk ? canvas.toDataURL('image/png') : ''),
    clear: clearPad,
  };
}

/* -------------------------------------------------------------------------- */
/* Forms — Firestore                                                          */
/* -------------------------------------------------------------------------- */

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('submit-btn--loading', loading);
}

async function submitGuestMessage(ev) {
  ev.preventDefault();
  const form = ev.target;
  const status = $(SELECTORS.msgStatus);
  const submit = $(SELECTORS.msgSubmit);
  const nameInput = $('#msg-name');
  const textInput = $('#msg-text');
  const strings = formStrings();

  const text = (textInput?.value || '').trim();
  if (!text) {
    if (status) {
      status.textContent = strings.msgEmpty;
      status.classList.add('form-status--error');
    }
    textInput?.focus();
    return;
  }

  const guestName = (nameInput?.value || '').trim() || strings.defaultGuestName;
  const drawingData =
    signaturePad && typeof signaturePad.getDrawingPayload === 'function'
      ? signaturePad.getDrawingPayload()
      : '';

  setButtonLoading(submit, true);
  if (status) {
    status.textContent = '';
    status.classList.remove('form-status--error', 'form-status--ok');
  }

  try {
    const { db, collection, addDoc, serverTimestamp } = await loadFirestoreApi();
    await addDoc(collection(db, 'messages'), {
      guestName,
      text,
      drawing: drawingData || '',
      createdAt: serverTimestamp(),
    });

    if (status) {
      status.textContent = strings.msgSuccess;
      status.classList.add('form-status--ok');
    }
    form.reset();
    signaturePad?.clear?.();
  } catch (err) {
    console.error(err);
    if (status) {
      status.textContent = strings.msgError;
      status.classList.add('form-status--error');
    }
  } finally {
    setButtonLoading(submit, false);
  }
}

function validateRsvp(form, strings) {
  const name = ($('#rsvp-name')?.value || '').trim();
  const attend = form.querySelector('input[name="attend"]:checked')?.value;
  const guestCount = Number($('#rsvp-count')?.value);

  if (!name) return strings.rsvpName;
  if (!attend) return strings.rsvpAttend;
  if (!Number.isFinite(guestCount) || guestCount < 1 || guestCount > 20) {
    return strings.rsvpCount;
  }
  return null;
}

async function submitRsvp(ev) {
  ev.preventDefault();
  const form = ev.target;
  const status = $(SELECTORS.rsvpStatus);
  const submit = $(SELECTORS.rsvpSubmit);
  const strings = formStrings();

  const err = validateRsvp(form, strings);
  if (err) {
    if (status) {
      status.textContent = err;
      status.classList.add('form-status--error');
      status.classList.remove('form-status--ok');
    }
    return;
  }

  const name = ($('#rsvp-name').value || '').trim();
  const attend = form.querySelector('input[name="attend"]:checked').value;
  const guestCount = Number($('#rsvp-count').value);
  const note = ($('#rsvp-note')?.value || '').trim();

  setButtonLoading(submit, true);
  if (status) {
    status.textContent = '';
    status.classList.remove('form-status--error', 'form-status--ok');
  }

  try {
    const { db, collection, addDoc, serverTimestamp } = await loadFirestoreApi();
    await addDoc(collection(db, 'rsvps'), {
      name,
      attend,
      guestCount,
      note,
      createdAt: serverTimestamp(),
    });

    if (status) {
      status.textContent = strings.rsvpSuccess;
      status.classList.add('form-status--ok');
    }
    form.reset();
  } catch (e) {
    console.error(e);
    if (status) {
      status.textContent = strings.rsvpError;
      status.classList.add('form-status--error');
    }
  } finally {
    setButtonLoading(submit, false);
  }
}

/* -------------------------------------------------------------------------- */
/* Scroll reveals                                                             */
/* -------------------------------------------------------------------------- */

function initRevealOnScroll() {
  const sections = document.querySelectorAll('.section-reveal');
  if (!sections.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-reveal--visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
  );

  sections.forEach((s) => io.observe(s));
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

function boot() {
  applyLanguage(resolveInitialLang());
  initLanguageSwitcher();

  initLoadingScreen();
  initGlitterCanvas();
  initSmoothScroll();
  initMobileNav();
  initMusicToggle();
  initCountdown();
  initRevealOnScroll();

  const canvasEl = $(SELECTORS.canvas);
  if (canvasEl) {
    signaturePad = setupCanvas(canvasEl);
  }

  $(SELECTORS.msgForm)?.addEventListener('submit', submitGuestMessage);
  $(SELECTORS.rsvpForm)?.addEventListener('submit', submitRsvp);
}

boot();
