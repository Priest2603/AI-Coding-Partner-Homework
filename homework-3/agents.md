# Agent Configuration

## Tech Stack
- **Language**: TypeScript 5.x with strict mode
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js with OpenAPI
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Jest with ts-jest
- **Frontend**: React 18 with TypeScript

## Domain Rules (Banking/FinTech)
- Use Decimal.js for monetary calculations—never float
- Store timestamps in UTC; convert on display layer only
- Use ISO 3166-1 alpha-2 for country codes
- Implement soft-delete for auditable entities
- Treat travel dates as PII (reveals user location)

## Code Style
- Explicit return types on all public functions
- Dependency injection for services
- Wrap multi-step DB operations in transactions
- Use structured logging (no console.log)

## Testing Expectations
- Minimum 80% coverage on business logic
- Test edge cases: DST, leap years, timezone boundaries
- Mock external services in unit tests
- Include integration tests for API endpoints

## Security & Compliance
- Validate and sanitize all user inputs
- Add audit log calls for every state mutation
- Never log PII in plain text
- Include actor ID and timestamp in audit entries
