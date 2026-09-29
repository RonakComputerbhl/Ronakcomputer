/* ============================================================
   Ronak Computer — Admin panel logic
   ------------------------------------------------------------
   Access is protected by Firebase Authentication (Google
   Sign-In). Anyone can attempt to sign in with a Google
   account, but only TS_BOOTSTRAP_ADMIN_EMAIL (the permanent
   owner login, set in assets/js/firebase-config.js) and any
   email added via Settings → Users (stored in the Firestore
   "admins" collection, with a role of admin/editor/viewer) are
   let into the dashboard — everyone else is signed out
   immediately. This is enforced both here (for the UI) and in
   Firestore's own security rules (for the database itself) —
   see README.md.
   ============================================================ */

let ts_currentUser = null;
let ts_currentRole = null; // 'admin' | 'editor' | 'viewer'
let ts_unsubAdmins = null;
let ts_unsubVisits = null;

document.addEventListener('DOMContentLoaded', function () {
  ts_injectYear();
  ts_wireGoogleSignIn();
  ts_wireLogout();
  ts_wireProductForm();
  ts_wireResetCatalogue();
  ts_wireImagePreview();
  ts_wireAddUserForm();
  ts_watchAuthState();
});

/* ---------------- Auth (Firebase Authentication — Google Sign-In) ---------------- */

function ts_watchAuthState() {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.warn('Ronak Computer: Firebase Auth failed to load — check your internet connection and firebase-config.js.');
    return;
  }
  firebase.auth().onAuthStateChanged(function (user) {
    if (!user) {
      ts_currentUser = null; ts_currentRole = null;
      ts_showLoginScreen();
      return;
    }
    const email = (user.email || '').toLowerCase();
    if (ts_isOwnerEmail(email)) {
      ts_currentUser = user; ts_currentRole = 'admin';
      document.getElementById('loginError').style.display = 'none';
      ts_showDashboard(user);
      return;
    }
    TSData.getMyRole(email).then(function (role) {
      if (role === 'admin' || role === 'editor' || role === 'viewer') {
        ts_currentUser = user; ts_currentRole = role;
        document.getElementById('loginError').style.display = 'none';
        ts_showDashboard(user);
      } else {
        // Signed in with Google, but this email has no role assigned.
        ts_currentUser = null; ts_currentRole = null;
        firebase.auth().signOut();
        document.getElementById('loginError').style.display = 'block';
        ts_showLoginScreen();
      }
    });
  });
}

function ts_wireGoogleSignIn() {
  const btn = document.getElementById('googleSignInBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      document.getElementById('loginStatusMsg').textContent = 'Sign-in isn\'t available right now — check your internet connection.';
      return;
    }
    btn.disabled = true;
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(function (err) {
      console.warn('Ronak Computer: Google sign-in failed', err);
      document.getElementById('loginStatusMsg').textContent =
        err.code === 'auth/popup-closed-by-user' ? '' : 'Sign-in failed — please try again.';
    }).finally(function () { btn.disabled = false; });
  });
}

function ts_wireLogout() {
  ['logoutBtn', 'settingsLogoutBtn'].forEach(function (id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => { firebase.auth().signOut(); });
  });
}

function ts_showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('adminUserBadge').style.display = 'none';
  if (ts_unsubAdmins) { ts_unsubAdmins(); ts_unsubAdmins = null; }
  if (ts_unsubVisits) { ts_unsubVisits(); ts_unsubVisits = null; }
}

const TS_ROLE_LABEL = { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' };

function ts_showDashboard(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  // Show who's currently logged in — and their role — in the topbar and Settings tab.
  const badge = document.getElementById('adminUserBadge');
  badge.style.display = 'flex';
  document.getElementById('adminUserPhoto').src = user.photoURL || '../assets/img/logo.png';
  document.getElementById('adminUserName').textContent = user.displayName || 'Admin';
  document.getElementById('adminUserEmail').textContent = (user.email || '') + '  ·  ' + TS_ROLE_LABEL[ts_currentRole];
  const sName = document.getElementById('settingsUserName');
  const sEmail = document.getElementById('settingsUserEmail');
  if (sName) sName.textContent = (user.displayName || 'Admin') + '  ·  ' + TS_ROLE_LABEL[ts_currentRole];
  if (sEmail) sEmail.textContent = user.email || '';

  ts_applyRoleGating();

  const usersCard = document.getElementById('usersCard');
  if (usersCard) usersCard.style.display = ts_currentRole === 'admin' ? 'block' : 'none';
  if (ts_currentRole === 'admin') {
    if (ts_unsubAdmins) ts_unsubAdmins();
    ts_unsubAdmins = TSData.subscribeAdmins(ts_renderUsersList);
  }

  try { localStorage.setItem('ts_is_admin', '1'); } catch (e) {}   // don't count the owner's own visits
  TSData.subscribeLeads(ts_renderLeads);
  if (ts_unsubVisits) ts_unsubVisits();
  ts_unsubVisits = TSData.subscribeVisits(ts_renderVisitors, 500);
  // Re-renders on first load AND every time products change anywhere
  // (this device, another device, a customer's device — any edit
  // reaches this table live, without a page refresh).
  TSData.onUpdate(function () {
    ts_renderAdminTable();
    ts_renderStats();
  });
}

/* Viewer = read-only everywhere. Editor = can add/edit products but
   not delete them or reset the catalogue, and can't manage users.
   Admin = everything. */
function ts_applyRoleGating() {
  const isAdmin = ts_currentRole === 'admin';
  const canEdit = isAdmin || ts_currentRole === 'editor';
  document.body.setAttribute('data-role', ts_currentRole || '');

  const addBtn = document.getElementById('addProductBtn');
  if (addBtn) addBtn.style.display = canEdit ? 'inline-flex' : 'none';

  const resetBtn = document.getElementById('resetCatalogueBtn');
  if (resetBtn) resetBtn.style.display = isAdmin ? 'inline-flex' : 'none';

  const note = document.getElementById('viewerNote');
  if (note) note.style.display = canEdit ? 'none' : 'block';
}

/* ---------------- Product table ---------------- */

let ts_editingId = null;

function ts_renderStats() {
  const all = TSData.getAll();
  const laptops = all.filter(p => p.category === 'laptop').length;
  const printers = all.filter(p => p.category === 'printer').length;
  const outOfStock = all.filter(p => p.status === 'out').length;
  document.getElementById('statLaptops').textContent = laptops;
  document.getElementById('statPrinters').textContent = printers;
  document.getElementById('statOut').textContent = outOfStock;
  document.getElementById('statTotal').textContent = all.length;
}

function ts_renderAdminTable() {
  const tbody = document.getElementById('adminTableBody');
  const catFilter = document.getElementById('adminFilterCategory').value;

  if (!TSData.isReady()) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">Loading products…</td></tr>`;
    return;
  }

  let list = TSData.getAll();
  if (catFilter) list = list.filter(p => p.category === catFilter);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">No products yet. Click "Add Product" to create your first listing.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td class="admin-cell-img"><img src="${p.image && p.image.trim() ? p.image : ts_placeholderFor(p.category)}" alt=""></td>
      <td>
        <strong>${ts_escape(p.model)}</strong><br>
        <span class="admin-muted">${ts_escape(p.brand)} · ${p.category === 'laptop' ? 'Laptop' : 'Printer'}</span>
      </td>
      <td class="admin-muted admin-config-cell">${ts_escape(p.configuration)}</td>
      <td><strong>${TSData.fmtPrice(p.price)}</strong></td>
      <td><span class="admin-pill ${p.status === 'available' ? 'admin-pill-ok' : 'admin-pill-out'}">${p.status === 'available' ? 'Available' : 'Out of Stock'}</span></td>
      <td class="admin-actions-cell">
        ${ts_currentRole === 'viewer' ? '<span class="admin-muted">View only</span>' : `
        <button class="btn btn-ghost btn-sm" onclick="ts_editProduct('${p.id}')">Edit</button>
        ${ts_currentRole === 'admin' ? `<button class="btn btn-sm admin-btn-delete" onclick="ts_deleteProduct('${p.id}')">Delete</button>` : ''}
        `}
      </td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const filter = document.getElementById('adminFilterCategory');
  if (filter) filter.addEventListener('change', ts_renderAdminTable);
  const addBtn = document.getElementById('addProductBtn');
  if (addBtn) addBtn.addEventListener('click', () => ts_openProductModal());
});

function ts_openProductModal(id) {
  if (ts_currentRole !== 'admin' && ts_currentRole !== 'editor') return;
  ts_editingId = id || null;
  const modal = document.getElementById('productModal');
  const form = document.getElementById('productForm');
  form.reset();
  document.getElementById('imgPreview').style.display = 'none';
  document.getElementById('productModalTitle').textContent = id ? 'Edit Product' : 'Add Product';

  if (id) {
    const p = TSData.getById(id);
    if (!p) return;
    form.category.value = p.category;
    form.brand.value = p.brand;
    form.model.value = p.model;
    form.configuration.value = p.configuration;
    form.price.value = p.price;
    form.status.value = p.status;
    form.featured.checked = !!p.featured;
    form.image.value = p.image || '';
    if (p.image) {
      document.getElementById('imgPreview').src = p.image;
      document.getElementById('imgPreview').style.display = 'block';
    }
  }
  modal.classList.add('open');
}

function ts_closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  ts_editingId = null;
}

function ts_editProduct(id) { ts_openProductModal(id); }

function ts_deleteProduct(id) {
  if (ts_currentRole !== 'admin') return;
  const p = TSData.getById(id);
  if (!p) return;
  if (!confirm(`Delete "${p.model}"? This cannot be undone.`)) return;
  TSData.remove(id).then(function (ok) {
    if (!ok) {
      alert('Could not delete — check your internet connection and try again.');
      return;
    }
    ts_renderAdminTable();
    ts_renderStats();
  });
}

function ts_wireProductForm() {
  const form = document.getElementById('productForm');
  if (!form) return;

  document.querySelectorAll('[data-close-product-modal]').forEach(btn =>
    btn.addEventListener('click', ts_closeProductModal)
  );
  document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target.id === 'productModal') ts_closeProductModal();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const fd = new FormData(form);
    const product = {
      id: ts_editingId || TSData.makeId(fd.get('category')),
      category: fd.get('category'),
      brand: fd.get('brand').trim(),
      model: fd.get('model').trim(),
      configuration: fd.get('configuration').trim(),
      price: Number(fd.get('price')) || 0,
      status: fd.get('status'),
      featured: fd.get('featured') === 'on',
      image: fd.get('image') || ''
    };
    if (!product.brand || !product.model || !product.configuration || !product.price) return;

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    TSData.save(product).then(function (ok) {
      if (submitBtn) submitBtn.disabled = false;
      if (!ok) {
        alert(TSData.isCloud()
          ? 'Could not save — check your internet connection and try again.'
          : 'Could not save — the image may be too large for browser storage. Try a smaller photo (under ~500KB) or paste an image URL instead.');
        return;
      }
      ts_closeProductModal();
      ts_renderAdminTable();
      ts_renderStats();
    });
  });
}

function ts_wireImagePreview() {
  const fileInput = document.getElementById('imgFile');
  const urlInput = document.querySelector('#productForm [name="image"]');
  const preview = document.getElementById('imgPreview');
  if (!fileInput) return;

  fileInput.addEventListener('change', function () {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert('Please choose an image smaller than 1.5MB for best performance.');
      fileInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      urlInput.value = e.target.result;
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  urlInput.addEventListener('input', function () {
    if (urlInput.value.trim()) {
      preview.src = urlInput.value.trim();
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  });
}

function ts_wireResetCatalogue() {
  const btn = document.getElementById('resetCatalogueBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (ts_currentRole !== 'admin') return;
    if (!confirm('Reset the catalogue back to the sample starter products? Your custom products/edits will be lost.')) return;
    TSData.resetToDefaults().then(function (ok) {
      if (!ok) {
        alert('Could not reset — check your internet connection and try again.');
        return;
      }
      ts_renderAdminTable();
      ts_renderStats();
    });
  });
}

/* ---------------- Users (Admin / Editor / Viewer) ---------------- */

function ts_renderUsersList(users) {
  const wrap = document.getElementById('usersList');
  if (!wrap) return;
  const bootstrapRow = TS_BOOTSTRAP_ADMIN_EMAILS.map(e => `
    <div class="admin-user-row">
      <div><strong>${ts_escape(e)}</strong><br><span class="admin-muted">Admin · owner account, can't be removed here</span></div>
    </div>`).join('');
  const otherRows = (users || []).map(u => `
    <div class="admin-user-row">
      <div><strong>${ts_escape(u.email)}</strong><br><span class="admin-muted">${TS_ROLE_LABEL[u.role] || u.role}</span></div>
      <button class="btn btn-sm admin-btn-delete" onclick="ts_removeUser('${ts_escape(u.email)}')">Remove</button>
    </div>`).join('');
  wrap.innerHTML = bootstrapRow + otherRows;
}

function ts_wireAddUserForm() {
  const form = document.getElementById('addUserForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (ts_currentRole !== 'admin') return;
    const email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    const role = document.getElementById('newUserRole').value;
    const msg = document.getElementById('addUserMsg');
    if (!email || ts_isOwnerEmail(email)) {
      msg.textContent = 'Enter a valid Gmail address (different from the owner account).';
      msg.className = 'form-note admin-msg-error';
      return;
    }
    TSData.setUserRole(email, role, ts_currentUser && ts_currentUser.email).then(function (ok) {
      msg.textContent = ok ? `${email} added as ${TS_ROLE_LABEL[role]}.` : 'Could not save — check your internet connection.';
      msg.className = ok ? 'form-note admin-msg-ok' : 'form-note admin-msg-error';
      if (ok) form.reset();
    });
  });
}

function ts_removeUser(email) {
  if (ts_currentRole !== 'admin') return;
  if (!confirm(`Remove access for ${email}?`)) return;
  TSData.removeUserRole(email);
}

/* ---------------- Leads / enquiries viewer ---------------- */

function ts_renderLeads(leads) {
  const wrap = document.getElementById('leadsList');
  if (!wrap) return;
  leads = leads || [];
  if (!leads.length) {
    wrap.innerHTML = '<div class="admin-empty">No enquiries yet. They\'ll appear here the moment a customer submits the WhatsApp or service form, from any device.</div>';
    return;
  }
  wrap.innerHTML = leads.slice(0, 30).map(l => `
    <div class="lead-row">
      <div>
        <strong>${ts_escape(l.name || '—')}</strong>
        <span class="admin-muted"> · ${ts_escape(l.phone || '')}</span>
        <div class="admin-muted lead-detail">
          ${l.type === 'product' ? 'Product enquiry: ' + ts_escape(l.product || '') : ''}
          ${l.type === 'service' ? 'Service: ' + ts_escape(l.device || '') + ' — ' + ts_escape(l.issue || '') : ''}
          ${l.type === 'contact' ? 'Message: ' + ts_escape(l.message || '') : ''}
        </div>
      </div>
      <span class="admin-muted lead-date">${new Date(l.date).toLocaleString('en-IN')}</span>
    </div>
  `).join('');
}


/* ---------------- Website visitors ---------------- */

let ts_visitsAll = [];
function ts_renderVisitors(visits, ok) {
  ts_visitsAll = visits || [];
  const note = document.getElementById('visitorsNote');
  if (note) {
    note.style.display = (ok === false) ? 'block' : 'none';
  }
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  const now = Date.now();
  const todayStr = new Date().toDateString();
  const today = ts_visitsAll.filter(v => new Date(v.date).toDateString() === todayStr);
  const uniq = arr => new Set(arr.map(v => v.visitorId)).size;
  const online = ts_visitsAll.filter(v => now - new Date(v.date).getTime() < 5 * 60 * 1000);

  set('vsToday', today.length);
  set('vsTodayUniq', uniq(today));
  set('vsOnline', uniq(online));
  set('vsTotal', ts_visitsAll.length);
  set('vsUniq', uniq(ts_visitsAll));

  // Top pages
  const counts = {};
  ts_visitsAll.forEach(v => { counts[v.page] = (counts[v.page] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topEl = document.getElementById('vsTopPages');
  if (topEl) topEl.innerHTML = top.length
    ? top.map(t => `<div class="admin-user-row"><div><strong>${ts_escape(t[0])}</strong></div><span class="admin-muted">${t[1]} views</span></div>`).join('')
    : '<div class="admin-empty">No visits yet.</div>';

  // Recent visitors table
  const body = document.getElementById('visitorsBody');
  if (!body) return;
  if (!ts_visitsAll.length) {
    body.innerHTML = '<tr><td colspan="6" class="admin-empty">No visitors recorded yet. Open the website in another browser/phone and refresh this tab.</td></tr>';
    return;
  }
  body.innerHTML = ts_visitsAll.slice(0, 100).map(v => {
    const loc = [v.city, v.region, v.country].filter(Boolean).join(', ') || '—';
    return `<tr>
      <td class="admin-muted" style="white-space:nowrap;">${new Date(v.date).toLocaleString('en-IN')}</td>
      <td><strong>${ts_escape(v.page || '/')}</strong></td>
      <td>${ts_escape(loc)}</td>
      <td class="admin-muted">${ts_escape(v.device || '')} · ${ts_escape(v.browser || '')} · ${ts_escape(v.os || '')}</td>
      <td class="admin-muted">${ts_escape(v.source || 'Direct')}</td>
      <td><span class="admin-pill ${v.returning ? 'admin-pill-ok' : 'admin-pill-out'}" style="${v.returning ? '' : 'background:#e8f0ff;color:#1d4ed8;'}">${v.returning ? 'Returning' : 'New'}</span></td>
    </tr>`;
  }).join('');
}
