# Configuration

This page lists every setting the API and the standalone worker read, generated from the API's
own schema. You can set each one as an environment variable or in a file inside the container,
`/app/config/local.toml` or `/app/config/local.json`. Environment variables override the file.

An environment variable's name is the setting's path in upper case, with underscores between words
and between path parts: `jwt.superAdminPredicate` becomes `JWT_SUPER_ADMIN_PREDICATE`. A list
takes 1 variable per entry, numbered from 0, such as `JWT_ALGORITHMS_0`. An empty variable still
counts as set. The Setting column shows the variable's name on its second line.

Durations use ISO 8601 notation, such as `PT30S` or `P7D`. Intervals accept time units only:
`PT24H` works, `P1D` does not.

The web app has settings of its own, which [Sign-in provider](/self-hosting/sign-in-provider)
lists.

<ConfigReference />
