# How to Run

## Run the App

```bash
cd demo-bug-fix
npm install
npm start
# API available at http://localhost:3000
```

Test the fixed endpoint:
```bash
curl http://localhost:3000/api/users/123
# {"id":123,"name":"Alice Smith","email":"alice@example.com"}
```

## Run the Tests

```bash
cd demo-bug-fix
npm test
# 6 tests, all pass
```

## Run the Agent Pipeline

Agents are generic — they work on any bug. Pass the bug ID (the folder name under `demo-bug-fix/bugs/`) when invoking each agent.

The agents are pre-discovered by your AI tool via symlinks. Run them in order, one at a time. Each agent reads the previous agent's output file and writes its own.

### In Claude Code

```bash
cd homework-4

# Run each agent in sequence, passing the bug ID
claude --agent bug-researcher "API-404"
claude --agent research-verifier "API-404"
claude --agent bug-planner "API-404"
claude --agent bug-implementer "API-404"
claude --agent security-verifier "API-404"
claude --agent unit-test-generator "API-404"
```

### In GitHub Copilot (VS Code)

1. Open VS Code with the GitHub Copilot extension
2. Open Chat panel
3. Select the agent from the dropdown and type the bug ID:

```
@bug-researcher API-404
```

After each agent completes, click the **handoff button** shown in the chat to automatically move to the next agent with the bug ID pre-filled.

## Adding a New Bug

To run the pipeline on a different bug:

1. Create `demo-bug-fix/bugs/<NEW-BUG-ID>/bug-context.md` with the bug report
2. Run each agent with the new bug ID instead of `API-404`

## Skills

Skills are auto-discovered from the tool-specific folders (symlinked to `skills/`). No manual setup needed — agents reference them automatically.

## Pipeline Outputs

After running all agents for a given bug ID:

```
demo-bug-fix/bugs/<BUG-ID>/
├── research/codebase-research.md     ← agent 1 output
├── research/verified-research.md     ← agent 2 output
├── implementation-plan.md            ← agent 3 output
├── fix-summary.md                    ← agent 4 output
├── security-report.md                ← agent 5 output
└── test-report.md                    ← agent 6 output
```
