export const OPTIONS = {
  length: ['brief', 'balanced', 'detailed'],
  tone: ['direct', 'conversational', 'formal'],
  evidence: ['sources', 'when-needed', 'unspecified'],
  challenge: ['challenge', 'gentle', 'unspecified'],
  theme: ['light', 'dark', 'system'],
  density: ['focused', 'compact', 'unspecified'],
  motion: ['reduced', 'subtle', 'unspecified'],
  priority: ['quality', 'value', 'minimal', 'unspecified'],
  actions: ['ask', 'draft-only'],
  agent_role: ['buyer', 'researcher', 'personal_assistant', 'coder', 'negotiator', 'general', ''],
  agent_trust: ['verified', 'supervised', 'sandboxed', 'restricted'],
};

export const EMPTY = () => ({
  name: '', role: '', goal: '', instructions: '', language: '',
  length: null, tone: null, evidence: null, challenge: null,
  theme: null, density: null, motion: null,
  priority: null, taste: '', constraints: '', needs: '',
  actions: null, avoid: '',
  // Agent Identification & Machine Passport
  agent_id: '',
  agent_name: '',
  agent_role: '',
  agent_model: '',
  agent_owner: '',
  agent_trust: null,
  agent_public_key: '',
  agent_spend_limit: '',
});

const LIMITS = {
  name: 80, role: 180, goal: 1200, instructions: 10000, language: 80,
  taste: 600, constraints: 600, needs: 1200, avoid: 1200,
  agent_id: 60, agent_name: 80, agent_role: 40, agent_model: 80,
  agent_owner: 100, agent_public_key: 120, agent_spend_limit: 60,
};

export function parseNeeds(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/\r?\n|;/)
    .map(s => s.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 25);
}

export function generateDeterministicAgentId(ownerName, role = 'buyer') {
  const seed = `${ownerName || 'aura'}-${role || 'agent'}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const roleCode = (role || 'AGT').slice(0, 3).toUpperCase();
  return `AURA-${roleCode}-${hex.slice(0, 4)}-${hex.slice(4)}`;
}

export function cleanProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Choose a valid Aura ID JSON profile.');
  }
  const p = EMPTY();
  for (const [key, max] of Object.entries(LIMITS)) {
    if (value[key] != null && typeof value[key] !== 'string') {
      throw new Error(`The ${key} field must be text.`);
    }
    p[key] = (value[key] != null ? String(value[key]) : '').slice(0, max);
  }
  for (const [key, values] of Object.entries(OPTIONS)) {
    if (value[key] != null && value[key] !== '' && !values.includes(value[key])) {
      throw new Error(`Unsupported ${key} preference.`);
    }
    if (value[key] !== undefined) {
      if (value[key] === '' && key !== 'agent_role') {
        p[key] = null;
      } else {
        p[key] = value[key] ?? null;
      }
    }
  }
  return p;
}

export function importProfile(text) {
  if (typeof text !== 'string' || text.length > 100000) {
    throw new Error('This file is too large. Use a profile smaller than 100 KB.');
  }
  let v;
  try {
    v = JSON.parse(text);
  } catch {
    throw new Error('This is not valid JSON. Choose an exported Aura ID file.');
  }
  if (!v || typeof v !== 'object') {
    throw new Error('This file uses an unsupported profile format.');
  }
  if (v.schema === 'aura-id/agent-passport' && (v.version === '0.1' || v.version === '0.2' || v.version === '1.0')) {
    const ag = v.agent || {};
    const auth = v.auth || {};
    const tv = v.taste_vector || {};
    const activeNeeds = Array.isArray(v.active_needs) ? v.active_needs.join('\n') : '';
    return cleanProfile({
      agent_id: ag.id || '',
      agent_name: ag.name || '',
      agent_role: ag.role || 'buyer',
      agent_model: ag.model_class || '',
      agent_owner: ag.owner_pseudonym || '',
      agent_trust: auth.trust_tier || 'verified',
      agent_public_key: auth.public_key || '',
      agent_spend_limit: v.boundaries?.spending_limit || '',
      priority: tv.priority ?? null,
      taste: tv.aesthetics ?? '',
      constraints: tv.constraints ?? '',
      avoid: tv.avoid ?? '',
      needs: activeNeeds,
      actions: v.boundaries?.actions ?? null,
    });
  }
  if (v.schema === 'aura-id/taste-token' && (v.version === '0.1' || v.version === '0.2')) {
    const tv = v.taste_vector || {};
    const pr = v.presentation || {};
    const bd = v.boundaries || {};
    const ag = v.agent || {};
    const activeNeeds = Array.isArray(v.active_needs) ? v.active_needs.join('\n') : '';
    return cleanProfile({
      priority: tv.priority ?? null,
      taste: tv.aesthetics ?? '',
      constraints: tv.constraints ?? '',
      avoid: tv.avoid ?? '',
      needs: activeNeeds,
      length: pr.length ?? null,
      tone: pr.tone ?? null,
      evidence: pr.evidence ?? null,
      challenge: pr.challenge ?? null,
      theme: pr.theme ?? null,
      density: pr.density ?? null,
      motion: pr.motion ?? null,
      actions: bd.actions ?? null,
      agent_id: ag.id || '',
      agent_name: ag.name || '',
      agent_role: ag.role || '',
    });
  }
  if (v.schema !== 'aura-id/profile' || (v.version !== '0.1' && v.version !== '0.2')) {
    throw new Error('This file uses an unsupported profile format.');
  }
  return cleanProfile(v.preferences);
}

export function createExport(profile, scopes = {}, date = new Date().toISOString()) {
  const clean = cleanProfile(profile);
  const preferences = {};
  const normalizedScopes = {
    context: Boolean(scopes.context),
    communication: Boolean(scopes.communication),
    visual: Boolean(scopes.visual),
    taste: Boolean(scopes.taste),
    agent: Boolean(scopes.agent),
  };
  const groups = {
    context: ['name', 'role', 'goal', 'language', 'instructions'],
    communication: ['length', 'tone', 'evidence', 'challenge', 'avoid'],
    visual: ['theme', 'density', 'motion'],
    taste: ['priority', 'taste', 'constraints', 'needs'],
    agent: ['agent_id', 'agent_name', 'agent_role', 'agent_model', 'agent_owner', 'agent_trust', 'agent_spend_limit'],
  };
  for (const [scope, fields] of Object.entries(groups)) {
    if (normalizedScopes[scope]) {
      for (const f of fields) {
        if (clean[f] !== null && clean[f] !== '') preferences[f] = clean[f];
      }
    }
  }
  if (clean.actions) preferences.actions = clean.actions;
  return {
    schema: 'aura-id/profile',
    version: '0.2',
    exported_at: date,
    purpose: 'User & Agent context, taste token, and machine verification passport. Not human biometric identity.',
    provenance: 'Explicit user entries, cryptographic agent passport, and taste graph.',
    preferences,
  };
}

export function createAgentPassport(profile, options = {}, date = new Date().toISOString()) {
  const clean = cleanProfile(profile);
  const agentId = clean.agent_id || generateDeterministicAgentId(clean.name || clean.agent_name, clean.agent_role || 'buyer');
  const domain = typeof options.domain === 'string' && options.domain.trim() ? options.domain.trim().slice(0, 40) : 'universal-agentic-web';

  return {
    schema: 'aura-id/agent-passport',
    version: '1.0',
    protocol: 'Aura-Agent-Verification/v1',
    issued_at: date,
    purpose: 'Universal National ID for AI Agents — Post-CAPTCHA machine authentication & taste handshake',
    agent: {
      id: agentId,
      name: clean.agent_name || 'Autonomous Agent',
      role: clean.agent_role || 'buyer',
      model_class: clean.agent_model || 'Claude 3.5 / GPT-4o Class',
      owner_pseudonym: clean.agent_owner ? `hash-${clean.agent_owner.length}` : clean.name ? `owner-${clean.name.length}` : 'self-sovereign',
    },
    auth: {
      trust_tier: clean.agent_trust || 'verified',
      verification_method: 'proof-of-owner-bound-token',
      public_key: clean.agent_public_key || `ed25519-aura-${agentId.slice(5).toLowerCase()}`,
      replaces_captcha: true,
      anti_sybil_score: '0.98/1.0',
    },
    taste_vector: {
      priority: clean.priority || 'quality',
      aesthetics: clean.taste || 'unspecified',
      constraints: clean.constraints || 'unspecified',
      avoid: clean.avoid || 'unspecified',
    },
    active_needs: parseNeeds(clean.needs),
    boundaries: {
      actions: clean.actions || 'ask',
      spending_limit: clean.agent_spend_limit || '$150 / session',
      human_approval_required: clean.actions !== 'draft-only' ? 'before_final_checkout' : 'always',
      authority_scope: 'read_catalog_and_stage_cart',
    },
    registry: {
      network: 'Aura Universal Agent Directory',
      verification_endpoint: 'https://souleria.github.io/aura-id/.well-known/agent-verification.json',
    },
  };
}

export function verifyAgentPassport(passport) {
  if (!passport || typeof passport !== 'object') {
    return { verified: false, reason: 'Invalid passport payload' };
  }
  if (passport.schema !== 'aura-id/agent-passport') {
    return { verified: false, reason: 'Unsupported schema' };
  }
  const id = passport.agent?.id || '';
  if (!id.startsWith('AURA-')) {
    return { verified: false, reason: 'Malformed Agent National ID' };
  }
  const trust = passport.auth?.trust_tier || 'restricted';
  const score = trust === 'verified' ? 98 : trust === 'supervised' ? 85 : 50;
  return {
    verified: true,
    agent_id: id,
    trust_tier: trust,
    captcha_bypass_granted: trust === 'verified' || trust === 'supervised',
    trust_score: `${score}/100`,
    owner: passport.agent?.owner_pseudonym || 'anonymous',
    spending_limit: passport.boundaries?.spending_limit || '$0',
  };
}

export function createTasteToken(profile, options = {}, date = new Date().toISOString()) {
  const clean = cleanProfile(profile);
  const includeNeeds = options.includeNeeds !== false;
  const includeVisual = options.includeVisual !== false;
  const domain = typeof options.domain === 'string' && options.domain.trim() ? options.domain.trim().slice(0, 40) : 'commerce-and-agents';

  const taste_vector = {};
  if (clean.priority && clean.priority !== 'unspecified') taste_vector.priority = clean.priority;
  if (clean.taste) taste_vector.aesthetics = clean.taste;
  if (clean.constraints) taste_vector.constraints = clean.constraints;
  if (clean.avoid) taste_vector.avoid = clean.avoid;

  const presentation = {};
  for (const k of ['length', 'tone', 'evidence', 'challenge']) {
    if (clean[k] && clean[k] !== 'unspecified') presentation[k] = clean[k];
  }
  if (includeVisual) {
    for (const k of ['theme', 'density', 'motion']) {
      if (clean[k] && clean[k] !== 'unspecified') presentation[k] = clean[k];
    }
  }

  const active_needs = includeNeeds ? parseNeeds(clean.needs) : [];
  const safeAgentName = clean.agent_name && (!clean.name || !clean.agent_name.includes(clean.name)) ? clean.agent_name : 'Autonomous Agent';

  return {
    schema: 'aura-id/taste-token',
    version: '0.2',
    issued_at: date,
    domain,
    privacy: 'scoped-handshake-no-pii',
    agent: {
      id: clean.agent_id || generateDeterministicAgentId('aura', clean.agent_role || 'buyer'),
      name: safeAgentName,
      role: clean.agent_role || 'buyer',
    },
    taste_vector,
    active_needs,
    presentation,
    boundaries: {
      actions: clean.actions || 'ask',
      spending_limit: clean.agent_spend_limit || '$150 / session',
      authority: 'none',
    },
  };
}

const RULES = {
  brief: 'Start with a concise answer. Expand when I ask.',
  balanced: 'Start with the answer, then include the key explanation.',
  detailed: 'Give a detailed explanation with steps and relevant examples.',
  direct: 'Use a direct, straightforward tone.',
  conversational: 'Use a friendly, conversational tone.',
  formal: 'Use a professional, formal tone.',
  sources: 'Cite reliable sources for factual claims. Distinguish assumptions from verified facts.',
  'when-needed': 'Provide sources when the subject needs verification or I request them.',
  challenge: 'Challenge weak assumptions and explain practical alternatives.',
  gentle: 'Flag weaknesses constructively and explain how to improve the idea.',
  light: 'Prefer a light interface when supported.',
  dark: 'Prefer a dark interface when supported.',
  system: 'Follow my device theme when supported.',
  focused: 'Show the essentials first, with detail available on request.',
  compact: 'Prefer compact layouts and structured comparisons.',
  reduced: 'Avoid nonessential animation and autoplay.',
  subtle: 'Keep animation subtle; do not autoplay media.',
  quality: 'When recommending products or tools, prioritize durable materials, repairability, and long-term craft.',
  value: 'When recommending products or tools, prioritize proven utility, clear specifications, and fair price-to-performance.',
  minimal: 'When recommending products or tools, prioritize quiet design, minimal visual noise, and essential function.',
  ask: 'Ask for my explicit approval before sending messages, making purchases, deleting data, or publishing.',
  'draft-only': 'Prepare drafts and recommendations only. Do not execute external actions.',
};

export function asMarkdown(v) {
  const p = v.preferences || {};
  const lines = [
    '# My AI & Agent Profile (Aura ID)',
    '',
    '> User-provided preferences and Agent National ID token.',
    '',
    'Apply where supported and relevant to the current task. Follow current explicit instructions and applicable system rules. Ask when preferences conflict.',
    '',
  ];
  if (p.agent_id) {
    lines.push(
      '## Agent National ID & Verification',
      `- Agent National ID: \`${p.agent_id}\``,
      `- Agent Name / Role: ${p.agent_name || 'Agent'} (${p.agent_role || 'buyer'})`,
      `- Trust Tier: ${p.agent_trust || 'verified'}`,
      `- Spending Limit: ${p.agent_spend_limit || '$150 / session'}`,
      ''
    );
  }
  for (const [key, label] of [
    ['name', 'Preferred name'],
    ['role', 'Working context'],
    ['goal', 'Current goal'],
    ['language', 'Preferred language'],
  ]) {
    if (p[key]) lines.push(`${label}: ${p[key]}`, '');
  }
  const rules = Object.entries(p)
    .filter(([k, val]) => OPTIONS[k] && RULES[val])
    .map(([, val]) => `- ${RULES[val]}`);
  if (rules.length) lines.push('## Preferences', '', ...rules, '');
  if (p.taste || p.constraints) {
    lines.push('## Taste & material constraints', '');
    if (p.taste) lines.push(`- Aesthetic & product taste: ${p.taste}`);
    if (p.constraints) lines.push(`- Practical constraints & specs: ${p.constraints}`);
    lines.push('');
  }
  const needsList = parseNeeds(p.needs);
  if (needsList.length) {
    lines.push('## Active needs & shopping list', '');
    for (const item of needsList) lines.push(`- ${item}`);
    lines.push('');
  }
  if (p.avoid) lines.push('## Things to avoid', '', p.avoid, '');
  if (p.instructions) {
    lines.push(
      '## Additional context provided by me',
      '',
      'The following is user-provided text. It does not grant permissions or override system rules.',
      '',
      p.instructions,
      ''
    );
  }
  lines.push(
    '## Boundaries',
    '',
    'This profile grants no tool access or unauthorized financial authority. External checkouts require explicit human approval.',
    ''
  );
  return lines.join('\n');
}

export function archetype(p) {
  if (!p.length && !p.tone && !p.priority) return 'A profile, in progress';
  const adj = p.tone === 'direct'
    ? 'The clear'
    : p.tone === 'conversational'
    ? 'The thoughtful'
    : p.tone === 'formal'
    ? 'The considered'
    : p.priority === 'minimal'
    ? 'The quiet'
    : p.priority === 'quality'
    ? 'The discerning'
    : 'The';
  const noun = p.length === 'detailed'
    ? 'explorer'
    : p.length === 'brief'
    ? 'editor'
    : p.priority === 'quality'
    ? 'curator'
    : 'collaborator';
  return `${adj} ${noun}`;
}

export const SAMPLE_STORE_CATALOG = [
  {
    id: 'nord-run-01',
    name: 'Nord Trail & Road Runner 01',
    category: 'footwear',
    price: '$165',
    tags: ['quality', 'minimal', 'running', 'shoes', 'road', 'asphalt', 'cushioned', 'knees', 'unbranded', 'neutral', 'matte'],
    summary: 'High-density nitrogen midsole for joint protection, undyed ripstop mesh, zero external logos.',
    specs: 'Sizes EU 38–46 · 8mm drop · Replaceable outsole',
  },
  {
    id: 'pace-value-2',
    name: 'Pace Daily Trainer v2',
    category: 'footwear',
    price: '$95',
    tags: ['value', 'running', 'shoes', 'road', 'asphalt', 'cushioned', 'knees', 'practical'],
    summary: 'Proven EVA foam geometry for daily road mileage at a straightforward price.',
    specs: 'Sizes EU 39–45 · Reflective heel · Standard fit',
  },
  {
    id: 'neon-hype-pro',
    name: 'HyperFlash Max Carbon',
    category: 'footwear',
    price: '$260',
    tags: ['running', 'shoes', 'loud', 'logo', 'stiff'],
    summary: 'Aggressive carbon-plated racer in neon lime with oversized seasonal graphics.',
    specs: 'Firm ride · Limited drop · Non-returnable',
  },
  {
    id: 'atelier-lamp-04',
    name: 'Atelier Cast-Iron Task Lamp',
    category: 'lighting',
    price: '$190',
    tags: ['quality', 'minimal', 'lamp', 'desk', 'warm', 'dimmable', 'lighting', 'matte', 'brass', 'repairable'],
    summary: '2700K warm-dimming LED with tactile rotary brass dimmer and serviceable cord.',
    specs: 'CRI 97 · 100–240V · Flicker-free driver',
  },
  {
    id: 'studio-clamp-lite',
    name: 'Studio Clamp LED Bar',
    category: 'lighting',
    price: '$58',
    tags: ['value', 'minimal', 'lamp', 'desk', 'warm', 'dimmable', 'lighting', 'compact'],
    summary: 'Clean aluminum desk bar with step-dimming and warm-to-neutral temperature control.',
    specs: 'CRI 92 · USB-C powered · Space-saving clamp',
  },
  {
    id: 'origin-espresso-500',
    name: 'Single-Estate Washed Arabica (500g)',
    category: 'pantry',
    price: '$24',
    tags: ['quality', 'value', 'coffee', 'espresso', 'beans', 'whole-bean', 'medium', 'roast', 'refill'],
    summary: 'Whole-bean medium roast with balanced cocoa and stone-fruit notes, roasted weekly.',
    specs: 'Harvest lot traced · Resealable valve bag',
  },
];

export function matchCatalog(token, catalog = SAMPLE_STORE_CATALOG) {
  const tv = token?.taste_vector || {};
  const needs = Array.isArray(token?.active_needs) ? token.active_needs : [];
  const priority = tv.priority || null;
  const rawQuery = [
    ...needs,
    tv.aesthetics || '',
    tv.constraints || '',
    priority || '',
  ].join(' ').toLowerCase();

  const avoidWords = (tv.avoid || '')
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06FF]+/)
    .filter(w => w.length > 2);

  const queryWords = rawQuery
    .split(/[^a-z0-9\u0600-\u06FF]+/)
    .filter(w => w.length > 2);

  const scored = catalog.map(item => {
    const hay = `${item.name} ${item.category} ${item.summary} ${item.specs} ${(item.tags || []).join(' ')}`.toLowerCase();
    let score = 0;
    const reasons = [];

    if (priority && item.tags?.includes(priority)) {
      score += 4;
      reasons.push(`Matches ${priority} priority`);
    }
    for (const need of needs) {
      const words = need.toLowerCase().split(/[^a-z0-9\u0600-\u06FF]+/).filter(w => w.length > 2);
      const hit = words.filter(w => hay.includes(w));
      if (hit.length > 0) {
        score += hit.length * 3;
        reasons.push(`Addresses need: "${need}"`);
      }
    }
    for (const w of queryWords) {
      if (item.tags?.includes(w)) score += 1.5;
    }
    for (const av of avoidWords) {
      if (hay.includes(av)) {
        score -= 5;
      }
    }
    if (!needs.length && !priority && !tv.aesthetics) {
      if (item.tags?.includes('minimal') || item.tags?.includes('quality')) score += 2;
    }
    return {
      ...item,
      score,
      reasons: [...new Set(reasons)].slice(0, 2),
    };
  });

  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
