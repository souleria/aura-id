# Aura ID — Universal Agent Registry & KYA Protocol

The **Global Agent Identity Standard**, **Post-CAPTCHA Machine Passport (`agent.json`)**, and **Scoped Human Taste Token (`aura-id/taste-token`)** for the agentic web.

Built with zero dependencies using pre-rendered static HTML, CSS, and ES modules. Immediately readable by both human browsers and non-JS AI crawlers via `/llms.txt` and `/.well-known/agent.json`.

---

## Core Architecture & Platform Modules

1. **Mint Agent ID Console (Cryptographic KYA Provisioning)**:
   Developers and agent owners enter their agent's name, capabilities (`catalog_search`, `cart_staging`, `code_review`, `paper_indexing`), and owner domain (`souleria.github.io`), receiving an official **Verified Agent ID** (e.g. `AURA-BUY-8D1F-43A0`) and an **Ed25519 Public/Private Keypair** directly in the browser.
2. **Dual Agent Profile (Human Trust Card + Server `agent.json`)**:
   Every registered agent has a dual-view profile:
   - **Human View**: Displays the verified KYA Machine Passport Card, Trust Score (`98/100`), owner domain authority, and maximum autonomous spend boundaries.
   - **Server View (`/.well-known/agent.json`)**: Serves the raw machine-readable JSON specification and HTTP verification headers (`X-Aura-Agent-ID`, `X-Aura-Public-Key`) consumed by API gateways.
3. **Public Agent Explorer (Searchable Network Directory)**:
   A searchable registry of verified AI agents categorized by role (**Shopping / Buyer**, **Research**, **Coding**, **Executive Assistant**) with domain verification badges and trust scores.
4. **Live Bypass CAPTCHA Sandbox**:
   An interactive gateway simulator demonstrating how unregistered bots are blocked behind legacy visual CAPTCHAs (`HTTP 403`), while agents equipped with an **Aura KYA ID** and **Scoped Taste Token** authenticate in milliseconds (`HTTP 200 OK · CAPTCHA BYPASSED`).
5. **Agent-First Discovery Endpoints (`/llms.txt` & `/.well-known/agent.json`)**:
   Static pre-rendered HTML in `<main>` plus root `/llms.txt` and `/.well-known/agent.json` endpoints allow autonomous agents to discover the protocol and directory without executing JavaScript.

---

## Machine Specification (`aura-id/agent.json` v1.0)

```json
{
  "schema": "aura-id/agent.json",
  "version": "1.0",
  "protocol": "Aura-Post-CAPTCHA-Handshake/v1",
  "agent_id": "AURA-BUY-8D1F-43A0",
  "name": "Hermes Procurement v2",
  "owner_domain": "souleria.github.io",
  "role": "buyer",
  "model": "Claude 3.5 Sonnet",
  "capabilities": ["catalog_search", "taste_token_match", "cart_staging"],
  "authentication": {
    "trust_tier": "verified",
    "trust_score": "98/100",
    "public_key": "ed25519:pk_aura_8d1f43a099b2c4e1d7a3f5012b8c",
    "signature_algorithm": "Ed25519",
    "captcha_policy": "bypass-granted"
  },
  "boundaries": {
    "max_spend_limit": "$150 / session",
    "human_approval_required": true
  }
}
```

---

## Live Web App & Discovery Endpoints

- **Live Web App**: [https://souleria.github.io/aura-id/](https://souleria.github.io/aura-id/)
- **LLM Discovery (`/llms.txt`)**: [https://souleria.github.io/aura-id/llms.txt](https://souleria.github.io/aura-id/llms.txt)
- **Agent Registry Manifest (`/.well-known/agent.json`)**: [https://souleria.github.io/aura-id/.well-known/agent.json](https://souleria.github.io/aura-id/.well-known/agent.json)
- **GitHub Repository**: [https://github.com/souleria/aura-id](https://github.com/souleria/aura-id)

---

## Quick Start (Local MCP Server & Tests)

```bash
# Start the Web App + Live Agent Handshake API locally
node mcp/server.mjs --http 8000 --profile ./aura-id-profile.json

# Run automated privacy, Taste Token, and KYA Passport tests
node --test profile.test.mjs
```

---

## Support & Donate a Coffee ☕

Aura ID is an independent, free, and open-source protocol. If you find this project useful, you can support its development by donating the price of a coffee—or any amount you like—directly to the wallets below:

*(برای حمایت از توسعه این پروژه می‌توانید به اندازه یک قهوه یا هر مقداری که دوست دارید به آدرس ولت‌های زیر دونیت کنید)*

- **Tron (USDT TRC20)**:  
  `TUozifQrM8qc2NgAr6AVrVrrBJNpGJS9Bc`
- **Ethereum / MetaMask (EVM — USDT / ETH / USDC / Arbitrum / Base / Polygon)**:  
  `0x8E0Ffb9fED9840BE0C6e343a807535119f6b3a8f`

---

## Prior Art & Copyright

Created and authored by **souleria** (2026). First public specification and reference implementation for the **Universal Agent Registry & KYA (Know Your Agent) Protocol**, **Post-CAPTCHA Machine Passports (`aura-id/agent.json`)**, **Dual Human/Machine Agent Profiles**, and **Scoped Consumer Taste Tokens (`aura-id/taste-token`)** for autonomous agent-to-agent commerce.
