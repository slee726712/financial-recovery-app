import { createClient } from '@supabase/supabase-js';
import './style.css';
const app = document.getElementById('app');
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const configured = Boolean(url && key && /^https:\/\//.test(url));
const supabase = configured ? createClient(url, key, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }) : null;
// Recovery links may establish a session. Keep the recovery form visible until the password changes.
let recoveryMode = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery' || new URLSearchParams(location.search).get('type') === 'recovery';
let recoveryComplete = false;
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = v => typeof v === 'number' && Number.isFinite(v) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v) : 'Not verified';
const shell = body => `<div class="wrap"><header><div class="eyebrow">YOUR PRIVATE SPACE</div><h1>Financial Recovery <span>✳</span></h1><p>Clear decisions. A steadier future.</p></header>${body}<footer>Private beta · Confirmed and projected amounts are always kept separate.</footer></div>`;
function notice(message, type='info'){const el=app.querySelector('#notice');if(el){el.textContent=message;el.className='notice '+type;}}
function showAuth(){app.innerHTML=shell(`<section class="card auth"><div class="eyebrow">SECURE ACCESS</div><h2>Welcome back</h2><p>Sign in to view your financial records. No financial information is embedded in this application.</p>${configured?'':`<div class="notice warn">App configuration is not complete. Add the two Vercel environment variables before signing in.</div>`}<form id="login"><label>Email address<input id="email" type="email" autocomplete="email" required placeholder="you@example.com"/></label><label>Password<input id="password" type="password" autocomplete="current-password" minlength="6" required/></label><button ${configured?'':'disabled'} type="submit">Sign in securely</button></form><button class="textbtn" id="reset" ${configured?'':'disabled'} type="button">Email me a password reset link</button><div id="notice" class="notice" role="status" aria-live="polite"></div></section>`);app.querySelector('#login').addEventListener('submit',async e=>{e.preventDefault();const email=app.querySelector('#email').value.trim(),password=app.querySelector('#password').value;notice('Signing in…');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)notice(error.message,'warn');});app.querySelector('#reset').addEventListener('click',async()=>{const email=app.querySelector('#email').value.trim();if(!email){notice('Enter your email address first.','warn');return;}const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin});notice(error?error.message:'If this account exists, a reset email will arrive shortly.',error?'warn':'info');});}
function showRecovery(){
  app.innerHTML=shell(`<section class="card auth"><div class="eyebrow">ACCOUNT SECURITY</div><h2>Set a new password</h2><p>Your recovery link was accepted. Choose a new password to finish resetting your account.</p><form id="new-password-form"><label>New password<input id="new-password" type="password" autocomplete="new-password" minlength="12" required placeholder="At least 12 characters"/></label><label>Confirm new password<input id="confirm-password" type="password" autocomplete="new-password" minlength="12" required/></label><button id="save-password" type="submit">Save new password</button></form><div id="notice" class="notice" role="status" aria-live="polite"></div></section>`);
  app.querySelector('#new-password-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const password=app.querySelector('#new-password').value;
    const confirmation=app.querySelector('#confirm-password').value;
    if(password.length<12){notice('Use at least 12 characters.','warn');return;}
    if(password!==confirmation){notice('The passwords do not match.','warn');return;}
    const button=app.querySelector('#save-password');button.disabled=true;
    notice('Saving your new password…');
    try{
      const {data:{session},error:sessionError}=await supabase.auth.getSession();
      if(sessionError||!session){notice('This recovery session has expired. Request a new reset link from the sign-in screen.','warn');return;}
      const {error}=await supabase.auth.updateUser({password});
      if(error){notice(error.message,'warn');return;}
      recoveryComplete=true;recoveryMode=false;
      history.replaceState(null,'',location.pathname);
      await showDashboard(session);
      notice('Your password was updated successfully.','info');
    }catch(err){notice('Could not update your password. Please try again.','warn');}
    finally{if(button.isConnected)button.disabled=false;}
  });
}
async function showDashboard(session){
  const today = new Date().toISOString().slice(0,10);
  app.innerHTML=shell(`<div class="topline"><div><div class="eyebrow">SIGNED IN · ${escapeHtml(session.user.email)}</div><p class="micro">Your private recovery workspace</p></div><button class="textbtn" id="signout" type="button">Sign out</button></div>
  <nav class="tabs" aria-label="Command Center sections"><button class="tab active" data-tab="overview">Overview</button><button class="tab" data-tab="calendar">Cash flow</button><button class="tab" data-tab="obligations">Bills</button><button class="tab" data-tab="debts">Debts</button><button class="tab" data-tab="advances">DailyPay</button></nav>
  <div id="overview" class="panel"><div class="metrics"><section class="card"><div class="eyebrow">SAFE TO SPEND</div><div class="hero">Not verified</div><p>Bank balance is not discretionary cash. Reconcile deposits, commitments and essential living costs first.</p></section><section class="card"><div class="eyebrow">CONFIRMED CASH</div><div class="hero" id="confirmed-cash">Not verified</div><p>Accounts must be current and reconciled before we use balances for decisions.</p></section><section class="card"><div class="eyebrow">30-DAY OUTLOOK</div><div class="hero" id="outlook">Loading…</div><p id="outlook-note">Projections are not deposits.</p></section></div><div class="grid"><section class="card"><div class="eyebrow">UPCOMING</div><h2>Next obligations</h2><div id="upcoming">Loading…</div></section><section class="card"><div class="eyebrow">INCOME</div><h2>Expected vs received</h2><div id="income-summary">Loading…</div></section></div></div>
  <div id="calendar" class="panel" hidden><section class="card"><div class="eyebrow">ROLLING FORECAST</div><h2>Next 30 days</h2><p>Forecast lists expected money separately from confirmed receipts. It does not assume pending deposits have arrived.</p><div id="cashflow">Loading…</div></section></div>
  <div id="obligations" class="panel" hidden><section class="card"><div class="eyebrow">PRIORITY FIRST</div><h2>Bills & commitments</h2><div id="bills">Loading…</div><h3>Add a bill or commitment</h3><form id="bill-form" class="inline-form"><label>Description<input name="title" required maxlength="100" placeholder="e.g. Electricity"/></label><label>Amount ($)<input name="amount" type="number" min="0" step="0.01" required/></label><label>Due date<input name="due_date" type="date" required value="${today}"/></label><label>Priority<select name="priority"><option value="critical">Critical</option><option value="high">High</option><option value="normal" selected>Normal</option><option value="low">Low</option></select></label><label class="checkline"><input name="is_estimate" type="checkbox"/> Estimated amount</label><button type="submit">Save commitment</button></form></section></div>
  <div id="debts" class="panel" hidden><section class="card"><div class="eyebrow">RECOVERY INVENTORY</div><h2>Debt overview</h2><p>Balances and arrears may be outdated. Prioritize consequences and creditor arrangements before extra payments.</p><div id="debt-list">Loading…</div></section></div>
  <div id="advances" class="panel" hidden><section class="card"><div class="eyebrow">EXIT THE CYCLE</div><h2>DailyPay advances</h2><p>Advances are early access to wages, <strong>not additional income</strong>. We track deductions without counting the advance as a second paycheck.</p><div id="advance-list">Loading…</div><h3>Record an advance</h3><form id="advance-form" class="inline-form"><label>Advance amount ($)<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Fee ($)<input name="fee" type="number" min="0" step="0.01" value="0" required/></label><label>Date received<input name="advanced_on" type="date" required value="${today}"/></label><label>Paycheck deduction date<input name="deducted_from_pay_date" type="date" required/></label><button type="submit">Save confirmed advance</button></form></section></div>
  <div id="notice" class="notice" role="status" aria-live="polite"></div>`);
  app.querySelector('#signout').addEventListener('click',()=>supabase.auth.signOut());
  app.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{app.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===btn));app.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==btn.dataset.tab);}));
  const records={};
  async function refresh(){
    const names=['recovery_obligations','recovery_income','recovery_debts','recovery_advances'];
    const results=await Promise.all(names.map(name=>supabase.from(name).select('*').eq('user_id',session.user.id).limit(500)));
    names.forEach((name,i)=>records[name]=results[i].error?null:results[i].data);
    const errors=results.flatMap((r,i)=>r.error?[names[i]+': '+r.error.message]:[]);
    if(errors.length)notice('Some information could not be loaded: '+errors.join(' · '),'warn');
    const obligations=records.recovery_obligations||[],income=records.recovery_income||[],debts=records.recovery_debts||[],advances=records.recovery_advances||[];
    const end=new Date();end.setDate(end.getDate()+30);const endDate=end.toISOString().slice(0,10);
    const upcoming=obligations.filter(x=>x.due_date>=today&&x.due_date<=endDate&&!['paid','cancelled'].includes(x.status)).sort((a,b)=>a.due_date.localeCompare(b.due_date));
    const future=income.filter(x=>x.expected_date>=today&&x.expected_date<=endDate&&x.status==='projected');
    const received=income.filter(x=>x.received_date>=today&&x.received_date<=endDate&&x.status==='confirmed');
    const fmt=money;
    const list=(items,fn,empty)=>items.length?items.map(fn).join(''):`<p class="muted">${empty}</p>`;
    const row=(label,sub,value)=>`<div class="item"><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(sub)}</small></div><strong>${escapeHtml(value)}</strong></div>`;
    app.querySelector('#upcoming').innerHTML=list(upcoming.slice(0,7),x=>row(x.title,x.due_date+' · '+x.priority+(x.is_estimate?' · estimate':''),fmt(Number(x.amount))),'No upcoming obligations recorded. This does not mean there are no bills.');
    const expectedTotal=future.reduce((s,x)=>s+Number(x.amount),0),dueTotal=upcoming.reduce((s,x)=>s+Number(x.amount),0);
    app.querySelector('#outlook').textContent=fmt(expectedTotal-dueTotal);
    app.querySelector('#outlook-note').textContent='Projected income minus recorded unpaid commitments only. Excludes unrecorded essentials, loan timing differences, and starting cash. Not safe to spend.';
    app.querySelector('#income-summary').innerHTML=row('Confirmed received in next/last 30-day window','Recorded receipts only',fmt(received.reduce((s,x)=>s+Number(x.amount),0)))+row('Expected, not received','Do not count as available cash',fmt(expectedTotal));
    const events=[...upcoming.map(x=>({date:x.due_date,label:x.title,amount:-Number(x.amount),type:'Bill'})),...future.map(x=>({date:x.expected_date,label:x.title,amount:Number(x.amount),type:'Projected income'}))].sort((a,b)=>a.date.localeCompare(b.date));
    app.querySelector('#cashflow').innerHTML=list(events,x=>row(x.label,x.date+' · '+x.type,(x.amount>=0?'+':'−')+fmt(Math.abs(x.amount))),'No projected events yet. Add obligations and expected income in Supabase or the app.');
    app.querySelector('#bills').innerHTML=list([...obligations].sort((a,b)=>a.due_date.localeCompare(b.due_date)),x=>row(x.title,x.due_date+' · '+x.status+(x.is_estimate?' · estimate':''),fmt(Number(x.amount))),'No commitments entered yet.');
    app.querySelector('#debt-list').innerHTML=list(debts,x=>row(x.creditor,x.status+' · Past due '+(x.past_due==null?'unknown':fmt(Number(x.past_due))),x.balance==null?'Unverified':fmt(Number(x.balance))),'No debt records imported yet.');
    const byPay=new Map();advances.filter(x=>x.status!=='planned').forEach(x=>{const k=x.deducted_from_pay_date||'Unassigned paycheck';byPay.set(k,(byPay.get(k)||0)+Number(x.amount)+Number(x.fee||0));});
    app.querySelector('#advance-list').innerHTML=list([...byPay.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),([d,n])=>row('Paycheck '+d,'Advance deductions including fees',fmt(n)),'No confirmed advances recorded yet.');
  }
  app.querySelector('#bill-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;const d=new FormData(f);const payload={user_id:session.user.id,title:String(d.get('title')).trim(),amount:Number(d.get('amount')),due_date:String(d.get('due_date')),priority:String(d.get('priority')),is_estimate:d.has('is_estimate')};if(!payload.title||!Number.isFinite(payload.amount)||payload.amount<0){notice('Enter a valid commitment.','warn');return;}const b=f.querySelector('button');b.disabled=true;const {error}=await supabase.from('recovery_obligations').insert(payload);b.disabled=false;if(error)notice('Could not save: '+error.message,'warn');else{f.reset();notice('Commitment saved.');await refresh();}});
  app.querySelector('#advance-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,d=new FormData(f);const payload={user_id:session.user.id,amount:Number(d.get('amount')),fee:Number(d.get('fee')),advanced_on:String(d.get('advanced_on')),deducted_from_pay_date:String(d.get('deducted_from_pay_date')),status:'confirmed'};if(!Number.isFinite(payload.amount)||payload.amount<=0||!Number.isFinite(payload.fee)||payload.fee<0){notice('Enter valid advance amounts.','warn');return;}const b=f.querySelector('button');b.disabled=true;const {error}=await supabase.from('recovery_advances').insert(payload);b.disabled=false;if(error)notice('Could not save: '+error.message,'warn');else{f.reset();notice('Advance recorded. Remember to reconcile the paycheck net amount.');await refresh();}});
  await refresh();
}
async function start(){
  if(!configured){showAuth();return;}
  // Register before getSession, so the PASSWORD_RECOVERY event is not missed.
  supabase.auth.onAuthStateChange((event,newSession)=>{
    if(event==='PASSWORD_RECOVERY') recoveryMode=true;
    if(recoveryComplete && event==='USER_UPDATED') return;
    // Supabase recommends deferring asynchronous auth-dependent work from this callback.
    setTimeout(()=>{
      if(recoveryComplete && event==='USER_UPDATED') return;
      if(recoveryMode){showRecovery();return;}
      if(newSession) showDashboard(newSession);
      else showAuth();
    },0);
  });
  try{
    const {data:{session},error}=await supabase.auth.getSession();
    if(error){showAuth();notice(error.message,'warn');return;}
    if(recoveryMode){showRecovery();return;}
    if(session)await showDashboard(session);else showAuth();
  }catch(err){showAuth();notice('Could not connect to sign-in. Please refresh and try again.','warn');}
}
start();
