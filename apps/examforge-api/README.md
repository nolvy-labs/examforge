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
