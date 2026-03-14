# How to Run

## Prerequisites

- Python 3.10+
- Node.js (for filesystem MCP server)
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — FastMCP uses `uv` to run servers

## Quick Start

All MCP servers are configured in `.mcp.json`. To use them:

```bash
cd homework-5
claude
```

Claude Code will automatically load all servers from `.mcp.json`.

## Server Configuration

### 1. GitHub MCP Server

Edit `.mcp.json` and replace `Bearer XXX` with your GitHub Personal Access Token:

```json
"Authorization": "Bearer ghp_your_actual_token_here"
```

To create a PAT: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens

### 2. Atlassian/Jira MCP Server

Authenticate via OAuth:

1. Run Claude Code: `claude`
2. Type `/mcp` to open the MCP dialog
3. Select **atlassian** server
4. Follow the OAuth flow to authenticate with your Atlassian account

### 3. Filesystem MCP Server

Works out of the box. Uses `npx` to run `@modelcontextprotocol/server-filesystem`.

### 4. Custom Lorem MCP Server

Works out of the box. Uses `uv` to run the FastMCP server from `custom-mcp-server/server.py`.

## Test

**Tool** (recommended):
```
"Use the lorem-mcp read tool to get 10 words"
```

**Resource**:
```
"Read the data from lorem-mcp server resource"
```

**Resource Template**:
```
"Read the data from @lorem-mcp:lorem://content/5"
```

## MCP Concepts

| Primitive | URI | Description |
|-----------|-----|-------------|
| **Tool** | `read(word_count)` | Function Claude calls with parameters |
| **Resource** | `lorem://content/default` | Fixed URI, discoverable in resource list |
| **Resource Template** | `lorem://content/{word_count}` | Dynamic URI pattern |

### When to use each

- **Tool** — Best for interactive use, Claude discovers it automatically
- **Resource** — For fixed data Claude can browse/read
- **Resource Template** — For programmatic/agent workflows where caller knows the URI pattern

## Troubleshooting

| Issue | Solution |
|-------|----------|
| GitHub tools fail with 401 | Replace `Bearer XXX` with valid PAT in `.mcp.json` |
| Jira/Atlassian tools fail | Run `/mcp` → select atlassian → complete OAuth |
| Filesystem server not found | Ensure Node.js and npm are installed |
| Lorem MCP fails to start | Ensure `uv` is installed: `pip install uv` |
