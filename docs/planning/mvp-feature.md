# ExamForge MVP Feature Checklist

This checklist defines the minimum feature set required for the first usable version of ExamForge.

## 1. Foundation

### Repository and Project Setup

- [x] Create GitHub repository.
- [x] Add root `README.md`.
- [x] Add `docs/` directory.
- [x] Add `.gitignore`.
- [ ] Add `.editorconfig`.
- [ ] Add GitHub Actions workflow.
- [ ] Add issue labels.
- [ ] Add GitHub Project board.


### Local Development

- [x] Backend can run locally.
- [ ] Study Portal can run locally.
- [ ] Admin Portal can run locally.
- [x] Database connection string is configured through environment variables.


## 2. Backend MVP

### Architecture Setup

- [x] Create `ExamForge.Api` project.
- [x] Create `ExamForge.Application` project.
- [x] Create `ExamForge.Domain` project.
- [x] Create `ExamForge.Infrastructure` project.
- [x] Create `ExamForge.Tests` project.
- [ ] Configure project references correctly.
- [x] Configure dependency injection.
- [ ] Configure global exception handling.
- [ ] Configure API response conventions.
- [x] Configure Swagger/OpenAPI.

### Authentication and Authorization

- [ ] Implement user registration.
- [ ] Implement user login.
- [ ] Implement JWT access token generation.
- [ ] Implement refresh token flow.
- [ ] Implement logout or refresh token revocation.
- [ ] Add `Student` role.
- [ ] Add `Admin` role.
- [ ] Protect student-only routes.
- [ ] Protect admin-only routes.
- [ ] Add `/auth/me` endpoint.

#### Exam Tags
- [ ] Create tag entity.
- [ ] Add tag type enum: Subject, ExamType, Year, Grade, Skill, Level, Topic.
- [ ] Seed sample tags: Toán, Tiếng Anh, THPTQG, 2025, Lớp 12.
- [ ] Implement public tag list endpoint.
- [ ] Implement public tag detail endpoint.
- [ ] Implement admin create tag endpoint.
- [ ] Implement admin update tag endpoint.
- [ ] Implement admin archive tag endpoint.
- [ ] Add tag slug uniqueness validation.
- [ ] Add tag type validation.

#### Exam Categories
- [ ] Create category entity.
- [ ] Create category-tag many-to-many relationship.
- [ ] Add category migration.
- [ ] Seed sample categories.
- [ ] Implement public category list endpoint.
- [ ] Implement public category detail endpoint.
- [ ] Implement public category exams endpoint.
- [ ] Implement admin create category endpoint.
- [ ] Implement admin update category endpoint.
- [ ] Implement admin archive category endpoint.
- [ ] Add category slug uniqueness validation.
- [ ] Add validation to prevent duplicate tags in one category.

### Question Module

- [ ] Create question entity.
- [ ] Create question choice entity.
- [ ] Create question tag entity.
- [ ] Add question migrations.
- [ ] Seed sample questions.
- [ ] Support `SingleChoice` questions.
- [ ] Support `MultipleChoice` questions.
- [ ] Implement public question loading for practice sessions.
- [ ] Implement admin create question endpoint.
- [ ] Implement admin update question endpoint.
- [ ] Implement admin publish question endpoint.
- [ ] Implement admin archive question endpoint.
- [ ] Validate that published questions have valid choices and correct answers.

### Practice Session Module

- [ ] Create practice session entity.
- [ ] Create practice session question entity.
- [ ] Create user answer entity.
- [ ] Add practice session migrations.
- [ ] Implement create practice session endpoint.
- [ ] Implement get current practice session endpoint.
- [ ] Implement save answer endpoint.
- [ ] Implement submit session endpoint.
- [ ] Calculate score on submission.
- [ ] Store result snapshot.
- [ ] Prevent changing answers after submission.
- [ ] Implement review result endpoint.

### Progress Module

- [ ] Implement user summary endpoint.
- [ ] Show total completed sessions.
- [ ] Show average score.
- [ ] Show recent sessions.
- [ ] Show progress by subject.

## 3. Study Portal MVP

### Authentication UI

- [ ] Register page.
- [ ] Login page.
- [ ] Logout action.
- [ ] Auth state handling.
- [ ] Protected routes.
- [ ] Display current user.

### Subject and Exam Browsing

- [ ] Subject list page.
- [ ] Subject detail page.
- [ ] Exam list by subject.
- [ ] Exam detail page.
- [ ] Empty state when no exams exist.
- [ ] Loading and error states.

### Practice Flow

- [ ] Start practice session button.
- [ ] Practice question page.
- [ ] Single-choice answer UI.
- [ ] Multiple-choice answer UI.
- [ ] Question navigation.
- [ ] Save answer.
- [ ] Submit confirmation.
- [ ] Result summary page.
- [ ] Review answer page.
- [ ] Show explanation after submission.

### Progress UI

- [ ] User dashboard page.
- [ ] Recent sessions list.
- [ ] Average score display.
- [ ] Progress by subject display.

## 4. Admin Portal MVP

### Admin Authentication

- [ ] Admin login page.
- [ ] Admin protected layout.
- [ ] Redirect unauthorized users.

### Dashboard

- [ ] Show total subjects.
- [ ] Show total exams.
- [ ] Show total questions.
- [ ] Show draft/published/archived counts.

### Tag Management

- [ ] Tag table.
- [ ] Create tag form.
- [ ] Edit tag form.
- [ ] Archive tag action.
- [ ] Slug validation feedback.

### Category Management

- [ ] Category table.
- [ ] Create Tag form.
- [ ] Edit category form.
- [ ] Archive category action.
- [ ] Slug validation feedback.

### Exam Management

- [ ] Exam table.
- [ ] Create exam form.
- [ ] Edit exam form.
- [ ] Archive exam action.
- [ ] Manage exam sections.

### Question Management

- [ ] Question table.
- [ ] Filter questions by subject.
- [ ] Filter questions by exam.
- [ ] Filter questions by status.
- [ ] Create question form.
- [ ] Edit question form.
- [ ] Manage choices.
- [ ] Mark correct choices.
- [ ] Add explanation.
- [ ] Publish question.
- [ ] Archive question.

## 5. Database MVP

- [ ] Configure PostgreSQL.
- [ ] Add initial migration.
- [ ] Add seed data.
- [ ] Add unique constraints for slugs.
- [ ] Add indexes for foreign keys.
- [ ] Add indexes for content status fields.
- [ ] Add constraints for question type and status.
- [ ] Add audit fields.

## 6. API Quality

- [ ] Use DTOs for all request and response models.
- [ ] Do not expose EF entities directly.
- [ ] Add validation for create/update requests.
- [ ] Add consistent error format.
- [ ] Add pagination for list endpoints.
- [ ] Add sorting where useful.
- [ ] Add filtering for admin list endpoints.
- [ ] Add Swagger examples where practical.
- [ ] Add authorization tests for admin routes.

## 7. Testing MVP

### Backend Tests

- [ ] Unit tests for score calculation.
- [ ] Unit tests for question publish validation.
- [ ] Unit tests for practice session submission rules.
- [ ] Integration test for registration/login.
- [ ] Integration test for creating subject as admin.
- [ ] Integration test for blocking student from admin route.
- [ ] Integration test for practice session submit flow.

### Frontend Checks

- [ ] Typecheck Study Portal.
- [ ] Typecheck Admin Portal.
- [ ] Build Study Portal.
- [ ] Build Admin Portal.

## 8. Deployment MVP

### Backend

- [ ] Choose backend hosting provider.
- [ ] Configure production database.
- [ ] Configure environment variables.
- [ ] Run migrations in production.
- [ ] Verify Swagger or health endpoint.
- [ ] Configure CORS for frontend domains.

### Frontend

- [ ] Deploy Study Portal.
- [ ] Deploy Admin Portal.
- [ ] Configure API base URL.
- [ ] Verify login flow in production.
- [ ] Verify practice flow in production.
- [ ] Verify admin CRUD flow in production.

### GitHub Actions

- [ ] Backend restore/build/test workflow.
- [ ] Study Portal install/lint/typecheck/build workflow.
- [ ] Admin Portal install/lint/typecheck/build workflow.
- [ ] Run checks on pull requests.
- [ ] Run checks on push to `main`.

## 9. Documentation MVP

- [x] Root README includes project overview.
- [ ] Root README includes screenshots or demo GIF.
- [x] Root README includes tech stack.
- [ ] Root README includes architecture diagram.
- [ ] Root README includes local setup guide.
- [ ] Root README includes environment variable list.
- [ ] Root README links to docs directory.
- [ ] API design document is current.
- [ ] Database design document is current.
- [ ] MVP checklist is current.

## 10. Definition of Done

A feature is done only when:

- [ ] Backend endpoint or frontend page is implemented.
- [ ] Validation is handled.
- [ ] Error state is handled.
- [ ] Authorization is correct.
- [ ] Database migration is included when needed.
- [ ] Basic tests or manual test notes are added.
- [ ] Documentation is updated when the feature affects API, database, or user flow.