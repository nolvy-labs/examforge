# ExamForge
**ExamForge** is a fullstack exam preparation platform with:

- A **Study Portal** for learners to practice exams across multiple subjects.
- An **Admin Portal** for managing subjects, exams, questions, explanations, and content quality.
- A **.NET backend API** using PostgreSQL as the primary database.
- A **monorepo structure** so frontend, backend, documentation, and deployment configuration stay in one repository.

## Tech Stack

- Backend: .NET
- Database: PostgreSQL
- Study Portal: Next.js
- Admin Portal: Next.js
- DevOps: Docker, GitHub Actions

## Project Structure

```text
.github/
	workflows/
apps/
  examforge-admin/
  examforge-api/
  examforge-study/
docs/
README.md
LICENSE
```