/* ============================================================
   Ronak Computer — Site behaviour
   Edit TS_CONFIG below to update shop-wide details in one place.
   ============================================================ */

const TS_CONFIG = {
  shopName: 'Ronak Computer',
  phoneDisplay: '+91 76108 65661',
  phoneWa: '917610865661',        // WhatsApp number, country code no + no spaces
  phoneAltDisplay: '+91 76108 65661',
  phoneAltWa: '917610865661',
  email: 'ronakcomputerbhl@gmail.com',
  address: '1/229, Suwana - Halar Rd, Suwana, Bhilwara, Rajasthan 311011',
  facebook: 'https://www.facebook.com/share/1FEaaTG6D2/?mibextid=wwXIfr',
  hours: 'Monday – Saturday, 10:00 AM – 8:00 PM',
  hoursClosed: 'Sunday: Closed'
};

document.addEventListener('DOMContentLoaded', function () {
  ts_safe(ts_injectYear);
  ts_safe(ts_navToggle);
  ts_safe(ts_highlightActiveNav);
  ts_safe(ts_wireWhatsappModal);
  ts_safe(ts_wireServiceForm);
  ts_safe(ts_wireContactForm);
  ts_safe(ts_wireCursorGlow);
  ts_safe(ts_wireSpotlights);
  ts_safe(ts_trackVisit);

  if (document.getElementById('featuredGrid')) ts_safe(ts_renderFeatured);
  if (document.getElementById('productGrid')) ts_safe(ts_renderCatalogue);
});

// Runs each setup step independently — if one part of the page has a
// problem, it's logged to the console instead of silently breaking
// everything else on the page (like the mobile menu).
function ts_safe(fn) {
  try { fn(); } catch (err) { console.error('Ronak Computer:', fn.name, 'failed:', err); }
}

function ts_injectYear() {
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

function ts_navToggle() {
  const btn = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }));
}

function ts_highlightActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

/* ---------------- Digital hover effects ----------------
   A soft ambient glow follows the cursor across the page, and any
   element marked .spotlight (cards, tiles, product cards, forms)
   tracks the pointer to light up right where the mouse is. Both are
   skipped on touch devices, where hover doesn't apply anyway. */

function ts_wireCursorGlow() {
  if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  const glow = document.createElement('div');
  glow.id = 'cursorGlow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(glow);
  let raf = null;
  document.addEventListener('mousemove', e => {
    document.body.classList.add('cursor-active');
    if (raf) return;
    raf = requestAnimationFrame(() => {
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
      raf = null;
    });
  });
  document.addEventListener('mouseleave', () => document.body.classList.remove('cursor-active'));
}

function ts_wireSpotlights() {
  if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
  // Delegated listener so it also covers product cards rendered later
  // (catalogue/featured grids) without needing to re-wire anything.
  document.addEventListener('mousemove', e => {
    const el = e.target.closest ? e.target.closest('.spotlight') : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--sx', ((e.clientX - r.left) / r.width) * 100 + '%');
    el.style.setProperty('--sy', ((e.clientY - r.top) / r.height) * 100 + '%');
  });
}

/* ---------------- Product card rendering ---------------- */

function ts_placeholderFor(category) {
  const base = (typeof window.TS_ASSET_BASE !== 'undefined') ? window.TS_ASSET_BASE : '';
  return category === 'printer'
    ? base + 'assets/img/placeholder-printer.svg'
    : base + 'assets/img/placeholder-laptop.svg';
}

function ts_productCardHTML(p) {
  const img = p.image && p.image.trim() ? p.image : ts_placeholderFor(p.category);
  const inStock = p.status === 'available';
  return `
  <article class="product-card spotlight" data-id="${p.id}">
    <div class="product-media">
      <img src="${img}" alt="${ts_escape(p.model)} product photo" loading="lazy" onerror="this.src='${ts_placeholderFor(p.category)}'">
      <span class="stock-badge ${inStock ? 'stock-in' : 'stock-out'}">${inStock ? 'Available' : 'Out of Stock'}</span>
    </div>
    <div class="product-body">
      <span class="product-brand">${ts_escape(p.brand)}</span>
      <h3>${ts_escape(p.model)}</h3>
      <p class="product-config">${ts_escape(p.configuration)}</p>
      <div class="product-price-row">
        <span class="product-price">${TSData.fmtPrice(p.price)}</span>
      </div>
      <div class="product-actions">
        <button class="btn btn-whatsapp btn-sm" onclick="ts_openInquiry('${p.id}')">
          WhatsApp Enquiry
        </button>
        <a class="btn btn-ghost btn-sm" href="tel:+${TS_CONFIG.phoneWa}">Call</a>
      </div>
    </div>
  </article>`;
}

function ts_escape(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function ts_renderFeatured() {
  const grid = document.getElementById('featuredGrid');

  function refresh() {
    if (!TSData.isReady()) {
      grid.innerHTML = '<div class="empty-state">Loading…</div>';
      return;
    }
    const items = TSData.getFeatured(6);
    grid.innerHTML = items.length
      ? items.map(ts_productCardHTML).join('')
      : '<div class="empty-state">Featured products will appear here once added in the admin panel.</div>';
  }

  // Re-renders on first load AND every time products change anywhere
  // (another device's admin edit, cloud sync, etc.) — no refresh needed.
  TSData.onUpdate(refresh);
}

/* Catalogue page (laptops.html / printers.html) reads
   data-category from the <body> tag to know what to show. */
function ts_renderCatalogue() {
  const body = document.body;
  const category = body.getAttribute('data-category'); // 'laptop' | 'printer'
  const grid = document.getElementById('productGrid');
  const brandSelect = document.getElementById('filterBrand');
  const stockSelect = document.getElementById('filterStock');
  const sortSelect = document.getElementById('filterSort');
  const searchInput = document.getElementById('filterSearch');
  const countEl = document.getElementById('resultCount');

  let all = [];

  function render() {
    let list = all.slice();
    const brand = brandSelect ? brandSelect.value : '';
    const stock = stockSelect ? stockSelect.value : '';
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const sort = sortSelect ? sortSelect.value : 'default';

    if (brand) list = list.filter(p => p.brand === brand);
    if (stock) list = list.filter(p => p.status === stock);
    if (q) list = list.filter(p =>
      (p.model + ' ' + p.brand + ' ' + p.configuration).toLowerCase().includes(q)
    );

    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'name-asc') list.sort((a, b) => a.model.localeCompare(b.model));

    grid.innerHTML = list.length
      ? list.map(ts_productCardHTML).join('')
      : '<div class="empty-state">No products match your filters right now. Try clearing a filter, or WhatsApp us — new stock arrives every week.</div>';
    if (countEl) countEl.textContent = list.length + (list.length === 1 ? ' product' : ' products');
  }

  function refreshFromData() {
    if (!TSData.isReady()) {
      grid.innerHTML = '<div class="empty-state">Loading…</div>';
      return;
    }
    all = TSData.getByCategory(category);

    // populate brand filter dynamically, keeping the current selection if possible
    if (brandSelect) {
      const current = brandSelect.value;
      const brands = Array.from(new Set(all.map(p => p.brand))).sort();
      brandSelect.innerHTML = '<option value="">All Brands</option>' +
        brands.map(b => `<option value="${ts_escape(b)}">${ts_escape(b)}</option>`).join('');
      if (brands.includes(current)) brandSelect.value = current;
    }

    render();
  }

  [brandSelect, stockSelect, sortSelect].forEach(el => el && el.addEventListener('change', render));
  if (searchInput) searchInput.addEventListener('input', render);

  // Re-renders on first load AND every time products change anywhere.
  TSData.onUpdate(refreshFromData);
}

/* ---------------- WhatsApp inquiry modal ---------------- */

function ts_openInquiry(productId) {
  const p = TSData.getById(productId);
  if (!p) return;
  const overlay = document.getElementById('inquiryModal');
  if (!overlay) return;

  overlay.dataset.productId = productId;
  document.getElementById('inquirySummary').innerHTML =
    `<strong>${ts_escape(p.model)}</strong><br>
     ${ts_escape(p.configuration)}<br>
     Price: <strong>${TSData.fmtPrice(p.price)}</strong> &middot;
     ${p.status === 'available' ? 'Available now' : 'Currently out of stock'}`;

  overlay.classList.add('open');
  document.getElementById('inquiryName').focus();
}

function ts_closeInquiry() {
  const overlay = document.getElementById('inquiryModal');
  if (overlay) overlay.classList.remove('open');
}

function ts_wireWhatsappModal() {
  const overlay = document.getElementById('inquiryModal');
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) ts_closeInquiry();
  });
  document.querySelectorAll('[data-close-modal]').forEach(btn =>
    btn.addEventListener('click', ts_closeInquiry)
  );

  const form = document.getElementById('inquiryForm');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const productId = overlay.dataset.productId;
    const p = TSData.getById(productId);
    const name = document.getElementById('inquiryName').value.trim();
    const phone = document.getElementById('inquiryPhone').value.trim();
    if (!name || !phone) return;

    const lines = [
      `Hello ${TS_CONFIG.shopName}, I'm interested in a product:`,
      ``,
      `Product: ${p.model}`,
      `Configuration: ${p.configuration}`,
      `Price: ${TSData.fmtPrice(p.price)}`,
      `Availability: ${p.status === 'available' ? 'Available' : 'Out of Stock'}`,
      ``,
      `My name: ${name}`,
      `My phone: ${phone}`
    ];
    const text = encodeURIComponent(lines.join('\n'));
    TSData.saveLead({ type: 'product', product: p.model, name, phone });
    window.open(`https://wa.me/${TS_CONFIG.phoneWa}?text=${text}`, '_blank');
    ts_closeInquiry();
    form.reset();
  });
}

/* ---------------- Service inquiry form (services.html) ---------------- */

function ts_wireServiceForm() {
  const form = document.getElementById('serviceForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.name || !data.phone || !data.deviceType || !data.issue) return;

    const lines = [
      `Hello ${TS_CONFIG.shopName}, I need a repair/service:`,
      ``,
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      `Device: ${data.deviceType}${data.brandModel ? ' — ' + data.brandModel : ''}`,
      `Issue: ${data.issue}`,
      data.preferredDate ? `Preferred date: ${data.preferredDate}` : null
    ].filter(Boolean);

    const text = encodeURIComponent(lines.join('\n'));
    TSData.saveLead({ type: 'service', name: data.name, phone: data.phone, device: data.deviceType, issue: data.issue });
    window.open(`https://wa.me/${TS_CONFIG.phoneWa}?text=${text}`, '_blank');

    form.reset();
    const success = document.getElementById('serviceSuccess');
    if (success) success.classList.add('show');
  });
}

/* ---------------- Contact page general form ---------------- */

function ts_wireContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.name || !data.phone || !data.message) return;

    const lines = [
      `Hello ${TS_CONFIG.shopName}, I have a question:`,
      ``,
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      `Message: ${data.message}`
    ];
    const text = encodeURIComponent(lines.join('\n'));
    TSData.saveLead({ type: 'contact', name: data.name, phone: data.phone, message: data.message });
    window.open(`https://wa.me/${TS_CONFIG.phoneWa}?text=${text}`, '_blank');

    form.reset();
    const success = document.getElementById('contactSuccess');
    if (success) success.classList.add('show');
  });
}


/* ============================================================
   Visitor tracking — logs each page view (once per page per
   browser session) to Firestore so it shows in Admin → Visitors.
   Stores: page, device/browser/OS, approximate city & country,
   where they came from, and an anonymous visitor ID. It does NOT
   store IP addresses, names or any personal details.
   Skipped on the admin panel and on any browser where the owner
   has logged into the admin panel (so your own visits don't count).
   ============================================================ */
function ts_trackVisit() {
  if (window.TS_ASSET_BASE) return;                       // admin page
  if (/\/admin(\/|$)/.test(location.pathname)) return;
  if (location.protocol === 'file:') return;
  try { if (localStorage.getItem('ts_is_admin') === '1') return; } catch (e) {}

  const page = (location.pathname.replace(/\/index\.html$/, '/') || '/') ;
  const flagKey = 'ts_visit_' + page;
  try { if (sessionStorage.getItem(flagKey)) return; sessionStorage.setItem(flagKey, '1'); } catch (e) {}

  let vid = null, returning = false;
  try {
    vid = localStorage.getItem('ts_vid');
    if (vid) returning = true;
    else { vid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('ts_vid', vid); }
  } catch (e) { vid = 'v' + Math.random().toString(36).slice(2, 10); }

  const ua = navigator.userAgent || '';
  let browser = 'Other';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  let os = 'Other';
  if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  const device = /Mobi|Android|iPhone/.test(ua) ? 'Mobile' : (/iPad|Tablet/.test(ua) ? 'Tablet' : 'Desktop');

  let source = 'Direct';
  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      source = host === location.hostname ? 'Internal' : host.replace(/^www\./, '');
    }
    const utm = new URLSearchParams(location.search).get('utm_source');
    if (utm) source = utm;
  } catch (e) {}

  const base = {
    date: new Date().toISOString(),
    page: page,
    title: document.title || '',
    visitorId: vid,
    returning: returning,
    device: device, browser: browser, os: os,
    screen: (window.screen ? screen.width + 'x' + screen.height : ''),
    language: navigator.language || '',
    timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone) || '',
    source: source
  };

  function send(geo) {
    const visit = Object.assign({}, base, geo || {});
    // TSData may still be connecting to Firestore — retry briefly.
    let tries = 0;
    (function attempt() {
      if (typeof TSData !== 'undefined' && TSData.isCloud()) { TSData.saveVisit(visit); return; }
      if (++tries < 20) setTimeout(attempt, 500);
    })();
  }

  // Approximate location from a free geo-IP service (city / region / country only).
  // If it's blocked or slow we still log the visit, just without location.
  let geo = null;
  try { geo = JSON.parse(sessionStorage.getItem('ts_geo') || 'null'); } catch (e) {}
  if (geo) { send(geo); return; }
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timer = setTimeout(function () { if (ctrl) ctrl.abort(); send(null); }, 3500);
  let done = false;
  fetch('https://ipapi.co/json/', ctrl ? { signal: ctrl.signal } : {})
    .then(r => r.json())
    .then(function (j) {
      if (done) return; done = true; clearTimeout(timer);
      const g = { city: j.city || '', region: j.region || '', country: j.country_name || '' };
      try { sessionStorage.setItem('ts_geo', JSON.stringify(g)); } catch (e) {}
      send(g);
    })
    .catch(function () { if (done) return; done = true; clearTimeout(timer); send(null); });
}
