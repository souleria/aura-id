# Aura ID: Universal Agent National ID, Explorer & Taste Token Standard

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
