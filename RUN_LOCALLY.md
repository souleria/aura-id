# Run Aura ID & MCP Server Locally

This archive contains the complete source of Aura ID, including the static web application (`dist/`), the Model Context Protocol & Agent API server (`mcp/server.mjs`), automated tests (`profile.test.mjs`), and design notes (`DESIGN.md`).

## 1. Run the Web App + Live Agent API (Node.js)

From the `Aura-ID` folder:

```bash
node mcp/server.mjs --http 8000 --profile ./aura-id-profile.json
```

Open `http://localhost:8000` in your browser. This also serves:
- `GET /.well-known/aura-id.json` — Protocol discovery manifest
- `GET /api/taste-token` — Current scoped Taste Token (PII stripped)
- `POST /api/needs` — Add/remove active shopping needs (`{"action":"add","item":"Running shoes"}`)
- `POST /api/a2a/store-match` — Agent-to-Agent store catalog matcher

*(Alternatively, for static-only hosting without the API, run `python3 -m http.server 8000 --directory dist`.)*

## 2. Connect to Claude Desktop, Cursor, or Any MCP Client

Add the following to your MCP configuration (`claude_desktop_config.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "aura-id": {
      "command": "node",
      "args": ["/absolute/path/to/Aura-ID/mcp/server.mjs", "--profile", "/absolute/path/to/Aura-ID/aura-id-profile.json"]
    }
  }
}
```

## 3. Run Automated Tests

```bash
node --test profile.test.mjs
```
