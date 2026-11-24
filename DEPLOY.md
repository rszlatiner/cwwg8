# Putting the Creative Writing Studio online (about 20 minutes, free tier is enough)

The site is plain HTML/JS. It runs in **demo mode** (saves in one browser only) until you connect Firebase.

## 1. Try it first
Open `index.html` in a browser. Tutor login: `tutor` / `tutor`. Class code: `WRITE2026`.

## 2. Create the Firebase project
1. Go to console.firebase.google.com → **Add project** (any name; Analytics off).
2. **Build → Authentication → Get started.** Enable **Email/Password** and **Google**.
3. **Build → Firestore Database → Create database** (production mode, a region near Vietnam such as `asia-southeast1`).
4. **Project settings → Your apps → Web (</>)** → register an app. Copy the `firebaseConfig` values.
5. Open `js/config.js`; replace `firebase: null` with your config:
   `firebase: { apiKey:"…", authDomain:"…", projectId:"…", appId:"…" }`
   (These values are public identifiers, not secrets. The security rules protect the data.)

## 3. Security rules
Firestore → **Rules** → paste the contents of `firestore.rules` → **Publish**.

## 4. Make yourself the tutor
1. In Firebase: Authentication → **Users → Add user** (your email + a password).
2. Copy your **User UID** from Authentication → Users.
3. Firestore → **Start collection** `admins` → Document ID = your UID → add any field (e.g. `tutor: true`).
4. Firestore → collection `settings` → document `class` → field `code` (string) = the class code you will give students (e.g. `WRITE-8B-2026`).
5. Firestore → `settings` → document `public` → field `currentWeek` (number) = 1.
6. On the site you will now see the Tutor dashboard. Set the class week there each week to open new lessons.

Tutor sign-in: type your full email address in the Username box (or use Google if you signed in with it and used that UID).

## 5. Publish
Option A, Firebase Hosting: `npm i -g firebase-tools && firebase login && firebase init hosting` (public dir `.`, don't overwrite files) then `firebase deploy`. You get `https://YOUR-PROJECT.web.app`.
Option B, Netlify Drop / GitHub Pages / Cloudflare Pages: upload this whole folder (without tests/).
Then Authentication → Settings → **Authorized domains** → add your site's domain if it is not Firebase's.

## 6. Give students
The link, and the class code. They create a username/password, or press **Google** after typing the class code.

## What it can and cannot do
- Blocks paste/drop/right-click and browser spell/grammar helpers inside writing boxes, and records typing patterns (paste attempts, big insertions, time away, speed). The tutor sees a Clear / Check / Review flag per piece.
- It **cannot** stop a student using AI on a phone or another tab and typing the result in. The flags and your own reading are the real safeguard.
- Scores are rubric-based craft checks (sensory detail, sentence variety, strong verbs, etc.), not judgement of quality. You can override any score and add a comment.
- Scores are computed in the student's browser, so a technically skilled student could alter their own stored score; your reviewed score is what counts.
- Later upgrade: AI feedback through a small server (Cloudflare Worker) holding an API key.
