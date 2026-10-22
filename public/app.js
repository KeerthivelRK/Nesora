const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api = async (url, opts) => {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed.'), { data });
  return data;
};

// ---- Theme (remembered between visits) ----
const root = document.documentElement;
const setTheme = t => { root.dataset.theme = t; $('#theme').textContent = t === 'dark' ? 'Light mode' : 'Dark mode'; try { localStorage.setItem('theme', t); } catch {} };
let saved; try { saved = localStorage.getItem('theme'); } catch {}
setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#theme').onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');

// ---- Profile ----
api('/api/profile').then(p => {
  document.title = `${p.name} — Websites & apps for local businesses`;
  $('#name').textContent = p.name; $('#role').textContent = p.role; $('#intro').textContent = p.intro;
  $('#brandName').textContent = p.name; $('#foot').textContent = p.name;
  $('#aboutText').textContent = p.about;
  buildSlider(p.services);
  $('#skills').innerHTML = p.skills.map(s => `<div class="logo"><svg viewBox="0 0 100 100" aria-hidden="true">${TECH[s] || ''}</svg><span>${esc(s)}</span></div>`).join('');
}).catch(() => { $('#name').textContent = 'Portfolio'; });
$('#year').textContent = new Date().getFullYear();

// ---- Projects: filter + search, all served by the API ----
let tag = 'all', timer, allTags = null;
const grid = $('#grid');

async function loadProjects() {
  grid.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  try {
    const params = new URLSearchParams({ tag, q: $('#search').value.trim() });
    const list = await api('/api/projects?' + params);
    if (!allTags) { // build filter chips once, from the full list
      const full = await api('/api/projects');
      allTags = ['all', ...new Set(full.flatMap(p => p.tags))];
      renderChips();
    }
    $('#count').textContent = `(${list.length})`;
    grid.innerHTML = list.length ? list.map(p => `
      <button class="card" data-id="${esc(p.id)}">
        <div class="thumb">${mock(p.mock)}<span class="tagglass">${p.tags.map(esc).join(' · ')}</span></div>
        <div class="cbody"><span class="meta">${esc(p.year)}</span><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></div>
      </button>`).join('') : '<p class="empty">No projects match. Clear the search or pick another category.</p>';
  } catch (e) {
    grid.innerHTML = `<p class="empty">Couldn't load projects. ${esc(e.message)} <button class="ghost" id="retry">Retry</button></p>`;
    $('#retry').onclick = loadProjects;
  }
}
function renderChips() {
  $('#filters').innerHTML = allTags.map(t => `<button class="chip" aria-pressed="${t === tag}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
}
$('#filters').onclick = e => {
  const b = e.target.closest('.chip'); if (!b) return;
  tag = b.dataset.tag; renderChips(); loadProjects();
};
$('#search').oninput = () => { clearTimeout(timer); timer = setTimeout(loadProjects, 250); };

// ---- Project detail dialog ----
grid.onclick = async e => {
  const c = e.target.closest('.card'); if (!c) return;
  try {
    const p = await api('/api/projects/' + encodeURIComponent(c.dataset.id));
    $('#modalBody').innerHTML = `<div class="thumb big">${mock(p.mock)}</div><h3>${esc(p.title)}</h3><p class="meta">${esc(p.year)} · ${p.stack.map(esc).join(', ')}</p><p>${esc(p.description)}</p>`;
    $('#modal').showModal();
  } catch (err) { alert(err.message); }
};
$('#close').onclick = () => $('#modal').close();
$('#modal').onclick = e => { if (e.target.id === 'modal') e.target.close(); };

// ---- Contact form ----
const form = $('#form'), status = $('#status');
const showErrors = errs => form.querySelectorAll('input[name],textarea').forEach(f => {
  const msg = errs[f.name]; f.setAttribute('aria-invalid', !!msg);
  const s = form.querySelector(`[data-for="${f.name}"]`); if (s) s.textContent = msg || '';
});
form.onsubmit = async e => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(form));
  const errs = {};
  if (body.name.trim().length < 2) errs.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errs.email = 'Enter a valid email address.';
  if (body.message.trim().length < 10) errs.message = 'Write at least 10 characters.';
  showErrors(errs);
  if (Object.keys(errs).length) { status.className = 'err'; status.textContent = 'Check the highlighted fields.'; return; }
  $('#send').disabled = true; status.className = ''; status.textContent = 'Sending…';
  try {
    await api('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    form.reset(); status.className = 'ok'; status.textContent = 'Message sent. We reply within two working days.';
  } catch (err) {
    showErrors(err.data?.errors || {}); status.className = 'err'; status.textContent = err.message;
  } finally { $('#send').disabled = false; }
};

loadProjects();

// ---- Illustrations (inline SVG, themed with CSS variables) ----
const ICONS = {
web:'<rect class="s sf" x="25" y="40" width="150" height="120" rx="10"/><path class="s" d="M25 66h150M112 82h46"/><circle class="a" cx="42" cy="53" r="4"/><circle class="a" cx="56" cy="53" r="4"/><rect class="a" x="42" y="82" width="60" height="10" rx="3"/><rect class="s" x="42" y="104" width="116" height="40" rx="5"/>',
menu:'<rect class="s sf" x="50" y="25" width="100" height="150" rx="8"/><path class="s" d="M70 60h35M70 85h35M70 110h35M70 135h35"/><path class="s af" d="M122 60h12M122 85h12M122 110h12M122 135h12"/><circle class="a" cx="100" cy="42" r="5"/>',
booking:'<rect class="s sf" x="30" y="45" width="140" height="125" rx="10"/><path class="s" d="M30 80h140M65 30v26M135 30v26"/><rect class="a" x="48" y="95" width="22" height="18" rx="3"/><rect class="s" x="89" y="95" width="22" height="18" rx="3"/><rect class="s" x="130" y="95" width="22" height="18" rx="3"/><rect class="s" x="48" y="127" width="22" height="18" rx="3"/><path class="s af" d="M92 138l8 8 16-18"/>',
order:'<path class="s sf" d="M55 70h90l10 100H45z"/><path class="s" d="M75 85V60a25 25 0 0150 0v25"/><circle class="a" cx="100" cy="125" r="16"/><path class="tick" d="M92 125l6 6 11-12"/>',
dash:'<rect class="s sf" x="25" y="35" width="150" height="130" rx="10"/><path class="s" d="M25 62h150M65 62v103M38 80h14M38 98h14M38 116h14"/><rect class="a" x="80" y="115" width="14" height="35"/><rect class="a" x="102" y="95" width="14" height="55"/><rect class="a" x="124" y="108" width="14" height="42"/><rect class="a" x="146" y="82" width="14" height="68"/>',
mobile:'<rect class="s sf" x="62" y="20" width="76" height="160" rx="14"/><path class="s" d="M90 34h20"/><rect class="a" x="76" y="55" width="20" height="20" rx="5"/><rect class="s" x="104" y="55" width="20" height="20" rx="5"/><rect class="s" x="76" y="85" width="20" height="20" rx="5"/><rect class="a" x="104" y="85" width="20" height="20" rx="5"/><rect class="s" x="76" y="120" width="48" height="36" rx="6"/>',
deploy:'<circle class="s sf" cx="100" cy="90" r="58"/><ellipse class="s" cx="100" cy="90" rx="24" ry="58"/><path class="s" d="M42 90h116M52 63h96M52 117h96"/><rect class="a" x="48" y="158" width="104" height="26" rx="13"/><path class="tick" d="M64 171h10M82 171h40"/>',
support:'<path class="s sf" d="M30 30h110a10 10 0 0110 10v55a10 10 0 01-10 10H80l-25 22v-22H30a10 10 0 01-10-10V40a10 10 0 0110-10z"/><path class="s" d="M42 55h86M42 75h56"/><circle class="a" cx="148" cy="140" r="30"/><path class="tick" d="M135 140l9 9 17-19"/>'
};
const ORBIT = c => `<g fill="none" stroke="${c}" stroke-width="3"><ellipse cx="50" cy="50" rx="42" ry="16"/><ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(60 50 50)"/><ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(120 50 50)"/></g><circle cx="50" cy="50" r="6" fill="${c}"/>`;
const TECH = {
  'React': ORBIT('#61dafb'),
  'JavaScript': '<rect x="8" y="8" width="84" height="84" rx="8" fill="#f7df1e"/><text x="86" y="84" text-anchor="end" font-family="Arial,sans-serif" font-weight="800" font-size="36" fill="#222">JS</text>',
  'Supabase': '<path d="M56 6 14 56h30l-4 38 46-52H56z" fill="#3ecf8e"/>',
  'PostgreSQL': '<path d="M18 24v52c0 7 14 12 32 12s32-5 32-12V24z" fill="#336791"/><path d="M18 42c0 7 14 12 32 12s32-5 32-12M18 60c0 7 14 12 32 12s32-5 32-12" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/><ellipse cx="50" cy="24" rx="32" ry="12" fill="#5b8fc2"/>',
  'React Native': '<rect x="28" y="4" width="44" height="92" rx="9" fill="none" stroke="#61dafb" stroke-width="4"/><g transform="translate(50 50) scale(.36) translate(-50 -50)">' + ORBIT('#61dafb') + '</g>',
  'AI-assisted development': '<path d="M44 10l9 33 33 9-33 9-9 33-9-33-33-9 33-9z" fill="var(--accent)"/><path d="M82 8l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="var(--accent)" opacity=".6"/>'
};

// ---- "What we do" slider ----
function buildSlider(list) {
  const track = $('#track'), dots = $('#dots'), slider = $('#slider');
  let idx = 0, timer = null;
  track.innerHTML = list.map((s, i) => `
    <article class="slide" aria-label="${i + 1} of ${list.length}">
      <div class="art"><svg viewBox="0 0 200 200" aria-hidden="true">${ICONS[s.icon] || ''}</svg></div>
      <div class="copy"><span class="num">${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}</span>
      <h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>
    </article>`).join('');
  dots.innerHTML = list.map((s, i) => `<button class="dot" aria-label="Go to ${esc(s.title)}" data-i="${i}"></button>`).join('');
  const go = n => {
    idx = (n + list.length) % list.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    track.querySelectorAll('.slide').forEach((el, i) => el.setAttribute('aria-hidden', i !== idx));
    dots.querySelectorAll('.dot').forEach((d, i) => d.setAttribute('aria-current', i === idx));
  };
  const play = () => { stop(); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(idx + 1), 5000); };
  const stop = () => { clearInterval(timer); timer = null; };
  $('#prev').onclick = () => { go(idx - 1); play(); };
  $('#next').onclick = () => { go(idx + 1); play(); };
  dots.onclick = e => { const d = e.target.closest('.dot'); if (d) { go(+d.dataset.i); play(); } };
  slider.onkeydown = e => { if (e.key === 'ArrowLeft') go(idx - 1); if (e.key === 'ArrowRight') go(idx + 1); };
  slider.onmouseenter = stop; slider.onmouseleave = play;
  slider.onfocusin = stop; slider.onfocusout = play;
  let x0 = null;
  slider.ontouchstart = e => { x0 = e.touches[0].clientX; stop(); };
  slider.ontouchend = e => { if (x0 !== null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1)); } x0 = null; play(); };
  go(0); play();
}

// ---- Website mockup pictures (used in hero background and project cards) ----
const MOCKS = {
  cafe:{a:'#f59e0b',b:'#7c2d12',name:'Brew & Co.',sub:'Order online · Open today'},
  gym:{a:'#22c55e',b:'#052e16',name:'FitZone Gym',sub:'Book a class · Join now'},
  market:{a:'#ef4444',b:'#450a0a',name:'Fresh Mart',sub:'Weekly offers · Fresh daily'},
  salon:{a:'#ec4899',b:'#500724',name:'Glow Salon',sub:'Book your appointment'},
  restaurant:{a:'#3b82f6',b:'#172554',name:'Spice Table',sub:'Menu · Order for pickup'}
};
function mock(k) {
  const m = MOCKS[k] || MOCKS.cafe;
  return `<svg viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="g-${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m.a}"/><stop offset="1" stop-color="${m.b}"/></linearGradient></defs>
<rect width="320" height="220" fill="#fff"/><rect width="320" height="26" fill="#e5e7eb"/>
<circle cx="14" cy="13" r="4" fill="#f87171"/><circle cx="28" cy="13" r="4" fill="#fbbf24"/><circle cx="42" cy="13" r="4" fill="#34d399"/><rect x="70" y="7" width="150" height="12" rx="6" fill="#fff"/>
<rect y="26" width="320" height="108" fill="url(#g-${k})"/>
<circle cx="262" cy="80" r="40" fill="#fff" opacity=".16"/><circle cx="282" cy="62" r="22" fill="#fff" opacity=".22"/>
<text x="24" y="66" font-family="Arial,sans-serif" font-weight="700" font-size="19" fill="#fff">${m.name}</text>
<text x="24" y="86" font-family="Arial,sans-serif" font-size="10" fill="#fff" opacity=".85">${m.sub}</text>
<rect x="24" y="100" width="70" height="20" rx="10" fill="#fff"/><rect x="34" y="108" width="50" height="4" rx="2" fill="${m.b}"/>
<rect x="20" y="146" width="88" height="62" rx="8" fill="#f3f4f6"/><rect x="116" y="146" width="88" height="62" rx="8" fill="#f3f4f6"/><rect x="212" y="146" width="88" height="62" rx="8" fill="#f3f4f6"/>
<rect x="30" y="156" width="40" height="8" rx="3" fill="${m.a}"/><rect x="30" y="172" width="64" height="5" rx="2" fill="#d1d5db"/><rect x="30" y="184" width="48" height="5" rx="2" fill="#d1d5db"/>
<rect x="126" y="156" width="40" height="8" rx="3" fill="${m.a}"/><rect x="126" y="172" width="64" height="5" rx="2" fill="#d1d5db"/><rect x="126" y="184" width="48" height="5" rx="2" fill="#d1d5db"/>
<rect x="222" y="156" width="40" height="8" rx="3" fill="${m.a}"/><rect x="222" y="172" width="64" height="5" rx="2" fill="#d1d5db"/><rect x="222" y="184" width="48" height="5" rx="2" fill="#d1d5db"/></svg>`;
}
// Hero background: columns of drifting website screenshots
(() => {
  const kinds = Object.keys(MOCKS);
  $('#heroArt').innerHTML = [0, 1, 2, 3].map(c =>
    `<div class="col">${[0, 1, 2, 3].map(r => `<div class="shot">${mock(kinds[(c * 2 + r) % kinds.length])}</div>`).join('')}</div>`).join('');
})();

// ---- Fade-up on scroll ----
(() => {
  const els = document.querySelectorAll('#about,#work,#contact');
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  els.forEach(el => { el.classList.add('reveal'); io.observe(el); });
})();
