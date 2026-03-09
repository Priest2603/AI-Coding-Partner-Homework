# How to Run

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — FastMCP uses `uv` to run servers

## Install Dependencies

```bash
cd custom-mcp-server
pip install fastmcp
```

## Connect to Claude Code

Use `fastmcp install` to auto-configure:

```bash
cd custom-mcp-server
fastmcp install claude-code server.py
```

This adds the server to your Claude Code MCP settings with the correct `uv` command format.

Restart Claude Code to load the server.

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
