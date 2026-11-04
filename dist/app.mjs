import {
  EMPTY,
  cleanProfile,
  importProfile,
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
  'Taste & shopping', 'Agent National ID', 'Safety rules', 'Your card & export'
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
document.querySelector('#home').onclick = () => home();

function openCryptoSupportModal() {
  openDialog('Support Aura ID ☕', `
    <p>Aura ID is free, open source, and independent—with zero ads or user tracking. Support the open agent identification protocol directly via peer-to-peer crypto:</p>
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

document.querySelector('#coffee-link').onclick = openCryptoSupportModal;
const topCoffeeBtn = document.querySelector('#top-coffee-btn');
if (topCoffeeBtn) topCoffeeBtn.onclick = openCryptoSupportModal;

function renderAgentPortal() {
  view = 'agent_portal';
  if (!p.agent_name && !p.name) {
    p = cleanProfile({
      ...p,
      name: 'Souleria',
      agent_name: 'Hermes Buyer',
      agent_role: 'buyer',
      agent_model: 'Claude 3.5 Sonnet',
      agent_trust: 'verified',
      agent_spend_limit: '$150 / session',
      priority: 'quality',
      actions: 'ask'
    });
  }
  const curPassport = createAgentPassport(p);
  const ver = verifyAgentPassport(curPassport);

  main.innerHTML = `<div class="review">
    <div class="review-head">
      <div>
        <div class="small-label">Universal Agent National ID Registry · Post-CAPTCHA Standard</div>
        <h1>Agent Profile &amp; National ID.</h1>
        <p>Issue an official Machine Passport for your AI agent, or verify an incoming agent’s National ID to grant instant, CAPTCHA-free access.</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="secondary" id="portal-to-human">Human Taste Studio</button>
        <button class="secondary" id="portal-home">← Home</button>
      </div>
    </div>
    <div class="review-layout">
      <div>
        <div id="portal-live-card">${passport(p)}</div>
        <p class="card-note">Live Agent National ID Card · Updates immediately as you edit below.</p>
        <form id="agent-portal-form" style="margin-top:22px;border-top:1px solid var(--line);padding-top:20px">
          <div class="field-block">
            <label class="field"><span>1. Agent Name</span><input type="text" name="agent_name" value="${esc(p.agent_name)}" maxlength="80" placeholder="e.g., Hermes Buyer, Atlas Researcher"></label>
          </div>
          <div class="field-block">
            <label class="field"><span>2. Human Sponsor / Owner Name (Hashed in public passport)</span><input type="text" name="name" value="${esc(p.name)}" maxlength="80" placeholder="Your name or handle"></label>
          </div>
          <fieldset style="border:0;padding:0;margin:0 0 18px">
            <legend class="section-label">3. Agent Role &amp; Specialization</legend>
            <div class="radio-inline">
              ${choice('agent_role', 'buyer', 'Buyer / Shopping')}
              ${choice('agent_role', 'researcher', 'Researcher')}
              ${choice('agent_role', 'personal_assistant', 'Assistant')}
              ${choice('agent_role', 'coder', 'Coder')}
            </div>
          </fieldset>
          <fieldset style="border:0;padding:0;margin:0 0 18px">
            <legend class="section-label">4. Verification &amp; Trust Tier</legend>
            <div class="radio-inline">
              ${choice('agent_trust', 'verified', 'Verified (Owner-bound)')}
              ${choice('agent_trust', 'supervised', 'Supervised')}
              ${choice('agent_trust', 'sandboxed', 'Sandboxed (Read-only)')}
            </div>
          </fieldset>
          ${fieldWithChips('agent_model', '5. AI Model / Engine', 'e.g., Claude 3.5 Sonnet, GPT-4o', false, 80)}
          ${fieldWithChips('agent_spend_limit', '6. Max Autonomous Spend Limit', 'e.g., $150 / session', false, 60)}
          <div class="export-actions" style="margin-top:18px">
            <button type="button" class="primary" id="portal-copy-passport">Copy Agent Passport JSON</button>
            <button type="button" class="secondary" id="portal-copy-link">Copy Agent ID Link</button>
            <button type="button" class="secondary" id="portal-download-passport">Download .json</button>
          </div>
        </form>
      </div>
      <div>
        <section class="demo-box">
          <div class="small-label">Post-CAPTCHA Gateway Verifier</div>
          <h2>Verify an Agent ID (CAPTCHA Replacement)</h2>
          <p class="prompt">Websites and stores use this check to verify whether an incoming bot holds a valid Aura Agent National ID instead of showing image CAPTCHAs.</p>
          <label class="field" style="margin-top:14px">
            <span>Paste an Agent National ID (<code>AURA-...</code>) or full Agent Passport JSON</span>
            <textarea id="verify-input" rows="6" style="font:11px/1.5 'Courier New',monospace">${esc(JSON.stringify(curPassport, null, 2))}</textarea>
          </label>
          <div style="display:flex;gap:10px;margin:12px 0 16px;flex-wrap:wrap">
            <button type="button" class="primary" id="run-verify-btn">Verify Agent ID Now</button>
            <button type="button" class="secondary" id="load-unverified-bot">Test Unregistered Bot (Fail Demo)</button>
          </div>
          <div id="verify-result-box"></div>
        </section>
        <section class="export-box">
          <h2>Why Agent National IDs Replace CAPTCHA</h2>
          <p>CAPTCHAs were built to block all machines. In the agentic web, legitimate AI agents work on behalf of real people. Aura ID gives every agent a verifiable identity card containing:</p>
          <div class="agent-meta-grid">
            <div class="agent-meta-card"><strong>National ID</strong><span id="meta-id">${esc(curPassport.agent.id)}</span></div>
            <div class="agent-meta-card"><strong>CAPTCHA Bypass</strong><span id="meta-bypass">${ver.captcha_bypass_granted ? 'GRANTED ✓' : 'REQUIRES APPROVAL'}</span></div>
            <div class="agent-meta-card"><strong>Trust Score</strong><span id="meta-score">${esc(ver.trust_score)}</span></div>
            <div class="agent-meta-card"><strong>Spend Authority</strong><span id="meta-limit">${esc(ver.spending_limit)}</span></div>
          </div>
          <p class="note"> linked to your human Taste Token so store agents know both <em>who the agent is</em> and <em>what you like to buy</em>.</p>
        </section>
      </div>
    </div>
  </div>`;

  function renderVerifyResult(inputStr) {
    const box = document.querySelector('#verify-result-box');
    if (!box) return;
    let parsed = null;
    const trimmed = (inputStr || '').trim();
    if (trimmed.startsWith('AURA-')) {
      parsed = {
        schema: 'aura-id/agent-passport',
        agent: { id: trimmed, name: 'Registered Aura Agent', owner_pseudonym: 'verified-owner' },
        auth: { trust_tier: 'verified' },
        boundaries: { spending_limit: p.agent_spend_limit || '$150 / session' }
      };
    } else {
      try { parsed = JSON.parse(trimmed); } catch {}
    }
    const res = verifyAgentPassport(parsed);
    if (res.verified) {
      box.innerHTML = `<div class="a2a-item" style="border-left:3px solid var(--accent)">
        <div class="a2a-item-head"><span>✓ VALID AGENT NATIONAL ID: ${esc(res.agent_id)}</span><span style="color:var(--accent)">${res.captcha_bypass_granted ? 'CAPTCHA BYPASSED' : 'SUPERVISED'}</span></div>
        <p><strong>Trust Tier:</strong> ${esc(res.trust_tier.toUpperCase())} · <strong>Score:</strong> ${esc(res.trust_score)} · <strong>Owner Proof:</strong> ${esc(res.owner)}</p>
        <div class="a2a-reason">Authorized up to ${esc(res.spending_limit)} · Human Taste Token attached</div>
      </div>`;
    } else {
      box.innerHTML = `<div class="a2a-item" style="border-left:3px solid var(--ink)">
        <div class="a2a-item-head"><span>✕ UNVERIFIED BOT BLOCKED</span><span>CAPTCHA REQUIRED</span></div>
        <p>Reason: ${esc(res.reason)}. This bot has no valid Aura Agent National ID and must complete a human challenge.</p>
      </div>`;
    }
  }

  renderVerifyResult(document.querySelector('#verify-input').value);

  const form = document.querySelector('#agent-portal-form');
  const syncPortal = () => {
    const data = new FormData(form);
    for (const k of ['agent_name', 'name', 'agent_role', 'agent_trust', 'agent_model', 'agent_spend_limit']) {
      if (data.has(k)) p[k] = data.get(k);
    }
    p.agent_id = generateDeterministicAgentId(p.name || p.agent_name, p.agent_role || 'buyer');
    p = cleanProfile(p);
    const nextPass = createAgentPassport(p);
    const nextVer = verifyAgentPassport(nextPass);
    document.querySelector('#portal-live-card').innerHTML = passport(p);
    document.querySelector('#verify-input').value = JSON.stringify(nextPass, null, 2);
    document.querySelector('#meta-id').textContent = nextPass.agent.id;
    document.querySelector('#meta-bypass').textContent = nextVer.captcha_bypass_granted ? 'GRANTED ✓' : 'REQUIRES APPROVAL';
    document.querySelector('#meta-score').textContent = nextVer.trust_score;
    document.querySelector('#meta-limit').textContent = nextVer.spending_limit;
    renderVerifyResult(JSON.stringify(nextPass, null, 2));
    tilt();
  };
  form.addEventListener('input', syncPortal);
  form.addEventListener('change', syncPortal);

  document.querySelectorAll('[data-chip-field]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.chipField;
      const val = btn.dataset.chipVal;
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = val;
        syncPortal();
      }
    };
  });

  document.querySelector('#run-verify-btn').onclick = () => {
    renderVerifyResult(document.querySelector('#verify-input').value);
    toast('Agent National ID verification complete.');
  };
  document.querySelector('#load-unverified-bot').onclick = () => {
    const fake = JSON.stringify({ schema: 'unknown-scraper', agent: { id: 'BOT-999' } }, null, 2);
    document.querySelector('#verify-input').value = fake;
    renderVerifyResult(fake);
  };
  document.querySelector('#portal-copy-passport').onclick = () => copyText(JSON.stringify(createAgentPassport(p), null, 2), 'Agent Passport JSON copied!');
  document.querySelector('#portal-copy-link').onclick = () => copyText(encodeShareUrl(p), 'Shareable Agent National ID link copied!');
  document.querySelector('#portal-download-passport').onclick = () => download(JSON.stringify(createAgentPassport(p), null, 2), 'aura-agent-passport.json', 'application/json');
  document.querySelector('#portal-to-human').onclick = () => go(1);
  document.querySelector('#portal-home').onclick = () => home();
  tilt();
}

document.querySelector('#agent-registry-nav').onclick = () => renderAgentPortal();

document.querySelector('#about').onclick = () => openDialog('What is Aura ID, and how does it work?', `
  <p>Aura ID is the open standard for both human users and autonomous AI agents in the post-UI, post-CAPTCHA web.</p>
  <h3>1. Human Taste Token</h3>
  <p>Set your communication style, material taste, sizes, and active shopping list once. Use it across ChatGPT, Claude, and Gemini.</p>
  <h3>2. Agent National ID (Machine Passport)</h3>
  <p>Assign your autonomous agent its own official Agent National ID (e.g. <code>AURA-BUY-4A2F-9C10</code>). When websites retire legacy CAPTCHAs, this verifiable passport proves legitimate human sponsorship, spend boundaries, and taste context without exposing your real identity.</p>
  <h3>3. Zero Server Dependency</h3>
  <p>Everything runs 100% in your browser and on local MCP servers. Safe, private, and peer-to-peer.</p>
`);

document.querySelector('#mcp-api').onclick = () => {
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

document.querySelector('#privacy').onclick = () => openDialog('Your data & privacy', `
  <p>Everything you enter stays inside your browser. No account sign-up, tracking database, or third-party cookies.</p>
  <p>When your agent presents its <strong>Agent Passport &amp; Taste Token</strong> to an external store, all personal identifiers (real name, employer, raw prompts) remain encrypted and unexposed. Only the Agent National ID, trust tier, spending limit, and taste vector are exchanged.</p>
`);

document.querySelector('#site-theme').onclick = () => {
  theme = theme === 'light' ? 'dark' : 'light';
  document.body.dataset.theme = theme;
  document.querySelector('#site-theme').setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
};
document.querySelector('#load').onclick = () => openLoad();

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

  return `<div class="passport" data-surface="${esc(surface)}" data-priority="${esc(priorityAttr)}" data-density="${esc(densityAttr)}" aria-label="${example ? 'Example Agent Passport' : 'Your live Agent National ID'}">
    <div class="card-top">
      <span class="card-word">aura id.</span>
      <span class="mono">${example ? 'Official Agent ID' : 'Agent National ID'}<br>${esc(agentId)}</span>
    </div>
    <div>
      <h2 class="card-title">${esc(archetype(profile))}</h2>
      <div class="card-owner">${esc(ownerParts)}</div>
      <div class="agent-id-badge"><span>NATIONAL AGENT ID:</span> <b>${esc(agentId)}</b></div>
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
        When legacy CAPTCHAs disappear, how will websites verify legitimate agents? Aura ID issues an official <b>Agent National ID</b> and <b>Taste Token</b> so your autonomous agents can identify, authenticate, and shop safely across the internet.
      </div>
      <div class="explainer-steps">
        <div class="explainer-step"><span>01 · Identity</span><b>Agent National ID</b>Every agent gets a unique machine passport (e.g. <code>AURA-BUY-...</code>) with verified human ownership.</div>
        <div class="explainer-step"><span>02 · Taste</span><b>Taste Token &amp; Needs</b>Carries your personal style, sizes, and active shopping list without exposing private PII.</div>
        <div class="explainer-step"><span>03 · Post-CAPTCHA</span><b>Zero-Friction Access</b>Stores and platforms verify trust score and spend limits instead of showing CAPTCHA puzzles.</div>
      </div>
    </aside>
    <div class="intro-line">Universal Machine Passport &amp; Taste Token for the Agentic Web.</div>
    <section class="hero">
      <div class="hero-copy">
        <h1>An official National ID<br>for your <em>AI Agents.</em></h1>
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
        <p class="card-note">Live Agent National ID Card. Updates in real time as you adjust preferences.</p>
      </div>
    </section>
    <div class="hero-under">
      <p>The first open specification defining individual Agent National IDs, post-CAPTCHA machine authentication, and portable shopping taste graphs.</p>
      <div class="under-items">
        <div><strong>Agent National ID</strong>Individual identity &amp; trust tier</div>
        <div><strong>Post-CAPTCHA</strong>Replaces puzzles with verified tokens</div>
        <div><strong>Agent-to-Agent</strong>Handshakes taste and active shopping needs</div>
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
    openDialog('What an Agent National ID carries', `
      ${passport(sample, { example: true })}
      <p>“Agent ID <code>AURA-BUY-8D1F-43A0</code> (Hermes Buyer) sponsored by Alex Rivera. Verified Trust Tier. Max spending limit: $150 / session. Boundaries: ask approval before external payments.”</p>
      <div class="hero-actions"><button class="primary" id="example-create">Use this Agent ID</button></div>
    `);
    document.querySelector('#example-create').onclick = () => {
      dialog.close(); p = cleanProfile(sample); go(FINAL_STEP); toast('Example profile loaded.');
    };
  };
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
  ].map(([a, b]) => `<div class="summary-row"><span>${a}</span><span>${esc(b)}</span></div>`).join('')}</div><p class="note">Every change immediately updates your Agent National ID and machine passport.</p>`;
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
      return `<h1>Build your Identity &amp;<br>Agent National ID</h1><p class="description">Create a portable AI profile, define your taste graph, and register an official National ID for your autonomous agent. Tap ready tags or quick choices.</p><div class="method"><button id="quick"><span class="method-num">01</span><strong>Build step-by-step (Recommended)</strong><small>Create your profile, Taste Token, and Agent National ID in 2 minutes.</small></button><button id="paste"><span class="method-num">02</span><strong>Bring existing custom instructions</strong><small>Paste prompt rules you already give to ChatGPT, Claude, or Cursor.</small></button><button id="import-start"><span class="method-num">03</span><strong>Open existing profile or Agent Passport</strong><small>Import JSON or resume draft saved in this browser.</small></button></div>`;
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
      return `<h1>Agent National ID &amp;<br>Machine Passport</h1><p class="description">Just like humans have a National ID, each autonomous agent receives a unique cryptographic identifier on Aura ID. Replaces CAPTCHAs on agentic websites.</p><form id="profile-form"><div class="agent-id-badge" style="margin-bottom:18px;display:inline-block"><span>ASSIGNED NATIONAL AGENT ID:</span> <b>${esc(curAgentId)}</b></div>${fieldWithChips('agent_name', '1. Agent Name', 'e.g., Hermes Buyer, Sentinel Research, Atlas Coder', false, 80)}<fieldset style="border:0;padding:0;margin:0"><legend class="section-label">2. Agent Role &amp; Mission</legend><div class="choice-list">${choice('agent_role', 'buyer', 'Procurement & Shopping Agent', 'Searches catalogs, matches Taste Tokens, and stages shopping carts.')}${choice('agent_role', 'researcher', 'Autonomous Research Agent', 'Extracts information, analyzes whitepapers, and synthesizes data.')}${choice('agent_role', 'personal_assistant', 'Executive AI Secretary', 'Schedules, drafts emails, and handles coordination.')}</div></fieldset>${fieldWithChips('agent_model', '3. Underlying AI Model / Runtime', 'e.g., Claude 3.5 Sonnet, GPT-4o, Local Llama', false, 80)}${fieldWithChips('agent_spend_limit', '4. Autonomous Spend Limit (Boundaries)', 'e.g., $150 / session, $50 / day, $0 (Browse only)', false, 60)}${actions()}</form>`;
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
        <div class="small-label">Step 9 of 9 · Your Agent National ID &amp; Machine Passport</div>
        <h1>${selected ? 'Your Agent Passport is ready.' : 'Your card is still blank.'}</h1>
        <p>${selected ? 'Test the post-CAPTCHA gate below, or export your Agent National ID and Taste Token.' : 'Go back and tap a few quick choices or load the example profile.'}</p>
      </div>
      <button class="secondary" id="back-builder">← Edit steps</button>
    </div>
    <div class="review-layout">
      <div>
        ${passport(p)}
        <p class="card-note">Official Agent National ID Card. Click “Edit” on any section below to update live.</p>
        ${section('Agent National ID', 6, [
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
          <label class="scope"><input type="checkbox" id="scope-agent" ${scope.agent ? 'checked' : ''}><span>Agent National ID &amp; Machine Passport<small>Cryptographic Agent ID, trust tier, model class, and spend limits.</small></span></label>
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
            <summary>Preview exact output (<span id="preview-kind">${previewFormat === 'passport' ? 'Agent National ID Passport JSON' : previewFormat === 'token' ? 'Scoped Taste Token JSON' : 'Markdown prompt'}</span>)</summary>
            <div style="margin:6px 0 10px;display:flex;gap:14px;flex-wrap:wrap">
              <button type="button" class="text-button" id="show-passport-preview">Agent National ID (JSON)</button>
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
    copyText(JSON.stringify(createAgentPassport(p), null, 2), 'Agent National ID Passport copied!');
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
      compareBtn.textContent = 'Verify with Agent National ID';
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
      noteEl.textContent = `Aura ID serves as the National ID for agents: websites verify the cryptographic sponsor and spend limits, granting immediate access.`;
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
    previewFormat === 'passport' ? 'Agent National ID Passport JSON'
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
