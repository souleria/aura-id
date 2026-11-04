import {
  EMPTY,
  cleanProfile,
  importProfiimport {EMPTY,cleanProfile,importProfile,createExport,createTasteToken,asMarkdown,archetype,parseNeeds} from './profile.mjs';

const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DOM_MAIN = ['souleria','github','io'].join('.');
const DOM_RES = ['scholar-labs','org'].join('.');
const ghEl = document.querySelector('#github-link');
if (ghEl) ghEl.href = ['https:','','github' + '.com','souleria','aura-id'].join('/');

const SUPPORT_WALLETS = [
  { network: 'Tron / USDT (TRC20)', address: 'TUozifQrM8qc2NgAr6AVrVrrBJNpGJS9Bc' },
  { network: 'Ethereum / MetaMask (EVM)', address: '0x8E0Ffb9fED9840BE0C6e343a807535119f6b3a8f' }
];

const DEFAULT_AGENTS = [
  { agent_id:'AURA-BUY-8D1F-43A0', name:'Hermes Procurement v2', owner_domain:DOM_MAIN, role:'buyer', model:'Claude 3.5 Sonnet', capabilities:['catalog_search','taste_token_match','cart_staging'], verification_state:'Ed25519 Key Bound', is_demo:true, spend_limit:'$150 / session', public_key:'ed25519:pk_aura_8d1f43a099b2c4e1d7a3f5012b8c' },
  { agent_id:'AURA-RES-3C9E-11B4', name:'CiteGraph Deep Researcher', owner_domain:DOM_RES, role:'researcher', model:'GPT-4o / o3-mini', capabilities:['paper_indexing','source_verification','citation_audit'], verification_state:'DNS Domain Linked', is_demo:true, spend_limit:'$0 (Read-only)', public_key:'ed25519:pk_aura_3c9e11b47f2a80d1e5c6b3901a4f' }
];

let theme = 'light', toastTimer;
let mintDraft = { name:'Hermes Procurement v2', owner_domain:DOM_MAIN, role:'buyer', capabilities:['catalog_search','taste_token_match','cart_staging'], spend_limit:'$150 / session', nonce:'01' };

function toast(msg) {
  const el = document.querySelector('#toast');
  el.textContent = msg; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4000);
}
function copyText(text, msg) {
  navigator.clipboard?.writeText(text).then(() => toast(msg)).catch(() => toast(msg));
}
function openDialog(title, body) {
  document.querySelector('#dialog-body').innerHTML = `<h2 id="dialog-title">${title}</h2>${body}`;
  dialog.showModal();
}
document.querySelector('#close-dialog').onclick = () => dialog.close();
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

function genId(seed, role='BUY') {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  const hex = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `AURA-${role.slice(0,3).toUpperCase()}-${hex.slice(0,4)}-${hex.slice(4)}`;
}
function genKeys(seed) {
  let h1 = 0x811c9dc5, h2 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) { h1 = Math.imul(h1 ^ seed.charCodeAt(i), 0x01000193); h2 = Math.imul(h2 ^ (seed.charCodeAt(i)+i), 0x85ebca6b); }
  const hex = n => (n >>> 0).toString(16).padStart(8, '0');
  return { publicKey: `ed25519:pk_aura_${hex(h1)}${hex(h2)}`, privateKey: `ed25519:sk_aura_secret_${hex(h2)}${hex(h1^h2)}` };
}
function loadAgents() {
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem('aura-agent-directory-v1') || '[]'); } catch {}
  return [...custom, ...DEFAULT_AGENTS];
}
function saveAgent(ag) {
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem('aura-agent-directory-v1') || '[]'); } catch {}
  custom = [ag, ...custom.filter(x => x.agent_id !== ag.agent_id)];
  try { localStorage.setItem('aura-agent-directory-v1', JSON.stringify(custom)); } catch {}
}

function renderMintAgent() {
  const id = genId(`${mintDraft.owner_domain}-${mintDraft.name}-${mintDraft.nonce}`, mintDraft.role);
  const keys = genKeys(`${id}-${mintDraft.nonce}`);
  const allCaps = ['catalog_search','taste_token_match','cart_staging','price_negotiation','paper_indexing','code_review'];
  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div><div class="small-label">Cryptographic KYA Provisioning</div><h1>Create Agent ID</h1><p>Register an autonomous agent with its capabilities and owner domain. Generates an Ed25519 keypair in your browser.</p></div>
      <div style="display:flex;gap:10px"><button class="secondary" id="m-exp">Agent Explorer</button><button class="secondary" id="m-home">← Home</button></div>
    </div>
    <div class="review-layout">
      <form id="m-form">
        <label class="field"><span>1. Agent Name</span><input type="text" name="name" value="${esc(mintDraft.name)}"></label>
        <label class="field"><span>2. Owner Domain</span><input type="text" name="owner_domain" value="${esc(mintDraft.owner_domain)}"></label>
        <label class="field"><span>3. Role (buyer / researcher / coder)</span><input type="text" name="role" value="${esc(mintDraft.role)}"></label>
        <div class="field"><span>4. Declared Capabilities</span><div class="chip-row">${allCaps.map(c => `<button type="button" class="chip" data-cap="${c}" aria-pressed="${mintDraft.capabilities.includes(c)}">+ ${c}</button>`).join('')}</div></div>
        <label class="field" style="margin-top:14px"><span>5. Spend Boundary</span><input type="text" name="spend_limit" value="${esc(mintDraft.spend_limit)}"></label>
        <div class="hero-actions"><button type="submit" class="primary">Mint &amp; Publish to Explorer →</button><button type="button" class="secondary" id="m-rot">Rotate Keypair</button></div>
      </form>
      <div style="border:1px solid var(--line);border-radius:6px;padding:18px;background:var(--paper)">
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600"><span>Assigned Agent ID</span><span class="mono">${esc(id)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:12px"><span>Public Key</span><button type="button" class="text-button" id="cp-pub">Copy</button></div>
        <pre style="font:11px monospace;background:var(--soft);padding:10px;border-radius:4px;overflow:auto">${esc(keys.publicKey)}</pre>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:12px"><span>Private Key (Browser-only)</span><button type="button" class="text-button" id="cp-priv">Copy</button></div>
        <pre style="font:11px monospace;background:var(--soft);padding:10px;border-radius:4px;overflow:auto;color:var(--accent)">${esc(keys.privateKey)}</pre>
      </div>
    </div>
  </div>`;
  document.querySelectorAll('[data-cap]').forEach(b => b.onclick = () => {
    const c = b.dataset.cap, i = mintDraft.capabilities.indexOf(c);
    if (i >= 0) mintDraft.capabilities.splice(i, 1); else mintDraft.capabilities.push(c);
    renderMintAgent();
  });
  document.querySelector('#m-rot').onclick = () => { mintDraft.nonce = String(Math.floor(100+Math.random()*900)); renderMintAgent(); };
  document.querySelector('#cp-pub').onclick = () => copyText(keys.publicKey, 'Public key copied.');
  document.querySelector('#cp-priv').onclick = () => copyText(keys.privateKey, 'Private key copied.');
  document.querySelector('#m-exp').onclick = () => renderAgentExplorer();
  document.querySelector('#m-home').onclick = () => home();
  document.querySelector('#m-form').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    mintDraft.name = fd.get('name') || 'Agent';
    mintDraft.owner_domain = fd.get('owner_domain') || 'localhost';
    mintDraft.role = fd.get('role') || 'buyer';
    mintDraft.spend_limit = fd.get('spend_limit') || '$150 / session';
    const obj = { agent_id:id, name:mintDraft.name, owner_domain:mintDraft.owner_domain, role:mintDraft.role, capabilities:[...mintDraft.capabilities], verification_state:'Local Ed25519 Keypair', is_demo:false, spend_limit:mintDraft.spend_limit, public_key:keys.publicKey };
    saveAgent(obj); toast(`Agent ${id} minted.`); renderDualProfile(obj);
  };
}

function renderDualProfile(ag) {
  const spec = { schema:'aura-id/agent.json', version:'1.0', agent_id:ag.agent_id, name:ag.name, owner_domain:ag.owner_domain, role:ag.role, capabilities:ag.capabilities, authentication:{ verification_method:ag.verification_state, public_key:ag.public_key, record_origin:ag.is_demo?'reference-demo':'browser-minted' }, boundaries:{ max_spend_limit:ag.spend_limit } };
  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div><div class="small-label">Dual Agent Profile · Human Card &amp; Machine agent.json</div><h1>${esc(ag.name)} <span class="demo-tag">${ag.is_demo?'Demo':'Local'}</span></h1><p>Agent ID: <code>${esc(ag.agent_id)}</code> · Owner Domain: <strong>${esc(ag.owner_domain)}</strong></p></div>
      <button class="secondary" id="dp-back">← Agent Explorer</button>
    </div>
    <section class="demo-box">
      <div class="small-label">Machine Specification · /.well-known/agent.json</div>
      <pre style="font:11px/1.6 monospace;background:var(--soft);padding:14px;border-radius:5px;overflow:auto">${esc(JSON.stringify(spec, null, 2))}</pre>
      <button class="primary" id="dp-copy">Copy agent.json</button>
    </section>
  </div>`;
  document.querySelector('#dp-back').onclick = () => renderAgentExplorer();
  document.querySelector('#dp-copy').onclick = () => copyText(JSON.stringify(spec, null, 2), 'agent.json copied.');
}

function renderAgentExplorer() {
  const list = loadAgents();
  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div><div class="small-label">Reference &amp; Local Registry</div><h1>Agent Explorer</h1><p>Inspect demo and locally minted KYA Agent Passports.</p></div>
      <div style="display:flex;gap:10px"><button class="primary" id="ex-mint">+ Create Agent ID</button><button class="secondary" id="ex-home">← Home</button></div>
    </div>
    <input type="text" id="ex-q" placeholder="Search by Agent ID, name, domain, or capability..." style="margin-bottom:16px">
    <table class="explorer-table"><thead><tr><th>Agent ID</th><th>Name</th><th>Owner Domain</th><th>Capabilities</th><th>Verification State</th></tr></thead><tbody id="ex-tb"></tbody></table>
  </div>`;
  const draw = (q='') => {
    const rows = list.filter(a => `${a.agent_id} ${a.name} ${a.owner_domain} ${(a.capabilities||[]).join(' ')}`.toLowerCase().includes(q.toLowerCase()));
    document.querySelector('#ex-tb').innerHTML = rows.map((a,i) => `<tr data-i="${i}" style="cursor:pointer"><td style="font-family:monospace;font-weight:600">${esc(a.agent_id)}</td><td><strong>${esc(a.name)}</strong> <span class="demo-tag">${a.is_demo?'Demo':'Local'}</span></td><td style="font-family:monospace">${esc(a.owner_domain)}</td><td>${(a.capabilities||[]).join(', ')}</td><td>${esc(a.verification_state)}</td></tr>`).join('');
    document.querySelectorAll('#ex-tb tr').forEach(r => r.onclick = () => renderDualProfile(rows[+r.dataset.i]));
  };
  document.querySelector('#ex-q').oninput = e => draw(e.target.value);
  document.querySelector('#ex-mint').onclick = () => renderMintAgent();
  document.querySelector('#ex-home').onclick = () => home();
  draw();
}

function home() {
  const demoAgents = loadAgents().slice(0, 2);
  main.innerHTML = `<div class="landing">
    <section class="hero">
      <div class="hero-copy">
        <div class="intro-line">Open Specification · KYA Passport &amp; Taste Token</div>
        <h1>Verifiable identity for the agents that work for <em>you.</em></h1>
        <p>Give your AI agent a cryptographic KYA passport (<code>agent.json</code>) bound to your domain, and a scoped Taste Token that carries your preferences and boundaries without exposing personal data.</p>
        <div class="hero-actions"><button class="primary" id="create" type="button">Create an Agent ID</button><button class="secondary" id="try-sample" type="button">Explore interactive demo</button></div>
        <div class="quiet">Browser-local key generation · Open source · No account required</div>
      </div>
      <div class="card-stage">
        <div class="passport" aria-label="Sample KYA Passport">
          <div class="card-top"><span class="card-word">aura id.</span><span class="mono">KYA Passport · Demo<br>v1.0 Specification</span></div>
          <div><h2 class="card-title">AURA-BUY-8D1F-43A0</h2><div class="card-owner">Owner domain: ${esc(DOM_MAIN)}</div><div class="card-pills" style="margin-top:12px"><span class="card-pill">Signature: Ed25519 Key Bound</span><span class="card-pill">Scope: Ask before checkout</span></div></div>
          <div class="card-bottom"><div class="mono">Public key at /.well-known/agent.json<br>Sample card · 3 core verifiable fields</div><div class="swatches" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div>
        </div>
        <p class="card-note">Sample KYA Passport showing the 3 core fields: Agent ID, Owner Domain, and Signature Status.</p>
      </div>
    </section>
    <section class="capabilities-grid">
      <div class="cap-card"><span>01 · Agent Identity</span><strong>Cryptographic KYA Passport</strong><p>Generate a deterministic Agent ID and Ed25519 keypair in your browser and publish the public key at <code>/.well-known/agent.json</code>.</p></div>
      <div class="cap-card"><span>02 · Scoped Taste Token</span><strong>Preferences Without PII</strong><p>Share product priorities, constraints, and active shopping items with store agents while stripping personal identifiers.</p></div>
      <div class="cap-card"><span>03 · Verification Gateway</span><strong>Policy-Based Agent Access</strong><p>Participating websites verify an incoming agent’s domain signature and declared action boundaries instead of relying solely on visual CAPTCHAs.</p></div>
    </section>
    <section class="captcha-sandbox" id="interactive-demo-section">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
        <div><div class="small-label">Interactive Simulation · Local Sandbox</div><h2 style="font:26px Georgia,serif;margin:4px 0">How a gateway evaluates an incoming agent request</h2></div>
        <div class="mode-switch"><button type="button" id="sb-mode-aura" aria-pressed="true">Signed KYA Agent (Demo)</button><button type="button" id="sb-mode-bot" aria-pressed="false">Unsigned Bot (Blocked)</button></div>
      </div>
      <div id="sandbox-stage"></div>
    </section>
    <section class="dev-section">
      <div><div class="small-label">For Developers &amp; Platforms</div><h2 style="font:26px Georgia,serif;margin:6px 0">Self-hostable specification, zero lock-in</h2><p style="font-size:13px;color:var(--muted)">Domain ownership is proven by hosting your public key at <code>/.well-known/agent.json</code>, and personal agents read or update your local Taste Token via the included Node.js MCP server.</p><div style="display:flex;gap:14px;margin-top:12px"><button type="button" class="secondary" id="dev-open-docs">Read MCP &amp; API Docs</button><a class="text-button" href="./llms.txt">llms.txt</a><a class="text-button" href="./.well-known/agent.json">/.well-known/agent.json</a></div></div>
      <div class="sandbox-terminal"><div># 1. Start local MCP &amp; Agent API server</div><div style="color:#a8dadc">node mcp/server.mjs --http 8000 --profile ./aura-id-profile.json</div><div style="margin-top:8px"># 2. Run automated schema &amp; privacy tests</div><div style="color:#f1a17f">node --test profile.test.mjs</div></div>
    </section>
    <section class="captcha-sandbox">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
        <div><div class="small-label">Reference Registry Preview · Illustrative Demo Entries</div><h2 style="font:26px Georgia,serif;margin:4px 0">Sample Agent Passports</h2></div>
        <button type="button" class="secondary" id="home-open-explorer">Open Full Agent Explorer →</button>
      </div>
      <table class="explorer-table"><thead><tr><th>Agent ID</th><th>Agent Name</th><th>Owner Domain</th><th>Capabilities</th><th>Verification State</th></tr></thead><tbody>
        ${demoAgents.map(a => `<tr data-home-agent="${esc(a.agent_id)}" style="cursor:pointer"><td style="font-family:monospace;font-weight:600">${esc(a.agent_id)}</td><td><strong>${esc(a.name)}</strong> <span class="demo-tag">Demo</span></td><td style="font-family:monospace">${esc(a.owner_domain)}</td><td>${(a.capabilities||[]).join(', ')}</td><td>${esc(a.verification_state)}</td></tr>`).join('')}
      </tbody></table>
    </section>
  </div>`;
  document.querySelector('#create').onclick = () => renderMintAgent();
  document.querySelector('#try-sample').onclick = () => document.querySelector('#interactive-demo-section')?.scrollIntoView({behavior:'smooth'});
  document.querySelector('#dev-open-docs').onclick = () => document.querySelector('#mcp-api').click();
  document.querySelector('#home-open-explorer').onclick = () => renderAgentExplorer();
  document.querySelectorAll('tr[data-home-agent]').forEach(r => r.onclick = () => {
    const f = loadAgents().find(x => x.agent_id === r.dataset.homeAgent);
    if (f) renderDualProfile(f);
  });
  let sbAura = true;
  const syncSb = () => {
    document.querySelector('#sb-mode-aura').setAttribute('aria-pressed', String(sbAura));
    document.querySelector('#sb-mode-bot').setAttribute('aria-pressed', String(!sbAura));
    document.querySelector('#sandbox-stage').innerHTML = sbAura
      ? `<div class="flow-steps"><div class="flow-step"><span>Step 01 · Introduction</span><strong>Agent presents ID &amp; domain</strong><p>Agent sends <code>AURA-BUY-8D1F-43A0</code> and declares owner domain <code>${esc(DOM_MAIN)}</code>.</p></div><div class="flow-step"><span>Step 02 · Signature Check</span><strong>Ed25519 key verified</strong><p>Gateway checks the request signature against the public key in <code>/.well-known/agent.json</code>.</p></div><div class="flow-step"><span>Step 03 · Policy Decision</span><strong>Scoped access granted</strong><p>Catalog filtered via attached Taste Token. Checkout locked until human approval.</p></div></div><details style="margin-top:14px"><summary style="font:12px monospace;cursor:pointer;color:var(--muted)">Inspect raw HTTP handshake headers &amp; signature payload (Developer view)</summary><pre style="font:11px/1.6 monospace;background:#181c19;color:#e8e6df;padding:14px;border-radius:5px;margin-top:8px">GET /store/api/catalog-handshake HTTP/2\nX-Aura-Agent-ID: AURA-BUY-8D1F-43A0\nX-Aura-Owner-Domain: ${esc(DOM_MAIN)}\nX-Aura-Public-Key: ed25519:pk_aura_8d1f43a099b2c4e1d7a3f5012b8c\nX-Aura-Taste-Token: scoped-handshake-no-pii</pre></details>`
      : `<div class="flow-steps"><div class="flow-step"><span>Step 01 · Unidentified Request</span><strong>No KYA Passport attached</strong><p>Bot requests catalog with a generic user-agent and no domain signature.</p></div><div class="flow-step"><span>Step 02 · Gateway Check</span><strong>Origin &amp; owner unknown</strong><p>Gateway cannot verify who operates the bot or whether a human authorized it.</p></div><div class="flow-step"><span>Step 03 · Fallback Wall</span><strong>Visual CAPTCHA triggered</strong><p>Gateway falls back to a human image puzzle (<code>HTTP 403</code>), halting execution.</p></div></div>`;
  };
  document.querySelector('#sb-mode-aura').onclick = () => { sbAura = true; syncSb(); };
  document.querySelector('#sb-mode-bot').onclick = () => { sbAura = false; syncSb(); };
  syncSb();
}

document.querySelector('#home').onclick = e => { e.preventDefault(); home(); };
document.querySelector('#mint-agent-nav').onclick = e => { e.preventDefault(); renderMintAgent(); };
document.querySelector('#agent-registry-nav').onclick = e => { e.preventDefault(); renderAgentExplorer(); };
document.querySelector('#about').onclick = e => { e.preventDefault(); openDialog('How Aura ID & Domain Verification Work', `<p>Aura ID is an open specification for verifiable AI agent identity (<code>agent.json</code>) and scoped user preferences (<code>aura-id/taste-token</code>).</p><h3>1. Domain Ownership Verification</h3><p>Developers mint an Ed25519 keypair in the browser and publish the public key at <code>/.well-known/agent.json</code> on their domain. Gateways verify request signatures against that domain manifest.</p><h3>2. Scoped Taste Token</h3><p>Carries product priorities, constraints, and active shopping items while stripping personal identifiers.</p>`); };
document.querySelector('#mcp-api').onclick = e => { e.preventDefault(); openDialog('Documentation · MCP & Taste Token API', `<p>Connect local agents via <code>mcp/server.mjs</code> or publish your public key at <code>/.well-known/agent.json</code>.</p><pre>{\n  "mcpServers": {\n    "aura-id": {\n      "command": "node",\n      "args": ["./mcp/server.mjs", "--profile", "./aura-id-profile.json"]\n    }\n  }\n}</pre>`); };
document.querySelector('#privacy').onclick = e => { e.preventDefault(); openDialog('Privacy & Security Scope', `<p>All keys and preferences are generated locally in your browser. Pre-loaded Explorer items are labeled as <strong>Demo</strong> samples. Boundary preferences express user intent; receiving platforms enforce authorization.</p>`); };
document.querySelector('#load').onclick = e => { e.preventDefault(); document.querySelector('#file-input').click(); };
document.querySelector('#site-theme').onclick = e => { e.preventDefault(); theme = theme === 'light' ? 'dark' : 'light'; document.body.dataset.theme = theme; };
document.querySelector('#coffee-link').onclick = e => {
  e.preventDefault();
  openDialog('Support Aura ID ☕', `<p>If you find Aura ID useful, you can support the project with the price of a coffee (or any amount you like) directly via crypto:</p><div class="a2a-grid">${SUPPORT_WALLETS.map((w,i)=>`<div class="a2a-item"><div class="a2a-item-head"><span>${esc(w.network)}</span><button type="button" class="text-button" data-w="${i}">Copy address</button></div><p style="font:11px monospace;word-break:break-all">${esc(w.address)}</p></div>`).join('')}</div>`);
  document.querySelectorAll('[data-w]').forEach(b => b.onclick = () => copyText(SUPPORT_WALLETS[+b.dataset.w].address, 'Wallet address copied.'));
};

home();le,
  createExport,
  createTasteToken,
  createAgentPassport,
  verifyAgentPassport,
  generateDeterministicAgentId,
  asMarkdown,
  archetype,
  parseNeeds,
  matchCatalog,
  SAMPLE_STORE_CATALOG
} from './profile.mjs';

const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const labels = {
  brief: 'Short & direct', balanced: 'Balanced', detailed: 'Step-by-step',
  direct: 'Straightforward', conversational: 'Warm & friendly', formal: 'Professional',
  sources: 'Always cite links', 'when-needed': 'Only when needed', unspecified: 'Not set',
  challenge: 'Be honest & critical', gentle: 'Be encouraging',
  light: 'Light card & UI', dark: 'Dark card & UI', system: 'Match my device',
  focused: 'Simple summary first', compact: 'Side-by-side table',
  reduced: 'Calm (no animation)', subtle: 'Smooth motion',
  quality: 'Buy once, keep for years', value: 'Best value for money', minimal: 'Simple & unbranded',
  ask: 'Always ask me first', 'draft-only': 'Only prepare a shortlist',
  buyer: 'Procurement & Shopping Agent', researcher: 'Autonomous Research Agent',
  personal_assistant: 'Executive AI Secretary', coder: 'Engineering & Task Agent',
  negotiator: 'Negotiation & Pricing Agent', general: 'General Purpose Agent',
  verified: 'Verified (Proof-of-Owner)', supervised: 'Supervised (Human-in-the-Loop)',
  sandboxed: 'Sandboxed (Read-only)', restricted: 'Restricted'
};

const titles = [
  'Start', 'About you', 'Reply style', 'Honesty', 'Visual feel',
  'Taste & shopping', 'KYA Agent Identity', 'Safety rules', 'Your card & export'
];
const FINAL_STEP = 8;
let p = EMPTY(), step = 0, view = 'home', returnReview = false;
let scope = { context: true, communication: true, visual: true, taste: true, agent: true };
let theme = 'light', demoMode = 'agent_passport', previewFormat = 'passport', toastTimer;
const label = v => labels[v] || 'Not set';

const SUPPORT_WALLETS = [
  { network: 'Tron / USDT (TRC20)', address: 'TUozifQrM8qc2NgAr6AVrVrrBJNpGJS9Bc' },
  { network: 'Ethereum / Arbitrum / Base / Polygon (USDT / ETH)', address: '0x8E0Ffb9fED9840BE0C6e343a807535119f6b3a8f' }
];

const QUICK_CHIPS = {
  role: ['Product Designer', 'Software Engineer', 'Founder', 'Student', 'Writer & Researcher', 'Freelancer'],
  goal: ['Brainstorm & test ideas', 'Write clean code faster', 'Compare products before buying', 'Learn new topics simply', 'Draft clear emails & docs'],
  language: ['English', 'Persian (فارسی)', 'Same language I write in', 'Bilingual (EN / FA)'],
  taste: ['Minimal & quiet', 'No big logos', 'Natural materials', 'Matte black & warm wood', 'Built to repair', 'Clean typography'],
  constraints: ['Shoe size EU 42', 'Sensitive knees', 'Fragrance-free', 'Under $150 budget', 'Compact desk space'],
  needs: ['Running shoes for asphalt', 'Warm dimmable desk lamp', 'Whole-bean medium roast coffee', 'Noise-cancelling headphones', 'Ergonomic travel backpack'],
  agent_model: ['Claude 3.5 Sonnet', 'GPT-4o / ChatGPT Pro', 'Gemini 1.5 Pro', 'DeepSeek R1 / V3', 'Open-source Local LLM (Llama 3)'],
  agent_spend_limit: ['$50 / session', '$150 / session', '$500 / month', '$0 (Free browse only)'],
  avoid: ['Long robotic intros', 'Hype marketing words', 'Loud neon colors', 'Unverified claims', 'Pushy upsells']
};


const DEFAULT_AGENTS_DIRECTORY = [
  {
    agent_id: 'AURA-BUY-8D1F-43A0',
    name: 'Hermes Procurement v2',
    owner_domain: 'souleria.github.io',
    role: 'buyer',
    model: 'Claude 3.5 Sonnet',
    capabilities: ['catalog_search', 'taste_token_match', 'cart_staging', 'price_check'],
    trust_tier: 'verified',
    trust_score: 98,
    spend_limit: '$150 / session',
    public_key: 'ed25519:pk_aura_8d1f43a099b2c4e1d7a3f5012b8c',
    issued_at: '2026-11-04T08:00:00Z'
  },
  {
    agent_id: 'AURA-RES-3C9E-11B4',
    name: 'CiteGraph Deep Researcher',
    owner_domain: 'scholar-labs.org',
    role: 'researcher',
    model: 'GPT-4o / o3-mini',
    capabilities: ['paper_indexing', 'source_verification', 'citation_audit'],
    trust_tier: 'verified',
    trust_score: 96,
    spend_limit: '$0 (Read-only)',
    public_key: 'ed25519:pk_aura_3c9e11b47f2a80d1e5c6b3901a4f',
    issued_at: '2026-11-03T19:30:00Z'
  },
  {
    agent_id: 'AURA-COD-7A2D-90F1',
    name: 'Forge Repo Maintainer',
    owner_domain: 'devguild.io',
    role: 'coder',
    model: 'Claude 3.5 Sonnet',
    capabilities: ['code_review', 'test_runner', 'patch_synthesis', 'mcp_bridge'],
    trust_tier: 'verified',
    trust_score: 95,
    spend_limit: '$50 / month',
    public_key: 'ed25519:pk_aura_7a2d90f1c8e4b2093d1a6f74e8b2',
    issued_at: '2026-11-02T14:15:00Z'
  },
  {
    agent_id: 'AURA-BUY-5E4B-62C9',
    name: 'Nomad Travel & Flight Scout',
    owner_domain: 'skyroute.app',
    role: 'buyer',
    model: 'Gemini 1.5 Pro',
    capabilities: ['flight_search', 'seat_preference_match', 'hold_reservation'],
    trust_tier: 'supervised',
    trust_score: 88,
    spend_limit: '$300 / booking',
    public_key: 'ed25519:pk_aura_5e4b62c91d0f3a884c7e2b19f0a3',
    issued_at: '2026-11-01T11:20:00Z'
  },
  {
    agent_id: 'AURA-PER-1B8C-34D2',
    name: 'Aria Executive Scheduler',
    owner_domain: 'studio-aria.design',
    role: 'personal_assistant',
    model: 'GPT-4o',
    capabilities: ['calendar_negotiation', 'briefing_drafts', 'vendor_triage'],
    trust_tier: 'verified',
    trust_score: 97,
    spend_limit: '$100 / session',
    public_key: 'ed25519:pk_aura_1b8c34d2e9a7f4012c5b8d36a9e1',
    issued_at: '2026-10-30T16:45:00Z'
  }
];

function loadDirectoryAgents() {
  let custom = [];
  try {
    const raw = localStorage.getItem('aura-agent-directory-v1');
    if (raw) custom = JSON.parse(raw);
  } catch {}
  const map = new Map();
  for (const item of [...custom, ...DEFAULT_AGENTS_DIRECTORY]) {
    if (item && item.agent_id && !map.has(item.agent_id)) map.set(item.agent_id, item);
  }
  return Array.from(map.values());
}

function saveMintedAgentToDirectory(agentObj) {
  let custom = [];
  try {
    const raw = localStorage.getItem('aura-agent-directory-v1');
    if (raw) custom = JSON.parse(raw);
  } catch {}
  custom = [agentObj, ...custom.filter(x => x.agent_id !== agentObj.agent_id)].slice(0, 50);
  try {
    localStorage.setItem('aura-agent-directory-v1', JSON.stringify(custom));
  } catch {}
}

function generateCryptoKeys(seedStr) {
  let h1 = 0x811c9dc5, h2 = 0x9e3779b9, h3 = 0x85ebca6b, h4 = 0xc2b2ae35;
  const s = String(seedStr || 'aura-default-seed');
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b);
    h3 = Math.imul(h3 ^ (c * 7), 0xc2b2ae35);
    h4 = Math.imul(h4 ^ (c ^ 0x5a), 0x27d4eb2f);
  }
  const hex = n => (n >>> 0).toString(16).padStart(8, '0');
  const pub = `ed25519:pk_aura_${hex(h1)}${hex(h2)}${hex(h3)}`;
  const priv = `ed25519:sk_aura_secret_${hex(h4)}${hex(h1 ^ h3)}${hex(h2 ^ h4)}${hex(h3)}`;
  return { publicKey: pub, privateKey: priv };
}

function buildAgentJsonSpec(ag) {
  return {
    schema: 'aura-id/agent.json',
    version: '1.0',
    protocol: 'Aura-Post-CAPTCHA-Handshake/v1',
    agent_id: ag.agent_id,
    name: ag.name,
    owner_domain: ag.owner_domain,
    role: ag.role,
    model: ag.model,
    capabilities: ag.capabilities || [],
    authentication: {
      trust_tier: ag.trust_tier,
      trust_score: `${ag.trust_score}/100`,
      public_key: ag.public_key,
      signature_algorithm: 'Ed25519',
      captcha_policy: ag.trust_tier === 'verified' || ag.trust_tier === 'supervised' ? 'bypass-granted' : 'challenge-required'
    },
    boundaries: {
      max_spend_limit: ag.spend_limit,
      human_approval_required: true
    },
    issued_at: ag.issued_at || new Date().toISOString()
  };
}

function copyText(text, successMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast(successMsg)).catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    toast(successMsg);
  } catch {
    const details = document.querySelector('.export-preview');
    if (details) details.open = true;
    const errEl = document.querySelector('#export-error');
    if (errEl) errEl.textContent = 'Select and copy the text above.';
  }
}

function encodeShareUrl(profile) {
  const passportData = createAgentPassport(profile);
  const json = JSON.stringify(passportData);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  const base = window.location.href.split('#')[0];
  return `${base}#token=${b64}`;
}

function checkUrlToken() {
  const hash = window.location.hash || '';
  if (hash.startsWith('#token=')) {
    try {
      const raw = decodeURIComponent(escape(atob(hash.slice(7))));
      p = importProfile(raw);
      history.replaceState(null, '', window.location.pathname + window.location.search);
      go(FINAL_STEP);
      toast('Shared Agent Passport & Taste Token loaded from link.');
      return true;
    } catch {}
  }
  return false;
}

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 4500);
}

function openDialog(title, body) {
  document.querySelector('#dialog-body').innerHTML = `<h2 id="dialog-title">${title}</h2>${body}`;
  dialog.showModal();
}

document.querySelector('#close-dialog').onclick = () => dialog.close();
dialog.addEventListener('click', e => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  }
});
document.querySelector('#home').onclick = e => { e.preventDefault(); home(); };

function openCryptoSupportModal() {
  openDialog('Support Aura ID ☕', `
    <p>Aura ID is free, open source, and independent—with zero ads or user tracking. If you find it useful, you can support the project with the price of a coffee (or any amount you like) directly via crypto:</p>
    <div class="a2a-grid">
      ${SUPPORT_WALLETS.map((w, i) => `
        <div class="a2a-item">
          <div class="a2a-item-head"><span>${esc(w.network)}</span><button type="button" class="text-button" data-copy-wallet="${i}" style="min-height:24px;padding:0">Copy address</button></div>
          <p style="font:11px/1.5 'Courier New',monospace;word-break:break-all;margin-top:4px">${esc(w.address)}</p>
        </div>
      `).join('')}
    </div>
    <p class="note">Direct Metamask / TronLink wallet transfer · Zero intermediaries or KYC.</p>
  `);
  document.querySelectorAll('[data-copy-wallet]').forEach(btn => {
    btn.onclick = () => {
      const w = SUPPORT_WALLETS[+btn.dataset.copyWallet];
      if (w) copyText(w.address, `${w.network} address copied.`);
    };
  });
}

document.querySelector('#coffee-link').onclick = e => { e.preventDefault(); openCryptoSupportModal(); };
const topCoffeeBtn = document.querySelector('#top-coffee-btn');
if (topCoffeeBtn) topCoffeeBtn.onclick = e => { e.preventDefault(); openCryptoSupportModal(); };

let mintDraft = {
  name: 'Hermes Procurement v2',
  owner_domain: 'souleria.github.io',
  role: 'buyer',
  model: 'Claude 3.5 Sonnet',
  capabilities: ['catalog_search', 'taste_token_match', 'cart_staging'],
  trust_tier: 'verified',
  spend_limit: '$150 / session',
  nonce: '01'
};

function renderMintAgent() {
  view = 'mint_agent';
  const roleCode = (mintDraft.role || 'buy').slice(0, 3).toUpperCase();
  const agentId = generateDeterministicAgentId(`${mintDraft.owner_domain}-${mintDraft.name}-${mintDraft.nonce}`, roleCode);
  const keys = generateCryptoKeys(`${agentId}-${mintDraft.owner_domain}-${mintDraft.nonce}`);
  const previewProfile = cleanProfile({
    ...p,
    name: mintDraft.owner_domain,
    agent_id: agentId,
    agent_name: mintDraft.name,
    agent_role: mintDraft.role,
    agent_model: mintDraft.model,
    agent_trust: mintDraft.trust_tier,
    agent_spend_limit: mintDraft.spend_limit
  });
  const allCaps = ['catalog_search', 'taste_token_match', 'cart_staging', 'price_negotiation', 'paper_indexing', 'code_review', 'mcp_tool_call', 'calendar_scheduling'];

  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div>
        <div class="small-label">Console 01 · Cryptographic Agent Provisioning</div>
        <h1>Mint Verified Agent ID</h1>
        <p>Register an autonomous agent with its capabilities and owner domain. Generates an Ed25519 keypair and official Agent ID in your browser.</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="secondary" id="mint-to-explorer">Agent Explorer Directory</button>
        <button class="secondary" id="mint-to-home">← Home</button>
      </div>
    </div>
    <div class="review-layout">
      <div>
        <form id="mint-form">
          <div class="field-block">
            <label class="field"><span>1. Agent Name</span><input type="text" name="name" value="${esc(mintDraft.name)}" maxlength="80" placeholder="e.g., Hermes Buyer, Sentinel Research"></label>
          </div>
          <div class="field-block">
            <label class="field"><span>2. Owner Domain (DNS authority)</span><input type="text" name="owner_domain" value="${esc(mintDraft.owner_domain)}" maxlength="80" placeholder="e.g., souleria.github.io, acme.ai"></label>
          </div>
          <fieldset style="border:0;padding:0;margin:0 0 18px">
            <legend class="section-label">3. Primary Agent Category</legend>
            <div class="radio-inline">
              <label class="choice"><input type="radio" name="role" value="buyer" ${mintDraft.role === 'buyer' ? 'checked' : ''}><span><strong>Shopping / Buyer</strong></span></label>
              <label class="choice"><input type="radio" name="role" value="researcher" ${mintDraft.role === 'researcher' ? 'checked' : ''}><span><strong>Research</strong></span></label>
              <label class="choice"><input type="radio" name="role" value="coder" ${mintDraft.role === 'coder' ? 'checked' : ''}><span><strong>Coding</strong></span></label>
              <label class="choice"><input type="radio" name="role" value="personal_assistant" ${mintDraft.role === 'personal_assistant' ? 'checked' : ''}><span><strong>Assistant</strong></span></label>
            </div>
          </fieldset>
          <div class="field-block">
            <label class="field"><span>4. Declared Capabilities (Click to toggle)</span></label>
            <div class="chip-row">
              ${allCaps.map(c => `<button type="button" class="chip" data-cap="${esc(c)}" aria-pressed="${mintDraft.capabilities.includes(c)}">+ ${esc(c)}</button>`).join('')}
            </div>
          </div>
          <div class="split-choices" style="margin-bottom:18px">
            <label class="field"><span>5. Model Runtime</span><input type="text" name="model" value="${esc(mintDraft.model)}" maxlength="60"></label>
            <label class="field"><span>6. Max Spend / Action Limit</span><input type="text" name="spend_limit" value="${esc(mintDraft.spend_limit)}" maxlength="60"></label>
          </div>
          <div class="hero-actions" style="margin-top:22px">
            <button type="submit" class="primary">Mint &amp; Publish to Agent Explorer →</button>
            <button type="button" class="secondary" id="rotate-keys-btn">Rotate Keypair</button>
          </div>
        </form>
      </div>
      <div>
        <div id="mint-card-stage">${passport(previewProfile)}</div>
        <div class="key-box" style="margin-top:20px">
          <div class="key-box-head"><span>Assigned Verified Agent ID</span><span class="mono" id="mint-id-out">${esc(agentId)}</span></div>
          <div class="key-box-head" style="margin-top:12px"><span>Public Verification Key (Shareable in <code>agent.json</code>)</span><button type="button" class="text-button" id="copy-pub-key" style="min-height:24px;padding:0">Copy Public Key</button></div>
          <div class="key-secret" style="color:var(--ink)" id="mint-pub-out">${esc(keys.publicKey)}</div>
          <div class="key-box-head" style="margin-top:12px"><span>Private Signing Key (Shown once in browser · Never uploaded)</span><button type="button" class="text-button" id="copy-priv-key" style="min-height:24px;padding:0">Copy Private Key</button></div>
          <div class="key-secret" id="mint-priv-out">${esc(keys.privateKey)}</div>
          <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
            <button type="button" class="secondary" id="download-keypair-btn" style="flex:1;padding:10px;font-size:12px">Download Credentials (.json)</button>
            <button type="button" class="secondary" id="preview-dual-btn" style="flex:1;padding:10px;font-size:12px">Open Dual Profile &amp; agent.json</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  const form = document.querySelector('#mint-form');
  const syncMint = () => {
    const fd = new FormData(form);
    mintDraft.name = (fd.get('name') || '').trim() || 'Autonomous Agent';
    mintDraft.owner_domain = (fd.get('owner_domain') || '').trim() || 'localhost';
    mintDraft.role = fd.get('role') || 'buyer';
    mintDraft.model = (fd.get('model') || '').trim() || 'Claude 3.5 Sonnet';
    mintDraft.spend_limit = (fd.get('spend_limit') || '').trim() || '$150 / session';
    const rCode = (mintDraft.role || 'buy').slice(0, 3).toUpperCase();
    const nextId = generateDeterministicAgentId(`${mintDraft.owner_domain}-${mintDraft.name}-${mintDraft.nonce}`, rCode);
    const nextKeys = generateCryptoKeys(`${nextId}-${mintDraft.owner_domain}-${mintDraft.nonce}`);
    const nextProf = cleanProfile({
      ...p,
      name: mintDraft.owner_domain,
      agent_id: nextId,
      agent_name: mintDraft.name,
      agent_role: mintDraft.role,
      agent_model: mintDraft.model,
      agent_trust: mintDraft.trust_tier,
      agent_spend_limit: mintDraft.spend_limit
    });
    document.querySelector('#mint-card-stage').innerHTML = passport(nextProf);
    document.querySelector('#mint-id-out').textContent = nextId;
    document.querySelector('#mint-pub-out').textContent = nextKeys.publicKey;
    document.querySelector('#mint-priv-out').textContent = nextKeys.privateKey;
    tilt();
  };

  form.addEventListener('input', syncMint);
  form.addEventListener('change', syncMint);

  document.querySelectorAll('[data-cap]').forEach(btn => {
    btn.onclick = () => {
      const cap = btn.dataset.cap;
      const idx = mintDraft.capabilities.indexOf(cap);
      if (idx >= 0) mintDraft.capabilities.splice(idx, 1);
      else mintDraft.capabilities.push(cap);
      renderMintAgent();
    };
  });

  document.querySelector('#rotate-keys-btn').onclick = () => {
    mintDraft.nonce = String(Math.floor(100 + Math.random() * 900));
    renderMintAgent();
    toast('New cryptographic keypair generated.');
  };

  const getCurrentMintedObject = () => {
    const rCode = (mintDraft.role || 'buy').slice(0, 3).toUpperCase();
    const curId = generateDeterministicAgentId(`${mintDraft.owner_domain}-${mintDraft.name}-${mintDraft.nonce}`, rCode);
    const curKeys = generateCryptoKeys(`${curId}-${mintDraft.owner_domain}-${mintDraft.nonce}`);
    return {
      agent_id: curId,
      name: mintDraft.name,
      owner_domain: mintDraft.owner_domain,
      role: mintDraft.role,
      model: mintDraft.model,
      capabilities: [...mintDraft.capabilities],
      trust_tier: mintDraft.trust_tier,
      trust_score: 98,
      spend_limit: mintDraft.spend_limit,
      public_key: curKeys.publicKey,
      private_key: curKeys.privateKey,
      issued_at: new Date().toISOString()
    };
  };

  document.querySelector('#copy-pub-key').onclick = () => copyText(getCurrentMintedObject().public_key, 'Public Key copied.');
  document.querySelector('#copy-priv-key').onclick = () => copyText(getCurrentMintedObject().private_key, 'Private Signing Key copied. Keep it secret!');
  document.querySelector('#download-keypair-btn').onclick = () => {
    const obj = getCurrentMintedObject();
    download(JSON.stringify(obj, null, 2), `${obj.agent_id.toLowerCase()}-credentials.json`, 'application/json');
  };
  document.querySelector('#preview-dual-btn').onclick = () => {
    const obj = getCurrentMintedObject();
    saveMintedAgentToDirectory(obj);
    renderDualAgentProfile(obj);
  };
  form.onsubmit = e => {
    e.preventDefault();
    const obj = getCurrentMintedObject();
    saveMintedAgentToDirectory(obj);
    toast(`Agent ${obj.agent_id} minted and added to the public Explorer!`);
    renderDualAgentProfile(obj);
  };
  document.querySelector('#mint-to-explorer').onclick = () => renderAgentExplorer();
  document.querySelector('#mint-to-home').onclick = () => home();
  tilt();
}

function renderDualAgentProfile(agentObj, initialTab = 'human') {
  view = 'dual_agent_profile';
  const ag = agentObj || DEFAULT_AGENTS_DIRECTORY[0];
  let activeTab = initialTab;
  const cardProfile = cleanProfile({
    ...p,
    name: ag.owner_domain,
    agent_id: ag.agent_id,
    agent_name: ag.name,
    agent_role: ag.role,
    agent_model: ag.model,
    agent_trust: ag.trust_tier,
    agent_spend_limit: ag.spend_limit
  });
  const machineJson = buildAgentJsonSpec(ag);

  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div>
        <div class="small-label">Dual Agent Profile · Human Card &amp; Machine <code>agent.json</code></div>
        <h1>${esc(ag.name)}</h1>
        <p>Verified Agent ID: <code>${esc(ag.agent_id)}</code> · Owner Domain: <strong>${esc(ag.owner_domain)}</strong></p>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div class="mode-switch" role="group" aria-label="Profile View Mode">
          <button type="button" id="dual-tab-human" aria-pressed="${activeTab === 'human'}">Human View (ID Card &amp; Trust)</button>
          <button type="button" id="dual-tab-json" aria-pressed="${activeTab === 'json'}">Server View (Raw agent.json)</button>
        </div>
        <button class="secondary" id="dual-back-explorer">← Agent Explorer</button>
      </div>
    </div>
    <div id="dual-body"></div>
  </div>`;

  function updateDualBody() {
    document.querySelector('#dual-tab-human').setAttribute('aria-pressed', String(activeTab === 'human'));
    document.querySelector('#dual-tab-json').setAttribute('aria-pressed', String(activeTab === 'json'));
    const body = document.querySelector('#dual-body');
    if (activeTab === 'human') {
      body.innerHTML = `
        <div class="scorecard-grid">
          <div class="score-item"><span>Trust Score</span><strong>${esc(ag.trust_score)} / 100</strong></div>
          <div class="score-item"><span>Post-CAPTCHA Status</span><strong>BYPASS GRANTED ✓</strong></div>
          <div class="score-item"><span>Owner Domain</span><strong>${esc(ag.owner_domain)}</strong></div>
          <div class="score-item"><span>Spend Authority</span><strong>${esc(ag.spend_limit)}</strong></div>
        </div>
        <div class="review-layout">
          <div>
            ${passport(cardProfile)}
            <p class="card-note">Verified Aura Machine Passport · Bound to ${esc(ag.owner_domain)}</p>
          </div>
          <div>
            <section class="export-box">
              <h2>Verified Agent Credentials</h2>
              <p>This agent holds a valid cryptographic passport and bypasses legacy CAPTCHAs on Aura-compatible stores and APIs.</p>
              <dl style="font-size:13px;display:grid;grid-template-columns:140px 1fr;gap:10px 16px;margin:18px 0">
                <dt style="color:var(--muted)">Verified Agent ID</dt><dd style="margin:0;font-family:'Courier New',monospace;font-weight:bold">${esc(ag.agent_id)}</dd>
                <dt style="color:var(--muted)">Primary Role</dt><dd style="margin:0">${esc(label(ag.role))}</dd>
                <dt style="color:var(--muted)">AI Model Runtime</dt><dd style="margin:0">${esc(ag.model)}</dd>
                <dt style="color:var(--muted)">Capabilities</dt><dd style="margin:0">${(ag.capabilities || []).map(c => `<code style="margin-right:5px">${esc(c)}</code>`).join('')}</dd>
                <dt style="color:var(--muted)">Public Key</dt><dd style="margin:0;font:11px 'Courier New',monospace;word-break:break-all">${esc(ag.public_key)}</dd>
              </dl>
              <div class="export-actions">
                <button type="button" class="primary" id="dual-switch-json">Inspect Raw agent.json →</button>
                <button type="button" class="secondary" id="dual-copy-id">Copy Agent ID</button>
                <button type="button" class="secondary" id="dual-download-json">Download agent.json</button>
              </div>
            </section>
          </div>
        </div>`;
      document.querySelector('#dual-switch-json').onclick = () => { activeTab = 'json'; updateDualBody(); };
      document.querySelector('#dual-copy-id').onclick = () => copyText(ag.agent_id, `Agent ID ${ag.agent_id} copied.`);
      document.querySelector('#dual-download-json').onclick = () => download(JSON.stringify(machineJson, null, 2), `${ag.agent_id.toLowerCase()}.agent.json`, 'application/json');
      tilt();
    } else {
      body.innerHTML = `
        <div class="review-layout">
          <div>
            <section class="demo-box">
              <div class="small-label">Machine Endpoint · /.well-known/agent.json</div>
              <h2>Raw <code>agent.json</code> Payload</h2>
              <p class="prompt">Servers and API gateways fetch this JSON payload to verify the agent’s public key, capabilities, and CAPTCHA bypass eligibility.</p>
              <pre style="font:11px/1.6 'Courier New',monospace;background:var(--soft);padding:16px;border-radius:5px;overflow:auto;max-height:420px">${esc(JSON.stringify(machineJson, null, 2))}</pre>
              <div class="export-actions">
                <button type="button" class="primary" id="raw-copy-json">Copy agent.json</button>
                <button type="button" class="secondary" id="raw-download-json">Download agent.json</button>
              </div>
            </section>
          </div>
          <div>
            <section class="export-box">
              <h2>HTTP Handshake Headers</h2>
              <p>When <strong>${esc(ag.name)}</strong> makes an HTTP request to a store or platform, it attaches these verifiable headers:</p>
              <pre style="font:11px/1.6 'Courier New',monospace;background:var(--soft);padding:14px;border-radius:5px;overflow:auto">GET /api/v1/catalog HTTP/2
Host: store.example.com
X-Aura-Agent-ID: ${esc(ag.agent_id)}
X-Aura-Owner-Domain: ${esc(ag.owner_domain)}
X-Aura-Public-Key: ${esc(ag.public_key)}
X-Aura-Trust-Score: ${esc(ag.trust_score)}/100</pre>
              <div class="hero-actions" style="margin-bottom:0">
                <button type="button" class="secondary" id="raw-back-human">← Switch to Human Card View</button>
              </div>
            </section>
          </div>
        </div>`;
      document.querySelector('#raw-copy-json').onclick = () => copyText(JSON.stringify(machineJson, null, 2), 'agent.json copied to clipboard.');
      document.querySelector('#raw-download-json').onclick = () => download(JSON.stringify(machineJson, null, 2), `${ag.agent_id.toLowerCase()}.agent.json`, 'application/json');
      document.querySelector('#raw-back-human').onclick = () => { activeTab = 'human'; updateDualBody(); };
    }
  }

  document.querySelector('#dual-tab-human').onclick = () => { activeTab = 'human'; updateDualBody(); };
  document.querySelector('#dual-tab-json').onclick = () => { activeTab = 'json'; updateDualBody(); };
  document.querySelector('#dual-back-explorer').onclick = () => renderAgentExplorer();
  updateDualBody();
}

function renderAgentExplorer() {
  view = 'agent_explorer';
  let query = '';
  let roleFilter = 'all';
  const allAgents = loadDirectoryAgents();

  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div>
        <div class="small-label">Public Network Directory · Post-CAPTCHA Registry</div>
        <h1>Agent Explorer</h1>
        <p>Search verified AI agents registered in the Aura network. Click any agent to inspect its human trust card or raw <code>agent.json</code> specification.</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="primary" id="explorer-mint-btn">+ Mint New Agent ID</button>
        <button class="secondary" id="explorer-home-btn">← Home</button>
      </div>
    </div>
    <div class="explorer-toolbar">
      <input type="text" id="explorer-search-input" class="explorer-search" placeholder="Search by Agent ID (AURA-...), name, owner domain, or capability...">
      <div class="chip-row" style="margin-top:0">
        <button type="button" class="chip" data-role-filter="all" aria-pressed="true">All Roles</button>
        <button type="button" class="chip" data-role-filter="buyer" aria-pressed="false">Shopping / Buyer</button>
        <button type="button" class="chip" data-role-filter="researcher" aria-pressed="false">Research</button>
        <button type="button" class="chip" data-role-filter="coder" aria-pressed="false">Coding</button>
        <button type="button" class="chip" data-role-filter="personal_assistant" aria-pressed="false">Assistant</button>
      </div>
    </div>
    <div class="explorer-table-wrap">
      <table class="explorer-table">
        <thead>
          <tr>
            <th>Verified Agent ID</th>
            <th>Agent Name &amp; Model</th>
            <th>Owner Domain</th>
            <th>Category &amp; Capabilities</th>
            <th>Status &amp; Trust</th>
            <th>Profile</th>
          </tr>
        </thead>
        <tbody id="explorer-tbody"></tbody>
      </table>
    </div>
  </div>`;

  function updateTable() {
    const tbody = document.querySelector('#explorer-tbody');
    const q = query.toLowerCase().trim();
    const filtered = allAgents.filter(a => {
      if (roleFilter !== 'all' && a.role !== roleFilter) return false;
      if (!q) return true;
      const hay = `${a.agent_id} ${a.name} ${a.owner_domain} ${a.role} ${a.model} ${(a.capabilities || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:28px">No matching agents found. Click “+ Mint New Agent ID” to register one.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map((a, idx) => `
      <tr data-agent-idx="${idx}">
        <td style="font-family:'Courier New',monospace;font-weight:600">${esc(a.agent_id)}</td>
        <td><strong>${esc(a.name)}</strong><div style="font-size:11px;color:var(--muted)">${esc(a.model)}</div></td>
        <td style="font-family:'Courier New',monospace;font-size:12px">${esc(a.owner_domain)}</td>
        <td><span class="role-tag">${esc(a.role.toUpperCase())}</span><div style="font-size:11px;color:var(--muted);margin-top:3px">${(a.capabilities || []).slice(0, 3).map(c => esc(c)).join(' · ')}</div></td>
        <td><span class="status-pill" data-tier="${esc(a.trust_tier)}">✓ ${esc(a.trust_tier)} · ${esc(a.trust_score)}%</span></td>
        <td><button type="button" class="text-button" data-open-json="${idx}" style="font-size:12px">Card / agent.json →</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr[data-agent-idx]').forEach(row => {
      row.onclick = e => {
        const idx = +row.dataset.agentIdx;
        const mode = e.target.closest('[data-open-json]') ? 'human' : 'human';
        renderDualAgentProfile(filtered[idx], mode);
      };
    });
  }

  document.querySelector('#explorer-search-input').oninput = e => {
    query = e.target.value;
    updateTable();
  };
  document.querySelectorAll('[data-role-filter]').forEach(btn => {
    btn.onclick = () => {
      roleFilter = btn.dataset.roleFilter;
      document.querySelectorAll('[data-role-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      updateTable();
    };
  });
  document.querySelector('#explorer-mint-btn').onclick = () => renderMintAgent();
  document.querySelector('#explorer-home-btn').onclick = () => home();
  updateTable();
}

document.querySelector('#mint-agent-nav')?.addEventListener('click', e => { e.preventDefault(); renderMintAgent(); });
document.querySelector('#agent-registry-nav').onclick = e => { e.preventDefault(); renderAgentExplorer(); };

document.querySelector('#about').onclick = e => (e.preventDefault(), openDialog('What is Aura ID, and how does it work?', `
  <p>Aura ID is the open standard for both human users and autonomous AI agents in the post-UI, post-CAPTCHA web.</p>
  <h3>1. Human Taste Token</h3>
  <p>Set your communication style, material taste, sizes, and active shopping list once. Use it across ChatGPT, Claude, and Gemini.</p>
  <h3>2. Verified Agent ID (Machine Passport)</h3>
  <p>Assign your autonomous agent its own official Verified Agent ID (e.g. <code>AURA-BUY-4A2F-9C10</code>). When websites retire legacy CAPTCHAs, this verifiable passport proves legitimate human sponsorship, spend boundaries, and taste context without exposing your real identity.</p>
  <h3>3. Zero Server Dependency</h3>
  <p>Everything runs 100% in your browser and on local MCP servers. Safe, private, and peer-to-peer.</p>
`));

document.querySelector('#mcp-api').onclick = e => { e.preventDefault();
  const tokenPreview = JSON.stringify(createTasteToken(Object.values(p).some(Boolean) ? p : {
    ...EMPTY(), priority: 'quality', taste: 'Minimal & quiet, No big logos',
    constraints: 'Shoe size EU 42, Sensitive knees', needs: 'Running shoes for asphalt\nWarm dimmable desk lamp',
    tone: 'direct', length: 'brief', actions: 'ask', agent_id: 'AURA-BUY-4A2F-9C10'
  }), null, 2);
  openDialog('How the MCP & Taste Token API work', `
    <p>Aura ID works in <strong>three modes</strong>—from simple copy &amp; paste to autonomous agent handshakes:</p>
    <h3>Mode 1 · Copy, File, or Share Link (No server needed)</h3>
    <p>Works right in the browser on GitHub Pages. Copy the Markdown prompt, download the JSON passport, or copy a self-contained <code>#token=...</code> link.</p>
    <h3>Mode 2 · Local MCP Server (Zero-Dependency Node.js)</h3>
    <p>The included <code>mcp/server.mjs</code> file connects Claude Desktop, Cursor, or your agent directly to your profile:</p>
    <pre>{
  "mcpServers": {
    "aura-id": {
      "command": "node",
      "args": ["./mcp/server.mjs", "--profile", "./aura-id-profile.json"]
    }
  }
}</pre>
    <h3>Mode 3 · Post-CAPTCHA Agent-to-Agent Handshake</h3>
    <p>Your agent presents this PII-free machine passport and taste token at store and service gates:</p>
    <pre id="mcp-token-pre">${esc(tokenPreview)}</pre>
    <div class="hero-actions" style="margin-bottom:0"><button class="primary" id="copy-mcp-token">Copy Token JSON</button></div>
  `);
  document.querySelector('#copy-mcp-token').onclick = () => copyText(tokenPreview, 'Scoped Taste Token copied.');
};

document.querySelector('#privacy').onclick = e => (e.preventDefault(), openDialog('Your data & privacy', `
  <p>Everything you enter stays inside your browser. No account sign-up, tracking database, or third-party cookies.</p>
  <p>When your agent presents its <strong>Agent Passport &amp; Taste Token</strong> to an external store, all personal identifiers (real name, employer, raw prompts) remain encrypted and unexposed. Only the Verified Agent ID, trust tier, spending limit, and taste vector are exchanged.</p>
`));

document.querySelector('#site-theme').onclick = e => { e.preventDefault();
  theme = theme === 'light' ? 'dark' : 'light';
  document.body.dataset.theme = theme;
  document.querySelector('#site-theme').setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
};
document.querySelector('#load').onclick = e => { e.preventDefault(); openLoad(); };

function openLoad() {
  let stored = false;
  try { stored = !!localStorage.getItem('aura-profile-v01'); } catch {}
  openDialog('Open a saved profile', `<p>Import a previously downloaded Aura ID, Agent Passport, or Taste Token JSON file, or resume the profile saved in this browser.</p><div class="method"><button id="upload-profile"><strong>Import JSON file</strong><small>Supports Aura ID profile, Agent Passport, and Taste Token files.</small></button><button id="resume-profile" ${stored ? '' : 'disabled'}><strong>Resume from this browser</strong><small>${stored ? 'A saved profile was found in this browser.' : 'No saved profile in this browser yet.'}</small></button></div><p class="error" id="load-error" role="alert"></p>`);
  document.querySelector('#upload-profile').onclick = () => document.querySelector('#file-input').click();
  document.querySelector('#resume-profile').onclick = () => {
    try {
      p = importProfile(localStorage.getItem('aura-profile-v01'));
      scope = { context: true, communication: true, visual: true, taste: true, agent: true };
      dialog.close(); go(FINAL_STEP); toast('Saved profile opened.');
    } catch (e) {
      document.querySelector('#load-error').textContent = e.message;
    }
  };
}

document.querySelector('#file-input').onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (file.size > 100000) throw new Error('Use a profile smaller than 100 KB.');
    const next = importProfile(await file.text());
    p = next; scope = { context: true, communication: true, visual: true, taste: true, agent: true };
    dialog.close(); go(FINAL_STEP); toast('Profile imported.');
  } catch (err) {
    const out = document.querySelector('#load-error');
    if (out) out.textContent = err.message; else toast(err.message);
  }
  e.target.value = '';
};

function getSwatches(profile) {
  const c1 = profile.theme === 'light' ? '#233a32' : profile.theme === 'dark' ? '#f0eedf' : '#d8d5c5';
  const c2 = profile.priority === 'quality' ? '#bf8061' : profile.priority === 'value' ? '#6b9080' : profile.priority === 'minimal' ? '#9aa095' : '#a8b7a0';
  const c3 = profile.agent_role === 'buyer' ? '#4a5d6e' : profile.agent_role === 'researcher' ? '#a83f23' : '#d48c46';
  const c4 = profile.actions === 'draft-only' ? '#7a6f9b' : profile.actions === 'ask' ? '#52796f' : '#6f8972';
  return [c1, c2, c3, c4];
}

function passport(profile, { example = false } = {}) {
  const needsList = parseNeeds(profile.needs);
  const agentId = profile.agent_id || generateDeterministicAgentId(profile.name || profile.agent_name, profile.agent_role);
  const pills = [
    `ID: ${agentId}`,
    profile.agent_role ? label(profile.agent_role) : 'Buyer Agent',
    profile.priority ? label(profile.priority) : '',
    profile.agent_spend_limit ? `Limit: ${profile.agent_spend_limit}` : '',
    needsList.length ? `${needsList.length} shopping need${needsList.length > 1 ? 's' : ''}` : ''
  ].filter(Boolean).slice(0, 4);

  const metaLine = [
    `Agent ID: ${agentId}`,
    profile.agent_trust ? `Trust: ${label(profile.agent_trust)}` : 'Trust: Verified',
    profile.actions ? label(profile.actions) : 'Ask before acting'
  ].filter(Boolean).join(' · ');

  const ownerParts = [
    profile.agent_name || (example ? 'Hermes Agent' : 'My Personal Agent'),
    profile.name ? `Owner: ${profile.name}` : (example ? 'Owner: Alex Rivera' : 'Self-sovereign owner'),
    profile.agent_model || 'GPT-4o / Claude 3.5'
  ].filter(Boolean).join(' · ');

  const surface = profile.theme === 'light' ? 'light' : 'dark';
  const priorityAttr = profile.priority || 'default';
  const densityAttr = profile.density || 'focused';
  const [s1, s2, s3, s4] = getSwatches(profile);

  return `<div class="passport" data-surface="${esc(surface)}" data-priority="${esc(priorityAttr)}" data-density="${esc(densityAttr)}" aria-label="${example ? 'Example Agent Passport' : 'Your live Verified Agent ID'}">
    <div class="card-top">
      <span class="card-word">aura id.</span>
      <span class="mono">${example ? 'KYA Passport' : 'KYA Agent Identity'}<br>${esc(agentId)}</span>
    </div>
    <div>
      <h2 class="card-title">${esc(archetype(profile))}</h2>
      <div class="card-owner">${esc(ownerParts)}</div>
      <div class="agent-id-badge"><span>VERIFIED AGENT ID:</span> <b>${esc(agentId)}</b></div>
      ${pills.length ? `<div class="card-pills" style="margin-top:8px">${pills.map(tag => `<span class="card-pill">${esc(tag)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="card-bottom">
      <div class="mono">${esc(metaLine)}<br>${example ? 'Post-CAPTCHA verified machine passport' : 'Universal Agent Identity & Taste Token'}</div>
      <div class="swatches" title="Cryptographic Agent Signature" aria-hidden="true">
        <i style="background:${s1}"></i><i style="background:${s2}"></i><i style="background:${s3}"></i><i style="background:${s4}"></i>
      </div>
    </div>
  </div>`;
}

function home() {
  view = 'home';
  const sample = {
    ...EMPTY(), name: 'Alex Rivera', role: 'Founder', language: 'English',
    agent_id: 'AURA-BUY-8D1F-43A0', agent_name: 'Hermes Buyer', agent_role: 'buyer',
    agent_trust: 'verified', agent_spend_limit: '$150 / session',
    tone: 'direct', length: 'brief', priority: 'quality',
    taste: 'Minimal & quiet, No big logos', constraints: 'Shoe size EU 42',
    needs: 'Running shoes for asphalt\nWarm dimmable desk lamp', actions: 'ask'
  };
  const hasDraft = Object.values(p).some(Boolean);
  main.innerHTML = `<div class="landing">
    <aside class="explainer-bar" aria-label="How Aura ID works">
      <div class="explainer-lead">
        <strong>The Universal Registry for AI Agents &amp; Humans</strong>
        When legacy CAPTCHAs disappear, how will websites verify legitimate agents? Aura ID issues an official <b>Verified Agent ID</b> and <b>Taste Token</b> so your autonomous agents can identify, authenticate, and shop safely across the internet.
      </div>
      <div class="explainer-steps">
        <div class="explainer-step"><span>01 · Identity</span><b>Verified Agent ID</b>Every agent gets a unique machine passport (e.g. <code>AURA-BUY-...</code>) with verified human ownership.</div>
        <div class="explainer-step"><span>02 · Taste</span><b>Taste Token &amp; Needs</b>Carries your personal style, sizes, and active shopping list without exposing private PII.</div>
        <div class="explainer-step"><span>03 · Post-CAPTCHA</span><b>Zero-Friction Access</b>Stores and platforms verify trust score and spend limits instead of showing CAPTCHA puzzles.</div>
      </div>
    </aside>
    <div class="intro-line">Universal Machine Passport &amp; Taste Token for the Agentic Web.</div>
    <section class="hero">
      <div class="hero-copy">
        <h1>An official Verified Agent ID<br>for your <em>AI Agents.</em></h1>
        <p>Give every agent a unique Agent ID, a cryptographic trust passport, and your personal Taste Token. Replaces CAPTCHAs and lets your agents shop and browse the internet seamlessly on your behalf.</p>
        <div class="hero-actions">
          <button class="primary" id="create">${hasDraft ? 'Continue my card' : 'Issue Agent ID & Token (2 min)'}</button>
          <button class="secondary" id="try-sample">Load example Agent ID</button>
          <button class="text-button" id="example">See sample passport</button>
        </div>
        <div class="quiet">Free &amp; open source · Zero server needed · Built for Claude, GPT-4o, Cursor &amp; MCP</div>
      </div>
      <div class="card-stage">
        ${passport(sample, { example: true })}
        <p class="card-note">Live Verified Agent ID Card. Updates in real time as you adjust preferences.</p>
      </div>
    </section>
    <section class="captcha-sandbox" aria-label="Live Bypass CAPTCHA Sandbox">
      <div class="sandbox-head">
        <div>
          <div class="small-label">Interactive Post-CAPTCHA Sandbox · Try it live</div>
          <h2>What happens when an AI agent visits a website?</h2>
          <p>Switch between an unregistered bot and an agent equipped with an <strong>Aura Verified Agent ID</strong> to see how websites replace CAPTCHAs with instant cryptographic verification.</p>
        </div>
        <div class="mode-switch" role="group" aria-label="CAPTCHA Sandbox Mode">
          <button type="button" id="sb-mode-aura" aria-pressed="true">Aura-Equipped Agent (Bypass)</button>
          <button type="button" id="sb-mode-bot" aria-pressed="false">Unregistered Bot (Blocked)</button>
        </div>
      </div>
      <div class="sandbox-grid" id="sandbox-stage"></div>
    </section>
    <section class="captcha-sandbox" style="margin-top:28px" aria-label="Public Agent Directory Snapshot">
      <div class="sandbox-head">
        <div>
          <div class="small-label">Global Agent Identity Standard · Public Directory Snapshot</div>
          <h2>Registered KYA Agents on the Network</h2>
          <p>Machine-readable discovery endpoints: <a href="https://souleria.github.io/aura-id/llms.txt" target="_blank" rel="noopener noreferrer" class="text-button" style="text-decoration:underline">/llms.txt</a> and <a href="https://souleria.github.io/aura-id/.well-known/agent.json" target="_blank" rel="noopener noreferrer" class="text-button" style="text-decoration:underline">/.well-known/agent.json</a></p>
        </div>
        <button type="button" class="secondary" id="home-open-explorer">Open Full Agent Explorer →</button>
      </div>
      <div class="explorer-table-wrap">
        <table class="explorer-table">
          <thead>
            <tr>
              <th>Verified Agent ID</th>
              <th>Agent Name &amp; Model</th>
              <th>Owner Domain</th>
              <th>Role &amp; Capabilities</th>
              <th>KYA Trust Score</th>
            </tr>
          </thead>
          <tbody>
            ${loadDirectoryAgents().slice(0, 5).map(a => `
              <tr data-home-agent="${esc(a.agent_id)}">
                <td style="font-family:'Courier New',monospace;font-weight:600">${esc(a.agent_id)}</td>
                <td><strong>${esc(a.name)}</strong><div style="font-size:11px;color:var(--muted)">${esc(a.model)}</div></td>
                <td style="font-family:'Courier New',monospace;font-size:12px">${esc(a.owner_domain)}</td>
                <td><span class="role-tag">${esc(a.role.toUpperCase())}</span> · <span style="font-size:11px;color:var(--muted)">${(a.capabilities || []).slice(0, 3).map(c => esc(c)).join(', ')}</span></td>
                <td><span class="status-pill" data-tier="${esc(a.trust_tier)}">✓ ${esc(a.trust_tier)} · ${esc(a.trust_score)}%</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
    <div class="hero-under">
      <p>The first open specification defining the Universal Agent Registry &amp; KYA (Know Your Agent) Protocol, post-CAPTCHA machine authentication, and portable shopping taste tokens.</p>
      <div class="under-items">
        <div><strong>Mint Agent ID</strong>Instant Ed25519 keypair &amp; ID</div>
        <div><strong>Dual Profile</strong>Human card + raw <code>agent.json</code></div>
        <div><strong>Agent Explorer</strong>Public directory of verified agents</div>
      </div>
    </div>
  </div>`;

  document.querySelector('#create').onclick = () => go(hasDraft ? step : 1);
  document.querySelector('#try-sample').onclick = () => {
    p = cleanProfile(sample);
    go(FINAL_STEP);
    toast('Example Agent Passport loaded! Test the post-CAPTCHA verification below.');
  };
  document.querySelector('#example').onclick = () => {
    openDialog('What an Verified Agent ID carries', `
      ${passport(sample, { example: true })}
      <p>“Agent ID <code>AURA-BUY-8D1F-43A0</code> (Hermes Buyer) sponsored by Alex Rivera. Verified Trust Tier. Max spending limit: $150 / session. Boundaries: ask approval before external payments.”</p>
      <div class="hero-actions"><button class="primary" id="example-create">Use this Agent ID</button></div>
    `);
    document.querySelector('#example-create').onclick = () => {
      dialog.close(); p = cleanProfile(sample); go(FINAL_STEP); toast('Example profile loaded.');
    };
  };

  let sbAura = true;
  function renderHomeSandbox() {
    const stage = document.querySelector('#sandbox-stage');
    if (!stage) return;
    document.querySelector('#sb-mode-aura').setAttribute('aria-pressed', String(sbAura));
    document.querySelector('#sb-mode-bot').setAttribute('aria-pressed', String(!sbAura));
    if (sbAura) {
      stage.innerHTML = `
        <div class="sandbox-terminal">
          <div>
            <div class="term-bar"><span>Agent Outbound Request</span><span>Ed25519 Signed</span></div>
            <div>GET /store/api/catalog-handshake HTTP/2</div>
            <div>Host: merchant.example.com</div>
            <div style="color:#a8dadc">X-Aura-Agent-ID: AURA-BUY-8D1F-43A0</div>
            <div style="color:#a8dadc">X-Aura-Owner-Domain: souleria.github.io</div>
            <div style="color:#a8dadc">X-Aura-Public-Key: ed25519:pk_aura_8d1f43a0...</div>
            <div style="color:#f1a17f">X-Aura-Taste-Token: scoped-no-pii (2 active needs)</div>
          </div>
          <div style="margin-top:16px;padding-top:10px;border-top:1px solid #2e352f;color:#959c90;font-size:11px">
            ✓ Cryptographic signature verified in 11 ms · Zero human puzzle
          </div>
        </div>
        <div class="sandbox-gate">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px">
              <span class="bypass-badge">✓ CAPTCHA BYPASSED · 200 OK</span>
              <span class="mono">Trust Score: 98 / 100</span>
            </div>
            <h3 style="font:22px Georgia,serif;margin:0 0 8px">Instant Agent Entry Granted</h3>
            <p style="font-size:13px;color:var(--muted);margin:0 0 14px">The gateway verified <strong>Hermes Procurement v2</strong> (<code>AURA-BUY-8D1F-43A0</code>), confirmed domain ownership (<code>souleria.github.io</code>), and matched the attached Taste Token.</p>
            <div class="a2a-item">
              <div class="a2a-item-head"><span>Matched Store Response</span><span>Spend limit: $150</span></div>
              <p>2 items matched from catalog (Nord Runner 01, Atelier Cast-Iron Lamp) and staged for human approval.</p>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
            <button type="button" class="primary" id="sb-go-mint">Mint Your Own Agent ID →</button>
            <button type="button" class="secondary" id="sb-go-explorer">Browse Agent Explorer</button>
          </div>
        </div>`;
    } else {
      stage.innerHTML = `
        <div class="sandbox-terminal">
          <div>
            <div class="term-bar"><span>Unregistered Bot Request</span><span>No Aura Header</span></div>
            <div>GET /store/api/catalog-handshake HTTP/2</div>
            <div>Host: merchant.example.com</div>
            <div style="color:#f1a17f">User-Agent: GenericAutonomousBot/1.0</div>
            <div style="color:#959c90">// Missing X-Aura-Agent-ID</div>
            <div style="color:#959c90">// Missing Ed25519 Owner Signature</div>
          </div>
          <div style="margin-top:16px;padding-top:10px;border-top:1px solid #2e352f;color:#f1a17f;font-size:11px">
            ✕ HTTP 403 Forbidden · Blocked by Legacy Anti-Bot Wall
          </div>
        </div>
        <div class="sandbox-gate">
          <div class="captcha-wall">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <strong style="font-size:13px;color:var(--accent)">⚠ SECURITY CHALLENGE: PROVE YOU ARE HUMAN</strong>
              <span class="mono">403 BLOCKED</span>
            </div>
            <p style="font-size:12px;color:var(--muted);margin:0">Select all squares with <strong>traffic lights</strong> before continuing:</p>
            <div class="captcha-grid-visual" aria-hidden="true">
              <div class="captcha-cell">[ 🚦 ]</div><div class="captcha-cell">[ 🚗 ]</div><div class="captcha-cell">[ 🚦 ]</div>
              <div class="captcha-cell">[ 🌳 ]</div><div class="captcha-cell">[ 🛣️ ]</div><div class="captcha-cell">[ 🏢 ]</div>
              <div class="captcha-cell">[ 🚲 ]</div><div class="captcha-cell">[ 🚦 ]</div><div class="captcha-cell">[ 🚶 ]</div>
            </div>
            <p style="font-size:11px;color:var(--muted);margin:0">Autonomous agent execution failed: agent cannot pass visual human Turing test without an Aura Verified Agent ID.</p>
          </div>
          <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
            <button type="button" class="primary" id="sb-switch-to-aura">Equip Agent with Aura ID →</button>
          </div>
        </div>`;
    }
    document.querySelector('#sb-go-mint')?.addEventListener('click', () => renderMintAgent());
    document.querySelector('#sb-go-explorer')?.addEventListener('click', () => renderAgentExplorer());
    document.querySelector('#sb-switch-to-aura')?.addEventListener('click', () => { sbAura = true; renderHomeSandbox(); });
  }
  document.querySelector('#sb-mode-aura').onclick = () => { sbAura = true; renderHomeSandbox(); };
  document.querySelector('#sb-mode-bot').onclick = () => { sbAura = false; renderHomeSandbox(); };
  renderHomeSandbox();
  document.querySelector('#home-open-explorer')?.addEventListener('click', () => renderAgentExplorer());
  document.querySelectorAll('tr[data-home-agent]').forEach(row => {
    row.onclick = () => {
      const id = row.dataset.homeAgent;
      const found = loadDirectoryAgents().find(x => x.agent_id === id);
      if (found) renderDualAgentProfile(found, 'human');
    };
  });
  tilt();
}

function tilt() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer:fine)').matches) return;
  document.querySelectorAll('.passport').forEach(el => {
    el.onpointermove = e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `rotateX(${-(e.clientY - r.top - r.height / 2) / 50}deg) rotateY(${(e.clientX - r.left - r.width / 2) / 50}deg)`;
    };
    el.onpointerleave = () => el.style.transform = '';
  });
}

function fieldWithChips(key, title, placeholder = '', multi = false, max = 180, sep = ', ') {
  const rows = key === 'instructions' ? 4 : key === 'needs' ? 4 : 2;
  const chips = QUICK_CHIPS[key] || [];
  const currentVal = p[key] || '';
  const activeList = sep === '\n' ? parseNeeds(currentVal) : currentVal.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return `<div class="field-block">
    <label class="field">
      <span>${title}<span class="optional">Optional</span></span>
      ${multi
        ? `<textarea name="${key}" rows="${rows}" maxlength="${max}" placeholder="${placeholder}">${esc(p[key])}</textarea>`
        : `<input type="text" name="${key}" value="${esc(p[key])}" maxlength="${max}" placeholder="${placeholder}" autocomplete="${key === 'name' ? 'given-name' : 'off'}">`}
    </label>
    ${chips.length ? `<div class="chip-row" aria-label="Quick suggestions for ${esc(title)}">${chips.map(c => {
      const isPressed = sep === '\n' ? activeList.some(x => x.toLowerCase() === c.toLowerCase()) : activeList.includes(c.toLowerCase());
      return `<button type="button" class="chip" data-chip-field="${key}" data-chip-sep="${sep === '\n' ? 'newline' : 'comma'}" data-chip-val="${esc(c)}" aria-pressed="${isPressed}">+ ${esc(c)}</button>`;
    }).join('')}</div>` : ''}
  </div>`;
}

function choice(key, value, title, description = '') {
  return `<label class="choice"><input type="radio" name="${key}" value="${value}" ${p[key] === value ? 'checked' : ''}><span><strong>${title}</strong>${description ? `<small>${description}</small>` : ''}</span></label>`;
}

function nav() {
  return `<aside class="steps" aria-label="Profile sections"><div class="small-label">Your card builder</div>${titles.map((t, i) => `<button class="step-link" data-step="${i}" aria-label="${t}" ${i === step ? 'aria-current="step"' : ''}><span>${i + 1}</span><span class="step-name">${t}</span></button>`).join('')}<div class="progress-line" aria-hidden="true"><i style="width:${step / FINAL_STEP * 100}%"></i></div></aside>`;
}

function summary() {
  const needsCount = parseNeeds(p.needs).length;
  const agentId = p.agent_id || generateDeterministicAgentId(p.name || p.agent_name, p.agent_role);
  return `<div class="live-title"><span>Your Agent Card</span><span class="live-dot">Live sync</span></div>${passport(p)}<div class="summary">${[
    ['Agent ID', agentId],
    ['Agent Role', label(p.agent_role || 'buyer')],
    ['Owner / Sponsor', p.name || 'Anonymous'],
    ['Shopping Priority', label(p.priority)],
    ['Spending Limit', p.agent_spend_limit || '$150 / session'],
    ['Shopping List', needsCount ? `${needsCount} item${needsCount > 1 ? 's' : ''}` : 'Empty'],
    ['Safety Boundary', p.actions ? label(p.actions) : 'Always ask first']
  ].map(([a, b]) => `<div class="summary-row"><span>${a}</span><span>${esc(b)}</span></div>`).join('')}</div><p class="note">Every change immediately updates your Verified Agent ID and machine passport.</p>`;
}

function updateLivePreview() {
  const panel = document.querySelector('.live-panel');
  if (panel) {
    panel.innerHTML = summary();
    tilt();
  }
}

function go(n) {
  step = n; view = n === FINAL_STEP ? 'review' : 'studio';
  if (n === FINAL_STEP) { renderReview(); } else { renderStudio(); }
  main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' });
}

function attachChipListeners() {
  document.querySelectorAll('[data-chip-field]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.chipField;
      const val = btn.dataset.chipVal;
      const isNewline = btn.dataset.chipSep === 'newline';
      const input = document.querySelector(`[name="${key}"]`);
      if (!input) return;
      if (key === 'role' || key === 'language' || key === 'agent_model' || key === 'agent_spend_limit') {
        input.value = input.value.trim() === val ? '' : val;
      } else if (isNewline) {
        const list = parseNeeds(input.value);
        const idx = list.findIndex(x => x.toLowerCase() === val.toLowerCase());
        if (idx >= 0) list.splice(idx, 1); else list.push(val);
        input.value = list.join('\n');
      } else {
        const parts = input.value.split(',').map(s => s.trim()).filter(Boolean);
        const idx = parts.findIndex(x => x.toLowerCase() === val.toLowerCase());
        if (idx >= 0) parts.splice(idx, 1); else parts.push(val);
        input.value = parts.join(', ');
      }
      capture();
      renderStudio();
    };
  });
}

function renderStudio() {
  const content = stepContent();
  main.innerHTML = `<div class="studio">${nav()}<section class="step-content"><div class="small-label">Step ${step + 1} of ${titles.length} · ${titles[step]}</div>${content}</section><aside class="live-panel" aria-label="Profile preview">${summary()}</aside></div>`;
  document.querySelectorAll('[data-step]').forEach(el => el.onclick = () => { capture(); go(+el.dataset.step); });
  const form = document.querySelector('#profile-form');
  if (form) {
    form.addEventListener('input', () => { capture(); updateLivePreview(); });
    form.addEventListener('change', () => { capture(); updateLivePreview(); });
    form.onsubmit = e => { e.preventDefault(); capture(); if (returnReview) { returnReview = false; go(FINAL_STEP); } else go(step + 1); };
  }
  attachChipListeners();
  document.querySelector('#back')?.addEventListener('click', () => { capture(); go(step - 1); });
  document.querySelector('#skip')?.addEventListener('click', () => { capture(); if (returnReview) { returnReview = false; go(FINAL_STEP); } else go(step + 1); });
  document.querySelector('#clear-section')?.addEventListener('click', () => {
    const fields = {
      1: ['name', 'role', 'goal', 'language', 'instructions'],
      2: ['length', 'tone'], 3: ['evidence', 'challenge'],
      4: ['theme', 'density', 'motion'],
      5: ['priority', 'taste', 'constraints', 'needs'],
      6: ['agent_name', 'agent_role', 'agent_model', 'agent_spend_limit'],
      7: ['actions', 'avoid']
    };
    const empty = EMPTY();
    for (const key of fields[step] || []) p[key] = empty[key];
    renderStudio(); toast('Section cleared.');
  });
  document.querySelector('#quick')?.addEventListener('click', () => go(1));
  document.querySelector('#paste')?.addEventListener('click', () => {
    go(1); const d = document.querySelector('details'); if (d) d.open = true; document.querySelector('[name=instructions]')?.focus();
  });
  document.querySelector('#import-start')?.addEventListener('click', openLoad);
  tilt();
}

function capture() {
  const form = document.querySelector('#profile-form'); if (!form) return;
  const data = new FormData(form);
  for (const key of Object.keys(p)) if (data.has(key)) p[key] = data.get(key);
  p = cleanProfile(p);
}

function actions() {
  return `<div class="form-actions"><button type="button" class="text-button" id="back">← Back</button><div class="right"><button type="button" class="text-button" id="skip">${returnReview ? 'Back to review' : 'Skip this step'}</button><button type="submit" class="primary">${returnReview ? 'Save changes' : step === FINAL_STEP - 1 ? 'See my finished card →' : 'Next step →'}</button></div></div><button type="button" class="text-button" id="clear-section">Reset this step</button>`;
}

function stepContent() {
  switch (step) {
    case 0:
      return `<h1>Build your Identity &amp;<br>Verified Agent ID</h1><p class="description">Create a portable AI profile, define your taste graph, and register an official Verified Agent ID for your autonomous agent. Tap ready tags or quick choices.</p><div class="method"><button id="quick"><span class="method-num">01</span><strong>Build step-by-step (Recommended)</strong><small>Create your profile, Taste Token, and Verified Agent ID in 2 minutes.</small></button><button id="paste"><span class="method-num">02</span><strong>Bring existing custom instructions</strong><small>Paste prompt rules you already give to ChatGPT, Claude, or Cursor.</small></button><button id="import-start"><span class="method-num">03</span><strong>Open existing profile or Agent Passport</strong><small>Import JSON or resume draft saved in this browser.</small></button></div>`;
    case 1:
      return `<h1>First, a quick<br>human introduction.</h1><p class="description">Tell your personal AI who you are. (When your agent shops on external sites, this private personal context is completely masked.)</p><form id="profile-form">${fieldWithChips('name', 'What should AI call you?', 'Your first name or pseudonym', false, 80)}${fieldWithChips('role', 'What do you do day-to-day?', 'Click a tag below or type your role', false, 180)}${fieldWithChips('goal', 'What do you use AI for most?', 'Click one or more tags below, or type your own', true, 1200)}${fieldWithChips('language', 'Preferred language', 'e.g., English, Persian, or match my message', false, 80)}<details ${p.instructions ? 'open' : ''}><summary class="small-label">Have extra custom rules? Paste them here (optional)</summary><div style="margin-top:12px">${fieldWithChips('instructions', 'Custom instructions', 'Any specific rules you want AI to follow verbatim.', true, 10000)}</div></details>${actions()}</form>`;
    case 2:
      return `<h1>How should AI<br>talk to you?</h1><p class="description">Pick the reply length and tone that feel least tiring to read every day.</p><form id="profile-form"><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">1. How long should replies be?</legend><div class="choice-list">${choice('length', 'brief', 'Short & to the point', 'Give me the direct answer first. I will ask if I want more detail.')}${choice('length', 'balanced', 'Balanced (Answer + brief why)', 'Start with the answer, then give the key reasoning in a few lines.')}${choice('length', 'detailed', 'Step-by-step guide', 'Walk me through the full plan with clear numbered steps and examples.')}</div></fieldset><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">2. What tone feels natural?</legend><div class="radio-inline">${choice('tone', 'direct', 'Straightforward')}${choice('tone', 'conversational', 'Warm & friendly')}${choice('tone', 'formal', 'Professional')}</div></fieldset>${actions()}</form>`;
    case 3:
      return `<h1>How should AI<br>help you think?</h1><p class="description">Tell AI whether you want polite agreement or honest pushback when you share an idea.</p><form id="profile-form"><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">1. If my idea has a flaw or blind spot...</legend><div class="choice-list">${choice('challenge', 'challenge', 'Be direct and challenge me', 'Point out weak assumptions clearly and suggest stronger alternatives.')}${choice('challenge', 'gentle', 'Be constructive and supportive', 'Highlight what works, then gently explain how to fix the weak spots.')}</div></fieldset><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">2. When stating facts or product claims...</legend><div class="choice-list">${choice('evidence', 'sources', 'Always include verifiable links', 'Cite reliable sources and separate facts from guesses.')}${choice('evidence', 'when-needed', 'Only when important', 'Mention sources only for major claims or when I ask.')}</div></fieldset>${actions()}</form>`;
    case 4:
      return `<h1>How should things<br>look on screen?</h1><p class="description">Notice how your card on the right changes immediately when you pick Light or Dark.</p><form id="profile-form"><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">1. Preferred color surface</legend><div class="split-choices"><label class="choice"><div class="visual-theme" aria-hidden="true">Warm paper<b>Clean &amp; bright.</b>Easy daytime reading.<hr></div><input type="radio" name="theme" value="light" ${p.theme === 'light' ? 'checked' : ''}> Light surface</label><label class="choice"><div class="visual-theme dark" aria-hidden="true">Deep forest<b>Low glare.</b>Calm night reading.<hr></div><input type="radio" name="theme" value="dark" ${p.theme === 'dark' ? 'checked' : ''}> Dark surface</label></div><div style="margin-top:10px">${choice('theme', 'system', 'Follow my phone or laptop setting')}</div></fieldset><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">2. How should options be presented?</legend><div class="choice-list">${choice('density', 'focused', 'Simple summary first', 'Show the top recommendation cleanly without overwhelming tables.')}${choice('density', 'compact', 'Side-by-side comparison', 'Pack specs and prices together so I can compare fast.')}</div></fieldset><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">3. Visual motion</legend><div class="radio-inline">${choice('motion', 'reduced', 'Calm (no animation)')}${choice('motion', 'subtle', 'Smooth motion')}</div></fieldset>${actions()}</form>`;
    case 5:
      return `<h1>Your taste &amp;<br>shopping list.</h1><p class="description">This builds your <strong>Taste Token</strong>. When your agent visits a store, it presents this token to filter items that match your taste and immediate needs.</p><form id="profile-form"><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">1. When buying things, what matters most to you?</legend><div class="choice-list">${choice('priority', 'quality', 'Buy once, keep for years', 'Prioritize durable materials, repairability, and craftsmanship over cheap prices.')}${choice('priority', 'value', 'Best value for money', 'Prioritize proven performance, fair pricing, and practical specs without brand markup.')}${choice('priority', 'minimal', 'Simple, quiet & unbranded', 'Prioritize clean design, natural materials, and zero loud logos or clutter.')}</div></fieldset>${fieldWithChips('taste', '2. Your style & material taste (tap tags or type)', 'e.g., Minimal & quiet, No big logos, Natural materials', false, 600)}${fieldWithChips('constraints', '3. Your sizes, budget, or sensitivities', 'e.g., Shoe size EU 42, Sensitive knees, Under $150 budget', false, 600)}${fieldWithChips('needs', '4. Your current shopping list (one item per line)', 'Click tags below or type items you want your agent to look for', true, 1200, '\n')}<p class="field-help">Your personal agent can also add or remove shopping items automatically via MCP.</p>${actions()}</form>`;
    case 6:
      const curAgentId = p.agent_id || generateDeterministicAgentId(p.name || p.agent_name, p.agent_role);
      return `<h1>Verified Agent ID &amp;<br>Machine Passport</h1><p class="description">Just like humans have a Verified Agent ID, each autonomous agent receives a unique cryptographic identifier on Aura ID. Replaces CAPTCHAs on agentic websites.</p><form id="profile-form"><div class="agent-id-badge" style="margin-bottom:18px;display:inline-block"><span>ASSIGNED VERIFIED AGENT ID:</span> <b>${esc(curAgentId)}</b></div>${fieldWithChips('agent_name', '1. Agent Name', 'e.g., Hermes Buyer, Sentinel Research, Atlas Coder', false, 80)}<fieldset style="border:0;padding:0;margin:0"><legend class="section-label">2. Agent Role &amp; Mission</legend><div class="choice-list">${choice('agent_role', 'buyer', 'Procurement & Shopping Agent', 'Searches catalogs, matches Taste Tokens, and stages shopping carts.')}${choice('agent_role', 'researcher', 'Autonomous Research Agent', 'Extracts information, analyzes whitepapers, and synthesizes data.')}${choice('agent_role', 'personal_assistant', 'Executive AI Secretary', 'Schedules, drafts emails, and handles coordination.')}</div></fieldset>${fieldWithChips('agent_model', '3. Underlying AI Model / Runtime', 'e.g., Claude 3.5 Sonnet, GPT-4o, Local Llama', false, 80)}${fieldWithChips('agent_spend_limit', '4. Autonomous Spend Limit (Boundaries)', 'e.g., $150 / session, $50 / day, $0 (Browse only)', false, 60)}${actions()}</form>`;
    case 7:
      return `<h1>Set your<br>safety rules.</h1><p class="description">Make sure every AI and shopping agent knows where to stop and ask for your permission.</p><form id="profile-form"><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">1. When an agent is shopping or acting for you...</legend><div class="choice-list">${choice('actions', 'ask', 'Always ask before buying or sending', 'Let the agent find the best match and prepare the cart, then wait for my yes.')}${choice('actions', 'draft-only', 'Only show me a shortlist (Drafts only)', 'Never put items in a cart or take external action—just show me the top matches.')}</div></fieldset>${fieldWithChips('avoid', '2. Pet peeves & things AI should avoid', 'Click tags below or type what annoys you', true, 1200)}${actions()}</form>`;
  }
}

function edit(n) { returnReview = true; go(n); }
function section(title, n, rows) {
  return `<section class="review-section"><h2>${title}<button class="text-button" data-edit="${n}">Edit</button></h2><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || 'Not set')}</dd>`).join('')}</dl></section>`;
}

function renderReview() {
  const selected = Object.values(p).filter(v => v !== null && v !== '').length;
  const needsItems = parseNeeds(p.needs);
  const curAgentId = p.agent_id || generateDeterministicAgentId(p.name || p.agent_name, p.agent_role);

  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div>
        <div class="small-label">Step 9 of 9 · Your KYA Machine Passport &amp; Agent Identity</div>
        <h1>${selected ? 'Your Agent Passport is ready.' : 'Your card is still blank.'}</h1>
        <p>${selected ? 'Test the post-CAPTCHA gate below, or export your Verified Agent ID and Taste Token.' : 'Go back and tap a few quick choices or load the example profile.'}</p>
      </div>
      <button class="secondary" id="back-builder">← Edit steps</button>
    </div>
    <div class="review-layout">
      <div>
        ${passport(p)}
        <p class="card-note">Official Verified Agent ID Card. Click “Edit” on any section below to update live.</p>
        ${section('KYA Agent Identity', 6, [
          ['Agent ID', curAgentId],
          ['Agent Name', p.agent_name || 'Personal Agent'],
          ['Role', label(p.agent_role || 'buyer')],
          ['Model / Runtime', p.agent_model || 'GPT-4o / Claude 3.5'],
          ['Spend Limit', p.agent_spend_limit || '$150 / session'],
          ['Trust Tier', label(p.agent_trust || 'verified')]
        ])}
        ${section('About you (Owner context)', 1, [
          ['Name', p.name], ['Role', p.role], ['Main goal', p.goal],
          ['Language', p.language], ['Custom rules', p.instructions]
        ])}
        ${section('Taste Token & shopping list', 5, [
          ['Buying priority', label(p.priority)], ['Style & taste', p.taste],
          ['Sizes & specs', p.constraints], ['Shopping list', needsItems.length ? needsItems.join('\n') : 'Not set']
        ])}
        ${section('Reply style', 2, [
          ['Length', label(p.length)], ['Tone', label(p.tone)]
        ])}
        ${section('Safety rules', 7, [
          ['Agent boundary', p.actions ? label(p.actions) : 'Always ask first'], ['Avoid', p.avoid]
        ])}
      </div>
      <div>
        <section class="demo-box" id="demo">
          <div class="demo-top">
            <span class="small-label">Live agent simulator</span>
            <div class="mode-switch" role="group" aria-label="Simulation mode">
              <button type="button" id="mode-passport" aria-pressed="${demoMode === 'agent_passport'}">Post-CAPTCHA Gate</button>
              <button type="button" id="mode-store" aria-pressed="${demoMode === 'store'}">Store Agent Handshake</button>
              <button type="button" id="mode-response" aria-pressed="${demoMode === 'response'}">AI Chat Reply</button>
            </div>
          </div>
          <h2 id="demo-heading"></h2>
          <p class="prompt" id="demo-prompt"></p>
          <div class="answer" id="answer"></div>
          <p class="note" id="demo-note"></p>
          <button class="text-button" id="compare"></button>
        </section>
        <section class="export-box">
          <h2>Use your Agent Passport &amp; Token</h2>
          <p>Download the official Agent Passport or copy the Taste Token for MCP.</p>
          <label class="scope"><input type="checkbox" id="scope-agent" ${scope.agent ? 'checked' : ''}><span>KYA Machine Passport &amp; Agent Identity<small>Cryptographic Agent ID, trust tier, model class, and spend limits.</small></span></label>
          <label class="scope"><input type="checkbox" id="scope-taste" ${scope.taste ? 'checked' : ''}><span>Taste Token &amp; Shopping List<small>Aesthetic taste, sizes, constraints, and active needs.</small></span></label>
          <label class="scope"><input type="checkbox" id="scope-communication" ${scope.communication ? 'checked' : ''}><span>Reply &amp; thinking style<small>Length, tone, honesty, sources, and pet peeves.</small></span></label>
          <label class="scope"><input type="checkbox" id="scope-context" ${scope.context ? 'checked' : ''}><span>Owner context (Private)<small>Real name, role, custom instructions (masked in external agent tokens).</small></span></label>
          <div class="export-actions">
            <button class="primary" id="copy-passport-btn" ${selected ? '' : 'disabled'}>Copy Agent Passport</button>
            <button class="secondary" id="copy-token" ${selected ? '' : 'disabled'}>Copy Taste Token</button>
            <button class="secondary" id="copy-link" ${selected ? '' : 'disabled'}>Copy share link</button>
            <button class="secondary" id="download-json" ${selected ? '' : 'disabled'}>Download JSON</button>
          </div>
          <details class="export-preview">
            <summary>Preview exact output (<span id="preview-kind">${previewFormat === 'passport' ? 'Verified Agent ID Passport JSON' : previewFormat === 'token' ? 'Scoped Taste Token JSON' : 'Markdown prompt'}</span>)</summary>
            <div style="margin:6px 0 10px;display:flex;gap:14px;flex-wrap:wrap">
              <button type="button" class="text-button" id="show-passport-preview">Verified Agent ID (JSON)</button>
              <button type="button" class="text-button" id="show-token-preview">Scoped Taste Token (JSON)</button>
              <button type="button" class="text-button" id="show-md-preview">Markdown prompt</button>
            </div>
            <pre id="export-text"></pre>
          </details>
          <div class="storage-actions">
            <button class="text-button" id="save">Save in this browser</button>
            <button class="text-button" id="download-md" ${selected ? '' : 'disabled'}>Download .md file</button>
            <button class="text-button" id="forget">Erase profile</button>
          </div>
          <p class="error" id="export-error" role="alert"></p>
        </section>
      </div>
    </div>
  </div>`;

  document.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => edit(+el.dataset.edit));
  document.querySelector('#back-builder').onclick = () => { returnReview = false; go(1); };
  for (const s of ['context', 'communication', 'visual', 'taste', 'agent']) {
    const el = document.querySelector(`#scope-${s}`);
    if (el) el.onchange = e => { scope[s] = e.target.checked; refreshExport(); };
  }
  document.querySelector('#show-passport-preview').onclick = () => { previewFormat = 'passport'; refreshExport(); };
  document.querySelector('#show-token-preview').onclick = () => { previewFormat = 'token'; refreshExport(); };
  document.querySelector('#show-md-preview').onclick = () => { previewFormat = 'markdown'; refreshExport(); };

  document.querySelector('#copy-passport-btn').onclick = () => {
    previewFormat = 'passport'; refreshExport();
    copyText(JSON.stringify(createAgentPassport(p), null, 2), 'Verified Agent ID Passport copied!');
  };
  document.querySelector('#copy-token').onclick = () => {
    previewFormat = 'token'; refreshExport();
    copyText(JSON.stringify(createTasteToken(p, { includeNeeds: scope.taste, includeVisual: scope.visual }), null, 2), 'Scoped Taste Token copied.');
  };
  document.querySelector('#copy-link').onclick = () => {
    const url = encodeShareUrl(p);
    copyText(url, 'Shareable Agent Passport link copied!');
  };
  document.querySelector('#download-md').onclick = () => download(asMarkdown(createExport(p, scope)), 'aura-agent-profile.md', 'text/markdown');
  document.querySelector('#download-json').onclick = () => download(JSON.stringify(createAgentPassport(p), null, 2), 'aura-agent-passport.json', 'application/json');
  document.querySelector('#save').onclick = () => {
    try {
      localStorage.setItem('aura-profile-v01', JSON.stringify(createExport(p, { context: true, communication: true, visual: true, taste: true, agent: true })));
      toast('Saved in this browser.');
    } catch {
      toast('Browser storage unavailable. Download the JSON file instead.');
    }
  };
  document.querySelector('#forget').onclick = () => {
    openDialog('Erase this profile?', `<p>This clears your current card and removes the saved copy from this browser.</p><div class="hero-actions"><button class="primary" id="confirm-forget">Erase profile</button><button class="secondary" id="cancel-forget">Cancel</button></div>`);
    document.querySelector('#cancel-forget').onclick = () => dialog.close();
    document.querySelector('#confirm-forget').onclick = () => {
      try { localStorage.removeItem('aura-profile-v01'); } catch {}
      p = EMPTY(); scope = { context: true, communication: true, visual: true, taste: true, agent: true };
      step = 0; returnReview = false; dialog.close(); home(); toast('Profile erased.');
    };
  };

  let generic = false;
  document.querySelector('#mode-passport').onclick = () => { demoMode = 'agent_passport'; generic = false; renderReview(); };
  document.querySelector('#mode-store').onclick = () => { demoMode = 'store'; generic = false; renderReview(); };
  document.querySelector('#mode-response').onclick = () => { demoMode = 'response'; generic = false; renderReview(); };
  document.querySelector('#compare').onclick = () => {
    generic = !generic;
    demo(generic);
  };
  demo(false);
  refreshExport();
  tilt();
}

function demo(generic = false) {
  const box = document.querySelector('#demo');
  box.dataset.demoTheme = generic ? 'light' : p.theme === 'dark' ? 'dark' : p.theme === 'system' && matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  box.dataset.demoDensity = generic ? 'focused' : p.density || 'focused';
  const heading = document.querySelector('#demo-heading');
  const promptEl = document.querySelector('#demo-prompt');
  const answerEl = document.querySelector('#answer');
  const noteEl = document.querySelector('#demo-note');
  const compareBtn = document.querySelector('#compare');

  if (demoMode === 'agent_passport') {
    heading.textContent = 'Post-CAPTCHA Gate: Machine Verification';
    const passportData = createAgentPassport(p);
    const verification = verifyAgentPassport(passportData);
    promptEl.textContent = generic
      ? 'Legacy Website Gate: Presents an interactive CAPTCHA puzzle (blocks autonomous agents)'
      : `Aura Agent Gateway: Verifying Agent ID [${passportData.agent.id}] (${passportData.agent.name})`;

    if (generic) {
      answerEl.innerHTML = `<div style="padding:16px;border:1px dashed var(--line);border-radius:4px;text-align:center">
        <div style="font-size:24px;margin-bottom:8px">🧩 🤖 🚫</div>
        <strong>CAPTCHA CHALLENGE REQUIRED</strong>
        <p style="margin:6px 0 0;font-size:12px;color:var(--muted)">"Select all squares with bicycles." Autonomous AI agent execution halts here because bots cannot solve CAPTCHAs without friction.</p>
      </div>`;
      noteEl.textContent = 'Traditional websites treat all AI agents as hostile scrapers and block them with CAPTCHAs.';
      compareBtn.textContent = 'Verify with Verified Agent ID';
    } else {
      answerEl.innerHTML = `<div class="a2a-grid">
        <div class="a2a-item" style="border-left:3px solid var(--accent)">
          <div class="a2a-item-head">
            <span>✓ PASSPORT AUTHENTICATED: ${esc(passportData.agent.id)}</span>
            <span style="color:var(--accent);font-weight:bold">ZERO CAPTCHA</span>
          </div>
          <p><strong>Trust Tier:</strong> ${esc(verification.trust_tier.toUpperCase())} · <strong>Trust Score:</strong> ${verification.trust_score} · <strong>Proof of Owner:</strong> Verified</p>
          <p style="margin-top:4px"><strong>Autonomous Authority:</strong> Catalog Search &amp; Staging Cart allowed up to ${esc(verification.spending_limit)}.</p>
          <div class="a2a-reason">GATEWAY ACTION: Instant Access Granted (No CAPTCHA Required)</div>
        </div>
      </div>`;
      noteEl.textContent = `Aura ID serves as the Verified Agent ID for agents: websites verify the cryptographic sponsor and spend limits, granting immediate access.`;
      compareBtn.textContent = 'Simulate legacy CAPTCHA challenge';
    }
    return;
  }

  if (demoMode === 'store') {
    heading.textContent = 'When your agent visits a store for you';
    const hasTaste = Boolean(p.priority || p.taste || p.constraints || p.needs);
    const sampleProfile = hasTaste ? p : {
      ...EMPTY(), priority: 'quality', taste: 'Minimal & quiet, No big logos',
      constraints: 'Shoe size EU 42, Sensitive knees', needs: 'Running shoes for asphalt\nWarm dimmable desk lamp', actions: 'ask'
    };
    const token = createTasteToken(sampleProfile, { includeNeeds: scope.taste, includeVisual: scope.visual });
    const matches = matchCatalog(token, SAMPLE_STORE_CATALOG);
    promptEl.textContent = generic
      ? 'Without Taste Token: Store shows noisy promoted products'
      : `Sent to Store Agent: ${token.active_needs.length ? `${token.active_needs.length} shopping item(s)` : 'general browse'} · Priority: ${label(token.taste_vector.priority) || 'Default'} · Your name & private context hidden`;
    const itemsToShow = generic ? SAMPLE_STORE_CATALOG.slice(0, 3) : matches;
    answerEl.innerHTML = `<div class="a2a-grid">${itemsToShow.map(item => `<div class="a2a-item"><div class="a2a-item-head"><span>${esc(item.name)}</span><span>${esc(item.price)}</span></div><p>${esc(item.summary)} (${esc(item.specs)})</p>${!generic && item.reasons?.length ? `<div class="a2a-reason">✓ Matched via Taste Token: ${esc(item.reasons.join(' · '))}</div>` : ''}</div>`).join('')}</div>`;
    noteEl.textContent = generic
      ? 'Without your Taste Token, you get generic bestsellers and loud branding that ignore your knees, size, or taste.'
      : `The store’s agent filtered ${SAMPLE_STORE_CATALOG.length} products down to ${matches.length} that match your Taste Token. Rule enforced: "${label(token.boundaries.actions)}".`;
    compareBtn.textContent = generic ? 'Show filtered by my Taste Token' : 'Compare with unfiltered store';
    return;
  }

  heading.textContent = 'How an AI assistant replies to you';
  promptEl.textContent = 'Example question: “How should I test a new product idea?”';
  let answer;
  if (generic) {
    answer = 'There are several ways to test a new product idea. You could conduct market research, gather feedback, develop a prototype, and iterate based on what you learn.';
  } else {
    const intro = p.tone === 'conversational' ? 'I’d start small: ' : p.tone === 'formal' ? 'Recommended approach: ' : '';
    answer = p.length === 'brief'
      ? `${intro}Build one small prototype. Observe people using it. Fix the biggest obstacle before adding features.`
      : p.length === 'detailed'
      ? `${intro}Test the core workflow before expanding.\n\n1. Write down the specific task your product helps someone complete.\n2. Build the smallest prototype that supports that task.\n3. Ask prospective users to try it, without guiding each click.\n4. Record where they hesitate or need help.\n5. Fix the most consequential obstacle and test again.`
      : `${intro}Build a small prototype around one task. Ask prospective users to complete that task while you observe.\n\nUse the points where they hesitate to decide what to change next.`;
    if (p.challenge === 'challenge') answer += '\n\nPushback: positive compliments alone will not tell you whether someone would actually use or pay for it.';
    if (p.challenge === 'gentle') answer += '\n\nHelpful tip: ask people to try completing a task rather than just asking for their opinion.';
  }
  answerEl.textContent = answer;
  noteEl.textContent = 'Simulated locally from your reply style settings.';
  compareBtn.textContent = generic ? 'Show with my preferences' : 'Compare with a generic AI reply';
}

function refreshExport() {
  const exported = createExport(p, scope);
  const token = createTasteToken(p, { includeNeeds: scope.taste, includeVisual: scope.visual });
  const passportData = createAgentPassport(p);

  document.querySelector('#preview-kind').textContent =
    previewFormat === 'passport' ? 'Verified Agent ID Passport JSON'
    : previewFormat === 'token' ? 'Scoped Taste Token JSON'
    : 'Markdown prompt';

  document.querySelector('#export-text').textContent =
    previewFormat === 'passport' ? JSON.stringify(passportData, null, 2)
    : previewFormat === 'token' ? JSON.stringify(token, null, 2)
    : asMarkdown(exported);

  const hasSelected = Object.keys(exported.preferences).length > 0;
  for (const id of ['copy-passport-btn', 'copy-token', 'copy-link', 'download-md', 'download-json']) {
    const btn = document.querySelector(`#${id}`);
    if (btn) btn.disabled = !hasSelected;
  }
  document.querySelector('#export-error').textContent = hasSelected ? '' : 'Pick at least one preference or tag before exporting.';
}

function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); toast(`${name} downloaded.`);
}

if (!checkUrlToken()) home();
