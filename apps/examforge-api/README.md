# ExamForge API

The ExamForge API provides authentication, exam management, attempt processing, grading, statistics, and administrative operations for the ExamForge Study and Admin portals.

It is built with ASP.NET Core and Entity Framework Core on .NET 10.

## Architecture

```text
src/
├─ ExamForge.Api/
├─ ExamForge.Application/
├─ ExamForge.Domain/
└─ ExamForge.Infrastructure/

tests/
├─ ExamForge.Api.Tests/
└─ ExamForge.Application.Tests/
```

| Project                       | Responsibility                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `ExamForge.Api`               | HTTP endpoints, middleware, authentication, hosting, rate limiting, and health checks |
| `ExamForge.Application`       | Use cases, service contracts, DTOs, and application rules                             |
| `ExamForge.Domain`            | Domain entities, value objects, enums, and business invariants                        |
| `ExamForge.Infrastructure`    | Entity Framework Core, PostgreSQL, repositories, and external implementations         |
| `ExamForge.Api.Tests`         | API contract and integration-oriented tests                                           |
| `ExamForge.Application.Tests` | Application and business-rule tests                                                   |

Dependencies point inward: the Domain project does not depend on infrastructure or HTTP concerns.

## Technology

* .NET 10
* ASP.NET Core
* Entity Framework Core 10
* PostgreSQL with Npgsql
* JWT authentication
* xUnit
* Docker

## Prerequisites

Choose one of the following development setups:

### Docker setup

* Docker with the Compose plugin
* Access to a PostgreSQL database

### Direct .NET setup

* .NET 10 SDK
* Access to a PostgreSQL database
* OpenSSL or another cryptographically secure secret generator

PostgreSQL is external. The repository does not start a database container.

## Quick start with Docker

From the repository root:

```bash
cp .env.example .env
```

Set at least:

```dotenv
ConnectionStrings__DefaultConnection=your-postgresql-connection-string
JWT_SECRET=your-generated-signing-secret
```

Generate a signing secret from at least 32 random bytes:

```bash
openssl rand -base64 32
```

Start the migration and API services:

```bash
docker compose up --build
```

Compose runs the migration container first and starts the API only after migrations complete successfully.

The API listens on `http://localhost:5001`.

## Run directly with .NET

From `apps/examforge-api`:

```bash
dotnet tool restore
dotnet restore ExamForge.slnx
```

Store development secrets in .NET user secrets:

```bash
dotnet user-secrets set \
  "ConnectionStrings:DefaultConnection" \
  "your-postgresql-connection-string" \
  --project src/ExamForge.Api

dotnet user-secrets set \
  "Jwt:Secret" \
  "your-generated-signing-secret" \
  --project src/ExamForge.Api
```

Apply migrations:

```bash
dotnet ef database update \
  --project src/ExamForge.Infrastructure \
  --startup-project src/ExamForge.Api
```

Start the API:

```bash
dotnet run --project src/ExamForge.Api
```

The HTTP development profile listens on `http://localhost:5001`.

## Configuration

.NET configuration uses the standard double-underscore mapping for nested environment variables.

| Setting                                                     |   Required | Purpose                       |
| ----------------------------------------------------------- | ---------: | ----------------------------- |
| `ConnectionStrings__DefaultConnection`                      |        Yes | PostgreSQL connection string  |
| `Jwt__Secret`                                               |        Yes | JWT signing secret            |
| `Jwt__Issuer`                                               |        Yes | Expected token issuer         |
| `Jwt__Audience`                                             |        Yes | Expected token audience       |
| `Jwt__AccessTokenMinutes`                                   |         No | Access-token lifetime         |
| `Jwt__RefreshTokenDays`                                     |         No | Refresh-token lifetime        |
| `Cors__AllowedOrigins__0`                                   | Production | Exact Study Portal origin     |
| `Cors__AllowedOrigins__1`                                   | Production | Exact Admin Portal origin     |
| `ForwardedHeaders__KnownNetworks__0`                        | Production | Trusted reverse-proxy network |
| `HealthChecks__ReadinessTimeoutSeconds`                     |         No | PostgreSQL readiness timeout  |
| `Logging__RequestLogging__SlowRequestThresholdMilliseconds` |         No | Slow-request threshold        |

The Compose files expose shorter deployment variables such as `JWT_SECRET` and map them to the corresponding `.NET` configuration keys.

Never commit real connection strings, signing secrets, or deployment credentials.

## Development API documentation

Swagger and OpenAPI are available only when `ASPNETCORE_ENVIRONMENT` is `Development`.

* Swagger UI: `http://localhost:5001/swagger`
* OpenAPI document: `http://localhost:5001/openapi/v1.json`

Production does not expose Swagger.

## Build and test

From `apps/examforge-api`:

```bash
dotnet restore ExamForge.slnx
dotnet build ExamForge.slnx --configuration Release --no-restore
dotnet test ExamForge.slnx \
  --configuration Release \
  --no-restore \
  --no-build
```

## Health checks

| Endpoint            | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `GET /health/live`  | Confirms that the ASP.NET Core process is responding |
| `GET /health/ready` | Confirms that the API can connect to PostgreSQL      |

The liveness endpoint does not check dependencies. The readiness endpoint returns `503 Service Unavailable` when the database check fails.

Production Docker health checks use `/health/ready`.

## Structured logging

The API writes structured JSON logs to standard output. `Error` and `Critical` events are directed to standard error.

From the repository root:

```bash
docker compose logs -f api
docker compose logs --since 30m api
docker compose logs --tail 200 api
```

Disable the Compose prefix before processing logs with `jq`:

```bash
docker compose logs --no-log-prefix api | jq
```

Filter errors:

```bash
docker compose logs --no-log-prefix api |
  jq 'select(.LogLevel == "Error" or .LogLevel == "Critical")'
```

### Correlation IDs

Every response includes an `X-Correlation-ID`. Problem Details responses also include a `correlationId` value.

To investigate a failed request:

1. Copy the correlation ID from the response.
2. Filter logs for the same value.
3. Find the request-completion or slow-request event.
4. Check for an unexpected-exception event with the same ID.

```bash
CORRELATION_ID=request-id

docker compose logs --no-log-prefix api |
  jq --arg id "$CORRELATION_ID" \
  'select(.State.CorrelationId? == $id or any(.Scopes[]?; .CorrelationId? == $id))'
```

Do not place tokens, cookies, answer content, or other sensitive information in a client-provided correlation ID.

## Log rotation

The API container uses Docker's `json-file` logging driver with:

* Maximum size: 10 MB per file
* Retained files: 5

These logs are operational diagnostics, not permanent audit storage.

Recreate the API container after changing Docker logging options:

```bash
docker compose up -d --force-recreate api
```

## Production hosting

The production topology uses Nginx as the public TLS-terminating reverse proxy in front of Kestrel.

```text
Internet
    -> Nginx on ports 80 and 443
        -> Kestrel on 127.0.0.1:5001
            -> PostgreSQL
```

The proxy must:

* Preserve the original `Host`
* Set `X-Forwarded-For`
* Set `X-Forwarded-Proto`
* Terminate TLS
* Redirect public HTTP traffic to HTTPS
* Add the production HSTS header

ASP.NET Core accepts forwarded headers only from configured proxy IP addresses or networks. Determine the real proxy address on the deployment host instead of copying the example network from `.env.example`.

Production startup rejects unsafe or incomplete host, CORS, forwarded-header, JWT, database, health-check, and rate-limit configuration.

## Production deployment

The backend GitHub Actions workflow:

1. Restores, builds, and tests the solution.
2. Builds separate API and migration images.
3. Publishes commit-addressed images to GitHub Container Registry.
4. Connects to the Lightsail host over SSH.
5. Runs database migrations.
6. Replaces the API container.
7. Verifies `/health/ready`.

The production API is available at `https://api.examforge.io.vn`.

Deployment credentials and application secrets are supplied through GitHub environment secrets and the server deployment environment.

## JWT signing-secret rotation

1. Generate a new secret from at least 32 cryptographically random bytes.
2. Retain the current secret temporarily for rollback.
3. Update `JWT_SECRET` in the deployment environment.
4. Recreate the API container.
5. Wait for `/health/ready`.
6. Verify login, token issuance, and authenticated API access.
7. Remove the old secret after the deployment is stable.

Existing access tokens become invalid immediately after rotation. This MVP does not support simultaneous signing keys or zero-downtime key rotation.

## Related documentation

* [Project README](../../README.md)
* [Study Portal README](../examforge-study/README.md)
* [Project documentation](../../docs/)
