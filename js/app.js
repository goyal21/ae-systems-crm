// ═══════════════════════════════════════════════
//  AE SYSTEMS CRM — MAIN APP
// ═══════════════════════════════════════════════

const App = (() => {

  // ── LOCAL STATE ──
  let leads = [];
  let stages = [
    { id: 's1', name: 'Lead',       color: '#8892a4', order: 1 },
    { id: 's2', name: 'Qualified',  color: '#4f8ef7', order: 2 },
    { id: 's3', name: 'Demo Done',  color: '#9b6dff', order: 3 },
    { id: 's4', name: 'POC',        color: '#f5a623', order: 4 },
    { id: 's5', name: 'Proposal',   color: '#00d4aa', order: 5 },
    { id: 's6', name: 'Closed Won', color: '#2dd4a0', order: 6 },
    { id: 's7', name: 'Closed Lost',color: '#ff4d6d', order: 7 },
  ];
  let opTypes = [
    { id: 'ot1', name: 'HVAC / BMS (SAAR)', color: '#00d4aa', desc: 'SAAR BMS energy optimization' },
    { id: 'ot2', name: 'IT Infrastructure',  color: '#4f8ef7', desc: 'End user, network, data center' },
    { id: 'ot3', name: 'ELV / CCTV / Fire',  color: '#f5a623', desc: 'Surveillance, telephony, alarms' },
  ];

  let currentView   = 'dashboard';
  let editingLeadId = null;
  let editingStageId   = null;
  let editingOpTypeId  = null;
  let aiLeadId      = null;
  let filterType    = 'all';
  let filterOwner   = 'all';
  let viewMode      = 'table';
  let selStageColor = '#00d4aa';
  let selOtColor    = '#00d4aa';
  let loading       = false;

  // ── PERSISTENCE (stages + opTypes in localStorage) ──
  function persistSettings() {
    localStorage.setItem('ae_crm_stages',  JSON.stringify(stages));
    localStorage.setItem('ae_crm_optypes', JSON.stringify(opTypes));
  }
  function loadSettings() {
    try {
      const s = localStorage.getItem('ae_crm_stages');
      const o = localStorage.getItem('ae_crm_optypes');
      if (s) stages  = JSON.parse(s);
      if (o) opTypes = JSON.parse(o);
    } catch(e) {}
  }

  // ── HELPERS ──
  function uid() { return '_' + Math.random().toString(36).substr(2,9); }
  function sortedStages() { return [...stages].sort((a,b) => a.order - b.order); }
  function fmtVal(v) {
    v = parseFloat(v) || 0;
    if (v >= 10000000) return (v/10000000).toFixed(1)+'Cr';
    if (v >= 100000)   return (v/100000).toFixed(1)+'L';
    if (v >= 1000)     return (v/1000).toFixed(0)+'K';
    return v.toString();
  }
  function now() { return new Date().toISOString(); }

  function toast(msg, type='success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast show ${type}`;
    setTimeout(() => t.className = 'toast', 2500);
  }

  // ── TAG RENDERERS ──
  function typeTag(typeName) {
    const ot = opTypes.find(x => x.name === typeName);
    const c = ot ? ot.color : '#8892a4';
    return `<span class="tag" style="background:${c}22;color:${c}">${typeName||'—'}</span>`;
  }
  function stageChip(stageName) {
    const st = stages.find(x => x.name === stageName);
    const c = st ? st.color : '#8892a4';
    return `<span class="badge-stage" style="background:${c}18;color:${c};border-color:${c}44">${stageName||'—'}</span>`;
  }
  function priorityTag(p) {
    const map = {
      hot:  ['var(--red-dim)',   'var(--red)',   '🔥 Hot'],
      warm: ['var(--amber-dim)', 'var(--amber)', '🌤 Warm'],
      cold: ['var(--blue-dim)',  'var(--text3)', '❄️ Cold'],
    };
    const s = map[p] || map.warm;
    return `<span class="tag" style="background:${s[0]};color:${s[1]}">${s[2]}</span>`;
  }
  function ownerDisplay(email) {
    const f = AE_CONFIG.FOUNDERS.find(x => x.email.toLowerCase() === (email||'').toLowerCase());
    if (!f) return email || '—';
    // Show first 2 words so "Amit S (Srivastava)" shows as "Amit S"
return f.name;  }

  // ── INIT ──
  async function init() {
    loadSettings();
    Auth.init();
    if (Auth.isLoggedIn()) {
      showApp();
      await refreshLeads();
    } else {
      showLogin();
    }
  }

  let googleInitDone = false;
  function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
    if (googleInitDone) return;
    // Init Google Sign-In button — only once
    if (window.google?.accounts?.id) {
      googleInitDone = true;
      google.accounts.id.initialize({
        client_id: AE_CONFIG.GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      });
      google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'outline', size: 'large', width: 320, text: 'signin_with' }
      );
    } else {
      // GSI script not yet loaded — retry after short delay
      setTimeout(() => { googleInitDone = false; showLogin(); }, 800);
    }
  }

  function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    const user = Auth.getUser();
    if (user) {
      document.getElementById('sidebar-user-name').textContent  = user.name;
      document.getElementById('sidebar-user-email').textContent = user.email;
      const av = document.getElementById('sidebar-avatar');
      if (user.picture) av.innerHTML = `<img src="${user.picture}" alt="">`;
      else av.textContent = user.initials || '?';
    }
    updateCounts();
    render();
    document.getElementById('db-link').href = AE_CONFIG.SHEET_URL || '#';
  }

  function onLogin()  { showApp(); refreshLeads(); }
  function onLogout() { leads = []; showLogin(); }

  // ── LEADS (Google Sheets) ──
  async function refreshLeads() {
    setLoading(true);
    try {
      await Sheets.ensureHeaders();
      leads = await Sheets.readAll();
    } catch(e) {
      toast('Could not load leads from Google Sheets. Check config.', 'error');
    }
    setLoading(false);
    updateCounts();
    render();
  }

  function setLoading(v) {
    loading = v;
    const btn = document.getElementById('btn-refresh');
    if (btn) btn.innerHTML = v ? '<span class="spinner"></span>' : '↻ Refresh';
  }

  // ── NAV ──
  function showView(v) {
    currentView = v;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const nav = document.getElementById('nav-' + v);
    if (nav) nav.classList.add('active');
    updateCounts();
    render();
  }

  function updateCounts() {
    const active = leads.filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost').length;
    const el1 = document.getElementById('nav-pipeline-count');
    const el2 = document.getElementById('nav-leads-count');
    if (el1) el1.textContent = active;
    if (el2) el2.textContent = leads.length;
  }

  function render() {
    const c = document.getElementById('content');
    if (!c) return;
    const titles = {
      dashboard: 'Dashboard <span>Overview</span>',
      pipeline:  'Pipeline <span>Board</span>',
      leads:     'All <span>Leads</span>',
      settings:  'Settings <span>& Config</span>',
    };
    document.getElementById('topbar-title').innerHTML = titles[currentView] || '';
    if (currentView === 'dashboard') c.innerHTML = renderDashboard();
    else if (currentView === 'pipeline') c.innerHTML = renderPipeline();
    else if (currentView === 'leads')    c.innerHTML = renderLeads();
    else if (currentView === 'settings') c.innerHTML = renderSettings();
  }

  // ── DASHBOARD ──
  function renderDashboard() {
    const total       = leads.length;
    const active      = leads.filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost').length;
    const won         = leads.filter(l => l.stage === 'Closed Won').length;
    const pipelineVal = leads.filter(l => l.stage !== 'Closed Lost').reduce((s,l) => s + (parseFloat(l.value)||0), 0);
    const recent      = [...leads].sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,6);

    return `
    <div class="stats-grid">
      <div class="stat-card c-teal"><div class="stat-label">Total Opportunities</div><div class="stat-value">${total}</div><div class="stat-sub">All time</div></div>
      <div class="stat-card c-blue"><div class="stat-label">Active in Pipeline</div><div class="stat-value">${active}</div><div class="stat-sub">Excluding closed</div></div>
      <div class="stat-card c-amber"><div class="stat-label">Pipeline Value</div><div class="stat-value">₹${fmtVal(pipelineVal)}</div><div class="stat-sub">Estimated potential</div></div>
      <div class="stat-card c-purple"><div class="stat-label">Closed Won</div><div class="stat-value">${won}</div><div class="stat-sub">Converted</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
      <div>
        <div class="section-header"><h2>Recent Leads</h2><button class="btn btn-ghost btn-sm" onclick="App.openAddLead()">＋ Add</button></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
          ${recent.length === 0 ? `<div class="empty-state"><div class="empty-icon">◉</div><p>No leads yet.</p></div>` :
            recent.map(l => `
            <div style="padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s"
                 onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''"
                 onclick="App.openDetail('${l.id}')">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <div style="font-family:var(--font-head);font-size:13px;font-weight:700;flex:1">${l.contact}</div>
                ${stageChip(l.stage)}
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="font-size:11px;color:var(--text3);flex:1">${l.company}${l.city?' · '+l.city:''}</div>
                ${typeTag(l.type)}
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div>
        <div class="section-header"><h2>Stage Breakdown</h2></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:flex;flex-direction:column;gap:12px">
          ${sortedStages().map(st => {
            const cnt = leads.filter(l => l.stage === st.name).length;
            const pct = total ? Math.round(cnt/total*100) : 0;
            return `<div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
                <div style="font-size:12px;font-weight:600;color:var(--text2);display:flex;align-items:center;gap:6px">
                  <span style="width:7px;height:7px;border-radius:50%;background:${st.color};display:inline-block"></span>${st.name}
                </div>
                <div style="font-size:12px;font-weight:700;color:var(--text3)">${cnt}</div>
              </div>
              <div style="height:4px;background:var(--surface3);border-radius:10px">
                <div style="height:100%;width:${pct}%;background:${st.color};border-radius:10px"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  // ── PIPELINE ──
  function renderPipeline() {
    return `<div class="pipeline-wrap">
      ${sortedStages().map(st => {
        const stLeads = leads.filter(l => l.stage === st.name);
        return `<div class="pipeline-col">
          <div class="pipeline-col-head">
            <div class="stage-dot" style="background:${st.color}"></div>
            <div class="stage-name-label">${st.name}</div>
            <div class="stage-count">${stLeads.length}</div>
          </div>
          <div class="pipeline-col-body">
            ${stLeads.length === 0
              ? `<div style="color:var(--text3);font-size:12px;text-align:center;padding:16px 0">No leads</div>`
              : stLeads.map(l => `
              <div class="lead-card" onclick="App.openDetail('${l.id}')">
                <div class="lead-name">${l.contact}</div>
                <div class="lead-company">${l.company}${l.city?' · '+l.city:''}</div>
                <div class="lead-meta">
                  ${typeTag(l.type)}
                  ${priorityTag(l.priority)}
                  ${l.value ? `<div style="font-size:11px;color:var(--teal);font-weight:700;margin-left:auto">₹${fmtVal(parseFloat(l.value))}</div>` : ''}
                </div>
                ${l.assignedTo ? `<div class="lead-owner">👤 ${ownerDisplay(l.assignedTo)}</div>` : ''}
              </div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  // ── ALL LEADS ──
  function renderLeads() {
    const types  = ['all', ...opTypes.map(t => t.name)];
    const owners = ['all', ...AE_CONFIG.FOUNDERS.map(f => f.email)];
    let filtered = leads;
    if (filterType  !== 'all') filtered = filtered.filter(l => l.type === filterType);
    if (filterOwner !== 'all') filtered = filtered.filter(l => (l.assignedTo||'').toLowerCase() === filterOwner.toLowerCase());

    return `
    <div class="filters-bar">
      <div style="display:flex;gap:6px;flex-wrap:wrap;flex:1">
        ${types.map(t => `<div class="filter-chip ${filterType===t?'active':''}" onclick="App.setFilter('type','${t}')">${t==='all'?'All Types':t}</div>`).join('')}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${AE_CONFIG.FOUNDERS.map(f => `<div class="filter-chip ${filterOwner===f.email?'active':''}" onclick="App.setFilter('owner','${f.email}')">${ownerDisplay(f.email)}</div>`).join('')}
        <div class="filter-chip ${filterOwner==='all'?'active':''}" onclick="App.setFilter('owner','all')">Everyone</div>
      </div>
      <div class="view-toggle">
        <div class="view-btn ${viewMode==='table'?'active':''}" onclick="App.setViewMode('table')">☰ Table</div>
        <div class="view-btn ${viewMode==='grid'?'active':''}" onclick="App.setViewMode('grid')">⊞ Grid</div>
      </div>
    </div>

    ${filtered.length === 0
      ? `<div class="empty-state"><div class="empty-icon">◉</div><p>No leads found.</p></div>`
      : viewMode === 'table'
        ? `<div class="table-wrap"><table>
            <thead><tr>
              <th>Contact / Company</th><th>Type</th><th>Stage</th>
              <th>Priority</th><th>Value</th><th>Assigned To</th><th>City</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${filtered.map(l => `
              <tr onclick="App.openDetail('${l.id}')">
                <td class="primary"><div style="font-weight:700">${l.contact}</div><div style="font-size:11px;color:var(--text3)">${l.company}</div></td>
                <td>${typeTag(l.type)}</td>
                <td>${stageChip(l.stage)}</td>
                <td>${priorityTag(l.priority)}</td>
                <td style="color:var(--teal);font-weight:700">${l.value?'₹'+fmtVal(parseFloat(l.value)):'—'}</td>
                <td style="font-size:12px">${ownerDisplay(l.assignedTo)}</td>
                <td style="font-size:12px;color:var(--text3)">${l.city||'—'}</td>
                <td onclick="event.stopPropagation()"><div style="display:flex;gap:5px">
                  <button class="btn btn-ghost btn-sm" onclick="App.openEditLead('${l.id}')">✎</button>
                  <button class="btn btn-ai btn-sm" onclick="App.openAI('${l.id}')">✦</button>
                  <button class="btn btn-danger btn-sm" onclick="App.deleteLead('${l.id}')">✕</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table></div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
            ${filtered.map(l => `
            <div class="lead-card" onclick="App.openDetail('${l.id}')">
              <div class="lead-name">${l.contact}</div>
              <div class="lead-company">${l.company}${l.city?' · '+l.city:''}</div>
              <div class="lead-meta" style="margin-bottom:8px">
                ${typeTag(l.type)} ${priorityTag(l.priority)} ${stageChip(l.stage)}
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="font-size:12px;color:var(--teal);font-weight:700">${l.value?'₹'+fmtVal(parseFloat(l.value)):''}</div>
                <div style="display:flex;gap:5px" onclick="event.stopPropagation()">
                  <button class="btn btn-ghost btn-sm" onclick="App.openEditLead('${l.id}')">✎</button>
                  <button class="btn btn-ai btn-sm" onclick="App.openAI('${l.id}')">✦</button>
                </div>
              </div>
              ${l.assignedTo ? `<div style="font-size:10px;color:var(--text3);margin-top:6px">👤 ${ownerDisplay(l.assignedTo)}</div>` : ''}
            </div>`).join('')}
          </div>`}`;
  }

  // ── SETTINGS ──
  function renderSettings() {
    return `<div style="max-width:680px">
      <div class="settings-section">
        <div class="settings-head"><div class="settings-head-title">Pipeline Stages</div>
          <button class="btn btn-primary btn-sm" onclick="App.openAddStage()">＋ Add Stage</button></div>
        <div class="settings-body">
          ${sortedStages().map(st => `
          <div class="settings-item">
            <div class="item-color" style="background:${st.color}"></div>
            <div class="item-name">${st.name}</div>
            <div style="font-size:11px;color:var(--text3);margin-right:8px">Order ${st.order}</div>
            <div class="item-actions">
              <button class="btn btn-ghost btn-sm" onclick="App.openEditStage('${st.id}')">✎</button>
              <button class="btn btn-danger btn-sm" onclick="App.deleteStage('${st.id}')">✕</button>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-head"><div class="settings-head-title">Opportunity Types</div>
          <button class="btn btn-primary btn-sm" onclick="App.openAddOpType()">＋ Add Type</button></div>
        <div class="settings-body">
          ${opTypes.map(ot => `
          <div class="settings-item">
            <div class="item-color" style="background:${ot.color}"></div>
            <div class="item-name">${ot.name}</div>
            <div style="font-size:11px;color:var(--text3);flex:1">${ot.desc||''}</div>
            <div class="item-actions">
              <button class="btn btn-ghost btn-sm" onclick="App.openEditOpType('${ot.id}')">✎</button>
              <button class="btn btn-danger btn-sm" onclick="App.deleteOpType('${ot.id}')">✕</button>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-head"><div class="settings-head-title">Team Members</div></div>
        <div class="settings-body">
          ${AE_CONFIG.FOUNDERS.map(f => `
          <div class="settings-item">
            <div class="item-color" style="background:var(--teal)"></div>
            <div class="item-name">${f.name}</div>
            <div style="font-size:11px;color:var(--text3)">${f.email}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-head"><div class="settings-head-title">Data</div></div>
        <div class="settings-body">
          <div style="font-size:13px;color:var(--text2)">Total leads: <b style="color:var(--text)">${leads.length}</b></div>
          <div style="font-size:13px;color:var(--text2)">Data stored in: <b style="color:var(--teal)">Google Sheets</b></div>
          <button class="btn btn-ghost btn-sm" onclick="App.refreshLeads()">↻ Sync from Sheets</button>
        </div>
      </div>
    </div>`;
  }

  // ── LEAD DETAIL ──
  function openDetail(id) {
    const l = leads.find(x => x.id === id);
    if (!l) return;
    document.getElementById('detail-title').textContent = `${l.contact} — ${l.company}`;
    document.getElementById('detail-body').innerHTML = `
      <div class="detail-grid" style="margin-bottom:16px">
        <div class="detail-item"><div class="detail-label">Type</div><div class="detail-value">${typeTag(l.type)}</div></div>
        <div class="detail-item"><div class="detail-label">Stage</div><div class="detail-value">${stageChip(l.stage)}</div></div>
        <div class="detail-item"><div class="detail-label">Priority</div><div class="detail-value">${priorityTag(l.priority)}</div></div>
        <div class="detail-item"><div class="detail-label">Value</div><div class="detail-value" style="color:var(--teal);font-weight:700">${l.value?'₹'+fmtVal(parseFloat(l.value)):'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${l.phone||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${l.email||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">City</div><div class="detail-value">${l.city||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Source</div><div class="detail-value">${l.source||'—'}</div></div>
        <div class="detail-item"><div class="detail-label">Assigned To</div><div class="detail-value">${ownerDisplay(l.assignedTo)}</div></div>
        <div class="detail-item"><div class="detail-label">Created By</div><div class="detail-value">${ownerDisplay(l.createdBy)}</div></div>
      </div>
      ${l.notes ? `<div class="form-group" style="margin-bottom:16px"><label>Notes</label><div class="detail-notes">${l.notes}</div></div>` : ''}
      <div class="form-group">
        <label>Move Stage</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${sortedStages().map(st => `<button class="btn btn-ghost btn-sm"
            style="${l.stage===st.name?'border-color:'+st.color+';color:'+st.color+';':''}border-left:3px solid ${st.color}"
            onclick="App.moveStage('${l.id}','${st.name}')">${st.name}</button>`).join('')}
        </div>
      </div>`;
    document.getElementById('detail-footer').innerHTML = `
      <button class="btn btn-ai" onclick="closeModal('modal-detail');App.openAI('${l.id}')">✦ AI Assist</button>
      <button class="btn btn-ghost" onclick="closeModal('modal-detail');App.openEditLead('${l.id}')">✎ Edit</button>
      <button class="btn btn-danger" onclick="closeModal('modal-detail');App.deleteLead('${l.id}')">Delete</button>`;
    document.getElementById('modal-detail').classList.remove('hidden');
  }

  async function moveStage(id, stage) {
    const l = leads.find(x => x.id === id);
    if (!l) return;
    l.stage = stage;
    l.updatedAt = now();
    await Sheets.updateRow(l);
    openDetail(id);
    render();
    toast(`Moved to ${stage}`);
  }

  // ── ADD / EDIT LEAD ──
  function populateLeadForm() {
    const ts = document.getElementById('f-type');
    ts.innerHTML = opTypes.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
    const ss = document.getElementById('f-stage');
    ss.innerHTML = sortedStages().map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    const as = document.getElementById('f-assigned');
    as.innerHTML = `<option value="">Unassigned</option>` +
      AE_CONFIG.FOUNDERS.map(f => `<option value="${f.email}">${f.name}</option>`).join('');
  }

  function openAddLead() {
    editingLeadId = null;
    document.getElementById('lead-modal-title').textContent = 'New Opportunity';
    ['contact','company','phone','email','value','source','city','notes'].forEach(f => {
      const el = document.getElementById('f-'+f);
      if (el) el.value = '';
    });
    populateLeadForm();
    // Default assign to current user
    const u = Auth.getUser();
    if (u) document.getElementById('f-assigned').value = u.email;
    document.getElementById('modal-lead').classList.remove('hidden');
  }

  function openEditLead(id) {
    editingLeadId = id;
    const l = leads.find(x => x.id === id);
    if (!l) return;
    document.getElementById('lead-modal-title').textContent = 'Edit Opportunity';
    populateLeadForm();
    ['contact','company','phone','email','priority','value','source','city','notes'].forEach(f => {
      const el = document.getElementById('f-'+f);
      if (el) el.value = l[f] || '';
    });
    document.getElementById('f-type').value     = l.type;
    document.getElementById('f-stage').value    = l.stage;
    document.getElementById('f-assigned').value = l.assignedTo || '';
    document.getElementById('modal-lead').classList.remove('hidden');
  }

  async function saveLead() {
    const contact = document.getElementById('f-contact').value.trim();
    const company = document.getElementById('f-company').value.trim();
    if (!contact || !company) { toast('Contact and company are required.', 'error'); return; }

    const btn = document.querySelector('#modal-lead .btn-primary');
    btn.innerHTML = '<span class="spinner"></span> Saving…';
    btn.disabled = true;

    const user = Auth.getUser();
    const data = {
      contact, company,
      phone:      document.getElementById('f-phone').value.trim(),
      email:      document.getElementById('f-email').value.trim(),
      type:       document.getElementById('f-type').value,
      stage:      document.getElementById('f-stage').value,
      priority:   document.getElementById('f-priority').value,
      value:      document.getElementById('f-value').value.trim(),
      source:     document.getElementById('f-source').value.trim(),
      city:       document.getElementById('f-city').value.trim(),
      assignedTo: document.getElementById('f-assigned').value,
      notes:      document.getElementById('f-notes').value.trim(),
      updatedAt:  now(),
    };

    let ok;
    if (editingLeadId) {
      const i = leads.findIndex(x => x.id === editingLeadId);
      if (i >= 0) {
        leads[i] = { ...leads[i], ...data };
        ok = await Sheets.updateRow(leads[i]);
      }
    } else {
      const newLead = { id: uid(), createdAt: now(), createdBy: user?.email || '', ...data };
      leads.push(newLead);
      ok = await Sheets.appendRow(newLead);
    }

    btn.innerHTML = 'Save Opportunity';
    btn.disabled = false;
    closeModal('modal-lead');
    updateCounts();
    render();
    toast(ok ? '✓ Lead saved to Google Sheets' : 'Saved locally (Sheets sync failed)', ok ? 'success' : 'error');
  }

  async function deleteLead(id) {
    if (!confirm('Delete this lead? It will be removed from Google Sheets.')) return;
    leads = leads.filter(x => x.id !== id);
    await Sheets.deleteRow(id);
    updateCounts();
    render();
    toast('Lead deleted');
  }

  // ── STAGE MGMT ──
  function openAddStage() {
    editingStageId = null;
    document.getElementById('stage-modal-title').textContent = 'Add Pipeline Stage';
    document.getElementById('s-name').value  = '';
    document.getElementById('s-order').value = sortedStages().length + 1;
    selStageColor = '#00d4aa';
    resetSwatches('stage-colors');
    document.getElementById('modal-stage').classList.remove('hidden');
  }
  function openEditStage(id) {
    editingStageId = id;
    const st = stages.find(x => x.id === id);
    if (!st) return;
    document.getElementById('stage-modal-title').textContent = 'Edit Stage';
    document.getElementById('s-name').value  = st.name;
    document.getElementById('s-order').value = st.order;
    selStageColor = st.color;
    resetSwatches('stage-colors', st.color);
    document.getElementById('modal-stage').classList.remove('hidden');
  }
  function saveStage() {
    const name = document.getElementById('s-name').value.trim();
    if (!name) { toast('Stage name required', 'error'); return; }
    const order = parseInt(document.getElementById('s-order').value) || sortedStages().length + 1;
    if (editingStageId) {
      const i = stages.findIndex(x => x.id === editingStageId);
      if (i >= 0) stages[i] = { ...stages[i], name, color: selStageColor, order };
    } else {
      stages.push({ id: uid(), name, color: selStageColor, order });
    }
    persistSettings();
    closeModal('modal-stage');
    render();
    toast('Stage saved');
  }
  function deleteStage(id) {
    if (stages.length <= 1) { toast('Need at least one stage', 'error'); return; }
    if (!confirm('Delete stage?')) return;
    const st = stages.find(x => x.id === id);
    if (st) leads.forEach(l => { if (l.stage === st.name) l.stage = sortedStages()[0].name; });
    stages = stages.filter(x => x.id !== id);
    persistSettings();
    render();
  }

  // ── OPTYPE MGMT ──
  function openAddOpType() {
    editingOpTypeId = null;
    document.getElementById('optype-modal-title').textContent = 'Add Opportunity Type';
    document.getElementById('ot-name').value = '';
    document.getElementById('ot-desc').value = '';
    selOtColor = '#00d4aa';
    resetSwatches('optype-colors');
    document.getElementById('modal-optype').classList.remove('hidden');
  }
  function openEditOpType(id) {
    editingOpTypeId = id;
    const ot = opTypes.find(x => x.id === id);
    if (!ot) return;
    document.getElementById('optype-modal-title').textContent = 'Edit Type';
    document.getElementById('ot-name').value = ot.name;
    document.getElementById('ot-desc').value = ot.desc || '';
    selOtColor = ot.color;
    resetSwatches('optype-colors', ot.color);
    document.getElementById('modal-optype').classList.remove('hidden');
  }
  function saveOpType() {
    const name = document.getElementById('ot-name').value.trim();
    if (!name) { toast('Type name required', 'error'); return; }
    const desc = document.getElementById('ot-desc').value.trim();
    if (editingOpTypeId) {
      const i = opTypes.findIndex(x => x.id === editingOpTypeId);
      if (i >= 0) opTypes[i] = { ...opTypes[i], name, color: selOtColor, desc };
    } else {
      opTypes.push({ id: uid(), name, color: selOtColor, desc });
    }
    persistSettings();
    closeModal('modal-optype');
    render();
    toast('Type saved');
  }
  function deleteOpType(id) {
    if (opTypes.length <= 1) { toast('Need at least one type', 'error'); return; }
    if (!confirm('Delete type?')) return;
    opTypes = opTypes.filter(x => x.id !== id);
    persistSettings();
    render();
  }

  // ── COLOR SWATCHES ──
  function resetSwatches(containerId, selected) {
    document.querySelectorAll(`#${containerId} .color-swatch`).forEach(s => {
      s.classList.toggle('selected', selected ? s.dataset.color === selected : false);
    });
    if (!selected) {
      const first = document.querySelector(`#${containerId} .color-swatch`);
      if (first) first.classList.add('selected');
    }
  }

  // ── AI ASSIST ──
  function openAI(id) {
    aiLeadId = id;
    const l = leads.find(x => x.id === id);
    const out = document.getElementById('ai-output');
    out.textContent = `Click Generate to create a message for ${l?.contact || 'this lead'}.`;
    out.className = 'ai-output';
    document.getElementById('ai-task').value = 'whatsapp';
    document.getElementById('ai-objection-wrap').style.display = 'none';
    document.getElementById('modal-ai').classList.remove('hidden');
  }

  async function generateAI() {
    const l = leads.find(x => x.id === aiLeadId);
    if (!l) return;
    const task = document.getElementById('ai-task').value;
    const objection = document.getElementById('ai-objection-text').value;
    const out = document.getElementById('ai-output');
    out.textContent = 'Generating…';
    out.className = 'ai-output loading';

    const tasks = {
      whatsapp: `Write a short warm WhatsApp outreach message (2-3 paragraphs) from AE Systems sales team to ${l.contact} at ${l.company}. Opportunity: ${l.type}. City: ${l.city||'India'}. Mention SAAR BMS / Free POC offer / IIT Jammu validated. Keep it conversational, not salesy. Soft call to action.`,
      followup: `Write a brief follow-up WhatsApp message for ${l.contact} at ${l.company}. We spoke earlier about AE Systems. Politely check in, remind about Free POC, ask for a good time. Very short and friendly.`,
      email: `Write a professional cold email from AE Systems to ${l.contact} (${l.company}). Subject + body. Type: ${l.type}. City: ${l.city||'India'}. Mention: 20-30% energy savings, IIT Jammu, Free POC, non-invasive install. Concise and credible.`,
      objection: `Prospect ${l.contact} at ${l.company} said: "${objection||'We already have a BMS'}". Write a 2-3 sentence response addressing this in context of AE Systems / SAAR BMS. Reference non-invasive integration, ROI, Free POC.`,
      poc: `Write a POC proposal summary for ${l.contact} at ${l.company}. Type: ${l.type}. AE Systems / SAAR BMS POC. Include: what is demonstrated, expected 20-30% savings, timeline (30-60 days), client requirements, next steps. Professional and concise.`,
    };

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a senior sales assistant for AE Systems (Avenix Engineering Systems Pvt Ltd), an IT-OT company in Noida. National sales partner for SAAR BMS — AI-based Building Management System developed with IIT Jammu. Reduces HVAC electricity costs 20-30% without replacing equipment. Key offer: Free POC. Tagline: Make Everything Better. Target: hotels, hospitals, factories, PSUs, corporates.`,
          messages: [{ role: 'user', content: tasks[task] }],
        }),
      });
      const data = await resp.json();
      out.textContent = data.content?.map(b => b.text||'').join('\n').trim() || 'No response generated.';
      out.className = 'ai-output';
    } catch(e) {
      out.textContent = 'Error. Please try again.';
      out.className = 'ai-output';
    }
  }

  function copyAI() {
    navigator.clipboard.writeText(document.getElementById('ai-output').textContent)
      .then(() => toast('Copied to clipboard'));
  }

  // ── FILTER / VIEW ──
  function setFilter(type, val) {
    if (type === 'type')  filterType  = val;
    if (type === 'owner') filterOwner = val;
    render();
  }
  function setViewMode(v) { viewMode = v; render(); }

  return {
    init, onLogin, onLogout, showView, render,
    openAddLead, openEditLead, saveLead, deleteLead, openDetail, moveStage,
    openAddStage, openEditStage, saveStage, deleteStage,
    openAddOpType, openEditOpType, saveOpType, deleteOpType,
    openAI, generateAI, copyAI,
    setFilter, setViewMode,
    refreshLeads,
    // color swatch handlers (called from HTML)
    selectStageColor(el) {
      document.querySelectorAll('#stage-colors .color-swatch').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');
      selStageColor = el.dataset.color;
    },
    selectOtColor(el) {
      document.querySelectorAll('#optype-colors .color-swatch').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');
      selOtColor = el.dataset.color;
    },
  };
})();

// ── MODAL UTILS ──
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ── BOOT ──
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-backdrop').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
  });
  document.getElementById('ai-task')?.addEventListener('change', function() {
    document.getElementById('ai-objection-wrap').style.display = this.value === 'objection' ? 'block' : 'none';
  });
  App.init();
});
