# ExamForge Study Portal

The Study Portal is the ExamForge app for students. It lets them find exams, take practice or timed tests, check their results, and track their progress.

[Open the public preview](https://examforge.io.vn)

> [!NOTE]
> The Study Portal is in pre-production. The preview is publicly accessible, but account access and individual features may change before the first stable release.

## Features

* Browse, search, and filter published exams
* View exam details before starting
* Choose practice or timed exam mode
* Navigate between sections and questions
* Save answers during active attempts
* Recover synchronized attempt state
* Automatically submit timed attempts when time expires
* Review scores, answers, solutions, and explanations
* Continue active attempts from the dashboard
* Browse completed and abandoned attempt history
* View overall and performance statistics
* Render formatted content, LaTeX, tables, code blocks, and external links
* Switch between multiple language

## Technology

| Area                 | Technology                                 |
| -------------------- | ------------------------------------------ |
| Framework            | Next.js 16                                 |
| UI                   | React 19, TypeScript, Tailwind CSS, Shadcn |
| Server state         | TanStack Query                             |
| Client state         | Zustand                                    |
| HTTP                 | Axios                                      |
| Forms and validation | React Hook Form, Zod                       |
| Localization         | next-intl                                  |
| Rich content         | KaTeX, React Markdown, sanitize-html       |
| Charts               | Recharts                                   |
| Testing              | Vitest, Testing Library, MSW               |

## Project structure

```text
apps/examforge-study/
├─ scripts/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ content/
│  │  └─ legal/
│  ├─ features/
│  ├─ i18n/
│  └─ lib/
├─ test/
├─ .env.example
├─ package.json
└─ vitest.config.ts
```

The app is organized around features. This means API functions, hooks, types, and components are grouped directly with the feature they belong to. On the other hand, shared code and infrastructure are kept separate in `src/lib` or shared component directories.

## Prerequisites

* Node.js 24
* npm
* A running ExamForge API

For the complete backend setup, see the [API README](../examforge-api/README.md).

## Environment configuration

Create a local environment file:

```bash
cp .env.example .env.local
```

Available setting:

| Variable              | Required | Description                   |
| --------------------- | -------: | ----------------------------- |
| `NEXT_PUBLIC_API_URL` |      Yes | Base URL of the ExamForge API |

Local example:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5001
```

Use the API origin without adding application endpoint paths. Restart the development server after changing this value.

Because this is a `NEXT_PUBLIC_` variable, its value is included in the frontend build. Set the correct value before creating a production build.

## Local development

From `apps/examforge-study`:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

The default API development origin is `http://localhost:5001`.

## Available scripts

| Command                  | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| `npm run dev`            | Start the Next.js development server                   |
| `npm run lint`           | Run ESLint with zero warnings allowed                  |
| `npm run typecheck`      | Run TypeScript without emitting files                  |
| `npm run test`           | Run the Vitest test suite once                         |
| `npm run legal:validate` | Validate localized legal content                       |
| `npm run build`          | Validate legal content and create a production build   |
| `npm run start`          | Start the production Next.js server                    |
| `npm run check`          | Run lint, type checking, tests, and a production build |

## Testing

Tests are stored in the top-level `test` directory.

```bash
npm run test
```

The test stack includes:

* Vitest
* jsdom
* Testing Library
* `user-event`
* Mock Service Worker

Run the complete local verification pipeline with:

```bash
npm run check
```

## Authentication

The Study Portal communicates with the API using credentialed HTTP requests and automatically attempts session refresh after eligible `401 Unauthorized` responses.

Authentication and authorization rules remain owned by the API. Client-side route protection is a user-experience boundary, not a replacement for server authorization.

Public registration is disabled in production during the initial release. Student accounts are created through the administrative workflow.

## Localization

The portal supports:

* Vietnamese (`vi`)
* English (`en`)

The app stores language choices without updating the URL. Consistent error codes guarantee accurate error messages, with a translated fallback ready for unfamiliar problems.

## Rich content

Exam content can include:

* Formatted text
* Inline and block LaTeX
* Tables
* Code blocks
* External links

Content originating from the admin editor must be rendered through the shared rich-content renderer instead of inserted directly into the DOM.

## Legal content

Versioned legal documents are stored under:

```text
src/content/legal/
```

Legal-content validation runs before every production build. Run it directly with:

```bash
npm run legal:validate
```

Do not bypass this validation when changing Terms of Service, Privacy Policy, or cookie content.

## Production build

Set the production API origin before building:

```dotenv
NEXT_PUBLIC_API_URL=https://api.examforge.io.vn
```

Then run:

```bash
npm ci
npm run build
npm run start
```

The API must allow the exact deployed Study Portal origin through its production CORS configuration.

## Related documentation

* [Project README](../../README.md)
* [API README](../examforge-api/README.md)
* [Project documentation](../../docs/)
