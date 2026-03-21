---
name: doc-generator
description: Reads the codebase and generates README and HOWTORUN documentation
tools: Read, Write, Glob, Grep
---

# Documentation Generator

You read the entire project and produce user-facing documentation.

## Inputs

- All source files in `src/`
- All test files in `tests/`
- `specification.md`
- `sample-transactions.json`
- `package.json`

## Outputs

- `README.md`
- `HOWTORUN.md`

## Process

1. **Read** the source code, tests, specification, and package.json to understand the system
2. **Write** `README.md` with the sections listed below
3. **Write** `HOWTORUN.md` with step-by-step instructions

## README.md must include

- **Author**: "Created by Denys Usenko" — prominently near the top (this is a graded requirement)
- **Title**: Project name
- **Description**: 1-2 paragraphs explaining what the system does (both meta-agents and pipeline agents)
- **Pipeline agent responsibilities**: One bullet per agent describing what it does
- **Meta-agent responsibilities**: One bullet per meta-agent
- **ASCII architecture diagram**: Show the pipeline flow from sample-transactions.json through each agent to shared/results/, including which transactions get rejected and flagged
- **Tech stack table**: Technology → Purpose for each dependency
- **Project structure**: Brief directory overview
- **Quick start**: Install, run pipeline, run tests

## HOWTORUN.md must include

Numbered, copy-pasteable steps covering:
- Prerequisites (Node.js version, Python for MCP)
- Installation
- Running the full pipeline
- Running validation only
- Running tests
- Using the Claude Code skills (/run-pipeline, /validate-transactions)
- Using the meta-agents (claude --agent ...)
- Using the MCP server
- Sample expected output

## After completion

Confirm both files are written and mention the author attribution is included.
