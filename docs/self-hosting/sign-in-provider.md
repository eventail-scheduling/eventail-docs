# Sign-in provider

Eventail signs people in through an OpenID Connect provider, such as Keycloak. The web app
obtains access tokens from it, and the API checks them. Eventail keeps no passwords and no
sign-in state of its own.

The provider needs a client for the web app, and a second one once you build an
[integration](/integration/schedule).

Settings below are shown as environment variables, as in the Docker Compose setup. The `OIDC_*`
ones go to the web app's container and the rest to the API's. The Helm chart has values for the
common settings (`helm show values` lists them); anything else goes into `api.extraEnv`.
[Configuration](/reference/configuration/#jwt) lists the API's token settings in full.

## The web app's client

Set the client up as a public client: a single-page app without a client secret, using the
authorization code flow with PKCE.

| Provider setting          | Value                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| Redirect URI              | `https://<web app host>/authentication/callback`                 |
| Post-logout redirect URI  | `https://<web app host>/`                                        |
| Allowed web origin (CORS) | `https://<web app host>`                                         |
| Refresh tokens            | Enabled. The web app renews its tokens only with refresh tokens. |

The web app always requests the scopes `openid` and `offline_access`, plus the ones in
`OIDC_SCOPES`. Allow all of them on the client.

The web app's settings:

| Setting          | Meaning                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OIDC_AUTHORITY` | The provider's issuer URL.                                                                                                                           |
| `OIDC_CLIENT_ID` | The client ID.                                                                                                                                       |
| `OIDC_SCOPES`    | Scopes to request besides `openid` and `offline_access`. The Helm chart and the Compose example set it to `profile email`; the image has no default. |
| `OIDC_AUDIENCE`  | Only for providers that take an audience parameter on the token request. Leave it empty otherwise.                                                   |

In the Helm chart these are `web.oidc.authority`, `web.oidc.clientId`, `web.oidc.scopes` and
`web.oidc.audience`.

## What the API checks

The API's settings:

| Setting                     | Meaning                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `JWT_ISSUER`                | The provider's issuer URL, usually the same as `OIDC_AUTHORITY`.                                  |
| `JWT_AUDIENCE`              | A name you pick for the API, such as `eventail`, which the provider puts into `aud`.              |
| `JWT_SUPER_ADMIN_PREDICATE` | Who is a super admin; see [Super admins](#super-admins).                                          |
| `JWT_INTEGRATION_PREDICATE` | Which tokens belong to an integration; see [The integration's client](#the-integration-s-client). |

In the Helm chart these are `jwt.issuer`, `jwt.audience`, `jwt.superAdminPredicate` and
`jwt.integrationPredicate`.

The API accepts an access token when:

- It is a JWT signed with a key from the provider's published key set, using an algorithm
  listed in `JWT_ALGORITHMS_0`, `JWT_ALGORITHMS_1` and so on. The default list is `RS256`.
  The API supports neither shared-secret algorithms such as `HS256` nor opaque tokens.
- Its `iss` claim is exactly `JWT_ISSUER`.
- Its `aud` claim contains `JWT_AUDIENCE`.

Configure the provider to put `JWT_AUDIENCE` into the `aud` claim. In Keycloak, add an audience
mapper to the web app's client, and to the integration's.

At startup the API reads the discovery document from
`<JWT_ISSUER>/.well-known/openid-configuration`. It does not start while the provider is
unreachable or the document lacks `jwks_uri` or `userinfo_endpoint`.

If tokens are rejected and the cause is unclear, `JWT_DEBUG=true` puts the reason into each
401 response. Only turn it on while debugging: it tells every client why its token failed.

## Names and email addresses

The API calls the provider's userinfo endpoint with a person's access token, so the provider
has to offer one that accepts the web app's tokens. Set 2 [JMESPath](https://jmespath.org)
expressions to say where the userinfo response holds the name and the email address:

| Setting                        | Typical value |
| ------------------------------ | ------------- |
| `USER_INFO_DISPLAY_NAME_PATH`  | `name`        |
| `USER_INFO_EMAIL_ADDRESS_PATH` | `email`       |

With a path set, the value comes from the provider and people cannot change it in Eventail.
Leave a path unset and people enter that value themselves.

When a path is set but the provider sends no usable value, the person sees a page explaining
that their sign-in provider did not send it. The same happens when the expression fails on
what the provider sends, and the API then logs an error naming the setting. For a name built
from 2 claims, filter out missing parts, or a person without a family name is refused:

```text
join(' ', [given_name, family_name][?@])
```

The API caches each person's userinfo response for 5 minutes. `USER_INFO_CACHE_TTL` changes that;
it takes an ISO 8601 duration such as `PT5M`.

## Super admins

A super admin holds every team role without being on a team, and is the only one who can see,
retry and cancel background jobs. A fresh installation has no teams, and only an admin or a
super admin can create one, so whoever sets Eventail up needs this role.

The required `JWT_SUPER_ADMIN_PREDICATE` decides who is a super admin. The role comes from the
provider; nobody can grant it inside Eventail.

The setting is a JMESPath expression evaluated against the verified access token; a truthy
result grants the role:

```text
sub == 'a1b2c3'
sub == 'a1b2c3' || sub == 'd4e5f6'
contains(realm_access.roles || `[]`, 'eventail-admin')
```

`sub` is the subject, the provider's ID for the account. In Keycloak it is the ID on the user's page
under Users; with other providers, decode an access token and read its `sub` claim.

The last example reads a Keycloak realm role. The `` `[]` `` fallback is needed: without it, the
expression fails for every token that lacks the claim. An expression that fails counts as
false, and the API logs it.

## The integration's client

An integration signs in as itself, with the client credentials flow: a confidential client
with a secret, and no person involved. Its tokens must pass the same checks as above,
including the audience.

`JWT_INTEGRATION_PREDICATE` recognizes its tokens. It is a JMESPath expression, like the super
admin predicate, and it is required too. Until you build an integration, set it to
`` `false` ``, which matches no token. Once you have one, match the claim that names its
client; Keycloak puts the client ID into `azp`:

```text
azp == 'eventail-integration'
```

[Showing the schedule](/integration/schedule#read-the-edition-s-configuration-and-files) lists
what such a token can read. Eventail creates no user account for it.
