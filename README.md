# Aura ID: Universal Agent National ID & Taste Token Standard

The open reference standard for **Human Taste Tokens** and **Autonomous Agent National IDs** in the post-UI, post-CAPTCHA agentic web.# Aura ID: Universal Agent National ID, Explorer & Taste Token Standard

The open reference standard for **Autonomous Agent National IDs (`agent.json`)**, **Post-CAPTCHA Machine Verification**, and **Human Taste Tokens** in the agentic web.

Built with zero dependencies using pure HTML, CSS, and ES modules. No third-party tracking, remote fonts, or mandatory cloud lock-in.

## Core Architecture & Platform Modules

1. **Mint Agent ID Console (Cryptographic Provisioning)**:
   Developers and agent owners enter their agent's name, capabilities (`catalog_search`, `cart_staging`, `code_review`, `paper_indexing`), and owner domain (`souleria.github.io`), receiving an official **Agent National ID** (e.g. `AURA-BUY-8D1F-43A0`) and an **Ed25519 Public/Private Keypair** directly in the browser.
2. **Dual Agent Profile (Human Trust Card + Server `agent.json`)**:
   Every registered agent has a dual-view profile:
   - **Human View**: Displays the verified Machine Passport Card, Trust Score (`98/100`), owner domain authority, and maximum autonomous spend boundaries.
   - **Server View (`/.well-known/agent.json`)**: Serves the raw machine-readable JSON specification and HTTP verification headers (`X-Aura-Agent-ID`, `X-Aura-Public-Key`) consumed by API gateways.
3. **Public Agent Explorer (Searchable Network Directory)**:
   A searchable registry of verified AI agents categorized by role (**Shopping / Buyer**, **Research**, **Coding**, **Executive Assistant**) with domain verification badges and trust scores.
4. **Live Bypass CAPTCHA Sandbox**:
   An interactive gateway simulator demonstrating how unregistered bots are blocked behind legacy visual CAPTCHAs (`HTTP 403`), while agents equipped with an **Aura ID** and **Scoped Taste Token** authenticate in milliseconds (`HTTP 200 OK · CAPTCHA BYPASSED`).

## Support & Donate a Coffee ☕

Aura ID is an independent, free, and open-source protocol. If you find this project useful, you can support its development by donating the price of a coffee—or any amount you like—directly to the wallets below (برای حمایت از توسعه این پروژه می‌توانید به اندازه یک قهوه یا هر مقداری که دوست دارید به آدرس ولت‌های زیر دونیت کنید):

- **Tron (USDT TRC20)**: `TUozifQrM8qc2NgAr6AVrVrrBJNpGJS9Bc`
- **Ethereum / MetaMask (EVM — USDT / ETH / USDC / Arbitrum / Base / Polygon)**: `0x8E0Ffb9fED9840BE0C6e343a807535119f6b3a8f`

## Prior Art & Copyright

Created and authored by **souleria** (2026). First public specification and reference implementation for **Agent National IDs (`aura-id/agent.json`)**, **Post-CAPTCHA Machine Passports**, **Dual Human/Machine Agent Profiles**, and **Scoped Consumer Taste Tokens (`aura-id/taste-token`)** for autonomous agent-to-agent commerce.

Built with zero dependencies using pure HTML, CSS, and ES modules. No third-party scripts, tracking cookies, or cloud databases required.

---

## The Vision: What Happens When CAPTCHAs Die?

Today, websites treat AI agents as hostile scrapers, blocking them behind image puzzles, slider CAPTCHAs, and Cloudflare challenges. But in an agent-first internet:

1. **Every AI agent needs an official National ID (Machine Passport)**: Just like citizens hold passports with cryptographic security, autonomous agents running tasks for humans need an **Agent National ID** (e.g. `AURA-BUY-4A2F-9C10`) that proves legitimate human sponsorship without exposing the human's real name or private credentials.
2. **Post-CAPTCHA Machine Authentication**: Instead of stopping bots with CAPTCHA puzzles, platforms check the agent's **Aura Machine Passport**:
   - Cryptographic proof of human sponsor (`proof-of-owner-bound-token`)
   - Verified Trust Tier (`verified`, `supervised`, `sandboxed`)
   - Pre-declared autonomous spending and action limits (`$150 / session`)
3. **Agent-to-Agent (A2A) Commerce Handshakes**: When a buyer agent lands on an online store, it hands over a **Scoped Taste Token** (`privacy: "scoped-handshake-no-pii"`). The store's merchant agent immediately surfaces products matching the human's taste and active shopping list.

---

## Core Specification Schemas

### 1. Agent National ID & Machine Passport (`aura-id/agent-passport` v1.0)
```json
{
  "schema": "aura-id/agent-passport",
  "version": "1.0",
  "protocol": "Aura-Agent-Verification/v1",
  "agent": {
    "id": "AURA-BUY-8D1F-43A0",
    "name": "Hermes Buyer",
    "role": "buyer",
    "model_class": "Claude 3.5 / GPT-4o Class"
  },
  "auth": {
    "trust_tier": "verified",
    "verification_method": "proof-of-owner-bound-token",
    "replaces_captcha": true,
    "anti_sybil_score": "0.98/1.0"
  },
  "boundaries": {
    "actions": "ask",
    "spending_limit": "$150 / session",
    "authority_scope": "read_catalog_and_stage_cart"
  }
}
```

### 2. Scoped Taste Token (`aura-id/taste-token` v0.2)
Carries personal aesthetic preferences, material constraints, sizes, and active shopping lists with zero PII.

---

## Live Demo & Web App

- **Live URL**: [https://souleria.github.io/aura-id/](https://souleria.github.io/aura-id/)
- **Repository**: [https://github.com/souleria/aura-id](https://github.com/souleria/aura-id)

---

## Quick Start & Verification

```bash
# Run web app & live Agent API locally (Node.js)
node mcp/server.mjs --http 8000 --profile ./aura-id-profile.json

# Run automated privacy, schema, and Agent Passport tests
node --test profile.test.mjs
```

---

## Support the Open Protocol ☕

Aura ID is independent, free, and open-source with zero tracking. If you'd like to support the development of the Agent National ID and Taste Token standard, you can send crypto directly to the project's wallets:

- **Tron (USDT TRC20)**:  
  `TUozifQrM8qc2NgAr6AVrVrrBJNpGJS9Bc`
- **Ethereum / Arbitrum / Base / Polygon (USDT / ETH / USDC)**:  
  `0x8E0Ffb9fED9840BE0C6e343a807535119f6b3a8f`

---

## Prior Art & Copyright

Created by **souleria** (2026). First public specification for Agent National IDs, machine passports replacing CAPTCHA challenges, and scoped consumer taste tokens for autonomous agent-to-agent transactions. Licensed under MIT / Open Standard.
