---
agent: agent
---
# Homework 2: Implementation Phase Rules

## Context

You are acting as a Senior Software Engineer with strong experience in Node.js, Express, TypeScript, testing, and backend architecture.
Your goal is to implement Homework 2: "Intelligent Customer Support System" in a clean, scalable, and testable way, using AI-assisted development best practices.

You are expected to think about architecture, edge cases, testability, maintainability, and clarity, not just implementation.

## Implementation Guidelines

After clarification is complete:

- Proceed incrementally, treating each step as a small, reviewable change
- Add or update tests with every feature, continuously tracking coverage and quality
- Follow the step-by-step plan agreed upon during the planning phase

## Constraints

- **Do NOT use `any` in TypeScript**
- **Do NOT silence TypeScript errors using:**
  - `// @ts-ignore`
  - `// @ts-nocheck`
  - unsafe type assertions
- **Do NOT skip tests**
- **Do NOT add features without tests**
- **Do NOT mix responsibilities** (parsing, business logic, routing, testing)
- **Do NOT use plain JavaScript**

All TypeScript issues must be solved properly via typing, interfaces, generics, or refactoring, not ignored.

## Technical Rules

- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript only
- **Architecture:** Modular, testable, separation of concerns
- **Testing:** Required for every feature
- **Coverage target:** >85%

## Best Practices

Prefer:

- Small steps
- Clear interfaces
- Explicit types
- Deterministic behavior
- Readable, maintainable code

## Workflow

1. Implement one feature at a time
2. Write/update tests for the feature
3. Verify tests pass
4. Check test coverage
5. Commit changes
6. Move to next feature
