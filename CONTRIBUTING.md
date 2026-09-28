# Contributing

## Setup

`pnpm install` installs the Git hooks. Before each commit, Biome checks and formats the staged
scripts and JSON files; each commit message is checked against the conventions below. Pull
requests get the same check on their title and every commit.

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

Checks run Biome and actionlint, type-check the site config and theme, and build the site.
Every merge to `main` publishes it.

## License

Contributions are licensed under the [Apache License 2.0](LICENSE), the same as the project, as
its section 5 sets out.
