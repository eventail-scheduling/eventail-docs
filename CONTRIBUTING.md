# Contributing

## Setup

`pnpm install` installs the Git hooks. Before each commit, Biome checks and formats the staged
scripts and JSON files, and a hook checks the commit message against the conventions below. Pull
requests get the message check too, on their title and on every commit.

## Commit messages

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): subject`, for example `docs: explain the bucket policy for public images`.

- **Type:** `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`,
  `style` or `test`. Page content is `docs`; changes to the theme or how the site behaves
  are `feat` or `fix`.
- **Scope:** optional, and only `deps` or `deps-dev`, for dependency updates.
- **Body:** lines of at most 100 characters. Say why the change is made; the diff shows what
  changed.

## Pull requests

CI runs Biome and actionlint, type-checks the site config, theme and data loaders, and builds
the site. Every merge to `main` publishes it.

## License

Contributions are licensed under the [Apache License 2.0](LICENSE), like the rest of the project
(see section 5 of the license).
