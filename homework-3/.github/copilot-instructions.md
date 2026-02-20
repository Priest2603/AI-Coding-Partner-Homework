# Copilot Instructions for Travel Mode Project

## Project Structure
```
src/
  types/          # Type definitions only (no logic)
  services/       # Business logic classes
  routes/         # Express route handlers
  middleware/     # Auth, validation, error handling
  utils/          # Pure helper functions
  components/     # React components
tests/
  unit/           # Mirror src/ structure
  integration/    # API endpoint tests
  fixtures/       # Test data
```

## Naming Conventions
- Files: `kebab-case.ts` (e.g., `travel-mode-service.ts`)
- Types/Interfaces: `PascalCase` (e.g., `TravelMode`, `TimeRange`)
- Functions/Variables: `camelCase` (e.g., `isCountryAllowed`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_COUNTRIES`)
- Test files: `*.test.ts` next to source or in `tests/`

## TypeScript Patterns
- Export types from `src/types/index.ts` barrel file
- Use discriminated unions for variants (e.g., `TimeRange`)
- Prefer `interface` for objects, `type` for unions/primitives
- Always define explicit return types on exported functions
- Use `readonly` for immutable properties

## Code Style
- One class/major export per file
- Keep files under 300 lines; split if larger
- Use async/await, never raw Promises with `.then()`
- Destructure function parameters when >2 properties
- Use early returns to reduce nesting

## Patterns to Avoid
- No `any`—use `unknown` and narrow with type guards
- No `enum`—use `as const` objects or union types
- No default exports—use named exports only
- No relative imports crossing `src/` boundaries
- No business logic in route handlers—delegate to services

## Error Handling
- Create custom error classes in `src/types/errors.ts`
- Services throw domain errors; routes catch and map to HTTP
- Always include `correlationId` in error responses
