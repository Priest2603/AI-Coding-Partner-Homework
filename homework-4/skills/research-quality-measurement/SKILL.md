---
name: research-quality-measurement
description: Defines quality levels for bug research documents. Use when writing or reviewing codebase-research.md or verified-research.md outputs.
---

# Research Quality Measurement

Rate research on four dimensions (25 pts each) and assign a level.

## Scoring Dimensions

| Dimension | Full marks | Zero |
|---|---|---|
| Reference Accuracy | All file:line refs open and match source | Any fabricated or wrong reference |
| Root Cause Clarity | One sentence, exact mechanism, specific file:line | Vague or symptom-only description |
| Reproduction | Steps + command that demonstrates the failure | No reproduction path |
| Completeness | Full call chain, all affected files, edge cases | Missing significant parts |

## Quality Levels

| Level | Score | Meaning |
|---|---|---|
| PLATINUM | 95–100 | All four dimensions maxed |
| GOLD | 80–94 | All references verified, root cause pinpointed |
| SILVER | 60–79 | Most refs verified, hypothesis supported |
| BRONZE | 40–59 | Some refs, plausible theory |
| FAIL | 0–39 | Unverified claims or missing references |

**Minimum acceptable**: GOLD. SILVER only with a documented reason. BRONZE/FAIL = redo.

## Required Section in Output

```markdown
## Research Quality Assessment
**Level**: GOLD — **Score**: 85/100
- Reference Accuracy: 25/25 — all file:line refs verified
- Root Cause Clarity: 22/25 — clear, minor wording ambiguity
- Reproduction: 20/25 — steps provided, no runnable command
- Completeness: 18/25 — missing NaN edge case
```
