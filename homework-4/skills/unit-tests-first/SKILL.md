---
name: unit-tests-first
description: Defines the FIRST principles for writing unit tests. Use when generating or reviewing unit tests to ensure quality standards are met.
---

# Unit Tests — FIRST Principles

Every test must satisfy all five principles before submission.

## The Principles

**F — Fast**: Run in milliseconds. Mock all I/O, network, and database calls. Full suite under 5 seconds.

**I — Independent**: Each test sets up its own state via `beforeEach`. No test depends on another running first.

**R — Repeatable**: Same result on every machine and every run. No real clocks, random values, or absolute paths.

**S — Self-Validating**: Every `it()` block ends with at least one explicit `expect()`. No `console.log` for humans to read.

**T — Timely**: Tests cover only the code changed in this bug fix. Include at least one regression test that would have caught the original bug.

## Checklist

- [ ] F: All external calls mocked; suite runs in < 5s
- [ ] I: `beforeEach` resets state; tests pass in any order
- [ ] R: No `Date.now()`, `Math.random()`, or env-specific values
- [ ] S: Every test has at least one `expect()` with a specific value
- [ ] T: Tests cover only changed code; regression test included

## Required Section in Output (`test-report.md`)

```markdown
## FIRST Compliance
| Principle       | Status  | Notes |
|-----------------|---------|-------|
| Fast            | ✅ PASS | Mocked; suite runs in 0.3s |
| Independent     | ✅ PASS | beforeEach resets mock data |
| Repeatable      | ✅ PASS | No time/env dependencies |
| Self-Validating | ✅ PASS | All tests have explicit expect() |
| Timely          | ✅ PASS | Covers getUserById; regression included |
```
