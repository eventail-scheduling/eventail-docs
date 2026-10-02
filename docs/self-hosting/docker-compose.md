# Docker Compose

The Compose setup runs the API, the web app and PostgreSQL on one host. You bring the object
store, the SMTP server, the sign-in provider and a reverse proxy that terminates TLS.

## Before you start

- Docker with the Compose plugin.
- 2 hostnames pointing at the host, one for the web app and one for the API, such as
  `eventail.example.com` and `api.eventail.example.com`. Both apps serve from `/`, so they
  cannot share a hostname.
- A sign-in provider set up as described in [Sign-in provider](/self-hosting/sign-in-provider).
- A bucket set up as described in [Object storage](/self-hosting/object-storage).
- An SMTP server that Eventail can send mail through.

## Get the files

The setup lives in the `compose` directory of
[eventail-deploy](https://github.com/eventail-scheduling/eventail-deploy):

```sh
mkdir eventail && cd eventail
base=https://raw.githubusercontent.com/eventail-scheduling/eventail-deploy/main/compose
for file in compose.yml .env.example api.env.example web.env.example; do
    curl -fsSLO "$base/$file"
done
cp .env.example .env
cp api.env.example api.env
cp web.env.example web.env
```

`compose.yml` pins the API and web images to the same Eventail release; see [Upgrade](#upgrade).

## Configure

The settings are split over 3 files, so each container only receives what it needs.

**`.env`** holds what Compose itself reads and passes on to the containers: the public URLs, the
database password and the host ports.

| Setting                | Meaning                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WEB_URL`              | The web app's public URL exactly as a browser shows it: lowercase scheme and host, a port only when it is not the default, no path and no trailing slash. It is also the origin the API accepts requests from. |
| `API_URL`              | The API's public URL, in the same form.                                                                                                                                                                        |
| `POSTGRES_PASSWORD`    | A password for the bundled database. Set it before the first start: the database keeps the password it was created with, so changing it later locks the API out.                                               |
| `WEB_PORT`, `API_PORT` | The host ports your proxy forwards to.                                                                                                                                                                         |

**`api.env`** configures the API. The example lists every setting an installation must fill
in:

- `JWT_*` and `USER_INFO_*`: see [Sign-in provider](/self-hosting/sign-in-provider). The example
  sets `JWT_INTEGRATION_PREDICATE` to `` `false` ``, which matches no token; keep it until you
  build an integration.
- `S3_*`: see [Object storage](/self-hosting/object-storage).
- Email: set `EMAIL_SENDER`, `EMAIL_SMTP_HOST` and `EMAIL_SMTP_PORT`, and uncomment the
  `EMAIL_SMTP_AUTH_*` pair if your server needs a login.

On port 465 the email connection uses TLS from the start. On other ports it upgrades with
STARTTLS when the server offers it. Set `EMAIL_SMTP_REQUIRE_TLS=true` to make STARTTLS
mandatory.

You can add any other API setting to `api.env` too; [Configuration](/reference/configuration/)
lists them all. An empty value still counts as a value, so leave optional settings commented
out until you need them.

**`web.env`** configures the web app's sign-in: `OIDC_AUTHORITY`, `OIDC_CLIENT_ID`,
`OIDC_SCOPES` and `OIDC_AUDIENCE`. [Sign-in provider](/self-hosting/sign-in-provider) explains
each one.

## Start

```sh
docker compose up -d --wait
```

`--wait` returns once all 3 containers report healthy. The API migrates the database on
startup, so the first run takes longer. If the API keeps restarting, its log says why:

```sh
docker compose logs api
```

One likely cause is an issuer the API cannot reach: it reads the provider's discovery document
at startup and exits if that fails.

## Put a proxy in front

Compose publishes the web app and the API on the host's `127.0.0.1` only. Docker's published
ports bypass host firewalls such as ufw, and the loopback binding is what keeps them off the
network. A reverse proxy on the same host has to forward to them.

Any reverse proxy works. [Caddy](https://caddyserver.com) obtains TLS certificates on its own.
If you install it on the host, this is all the configuration it needs:

```text
eventail.example.com {
    reverse_proxy 127.0.0.1:8080
}

api.eventail.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Use the ports from your `.env` if you changed them. A proxy running in a container of its own
reaches the host's `127.0.0.1` only with host networking.

## Sign in

Open `WEB_URL` and sign in with the account that `JWT_SUPER_ADMIN_PREDICATE` matches. As a super
admin, you create the first team and the first edition. If signing in fails,
[Sign-in provider](/self-hosting/sign-in-provider) lists what the API checks.

## Upgrade

Read [Eventail's release notes](https://github.com/eventail-scheduling/eventail/releases) before
upgrading: a release that adds a required setting says so, and the API refuses to start until it
is set. The Compose files are not released on their own; you always fetch the current ones.

Fetching `compose.yml` again replaces it, so keep your own additions in a `compose.override.yml`
next to it, which Compose merges automatically. A
[standalone worker](/self-hosting/workers#run-standalone-workers) belongs there too; after each
upgrade, set its image tag to the API's.

Then fetch `compose.yml` again, or change its 2 image tags, and run:

```sh
docker compose pull
docker compose up -d --wait
```

The API applies new migrations on start.

## Back up and restore

Everything Eventail stores lives in 2 places: the PostgreSQL database and the bucket. The database
is in the `postgres-data` volume, which `docker volume ls` lists as `eventail_postgres-data`,
whatever you named the directory holding `compose.yml`. `pg_dump` takes a consistent copy while
Eventail keeps running:

```sh
docker compose exec postgres pg_dump -U eventail eventail > eventail.sql
```

To restore into a fresh installation, start only the database, load the dump, then start the
rest:

```sh
docker compose up -d --wait postgres
docker compose exec -T postgres psql -U eventail eventail < eventail.sql
docker compose up -d --wait
```

Back the bucket up with the tools of your object store.
