# Aura ID: Universal Agent National ID & Taste Token Standard

The open reference standard for **Human Taste Tokens** and **Autonomous Agent National IDs** in the post-UI, post-CAPTCHA agentic web.

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
