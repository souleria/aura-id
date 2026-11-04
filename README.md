# Aura ID: Portable AI Identity & Taste Token

A browser-local identity creator and Model Context Protocol (MCP) Taste Token server. Buildless HTML, CSS, and ES modules. No third-party scripts, remote font dependencies, or application database.

## Capabilities

- **Personal AI Profile (`aura-id/profile`)**: Context, communication style, reasoning expectations, visual taste, material preferences, active shopping/intent list, and action boundaries.
- **Scoped Taste Token (`aura-id/taste-token`)**: Strips personal identifiers (name, role, goal, raw instructions) so a personal agent can hand a clean taste vector and active shopping needs to a store's agent without leaking private identity.
- **Agent-to-Agent (A2A) Store Handshake Demo**: Interactive in-browser comparison showing how a store agent filters its catalog using a Taste Token.
- **Zero-Dependency MCP & HTTP Agent Server (`mcp/server.mjs`)**: Exposes `get_taste_token`, `update_taste`, `manage_needs`, and `match_store_catalog` over MCP stdio and HTTP REST endpoints.

## Quick Verification

Run `node --test profile.test.mjs` for export privacy, import validation, Taste Token scoping, and MCP server checks. Static files are in `dist/`.
