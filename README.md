# Eventail docs

The documentation site for Eventail, a call for papers and scheduling system for conferences. It
is published at https://eventail-scheduling.github.io/eventail-docs/ and covers running
[Eventail](https://github.com/eventail-scheduling/eventail) and building integrations against it.

## Development

Requires Node.js 26 and pnpm.

```sh
pnpm install
pnpm start
```

The site runs on http://localhost:5173/eventail-docs/ and reloads as pages change.

## Checks

`pnpm typecheck` checks the site config, theme and data loaders. `pnpm check` formats and lints
them with Biome. `pnpm build` builds the site as it is published, and fails on a link to a page
that does not exist.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
