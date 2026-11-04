# Aura ID — Portable Virtual Identity & Taste Token for AI

An open, browser-local identity builder and Model Context Protocol (MCP) Taste Token server. Built with zero-dependency HTML, CSS, and ES modules.

## Why Aura ID?

Instead of repeating your context, communication style, material taste, sizes, and shopping list to every AI and platform, build one portable **Aura ID** and **Scoped Taste Token**:

- **Personal AI Profile (`aura-id/profile`)**: Captures your working context, reply style, honesty preferences, visual surface, material taste, active shopping list, and safety boundaries.
- **Scoped Taste Token (`aura-id/taste-token`)**: Strips personal identifiers (name, role, private notes) so your personal agent can hand a clean taste vector and active needs list to any store agent (`privacy: "scoped-handshake-no-pii"`).
- **MCP & Agent API Server (`mcp/server.mjs`)**: Zero-dependency Node.js server exposing `get_taste_token`, `update_taste`, `manage_needs`, and `match_store_catalog`.

## Quick Start

Run `node mcp/server.mjs --http 8000 --profile ./aura-id-profile.json` to start the web app and live Agent API locally, or run `node --test profile.test.mjs` for automated privacy and schema checks.

## Philosophy

Made to be yours. No sign-up, no tracking database, no third-party scripts.
