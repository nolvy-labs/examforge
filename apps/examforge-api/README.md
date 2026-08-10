# ExamForge API operations

## Viewing structured logs

The API writes one JSON object per log event to standard output, with `Error` and
`Critical` events directed to standard error. Docker owns persistence and rotation;
the application does not write log files.

From the repository root, use the actual Compose service name, `api`:

```bash
docker compose logs -f api
docker compose logs --since 30m api
docker compose logs --tail 200 api
docker compose logs api | jq
```

Compose can prefix each line with service metadata. For reliable `jq` processing,
disable that prefix:

```bash
docker compose logs --no-log-prefix api | jq
```

The built-in .NET JSON console formatter emits top-level fields including
`Timestamp`, `EventId`, `LogLevel`, `Category`, `Message`, `Exception`, `State`, and
`Scopes`. Parameterized message properties are under `State`; the correlation scope
is also present under `Scopes`.

Useful filters:

```bash
# Errors
docker compose logs --no-log-prefix api | jq 'select(.LogLevel == "Error" or .LogLevel == "Critical")'

# One correlation ID (request and operation state, or the active logging scope)
CORRELATION_ID=client-request_123.test
docker compose logs --no-log-prefix api | jq --arg id "$CORRELATION_ID" \
  'select(.State.CorrelationId? == $id or any(.Scopes[]?; .CorrelationId? == $id))'

# RequestCompleted (EventId 1000)
docker compose logs --no-log-prefix api | jq 'select(.EventId == 1000)'

# SlowRequest (EventId 1001)
docker compose logs --no-log-prefix api | jq 'select(.EventId == 1001)'

# Recent errors
docker compose logs --since 30m --no-log-prefix api | jq 'select(.LogLevel == "Error" or .LogLevel == "Critical")'
```

The default slow-request threshold is 1000 ms. Override
`Logging__RequestLogging__SlowRequestThresholdMilliseconds` for an environment when
needed. Values outside 1–300000 fail startup validation.

## Correlating an API failure

1. Copy `X-Correlation-ID` from the API response header or `correlationId` from its
   `ProblemDetails` body.
2. Filter Docker logs for that ID with the command above.
3. Find EventId `1000` (`RequestCompleted`) or `1001` (`SlowRequest`) to see the
   normalized route, status, and duration.
4. For an unexpected failure, find EventId `1002` (`UnexpectedException`) with the
   same correlation ID. Related lifecycle or background-operation events use the
   same structured JSON format.

Never put tokens, cookies, answer content, or other sensitive values into a client
correlation ID. Invalid incoming IDs are replaced with a server-generated value.

## Docker rotation

The `api` service uses Docker's `json-file` driver with a maximum of 10 MB per file
and five retained files. Docker performs rotation; these logs are bounded operational
diagnostics, not permanent audit history. Recreate already-created containers after
changing logging-driver options:

```bash
docker compose up -d --force-recreate api
```

## Future observability path

Application code remains provider-neutral:

```text
Application code
    -> ILogger<T>
        -> JSON console and Docker today
        -> OpenTelemetry logging provider and OTLP exporter later
        -> Grafana Cloud or another backend later
```

Adding an OpenTelemetry provider later will not require rewriting application use
cases or their structured logging calls.

## Production deployment behind Nginx or Caddy

The production topology is one public TLS-terminating Nginx or Caddy proxy in front
of Kestrel. The production Compose file publishes Kestrel only on
`127.0.0.1:5001`; only ports 80 and 443 should be publicly reachable. The proxy
must preserve `Host` and set `X-Forwarded-For` and `X-Forwarded-Proto`. Do not send
`X-Forwarded-Host` because the API does not consume it.

The proxy owns the public HTTP-to-HTTPS redirect, certificates, and HSTS. Add this
header on HTTPS responses at the proxy:

```text
Strict-Transport-Security: max-age=31536000
```

`includeSubDomains` and `preload` are intentionally omitted. Only enable broader
HSTS after confirming every affected subdomain is permanently HTTPS-only.

ASP.NET Core accepts forwarded values only from the configured immediate proxy IP
or CIDR, with a one-hop limit. Determine the real Docker bridge or proxy address on
the Lightsail host (for example with `docker network inspect`) and set
`FORWARDED_HEADERS_KNOWN_NETWORK_0` to that actual CIDR. The value in
`.env.example` is illustrative and must not be copied without verification. A
single proxy IP can instead be supplied as
`ForwardedHeaders__KnownProxies__0` outside Compose.

### Required production configuration

Provide these through the deployment environment; never commit their values:

```text
ConnectionStrings__DefaultConnection
JWT_SECRET
JWT_ISSUER
JWT_AUDIENCE
CORS_ALLOWED_ORIGIN_0
CORS_ALLOWED_ORIGIN_1
FORWARDED_HEADERS_KNOWN_NETWORK_0
```

The Compose names map to `Jwt__*`, `Cors__AllowedOrigins__*`, and
`ForwardedHeaders__KnownNetworks__*` inside the container. The two CORS values must
be the exact Study and Admin HTTPS origins: no wildcard, trailing slash, path,
query, or fragment. Production startup also rejects a missing database connection,
an untrusted/malformed proxy configuration, invalid rate/health values, wildcard
host filtering, and weak JWT configuration.

Generate a signing secret from at least 32 cryptographically random bytes:

```bash
openssl rand -base64 32
```

String length alone does not establish entropy; use a cryptographic generator and
store the output in the deployment secret store/environment.

### Health and startup verification

`GET /health/live` reports only whether the ASP.NET Core process is responding. It
runs no dependency checks. `GET /health/ready` checks PostgreSQL connectivity via
the existing EF Core context and returns 503 when unavailable. The database probe
has a configurable `HealthChecks__ReadinessTimeoutSeconds` budget (2 seconds by
default, with a 30-second validation ceiling). Responses expose only the aggregate
status.

Deploy from the repository root:

```bash
docker compose -f docker-compose.production.yml up -d --build migrations
docker compose -f docker-compose.production.yml up -d --build api
bash apps/examforge-api/scripts/verify-production-readiness.sh
```

The migration service must finish successfully before Compose starts the API. The
verification script polls loopback for at most 60 seconds and fails the deployment
if readiness never succeeds. Route traffic or reload Nginx/Caddy only after it
succeeds. A single-container deployment can have a brief interruption; blue/green
deployment is outside this MVP.

Docker uses `/health/ready` for container health. Database failure therefore leaves
the process running but marks the container unhealthy; Docker does not restart the
API merely because PostgreSQL is unavailable.

### JWT signing-secret rotation

1. Generate a new cryptographically random secret and temporarily retain the
   current secret securely for emergency rollback.
2. Update `JWT_SECRET` in the production deployment secret source.
3. Recreate/restart the API container.
4. Wait for `/health/ready` to become healthy.
5. Test login and token issuance, then verify normal authenticated API access.
6. After stability is confirmed, destroy the old secret from temporary rollback
   storage.

Existing access JWTs become invalid immediately and users may need to authenticate
again. Refresh behavior depends on issuance flow, but every newly generated access
token uses only the new key and old access tokens no longer validate. This MVP does
not support simultaneous current/previous keys, `kid`, key rings, or zero-downtime
multi-key rotation.
