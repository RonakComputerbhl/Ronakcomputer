# Ronak Computer Website

A multi-page website for Ronak Computer (laptops, printers, sales & repair — Suwana, Bhilwara, Rajasthan).

## What's inside

```
index.html        Home page
laptops.html       Laptop catalogue (filter/search/sort + WhatsApp enquiry)
printers.html      Printer catalogue (same features)
services.html      Repair/service info + service booking form
about.html         About the shop
contact.html       Address, map, hours, contact form
admin/index.html   Admin panel (login-protected) — add/edit/delete products
assets/css/        Stylesheets
assets/js/         All site logic + product data
  firebase-config.js  Firebase project keys + TS_BOOTSTRAP_ADMIN_EMAIL (your permanent owner login)
robots.txt         Tells search engines what to crawl
sitemap.xml        List of pages for Google Search Console
```

No build tools, frameworks or installs needed — it's plain HTML/CSS/JS. Anyone on your team can open these files in a text editor (even Notepad) and edit them directly.

---

## 1. Running it on your own computer

Just double-click **index.html** — it opens in your browser and the whole site works, including the admin panel and product filters. No server or internet connection required for this.

For the best experience (and required if you ever add features that fetch files), you can also run a tiny local server:

```
cd ronakcomputer
python -m http.server 8000
```
then open `http://localhost:8000` in your browser.

---

## 2. Publishing it live (so customers can visit it)

Any of these work — pick whichever is easiest for you:

**Option A — Netlify (free, easiest, no technical skill needed)**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the whole `ronakcomputer` folder onto the page
3. Netlify gives you a live link in seconds. You can later connect your own domain name from Netlify's "Domain settings".

**Option B — Your own hosting (GoDaddy, Hostinger, BigRock, etc.)**
1. Buy hosting + a domain name if you don't have one already
2. Open your hosting's File Manager or connect with FTP (e.g. FileZilla)
3. Upload everything inside the `ronakcomputer` folder into the `public_html` (or `www`) folder
4. Visit your domain — the site is live

**Option C — GitHub Pages (free)**
1. Create a GitHub account and a new repository
2. Upload the contents of the `ronakcomputer` folder to it
3. In the repository's Settings → Pages, enable GitHub Pages on the main branch
4. GitHub gives you a live link (custom domain supported too)

### Domain
The site is configured for **https://ronakcomputer.vercel.app/** (canonical links, Open Graph tags, sitemap.xml, robots.txt). Vercel provides HTTPS automatically. In Firebase → Authentication → Settings → **Authorized domains**, add `ronakcomputer.vercel.app`, otherwise Google Sign-In will not work on the admin panel.

---

## 3. The Admin Panel

Open **admin/index.html** (or click "Admin Login" in the website footer).

- **Login is Google Sign-In** — click "Sign in with Google" and choose your Google account.
- **Roles:** there are three levels of access —
  - **Admin** — full access: add/edit/delete products, reset the catalogue, and add/remove other users.
  - **Editor** — can add and edit products, and view enquiries, but can't delete products or manage users.
  - **Viewer** — read-only: can see the product list and enquiries, but no editing.
- One email — Two emails — `ronakcomputerbhl@gmail.com` and `techpoint.chandu@gmail.com` (set in `TS_BOOTSTRAP_ADMIN_EMAILS` in `assets/js/firebase-config.js`) — are the **permanent owner logins** and always has full Admin access, even if something goes wrong with the Users list, so you can never get locked out.
- **To add more staff:** sign in as the owner → **Settings tab → Users** → enter their Gmail address, pick a role (Admin/Editor/Viewer), click **Add User**. No code changes or redeploying needed — it takes effect the next time they sign in. To remove someone, click **Remove** next to their name.
- Once inside, the topbar and the Settings tab show **who is currently signed in** (name, email, photo) — so you always know which account made changes.
- From the **Products** tab you can Add, Edit or Delete any laptop or printer — brand, model, configuration, price, photo and Available/Out of Stock status.
- From the **Enquiries** tab you can see every enquiry submitted through the site — from any visitor, on any device — appearing live, the moment it's submitted (once Cloud Setup below is done). Every enquiry always also goes straight to your WhatsApp — the panel is an extra way to make sure nothing is missed if a customer closes WhatsApp before tapping Send.
- Product photos: upload a photo (under 1.5MB) or paste an image URL. If you leave it blank, a neat placeholder graphic is shown automatically.

### How product data is stored
The site now supports **two modes**, and picks automatically based on whether you've set up Firebase (see "Cloud Setup" below):

- **Not set up yet (default):** Products save to the browser's local storage — same as before. Changes only show up on that one browser/device.
- **Cloud Setup done (this project's current state):** Products save to Firebase Firestore (a free cloud database). Any change in the admin panel — from any device — appears for every visitor within a second or two, with no re-uploading.

One extra one-time step is needed for Google Sign-In to work — see **Step 0** in section 3a below, and make sure your Firestore rules (Step 4) check the signed-in email, not `if true`, so the database itself is protected too, not just the panel's screen.

---

## 3a. Cloud Setup (Firebase) — make admin changes visible to everyone

This connects the admin panel to **Firebase Firestore**, a free cloud database from Google, and to **Firebase Authentication** for Google Sign-In. It takes about 10–15 minutes, no coding needed, and stays free for a small shop site (the free tier covers far more reads/writes/logins than a site like this will ever use).

**Step 0 — Enable Google Sign-In (required for the admin panel login)**
1. In the Firebase console, go to **Build → Authentication → Get started**.
2. Under the **Sign-in method** tab, click **Google**, toggle it **Enable**, pick a support email, and **Save**.
3. Still in Authentication, go to **Settings → Authorized domains** and make sure your live domain (`ronakcomputer.vercel.app`) is listed — `localhost` is already there by default for local testing.
4. Open `assets/js/firebase-config.js` and check `TS_BOOTSTRAP_ADMIN_EMAILS` has your Gmail address(es) — this account always has full Admin access. Add any other staff later from inside the admin panel (Settings → Users) instead of editing this file.

**Step 1 — Create a Firebase project**
1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with any Google account.
2. Click **Add project**, give it any name (e.g. "Ronak Computer"), and finish the setup wizard (you can decline Google Analytics — not needed).

**Step 2 — Create the database**
1. In the left menu, go to **Build → Firestore Database**.
2. Click **Create database**. Choose a location close to India (e.g. `asia-south1 (Mumbai)`).
3. Choose **Start in test mode** for now — this gets you running quickly. (Step 4 below replaces this with a proper permanent rule.)

**Step 3 — Register a web app and get your config**
1. Click the **gear icon → Project settings**.
2. Under "Your apps", click the **`</>`** (Web) icon.
3. Give it any nickname (e.g. "Ronak Computer Website") and click **Register app** — you don't need Firebase Hosting.
4. Firebase shows a code block with a `firebaseConfig` object — copy the values (`apiKey`, `authDomain`, `projectId`, etc.).
5. Open `assets/js/firebase-config.js` in this project and paste your values into `TS_FIREBASE_CONFIG`, replacing the `YOUR_...` placeholders.

**Step 4 — Set the security rules**
1. Back in **Firestore Database → Rules** tab, replace the contents with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       function myRole() {
         return exists(/databases/$(database)/documents/admins/$(request.auth.token.email))
           ? get(/databases/$(database)/documents/admins/$(request.auth.token.email)).data.role
           : null;
       }
       function isAdmin()  { return request.auth != null &&
         (request.auth.token.email == 'ronakcomputerbhl@gmail.com' ||
          request.auth.token.email == 'techpoint.chandu@gmail.com' || myRole() == 'admin'); }
       function isEditor() { return request.auth != null && myRole() == 'editor'; }
       function isViewer() { return request.auth != null && myRole() == 'viewer'; }
       function isStaff()  { return isAdmin() || isEditor() || isViewer(); }

       match /products/{productId} {
         allow read: if true;
         allow create, update: if isAdmin() || isEditor();
         allow delete: if isAdmin();
       }
       match /meta/{docId} {
         allow read: if true;
         allow write: if isAdmin() || isEditor();
       }
       match /leads/{leadId} {
         allow create: if true;
         allow read: if isStaff();
         allow update, delete: if isAdmin();
       }
       match /visits/{visitId} {
         allow create: if true;
         allow read: if isStaff();
         allow update, delete: if isAdmin();
       }
       match /admins/{email} {
         allow read: if isStaff();
         allow write: if isAdmin();
       }
     }
   }
   ```
2. Click **Publish**.

   > **Why this rule?** Everyone can still *read* the catalogue and *create* an enquiry (how customers browse and contact you) — but products/enquiries can only be changed by someone signed in whose email is either the permanent owner account, or listed with a role in the `admins` collection (which you manage from Settings → Users in the admin panel — no need to ever touch this rule text again). Admins get full access; Editors can add/edit but not delete; Viewers can only read. This is enforced by Google's servers, not just hidden in the browser — so it's real security, matching the admin panel's Google Sign-In.

**Step 5 — Test it**
1. Re-upload the whole `ronakcomputer` folder to your hosting (all files changed slightly — Firestore support was added throughout).
2. Open the site on your phone and on your PC at the same time.
3. Log into `/admin/` on one device and edit a product's price.
4. Watch it update on the other device within a second or two, with no refresh needed.

The very first time the site connects to your new Firestore database, it automatically copies in the starter catalogue (the same sample products you see today) — after that, Firestore is the single source of truth everywhere.

If `firebase-config.js` is ever left with the placeholder `YOUR_...` values (e.g. before you've done this setup, or if you want to test offline), the site quietly falls back to the old local-storage behaviour — nothing breaks either way.

---

## 4. WhatsApp Enquiry — how it works

Every product has a "WhatsApp Enquiry" button. When tapped:
1. A small form asks for the customer's name and phone number.
2. Clicking "Continue to WhatsApp" opens WhatsApp (app or web) with a message already written, including: product name, configuration, price, availability, and the customer's name & phone.
3. The customer just hits send — it arrives on your number, **+91 76108 65661**.

The Services page has a similar form for repair bookings, and the Contact page has one for general messages — both do the same thing (open WhatsApp with the details filled in).

To change the WhatsApp number, open `assets/js/main.js` and edit the `phoneWa` value near the top (country code + number, no spaces or `+`).

---

## 5. SEO — getting found on Google

The site already has these SEO foundations built in:
- Unique, keyword-rich `<title>` and description on every page (e.g. "laptop shop Bhilwara", "printer repair Bhilwara", brand names)
- Open Graph tags so your logo and a description show up when the link is shared on WhatsApp/Facebook
- `LocalBusiness`/`ElectronicsStore` structured data (JSON-LD) with your address, phone and hours — this is what helps Google show your shop details directly in search results
- `robots.txt` and `sitemap.xml` so Google knows what to crawl
- Your logo set as the site favicon (shows next to your site name in browser tabs and some search results)

To actually appear in Google search results, after publishing:
1. Create a **Google Business Profile** (free) for Ronak Computer with your address, phone, hours and photos — this is the single biggest factor in local search ("laptop shop near me" type searches) and is how your logo/listing appears in Google Maps and the search side panel.
2. Go to **Google Search Console** (search.google.com/search-console), add your live domain, verify ownership, and submit `https://yourdomain.com/sitemap.xml`.
3. Keep the product prices and stock status up to date — fresh, accurate content is favoured by search engines.
4. Once you have real product photos, replace the placeholder images through the admin panel — real photos help both SEO and customer trust.

---

## 6. Editing content

- **Shop details** (phone, address, hours, email, Facebook link): edit the `TS_CONFIG` object at the top of `assets/js/main.js`, plus the footer text repeated in each HTML file.
- **Colors/fonts**: all defined as CSS variables at the top of `assets/css/style.css` (`:root { ... }`) — change them once, and they apply everywhere.
- **Starter products**: `assets/js/products-data.js` → `TS_DEFAULT_PRODUCTS` array (only affects new/reset browsers — see Admin Panel section above).
- **Logo**: replace `assets/img/logo.png` with a new file of the same name to update it everywhere in one go.

---

## 7. Browser support & responsiveness

Tested layout patterns for phones, tablets and desktops (breakpoints at 940px, 860px, 640px, 600px, 520px). Works in all modern browsers (Chrome, Edge, Safari, Firefox). No Internet Explorer support.


---

## 8. Visitors tab (who is visiting the website)

Admin panel → **Visitors** tab shows, live: people online in the last 5 minutes, views and unique visitors today, most visited pages, and a list of recent visits (time, page, approximate city/country, device/browser/OS, traffic source, new vs returning).

- Every public page logs one visit per browser session to the Firestore `visits` collection (see `ts_trackVisit()` in `assets/js/main.js`).
- No IP address, name or phone number is stored — only approximate location from a free geo-IP lookup (ipapi.co).
- Visits from a browser where you have logged into the admin panel are not counted.
- **Required:** publish the updated rules from `firestore.rules` (it adds the `visits` section) in Firebase → Firestore → Rules, or the Visitors tab will stay empty.
