/* ============================================================
   Ronak Computer — Product data layer
   ------------------------------------------------------------
   Products now live in Firebase Firestore (a free cloud
   database) once you fill in assets/js/firebase-config.js — see
   README.md → "Cloud Setup (Firebase)". That makes every admin
   panel change show up for every visitor, on every device,
   within a second or two, with no manual re-uploading.

   Until firebase-config.js has real values in it, this file
   automatically falls back to the browser's local storage
   (exactly like before) so the site keeps working out of the
   box — it just won't sync between devices until you connect it.
   ============================================================ */

const TS_STORAGE_KEY = 'ronakcomputer_products_v1';
const TS_LEADS_KEY    = 'ronakcomputer_leads_v1';

const TS_DEFAULT_PRODUCTS = [
  {
    id: 'lap-hp-01',
    category: 'laptop',
    brand: 'HP',
    model: 'HP 15 Core i5 12th Gen',
    configuration: 'Intel Core i5-1235U, 8GB RAM, 512GB SSD, 15.6" FHD, Windows 11, Integrated Graphics',
    price: 47990,
    status: 'available',
    featured: true,
    image: ''
  },
  {
    id: 'lap-lenovo-01',
    category: 'laptop',
    brand: 'Lenovo',
    model: 'Lenovo IdeaPad Slim 3',
    configuration: 'AMD Ryzen 5 7520U, 16GB RAM, 512GB SSD, 15.6" FHD IPS, Windows 11 Home',
    price: 42990,
    status: 'available',
    featured: true,
    image: ''
  },
  {
    id: 'lap-dell-01',
    category: 'laptop',
    brand: 'Dell',
    model: 'Dell Vostro 3520',
    configuration: 'Intel Core i3-1215U, 8GB RAM, 512GB SSD, 15.6" FHD, Windows 11, MS Office',
    price: 38990,
    status: 'available',
    featured: false,
    image: ''
  },
  {
    id: 'lap-acer-01',
    category: 'laptop',
    brand: 'Acer',
    model: 'Acer Aspire Lite',
    configuration: 'Intel Core i3-1115G4, 8GB RAM, 256GB SSD, 15.6" FHD, Windows 11 Home',
    price: 32990,
    status: 'available',
    featured: false,
    image: ''
  },
  {
    id: 'lap-asus-01',
    category: 'laptop',
    brand: 'Asus',
    model: 'Asus VivoBook 15',
    configuration: 'Intel Core i5-1334U, 16GB RAM, 512GB SSD, 15.6" FHD OLED, Windows 11',
    price: 54990,
    status: 'out',
    featured: false,
    image: ''
  },
  {
    id: 'lap-hp-02',
    category: 'laptop',
    brand: 'HP',
    model: 'HP Victus Gaming 15',
    configuration: 'Intel Core i5-13420H, 16GB RAM, 512GB SSD, RTX 3050 6GB, 15.6" FHD 144Hz',
    price: 68990,
    status: 'available',
    featured: true,
    image: ''
  },
  {
    id: 'pr-canon-01',
    category: 'printer',
    brand: 'Canon',
    model: 'Canon PIXMA G3020',
    configuration: 'All-in-One Ink Tank, Print • Scan • Copy, Wi-Fi, Borderless Photo Printing',
    price: 16999,
    status: 'available',
    featured: true,
    image: ''
  },
  {
    id: 'pr-epson-01',
    category: 'printer',
    brand: 'Epson',
    model: 'Epson EcoTank L3250',
    configuration: 'All-in-One Ink Tank, Print • Scan • Copy, Wi-Fi & Mobile Print',
    price: 18499,
    status: 'available',
    featured: true,
    image: ''
  },
  {
    id: 'pr-hp-01',
    category: 'printer',
    brand: 'HP',
    model: 'HP Smart Tank 580',
    configuration: 'All-in-One Ink Tank, Print • Scan • Copy, Wi-Fi Direct, Auto Duplex',
    price: 15999,
    status: 'available',
    featured: false,
    image: ''
  },
  {
    id: 'pr-canon-02',
    category: 'printer',
    brand: 'Canon',
    model: 'Canon imageCLASS MF createdBy 3018',
    configuration: 'Laser All-in-One, Print • Scan • Copy, Mono Laser, Compact Design',
    price: 13999,
    status: 'out',
    featured: false,
    image: ''
  },
  {
    id: 'pr-epson-02',
    category: 'printer',
    brand: 'Epson',
    model: 'Epson L120',
    configuration: 'Single Function Ink Tank Printer, High Volume Printing, USB',
    price: 10999,
    status: 'available',
    featured: false,
    image: ''
  }
];

const TSData = (function () {
  let _cloudMode = false;   // true once connected to Firestore
  let _db = null;
  let _cache = [];          // current known product list (kept live)
  let _ready = false;       // true once the first load (cloud or local) has completed
  const _listeners = [];    // callbacks to re-render pages when data changes

  function _notify() {
    const snapshot = _cache.slice();
    _listeners.forEach(fn => { try { fn(snapshot); } catch (e) { /* one bad listener shouldn't break the rest */ } });
  }

  /* Subscribe to every future data change (add/edit/delete, from
     ANY device). Fires immediately with current data if it's
     already loaded, then again every time it changes. */
  function onUpdate(fn) {
    _listeners.push(fn);
    if (_ready) fn(_cache.slice());
  }

  function isReady() { return _ready; }
  function isCloud() { return _cloudMode; }

  /* ---------------- local storage engine (fallback) ---------------- */

  function _localReadRaw() {
    try {
      const raw = localStorage.getItem(TS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Ronak Computer: could not read product storage', e);
      return null;
    }
  }

  function _localWrite(list) {
    try {
      localStorage.setItem(TS_STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      console.warn('Ronak Computer: could not save products (storage full or unavailable)', e);
      return false;
    }
  }

  function _loadLocalIntoCache() {
    let list = _localReadRaw();
    if (!list) {
      list = TS_DEFAULT_PRODUCTS.slice();
      _localWrite(list);
    }
    _cache = list;
    _ready = true;
    _notify();
  }

  /* ---------------- cloud (Firestore) engine ---------------- */

  function _cloudConfigured() {
    return typeof TS_FIREBASE_CONFIG !== 'undefined' &&
      typeof firebase !== 'undefined' &&
      TS_FIREBASE_CONFIG.apiKey &&
      TS_FIREBASE_CONFIG.apiKey.indexOf('YOUR_') !== 0;
  }

  function _listenCloud() {
    _db.collection('products').onSnapshot(function (snap) {
      _cache = snap.docs.map(d => d.data());
      _ready = true;
      _notify();
    }, function (err) {
      console.warn('Ronak Computer: Firestore live updates stopped working, switching to local data for this visit', err);
      _cloudMode = false;
      _loadLocalIntoCache();
    });
  }

  function _subscribeCloud() {
    // A one-time marker doc tells us whether the starter catalogue
    // has already been copied into this Firestore project, so we
    // never accidentally re-add products the owner deleted on purpose.
    _db.collection('meta').doc('catalogueInit').get().then(function (metaDoc) {
      if (metaDoc.exists) { _listenCloud(); return; }
      const batch = _db.batch();
      TS_DEFAULT_PRODUCTS.forEach(p => batch.set(_db.collection('products').doc(p.id), p));
      batch.set(_db.collection('meta').doc('catalogueInit'), { seededAt: new Date().toISOString() });
      batch.commit().then(_listenCloud).catch(function (err) {
        console.warn('Ronak Computer: could not seed starter catalogue into Firestore, using local data instead', err);
        _cloudMode = false;
        _loadLocalIntoCache();
      });
    }).catch(function (err) {
      console.warn('Ronak Computer: Firestore is unreachable (check your config/rules in firebase-config.js) — using local data for this visit', err);
      _cloudMode = false;
      _loadLocalIntoCache();
    });
  }

  function init() {
    if (_cloudConfigured()) {
      try {
        firebase.initializeApp(TS_FIREBASE_CONFIG);
        _db = firebase.firestore();
        _cloudMode = true;
        _subscribeCloud();
        return;
      } catch (e) {
        console.warn('Ronak Computer: Firebase failed to start, using local data instead', e);
        _cloudMode = false;
      }
    }
    _loadLocalIntoCache();
  }

  /* ---------------- reads (always from the live in-memory cache) ---------------- */

  function getAll() { return _cache.slice(); }
  function getByCategory(category) { return getAll().filter(p => p.category === category); }
  function getById(id) { return getAll().find(p => p.id === id) || null; }
  function getFeatured(limit) {
    const feats = getAll().filter(p => p.featured && p.status === 'available');
    return limit ? feats.slice(0, limit) : feats;
  }

  /* ---------------- writes (return a Promise<boolean> either way,
     so calling code doesn't need to know if it's cloud or local) ---------------- */

  function save(product) {
    if (_cloudMode) {
      return _db.collection('products').doc(product.id).set(product)
        .then(() => true)
        .catch(err => { console.warn('Ronak Computer: cloud save failed', err); return false; });
    }
    const list = getAll();
    const idx = list.findIndex(p => p.id === product.id);
    if (idx > -1) list[idx] = product; else list.unshift(product);
    const ok = _localWrite(list);
    if (ok) { _cache = list; _notify(); }
    return Promise.resolve(ok);
  }

  function remove(id) {
    if (_cloudMode) {
      return _db.collection('products').doc(id).delete()
        .then(() => true)
        .catch(err => { console.warn('Ronak Computer: cloud delete failed', err); return false; });
    }
    const list = getAll().filter(p => p.id !== id);
    const ok = _localWrite(list);
    if (ok) { _cache = list; _notify(); }
    return Promise.resolve(ok);
  }

  function resetToDefaults() {
    if (_cloudMode) {
      return _db.collection('products').get().then(snap => {
        const batch = _db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        TS_DEFAULT_PRODUCTS.forEach(p => batch.set(_db.collection('products').doc(p.id), p));
        return batch.commit().then(() => true);
      }).catch(err => { console.warn('Ronak Computer: cloud reset failed', err); return false; });
    }
    const ok = _localWrite(TS_DEFAULT_PRODUCTS.slice());
    if (ok) { _cache = TS_DEFAULT_PRODUCTS.slice(); _notify(); }
    return Promise.resolve(ok);
  }

  function makeId(category) {
    return category + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function fmtPrice(n) {
    const num = Number(n) || 0;
    return '₹' + num.toLocaleString('en-IN');
  }

  /* ---- Service / contact leads: now saved to Firestore when cloud
     mode is on, so an enquiry from ANY visitor's device shows up
     live in the admin panel — not just enquiries made on the
     admin's own browser. Every enquiry still also goes straight to
     WhatsApp regardless of this. Falls back to local storage if
     Firestore isn't set up or a save fails. ---- */
  function _localSaveLead(entry) {
    try {
      const list = JSON.parse(localStorage.getItem(TS_LEADS_KEY) || '[]');
      list.unshift(Object.assign({ id: Date.now() }, entry));
      localStorage.setItem(TS_LEADS_KEY, JSON.stringify(list.slice(0, 200)));
    } catch (e) { /* non-fatal */ }
  }

  function saveLead(lead) {
    const entry = Object.assign({ date: new Date().toISOString() }, lead);
    if (_cloudMode) {
      _db.collection('leads').add(entry).catch(function (err) {
        console.warn('Ronak Computer: could not save enquiry to cloud, saving locally instead', err);
        _localSaveLead(entry);
      });
      return;
    }
    _localSaveLead(entry);
  }

  function getLeads() {
    try { return JSON.parse(localStorage.getItem(TS_LEADS_KEY) || '[]'); }
    catch (e) { return []; }
  }

  /* Live-subscribe to enquiries (admin panel only — Firestore rules
     restrict reading the "leads" collection to the signed-in admin
     email). Fires immediately, then again whenever a new enquiry
     comes in from any device. Returns an unsubscribe function. */
  function subscribeLeads(fn) {
    if (_cloudMode) {
      return _db.collection('leads').orderBy('date', 'desc').limit(50).onSnapshot(function (snap) {
        fn(snap.docs.map(d => Object.assign({ id: d.id }, d.data())));
      }, function (err) {
        console.warn('Ronak Computer: could not load enquiries from the cloud (check Firestore rules / sign-in)', err);
        fn(getLeads());
      });
    }
    fn(getLeads());
    return function () {};
  }


  /* ---- Website visitors: every page view on the public site is
     logged to the Firestore "visits" collection (cloud mode only) so
     the admin panel's Visitors tab can show who is visiting. ---- */
  function saveVisit(visit) {
    if (!_cloudMode) return;
    _db.collection('visits').add(visit).catch(function (err) {
      console.warn('Ronak Computer: could not log visit', err);
    });
  }

  function subscribeVisits(fn, limit) {
    if (!_cloudMode) { fn([], false); return function () {}; }
    return _db.collection('visits').orderBy('date', 'desc').limit(limit || 500).onSnapshot(function (snap) {
      fn(snap.docs.map(d => Object.assign({ id: d.id }, d.data())), true);
    }, function (err) {
      console.warn('Ronak Computer: could not load visitors (check Firestore rules / sign-in)', err);
      fn([], false);
    });
  }

  /* ---- Staff roles (Admin / Editor / Viewer), stored in Firestore
     so they can be managed from the Settings → Users tab without
     ever touching code. Not available in local-only mode (no cloud
     database to store them in). ---- */
  function getMyRole(email) {
    if (!_cloudMode || !email) return Promise.resolve(null);
    return _db.collection('admins').doc(email.toLowerCase()).get()
      .then(function (doc) { return doc.exists ? doc.data().role : null; })
      .catch(function () { return null; });
  }

  function subscribeAdmins(fn) {
    if (!_cloudMode) { fn([]); return function () {}; }
    return _db.collection('admins').onSnapshot(function (snap) {
      fn(snap.docs.map(d => Object.assign({ email: d.id }, d.data())));
    }, function (err) {
      console.warn('Ronak Computer: could not load users list', err);
      fn([]);
    });
  }

  function setUserRole(email, role, addedByEmail) {
    if (!_cloudMode) return Promise.resolve(false);
    email = email.trim().toLowerCase();
    return _db.collection('admins').doc(email).set({
      email, role, addedBy: addedByEmail || null, addedAt: new Date().toISOString()
    }).then(() => true).catch(function (err) {
      console.warn('Ronak Computer: could not save user role', err);
      return false;
    });
  }

  function removeUserRole(email) {
    if (!_cloudMode) return Promise.resolve(false);
    return _db.collection('admins').doc(email.toLowerCase()).delete()
      .then(() => true).catch(function (err) {
        console.warn('Ronak Computer: could not remove user', err);
        return false;
      });
  }

  return {
    init, onUpdate, isReady, isCloud,
    getAll, getByCategory, getById, getFeatured,
    save, remove, resetToDefaults, makeId, fmtPrice,
    saveLead, getLeads, subscribeLeads,
    saveVisit, subscribeVisits,
    getMyRole, subscribeAdmins, setUserRole, removeUserRole
  };
})();

TSData.init();
