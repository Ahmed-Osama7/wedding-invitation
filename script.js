/**
 * Wedding invitation SPA — countdown, canvas signature, Firestore, UX polish.
 */
import { db } from './firebase.js';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

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
  wallLoading: '#guest-messages-loading',
  wallEmpty: '#guest-messages-empty',
  wallList: '#guest-messages-list',
};

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function $(sel, root = document) {
  return root.querySelector(sel);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Debounce — resize handlers */
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
  /** Fallback if `load` is delayed (slow CDN, blocked asset) */
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

  const count = window.matchMedia('(max-width: 768px)').matches ? 28 : 48;
  const frag = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const size = 2 + Math.random() * 4;
    const left = Math.random() * 100;
    const duration = 14 + Math.random() * 22;
    const delay = Math.random() * -25;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${left}%`;
    p.style.animationDuration = `${duration}s`;
    p.style.animationDelay = `${delay}s`;
    p.style.opacity = String(0.15 + Math.random() * 0.45);
    frag.appendChild(p);
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
  const canvas = $(SELECTORS.canvas);

  const text = (textInput?.value || '').trim();
  if (!text) {
    if (status) {
      status.textContent = 'يرجى كتابة رسالة قبل الإرسال.';
      status.classList.add('form-status--error');
    }
    textInput?.focus();
    return;
  }

  const guestName = (nameInput?.value || '').trim() || 'ضيف كريم';
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
    await addDoc(collection(db, 'messages'), {
      guestName,
      text,
      drawing: drawingData || '',
      createdAt: serverTimestamp(),
    });

    if (status) {
      status.textContent = 'شكراً — وصلت رسالتكم بلطف، وتُحفظ مع ذكرياتنا.';
      status.classList.add('form-status--ok');
    }
    form.reset();
    signaturePad?.clear?.();
  } catch (err) {
    console.error(err);
    if (status) {
      status.textContent = 'تعذر الإرسال مؤقتاً. حاولوا لاحقاً أو تحققوا من الاتصال.';
      status.classList.add('form-status--error');
    }
  } finally {
    setButtonLoading(submit, false);
  }
}

function validateRsvp(form) {
  const name = ($('#rsvp-name')?.value || '').trim();
  const attend = form.querySelector('input[name="attend"]:checked')?.value;
  const guestCount = Number($('#rsvp-count')?.value);

  if (!name) return 'يرجى إدخال الاسم.';
  if (!attend) return 'يرجى اختيار الحضور (نعم أو لا).';
  if (!Number.isFinite(guestCount) || guestCount < 1 || guestCount > 20) {
    return 'عدد الضيوف يجب أن يكون بين ١ و ٢٠.';
  }
  return null;
}

async function submitRsvp(ev) {
  ev.preventDefault();
  const form = ev.target;
  const status = $(SELECTORS.rsvpStatus);
  const submit = $(SELECTORS.rsvpSubmit);

  const err = validateRsvp(form);
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
    await addDoc(collection(db, 'rsvps'), {
      name,
      attend,
      guestCount,
      note,
      createdAt: serverTimestamp(),
    });

    if (status) {
      status.textContent = 'تم استلام تأكيدكم — ننتظركم بشوق أو نشكر لطفكم.';
      status.classList.add('form-status--ok');
    }
    form.reset();
  } catch (e) {
    console.error(e);
    if (status) {
      status.textContent = 'تعذر حفظ التأكيد. حاولوا لاحقاً.';
      status.classList.add('form-status--error');
    }
  } finally {
    setButtonLoading(submit, false);
  }
}

/* -------------------------------------------------------------------------- */
/* Guest messages wall                                                        */
/* -------------------------------------------------------------------------- */

function formatDate(ts) {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

/** Allow only PNG data URLs from our canvas for safe <img src> */
function isSafePngDataUrl(s) {
  return (
    typeof s === 'string' &&
    s.startsWith('data:image/png;base64,') &&
    s.length > 30 &&
    s.length < 950000
  );
}

function renderMessageCard(doc) {
  const data = doc.data();
  const li = document.createElement('li');
  li.className = 'message-card glass-card';
  li.dataset.id = doc.id;

  const name = escapeHtml(data.guestName || 'ضيف');
  const text = escapeHtml(data.text || '').replace(/\n/g, '<br />');
  const dateStr = formatDate(data.createdAt);

  const sigHtml =
    isSafePngDataUrl(data.drawing) ? `<div class="message-card__sig"><img src="${data.drawing}" alt="" loading="lazy" decoding="async" /></div>` : '';

  li.innerHTML = `
    <div class="message-card__head">
      <span class="message-card__name">${name}</span>
      <time class="message-card__date" datetime="">${escapeHtml(dateStr)}</time>
    </div>
    <p class="message-card__text">${text}</p>
    ${sigHtml}
  `;
  return li;
}

function initGuestWall() {
  const list = $(SELECTORS.wallList);
  const loadingEl = $(SELECTORS.wallLoading);
  const emptyEl = $(SELECTORS.wallEmpty);
  if (!list) return;

  const qRef = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(24));

  const unsub = onSnapshot(
    qRef,
    (snap) => {
      if (loadingEl) loadingEl.classList.add('hidden');
      list.innerHTML = '';

      if (snap.empty) {
        emptyEl?.classList.remove('hidden');
        return;
      }
      emptyEl?.classList.add('hidden');

      snap.forEach((docSnap) => {
        list.appendChild(renderMessageCard(docSnap));
      });
    },
    (err) => {
      console.error(err);
      if (loadingEl) {
        loadingEl.textContent = 'تعذر تحميل الرسائل. تحققوا من القواعد أو الشبكة.';
        loadingEl.classList.remove('hidden');
      }
    }
  );

  window.addEventListener('beforeunload', () => unsub());
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
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  sections.forEach((s) => io.observe(s));
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

function boot() {
  initLoadingScreen();
  createParticles();
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

  initGuestWall();
}

boot();
