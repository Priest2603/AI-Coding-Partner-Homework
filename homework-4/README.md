# Homework 4: 6-Agent Bug Fix Pipeline

> **Student Name**: Denys Usenko  
> **Date Submitted**: February 23, 2026  
> **AI Tools Used**: GitHub Copilot

A fully automated bug investigation and fix pipeline using 6 AI agents. The pipeline researches a bug, verifies findings, plans and applies the fix, runs a security review, and generates unit tests — each step handled by a dedicated agent.

## Pipeline

```
Bug Researcher → Research Verifier → Bug Planner → Bug Implementer → Security Verifier
                                                                    ↘ Unit Test Generator
```

Each agent reads the previous agent's output file and writes its own — the file system is the message bus.

Agents are **generic** — pass any bug ID when invoking them (e.g., `API-404`, `AUTH-123`). They read from and write to `demo-bug-fix/bugs/<BUG_ID>/`.

| Step | Agent | Output |
|------|-------|--------|
| 1 | bug-researcher | `demo-bug-fix/bugs/<BUG_ID>/research/codebase-research.md` |
| 2 | research-verifier | `demo-bug-fix/bugs/<BUG_ID>/research/verified-research.md` |
| 3 | bug-planner | `demo-bug-fix/bugs/<BUG_ID>/implementation-plan.md` |
| 4 | bug-implementer | modified source files + `demo-bug-fix/bugs/<BUG_ID>/fix-summary.md` |
| 5 | security-verifier | `demo-bug-fix/bugs/<BUG_ID>/security-report.md` |
| 6 | unit-test-generator | `tests/<module>.test.js` + `demo-bug-fix/bugs/<BUG_ID>/test-report.md` |

## Project Structure

```
homework-4/
├── agents/          # 6 agent definition files (.agent.md)
├── skills/          # 2 reusable skill definitions (subfolder/SKILL.md)
├── demo-bug-fix/    # Express API app
├── tests/           # Generated unit tests
├── docs/screenshots/
├── .claude/         # Symlinks → agents/ and skills/ (Claude Code)
```

## Skills

- `skills/research-quality-measurement/` — quality levels (PLATINUM/GOLD/SILVER/BRONZE/FAIL) for bug research
- `skills/unit-tests-first/` — FIRST principles checklist for unit tests

## Requirements

- Node.js 18+
- An AI coding tool: Cursor, Claude Code, or GitHub Copilot

## Quick Start

See [HOWTORUN.md](HOWTORUN.md) for full instructions on running the pipeline and the app.
