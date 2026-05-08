# Expense Tracker — Complete Feature Walkthrough & Project Blueprint

> **Project Type:** React Native Mobile App (Android first)
> **Architecture Philosophy:** Local-first, offline-capable, modular
> **Target Distribution:** GitHub APK (beta) → Google Play Store (production)
> **Budget:** Zero ongoing cost. One-time $25 Play Console fee when ready.

---

## Table of Contents

1. [Core Product Decisions](#core-product-decisions)
2. [Phase 1 — MVP Features (v1.0)](#phase-1--mvp-features-v10)
3. [Phase 2 — Google Sign-In (v1.1)](#phase-2--google-sign-in-v11)
4. [Phase 3 — Cloud Backup via Google Drive (v1.2)](#phase-3--cloud-backup-via-google-drive-v12)
5. [Phase 4 — SMS Parsing (v1.3)](#phase-4--sms-parsing-v13)
6. [Phase 5 — Monetization Layer (v2.0)](#phase-5--monetization-layer-v20)
7. [Future Features (Backlog)](#future-features-backlog)
8. [Technical Decisions & Constraints](#technical-decisions--constraints)
9. [Distribution Strategy](#distribution-strategy)
10. [Cost Breakdown](#cost-breakdown)
11. [Critical Reminders & Gotchas](#critical-reminders--gotchas)

---

## Core Product Decisions

These were decided during the planning phase and everything below flows from them.

| Decision       | Choice                                                                       |
| -------------- | ---------------------------------------------------------------------------- |
| Data strategy  | **Offline-first.** Local DB is the single source of truth.                   |
| Cloud strategy | **Google Drive backup** (user's own storage, zero server cost).              |
| Sync model     | **Single device with backup/restore.** Not real-time multi-device sync.      |
| Authentication | **Google Sign-In** (mandatory for backup, optional for core app use).        |
| Backend        | **Designed now, deployed later.** Vercel (serverless) + Supabase (Postgres). |
| SMS reading    | **Designed into architecture from day 1**, shipped in a later phase.         |
| Monetization   | **Decided later**, but architecture accounts for freemium gating.            |
| Distribution   | **GitHub APK first** (no Play Store restrictions), Play Store later.         |

---

## Phase 1 — MVP Features (v1.0)

> **Goal:** A fully functional, offline expense tracker. No internet required. Ship to GitHub as APK.

### 1.1 Expense Entry (Manual)

- Add an expense with: **amount**, **category**, **date**, **note** (optional), **payment method** (cash / UPI / card / bank transfer).
- Edit an existing expense.
- Delete an expense (with confirmation).
- Every expense record includes a `source` field: `"manual"` for now. This field exists so that SMS-parsed expenses (`"sms"`) can coexist later without any schema changes.

### 1.2 Quick Entry Shortcuts

> This is the UX substitute for SMS parsing in v1 — designed to reduce manual effort to near-zero for common expenses.

- **Recurring expenses:** User can set up expenses that repeat daily/weekly/monthly (rent, subscriptions, EMIs). The app auto-creates these entries.
- **Favorite merchants:** User saves frequent merchants with pre-filled category and average amount. One tap to log "Swiggy ₹250 Food" instead of filling the full form.
- **Recent amounts:** The amount input suggests recently used amounts for the selected category.
- **Smart defaults:** The app remembers the last used category and payment method and pre-selects them.

### 1.3 Categories

- Pre-built default categories: Food, Transport, Rent, Utilities, Entertainment, Shopping, Health, Education, Subscriptions, Other.
- User can **create custom categories** with a name and icon/color.
- User can **edit or delete** custom categories (deleting reassigns expenses to "Other").
- Categories have an icon and a color for visual distinction in charts and lists.

### 1.4 Dashboard / Home Screen

- **Current month summary:** Total spent, broken down by category.
- **Daily spending:** A visual indicator of today's spending.
- **Budget status** (if budgets are set — see 1.5).
- **Recent transactions:** Last 10–15 expenses as a scrollable list.
- Quick action button (FAB) to add a new expense.

### 1.5 Budgets

- Set a **monthly budget** (overall).
- Set **per-category budgets** (optional).
- Visual progress bars showing how much of each budget is consumed.
- **Warning threshold:** When spending hits 80% of budget, show an in-app alert/banner. (This is a local notification, no push notification server needed.)

### 1.6 Reports & Charts

- **Monthly summary:** Total expenses, category-wise breakdown (pie/donut chart).
- **Weekly summary:** Day-by-day bar chart for the current/selected week.
- **Trend view:** Month-over-month spending line chart (last 6 months).
- **Category drill-down:** Tap a category in the pie chart to see all expenses in that category for the selected period.
- Date range filter: View reports for any custom date range.

### 1.7 Search & Filter

- Search expenses by **note text** or **merchant name**.
- Filter by: category, payment method, date range, amount range.
- Sort by: date (newest/oldest), amount (high/low).

### 1.8 Data Export

- Export all expenses (or filtered set) as **CSV**.
- Export is a local file saved to the device's Downloads folder.
- This is independent of cloud backup — it's a user-facing "download my data" feature.

### 1.9 Settings

- Currency selection (default: INR ₹).
- Date format preference.
- Theme: Light / Dark / System default.
- Manage categories.
- Manage recurring expenses.
- About / version info.

### 1.10 Onboarding

- First-launch walkthrough (3–4 screens max): what the app does, quick entry shortcuts, optional Google sign-in prompt.
- Skip option — user can dive straight in without signing in.

---

## Phase 2 — Google Sign-In (v1.1)

> **Goal:** Establish user identity. No backend required. Prepares the pipeline for Drive backup.

### 2.1 Google Sign-In Flow

- "Sign in with Google" button on the settings screen and in onboarding (optional, never forced).
- Uses `@react-native-google-signin/google-signin`.
- On success, store locally: Google user ID, display name, email, profile photo URL.
- The Google ID becomes the unique user identifier in the local DB.

### 2.2 Profile Section

- Small profile card in settings showing name, email, and photo.
- Sign-out option (clears auth tokens, does NOT delete local expense data).

### 2.3 What Sign-In Unlocks

- In v1.1: Nothing functional yet. It's a preparatory step.
- In v1.2: Enables Google Drive backup.
- In v2.0+: Enables premium feature validation, cross-device restore.

### 2.4 Unsigned User Experience

- **The app is fully functional without sign-in.** No feature is gated behind auth in this phase.
- Periodic gentle nudge: "Sign in to enable cloud backup" — dismissable and non-intrusive.

---

## Phase 3 — Cloud Backup via Google Drive (v1.2)

> **Goal:** Zero-cost cloud backup using the user's own Google Drive storage.

### 3.1 How It Works

- App serializes the local SQLite database into a JSON file.
- JSON file is uploaded to the user's Google Drive **App Data folder** (`drive.appdata` scope).
- App Data folder is hidden from the user's normal Drive view — only your app can read/write it.
- On restore, the JSON file is downloaded and deserialized back into the local database.

### 3.2 Backup Features

- **Manual backup:** "Back up now" button in settings. Shows last backup timestamp.
- **Auto backup (later / premium?):** Daily automatic backup when on Wi-Fi. Could be a premium-only feature.
- Backup file includes: all expenses, categories, budgets, settings, recurring expense configs.
- Backup file is a single JSON file. Estimated size for a year of data: 1–2 MB.

### 3.3 Restore Features

- "Restore from backup" button in settings.
- On restore, user chooses: **Replace** local data (wipe and restore) or **Merge** (add missing entries, skip duplicates based on a unique expense ID).
- Restore is available on fresh install: sign in with Google → detect existing backup → prompt to restore.

### 3.4 Encryption (Recommended)

- Before uploading, encrypt the JSON file with a key derived from the user's Google ID + a salt.
- This means even if someone gains access to the user's Drive, the backup file is unreadable without the app.
- Use AES-256 encryption via `react-native-crypto` or similar.

### 3.5 Error Handling

- If Drive is full: show clear error message, never lose local data, suggest freeing Drive space.
- If network fails mid-upload: retry with exponential backoff, max 3 retries, then notify user.
- If backup file is corrupted on download: detect via checksum, notify user, keep local data intact.

### 3.6 Important Limitations (Communicate to Users)

- This is **backup/restore, not sync.** If you use two phones, only the last backup wins.
- Backup is tied to the Google account — switch accounts and you won't see old backups.
- Uninstalling the app may or may not clear the App Data folder (behavior varies by Android version). Users should manually back up before uninstalling.

---

## Phase 4 — SMS Parsing (v1.3)

> **Goal:** Auto-detect expenses from bank SMS messages. Android only.

### 4.1 How It Works

- App requests `READ_SMS` permission at runtime.
- Listens for incoming SMS (or reads recent SMS history) from known bank sender IDs.
- Parses the message using regex patterns to extract: amount, merchant/description, account type (credit/debit/savings), transaction type (debited/credited), date.
- Creates an expense entry with `source: "sms"` and links to the original message.

### 4.2 Parser Design

- A parser library with per-bank templates. Each template is a regex pattern + extraction logic.
- Common Indian bank SMS senders to support initially: SBI, HDFC, ICICI, Axis, Kotak, IDFC, Paytm Payments Bank, PhonePe.
- UPI transaction messages (common format across banks).
- The parser is a separate module — easy to update without touching core app logic.

### 4.3 User Experience

- Parsed expenses appear in a **"Review" queue** — the user confirms or edits before they're saved to the main expense list.
- User can auto-assign categories to merchants (e.g., "Swiggy" → always "Food").
- User can mark a sender or message as "ignore" to skip non-expense SMS.
- Toggle: Enable/disable SMS reading entirely from settings.

### 4.4 Permission & Distribution Notes

- **GitHub APK:** No restrictions. Just request the runtime permission, user approves, done.
- **Play Store:** Requires Permissions Declaration Form submission. Approval is not guaranteed. If rejected, ship Play Store version without SMS parsing, and maintain GitHub APK as the full-featured version.

---

## Phase 5 — Monetization Layer (v2.0)

> **Goal:** Generate revenue. Exact model TBD, but architecture supports freemium from day 1.

### 5.1 Possible Premium Features (To Be Decided)

- Auto daily backup (free: manual only).
- Advanced reports and analytics (spending predictions, trends, comparisons).
- Multiple budget profiles.
- Receipt photo attachment to expenses.
- Custom themes / app icons.
- Ad removal (if ads are added to the free tier).
- CSV/PDF export with detailed formatting.

### 5.2 Payment Integration

- **Play Store version:** Google Play Billing for subscriptions/one-time purchases.
- **GitHub APK version:** Razorpay / Stripe / UPI deep links as alternatives.

### 5.3 Architecture Considerations

- A `userTier` field (`"free"` or `"premium"`) stored locally and validated via backend (when deployed).
- Feature flags system: each premium feature checks `userTier` before rendering.
- Backend (Vercel + Supabase) deployed in this phase to handle purchase receipt validation and subscription status.

---

## Future Features (Backlog)

These are not planned for any specific phase but are worth keeping in mind during architecture design.

| Feature                     | Notes                                                                   |
| --------------------------- | ----------------------------------------------------------------------- |
| Multi-currency support      | Useful for travelers. Requires exchange rate API.                       |
| Shared budgets              | Share a budget with a partner/roommate. Needs backend + sync.           |
| Receipt scanning (OCR)      | Camera → extract amount + merchant. ML-heavy, Phase 3+.                 |
| Push notification reminders | "You haven't logged expenses today." Needs backend or local scheduling. |
| Widgets                     | Android home screen widget showing today's spending.                    |
| Bank integration (API)      | Direct bank feeds via Account Aggregator APIs. Complex, regulated.      |
| Web dashboard               | View expenses on desktop. Needs backend + web app.                      |
| Multi-device real-time sync | Replace Drive backup with proper sync. Major architecture shift.        |

---

## Technical Decisions & Constraints

### Stack

| Layer            | Technology                                                |
| ---------------- | --------------------------------------------------------- |
| Framework        | React Native (Expo or bare workflow — TBD during HLD)     |
| Language         | JavaScript (TypeScript migration possible later)          |
| Local database   | SQLite (via `expo-sqlite` or `react-native-quick-sqlite`) |
| State management | TBD during LLD (MobX, Zustand, or React Query likely)     |
| Auth             | `@react-native-google-signin/google-signin`               |
| Drive API        | Google Drive REST API via `fetch` with OAuth2 tokens      |
| Charts           | `react-native-chart-kit` or `victory-native`              |
| Navigation       | React Navigation                                          |
| Backend          | Node.js serverless functions on Vercel                    |
| Database (cloud) | Supabase free-tier Postgres                               |

### Architecture Principles

1. **Local DB is the single source of truth.** Cloud backup is a snapshot, not a sync layer.
2. **Separation of concerns.** Auth, local data, cloud backup, and SMS parsing are independent modules. Each can be built, tested, and shipped independently.
3. **Feature flags from day 1.** Every feature checks a flag before rendering. This enables premium gating, A/B testing, and gradual rollout.
4. **Source-agnostic expenses.** Every expense has a `source` field (`manual`, `sms`, `recurring`). The rest of the app doesn't care where the expense came from.
5. **API service abstraction.** Networking layer uses a clean interface so switching from mocked responses to a real backend is a URL change, not a rewrite.

---

## Distribution Strategy

### Phase A — GitHub APK (Beta)

- Build APK, host on GitHub Releases.
- No Play Store restrictions. Full features including SMS reading.
- Target audience: Friends, family, tech-savvy early adopters, Reddit/Twitter communities.
- In-app update checker: Hit GitHub Releases API → compare version → prompt user to download new APK.
- **No Play Billing.** Monetization via Razorpay/UPI if needed.

### Phase B — Play Store (Production)

- Submit to Google Play once the app is stable and has user feedback.
- Apply for SMS permission via Permissions Declaration Form.
- If SMS permission approved → full feature parity with GitHub version.
- If SMS permission denied → Play Store version ships without SMS parsing. GitHub APK remains the "power user" version.
- One-time $25 Google Play Console developer fee.

### Both Channels

- Maintain a single codebase. Use build flavors or environment flags to toggle features per distribution channel.
- Same signing keystore for both (critical — see reminders below).

---

## Cost Breakdown

### v1.0 — MVP

| Item                          | Cost   |
| ----------------------------- | ------ |
| React Native + libraries      | Free   |
| Local SQLite storage          | Free   |
| GitHub hosting for APK        | Free   |
| Privacy policy (GitHub Pages) | Free   |
| **Total**                     | **₹0** |

### v1.1–v1.2 — Auth + Drive Backup

| Item                            | Cost   |
| ------------------------------- | ------ |
| Google Cloud Console (OAuth)    | Free   |
| Google Drive API (user's quota) | Free   |
| **Total**                       | **₹0** |

### v2.0 — Backend + Monetization

| Item                        | Cost                    |
| --------------------------- | ----------------------- |
| Vercel serverless functions | Free (100K invocations) |
| Supabase Postgres           | Free (500MB)            |
| Google Play Console         | ₹2,100 one-time (~$25)  |
| **Total ongoing**           | **₹0/month**            |

---

## Critical Reminders & Gotchas

These are things that will bite you if you forget them. Read this section before starting each phase.

### Keystore Management (Do This BEFORE Your First Build)

- Generate a release keystore on day 1: `keytool -genkey -v -keystore expense-tracker-release.keystore -alias expense-tracker -keyalg RSA -keysize 2048 -validity 10000`
- **Store the keystore file, alias, and passwords in at least 2 secure places** (password manager + encrypted cloud storage).
- Use the SAME keystore for GitHub APK and future Play Store uploads.
- **If you lose this keystore, existing users cannot update the app.** They'd have to uninstall and reinstall, losing all local data. This is not recoverable.

### Google OAuth Consent Screen Verification

- When you request the `drive.appdata` scope, Google requires your OAuth consent screen to be verified.
- This involves: submitting a privacy policy URL, describing your app's use of Drive data, and potentially a security audit (CASA Tier 2).
- **Start this process at the beginning of Phase 3, not at the end.** It can take 3–6 weeks.
- You can use "Testing" mode (limited to 100 test users) during development without verification.

### Play Store SMS Permission Review

- `READ_SMS` is a restricted permission on Google Play.
- You must submit a Permissions Declaration Form explaining why your app needs it.
- Google may reject your request. Have a fallback plan (ship without SMS on Play Store).
- This review is separate from the normal app review and can take additional weeks.

### Database Schema — Get It Right Early

- The local SQLite schema is the foundation everything else builds on. Backup serializes it, SMS parser writes to it, reports query it.
- Include `created_at`, `updated_at`, `source`, and a UUID `id` field on every table from day 1.
- Add a `schema_version` field in a metadata table. This enables database migrations when you update the schema in future versions.

### Android-Specific Gotchas

- Test on Android 10+ (API 29+). Scoped storage rules changed significantly in Android 10 and affect file exports.
- `READ_SMS` permission behavior varies slightly across Android versions and OEM skins (Samsung, Xiaomi, etc.). Test on multiple devices.
- Background SMS listeners may be killed by aggressive battery optimization on Chinese OEM phones (Xiaomi, Oppo, Realme). Users may need to whitelist the app manually.

---

_Last updated: April 2026_
_Status: Planning complete. Ready for system design (HLD + LLD)._
