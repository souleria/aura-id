import {EMPTY,cleanProfile,importProfile,createExport,createTasteToken,asMarkdown,archetype,parseNeeds,matchCatalog,SAMPLE_STORE_CATALOG} from './profile.mjs';

const main=document.querySelector('#main');
const dialog=document.querySelector('#dialog');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={
  brief:'Short & direct',balanced:'Balanced',detailed:'Step-by-step',
  direct:'Straightforward',conversational:'Warm & friendly',formal:'Professional',
  sources:'Always cite links','when-needed':'Only when needed',unspecified:'Not set',
  challenge:'Be honest & critical',gentle:'Be encouraging',
  light:'Light card & UI',dark:'Dark card & UI',system:'Match my device',
  focused:'Simple summary first',compact:'Side-by-side table',
  reduced:'Calm (no animation)',subtle:'Smooth motion',
  quality:'Buy once, keep for years',value:'Best value for money',minimal:'Simple & unbranded',
  ask:'Always ask me first','draft-only':'Only prepare a shortlist'
};
const titles=['Start','About you','Reply style','Honesty','Visual feel','Taste & shopping','Safety rules','Your card & export'];
const FINAL_STEP=7;
let p=EMPTY(),step=0,view='home',returnReview=false,scope={context:true,communication:true,visual:true,taste:true},theme='light',demoMode='store',previewFormat='markdown',toastTimer;
const label=v=>labels[v]||'Not set';

const SUPPORT_WALLETS = [
  { network: 'USDT (TRC20 / Tron)', address: 'TYourTronWalletAddressHere0000000000' },
  { network: 'USDT / USDC / ETH (ERC20 / Arbitrum / Base)', address: '0xYourEthereumWalletAddressHere0000000000' },
  { network: 'Bitcoin (BTC)', address: 'bc1qyourbitcoinwalletaddresshere000000000' },
  { network: 'Solana (SOL / USDC)', address: 'YourSolanaWalletAddressHere000000000000' }
];

const QUICK_CHIPS={
  role:['Product Designer','Software Engineer','Founder','Student','Writer & Researcher','Freelancer'],
  goal:['Brainstorm & test ideas','Write clean code faster','Compare products before buying','Learn new topics simply','Draft clear emails & docs'],
  language:['English','Persian (فارسی)','Same language I write in','Bilingual (EN / FA)'],
  taste:['Minimal & quiet','No big logos','Natural materials','Matte black & warm wood','Built to repair','Clean typography'],
  constraints:['Shoe size EU 42','Sensitive knees','Fragrance-free','Under $150 budget','Compact desk space'],
  needs:['Running shoes for asphalt','Warm dimmable desk lamp','Whole-bean medium roast coffee','Noise-cancelling headphones','Ergonomic travel backpack'],
  avoid:['Long robotic intros','Hype marketing words','Loud neon colors','Unverified claims','Pushy upsells']
};

function copyText(text,successMsg){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>toast(successMsg)).catch(()=>fallbackCopy(text,successMsg));
  }else{
    fallbackCopy(text,successMsg);
  }
}
function fallbackCopy(text,successMsg){
  try{
    const ta=document.createElement('textarea');
    ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();
    document.execCommand('copy');ta.remove();
    toast(successMsg);
  }catch{
    const details=document.querySelector('.export-preview');
    if(details)details.open=true;
    const errEl=document.querySelector('#export-error');
    if(errEl)errEl.textContent='Select and copy the text above.';
  }
}

function encodeShareUrl(profile){
  const token=createTasteToken(profile,{includeNeeds:true,includeVisual:true});
  const json=JSON.stringify(token);
  const b64=btoa(unescape(encodeURIComponent(json)));
  const base=window.location.href.split('#')[0];
  return `${base}#token=${b64}`;
}

function checkUrlToken(){
  const hash=window.location.hash||'';
  if(hash.startsWith('#token=')){
    try{
      const raw=decodeURIComponent(escape(atob(hash.slice(7))));
      p=importProfile(raw);
      history.replaceState(null,'',window.location.pathname+window.location.search);
      go(FINAL_STEP);
      toast('Shared Taste Token loaded from link.');
      return true;
    }catch{}
  }
  return false;
}

function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4500)}
function openDialog(title,body){document.querySelector('#dialog-body').innerHTML=`<h2 id="dialog-title">${title}</h2>${body}`;dialog.showModal()}
document.querySelector('#close-dialog').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
document.querySelector('#home').onclick=()=>home();

document.querySelector('#about').onclick=()=>openDialog('What is Aura ID, and how does it work?',`
  <p>Every time you open a new AI chat or use an AI shopping assistant, you have to explain who you are, how you like answers written, what your style is, and what you need to buy.</p>
  <h3>1. Build your card once (2 minutes)</h3>
  <p>Click through simple choices—or tap the ready-made suggestion chips—to set your communication style, personal taste, sizes/constraints, and current shopping list.</p>
  <h3>2. Use it anywhere (Zero server needed)</h3>
  <p>Copy your profile into ChatGPT, Claude, or Gemini, share a direct link, or download your <strong>Taste Token</strong>.</p>
  <h3>3. Ready for agent-to-agent shopping</h3>
  <p>When your personal AI visits an online store on your behalf, it hands the store’s agent your <strong>Scoped Taste Token</strong> (your taste + shopping list, with your name and private notes removed) so the store immediately shows what fits you best.</p>
`);

document.querySelector('#mcp-api').onclick=()=>{
  const tokenPreview=JSON.stringify(createTasteToken(Object.values(p).some(Boolean)?p:{...EMPTY(),priority:'quality',taste:'Minimal & quiet, No big logos',constraints:'Shoe size EU 42, Sensitive knees',needs:'Running shoes for asphalt\nWarm dimmable desk lamp',tone:'direct',length:'brief',actions:'ask'}),null,2);
  openDialog('How the MCP & Taste Token API work',`
    <p>Aura ID works in <strong>three ways</strong>—from zero-setup copy &amp; paste to live agent connections:</p>
    <h3>Mode 1 · Copy, File, or Share Link (No server needed)</h3>
    <p>Works right here in the browser on any static host (like GitHub Pages). Copy the Markdown prompt, download the JSON token, or copy a self-contained <code>#token=...</code> link.</p>
    <h3>Mode 2 · Local MCP Server (Runs on the user’s computer)</h3>
    <p>The included <code>mcp/server.mjs</code> file connects Claude Desktop or Cursor directly to the user’s local profile file—no cloud database required:</p>
    <pre>{
  "mcpServers": {
    "aura-id": {
      "command": "node",
      "args": ["./mcp/server.mjs", "--profile", "./aura-id-profile.json"]
    }
  }
}</pre>
    <h3>Mode 3 · Store Agent Handshake (Scoped Taste Token)</h3>
    <p>Your personal agent sends this PII-free JSON token to a store agent so it can filter products for you:</p>
    <pre id="mcp-token-pre">${esc(tokenPreview)}</pre>
    <div class="hero-actions" style="margin-bottom:0"><button class="primary" id="copy-mcp-token">Copy Taste Token JSON</button></div>
  `);
  document.querySelector('#copy-mcp-token').onclick=()=>copyText(tokenPreview,'Scoped Taste Token copied.');
};

document.querySelector('#privacy').onclick=()=>openDialog('Your data & privacy',`
  <p>Everything you enter stays in your browser. There is no account sign-up, tracking database, or hidden analytics.</p>
  <p>When you generate a <strong>Scoped Taste Token</strong> for shopping or external agents, your personal context (name, job, goals, and custom instructions) is automatically stripped so stores only see your product taste, constraints, and shopping list.</p>
  <p><strong>Save on this device</strong> stores your draft in your browser’s <code>localStorage</code>. <strong>Forget this profile</strong> erases it immediately.</p>
`);

document.querySelector('#site-theme').onclick=()=>{theme=theme==='light'?'dark':'light';document.body.dataset.theme=theme;document.querySelector('#site-theme').setAttribute('aria-label',`Switch to ${theme==='light'?'dark':'light'} theme`)};
document.querySelector('#coffee-link').onclick=()=>{
  openDialog('Support Aura ID ☕',`
    <p>Aura ID is free, open source, and independent—with zero ads or data tracking. If you find it useful, you can support ongoing development directly via crypto:</p>
    <div class="a2a-grid">
      ${SUPPORT_WALLETS.map((w,i)=>`
        <div class="a2a-item">
          <div class="a2a-item-head"><span>${esc(w.network)}</span><button type="button" class="text-button" data-copy-wallet="${i}" style="min-height:24px;padding:0">Copy address</button></div>
          <p style="font:11px/1.5 'Courier New',monospace;word-break:break-all;margin-top:4px">${esc(w.address)}</p>
        </div>
      `).join('')}
    </div>
    <p class="note">Direct peer-to-peer wallet support · No intermediaries.</p>
  `);
  document.querySelectorAll('[data-copy-wallet]').forEach(btn=>{
    btn.onclick=()=>{
      const w=SUPPORT_WALLETS[+btn.dataset.copyWallet];
      if(w)copyText(w.address,`${w.network} address copied.`);
    };
  });
};
document.querySelector('#load').onclick=()=>openLoad();

function openLoad(){
  let stored=false;
  try{stored=!!localStorage.getItem('aura-profile-v01')}catch{}
  openDialog('Open a saved profile',`<p>Import a previously downloaded Aura ID or Taste Token JSON file, or resume the profile saved in this browser.</p><div class="method"><button id="upload-profile"><strong>Import JSON file</strong><small>Supports Aura ID profile (v0.1 / v0.2) and Taste Token files.</small></button><button id="resume-profile" ${stored?'':'disabled'}><strong>Resume from this browser</strong><small>${stored?'A saved profile was found in this browser.':'No saved profile in this browser yet.'}</small></button></div><p class="error" id="load-error" role="alert"></p>`);
  document.querySelector('#upload-profile').onclick=()=>document.querySelector('#file-input').click();
  document.querySelector('#resume-profile').onclick=()=>{
    try{
      p=importProfile(localStorage.getItem('aura-profile-v01'));
      scope={context:true,communication:true,visual:true,taste:true};
      dialog.close();go(FINAL_STEP);toast('Saved profile opened.');
    }catch(e){
      document.querySelector('#load-error').textContent=e.message;
    }
  };
}

document.querySelector('#file-input').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>100000)throw new Error('Use a profile smaller than 100 KB.');
    const next=importProfile(await file.text());
    p=next;scope={context:true,communication:true,visual:true,taste:true};
    dialog.close();go(FINAL_STEP);toast('Profile imported.');
  }catch(err){
    const out=document.querySelector('#load-error');
    if(out)out.textContent=err.message;else toast(err.message);
  }
  e.target.value='';
};

function getSwatches(profile){
  const c1=profile.theme==='light'?'#233a32':profile.theme==='dark'?'#f0eedf':'#d8d5c5';
  const c2=profile.priority==='quality'?'#bf8061':profile.priority==='value'?'#6b9080':profile.priority==='minimal'?'#9aa095':'#a8b7a0';
  const c3=profile.tone==='direct'?'#a83f23':profile.tone==='conversational'?'#d48c46':profile.tone==='formal'?'#4a5d6e':'#8c7a6b';
  const c4=profile.actions==='draft-only'?'#7a6f9b':profile.actions==='ask'?'#52796f':'#6f8972';
  return [c1,c2,c3,c4];
}

function passport(profile,{example=false}={}){
  const needsList=parseNeeds(profile.needs);
  const tasteParts=(profile.taste||'').split(',').map(s=>s.trim()).filter(Boolean);
  const constraintParts=(profile.constraints||'').split(',').map(s=>s.trim()).filter(Boolean);
  const pills=[
    profile.priority?label(profile.priority):'',
    ...tasteParts.slice(0,2),
    ...constraintParts.slice(0,1),
    ...needsList.slice(0,2).map(n=>`Need: ${n}`)
  ].filter(Boolean).slice(0,4);

  const metaLine=[
    profile.tone&&label(profile.tone),
    profile.length&&label(profile.length),
    needsList.length?`${needsList.length} shopping need${needsList.length>1?'s':''}`:''
  ].filter(Boolean).join(' · ')||'Updates live as you choose';

  const ownerParts=[
    profile.name||(example?'Alex Rivera':'Your name (optional)'),
    profile.role,
    profile.language
  ].filter(Boolean).join(' · ');

  const surface=profile.theme==='light'?'light':'dark';
  const priorityAttr=profile.priority||'default';
  const densityAttr=profile.density||'focused';
  const [s1,s2,s3,s4]=getSwatches(profile);

  return `<div class="passport" data-surface="${esc(surface)}" data-priority="${esc(priorityAttr)}" data-density="${esc(densityAttr)}" aria-label="${example?'Example identity card':'Your live identity card'}">
    <div class="card-top">
      <span class="card-word">aura id.</span>
      <span class="mono">${example?'Example card':'Live Taste Token'}<br>${esc(profile.actions==='draft-only'?'Drafts only':profile.actions==='ask'?'Ask before acting':'v0.2 Standard')}</span>
    </div>
    <div>
      <h2 class="card-title">${esc(archetype(profile))}</h2>
      <div class="card-owner">${esc(ownerParts)}</div>
      ${pills.length?`<div class="card-pills">${pills.map(tag=>`<span class="card-pill">${esc(tag)}</span>`).join('')}</div>`:''}
    </div>
    <div class="card-bottom">
      <div class="mono">${esc(metaLine)}<br>${example?'Click below to build yours':'Portable across all AIs & stores'}</div>
      <div class="swatches" title="Live preference signature" aria-hidden="true">
        <i style="background:${s1}"></i><i style="background:${s2}"></i><i style="background:${s3}"></i><i style="background:${s4}"></i>
      </div>
    </div>
  </div>`;
}

function home(){
  view='home';
  const sample={...EMPTY(),name:'Alex Rivera',role:'Product Designer',language:'English',tone:'direct',length:'brief',priority:'quality',taste:'Minimal & quiet, No big logos',constraints:'Shoe size EU 42',needs:'Running shoes for asphalt\nWarm dimmable desk lamp',actions:'ask'};
  const hasDraft=Object.values(p).some(Boolean);
  main.innerHTML=`<div class="landing">
    <aside class="explainer-bar" aria-label="How Aura ID works">
      <div class="explainer-lead">
        <strong>What is this website?</strong>
        Instead of introducing yourself, your taste, and your shopping list to every AI from scratch, build one portable <b>Taste Token</b> here in 2 minutes.
      </div>
      <div class="explainer-steps">
        <div class="explainer-step"><span>Step 01</span><b>Pick your style &amp; taste</b>Tap simple choices and ready-made tags—no hard typing.</div>
        <div class="explainer-step"><span>Step 02</span><b>Add your shopping list</b>List what you need now (or let your AI add to it via MCP).</div>
        <div class="explainer-step"><span>Step 03</span><b>Use with any AI or store</b>Copy into ChatGPT/Claude/Gemini or pass to store agents.</div>
      </div>
    </aside>
    <div class="intro-line">The open virtual identity &amp; Taste Token for humans and agents.</div>
    <section class="hero">
      <div class="hero-copy">
        <h1>Introduce yourself<br>to every AI, <em>once.</em></h1>
        <p>Create a live identity card and Taste Token that tells any AI how you think, what you like, and what you are shopping for—without giving away your private identity.</p>
        <div class="hero-actions">
          <button class="primary" id="create">${hasDraft?'Continue my card':'Build my card (2 min)'}</button>
          <button class="secondary" id="try-sample">Load a ready example</button>
          <button class="text-button" id="example">See an example</button>
        </div>
        <div class="quiet">Free &amp; open source · No sign-up · Works with ChatGPT, Claude, Gemini &amp; MCP</div>
      </div>
      <div class="card-stage">
        ${passport(sample,{example:true})}
        <p class="card-note">Example Taste Token card. Every choice you make updates your card in real time.</p>
      </div>
    </section>
    <div class="hero-under">
      <p>Built for the post-UI web: when your personal AI talks directly to a store’s AI agent, your Taste Token filters thousands of products down to the exact ones that match your taste and needs.</p>
      <div class="under-items">
        <div><strong>Personal AI</strong>Knows how to talk to you</div>
        <div><strong>Taste Token</strong>Carries your style &amp; sizes</div>
        <div><strong>Store Agents</strong>Finds what you actually need</div>
      </div>
    </div>
  </div>`;
  document.querySelector('#create').onclick=()=>go(hasDraft?step:1);
  document.querySelector('#try-sample').onclick=()=>{
    p=cleanProfile(sample);
    go(FINAL_STEP);
    toast('Example profile loaded. Try the Store Agent demo or edit any section!');
  };
  document.querySelector('#example').onclick=()=>{
    openDialog('What a profile & Taste Token carry.',`${passport(sample,{example:true})}<p>“Start with a concise answer and challenge weak assumptions. When my agent checks a store, prioritize durable, unbranded gear, keep my EU 42 / knee-cushioning constraints in mind, and match my active shopping list—then ask before buying.”</p><div class="hero-actions"><button class="primary" id="example-create">Load this example & test it</button></div>`);
    document.querySelector('#example-create').onclick=()=>{dialog.close();p=cleanProfile(sample);go(FINAL_STEP);toast('Example profile loaded.')};
  };
  tilt();
}

function tilt(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!matchMedia('(pointer:fine)').matches)return;
  document.querySelectorAll('.passport').forEach(el=>{
    el.onpointermove=e=>{const r=el.getBoundingClientRect();el.style.transform=`rotateX(${-(e.clientY-r.top-r.height/2)/50}deg) rotateY(${(e.clientX-r.left-r.width/2)/50}deg)`};
    el.onpointerleave=()=>el.style.transform='';
  });
}

function fieldWithChips(key,title,placeholder='',multi=false,max=180,sep=', '){
  const rows=key==='instructions'?4:key==='needs'?4:2;
  const chips=QUICK_CHIPS[key]||[];
  const currentVal=p[key]||'';
  const activeList=sep==='\n'?parseNeeds(currentVal):currentVal.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  return `<div class="field-block">
    <label class="field">
      <span>${title}<span class="optional">Optional</span></span>
      ${multi
        ?`<textarea name="${key}" rows="${rows}" maxlength="${max}" placeholder="${placeholder}">${esc(p[key])}</textarea>`
        :`<input type="text" name="${key}" value="${esc(p[key])}" maxlength="${max}" placeholder="${placeholder}" autocomplete="${key==='name'?'given-name':'off'}">`}
    </label>
    ${chips.length?`<div class="chip-row" aria-label="Quick suggestions for ${esc(title)}">${chips.map(c=>{
      const isPressed=sep==='\n'?activeList.some(x=>x.toLowerCase()===c.toLowerCase()):activeList.includes(c.toLowerCase());
      return `<button type="button" class="chip" data-chip-field="${key}" data-chip-sep="${sep==='\n'?'newline':'comma'}" data-chip-val="${esc(c)}" aria-pressed="${isPressed}">+ ${esc(c)}</button>`;
    }).join('')}</div>`:''}
  </div>`;
}

function choice(key,value,title,description=''){
  return `<label class="choice"><input type="radio" name="${key}" value="${value}" ${p[key]===value?'checked':''}><span><strong>${title}</strong>${description?`<small>${description}</small>`:''}</span></label>`;
}

function nav(){
  return `<aside class="steps" aria-label="Profile sections"><div class="small-label">Your card builder</div>${titles.map((t,i)=>`<button class="step-link" data-step="${i}" aria-label="${t}" ${i===step?'aria-current="step"':''}><span>${i+1}</span><span class="step-name">${t}</span></button>`).join('')}<div class="progress-line" aria-hidden="true"><i style="width:${step/FINAL_STEP*100}%"></i></div></aside>`;
}

function summary(){
  const needsCount=parseNeeds(p.needs).length;
  return `<div class="live-title"><span>Your card</span><span class="live-dot">Updates live</span></div>${passport(p)}<div class="summary">${[
    ['Name / Role',[p.name,p.role].filter(Boolean).join(' · ')||'Not set'],
    ['Reply style',[p.length&&label(p.length),p.tone&&label(p.tone)].filter(Boolean).join(', ')||'Not set'],
    ['Shopping style',label(p.priority)],
    ['Taste & specs',[p.taste,p.constraints].filter(Boolean).join(' · ')||'Not set'],
    ['Shopping list',needsCount?`${needsCount} item${needsCount>1?'s':''}`:'Empty'],
    ['Safety boundary',p.actions?label(p.actions):'Always ask first']
  ].map(([a,b])=>`<div class="summary-row"><span>${a}</span><span>${esc(b)}</span></div>`).join('')}</div><p class="note">Every click or keystroke updates your card above in real time. Skip anything you don’t need.</p>`;
}

function updateLivePreview(){
  const panel=document.querySelector('.live-panel');
  if(panel){
    panel.innerHTML=summary();
    tilt();
  }
}

function go(n){
  step=n;view=n===FINAL_STEP?'review':'studio';
  if(n===FINAL_STEP){renderReview()}else{renderStudio()}
  main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
}

function attachChipListeners(){
  document.querySelectorAll('[data-chip-field]').forEach(btn=>{
    btn.onclick=()=>{
      const key=btn.dataset.chipField;
      const val=btn.dataset.chipVal;
      const isNewline=btn.dataset.chipSep==='newline';
      const input=document.querySelector(`[name="${key}"]`);
      if(!input)return;
      if(key==='role'||key==='language'){
        input.value=input.value.trim()===val?'':val;
      }else if(isNewline){
        const list=parseNeeds(input.value);
        const idx=list.findIndex(x=>x.toLowerCase()===val.toLowerCase());
        if(idx>=0)list.splice(idx,1);else list.push(val);
        input.value=list.join('\n');
      }else{
        const parts=input.value.split(',').map(s=>s.trim()).filter(Boolean);
        const idx=parts.findIndex(x=>x.toLowerCase()===val.toLowerCase());
        if(idx>=0)parts.splice(idx,1);else parts.push(val);
        input.value=parts.join(', ');
      }
      capture();
      renderStudio();
    };
  });
}

function renderStudio(){
  const content=stepContent();
  main.innerHTML=`<div class="studio">${nav()}<section class="step-content"><div class="small-label">Step ${step+1} of ${titles.length} · ${titles[step]}</div>${content}</section><aside class="live-panel" aria-label="Profile preview">${summary()}</aside></div>`;
  document.querySelectorAll('[data-step]').forEach(el=>el.onclick=()=>{capture();go(+el.dataset.step)});
  const form=document.querySelector('#profile-form');
  if(form){
    form.addEventListener('input',()=>{capture();updateLivePreview()});
    form.addEventListener('change',()=>{capture();updateLivePreview()});
    form.onsubmit=e=>{e.preventDefault();capture();if(returnReview){returnReview=false;go(FINAL_STEP)}else go(step+1)};
  }
  attachChipListeners();
  document.querySelector('#back')?.addEventListener('click',()=>{capture();go(step-1)});
  document.querySelector('#skip')?.addEventListener('click',()=>{capture();if(returnReview){returnReview=false;go(FINAL_STEP)}else go(step+1)});
  document.querySelector('#clear-section')?.addEventListener('click',()=>{
    const fields={1:['name','role','goal','language','instructions'],2:['length','tone'],3:['evidence','challenge'],4:['theme','density','motion'],5:['priority','taste','constraints','needs'],6:['actions','avoid']};
    const empty=EMPTY();for(const key of fields[step]||[])p[key]=empty[key];
    renderStudio();toast('Section cleared.');
  });
  document.querySelector('#quick')?.addEventListener('click',()=>go(1));
  document.querySelector('#paste')?.addEventListener('click',()=>{go(1);const d=document.querySelector('details');if(d)d.open=true;document.querySelector('[name=instructions]')?.focus()});
  document.querySelector('#import-start')?.addEventListener('click',openLoad);
  tilt();
}

function capture(){
  const form=document.querySelector('#profile-form');if(!form)return;
  const data=new FormData(form);
  for(const key of Object.keys(p))if(data.has(key))p[key]=data.get(key);
  p=cleanProfile(p);
}

function actions(){
  return `<div class="form-actions"><button type="button" class="text-button" id="back">← Back</button><div class="right"><button type="button" class="text-button" id="skip">${returnReview?'Back to review':'Skip this step'}</button><button type="submit" class="primary">${returnReview?'Save changes':step===FINAL_STEP-1?'See my finished card →':'Next step →'}</button></div></div><button type="button" class="text-button" id="clear-section">Reset this step</button>`;
}

function stepContent(){
  switch(step){
    case 0:
      return `<h1>How would you like<br>to start?</h1><p class="description">You don’t need to write essays. Tap a few choices, pick ready-made tags, and watch your card take shape on the right.</p><div class="method"><button id="quick"><span class="method-num">01</span><strong>Build step-by-step (Recommended)</strong><small>Answer 6 quick, everyday questions with one-click suggestion tags.</small></button><button id="paste"><span class="method-num">02</span><strong>Paste my existing custom instructions</strong><small>Already have a prompt you give to ChatGPT or Claude? Bring it in.</small></button><button id="import-start"><span class="method-num">03</span><strong>Open a saved Aura ID or Taste Token</strong><small>Load a JSON file or resume from this browser.</small></button></div>`;
    case 1:
      return `<h1>First, a quick<br>introduction.</h1><p class="description">Tap a suggestion tag below any box or type your own. (When your agent talks to external stores, this personal section stays private.)</p><form id="profile-form">${fieldWithChips('name','What should AI call you?','Your first name or nickname',false,80)}${fieldWithChips('role','What do you do day-to-day?','Click a tag below or type your role',false,180)}${fieldWithChips('goal','What do you use AI for most?','Click one or more tags below, or type your own',true,1200)}${fieldWithChips('language','Preferred language','e.g., English, Persian, or match my message',false,80)}<details ${p.instructions?'open':''}><summary class="small-label">Have extra custom rules? Paste them here (optional)</summary><div style="margin-top:12px">${fieldWithChips('instructions','Custom instructions','Any specific rules you want AI to follow verbatim.',true,10000)}</div></details>${actions()}</form>`;
    case 2:
      return `<h1>How should AI<br>talk to you?</h1><p class="description">Pick the reply length and tone that feel least tiring to read every day.</p><form id="profile-form"><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">1. How long should replies be?</legend><div class="choice-list">${choice('length','brief','Short & to the point','Give me the direct answer first. I will ask if I want more detail.')}${choice('length','balanced','Balanced (Answer + brief why)','Start with the answer, then give the key reasoning in a few lines.')}${choice('length','detailed','Step-by-step guide','Walk me through the full plan with clear numbered steps and examples.')}</div></fieldset><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">2. What tone feels natural?</legend><div class="radio-inline">${choice('tone','direct','Straightforward')}${choice('tone','conversational','Warm & friendly')}${choice('tone','formal','Professional')}</div></fieldset>${actions()}</form>`;
    case 3:
      return `<h1>How should AI<br>help you think?</h1><p class="description">Tell AI whether you want polite agreement or honest pushback when you share an idea.</p><form id="profile-form"><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">1. If my idea has a flaw or blind spot...</legend><div class="choice-list">${choice('challenge','challenge','Be direct and challenge me','Point out weak assumptions clearly and suggest stronger alternatives.')}${choice('challenge','gentle','Be constructive and supportive','Highlight what works, then gently explain how to fix the weak spots.')}</div></fieldset><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">2. When stating facts or product claims...</legend><div class="choice-list">${choice('evidence','sources','Always include verifiable links','Cite reliable sources and separate facts from guesses.')}${choice('evidence','when-needed','Only when important','Mention sources only for major claims or when I ask.')}</div></fieldset>${actions()}</form>`;
    case 4:
      return `<h1>How should things<br>look on screen?</h1><p class="description">Notice how your card on the right changes immediately when you pick Light or Dark.</p><form id="profile-form"><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">1. Preferred color surface</legend><div class="split-choices"><label class="choice"><div class="visual-theme" aria-hidden="true">Warm paper<b>Clean &amp; bright.</b>Easy daytime reading.<hr></div><input type="radio" name="theme" value="light" ${p.theme==='light'?'checked':''}> Light surface</label><label class="choice"><div class="visual-theme dark" aria-hidden="true">Deep forest<b>Low glare.</b>Calm night reading.<hr></div><input type="radio" name="theme" value="dark" ${p.theme==='dark'?'checked':''}> Dark surface</label></div><div style="margin-top:10px">${choice('theme','system','Follow my phone or laptop setting')}</div></fieldset><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">2. How should options be presented?</legend><div class="choice-list">${choice('density','focused','Simple summary first','Show the top recommendation cleanly without overwhelming tables.')}${choice('density','compact','Side-by-side comparison','Pack specs and prices together so I can compare fast.')}</div></fieldset><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">3. Visual motion</legend><div class="radio-inline">${choice('motion','reduced','Calm (no animation)')}${choice('motion','subtle','Smooth motion')}</div></fieldset>${actions()}</form>`;
    case 5:
      return `<h1>Your taste &amp;<br>shopping list.</h1><p class="description">This builds your <strong>Taste Token</strong>. When your AI agent visits a store for you, it uses this to filter products that fit your taste and current needs.</p><form id="profile-form"><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">1. When buying things, what matters most to you?</legend><div class="choice-list">${choice('priority','quality','Buy once, keep for years','Prioritize durable materials, repairability, and craftsmanship over cheap prices.')}${choice('priority','value','Best value for money','Prioritize proven performance, fair pricing, and practical specs without brand markup.')}${choice('priority','minimal','Simple, quiet & unbranded','Prioritize clean design, natural materials, and zero loud logos or clutter.')}</div></fieldset>${fieldWithChips('taste','2. Your style & material taste (tap tags or type)','e.g., Minimal & quiet, No big logos, Natural materials',false,600)}${fieldWithChips('constraints','3. Your sizes, budget, or sensitivities','e.g., Shoe size EU 42, Sensitive knees, Under $150 budget',false,600)}${fieldWithChips('needs','4. Your current shopping list (one item per line)','Click tags below or type items you want your agent to look for',true,1200,'\n')}<p class="field-help">Your personal agent can also add or remove shopping items automatically via MCP.</p>${actions()}</form>`;
    case 6:
      return `<h1>Set your<br>safety rules.</h1><p class="description">Make sure every AI and shopping agent knows where to stop and ask for your permission.</p><form id="profile-form"><fieldset style="border:0;padding:0;margin:0"><legend class="section-label">1. When an agent is shopping or acting for you...</legend><div class="choice-list">${choice('actions','ask','Always ask before buying or sending','Let the agent find the best match and prepare the cart, then wait for my yes.')}${choice('actions','draft-only','Only show me a shortlist (Drafts only)','Never put items in a cart or take external action—just show me the top matches.')}</div></fieldset>${fieldWithChips('avoid','2. Pet peeves & things AI should avoid','Click tags below or type what annoys you',true,1200)}${actions()}</form>`;
  }
}

function edit(n){returnReview=true;go(n)}
function section(title,n,rows){
  return `<section class="review-section"><h2>${title}<button class="text-button" data-edit="${n}">Edit</button></h2><dl>${rows.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v||'Not set')}</dd>`).join('')}</dl></section>`;
}

function renderReview(){
  const selected=Object.values(p).filter(v=>v!==null&&v!=='').length;
  const needsItems=parseNeeds(p.needs);
  main.innerHTML=`<div class="review"><div class="review-head"><div><div class="small-label">Step 8 of 8 · Your finished card &amp; Taste Token</div><h1>${selected?'Your identity is ready.':'Your card is still blank.'}</h1><p>${selected?'Test how a store agent reads your Taste Token on the right, or copy your profile and share link below.':'Go back and tap a few quick choices or load the example profile to see how it works.'}</p></div><button class="secondary" id="back-builder">← Edit steps</button></div><div class="review-layout"><div>${passport(p)}<p class="card-note">Your live card. Click “Edit” on any section below to see it update immediately.</p>${section('About you (Private context)',1,[['Name',p.name],['Role',p.role],['Main goal',p.goal],['Language',p.language],['Custom rules',p.instructions]])}${section('Reply style',2,[['Length',label(p.length)],['Tone',label(p.tone)]])}${section('Honesty & sources',3,[['Feedback',label(p.challenge)],['Sources',label(p.evidence)]])}${section('Visual feel',4,[['Surface',label(p.theme)],['Layout',label(p.density)],['Motion',label(p.motion)]])}${section('Taste Token & shopping list',5,[['Buying priority',label(p.priority)],['Style & taste',p.taste],['Sizes & specs',p.constraints],['Shopping list',needsItems.length?needsItems.join('\n'):'Not set']])}${section('Safety rules',6,[['Agent boundary',p.actions?label(p.actions):'Always ask first'],['Avoid',p.avoid]])}</div><div><section class="demo-box" id="demo"><div class="demo-top"><span class="small-label">Live simulator</span><div class="mode-switch" role="group" aria-label="Simulation mode"><button type="button" id="mode-store" aria-pressed="${demoMode==='store'}">Store Agent (Taste Token)</button><button type="button" id="mode-response" aria-pressed="${demoMode==='response'}">AI Chat Reply</button></div></div><h2 id="demo-heading"></h2><p class="prompt" id="demo-prompt"></p><div class="answer" id="answer"></div><p class="note" id="demo-note"></p><button class="text-button" id="compare"></button></section><section class="export-box"><h2>Use your profile &amp; Taste Token</h2><p>Uncheck any layer you want to leave out before copying or sharing.</p><label class="scope"><input type="checkbox" id="scope-context" ${scope.context?'checked':''}><span>About me (Private context)<small>Name, role, goals, language (automatically hidden from store Taste Tokens).</small></span></label><label class="scope"><input type="checkbox" id="scope-communication" ${scope.communication?'checked':''}><span>Reply &amp; thinking style<small>Length, tone, honesty, sources, and pet peeves.</small></span></label><label class="scope"><input type="checkbox" id="scope-visual" ${scope.visual?'checked':''}><span>Visual preferences<small>Light/dark surface, layout density, and motion.</small></span></label><label class="scope"><input type="checkbox" id="scope-taste" ${scope.taste?'checked':''}><span>Taste &amp; shopping list<small>Buying priority, style taste, sizes/constraints, and active shopping list.</small></span></label><div class="export-actions"><button class="primary" id="copy" ${selected?'':'disabled'}>Copy for AI Chat</button><button class="secondary" id="copy-token" ${selected?'':'disabled'}>Copy Taste Token</button><button class="secondary" id="copy-link" ${selected?'':'disabled'}>Copy share link</button><button class="secondary" id="download-json" ${selected?'':'disabled'}>Download JSON</button></div><details class="export-preview"><summary>Preview exact output (<span id="preview-kind">${previewFormat==='token'?'Scoped Taste Token JSON':'Markdown prompt'}</span>)</summary><div style="margin:6px 0 10px;display:flex;gap:14px"><button type="button" class="text-button" id="show-md-preview">Markdown prompt (for ChatGPT/Claude)</button><button type="button" class="text-button" id="show-token-preview">Scoped Taste Token (for Store Agents &amp; MCP)</button></div><pre id="export-text"></pre></details><div class="storage-actions"><button class="text-button" id="save">Save in this browser</button><button class="text-button" id="download-md" ${selected?'':'disabled'}>Download .md file</button><button class="text-button" id="forget">Erase profile</button></div><p class="error" id="export-error" role="alert"></p></section></div></div></div>`;

  document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>edit(+el.dataset.edit));
  document.querySelector('#back-builder').onclick=()=>{returnReview=false;go(1)};
  for(const s of ['context','communication','visual','taste']){
    document.querySelector(`#scope-${s}`).onchange=e=>{scope[s]=e.target.checked;refreshExport()};
  }
  document.querySelector('#show-md-preview').onclick=()=>{previewFormat='markdown';refreshExport()};
  document.querySelector('#show-token-preview').onclick=()=>{previewFormat='token';refreshExport()};

  document.querySelector('#copy').onclick=()=>copyText(asMarkdown(createExport(p,scope)),'Copied! Paste into ChatGPT, Claude, or Gemini.');
  document.querySelector('#copy-token').onclick=()=>{
    previewFormat='token';refreshExport();
    copyText(JSON.stringify(createTasteToken(p,{includeNeeds:scope.taste,includeVisual:scope.visual}),null,2),'Scoped Taste Token copied.');
  };
  document.querySelector('#copy-link').onclick=()=>{
    const url=encodeShareUrl(p);
    copyText(url,'Shareable Taste Token link copied! Anyone opening it loads this token.');
  };
  document.querySelector('#download-md').onclick=()=>download(asMarkdown(createExport(p,scope)),'aura-id-profile.md','text/markdown');
  document.querySelector('#download-json').onclick=()=>download(JSON.stringify(createExport(p,scope),null,2),'aura-id-profile.json','application/json');
  document.querySelector('#save').onclick=()=>{
    try{
      localStorage.setItem('aura-profile-v01',JSON.stringify(createExport(p,{context:true,communication:true,visual:true,taste:true})));
      toast('Saved in this browser.');
    }catch{
      toast('Browser storage unavailable. Download the JSON file instead.');
    }
  };
  document.querySelector('#forget').onclick=()=>{
    openDialog('Erase this profile?',`<p>This clears your current card and removes the saved copy from this browser.</p><div class="hero-actions"><button class="primary" id="confirm-forget">Erase profile</button><button class="secondary" id="cancel-forget">Cancel</button></div>`);
    document.querySelector('#cancel-forget').onclick=()=>dialog.close();
    document.querySelector('#confirm-forget').onclick=()=>{
      try{localStorage.removeItem('aura-profile-v01')}catch{}
      p=EMPTY();scope={context:true,communication:true,visual:true,taste:true};step=0;returnReview=false;dialog.close();home();toast('Profile erased.');
    };
  };

  let generic=false;
  document.querySelector('#mode-response').onclick=()=>{demoMode='response';generic=false;renderReview()};
  document.querySelector('#mode-store').onclick=()=>{demoMode='store';generic=false;renderReview()};
  document.querySelector('#compare').onclick=()=>{
    generic=!generic;
    demo(generic);
  };
  demo(false);
  refreshExport();
  tilt();
}

function demo(generic=false){
  const box=document.querySelector('#demo');
  box.dataset.demoTheme=generic?'light':p.theme==='dark'?'dark':p.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  box.dataset.demoDensity=generic?'focused':p.density||'focused';
  const heading=document.querySelector('#demo-heading');
  const promptEl=document.querySelector('#demo-prompt');
  const answerEl=document.querySelector('#answer');
  const noteEl=document.querySelector('#demo-note');
  const compareBtn=document.querySelector('#compare');

  if(demoMode==='store'){
    heading.textContent='When your agent visits a store for you';
    const hasTaste=Boolean(p.priority||p.taste||p.constraints||p.needs);
    const sampleProfile=hasTaste?p:{...EMPTY(),priority:'quality',taste:'Minimal & quiet, No big logos',constraints:'Shoe size EU 42, Sensitive knees',needs:'Running shoes for asphalt\nWarm dimmable desk lamp',actions:'ask'};
    const token=createTasteToken(sampleProfile,{includeNeeds:scope.taste,includeVisual:scope.visual});
    const matches=matchCatalog(token,SAMPLE_STORE_CATALOG);
    promptEl.textContent=generic
      ?'Without Taste Token: Store shows noisy promoted products'
      :`Sent to Store Agent: ${token.active_needs.length?`${token.active_needs.length} shopping item(s)`:'general browse'} · Priority: ${label(token.taste_vector.priority)||'Default'} · Your name & private context hidden`;
    const itemsToShow=generic?SAMPLE_STORE_CATALOG.slice(0,3):matches;
    answerEl.innerHTML=`<div class="a2a-grid">${itemsToShow.map(item=>`<div class="a2a-item"><div class="a2a-item-head"><span>${esc(item.name)}</span><span>${esc(item.price)}</span></div><p>${esc(item.summary)} (${esc(item.specs)})</p>${!generic&&item.reasons?.length?`<div class="a2a-reason">✓ Matched via Taste Token: ${esc(item.reasons.join(' · '))}</div>`:''}</div>`).join('')}</div>`;
    noteEl.textContent=generic
      ?'Without your Taste Token, you get generic bestsellers and loud branding that ignore your knees, size, or taste.'
      :`The store’s agent filtered ${SAMPLE_STORE_CATALOG.length} products down to ${matches.length} that match your Taste Token. Rule enforced: "${label(token.boundaries.actions)}".`;
    compareBtn.textContent=generic?'Show filtered by my Taste Token':'Compare with unfiltered store';
    return;
  }

  heading.textContent='How an AI assistant replies to you';
  promptEl.textContent='Example question: “How should I test a new product idea?”';
  let answer;
  if(generic){
    answer='There are several ways to test a new product idea. You could conduct market research, gather feedback, develop a prototype, and iterate based on what you learn.';
  }else{
    const intro=p.tone==='conversational'?'I’d start small: ':p.tone==='formal'?'Recommended approach: ':'';
    answer=p.length==='brief'
      ?`${intro}Build one small prototype. Observe people using it. Fix the biggest obstacle before adding features.`
      :p.length==='detailed'
      ?`${intro}Test the core workflow before expanding.\n\n1. Write down the specific task your product helps someone complete.\n2. Build the smallest prototype that supports that task.\n3. Ask prospective users to try it, without guiding each click.\n4. Record where they hesitate or need help.\n5. Fix the most consequential obstacle and test again.`
      :`${intro}Build a small prototype around one task. Ask prospective users to complete that task while you observe.\n\nUse the points where they hesitate to decide what to change next.`;
    if(p.challenge==='challenge')answer+='\n\nPushback: positive compliments alone will not tell you whether someone would actually use or pay for it.';
    if(p.challenge==='gentle')answer+='\n\nHelpful tip: ask people to try completing a task rather than just asking for their opinion.';
  }
  answerEl.textContent=answer;
  noteEl.textContent='Simulated locally from your reply style settings.';
  compareBtn.textContent=generic?'Show with my preferences':'Compare with a generic AI reply';
}

function refreshExport(){
  const exported=createExport(p,scope);
  const token=createTasteToken(p,{includeNeeds:scope.taste,includeVisual:scope.visual});
  document.querySelector('#preview-kind').textContent=previewFormat==='token'?'Scoped Taste Token JSON':'Markdown prompt';
  document.querySelector('#export-text').textContent=previewFormat==='token'?JSON.stringify(token,null,2):asMarkdown(exported);
  const hasSelected=Object.keys(exported.preferences).length>0;
  for(const id of ['copy','copy-token','copy-link','download-md','download-json']){
    const btn=document.querySelector(`#${id}`);
    if(btn)btn.disabled=!hasSelected;
  }
  document.querySelector('#export-error').textContent=hasSelected?'':'Pick at least one preference or tag before exporting.';
}

function download(text,name,type){
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`${name} downloaded.`);
}

if(!checkUrlToken())home();
