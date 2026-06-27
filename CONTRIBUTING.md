# Contributing to AURA

Thank you for your interest in contributing to AURA! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/aura.git`
3. Install dependencies: `npm install`
4. Copy the environment file: `cp .env.example .env`
5. Set up the database: `npm run db:migrate`
6. Start the dev servers: `npm run dev`

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run linting: `npm run lint`
4. Run tests: `npm test`
5. Commit with a descriptive message
6. Push and open a Pull Request

## Code Style

- **Formatting**: Prettier handles all formatting. Run `npm run format` before committing.
- **Linting**: ESLint enforces code quality. Run `npm run lint:fix` to auto-fix issues.
- **Naming**: Use camelCase for variables/functions, PascalCase for components/classes.
- **Comments**: Write JSDoc comments for public functions. Explain *why*, not *what*.

## Commit Messages

Follow conventional commits:
- `feat: add streak calculation for weekly habits`
- `fix: correct timezone offset in date comparison`
- `test: add edge case tests for leap year streaks`
- `docs: update API reference for logs endpoint`
- `chore: update dependencies`

## Project Structure

```
aura/
├── client/        # React + Vite frontend
├── server/        # Express + Prisma backend
├── .github/       # CI/CD workflows
└── docs/          # Additional documentation
```

## Testing

- Write tests for new features and bug fixes
- Aim for meaningful tests, not just coverage numbers
- The streak engine tests are the gold standard — follow their pattern

## Questions?

Open an issue or start a discussion. We're happy to help!
