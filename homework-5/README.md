# Homework 5: MCP Servers

> **Student Name**: Denys Usenko  
> **Date Submitted**: March 8, 2026  
> **AI Tools Used**: Claude Code

Configure external MCP servers (GitHub, Filesystem, Jira) and build a custom MCP server with FastMCP.

## Tasks

| Task | Server | Status |
|------|--------|--------|
| 1 | GitHub MCP | Configured |
| 2 | Filesystem MCP | Configured |
| 3 | Jira MCP | Configured |
| 4 | Custom MCP (FastMCP) | Implemented |

## Custom MCP Server

A FastMCP server exposing lorem ipsum content via:
- **Tool**: `read(word_count)` — function to get N words
- **Resource**: `lorem://content/default` — returns 30 words (discoverable)
- **Resource Template**: `lorem://content/{word_count}` — dynamic URI pattern

> **Note:** Looks like Claude Code doesn't support resource templates yet ([issue #3122](https://github.com/anthropics/claude-code/issues/3122)).

### MCP Concepts

| Primitive | Description | Example |
|-----------|-------------|---------|
| **Tool** | Actions Claude can call to perform operations | Read file, run command, send request |
| **Resource** | URIs that Claude can read from | Files, APIs, databases |
| **Resource Template** | Dynamic URI patterns for programmatic access | `users://{id}/profile` |

### Verification

| Check | Status |
|-------|--------|
| Server starts with `python server.py` | ✅ |
| MCP config (`.mcp.json`) points to server | ✅ |
| `fastmcp` in `pyproject.toml` dependencies | ✅ |

## MCP Server Configuration

All servers are configured in `.mcp.json`:

| Server | Type | Setup Required |
|--------|------|----------------|
| **github** | HTTP | Replace `Bearer XXX` with your GitHub PAT |
| **atlassian** | HTTP/OAuth | Run `/mcp` in Claude → select atlassian → authenticate |
| **my-filesystem** | stdio | Works out of the box (requires Node.js) |
| **lorem-mcp** | stdio | Works out of the box (requires `uv`) |

## Project Structure

```
homework-5/
├── README.md
├── HOWTORUN.md
├── .mcp.json          # All MCP server configs
├── custom-mcp-server/
│   ├── server.py
│   ├── lorem-ipsum.md
│   └── pyproject.toml
└── docs/screenshots/
```

## Quick Start

See [HOWTORUN.md](HOWTORUN.md) for setup and usage.
