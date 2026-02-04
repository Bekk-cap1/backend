# Contributing

Thanks for contributing to Intercity.

## Development Setup
1. `cp .env.example .env`
2. `docker compose up -d`
3. `npm ci`
4. `npm run migrate`
5. `npm run seed`
6. `npm run start:dev`

## Tests
- Unit tests: `npm run test:cov`
- E2E tests: `npm run test:e2e`

## Code Style
- Run `npm run lint` and `npm run format`
- Keep changes focused and add tests where possible

## Pull Requests
- Use descriptive titles
- Link issues/PRs for context
- Ensure CI passes
