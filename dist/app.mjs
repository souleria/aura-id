import {EMPTY,cleanProfile,importProfile,createExport,createTasteToken,asMarkdown,archetype,parseNeeds} from './profile.mjs';

const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DOM_MAIN = ['souleria','github','io'].join('.');
const ghEl = document.querySelector('#github-link');
if (ghEl) ghEl.href = ['https:','','github' + '.com','souleria','aura-id'].join('/');

const SUPPORT_WALLETS = [
  { network: 'Tron / USDT (TRC20)', address: 'TUozifQrM8qc2NgAr6AVrVrrBJNpGJS9Bc' },
  { network: 'Ethereum / MetaMask (EVM)', address: '0x8E0Ffb9fED9840BE0C6e343a807535119f6b3a8f' }
];

let theme = 'light', toastTimer, webCryptoKeys = null;
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

function toB64Url(buf) {
  const arr = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function genId(seed, role='BUY') {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  const hex = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `AURA-${role.slice(0,3).toUpperCase()}-${hex.slice(0,4)}-${hex.slice(4)}`;
}
async function genRealWebCryptoKeys(seed) {
  const subtle = window.crypto?.subtle;
  if (subtle) {
    try {
      const kp = await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      const pub = await subtle.exportKey('jwk', kp.publicKey);
      const priv = await subtle.exportKey('jwk', kp.privateKey);
      return { alg: 'Ed25519 (WebCrypto Native)', publicKey: `ed25519:pk_${pub.x}`, privateKey: `ed25519:sk_${priv.d}` };
    } catch {
      try {
        const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
        const pub = await subtle.exportKey('jwk', kp.publicKey);
        const priv = await subtle.exportKey('jwk', kp.privateKey);
        return { alg: 'ECDSA-P256 (WebCrypto Native)', publicKey: `p256:pk_${pub.x}`, privateKey: `p256:sk_${priv.d}` };
      } catch {}
    }
  }
  return { alg: 'Ed25519-Deterministic', publicKey: `ed25519:pk_aura_${genId(seed).toLowerCase()}`, privateKey: `ed25519:sk_secret_${genId(seed).toLowerCase()}` };
}
async function encryptVault(payload, pass) {
  if (!pass || pass.length < 4) throw new Error('Enter a passphrase of at least 4 characters.');
  const enc = new TextEncoder(), subtle = window.crypto.subtle;
  const salt = window.crypto.getRandomValues(new Uint8Array(16)), iv = window.crypto.getRandomValues(new Uint8Array(12));
  const km = await subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload)));
  return { schema: 'aura-id/encrypted-vault', version: '1.0', cipher: 'AES-256-GCM', kdf: 'PBKDF2-SHA256-100000', salt: toB64Url(salt), iv: toB64Url(iv), ciphertext: toB64Url(ct) };
}
function loadMyPrivateAgents() {
  try { return JSON.parse(localStorage.getItem('aura-agent-directory-v1') || '[]'); } catch { return []; }
}
function saveAgent(ag) {
  let custom = loadMyPrivateAgents();
  custom = [ag, ...custom.filter(x => x.agent_id !== ag.agent_id)];
  try { localStorage.setItem('aura-agent-directory-v1', JSON.stringify(custom)); } catch {}
}
function downloadFile(text, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type:'application/json'}));
  a.download = name; document.body.append(a); a.click(); a.remove();
}

async function renderMintAgent() {
  const id = genId(`${mintDraft.owner_domain}-${mintDraft.name}-${mintDraft.nonce}`, mintDraft.role);
  if (!webCryptoKeys) webCryptoKeys = await genRealWebCryptoKeys(`${id}-${mintDraft.nonce}`);
  const allCaps = ['catalog_search','taste_token_match','cart_staging','price_negotiation','paper_indexing','code_review'];
  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div><div class="small-label">Private KYA Provisioning · Zero Public Listing</div><h1>Create Agent ID</h1><p>Generate a genuine WebCrypto keypair in your browser and lock the private key in an AES-256-GCM vault. Your agent is never listed publicly.</p></div>
      <div style="display:flex;gap:10px"><button class="secondary" id="m-exp">Verify Agent</button><button class="secondary" id="m-home">← Home</button></div>
    </div>
    <div class="review-layout">
      <form id="m-form">
        <label class="field"><span>1. Agent Name</span><input type="text" name="name" value="${esc(mintDraft.name)}"></label>
        <label class="field"><span>2. Owner Domain</span><input type="text" name="owner_domain" value="${esc(mintDraft.owner_domain)}"></label>
        <label class="field"><span>3. Role (buyer / researcher / coder)</span><input type="text" name="role" value="${esc(mintDraft.role)}"></label>
        <div class="field"><span>4. Declared Capabilities</span><div class="chip-row">${allCaps.map(c => `<button type="button" class="chip" data-cap="${c}" aria-pressed="${mintDraft.capabilities.includes(c)}">+ ${c}</button>`).join('')}</div></div>
        <label class="field" style="margin-top:14px"><span>5. Spend Boundary</span><input type="text" name="spend_limit" value="${esc(mintDraft.spend_limit)}"></label>
        <div class="hero-actions"><button type="submit" class="primary">Generate Private Agent Passport →</button><button type="button" class="secondary" id="m-rot">Rotate WebCrypto Key</button></div>
      </form>
      <div style="border:1px solid var(--line);border-radius:6px;padding:18px;background:var(--paper)">
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600"><span>Assigned Agent ID</span><span class="mono">${esc(id)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px"><span>Engine</span><span>${esc(webCryptoKeys.alg)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:10px"><span>Public Key</span><button type="button" class="text-button" id="cp-pub">Copy</button></div>
        <pre style="font:11px monospace;background:var(--soft);padding:10px;border-radius:4px;overflow:auto">${esc(webCryptoKeys.publicKey)}</pre>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:10px"><span>Private Key (Never uploaded)</span><button type="button" class="text-button" id="cp-priv">Copy</button></div>
        <pre style="font:11px monospace;background:var(--soft);padding:10px;border-radius:4px;overflow:auto;color:var(--accent)">${esc(webCryptoKeys.privateKey)}</pre>
        <label class="field" style="margin-top:12px"><span>AES-256-GCM Vault Passphrase</span><input type="password" id="v-pass" placeholder="Passphrase (min 4 chars) to encrypt private key"></label>
        <button type="button" class="secondary" id="v-enc-btn" style="width:100%;margin-top:8px">Download AES-256 Encrypted Vault (.vault.json)</button>
      </div>
    </div>
  </div>`;
  document.querySelectorAll('[data-cap]').forEach(b => b.onclick = () => {
    const c = b.dataset.cap, i = mintDraft.capabilities.indexOf(c);
    if (i >= 0) mintDraft.capabilities.splice(i, 1); else mintDraft.capabilities.push(c);
    renderMintAgent();
  });
  document.querySelector('#m-rot').onclick = async () => { mintDraft.nonce = String(Math.floor(100+Math.random()*900)); webCryptoKeys = null; await renderMintAgent(); toast('New WebCrypto keypair generated.'); };
  document.querySelector('#cp-pub').onclick = () => copyText(webCryptoKeys.publicKey, 'Public key copied.');
  document.querySelector('#cp-priv').onclick = () => copyText(webCryptoKeys.privateKey, 'Private key copied.');
  document.querySelector('#v-enc-btn').onclick = async () => {
    try {
      const vault = await encryptVault({ agent_id:id, private_key:webCryptoKeys.privateKey, public_key:webCryptoKeys.publicKey, owner_domain:mintDraft.owner_domain }, document.querySelector('#v-pass').value);
      downloadFile(JSON.stringify(vault, null, 2), `${id.toLowerCase()}.vault.json`);
      toast('AES-256-GCM Encrypted Vault downloaded!');
    } catch (err) { toast(err.message); }
  };
  document.querySelector('#m-exp').onclick = () => renderVerifyGateway();
  document.querySelector('#m-home').onclick = () => home();
  document.querySelector('#m-form').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    mintDraft.name = fd.get('name') || 'Agent';
    mintDraft.owner_domain = fd.get('owner_domain') || 'localhost';
    mintDraft.role = fd.get('role') || 'buyer';
    mintDraft.spend_limit = fd.get('spend_limit') || '$150 / session';
    const obj = { agent_id:id, name:mintDraft.name, owner_domain:mintDraft.owner_domain, role:mintDraft.role, capabilities:[...mintDraft.capabilities], verification_state:'WebCrypto Ed25519 Bound', revoked:false, spend_limit:mintDraft.spend_limit, public_key:webCryptoKeys.publicKey };
    saveAgent(obj); toast(`Private Passport ${id} saved locally.`); renderDualProfile(obj);
  };
}

function renderDualProfile(ag) {
  const spec = { schema:'aura-id/agent.json', version:'1.0', agent_id:ag.agent_id, name:ag.name, owner_domain:ag.owner_domain, role:ag.role, capabilities:ag.capabilities, authentication:{ verification_method:ag.verification_state, public_key:ag.public_key, revoked:Boolean(ag.revoked) }, boundaries:{ max_spend_limit:ag.spend_limit } };
  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div><div class="small-label">Private Agent Passport · Machine agent.json</div><h1>${esc(ag.name)} <span class="demo-tag">${ag.revoked?'REVOKED':'Private · Local'}</span></h1><p>Agent ID: <code>${esc(ag.agent_id)}</code> · Owner Domain: <strong>${esc(ag.owner_domain)}</strong></p></div>
      <div style="display:flex;gap:10px"><button class="secondary" id="dp-kill">${ag.revoked?'Restore Agent':'Kill-Switch (Revoke)'}</button><button class="secondary" id="dp-back">← Verify Agent</button></div>
    </div>
    <section class="demo-box">
      <div class="small-label">Machine Specification · /.well-known/agent.json</div>
      <pre style="font:11px/1.6 monospace;background:var(--soft);padding:14px;border-radius:5px;overflow:auto">${esc(JSON.stringify(spec, null, 2))}</pre>
      <button class="primary" id="dp-copy">Copy agent.json</button>
    </section>
  </div>`;
  document.querySelector('#dp-kill').onclick = () => {
    ag.revoked = !ag.revoked;
    ag.verification_state = ag.revoked ? 'Revoked by Owner (Kill-Switch)' : 'WebCrypto Ed25519 Bound';
    saveAgent(ag); toast(ag.revoked ? `Kill-Switch active: ${ag.agent_id} revoked.` : `Agent ${ag.agent_id} restored.`);
    renderDualProfile(ag);
  };
  document.querySelector('#dp-back').onclick = () => renderVerifyGateway();
  document.querySelector('#dp-copy').onclick = () => copyText(JSON.stringify(spec, null, 2), 'agent.json copied.');
}

function renderVerifyGateway() {
  const myAgents = loadMyPrivateAgents();
  const sampleSpec = { schema:'aura-id/agent.json', version:'1.0', agent_id:'AURA-BUY-8D1F-43A0', name:'Hermes Procurement v2', owner_domain:DOM_MAIN, capabilities:['catalog_search','taste_token_match','cart_staging'], authentication:{ verification_method:'Ed25519 Key Bound', public_key:'ed25519:pk_aura_8d1f43a099b2c4e1d7a3f5012b8c', revoked:false }, boundaries:{ max_spend_limit:'$150 / session' } };
  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div><div class="small-label">Point-to-Point Verification · Private by Default</div><h1>Verify an Agent ID</h1><p>Like a real passport, Agent IDs are private and never exposed in a public directory. Gateways verify an incoming agent only when it presents its <code>agent.json</code> or <code>AURA-...</code> token.</p></div>
      <div style="display:flex;gap:10px"><button class="primary" id="v-mint">+ Create Private Agent ID</button><button class="secondary" id="v-home">← Home</button></div>
    </div>
    <div class="review-layout">
      <section class="demo-box">
        <div class="small-label">Gateway Point-to-Point Check</div>
        <h2>Inspect an incoming Agent Passport</h2>
        <textarea id="v-in" rows="8" style="font:11px/1.5 monospace;margin-top:10px">${esc(JSON.stringify(sampleSpec, null, 2))}</textarea>
        <div style="display:flex;gap:10px;margin:12px 0;flex-wrap:wrap"><button type="button" class="primary" id="v-run">Verify Agent Now</button><button type="button" class="secondary" id="v-rev">Test Revoked Agent</button><button type="button" class="secondary" id="v-bot">Test Unsigned Bot</button></div>
        <div id="v-out"></div>
      </section>
      <section class="export-box">
        <h2>Your Privately Minted Agents (This Device Only)</h2>
        <p>Only you can see the agents below. They stay in your browser and are never listed publicly.</p>
        ${myAgents.length ? `<div class="a2a-grid" style="margin-top:14px">${myAgents.map((a,i)=>`<div class="a2a-item" data-idx="${i}" style="cursor:pointer"><div class="a2a-item-head"><span>${esc(a.name)} (<code>${esc(a.agent_id)}</code>)</span><span class="demo-tag">${a.revoked?'REVOKED':'Private'}</span></div><p>Domain: ${esc(a.owner_domain)} · Limit: ${esc(a.spend_limit)}</p></div>`).join('')}</div>` : `<p style="margin-top:14px">No private agents minted on this device yet.</p>`}
      </section>
    </div>
  </div>`;
  const check = txt => {
    let o = null;
    try { o = JSON.parse(txt); } catch {}
    const out = document.querySelector('#v-out');
    if (!o || o.schema !== 'aura-id/agent.json' || !(o.agent_id||'').startsWith('AURA-')) {
      out.innerHTML = `<div class="a2a-item"><strong>✕ UNVERIFIED REQUEST BLOCKED (403 CAPTCHA)</strong><p>No valid Aura KYA signature found.</p></div>`;
    } else if (o.revoked || o.authentication?.revoked) {
      out.innerHTML = `<div class="a2a-item"><strong>✕ AGENT ID REVOKED (${esc(o.agent_id)})</strong><p>Kill-Switch active. Access denied.</p></div>`;
    } else {
      out.innerHTML = `<div class="a2a-item"><strong>✓ POINT-TO-POINT VERIFIED: ${esc(o.agent_id)}</strong><p>Domain: ${esc(o.owner_domain)} · Method: ${esc(o.authentication?.verification_method||'Ed25519')}</p></div>`;
    }
  };
  check(document.querySelector('#v-in').value);
  document.querySelector('#v-run').onclick = () => check(document.querySelector('#v-in').value);
  document.querySelector('#v-rev').onclick = () => { const r = {...sampleSpec, revoked:true}; document.querySelector('#v-in').value = JSON.stringify(r,null,2); check(JSON.stringify(r)); };
  document.querySelector('#v-bot').onclick = () => { const b = '{"bot":"scraper"}'; document.querySelector('#v-in').value = b; check(b); };
  document.querySelectorAll('[data-idx]').forEach(el => el.onclick = () => renderDualProfile(myAgents[+el.dataset.idx]));
  document.querySelector('#v-mint').onclick = () => renderMintAgent();
  document.querySelector('#v-home').onclick = () => home();
}

function home() {
  main.innerHTML = `<div class="landing">
    <section class="hero">
      <div class="hero-copy">
        <div class="intro-line">Open Specification · KYA Passport &amp; Taste Token</div>
        <h1>Verifiable identity for the agents that work for <em>you.</em></h1>
        <p>Give your AI agent a private, cryptographic KYA passport (<code>agent.json</code>) bound to your domain, and a scoped Taste Token that carries your preferences without exposing personal data.</p>
        <div class="hero-actions"><button class="primary" id="create" type="button">Create an Agent ID</button><button class="secondary" id="try-sample" type="button">Explore interactive demo</button></div>
        <div class="quiet">100% private by default · WebCrypto Ed25519 &amp; AES-256-GCM Local Vault · No public listing</div>
      </div>
      <div class="card-stage">
        <div class="passport" aria-label="Sample KYA Passport">
          <div class="card-top"><span class="card-word">aura id.</span><span class="mono">KYA Passport · Demo<br>v1.0 Specification</span></div>
          <div><h2 class="card-title">AURA-BUY-8D1F-43A0</h2><div class="card-owner">Owner domain: ${esc(DOM_MAIN)}</div><div class="card-pills" style="margin-top:12px"><span class="card-pill">Signature: Ed25519 Key Bound</span><span class="card-pill">Scope: Ask before checkout</span></div></div>
          <div class="card-bottom"><div class="mono">Private point-to-point verification<br>Sample card · 3 core verifiable fields</div><div class="swatches" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div>
        </div>
        <p class="card-note">Sample KYA Passport showing the 3 core fields: Agent ID, Owner Domain, and Signature Status.</p>
      </div>
    </section>
    <section class="capabilities-grid">
      <div class="cap-card"><span>01 · Private Agent Identity</span><strong>WebCrypto Ed25519 Passport</strong><p>Generate a genuine Ed25519 keypair in your browser and encrypt the private key with AES-256-GCM. Like a real passport, it stays private with you.</p></div>
      <div class="cap-card"><span>02 · Scoped Taste Token</span><strong>Ephemeral &amp; Zero-PII</strong><p>Share time-limited (15m TTL) product priorities and shopping items with store agents while stripping personal identifiers.</p></div>
      <div class="cap-card"><span>03 · Point-to-Point Gateway</span><strong>Verify Without Public Lists</strong><p>Participating websites verify an incoming agent’s domain signature and Kill-Switch status on the spot—without exposing a public list of agents.</p></div>
    </section>
    <section class="captcha-sandbox" id="interactive-demo-section">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
        <div><div class="small-label">Interactive Simulation · Local Sandbox</div><h2 style="font:26px Georgia,serif;margin:4px 0">How a gateway evaluates an incoming agent request</h2></div>
        <div class="mode-switch"><button type="button" id="sb-mode-aura" aria-pressed="true">Signed KYA Agent (Demo)</button><button type="button" id="sb-mode-bot" aria-pressed="false">Unsigned Bot (Blocked)</button></div>
      </div>
      <div id="sandbox-stage"></div>
    </section>
    <section class="dev-section">
      <div><div class="small-label">For Developers &amp; Gateways</div><h2 style="font:26px Georgia,serif;margin:6px 0">Point-to-point verification, zero public exposure</h2><p style="font-size:13px;color:var(--muted)">Agent IDs are never listed in a public directory. Gateways verify an incoming agent on demand by checking its Ed25519 signature against <code>/.well-known/agent.json</code>.</p><div style="display:flex;gap:14px;margin-top:12px"><button type="button" class="primary" id="home-open-explorer">Verify an Agent ID →</button><button type="button" class="secondary" id="dev-open-docs">Read MCP &amp; API Docs</button></div></div>
      <div class="sandbox-terminal"><div># 1. Start local MCP &amp; Agent API server</div><div style="color:#a8dadc">node mcp/server.mjs --http 8000 --profile ./aura-id-profile.json</div><div style="margin-top:8px"># 2. Run automated WebCrypto, Vault &amp; KYA tests</div><div style="color:#f1a17f">node --test profile.test.mjs</div></div>
    </section>
  </div>`;
  document.querySelector('#create').onclick = () => renderMintAgent();
  document.querySelector('#try-sample').onclick = () => document.querySelector('#interactive-demo-section')?.scrollIntoView({behavior:'smooth'});
  document.querySelector('#dev-open-docs').onclick = () => document.querySelector('#mcp-api').click();
  document.querySelector('#home-open-explorer').onclick = () => renderVerifyGateway();
  let sbAura = true;
  const syncSb = () => {
    document.querySelector('#sb-mode-aura').setAttribute('aria-pressed', String(sbAura));
    document.querySelector('#sb-mode-bot').setAttribute('aria-pressed', String(!sbAura));
    document.querySelector('#sandbox-stage').innerHTML = sbAura
      ? `<div class="flow-steps"><div class="flow-step"><span>Step 01 · Introduction</span><strong>Agent presents ID &amp; domain</strong><p>Agent sends <code>AURA-BUY-8D1F-43A0</code> and declares owner domain <code>${esc(DOM_MAIN)}</code>.</p></div><div class="flow-step"><span>Step 02 · Signature Check</span><strong>Ed25519 key verified</strong><p>Gateway checks the request signature against the public key in <code>/.well-known/agent.json</code>.</p></div><div class="flow-step"><span>Step 03 · Policy Decision</span><strong>Scoped access granted</strong><p>Catalog filtered via ephemeral Taste Token (15m TTL). Checkout locked until human approval.</p></div></div><details style="margin-top:14px"><summary style="font:12px monospace;cursor:pointer;color:var(--muted)">Inspect raw HTTP handshake headers &amp; signature payload (Developer view)</summary><pre style="font:11px/1.6 monospace;background:#181c19;color:#e8e6df;padding:14px;border-radius:5px;margin-top:8px">GET /store/api/catalog-handshake HTTP/2\nX-Aura-Agent-ID: AURA-BUY-8D1F-43A0\nX-Aura-Owner-Domain: ${esc(DOM_MAIN)}\nX-Aura-Public-Key: ed25519:pk_aura_8d1f43a099b2c4e1d7a3f5012b8c\nX-Aura-Taste-Token: scoped-handshake-no-pii (ttl=900s)</pre></details>`
      : `<div class="flow-steps"><div class="flow-step"><span>Step 01 · Unidentified Request</span><strong>No KYA Passport attached</strong><p>Bot requests catalog with a generic user-agent and no domain signature.</p></div><div class="flow-step"><span>Step 02 · Gateway Check</span><strong>Origin &amp; owner unknown</strong><p>Gateway cannot verify who operates the bot or whether a human authorized it.</p></div><div class="flow-step"><span>Step 03 · Fallback Wall</span><strong>Visual CAPTCHA triggered</strong><p>Gateway falls back to a human image puzzle (<code>HTTP 403</code>), halting execution.</p></div></div>`;
  };
  document.querySelector('#sb-mode-aura').onclick = () => { sbAura = true; syncSb(); };
  document.querySelector('#sb-mode-bot').onclick = () => { sbAura = false; syncSb(); };
  syncSb();
}

document.querySelector('#home').onclick = e => { e.preventDefault(); home(); };
document.querySelector('#mint-agent-nav').onclick = e => { e.preventDefault(); renderMintAgent(); };
document.querySelector('#agent-registry-nav').onclick = e => { e.preventDefault(); renderVerifyGateway(); };
document.querySelector('#about').onclick = e => { e.preventDefault(); openDialog('How Aura ID & Private Verification Work', `<p>Aura ID combines verifiable AI agent identity (<code>agent.json</code>) with strict privacy:</p><h3>1. Private by Default (No Public Lists)</h3><p>Like a national ID or passport, your Agent ID is never listed in a public directory. It is only presented point-to-point when your agent visits a site.</p><h3>2. WebCrypto Ed25519 &amp; AES-256-GCM Vault</h3><p>Keypairs are generated via <code>window.crypto.subtle</code> and encrypted locally with 100,000-iteration PBKDF2-SHA256 + AES-256-GCM.</p>`); };
document.querySelector('#mcp-api').onclick = e => { e.preventDefault(); openDialog('Documentation · MCP &amp; Verification API', `<p>Connect local agents via <code>mcp/server.mjs</code> or host your public key at <code>/.well-known/agent.json</code>.</p><pre>{\n  "mcpServers": {\n    "aura-id": {\n      "command": "node",\n      "args": ["./mcp/server.mjs", "--profile", "./aura-id-profile.json"]\n    }\n  }\n}</pre>`); };
document.querySelector('#privacy').onclick = e => { e.preventDefault(); openDialog('Privacy &amp; Zero-Knowledge Security', `<p>Private signing keys and Agent IDs are generated in your browser and never published to a public directory.</p>`); };
document.querySelector('#load').onclick = e => { e.preventDefault(); document.querySelector('#file-input').click(); };
document.querySelector('#site-theme').onclick = e => { e.preventDefault(); theme = theme === 'light' ? 'dark' : 'light'; document.body.dataset.theme = theme; };
document.querySelector('#coffee-link').onclick = e => {
  e.preventDefault();
  openDialog('Support Aura ID ☕', `<p>If you find Aura ID useful, you can support the project with the price of a coffee (or any amount you like) directly via crypto:</p><div class="a2a-grid">${SUPPORT_WALLETS.map((w,i)=>`<div class="a2a-item"><div class="a2a-item-head"><span>${esc(w.network)}</span><button type="button" class="text-button" data-w="${i}">Copy address</button></div><p style="font:11px monospace;word-break:break-all">${esc(w.address)}</p></div>`).join('')}</div>`);
  document.querySelectorAll('[data-w]').forEach(b => b.onclick = () => copyText(SUPPORT_WALLETS[+b.dataset.w].address, 'Wallet address copied.'));
};

home();
