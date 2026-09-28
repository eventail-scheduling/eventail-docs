# Workers and scaling

Some work happens outside requests: jobs such as sending email and processing uploaded images,
and maintenance tasks such as periodic cleanup. A worker runs them, either inside the API process
or on its own:

- **Built in:** the API process runs a worker next to request handling, claiming 1 job at a
  time. The Docker Compose setup works this way.
- **Standalone:** the API runs no jobs. Separate processes, started from the same image with
  `./worker.js`, run them. The Helm chart works this way by default.

A standalone worker keeps image processing from competing with requests for the API's CPU and
memory, and lets you scale job processing separately from traffic.

## Run standalone workers

In the Helm chart, `worker.enabled` is `true` by default and `worker.replicaCount` sets how many
run. The chart also sets `WORKER_DISABLE_BUILT_IN=true` on the API. Set `worker.enabled` to
`false` for a small installation, and the API runs the built-in worker instead.

Outside the Helm chart, start a second service from the API image with the command replaced,
and set `WORKER_DISABLE_BUILT_IN=true` on the API. With Docker Compose, put both into a
`compose.override.yml` next to `compose.yml`. Compose merges it automatically, and it survives
[upgrades](/self-hosting/docker-compose#upgrade). Give the worker the same image tag as the
`api` service:

```yaml
services:
  api:
    environment:
      WORKER_DISABLE_BUILT_IN: "true"
  worker:
    image: ghcr.io/eventail-scheduling/eventail-api:<same tag as the api service>
    command: ["./worker.js"]
    restart: unless-stopped
    stop_grace_period: 30s
    depends_on:
      postgres:
        condition: service_healthy
    env_file: api.env
    environment:
      POSTGRES_HOSTNAME: postgres
      POSTGRES_USERNAME: eventail
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}
      POSTGRES_DATABASE: eventail
      CORS_ORIGIN: ${WEB_URL:?set WEB_URL in .env}
      FRONTEND_BASE_URL: ${WEB_URL:?set WEB_URL in .env}
```

Setting `WORKER_DISABLE_BUILT_IN` without a standalone worker running stops all jobs and every
maintenance task: no email goes out, and nothing reports it.

## Concurrency

Each standalone worker claims `WORKER_RUNTIME_CONCURRENCY` jobs at once, 1 by default. The
built-in worker always claims 1.

Every process holds up to `POSTGRES_POOL_SIZE` database connections (10 by default). A process
that runs jobs holds 1 more, to listen for new ones. A standalone worker needs a pool of at least
its concurrency plus 2, and refuses to start with less. Size the database's `max_connections` for
all processes together.

In the Helm chart, set `WORKER_RUNTIME_CONCURRENCY` and `POSTGRES_POOL_SIZE` through
`worker.extraEnv`.

## Maintenance tasks

However many workers run, one of them holds a database lock as leader and runs the maintenance
tasks. If its process exits, another takes over within about a minute. If its host disappears
without closing the database connection, the lock stays until PostgreSQL notices the connection
is dead. With default settings on a Linux database server, that takes up to about 2 hours, or less
while jobs are being queued. Lowering PostgreSQL's `tcp_keepalives_idle` shortens it.

| Task           | What it does                                                                                                          | Runs every |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | ---------- |
| Scheduler      | Makes jobs that are due, or due for a retry, available.                                                               | 5 seconds  |
| Rescuer        | Makes jobs running for over an hour available again, assuming their worker has stopped.                               | 30 seconds |
| Cleaner        | Deletes finished jobs: completed and canceled ones after a day, given-up ones after a week.                           | 30 seconds |
| Invite sweeper | Deletes expired invites.                                                                                              | 1 hour     |
| User sweeper   | Deletes accounts whose owner has not opened the web app for 180 days, unless they host a session or belong to a team. | 6 hours    |
| File pruner    | Deletes objects in the bucket that nothing refers to anymore.                                                         | 24 hours   |

Each task's settings start with `WORKER_`, such as `WORKER_FILE_PRUNER_INTERVAL` or
`WORKER_USER_SWEEPER_RETENTION_PERIOD`. [Configuration](/reference/configuration/#worker) lists
them with their defaults. Intervals and periods are ISO 8601 durations, explained at the top of
that page.

The rescuer cannot tell a stopped worker from a slow job, so a job still running after an hour
runs a second time.

A failed job is retried after a delay of roughly the attempt number to the fourth power: about 1
second, 16 seconds, 81 seconds and so on. After 25 attempts, about 20 days after the first,
Eventail gives up on it. Some failures make it give up at once: a recipient the SMTP server
refuses permanently, an email template that fails to render, or an image that is missing or
cannot be decoded.

## Shut down

On `SIGTERM`, a worker stops claiming jobs and gives running ones 15 seconds to finish before
it exits. `WORKER_RUNTIME_DRAIN_TIMEOUT` sets this.
The API's built-in worker starts draining only after request handling has stopped, which takes
up to 5 more seconds.

Kubernetes waits 30 seconds by default, which is enough. Docker waits 10, so give a Compose
service running jobs `stop_grace_period: 30s`; the shipped `compose.yml` does this for the API.
A job cut off anyway runs again once the rescuer finds it, an hour after it started.

## Scale the API

API replicas share nothing but the database and the bucket, so any number can run behind a
load balancer. Starting several at once is safe: each applies pending migrations under a
database lock first.
