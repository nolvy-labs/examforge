# ExamForge API Design

## 1. API Overview

The ExamForge backend exposes a REST API for two frontend clients:

1. **Study Portal** — learner-facing web application.
2. **Admin Portal** — admin-facing content management application.

The API should be stable, predictable, and easy to consume from TypeScript clients.

## 2. Base URL

Local development:

```txt
https://localhost:5000/api/v1
```

Production:

```txt
https://api.examforge.example/api/v1
```

Use environment variables for frontend clients:

```txt
NEXT_PUBLIC_API_BASE_URL=https://localhost:5000/api/v1
```

## 3. API Design Principles

- Use RESTful resources.
- Use plural nouns for collections.
- Use JSON request and response bodies.
- Use DTOs, not database entities.
- Use consistent error response shape.
- Use pagination for list endpoints.
- Use role-based authorization for admin endpoints.
- Keep public learner endpoints separate from admin management endpoints.
- Do not expose correct answers before a practice session is submitted.

## 4. Authentication

### 4.1 Token Strategy

Recommended MVP strategy:

- Access token: short-lived JWT.
- Refresh token: longer-lived token stored securely.
- Role claims: `Student`, `Admin`.

### 4.2 Authorization Header

```http
Authorization: Bearer <access_token>
```

### 4.3 Roles

| Role | Permissions |
|---|---|
| `Student` | Browse published content, create practice sessions, submit answers, view own progress. |
| `Admin` | Manage subjects, exams, sections, questions, and content status. |

## 5. Standard Response Shapes

### 5.1 Success Response

For single-resource responses:

```json
{
  "data": {
    "id": "7c79d2e8-28c4-4f52-9c78-2f85a55f74c2"
  }
}
```

For list responses:

```json
{
  "data": [
    {
      "id": "7c79d2e8-28c4-4f52-9c78-2f85a55f74c2"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 125,
    "totalPages": 7
  }
}
```

### 5.2 Error Response

Use a consistent problem response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": [
      {
        "field": "slug",
        "message": "Slug is already used."
      }
    ],
    "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736"
  }
}
```

### 5.3 Common Error Codes

| HTTP Status | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Request body or query parameters are invalid. |
| 401 | `UNAUTHORIZED` | Authentication is missing or invalid. |
| 403 | `FORBIDDEN` | Authenticated user does not have permission. |
| 404 | `NOT_FOUND` | Resource does not exist or is not accessible. |
| 409 | `CONFLICT` | Resource conflicts with existing data. |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error. |

## 6. Pagination, Sorting, and Filtering

### 6.1 Pagination Query Parameters

```http
GET /api/v1/admin/questions?page=1&pageSize=20
```

Rules:

- Default `page`: `1`
- Default `pageSize`: `20`
- Max `pageSize`: `100`

### 6.2 Sorting

```http
GET /api/v1/admin/questions?sort=createdAt:desc
```

Recommended sort fields:

- `createdAt`
- `updatedAt`
- `title`
- `status`

### 6.3 Filtering

```http
GET /api/v1/admin/questions?subjectId=<uuid>&examId=<uuid>&status=Published
```

## 7. Auth Endpoints

### Register

```http
POST /auth/register
```

Request:

```json
{
  "email": "student@example.com",
  "password": "StrongPassword123!",
  "displayName": "Student Name"
}
```

Response:

```json
{
  "data": {
    "userId": "d0bf6bd4-4ca7-43e7-8f29-39482ea855bb",
    "email": "student@example.com",
    "displayName": "Student Name"
  }
}
```

### Login

```http
POST /auth/login
```

Request:

```json
{
  "email": "student@example.com",
  "password": "StrongPassword123!"
}
```

Response:

```json
{
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "refresh-token",
    "expiresIn": 900,
    "user": {
      "id": "d0bf6bd4-4ca7-43e7-8f29-39482ea855bb",
      "email": "student@example.com",
      "displayName": "Student Name",
      "roles": ["Student"]
    }
  }
}
```

### Refresh Token

```http
POST /auth/refresh
```

Request:

```json
{
  "refreshToken": "refresh-token"
}
```

### Current User

```http
GET /auth/me
```

Authorization: required.

Response:

```json
{
  "data": {
    "id": "d0bf6bd4-4ca7-43e7-8f29-39482ea855bb",
    "email": "student@example.com",
    "displayName": "Student Name",
    "roles": ["Student"]
  }
}
```

### Logout

```http
POST /auth/logout
```

Authorization: required.

## 8. Public Study Endpoints

These endpoints are used by the Study Portal. They should only expose published content.

### List Subjects

```http
GET /subjects
```

Response:

```json
{
  "data": [
    {
      "id": "81df4c66-5121-4c7f-a4d1-5296849e6f06",
      "name": "English",
      "slug": "english",
      "description": "English exam preparation",
      "examCount": 3
    }
  ]
}
```

### Get Subject Detail

```http
GET /subjects/{slug}
```

### List Exams by Subject

```http
GET /subjects/{slug}/exams
```

Response:

```json
{
  "data": [
    {
      "id": "7960ee30-5d4d-4e48-ae59-73a1df2b4cd1",
      "subjectId": "81df4c66-5121-4c7f-a4d1-5296849e6f06",
      "title": "IELTS Reading Practice Set 1",
      "slug": "ielts-reading-practice-set-1",
      "durationMinutes": 60,
      "questionCount": 40
    }
  ]
}
```

### Get Exam Detail

```http
GET /exams/{examId}
```

Response:

```json
{
  "data": {
    "id": "7960ee30-5d4d-4e48-ae59-73a1df2b4cd1",
    "title": "IELTS Reading Practice Set 1",
    "description": "Reading practice test",
    "durationMinutes": 60,
    "sections": [
      {
        "id": "bb2d0da4-c383-41f2-ad5b-d946b4257d06",
        "title": "Passage 1",
        "orderIndex": 1,
        "questionCount": 13
      }
    ]
  }
}
```

## 9. Practice Session Endpoints

Authorization: `Student` or `Admin`.

### Create Practice Session

```http
POST /practice-sessions
```

Request:

```json
{
  "examId": "7960ee30-5d4d-4e48-ae59-73a1df2b4cd1",
  "mode": "Practice"
}
```

Response:

```json
{
  "data": {
    "id": "81436927-4909-4fa9-b8be-7c95c426f52d",
    "examId": "7960ee30-5d4d-4e48-ae59-73a1df2b4cd1",
    "status": "InProgress",
    "startedAt": "2026-07-01T09:00:00Z",
    "questions": [
      {
        "sessionQuestionId": "35a447f4-b9b9-4894-a7f3-93e9bcfbe199",
        "questionId": "0ef10c5f-93fa-4a1e-980f-c19e0db1d205",
        "orderIndex": 1,
        "type": "SingleChoice",
        "prompt": "What is the main idea of the passage?",
        "choices": [
          {
            "id": "2eaaf7bc-7f93-4df5-9c4b-69723e87455b",
            "content": "Choice A"
          },
          {
            "id": "8ae9f3f8-bcb9-4608-aa63-35e94023ac08",
            "content": "Choice B"
          }
        ]
      }
    ]
  }
}
```

Important rule: this response must not include correct answers.

### Get Practice Session

```http
GET /practice-sessions/{sessionId}
```

Returns the current state of a session owned by the current user.

### Save Answer

```http
PUT /practice-sessions/{sessionId}/answers/{sessionQuestionId}
```

Request for single-choice:

```json
{
  "selectedChoiceIds": [
    "2eaaf7bc-7f93-4df5-9c4b-69723e87455b"
  ]
}
```

Request for multiple-choice:

```json
{
  "selectedChoiceIds": [
    "2eaaf7bc-7f93-4df5-9c4b-69723e87455b",
    "8ae9f3f8-bcb9-4608-aa63-35e94023ac08"
  ]
}
```

Response:

```json
{
  "data": {
    "sessionQuestionId": "35a447f4-b9b9-4894-a7f3-93e9bcfbe199",
    "answered": true,
    "updatedAt": "2026-07-01T09:10:00Z"
  }
}
```

### Submit Practice Session

```http
POST /practice-sessions/{sessionId}/submit
```

Response:

```json
{
  "data": {
    "sessionId": "81436927-4909-4fa9-b8be-7c95c426f52d",
    "status": "Submitted",
    "submittedAt": "2026-07-01T09:45:00Z",
    "totalQuestions": 40,
    "correctCount": 32,
    "scorePercent": 80.0
  }
}
```

### Review Practice Session

```http
GET /practice-sessions/{sessionId}/review
```

Response:

```json
{
  "data": {
    "sessionId": "81436927-4909-4fa9-b8be-7c95c426f52d",
    "scorePercent": 80.0,
    "questions": [
      {
        "sessionQuestionId": "35a447f4-b9b9-4894-a7f3-93e9bcfbe199",
        "questionId": "0ef10c5f-93fa-4a1e-980f-c19e0db1d205",
        "prompt": "What is the main idea of the passage?",
        "selectedChoiceIds": ["2eaaf7bc-7f93-4df5-9c4b-69723e87455b"],
        "correctChoiceIds": ["2eaaf7bc-7f93-4df5-9c4b-69723e87455b"],
        "isCorrect": true,
        "explanation": "The passage mainly discusses..."
      }
    ]
  }
}
```

## 10. Progress Endpoints

Authorization: required.

### Current User Progress Summary

```http
GET /me/progress
```

Response:

```json
{
  "data": {
    "completedSessions": 12,
    "averageScorePercent": 76.5,
    "subjects": [
      {
        "subjectId": "81df4c66-5121-4c7f-a4d1-5296849e6f06",
        "subjectName": "English",
        "completedSessions": 8,
        "averageScorePercent": 78.2
      }
    ],
    "recentSessions": [
      {
        "sessionId": "81436927-4909-4fa9-b8be-7c95c426f52d",
        "examTitle": "IELTS Reading Practice Set 1",
        "scorePercent": 80.0,
        "submittedAt": "2026-07-01T09:45:00Z"
      }
    ]
  }
}
```

## 11. Admin Subject Endpoints

Authorization: `Admin`.

### List Subjects

```http
GET /admin/subjects?page=1&pageSize=20&status=Published
```

### Create Subject

```http
POST /admin/subjects
```

Request:

```json
{
  "name": "English",
  "slug": "english",
  "description": "English exam preparation",
  "status": "Published"
}
```

### Update Subject

```http
PATCH /admin/subjects/{subjectId}
```

Request:

```json
{
  "name": "English Language",
  "description": "Updated description",
  "status": "Published"
}
```

### Archive Subject

```http
POST /admin/subjects/{subjectId}/archive
```

## 12. Admin Exam Endpoints

Authorization: `Admin`.

### List Exams

```http
GET /admin/exams?subjectId=<uuid>&status=Published&page=1&pageSize=20
```

### Create Exam

```http
POST /admin/exams
```

Request:

```json
{
  "subjectId": "81df4c66-5121-4c7f-a4d1-5296849e6f06",
  "title": "IELTS Reading Practice Set 1",
  "slug": "ielts-reading-practice-set-1",
  "description": "Reading practice test",
  "durationMinutes": 60,
  "status": "Draft"
}
```

### Update Exam

```http
PATCH /admin/exams/{examId}
```

### Publish Exam

```http
POST /admin/exams/{examId}/publish
```

### Archive Exam

```http
POST /admin/exams/{examId}/archive
```

## 13. Admin Exam Section Endpoints

Authorization: `Admin`.

### List Sections

```http
GET /admin/exams/{examId}/sections
```

### Create Section

```http
POST /admin/exams/{examId}/sections
```

Request:

```json
{
  "title": "Passage 1",
  "description": "Questions for passage 1",
  "orderIndex": 1
}
```

### Update Section

```http
PATCH /admin/exams/{examId}/sections/{sectionId}
```

### Delete Section

```http
DELETE /admin/exams/{examId}/sections/{sectionId}
```

For MVP, deletion can be blocked if the section already has questions.

## 14. Admin Question Endpoints

Authorization: `Admin`.

### List Questions

```http
GET /admin/questions?subjectId=<uuid>&examId=<uuid>&sectionId=<uuid>&status=Draft&page=1&pageSize=20
```

### Get Question Detail

```http
GET /admin/questions/{questionId}
```

### Create Question

```http
POST /admin/questions
```

Request:

```json
{
  "subjectId": "81df4c66-5121-4c7f-a4d1-5296849e6f06",
  "examId": "7960ee30-5d4d-4e48-ae59-73a1df2b4cd1",
  "sectionId": "bb2d0da4-c383-41f2-ad5b-d946b4257d06",
  "type": "SingleChoice",
  "prompt": "What is the main idea of the passage?",
  "explanation": "The passage mainly discusses...",
  "difficulty": "Medium",
  "orderIndex": 1,
  "status": "Draft",
  "choices": [
    {
      "content": "Choice A",
      "isCorrect": true,
      "orderIndex": 1
    },
    {
      "content": "Choice B",
      "isCorrect": false,
      "orderIndex": 2
    }
  ],
  "tagIds": []
}
```

### Update Question

```http
PUT /admin/questions/{questionId}
```

Use `PUT` here because the admin question editor usually sends the full editable question model, including choices.

### Publish Question

```http
POST /admin/questions/{questionId}/publish
```

Publish validation rules:

- Question must have a prompt.
- Question must belong to a subject.
- Question should belong to an exam for MVP practice flow.
- Single-choice question must have exactly one correct choice.
- Multiple-choice question must have at least one correct choice.
- Question must have at least two choices for choice-based questions.
- Explanation is recommended, but may be optional for MVP.

### Archive Question

```http
POST /admin/questions/{questionId}/archive
```

## 15. Admin Tag Endpoints

Authorization: `Admin`.

### List Tags

```http
GET /admin/tags?subjectId=<uuid>
```

### Create Tag

```http
POST /admin/tags
```

Request:

```json
{
  "subjectId": "81df4c66-5121-4c7f-a4d1-5296849e6f06",
  "name": "Reading",
  "slug": "reading"
}
```

## 16. Health Endpoint

```http
GET /health
```

Response:

```json
{
  "status": "Healthy",
  "timestamp": "2026-07-01T09:00:00Z"
}
```

## 17. API Versioning

MVP uses URL versioning:

```txt
/api/v1
```

Do not introduce `/api/v2` until breaking changes are unavoidable.

## 18. Security Rules

- Never return password hashes.
- Never return refresh token hashes.
- Never expose correct answers before session submission.
- Always check resource ownership for practice sessions.
- Always check `Admin` role for `/admin/*` routes.
- Use server-side score calculation only.
- Do not trust client-submitted score.
- Validate all IDs and request bodies.
- Rate-limit authentication endpoints later if the deployment target supports it.

