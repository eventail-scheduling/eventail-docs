# Kubernetes

The Helm chart runs the API, the web app and a worker for background jobs. You bring
PostgreSQL, the object store, the SMTP server and the sign-in provider, and route traffic with
the chart's Ingress or with your own.

## Before you start

- Helm 3.8 or later, since the chart is published as an OCI artifact.
- 2 hostnames, one for the web app and one for the API, such as `eventail.example.com` and
  `api.eventail.example.com`. Both apps serve from `/`, so they cannot share a hostname.
- A PostgreSQL database, managed or run in the cluster, for example with
  [CloudNativePG](https://cloudnative-pg.io). The chart does not bundle one.
- A sign-in provider set up as described in [Sign-in provider](/self-hosting/sign-in-provider).
- A bucket set up as described in [Object storage](/self-hosting/object-storage).
- An SMTP server that Eventail can send mail through.

## Create the secrets

The chart reads secrets only from Kubernetes Secrets you create, never from the values, so no
secret ends up in the release history.

Create the Secrets in the namespace you install into:

```sh
kubectl create namespace eventail
kubectl create secret generic eventail-postgres --namespace eventail \
    --from-literal=password=...
kubectl create secret generic eventail-s3 --namespace eventail \
    --from-literal=accessKeyId=... --from-literal=secretAccessKey=...
kubectl create secret generic eventail-smtp --namespace eventail \
    --from-literal=user=... --from-literal=pass=...
```

| Values key                  | Secret keys                                            | If unset                                                                                                                        |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `postgres.existingSecret`   | `password`, or the key named in `postgres.passwordKey` | Required.                                                                                                                       |
| `s3.existingSecret`         | `accessKeyId`, `secretAccessKey`                       | The AWS default credential chain applies, for example `AWS_*` variables set through `api.extraEnv` or the node's instance role. |
| `email.smtp.existingSecret` | `user`, `pass`                                         | No authentication is sent.                                                                                                      |

If CloudNativePG runs the database in the namespace you install into, skip `eventail-postgres`.
For a cluster named `eventail-db`, CloudNativePG creates a Secret `eventail-db-app` with the
password under `password`, and serves the database at `eventail-db-rw`. This holds as long as the
cluster keeps CloudNativePG's default database and owner, both `app`.

## Write the values

A minimal `values.yaml`:

```yaml
webUrl: https://eventail.example.com
apiUrl: https://api.eventail.example.com

web:
  oidc:
    authority: https://id.example.com/realms/eventail
    clientId: eventail-web

postgres:
  hostname: postgres.example.com     # eventail-db-rw with CloudNativePG
  database: eventail                 # app with CloudNativePG
  username: eventail                 # app with CloudNativePG
  existingSecret: eventail-postgres  # eventail-db-app with CloudNativePG

jwt:
  issuer: https://id.example.com/realms/eventail
  audience: eventail
  superAdminPredicate: "sub == 'replace-with-your-subject'"
  integrationPredicate: "`false`"

userInfo:
  emailAddressPath: email
  displayNamePath: name

s3:
  bucketName: eventail
  publicBaseUrl: https://s3.example.com/eventail
  endpoint: https://s3.example.com
  forcePathStyle: true
  existingSecret: eventail-s3

email:
  sender: eventail@example.com
  smtp:
    host: smtp.example.com
    existingSecret: eventail-smtp

ingress:
  enabled: true
  className: nginx
  tls:
    - secretName: eventail-tls
      hosts:
        - eventail.example.com
        - api.eventail.example.com
```

`webUrl` and `apiUrl` are the only place the public addresses go. The Ingress hosts, the
origin the API accepts requests from and the links in emails are all derived from them, so both
must be origins exactly as a browser shows them: lowercase scheme and host, a port only when it
is not the default, no path and no trailing slash.

The Ingress serves TLS from the `eventail-tls` Secret, which must already exist. Create it
from your certificate with `kubectl create secret tls`, or have cert-manager issue it by adding
an annotation under `ingress.annotations`, for example
`cert-manager.io/cluster-issuer: letsencrypt`.

Both predicates are required. Leave `integrationPredicate` at `` `false` ``, which matches no
token, until you build an integration. [Sign-in provider](/self-hosting/sign-in-provider)
explains both.

The chart validates the values against its schema, so a missing required value fails at
`helm install`, before any pod starts. `helm show values` lists every value with its default:

```sh
helm show values oci://ghcr.io/eventail-scheduling/charts/eventail
```

Any API setting the values do not cover goes into `api.extraEnv`, as a list of Kubernetes
`EnvVar` entries. The worker receives these too, and settings for the worker alone go into
`worker.extraEnv`. The chart refuses a variable in either list that it already sets itself.
[Configuration](/reference/configuration/) lists every setting with its variable name.

```yaml
api:
  extraEnv:
    - name: LOG_LEVEL
      value: warn
worker:
  extraEnv:
    - name: WORKER_RUNTIME_CONCURRENCY
      value: "4"
  resources:
    limits: { memory: 1Gi }
```

[Set resources](#set-resources) explains the worker's memory limit.

## Install

```sh
helm install eventail oci://ghcr.io/eventail-scheduling/charts/eventail \
    --namespace eventail --values values.yaml
```

The API migrates the database as it starts. Its pods report ready only once the migration has run
and the API has read the sign-in provider's discovery document. If they stay unready, the API's
log names the setting at fault:

```sh
kubectl logs --namespace eventail deployment/eventail-api
```

## Sign in

Open `webUrl` and sign in with the account that `jwt.superAdminPredicate` matches. As a super admin,
you create the first team and the first edition. If signing in fails,
[Sign-in provider](/self-hosting/sign-in-provider) lists what the API checks.

## Without the chart's Ingress

Leave `ingress.enabled` at its default, `false`, and route each hostname to its Service on
port 80. For a release named `eventail` those are `eventail-web` and `eventail-api`;
`kubectl get services` shows the names for any other release name. The chart still derives
everything else from `webUrl` and `apiUrl`.

## Security defaults

Every pod runs as a non-root user with a read-only root filesystem, no privilege escalation,
all capabilities dropped and the `RuntimeDefault` seccomp profile. Each gets an `emptyDir` at
`/tmp`, the only place the containers write to. No pod mounts a service account token.

## Workers

Background jobs run in a Deployment of their own by default, so image processing does not
compete with requests for the API's CPU and memory. [Workers and scaling](/self-hosting/workers)
explains the trade-offs and the settings.

## Set resources

The chart sets no resource requests or limits. `api.resources`, `worker.resources` and
`web.resources` each take a Kubernetes `resources` block. Measured with the 0.1.1 images and
the default standalone worker:

| Pod    | Idle (MiB) | Peak (MiB) | Load                                                                 |
| ------ | ---------- | ---------- | -------------------------------------------------------------------- |
| API    | 150        | 440        | 50 clients reading at once, about 500 requests a second              |
| Worker | 120        | 265        | Processing uploaded images one at a time, photos up to 24 megapixels |
| Web    | 30         | 30         | Static files only                                                    |

A starting point with headroom over those peaks:

```yaml
api:
  resources:
    requests: { cpu: 100m, memory: 256Mi }
    limits: { memory: 512Mi }
worker:
  resources:
    requests: { cpu: 100m, memory: 192Mi }
    limits: { memory: 512Mi }
web:
  resources:
    requests: { cpu: 10m, memory: 32Mi }
    limits: { memory: 64Mi }
```

Leave CPU unlimited so image processing can use spare cores. Under the load above, the API and
the worker both use more than 1 core at times.

The worker's memory grows with `WORKER_RUNTIME_CONCURRENCY`: at 4 it peaks at about 610 MiB.
Raise its limit to 1Gi before you raise the concurrency to 4, as the `extraEnv` example above does.
With `worker.enabled: false` the API runs the jobs itself and needs the worker's headroom on top
of its own, about 1Gi in total.

## Upgrade

Each chart release pins the API and web versions it was tested with. Read the
[chart's release notes](https://github.com/eventail-scheduling/eventail-deploy/releases) and
the [API's](https://github.com/eventail-scheduling/eventail-api/releases) before upgrading: a
release that adds a required setting says so. Then run:

```sh
helm upgrade eventail oci://ghcr.io/eventail-scheduling/charts/eventail \
    --namespace eventail --values values.yaml
```
