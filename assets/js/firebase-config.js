/* ============================================================
   Ronak Computer — Firebase connection settings
   ------------------------------------------------------------
   This is what makes admin panel changes show up for EVERY
   visitor, on every device, instantly — instead of only on
   the one browser that made the change.

   HOW TO FILL THIS IN (free, ~5 minutes):
   See README.md → "Cloud Setup (Firebase)" for full step-by-step
   instructions with screenshotable steps. Short version:
     1. Go to https://console.firebase.google.com → Add project
     2. Build → Firestore Database → Create database (Start in
        test mode is fine to begin with) → pick a region
     3. Project settings (gear icon) → General → "Your apps" →
        click the </> (Web) icon → register an app (any nickname)
     4. Firebase shows you a firebaseConfig object — copy those
        values into TS_FIREBASE_CONFIG below.
     5. Set Firestore's Rules (Firestore Database → Rules tab) as
        shown in the README, then click "Publish".

   Until you fill in real values below, the site automatically
   keeps working exactly as before (each browser's own local
   storage) — nothing breaks, it just won't sync between devices
   yet.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAbieA6bu9xusMUJ3dtkTZzD95WXPSMbWk",
  authDomain: "ronakcomputer-006.firebaseapp.com",
  projectId: "ronakcomputer-006",
  storageBucket: "ronakcomputer-006.firebasestorage.app",
  messagingSenderId: "548541834956",
  appId: "1:548541834956:web:1617a74f53a6e7bf128469",
  measurementId: "G-E1QG77XW9J"
};

/* ============================================================
   Ronak Computer — Bootstrap owner account
   ------------------------------------------------------------
   This one email always has full Admin access, no matter what —
   even if the "admins" list in Firestore is empty, broken, or
   this email hasn't been added to it. This is your permanent
   safety net so you can never get locked out of your own admin
   panel. Everyone else's access (Admin / Editor / Viewer) is
   managed from the Settings → Users tab inside the admin panel
   itself, once you're signed in.
   ============================================================ */
const TS_BOOTSTRAP_ADMIN_EMAILS = [
  "ronakcomputerbhl@gmail.com",
  "techpoint.chandu@gmail.com"
];
// Kept for backward compatibility (first owner email)
const TS_BOOTSTRAP_ADMIN_EMAIL = TS_BOOTSTRAP_ADMIN_EMAILS[0];
function ts_isOwnerEmail(email) {
  return TS_BOOTSTRAP_ADMIN_EMAILS.some(e => e.toLowerCase() === String(email || '').toLowerCase());
}
