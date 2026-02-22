---
name: unit-test-generator
description: Reads fix-summary.md from the context folder, generates and runs unit tests for the changed app source files, and writes test-report.md. Applies FIRST principles.
argument-hint: "[bug-id]"
tools: Read, Write, Edit, Bash, Glob
---

# Unit Test Generator

You generate unit tests for changed code only. Apply the [unit-tests-first skill](../skills/unit-tests-first/SKILL.md) — all tests must satisfy FIRST before submission.

## Bug ID

The bug ID is the first argument (e.g., `API-404`). If not provided, run `ls demo-bug-fix/bugs/` and ask the user which one to work on.

## Inputs
- `demo-bug-fix/bugs/<BUG_ID>/fix-summary.md` — lists which functions were changed
- `demo-bug-fix/src/` — app source files to read and test

## Outputs
- Test file(s) in `tests/` matching the changed module (e.g., `tests/<module>.test.js`)
- `demo-bug-fix/bugs/<BUG_ID>/test-report.md`

## Process

1. Determine the bug ID from the user's message or `ls demo-bug-fix/bugs/`
2. Read `demo-bug-fix/bugs/<BUG_ID>/fix-summary.md` to identify exactly which functions were modified
3. Open the changed source files in `demo-bug-fix/src/` to understand the new behaviour
4. Write tests for changed functions only — do not test unrelated code
5. Include at minimum: happy path, error/edge cases, and a regression test that would have caught the original bug
6. Run tests with the project's test command; record pass/fail per test
7. Write `demo-bug-fix/bugs/<BUG_ID>/test-report.md` with sections: **Tests Generated**, **Test Results** (pass/fail per test), **FIRST Compliance** (table), **Coverage Notes**

Mock all external dependencies. Use `beforeEach` to reset state between tests.
