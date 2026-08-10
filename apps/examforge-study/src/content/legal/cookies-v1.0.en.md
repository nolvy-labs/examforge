---
title: "Cookie and Client Storage Policy"
document: "cookies"
locale: "en"
version: "1.0"
effectiveDate: "2026-08-10"
lastUpdated: "2026-08-10"
-------------------------

# ExamForge Cookie and Client Storage Policy

- **Version:** 1.0
- **Effective date:** August 10, 2026
- **Last updated:** August 10, 2026

## 1. Scope

This Policy explains the HTTP cookies and browser-side storage currently used by ExamForge.

The [Privacy Policy](/legal/privacy) explains how personal data is processed more generally.

`localStorage` is not an HTTP cookie, but it stores information in the browser, so it is documented here for transparency.

## 2. Categories

ExamForge currently uses:

* **Essential storage** for authentication and operation of requested functionality; and
* **Functional storage** for preferences such as the selected language.

ExamForge does not currently intentionally use analytics or marketing cookies.

## 3. Authentication cookies

| Name                         | Purpose                                                 | Type      | Security                                                                    | Lifetime                 |
| ---------------------------- | ------------------------------------------------------- | --------- | --------------------------------------------------------------------------- | ------------------------ |
| `__Secure-examforge_access`  | Authenticates requests to ExamForge                     | Essential | `HttpOnly`, `Secure`, `SameSite=Lax`                                        | Approximately 15 minutes |
| `__Secure-examforge_refresh` | Allows a signed-in session to obtain a new access token | Essential | `HttpOnly`, `Secure`, `SameSite=Lax`, restricted to authentication requests | Approximately 7 days     |

These cookies cannot be read by normal client-side JavaScript because they are configured as `HttpOnly`.

Blocking or deleting them may sign you out or prevent authenticated features from working.

Authentication tokens are not intentionally stored in ExamForge's browser `localStorage`.

## 4. Language preference

ExamForge uses the following language preference storage:

| Name                     | Storage        | Purpose                                                       | Type       | Lifetime                 |
| ------------------------ | -------------- | ------------------------------------------------------------- | ---------- | ------------------------ |
| `examforge-study-locale` | Cookie         | Makes the selected locale available to the server             | Functional | Up to 1 year             |
| `examforge-study-locale` | `localStorage` | Synchronizes and remembers the selected locale in the browser | Functional | Until changed or removed |

The locale cookie uses `SameSite=Lax` and is marked `Secure` in production.

It is intentionally readable by application code because it stores only the selected locale.

## 5. Attempt recovery data

While an examination or practice attempt is in progress, ExamForge may store a local recovery copy using keys in the following form:

`examforge:attempt-draft:v1:<studentId>:<attemptId>`

The stored information may contain:

* attempt and exam-version identifiers;
* student identifier;
* attempt mode;
* locally saved answers;
* synchronization state;
* practice elapsed time;
* update timestamps.

This storage is used to reduce the risk of losing unsynchronized work.

The application removes recovery data when it is no longer required by the relevant attempt flow. Users may also remove it by clearing browser storage, although doing so while an attempt contains unsynchronized changes may cause those local changes to be lost.

## 6. sessionStorage

ExamForge does not currently intentionally rely on `sessionStorage` for the Study application features documented by this Policy.

This section will be updated if that changes.

## 7. Analytics and marketing

ExamForge does not currently intentionally initialize:

* advertising cookies;
* marketing trackers;
* cross-site advertising identifiers;
* behavioral analytics cookies; or
* session-replay technologies.

If non-essential analytics or marketing technologies are introduced, this Policy and the applicable preference mechanism will be updated before such technologies are enabled where consent is required.

## 8. Managing storage

You can delete or block cookies and local storage through your browser.

Deleting essential authentication cookies may sign you out.

Deleting attempt-recovery storage may remove locally saved changes that have not yet synchronized with the server.

Deleting language-preference storage may cause ExamForge to select the language again on a later visit.

## 9. Cookie consent

Because the current implementation uses authentication technologies required for requested functionality and functional locale storage, ExamForge does not treat analytics or marketing tracking as implicitly accepted.

If non-essential tracking technologies are introduced in the future, they must not be enabled merely because a user continues browsing where applicable law requires a separate choice.

## 10. Changes

This Policy will be updated when browser-storage technologies, purposes or relevant configuration materially change.

## 11. Contact

For questions about cookies or browser storage, contact **vy.tranngoclam@gmail.com**.

See also the [Privacy Policy](/legal/privacy).
