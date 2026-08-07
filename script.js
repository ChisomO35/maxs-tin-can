// ─────────────────────────────────────────────────────────
// GOOGLE CALENDAR EMBED (optional)
// Set this to your public Google Calendar embed URL to replace
// the built-in calendar. Leave empty ("") to use the built-in.
// Example: "https://calendar.google.com/calendar/embed?src=YOUR_ID&ctz=America%2FNew_York"
// ─────────────────────────────────────────────────────────
const GOOGLE_CALENDAR_EMBED = "";

// ─────────────────────────────────────────────────────────
// EVENTS for built-in calendar (FALLBACK ONLY)
// Live events are loaded from /api/content (managed in /admin).
// These are only used if the API can't be reached.
// Format: { date: "YYYY-MM-DD", title: "Event Name", desc: "Details" }
// ─────────────────────────────────────────────────────────
let EVENTS = [
  // Trivia Tuesdays
  { date:"2026-04-14", title:"Trivia Tuesday", desc:"Weekly bar trivia. Teams of up to 6. Come early for a good spot!" },
  { date:"2026-04-21", title:"Trivia Tuesday", desc:"Weekly bar trivia. Teams of up to 6. Come early for a good spot!" },
  { date:"2026-04-28", title:"Trivia Tuesday", desc:"Weekly bar trivia. Teams of up to 6. Come early for a good spot!" },
  { date:"2026-05-05", title:"Trivia Tuesday", desc:"Weekly bar trivia. Teams of up to 6. Come early for a good spot!" },
  { date:"2026-05-12", title:"Trivia Tuesday", desc:"Weekly bar trivia. Teams of up to 6. Come early for a good spot!" },
  // One-off events
  { date:"2026-04-18", title:"UNC Game Watch", desc:"Tar Heels on the big screen. Come early for a good seat." },
  { date:"2026-04-25", title:"Special Drink Night", desc:"Ask your bartender, tonight's special is worth it." },
];

// ─────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────
function openLink(url){
  try{window.open(url,'_blank','noopener,noreferrer')}catch(e){window.location.href=url}
}

// ─────────────────────────────────────────────────────────
// NAV - mobile toggle + active section highlighting
// ─────────────────────────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
navToggle?.addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(l =>
  l.addEventListener('click', () => navLinks.classList.remove('open'))
);
const sections   = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 130) cur = s.id; });
  navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
});

// ─────────────────────────────────────────────────────────
// LIVE CONTENT - load admin-managed text, images and events
// from /api/content, then start the calendar. Everything the
// owner edits in /admin appears here. If the API is offline we
// just fall back to the content already in the HTML.
// ─────────────────────────────────────────────────────────
function applyLiveContent(content) {
  if (!content || typeof content !== 'object') return;
  // Text overrides → elements tagged with data-c="key"
  if (content.texts) {
    document.querySelectorAll('[data-c]').forEach(el => {
      const key = el.getAttribute('data-c');
      if (Object.prototype.hasOwnProperty.call(content.texts, key)) {
        el.innerHTML = content.texts[key];
      }
    });
  }
  // Image overrides → elements tagged with data-cimg="key"
  if (content.images) {
    document.querySelectorAll('[data-cimg]').forEach(el => {
      const key = el.getAttribute('data-cimg');
      if (content.images[key]) el.src = content.images[key];
    });
  }
  // Framing overrides → which part of a cropped photo stays visible.
  // { x, y } is the focal point in percent, zoom scales the photo up.
  if (content.crops) {
    document.querySelectorAll('[data-cimg]').forEach(el => {
      const c = content.crops[el.getAttribute('data-cimg')];
      if (!c) return;
      const pos = (c.x != null ? c.x : 50) + '% ' + (c.y != null ? c.y : 50) + '%';
      // Gallery photos animate transform on hover; suppress that transition
      // for this one frame so the saved framing appears instantly, not as a
      // zoom animation when the page loads.
      el.style.transition = 'none';
      el.style.objectPosition = pos;
      el.style.setProperty('--crop-origin', pos);
      el.style.setProperty('--crop-zoom', String(c.zoom || 1));
      requestAnimationFrame(() => { el.style.transition = ''; });
    });
  }
  // Events → replace the calendar source if provided
  if (Array.isArray(content.events)) EVENTS = content.events;
}

function startCalendar() {
  const calStage = document.getElementById('calendarStage');
  if (GOOGLE_CALENDAR_EMBED && GOOGLE_CALENDAR_EMBED.trim()) {
    // Remove built-in widget and inject Google Calendar iframe
    document.getElementById('builtinCal').remove();
    calStage.innerHTML = '<iframe src="' + GOOGLE_CALENDAR_EMBED + '" loading="lazy" title="Max\'s Tin Can Calendar" style="width:100%;height:100%;min-height:490px;border:0;display:block"></iframe>';
  } else {
    // Initialize the built-in interactive calendar
    initBuiltinCalendar();
  }
}

fetch('/api/content', { cache: 'no-store' })
  .then(r => r.ok ? r.json() : null)
  .then(content => { applyLiveContent(content); })
  .catch(() => { /* offline / not deployed yet - use HTML defaults */ })
  .finally(() => { startCalendar(); });

function initBuiltinCalendar() {
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const today = new Date();
  let viewY = today.getFullYear(), viewM = today.getMonth();

  function eventsForDate(y,m,d) {
    const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return EVENTS.filter(e => e.date === key);
  }

  function renderCal() {
    document.getElementById('calMonthTitle').textContent = MONTHS[viewM] + ' ' + viewY;
    const grid = document.getElementById('calDays');
    const eList = document.getElementById('calEventsList');
    grid.innerHTML = ''; eList.innerHTML = '';
    const firstDay = new Date(viewY, viewM, 1).getDay();
    const daysInM  = new Date(viewY, viewM+1, 0).getDate();
    const daysInPM = new Date(viewY, viewM, 0).getDate();
    for (let i=0; i<firstDay; i++) {
      const d=document.createElement('div'); d.className='cal-day other-month';
      d.textContent=daysInPM-firstDay+1+i; grid.appendChild(d);
    }
    for (let d=1; d<=daysInM; d++) {
      const el=document.createElement('div'); el.className='cal-day';
      el.textContent=d;
      const evs=eventsForDate(viewY,viewM,d);
      if(evs.length) el.classList.add('has-event');
      if(viewY===today.getFullYear()&&viewM===today.getMonth()&&d===today.getDate()) el.classList.add('today');
      if(evs.length) el.addEventListener('click',()=>showDayEvents(d,evs));
      grid.appendChild(el);
    }
    const trail=(firstDay+daysInM)%7===0?0:7-((firstDay+daysInM)%7);
    for(let i=1;i<=trail;i++){
      const d=document.createElement('div'); d.className='cal-day other-month'; d.textContent=i; grid.appendChild(d);
    }
    // Show this month's events in the side list
    const mEvs = EVENTS.filter(e=>{const[y,m]=e.date.split('-').map(Number);return y===viewY&&m-1===viewM;});
    if(!mEvs.length){
      eList.innerHTML='<p style="color:var(--muted);font-size:.85rem;padding:.5rem 0">No events this month yet.</p>';
    }else{
      mEvs.forEach(ev=>{
        const d=parseInt(ev.date.split('-')[2]);
        const el=document.createElement('div'); el.className='cal-event-item';
        el.innerHTML=`<div class="ev-date">${MONTHS[viewM]} ${d}</div><div class="ev-title">${ev.title}</div><div class="ev-desc">${ev.desc}</div>`;
        eList.appendChild(el);
      });
    }
  }

  function showDayEvents(day,evs){
    const eList=document.getElementById('calEventsList'); eList.innerHTML='';
    evs.forEach(ev=>{
      const el=document.createElement('div'); el.className='cal-event-item';
      el.innerHTML=`<div class="ev-date">${MONTHS[viewM]} ${day}</div><div class="ev-title">${ev.title}</div><div class="ev-desc">${ev.desc}</div>`;
      eList.appendChild(el);
    });
  }

  document.getElementById('calPrev').addEventListener('click',()=>{viewM--;if(viewM<0){viewM=11;viewY--;}renderCal();});
  document.getElementById('calNext').addEventListener('click',()=>{viewM++;if(viewM>11){viewM=0;viewY++;}renderCal();});
  renderCal();
}

// ─────────────────────────────────────────────────────────
// INSTAGRAM EMBEDS - re-process after page load
// ─────────────────────────────────────────────────────────
if (window.instgrm) window.instgrm.Embeds.process();

// ─────────────────────────────────────────────────────────
// CONTACT FORM - posts to Web3Forms, which emails each submission to
// tincanchapelhill@gmail.com. The access key lives in a hidden input
// in index.html; it is public by design and only permits sending to
// that one inbox.
// ─────────────────────────────────────────────────────────
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const fb = document.getElementById('form-feedback');
  const btn = contactForm.querySelector('.form-submit');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const payload = Object.fromEntries(new FormData(contactForm));
    // Give the inbox a scannable subject line instead of the generic
    // default, and make Reply in Gmail go back to the visitor.
    payload.subject = `Contact Form Submission - ${payload.subject || 'No subject'} - ${payload.name}`;
    payload.from_name = "Max's Tin Can website";
    payload.replyto = payload.email;

    const resp = await fetch(contactForm.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.success) {
      // Log the real reason for debugging, show the visitor something calmer.
      console.error('Contact form failed:', resp.status, data.message || '(no detail)');
      throw new Error('Something went wrong. Please try again or email us directly.');
    }
    fb.textContent = 'Thanks for reaching out! We\u2019ll get back to you soon.';
    fb.style.color = 'var(--accent)';
    fb.style.display = 'block';
    contactForm.reset();
  } catch (err) {
    fb.textContent = err.message || 'Something went wrong. Please try again or email us directly.';
    fb.style.color = '#ff6b6b';
    fb.style.display = 'block';
  }
  btn.disabled = false;
  btn.textContent = 'Send Message';
});
