# Eventail Docs

The documentation site for Eventail, a call for papers and scheduling system for conferences,
published at https://eventail-scheduling.github.io/eventail-docs/. It covers running the
[Eventail API](https://github.com/eventail-scheduling/eventail-api) and the
[Eventail Web](https://github.com/eventail-scheduling/eventail-web) client, and building
integrations against them.

## Development

Requires Node.js 26 and pnpm.

- `pnpm install`
- `pnpm dev`

The site runs on http://localhost:5173/eventail-docs/ and reloads as pages change.

## Checks

`pnpm typecheck` checks the site config and theme. `pnpm build` builds the site as it
is published, and fails on a link to a page that does not exist.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
