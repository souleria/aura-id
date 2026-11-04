import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY,
  createExport,
  createTasteToken,
  createAgentPassport,
  verifyAgentPassport,
  generateDeterministicAgentId,
  asMarkdown,
  importProfile,
  matchCatalog,
  SAMPLE_STORE_CATALOG
} from './dist/profile.mjs';
import {createProfileStore, handleRpcRequest} from './mcp/server.mjs';

test('excluding context removes personal text from both export formats',()=>{
  const p={...EMPTY(),name:'PRIVATE_NAME',role:'PRIVATE_ROLE',instructions:'PRIVATE_TEXT',goal:'PRIVATE_GOAL',language:'PRIVATE_LANGUAGE',tone:'direct',actions:'ask'};
  const v=createExport(p,{communication:true,context:false,visual:false,agent:false});
  for(const output of [JSON.stringify(v),asMarkdown(v)])assert.doesNotMatch(output,/PRIVATE_/);
  assert.equal(v.preferences.tone,'direct');assert.equal(v.preferences.actions,'ask');
});

test('import rejects foreign schemas, unsupported choices and non-text fields',()=>{
  for(const preferences of [{actions:'autonomous'},{name:{nested:'data'}}])assert.throws(()=>importProfile(JSON.stringify({schema:'aura-id/profile',version:'0.1',preferences})));
  assert.throws(()=>importProfile('{"schema":"unknown","version":"0.1","preferences":{}}'));
  assert.throws(()=>importProfile('invalid'));assert.throws(()=>importProfile(' '.repeat(100001)));
});

test('JSON round trip preserves explicit preferences and ignores injected extra fields',()=>{
  const p={...EMPTY(),tone:'direct',length:'brief',goal:'Compare concepts',priority:'quality',taste:'Matte natural materials',needs:'Running shoes\nDesk lamp',actions:'draft-only'};
  const serialized=JSON.stringify(createExport(p,{context:true,communication:true,visual:true,taste:true,agent:true}));
  assert.deepEqual(importProfile(serialized),p);
  const payload=JSON.parse(serialized);payload.preferences.permission='publish';payload.preferences.__proto__={admin:true};
  const result=importProfile(JSON.stringify(payload));assert.equal(result.permission,undefined);assert.equal(result.admin,undefined);
});

test('unknown choices do not become assumed personality or action authority',()=>{
  const v=createExport(EMPTY(),{context:true,communication:true,visual:true,taste:true,agent:false});assert.deepEqual(v.preferences,{});
  assert.match(asMarkdown(v),/grants no tool access or unauthorized financial authority/);
});

test('Scoped Taste Token strips PII and matches store catalog items accurately',()=>{
  const p={...EMPTY(),name:'SECRET_USER',role:'SECRET_COMPANY',instructions:'SECRET_NOTES',priority:'quality',taste:'unbranded matte',constraints:'sensitive knees',needs:'Running shoes for road\nWarm desk lamp',actions:'ask'};
  const token=createTasteToken(p,{domain:'commerce'});
  const serialized=JSON.stringify(token);
  assert.doesNotMatch(serialized,/SECRET_/);
  assert.equal(token.schema,'aura-id/taste-token');
  assert.equal(token.privacy,'scoped-handshake-no-pii');
  assert.deepEqual(token.active_needs,['Running shoes for road','Warm desk lamp']);
  const matches=matchCatalog(token,SAMPLE_STORE_CATALOG);
  assert.ok(matches.length>=2);
  assert.equal(matches[0].id,'nord-run-01');
  const importedFromToken=importProfile(serialized);
  assert.equal(importedFromToken.name,'');
  assert.equal(importedFromToken.priority,'quality');
  assert.equal(importedFromToken.needs,'Running shoes for road\nWarm desk lamp');
});

test('Agent National ID generation and Post-CAPTCHA verification passport',()=>{
  const agentId = generateDeterministicAgentId('Alex Rivera', 'buyer');
  assert.ok(agentId.startsWith('AURA-BUY-'));
  const p = {
    ...EMPTY(),
    name: 'Alex Rivera',
    agent_id: agentId,
    agent_name: 'Hermes Buyer',
    agent_role: 'buyer',
    agent_trust: 'verified',
    agent_spend_limit: '$150 / session',
    priority: 'quality',
    needs: 'Road runner shoes'
  };
  const passport = createAgentPassport(p);
  assert.equal(passport.schema, 'aura-id/agent-passport');
  assert.equal(passport.agent.id, agentId);
  assert.equal(passport.auth.trust_tier, 'verified');
  const verification = verifyAgentPassport(passport);
  assert.equal(verification.verified, true);
  assert.equal(verification.captcha_bypass_granted, true);
  assert.equal(verification.trust_score, '98/100');
});

test('MCP server tools read, update, and match Taste Token needs',()=>{
  const store=createProfileStore(null);
  handleRpcRequest({id:1,method:'tools/call',params:{name:'update_taste',arguments:{priority:'minimal',taste:'No visible logos'}}},store);
  handleRpcRequest({id:2,method:'tools/call',params:{name:'manage_needs',arguments:{action:'add',item:'Running shoes for asphalt'}}},store);
  const tokenRes=handleRpcRequest({id:3,method:'tools/call',params:{name:'get_taste_token',arguments:{domain:'footwear'}}},store);
  assert.ok(tokenRes && tokenRes.result && tokenRes.result.content);
  const token=JSON.parse(tokenRes.result.content[0].text);
  assert.equal(token.taste_vector.priority,'minimal');
  assert.deepEqual(token.active_needs,['Running shoes for asphalt']);
});
