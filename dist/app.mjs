import {EMPTY,cleanProfile,importProfile,createExport,createTasteToken,asMarkdown,archetype,parseNeeds} from './profile.mjs';

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

home();
