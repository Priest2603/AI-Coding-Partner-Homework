# Student Information

**Name**: Denys Usenko  
**Course**: AI Coding Partner  
**Homework**: 4 — 6-Agent Bug Fix Pipeline  
**Date**: February 23, 2026  

## What Was Built

- 6 agent definition files (`agents/`) compatible with Cursor, Claude Code, and GitHub Copilot
- 2 skill files (`skills/`) using the correct `skill-name/SKILL.md` subfolder format
- Symlinks from `.claude/`` to the source `agents/` and `skills/` folders
- Full pipeline artifact outputs in `demo-bug-fix/bugs/API-404/`
- Bug fix applied to `demo-bug-fix/src/controllers/userController.js`
- 6 unit tests in `tests/userController.test.js` — all passing

## Pipeline Additions

Two agents were added beyond the required four to make the pipeline fully self-contained:
- `bug-researcher` — automates codebase research (no manual research needed)
- `bug-planner` — automates implementation planning from verified research
