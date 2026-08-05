---
title: "Cookie and Client Storage Policy"
document: "cookies"
locale: "en"
version: "1.0"
effectiveDate: "2026-08-05"
lastUpdated: "2026-08-05"
---

# ExamForge Cookie and Client Storage Policy

**Version:** 1.0  
**Effective date:** August 5, 2026  
**Last updated:** August 5, 2026

> **Complete before publication:** inspect actual cookies and browser storage in DevTools and the backend, then replace every `[CONFIRM]` value. Do not publish a cookie name, lifetime, or scope that does not match the deployed configuration.

## 1. What this Policy covers

This Policy explains how ExamForge uses HTTP cookies and browser-side technologies such as `localStorage` and `sessionStorage`. The Privacy Policy more broadly explains how we process personal data.

A cookie is a small item stored by a browser or sent with a request. `localStorage` and `sessionStorage` are not cookies, but they may also store information on a device, so they are disclosed here.

## 2. Categories

- **Essential:** needed for authentication, security, load balancing, or a feature you request. ExamForge cannot disable it through preference controls if you still want to use the relevant feature.
- **Functional:** remembers choices such as language or appearance. It may be disabled, but choices may no longer persist.
- **Analytics:** measures how the Service is used to improve the product. It is enabled only after an appropriate choice where legally required.
- **Marketing:** supports advertising, campaign measurement, or cross-service tracking. The ExamForge MVP does not currently use this category.

## 3. Expected cookies

The inventory below must be reconciled with actual deployed names before publication:

| Name | Provider | Purpose | Category | Duration | Optional? |
|---|---|---|---|---|---|
| `[REFRESH_COOKIE_NAME]` | ExamForge | Maintain the signed-in session and securely obtain a new access token | Essential; `HttpOnly`; `Secure` in production; `SameSite=[CONFIRM]` | `[MATCH REFRESH TOKEN LIFETIME]` | No, if persistent sign-in is requested |
| `[CSRF_COOKIE_NAME, IF ANY]` | ExamForge | Prevent forged requests when cookie authentication is used | Essential | `[CONFIRM]` | No |
| `[HOST/LOAD-BALANCER COOKIE, IF ANY]` | Hosting provider | Route and protect the Service | Essential | `[CONFIRM]` | No |

Access and refresh tokens should not be stored in `localStorage`. If the actual configuration differs, the system should be corrected or this Policy updated after a risk review.

## 4. Expected localStorage and sessionStorage

| Key or key family | Purpose | Category | Duration | Can it be removed/declined? |
|---|---|---|---|---|
| `[LANGUAGE_KEY]` | Remember Vietnamese/English | Functional | Until removed or changed | Yes |
| `[THEME_KEY]` | Remember light/dark/system appearance | Functional | Until removed or changed | Yes |
| `[PROFILE_CACHE_KEY]` | Quickly display basic profile details | Functional | Removed at sign-out; `[TTL IF ANY]` | Yes; the next load may be slower |
| `[ATTEMPT_DRAFT_KEYS]` | Recover answers/progress not yet synchronized | User-requested functional storage | Until synchronized, submitted, abandoned, or `[TTL]` expires | Yes; removal may discard unsynchronized changes |
| `[CONSENT_KEY, IF ANY]` | Store the policy version and category choices | Essential to remember the choice | Until `[TTL]` expires or the policy version changes | Yes, but the prompt will reappear |

Data stored on a device may be visible to another person who shares the same operating-system account or browser profile. Sign out when using a shared device.

## 5. Analytics and marketing

The current MVP is expected not to initialize non-essential analytics, session replay, or marketing cookies. If ExamForge adds PostHog, Google Analytics, or a similar tool, we will update this inventory and block the SDK until a valid choice is obtained where consent is required.

## 6. Managing choices

You may remove cookies and browser storage through browser settings. Blocking essential cookies may prevent authentication, session persistence, or security features from working.

Where ExamForge uses only essential technologies and functional storage requested by the user, the site may not show a consent banner. If non-essential technology is introduced, we will provide “Essential only”, “Accept all”, and “Customize” choices, leave non-essential categories off by default, and allow later changes through **Cookie settings**.

## 7. Policy changes

When technologies, providers, or purposes change, we will update this Policy, its version, and effective date. A material change may cause the preference control to appear again.

## 8. Contact

For questions, contact **[PRIVACY EMAIL]**. See also the [Privacy Policy](/legal/privacy).

