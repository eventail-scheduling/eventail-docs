---
outline: [2, 3]
---

# Furry schedule adapter

The adapter reads one edition from the API and serves that edition's schedule as a
[Furry Schedule Schema](https://github.com/Alofoxx/furry-schedule-schema) document. Run it if
something you use already consumes that format, such as a convention app or a site built around
it. If you are writing the consumer yourself, read the schedule from the API directly instead;
[Showing the schedule](/integration/schedule) covers that.

It is a separate program with its own image, chart and version line, and it only reads: nothing
it does changes anything in Eventail.

## Before you start

- A running Eventail the adapter can reach. It is usually on the same network and not exposed.
- A client credentials client at your sign-in provider, set up as described in
  [Sign-in provider](/self-hosting/sign-in-provider#the-integration-s-client). The adapter signs
  in as itself, the same way any integration does.
- The ID of the edition to publish. [Showing the schedule](/integration/schedule) shows how to
  list editions to find it.

## Docker Compose

The Compose setup ships the adapter behind a profile, so it stays out of the way until you ask
for it. Fetch its env file next to the others:

```sh
base=https://raw.githubusercontent.com/eventail-scheduling/eventail-deploy/main/compose
curl -fsSLO "$base/furry-schedule-adapter.env.example"
cp furry-schedule-adapter.env.example furry-schedule-adapter.env
```

Fill in the edition, the client and the venue, then start it alongside the rest:

```sh
docker compose --profile furry-schedule-adapter up -d
```

The document is published on `127.0.0.1:8081` by default, which
`FURRY_SCHEDULE_ADAPTER_PORT` in `.env` changes. Put it behind the same reverse proxy that
terminates TLS for the API and the web app.

`compose.yml` sets the API's address and the token cache path itself, because both follow from
the Compose setup rather than from your deployment.

## Kubernetes

The adapter has its own chart, versioned separately from the Eventail chart. Create a Secret
holding the client secret, then install:

```sh
kubectl create secret generic furry-schedule-adapter --namespace eventail \
    --from-literal=clientSecret=...

helm install furry-schedule-adapter \
    oci://ghcr.io/eventail-scheduling/charts/eventail-furry-schedule-adapter \
    --namespace eventail --values values.yaml
```

A minimal `values.yaml`:

```yaml
eventail:
  baseUrl: http://eventail-api
  editionId: 00000000-0000-0000-0000-000000000000
  auth:
    issuer: https://id.example.com/realms/eventail
    clientId: furry-schedule-adapter
    existingSecret: furry-schedule-adapter

document:
  language: en

venue:
  id: main
  name: Example Convention Center
```

No Ingress is created. Route to the Service yourself if the document should be reachable from
outside the cluster.

The access token is cached on a PersistentVolumeClaim so a restart does not mint another one.
Providers meter these, and an `emptyDir` would lose the cache every time the pod restarts.

A plaintext `auth.issuer` is refused unless it is on loopback or you set
`eventail.auth.allowInsecureIssuer`, which is for a provider inside the cluster with no TLS to
terminate. It also drops the HTTPS requirement for the request that carries the client secret.

## What it serves

The document is at `/schedule.json`. The adapter fetches the schedule at startup and polls for
changes after that, so each response is a complete snapshot of what is published.

Until the first poll succeeds, `/schedule.json` answers `503` rather than an empty document, and
it does so again if the schedule goes too stale to serve. Both responses say why. `/health`
answers `200` whenever the process is running, stale or not, so an upstream outage does not
restart the container.

## Configuration

Set each one as an environment variable or in a file the container reads,
`/app/config/local.toml` or `/app/config/local.json`. Environment variables override the file.
An environment variable's name is the setting's path in upper case, with underscores between
words and between path parts: `eventail.auth.clientId` becomes `EVENTAIL_AUTH_CLIENT_ID`. An
empty variable still counts as set. The Setting column shows the variable's name on its second
line.

Durations use ISO 8601 notation, such as `PT30S` or `P7D`. Intervals accept time units only:
`PT24H` works, `P1D` does not.

<ConfigReference product="furry-schedule-adapter" :depth="3" />
