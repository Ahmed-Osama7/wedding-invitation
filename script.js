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
  particles: '#particles',
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
/* Floating particles                                                         */
/* -------------------------------------------------------------------------- */

function createParticles() {
  const host = $(SELECTORS.particles);
  if (!host) return;

  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const mistCount = mobile ? 14 : 22;
  const sparkleCount = mobile ? 10 : 16;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < mistCount; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const size = 3 + Math.random() * 3.8;
    const left = Math.random() * 100;
    const duration = 18 + Math.random() * 26;
    const delay = Math.random() * -30;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${left}%`;
    p.style.animationDuration = `${duration}s`;
    p.style.animationDelay = `${delay}s`;
    frag.appendChild(p);
  }

  for (let i = 0; i < sparkleCount; i++) {
    const p = document.createElement('span');
    p.className = 'particle particle--sparkle';
    const size = 2 + Math.random() * 3.2;
    const left = Math.random() * 100;
    const duration = 32 + Math.random() * 36;
    const delay = Math.random() * -40;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${left}%`;
    p.style.animationDuration = `${duration}s`;
    p.style.animationDelay = `${delay}s`;
    frag.appendChild(p);
  }

  host.appendChild(frag);
}

/** Subtle background dots — 1–2px, slow drift + gentle opacity (styled in CSS) */
function createStars() {
  const host = $(SELECTORS.particles);
  if (!host) return;

  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const count = mobile ? 28 : 44;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'star-particle' + (i % 4 === 0 ? ' star-particle--champagne' : '');
    s.setAttribute('aria-hidden', 'true');
    const px = 1 + Math.floor(Math.random() * 3);
    s.style.width = `${px}px`;
    s.style.height = `${px}px`;
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    const twDur = 10 + Math.random() * 16;
    const driftDur = 120 + Math.random() * 80;
    s.style.setProperty('--star-twinkle-dur', `${twDur.toFixed(2)}s`);
    s.style.setProperty('--star-drift-dur', `${driftDur.toFixed(0)}s`);
    s.style.animationDelay = `${(Math.random() * -12).toFixed(2)}s, ${(Math.random() * -10).toFixed(2)}s`;
    frag.appendChild(s);
  }

  host.appendChild(frag);
}

/** Sparse sparkle bursts — CSS-driven scale/opacity */
function createSparkles() {
  const host = $(SELECTORS.particles);
  if (!host) return;

  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const count = mobile ? 12 : 20;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'sparkle-dot';
    el.setAttribute('aria-hidden', 'true');
    const size = 3 + Math.random() * 5;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${Math.random() * 100}%`;
    el.style.top = `${Math.random() * 100}%`;
    el.style.setProperty('--sparkle-dur', `${4.8 + Math.random() * 6}s`);
    el.style.animationDelay = `${(Math.random() * -14).toFixed(2)}s`;
    frag.appendChild(el);
  }

  host.appendChild(frag);
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
  createParticles();
  createStars();
  createSparkles();
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
