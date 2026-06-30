# ExamForge Project Planning

## 1. Project Summary

**ExamForge** is a multi-subject exam preparation platform. The product allows learners to practice structured question sets, review explanations, track progress, and improve exam readiness. Administrators can manage subjects, exams, questions, choices, explanations, tags, and content status through a dedicated admin portal.

## 2. Product Goals

### 2.1 Primary Goals

- Build a working MVP that supports exam practice across multiple subjects.
- Provide a clean admin workflow for creating and maintaining question content.
- Design a backend that is modular, testable, and extensible.
- Use PostgreSQL relational modeling instead of storing all exam data as unstructured JSON.
- Demonstrate production-minded engineering practices: CI, migrations, seed data, validation, error handling, logging, and tests.

### 2.2 Secondary Goals

- Support future expansion into timed mock exams, analytics, question import/export, AI-assisted explanations, and adaptive practice.
- Keep the architecture simple enough to finish, but structured enough to scale.
- Make the GitHub repository easy for recruiters or reviewers to inspect.

## 3. Target Users

### 3.1 Learners

Learners use the Study Portal to:

- Browse available subjects and exams.
- Start practice sessions.
- Answer questions.
- Submit sessions.
- Review score, correct answers, and explanations.
- Track basic progress over time.

### 3.2 Admins

Admins use the Admin Portal to:

- Create and update subjects.
- Create and update exams.
- Manage exam sections.
- Create, update, archive, and publish questions.
- Manage choices and explanations.
- Review content quality before publication.

## 4. MVP Scope

### 4.1 In Scope

- Email/password authentication.
- Role-based authorization: `Student`, `Admin`.
- Tag management.
- Category management.
- Exam management.
- Question management.
- Filling and multiple-choice questions.
- Practice session creation.
- Answer submission.
- Score calculation.
- Review page with explanations.
- Basic user progress dashboard.
- Multi version exam
- Admin content status workflow: `Draft`, `Published`, `Archived`.
- Swagger/OpenAPI documentation.
- GitHub Actions for build/test checks.

### 4.2 Out of Scope for MVP

- Payment/subscription system.
- Google auth
- Real-time multiplayer or classroom mode.
- AI-generated questions.
- Full adaptive learning engine.
- Native mobile app.
- Complex analytics dashboard.
- Question bank marketplace.
- Video lessons.
- Essay grading.

These can be revisited after the MVP is stable.

## 5. Success Criteria

The MVP is successful when:

- A new user can register, log in, browse categories, start a practice session, answer questions, submit, and review results.
- An admin can create a subject, create an exam, add questions, publish them, and make them visible to learners.
- The backend API has validation, consistent error responses, and role-based protection.
- The database schema is normalized, migrated, and seeded with sample data.
- The project can be run locally with documented commands.
- CI runs backend tests and frontend checks on pull requests.

## 6. Technical Stack

### 6.1 Backend

- **Framework:** ASP.NET 10 Core Web API
- **Language:** C#
- **Architecture:** Clean Architecture
- **ORM:** Entity Framework Core
- **Database:** PostgreSQL
- **Validation:** FluentValidation or built-in ASP.NET validation
- **API Docs:** Swagger/OpenAPI
- **Authentication:** JWT access token + refresh token
- **Testing:** xUnit, FluentAssertions, Testcontainers or integration test database

### 6.2 Frontend

- **Framework:** Next.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS or component library selected later
- **State/Data Fetching:** TanStack Query or server actions depending on final frontend approach
- **Forms:** React Hook Form + Zod
- **Apps:** Separate Study Portal and Admin Portal

### 6.3 Infrastructure

- **Database:** Neon PostgreSQL
- **Backend deployment:** Render, Railway, Fly.io, VPS, or similar
- **Frontend deployment:** Vercel
- **CI/CD:** GitHub Actions
- **Secrets:** GitHub Environments + hosting provider environment variables

## 7. Proposed Monorepo Structure

```txt
examforge/
├── apps/
│   ├── study-web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   └── package.json
│   └── admin-web/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── lib/
│       └── package.json
├── backend/
│   ├── ExamForge.Api/
│   ├── ExamForge.Application/
│   ├── ExamForge.Domain/
│   ├── ExamForge.Infrastructure/
│   └── ExamForge.Tests/
├── docs/
└── .github/
    └── workflows/
```

## 8. Backend Architecture

### 8.1 Layer Responsibilities

| Layer | Responsibility |
|---|---|
| `ExamForge.Api` | Controllers, authentication middleware, request/response mapping, Swagger, API entry point. |
| `ExamForge.Application` | Use cases, DTOs, validation, interfaces, application services. |
| `ExamForge.Domain` | Core entities, value objects, enums, domain rules. No EF Core dependency. |
| `ExamForge.Infrastructure` | EF Core DbContext, repositories, external services, persistence implementation. |
| `ExamForge.Tests` | Unit tests and integration tests. |

### 8.2 Dependency Direction

```txt
Api -> Application -> Domain
Api -> Infrastructure -> Application
Infrastructure -> Domain
```

The `Domain` layer should not depend on ASP.NET Core, EF Core, PostgreSQL, or frontend concerns.

## 9. Frontend Application Boundaries

### 9.1 Study Portal

The Study Portal focuses on learner workflows:

- Authentication
- Subject browsing
- Exam browsing
- Practice session
- Result review
- Progress dashboard
- Bookmarks, later phase

### 9.2 Admin Portal

The Admin Portal focuses on content operations:

- Authentication
- Admin dashboard
- Subject management
- Exam management
- Section management
- Question management
- Content status management
- Audit log viewer, later phase

## 10. Development Milestones

### Milestone 1 — Foundation

- Create monorepo.
- Create backend solution and projects.
- Create Study Portal and Admin Portal apps.
- Add Docker Compose PostgreSQL.
- Configure environment variables.
- Add basic GitHub Actions.
- Add initial documentation.

### Milestone 2 — Backend Core

- Implement database schema.
- Add EF Core migrations.
- Add seed data.
- Implement authentication and role-based authorization.
- Implement subject, exam, section, and question APIs.
- Add Swagger documentation.

### Milestone 3 — Study MVP

- Implement registration/login.
- Implement subject and exam browsing.
- Implement practice session flow.
- Implement answer submission.
- Implement result review.
- Implement basic progress dashboard.

### Milestone 4 — Admin MVP

- Implement admin login.
- Implement subject CRUD.
- Implement exam CRUD.
- Implement question CRUD.
- Implement publish/archive workflow.
- Add validation and user feedback.

### Milestone 5 — Quality and Deployment

- Add backend unit tests.
- Add integration tests for critical APIs.
- Add frontend lint/typecheck/build checks.
- Deploy backend and database.
- Deploy Study Portal and Admin Portal.
- Update root README with screenshots, architecture, setup guide, and demo links.

## 11. Branching Strategy

Recommended simple workflow:

- `main`: stable branch, deployable.
- `develop`: optional integration branch if the project grows.
- `feature/<area>-<description>`: feature work.
- `fix/<area>-<description>`: bug fixes.
- `docs/<description>`: documentation updates.

For a solo project, using `main` plus feature branches is enough.

## 12. GitHub Project Board Columns

Recommended columns:

1. `Backlog`
2. `Ready`
3. `In Progress`
4. `Review`
5. `Done`

Recommended issue labels:

- `backend`
- `frontend`
- `study-portal`
- `admin-portal`
- `database`
- `api`
- `docs`
- `testing`
- `devops`
- `bug`
- `enhancement`
- `mvp`

## 13. Engineering Standards

### 13.1 API Standards

- Use RESTful naming.
- Use plural nouns: `/subjects`, `/exams`, `/questions`.
- Use DTOs instead of exposing database entities directly.
- Use consistent pagination.
- Use consistent error response format.
- Protect admin routes with role-based authorization.

### 13.2 Database Standards

- Use UUID primary keys.
- Use `created_at`, `updated_at`, and optional `deleted_at` where relevant.
- Prefer soft archive for content instead of hard delete.
- Add indexes for foreign keys, slugs, and commonly filtered fields.
- Avoid storing core relational data only as JSONB unless there is a clear reason.

### 13.3 Frontend Standards

- Keep feature-specific code inside `features/`.
- Keep shared UI inside `components/`.
- Centralize API client configuration.
- Use typed request/response contracts.
- Do not duplicate business rules across pages unnecessarily.

## 14. Main Risks

| Risk | Impact | Mitigation |
|---|---:|---|
| Scope creep | High | Keep MVP checklist strict. Move advanced features to later phases. |
| Admin UI takes too long | Medium | Start with simple forms and tables. Avoid over-designing. |
| Practice session logic becomes messy | High | Model session, session questions, and answers explicitly. Add tests. |
| Database schema changes frequently | Medium | Use migrations and seed scripts from the start. |
| Auth consumes too much time | Medium | Start with standard JWT + role claims. Avoid OAuth in MVP. |
| Two portals increase frontend workload | Medium | Share UI patterns and API client code where practical. |

## 15. Future Enhancements

After MVP:

- Timed mock exams.
- Question difficulty analytics.
- Weak-topic recommendation.
- Admin bulk import from CSV/Excel.
- Rich text explanations.
- Image/audio-based questions.
- User bookmarks.
- User notes.
- Leaderboard.
- AI-assisted explanation drafting.
- Adaptive practice mode.
- Public landing page.

