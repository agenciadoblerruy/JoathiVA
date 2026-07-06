import { apiFetch, apiFetchOptional, badgeForStatus, cleanupBag, emptyState, esc, fmtDateTime, mountStyle, shellLayout, setAppBody, wireTabs } from './mod_common.js';

const STYLE_ID = 'jva-mod-operador-style';
const PREFIX = 'op';
let bag = cleanupBag();
let state = { ops: [], selected: null, commercialCases: [], selectedCase: null, commercialOpenGroups: {}, chatRoom: null, chatTimer: null, notifTimer: null, pendingTimer: null, commercialTimer: null };
let ctxRef = null;

const CSS = `
.jva-grid { display:grid; gap:14px; }
.jva-two { grid-template-columns:minmax(0, 1.05fr) minmax(0, .95fr); }
.jva-card { background:#fff; border:1px solid var(--border); border-radius:18px; padding:16px; box-shadow:0 8px 24px rgba(14,59,46,.05); }
.jva-list { display:flex; flex-direction:column; gap:10px; }
.jva-row { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; padding:13px 14px; border:1px solid var(--border); border-radius:16px; background:#fff; }
.jva-row.active { border-color: rgba(14,59,46,.25); box-shadow:0 0 0 4px rgba(14,59,46,.06); }
.jva-group { display:flex; flex-direction:column; gap:10px; }
.jva-group-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; padding:14px 15px; border:1px solid var(--border); border-radius:18px; background:linear-gradient(180deg,#fff 0%,#f8fbf9 100%); cursor:pointer; }
.jva-group-head.active { border-color: rgba(14,59,46,.28); box-shadow:0 0 0 4px rgba(14,59,46,.06); }
.jva-group-body { display:flex; flex-direction:column; gap:8px; padding-left:6px; }
.jva-group-case { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; padding:11px 13px; border:1px solid var(--border); border-radius:15px; background:#fff; cursor:pointer; }
.jva-group-case.active { border-color: rgba(14,59,46,.25); box-shadow:0 0 0 4px rgba(14,59,46,.06); }
.jva-title { font-weight:800; margin-bottom:4px; }
.jva-sub { color:var(--text-muted); font-size:13px; line-height:1.5; }
.jva-chip { display:inline-flex; align-items:center; border-radius:999px; padding:4px 9px; font-size:11px; font-weight:800; border:1px solid var(--border); background:#f7faf8; color:var(--text-muted); }
.jva-chip.ok { background:rgba(14,59,46,.08); border-color:rgba(14,59,46,.18); color:var(--primary); }
.jva-chip.warn { background:rgba(245,166,35,.12); border-color:rgba(245,166,35,.25); color:#926300; }
.jva-chip.neutral { background:#f4f7f5; }
.jva-actions { display:flex; flex-wrap:wrap; gap:8px; }
.jva-btn { border:0; border-radius:12px; padding:10px 14px; font:inherit; font-weight:800; cursor:pointer; background:var(--primary); color:#fff; }
.jva-btn.secondary { background:#edf4ef; color:var(--primary); border:1px solid rgba(14,59,46,.12); }
.jva-btn.danger { background:var(--danger); }
.jva-input, .jva-textarea, .jva-select { width:100%; border:1px solid var(--border); border-radius:12px; padding:11px 12px; font:inherit; background:#fff; }
.jva-textarea { min-height:96px; resize:vertical; }
.jva-field { display:grid; gap:6px; margin-bottom:12px; }
.jva-field label { font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--text-muted); }
.jva-muted { color:var(--text-muted); font-size:13px; }
.jva-chat { display:flex; flex-direction:column; gap:12px; min-height:420px; }
.jva-chat-log { min-height:240px; max-height:340px; overflow:auto; display:flex; flex-direction:column; gap:8px; }
.jva-msg { padding:10px 12px; border-radius:14px; border:1px solid var(--border); background:#fff; }
.jva-msg.me { background:rgba(14,59,46,.06); border-color:rgba(14,59,46,.14); }
.timeline { display:flex; flex-direction:column; gap:10px; }
.timeline-item { display:flex; gap:12px; align-items:flex-start; padding:12px 14px; border:1px solid var(--border); border-radius:16px; background:#fff; }
.timeline-dot { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(14,59,46,.08); color:var(--primary); flex-shrink:0; font-weight:900; }
.timeline-title { font-weight:800; }
.timeline-meta { color:var(--text-muted); font-size:12px; margin-top:3px; }
.selected-banner { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 14px; border:1px solid rgba(14,59,46,.14); background:linear-gradient(180deg,#fff 0%,#f8fbf9 100%); border-radius:16px; margin-bottom:12px; }
.selected-banner strong { font-size:14px; }
.selected-banner small { color:var(--text-muted); display:block; margin-top:2px; }
`;

function commercialCaseKey(item) {
  if (!item) return 'case:0';
  if (item.operation_id) return `operation:${item.operation_id}`;
  if (item.quote_id) return `quote:${item.quote_id}`;
  return `case:${item.id}`;
}

function commercialCaseGroupTitle(item) {
  const origin = (item?.operation_origin || item?.origin || '').trim();
  const destination = (item?.operation_destination || item?.destination || '').trim();
  if (origin || destination) {
    return `${origin || 'Origen pendiente'} → ${destination || 'Destino pendiente'}`;
  }
  return item?.subject || 'Operativa comercial';
}

function commercialCaseGroupSubtitle(item, group) {
  const parts = [];
  if (item?.operation_id) parts.push(`Operación ${item.operation_id}`);
  else if (item?.quote_id) parts.push(`Cotización ${item.quote_id}`);
  else parts.push('Sin operativa creada');
  parts.push(`${group.cases.length} caso${group.cases.length === 1 ? '' : 's'}`);
  const providerTotal = group.cases.reduce((acc, row) => acc + Number(row.provider_count || 0), 0);
  parts.push(`${providerTotal} proveedores`);
  return parts.join(' · ');
}

function toggleCommercialGroup(key) {
  state.commercialOpenGroups = { ...(state.commercialOpenGroups || {}), [key]: !state.commercialOpenGroups?.[key] };
}

function openCommercialGroup(key) {
  state.commercialOpenGroups = { ...(state.commercialOpenGroups || {}), [key]: true };
}

function commercialGroupStatus(group) {
  const precedence = ['en_operacion', 'cotizacion_lista', 'en_revision', 'prioritario', 'critica', 'alta', 'media', 'baja', 'recibido'];
  const statuses = group.cases.map((row) => String(row.status || '').toLowerCase()).filter(Boolean);
  for (const status of precedence) {
    if (statuses.includes(status)) return status;
  }
  return statuses[0] || 'recibido';
}

function renderCommercialCaseRow(item) {
  return `
    <div class="jva-group-case ${state.selectedCase?.id === item.id ? 'active' : ''}" data-case-card="${esc(item.id)}">
      <div style="min-width:0;">
        <div class="jva-title">${esc(item.subject || 'Caso comercial')}</div>
        <div class="jva-sub">${esc(item.customer_name || 'Contacto')} · ${esc(item.email_category || item.status || 'sin estado')}</div>
        <div class="jva-sub" style="margin-top:4px;">${esc(item.last_action || item.summary_text || item.action_text || '')}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
        <div class="jva-chip ${badgeForStatus(item.status)}">${esc(item.status || 'recibido')}</div>
        <div class="jva-muted">${esc(fmtDateTime(item.updated_at || item.created_at))}</div>
      </div>
    </div>
  `;
}

function cardHtml(op) {
  const status = badgeForStatus(op.current_status);
  return `
    <div class="jva-row ${state.selected?.id === op.id ? 'active' : ''}" data-op-card="${esc(op.id)}" style="cursor:pointer;">
      <div style="min-width:0;">
        <div class="jva-title">${esc(op.origin || '—')} → ${esc(op.destination || '—')}</div>
        <div class="jva-sub">${esc(op.provider_name || op.client_name || 'Operativa')}</div>
        <div class="jva-chip ${status}" style="margin-top:8px;">${esc(op.current_status || 'SIN ESTADO')}</div>
      </div>
      <div class="jva-muted" style="text-align:right;">${esc(op.id)}</div>
    </div>
  `;
}

function renderOpsList() {
  const list = document.getElementById(`${PREFIX}-ops-list`);
  if (!list) return;
  if (!state.ops.length) {
    list.innerHTML = emptyState('Operaciones', 'No hay operaciones activas.');
    return;
  }
  list.innerHTML = state.ops.map(cardHtml).join('');
  list.querySelectorAll('[data-op-card]').forEach((el) => {
    el.addEventListener('click', () => selectOperation(el.getAttribute('data-op-card')));
  });
  updateSelectedBanner();
}

async function loadOps(ctx) {
  const data = await apiFetch(ctx, ctx.API + '/operations_list.php');
  if (!data || data.ok === false) {
    state.ops = [];
    renderOpsList();
    renderDetail();
    return;
  }
  state.ops = Array.isArray(data.operations) ? data.operations : [];
  state.selected = state.selected ? state.ops.find((item) => item.id === state.selected.id) || state.ops[0] || null : state.ops[0] || null;
  renderOpsList();
  renderDetail();
  await renderChat(ctx);
}

async function loadOperationDetail(ctx, id) {
  if (!id) return null;
  const data = await apiFetch(ctx, ctx.API + '/operation.php?id=' + encodeURIComponent(id));
  if (!data || data.ok === false) return null;
  return data.operation || data;
}

async function loadGps(ctx) {
  if (!state.selected) return null;
  const data = await apiFetch(ctx, ctx.API + '/gps_latest.php?operation_id=' + encodeURIComponent(state.selected.id));
  return data && data.ok !== false ? data.position || null : null;
}

function updateSelectedBanner() {
  const banner = document.getElementById(`${PREFIX}-selected-banner`);
  if (!banner) return;
  if (!state.selected) {
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'flex';
  banner.innerHTML = `
    <div>
      <strong>${esc(state.selected.id)}</strong>
      <small>${esc(state.selected.origin || '—')} → ${esc(state.selected.destination || '—')}</small>
    </div>
    <button class="jva-btn secondary" id="${PREFIX}-clear-op">Limpiar</button>
  `;
  const btn = document.getElementById(`${PREFIX}-clear-op`);
  if (btn) btn.addEventListener('click', clearSelectedOp);
}

function updatePendingBadge(count) {
  const badge = document.getElementById(`${PREFIX}-pending-count`);
  if (badge) badge.textContent = String(count || 0);
}

async function loadApprovals(ctx) {
  const data = await apiFetch(ctx, ctx.API + '/driver_approvals.php?status=pending');
  const list = document.getElementById(`${PREFIX}-approvals-list`);
  if (!list) return;
  if (!data || data.ok === false || !Array.isArray(data.drivers) || !data.drivers.length) {
    updatePendingBadge(0);
    list.innerHTML = emptyState('Aprobaciones', 'No hay choferes pendientes.');
    return;
  }
  updatePendingBadge(data.count ?? data.drivers.length);
  list.innerHTML = data.drivers.map((d) => `
    <div class="jva-row">
      <div style="min-width:0;">
        <div class="jva-title">${esc(d.full_name || d.username)}</div>
        <div class="jva-sub">${esc(d.provider_name || 'Sin proveedor')} · ${esc(d.driver_type || 'company')}</div>
      </div>
      <div class="jva-actions">
        <button class="jva-btn secondary" data-approve="${esc(d.id)}">Aprobar</button>
        <button class="jva-btn danger" data-reject="${esc(d.id)}">Rechazar</button>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('[data-approve]').forEach((btn) => btn.addEventListener('click', () => approveDriver(ctx, btn.getAttribute('data-approve'), 'approve')));
  list.querySelectorAll('[data-reject]').forEach((btn) => btn.addEventListener('click', () => approveDriver(ctx, btn.getAttribute('data-reject'), 'reject')));
}

async function approveDriver(ctx, driverId, action) {
  await apiFetch(ctx, ctx.API + '/driver_approvals.php', {
    method: 'POST',
    body: JSON.stringify({ driver_id: driverId, action }),
  });
  await loadApprovals(ctx);
}

function ensureMailConfigForm() {
  const form = document.getElementById(`${PREFIX}-mail-form`);
  if (!form) return;
  const saved = JSON.parse(localStorage.getItem('jva_mail_imap_config') || '{}');
  // Auto-derive email from session username if not explicitly saved
  const sessionUser = ctxRef?.SESSION?.username || '';
  const defaultUser = saved.username ||
    (sessionUser ? sessionUser + '@joathilogistica.com' : '');
  form.host.value = saved.host || 'mail.joathilogistica.com';
  form.port.value = saved.port || '993';
  form.username.value = defaultUser;
  form.password.value = saved.password || '';
  form.folder.value = saved.folder || 'INBOX';
  form.limit.value = saved.limit || '20';
}

async function loadMailbox(ctx) {
  const out = document.getElementById(`${PREFIX}-mail-output`);
  const diag = document.getElementById(`${PREFIX}-mail-diagnostic`);
  const form = document.getElementById(`${PREFIX}-mail-form`);
  if (!out || !form) return;
  const payload = {
    host: form.host.value.trim(),
    port: Number(form.port.value || 993),
    username: form.username.value.trim(),
    password: form.password.value,
    folder: form.folder.value.trim() || 'INBOX',
    limit: Number(form.limit.value || 20),
  };
  localStorage.setItem('jva_mail_imap_config', JSON.stringify(payload));
  const data = await apiFetchOptional(ctx, ctx.API + '/imap_inbox.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (diag) diag.innerHTML = '';
  if (!data || data.ok === false) {
    out.innerHTML = emptyState('Correo', data?.error || 'Sin datos disponibles');
    return;
  }
  const messages = Array.isArray(data.messages) ? data.messages : [];
  out.innerHTML = messages.length ? messages.map((m) => `
    <div class="jva-row">
      <div style="min-width:0;">
        <div class="jva-title">${esc(m.from || m.subject || 'Mensaje')}</div>
        <div class="jva-sub">${esc(m.subject || '')}</div>
      </div>
      <div class="jva-muted">${esc(fmtDateTime(m.date || m.created_at))}</div>
    </div>
  `).join('') : emptyState('Correo', 'Sin mensajes disponibles');
}

async function testMailbox(ctx) {
  const diag = document.getElementById(`${PREFIX}-mail-diagnostic`);
  const form = document.getElementById(`${PREFIX}-mail-form`);
  if (!diag || !form) return;
  const payload = {
    host: form.host.value.trim(),
    port: Number(form.port.value || 993),
    username: form.username.value.trim(),
    password: form.password.value,
    folder: form.folder.value.trim() || 'INBOX',
    limit: Number(form.limit.value || 20),
    tls: true,
    ssl_verify: true,
  };
  const data = await apiFetchOptional(ctx, ctx.API + '/imap_diagnostico.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!data || data.ok === false) {
    diag.innerHTML = `
      <div class="jva-card">
        <div class="jva-title">Diagnóstico IMAP</div>
        <div class="jva-sub" style="margin-top:6px;">${esc(data?.error || 'Sin respuesta')}</div>
        ${data?.detail ? `<div class="jva-muted" style="margin-top:8px;white-space:pre-wrap;">${esc(String(data.detail))}</div>` : ''}
        ${data?.command ? `<div class="jva-muted" style="margin-top:8px;">Comando: ${esc(data.command)}</div>` : ''}
      </div>
    `;
    return;
  }
  const server = data.server || {};
  diag.innerHTML = `
    <div class="jva-card">
      <div class="jva-title">Diagnóstico IMAP</div>
      <div class="jva-sub" style="margin-top:6px;">Conexión OK vía ${esc(data.transport || 'python')}</div>
      <div class="jva-muted" style="margin-top:8px;">Host: ${esc(server.host || '—')} · Puerto: ${esc(server.port || '—')} · Folder: ${esc(server.folder || '—')}</div>
      <div class="jva-muted">TLS: ${server.tls ? 'sí' : 'no'} · Verificación SSL: ${server.ssl_verify ? 'sí' : 'no'}</div>
      <div class="jva-muted">Usuario: ${server.username_present ? 'configurado' : 'vacío'} · Clave: ${server.password_present ? 'configurada' : 'vacía'}</div>
      ${data.command ? `<div class="jva-muted" style="margin-top:8px;white-space:pre-wrap;">Comando: ${esc(data.command)}</div>` : ''}
    </div>
  `;
}

async function renderImapDiagnostic(ctx) {
  const box = document.getElementById(`${PREFIX}-imap-diagnostic`);
  const form = document.getElementById(`${PREFIX}-mail-form`);
  if (!box || !form) return;
  const payload = {
    host: form.host.value.trim(),
    port: Number(form.port.value || 993),
    username: form.username.value.trim(),
    password: form.password.value,
    folder: form.folder.value.trim() || 'INBOX',
    limit: Number(form.limit.value || 20),
    tls: true,
    ssl_verify: true,
  };
  const data = await apiFetchOptional(ctx, ctx.API + '/imap_diagnostico.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!data || data.ok === false) {
    box.innerHTML = `
      <div class="jva-card">
        <div class="jva-title">Diagnóstico IMAP</div>
        <div class="jva-sub" style="margin-top:6px;">${esc(data?.error || 'Sin respuesta')}</div>
        ${data?.detail ? `<div class="jva-muted" style="margin-top:8px;white-space:pre-wrap;">${esc(String(data.detail))}</div>` : ''}
        ${data?.command ? `<div class="jva-muted" style="margin-top:8px;">Comando: ${esc(data.command)}</div>` : ''}
      </div>
    `;
    return;
  }
  const server = data.server || {};
  box.innerHTML = `
    <div class="jva-card">
      <div class="jva-title">Diagnóstico IMAP</div>
      <div class="jva-sub" style="margin-top:6px;">Conexión OK vía ${esc(data.transport || 'python')}</div>
      <div class="jva-muted" style="margin-top:8px;">Host: ${esc(server.host || '—')} · Puerto: ${esc(server.port || '—')} · Folder: ${esc(server.folder || '—')}</div>
      <div class="jva-muted">TLS: ${server.tls ? 'sí' : 'no'} · Verificación SSL: ${server.ssl_verify ? 'sí' : 'no'}</div>
      <div class="jva-muted">Usuario: ${server.username_present ? 'configurado' : 'vacío'} · Clave: ${server.password_present ? 'configurada' : 'vacía'}</div>
      ${data.command ? `<div class="jva-muted" style="margin-top:8px;white-space:pre-wrap;">Comando: ${esc(data.command)}</div>` : ''}
      ${Array.isArray(data.sample_messages) && data.sample_messages.length ? `
        <div class="jva-title" style="margin-top:14px;">Mensajes de muestra</div>
        <div class="jva-list" style="margin-top:10px;">
          ${data.sample_messages.map((m) => `
            <div class="jva-row">
              <div style="min-width:0;">
                <div class="jva-title">${esc(m.from || m.subject || 'Mensaje')}</div>
                <div class="jva-sub">${esc(m.subject || '')}</div>
              </div>
              <div class="jva-muted">${esc(fmtDateTime(m.date || m.created_at))}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderDetail() {
  const detail = document.getElementById(`${PREFIX}-ops-detail`);
  if (!detail) return;
  const op = state.selected;
  if (!op) {
    detail.innerHTML = emptyState('Detalle', 'Seleccioná una operación.');
    return;
  }
  const events = Array.isArray(op.events) ? op.events : [];
  const currentIndex = ['LISTO_CARGA','CARGANDO','CARGA_FINALIZADA','VIAJE_INICIADO','EN_FRONTERA','VIAJE_EN_RUTA','EN_DESTINO','DESCARGANDO','DESCARGA_FINALIZADA','OPERATIVA_FINALIZADA','CONTENEDOR_ENTREGADO'].indexOf(op.current_status);
  const nextStatus = currentIndex >= 0 ? ['LISTO_CARGA','CARGANDO','CARGA_FINALIZADA','VIAJE_INICIADO','EN_FRONTERA','VIAJE_EN_RUTA','EN_DESTINO','DESCARGANDO','DESCARGA_FINALIZADA','OPERATIVA_FINALIZADA','CONTENEDOR_ENTREGADO'][Math.min(currentIndex + 1, 10)] : null;

  detail.innerHTML = `
    <div class="selected-banner" id="${PREFIX}-selected-banner"></div>
    <div class="jva-card">
      <div class="jva-title">${esc(op.origin || '—')} → ${esc(op.destination || '—')}</div>
      <div class="jva-sub">ID ${esc(op.id)} · ${esc(op.provider_name || op.client_name || 'Sin nombre')}</div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <span class="jva-chip ${badgeForStatus(op.current_status)}">${esc(op.current_status || 'SIN ESTADO')}</span>
        <span class="jva-chip neutral">${op.is_container ? 'Contenedor' : 'Carga general'}</span>
      </div>
      <div class="jva-muted" style="margin-top:12px;">Despachante: ${esc(op.dispatcher_name || 'Sin despachante')}</div>
      <div class="jva-muted">Última posición: ${esc(op.last_lat || '—')} , ${esc(op.last_lng || '—')}</div>
      <div class="jva-actions" style="margin-top:14px;">
        ${nextStatus ? `<button class="jva-btn" id="${PREFIX}-advance-op">Avanzar a ${esc(nextStatus)}</button>` : ''}
        <button class="jva-btn secondary" id="${PREFIX}-refresh-op">Refrescar</button>
      </div>
    </div>
    <div class="jva-card" style="margin-top:14px;">
      <div class="jva-title">Timeline</div>
      <div class="timeline" style="margin-top:12px;">
        ${events.length ? events.map((ev) => `
          <div class="timeline-item">
            <div class="timeline-dot">✓</div>
            <div>
              <div class="timeline-title">${esc(ev.event_status || 'Evento')}</div>
              <div class="timeline-meta">${esc(fmtDateTime(ev.created_at))}</div>
            </div>
          </div>
        `).join('') : emptyState('Timeline', 'Sin eventos disponibles.')}
      </div>
    </div>
  `;
  const refreshBtn = document.getElementById(`${PREFIX}-refresh-op`);
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadOps(ctxRef));
  const advanceBtn = document.getElementById(`${PREFIX}-advance-op`);
  if (advanceBtn && nextStatus) advanceBtn.addEventListener('click', () => advanceStatus(ctxRef, nextStatus));
}

async function selectOperation(id, ctx) {
  state.selected = state.ops.find((item) => item.id === id) || null;
  renderOpsList();
  renderDetail();
  await renderChat(ctx);
}

function renderNotificationsList(data) {
  const list = document.getElementById(`${PREFIX}-notifications-list`);
  if (!list) return;
  const items = Array.isArray(data?.notifications) ? data.notifications : [];
  if (!items.length) {
    list.innerHTML = emptyState('Notificaciones', 'Sin notificaciones disponibles.');
    return;
  }
  list.innerHTML = items.map((item) => `
    <div class="jva-row">
      <div style="min-width:0;">
        <div class="jva-title">${esc(item.title || 'Aviso')}</div>
        <div class="jva-sub">${esc(item.message || '')}</div>
      </div>
      <div class="jva-muted">${esc(fmtDateTime(item.created_at))}</div>
    </div>
  `).join('');
}

async function loadNotifications(ctx) {
  const data = await apiFetch(ctx, ctx.API + '/notifications.php?role=operador');
  if (!data || data.ok === false) {
    renderNotificationsList(null);
    return;
  }
  renderNotificationsList(data);
}

function renderCommercialCaseDetail() {
  const detail = document.getElementById(`${PREFIX}-case-detail`);
  if (!detail) return;
  const item = state.selectedCase;
  if (!item) {
    detail.innerHTML = emptyState('Detalle', 'Seleccioná un caso.');
    return;
  }

  let parsedProviders = [];
  if (typeof item.provider_list_json === 'string' && item.provider_list_json.trim()) {
    try {
      parsedProviders = JSON.parse(item.provider_list_json) || [];
    } catch (_) {
      parsedProviders = [];
    }
  } else if (Array.isArray(item.provider_list_json)) {
    parsedProviders = item.provider_list_json;
  }

  detail.innerHTML = `
    <div class="jva-card">
      <div class="jva-title">${esc(item.subject || 'Caso comercial')}</div>
      <div class="jva-sub" style="margin-top:6px;">${esc(item.customer_name || 'Contacto')} · ${esc(item.customer_email || '')}</div>
      <div class="jva-sub" style="margin-top:4px;">${esc(item.operation_id ? `Operativa ${item.operation_id}` : item.quote_id ? `Cotización ${item.quote_id}` : 'Caso sin operativa todavía')}</div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
        <div class="jva-chip ${badgeForStatus(item.status)}">${esc(item.status || 'recibido')}</div>
        <div class="jva-chip neutral">${esc(item.priority || 'media')}</div>
        <div class="jva-chip neutral">${esc(String(item.provider_count || 0))} proveedores</div>
      </div>
      <div class="jva-muted" style="margin-top:12px;white-space:pre-wrap;">${esc(item.summary_text || item.action_text || '')}</div>
      <div class="jva-actions" style="margin-top:14px;">
        <button class="jva-btn" id="${PREFIX}-case-promote">Elevar a Operación</button>
        <button class="jva-btn secondary" id="${PREFIX}-case-next">Marcar revisión</button>
      </div>
    </div>
    <div class="jva-card" style="margin-top:12px;">
      <div class="jva-title">Proveedores sugeridos</div>
      <div class="jva-list" style="margin-top:12px;">
        ${parsedProviders.length ? parsedProviders.map((p) => `
          <div class="jva-row">
            <div>
              <div class="jva-title">${esc(p.name || p.id || 'Proveedor')}</div>
              <div class="jva-sub">${esc(p.status || 'active')}</div>
            </div>
            <div class="jva-chip ${badgeForStatus(p.status)}">${esc(p.status || 'active')}</div>
          </div>
        `).join('') : emptyState('Proveedores', 'No se detectaron proveedores sugeridos.')}
      </div>
    </div>
    <div class="jva-card" style="margin-top:12px;">
      <div class="jva-title">Timeline comercial</div>
      <div class="timeline" style="margin-top:12px;">
        ${Array.isArray(item.events) && item.events.length ? item.events.map((ev) => `
          <div class="timeline-item">
            <div class="timeline-dot">✓</div>
            <div>
              <div class="timeline-title">${esc(ev.title || ev.event_key || 'Evento')}</div>
              <div class="timeline-meta">${esc(fmtDateTime(ev.created_at))}</div>
              <div class="jva-sub" style="margin-top:4px;">${esc(ev.detail_text || '')}</div>
            </div>
          </div>
        `).join('') : emptyState('Timeline', 'Sin eventos aún.')}
      </div>
    </div>
  `;
  const promote = document.getElementById(`${PREFIX}-case-promote`);
  if (promote) promote.addEventListener('click', () => promoteCommercialCase());
  const next = document.getElementById(`${PREFIX}-case-next`);
  if (next) next.addEventListener('click', () => advanceCommercialCase('enviada_proveedores'));
}

function renderCommercialCases() {
  const list = document.getElementById(`${PREFIX}-cases-list`);
  const badge = document.getElementById(`${PREFIX}-case-count`);
  if (badge) badge.textContent = String((state.commercialCases || []).length || 0);
  if (!list) return;
  const cases = Array.isArray(state.commercialCases) ? state.commercialCases : [];
  if (!cases.length) {
    list.innerHTML = emptyState('Casos comerciales', 'Sin datos disponibles.');
    renderCommercialCaseDetail();
    return;
  }
  const groups = [];
  const grouped = new Map();
  cases.slice().sort((a, b) => {
    const aRank = String(a.operation_id || a.quote_id || '').localeCompare(String(b.operation_id || b.quote_id || ''));
    if (aRank !== 0) return aRank;
    return String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
  }).forEach((item) => {
    const key = commercialCaseKey(item);
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        title: commercialCaseGroupTitle(item),
        item,
        cases: [],
        latest: item,
      });
      groups.push(grouped.get(key));
    }
    const group = grouped.get(key);
    group.cases.push(item);
    if (String(item.updated_at || item.created_at || '') > String(group.latest.updated_at || group.latest.created_at || '')) {
      group.latest = item;
    }
  });
  groups.sort((a, b) => String(b.latest.updated_at || b.latest.created_at || '').localeCompare(String(a.latest.updated_at || a.latest.created_at || '')));
  const selectedGroupKey = commercialCaseKey(state.selectedCase);
  if (!state.commercialOpenGroups || !Object.keys(state.commercialOpenGroups).length) {
    state.commercialOpenGroups = { [groups[0].key]: true };
  }
  if (state.selectedCase) {
    openCommercialGroup(selectedGroupKey);
  }
  list.innerHTML = groups.map((group) => {
    const isOpen = !!state.commercialOpenGroups?.[group.key];
    const status = commercialGroupStatus(group);
    const selectedGroup = selectedGroupKey === group.key;
    return `
      <div class="jva-group">
        <div class="jva-group-head ${selectedGroup ? 'active' : ''}" data-group-toggle="${esc(group.key)}">
          <div style="min-width:0;">
            <div class="jva-title">${esc(group.title)}</div>
            <div class="jva-sub">${esc(commercialCaseGroupSubtitle(group.latest, group))}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
            <div class="jva-chip ${badgeForStatus(status)}">${esc(status || 'recibido')}</div>
            <div class="jva-muted">${isOpen ? 'Contraer' : 'Expandir'}</div>
          </div>
        </div>
        ${isOpen ? `<div class="jva-group-body">
          ${group.cases.map((item) => renderCommercialCaseRow(item)).join('')}
        </div>` : ''}
      </div>
    `;
  }).join('');
  list.querySelectorAll('[data-group-toggle]').forEach((el) => {
    el.addEventListener('click', () => {
      toggleCommercialGroup(el.getAttribute('data-group-toggle'));
      renderCommercialCases();
    });
  });
  list.querySelectorAll('[data-case-card]').forEach((el) => {
    el.addEventListener('click', () => selectCommercialCase(el.getAttribute('data-case-card')));
  });
  renderCommercialCaseDetail();
}

async function loadCommercialCases(ctx) {
  const data = await apiFetchOptional(ctx, ctx.API + '/comercial_api.php?action=cases');
  state.commercialCases = Array.isArray(data?.cases) ? data.cases : [];
  if (!state.selectedCase && state.commercialCases.length) {
    state.selectedCase = state.commercialCases[0];
  } else if (state.selectedCase) {
    state.selectedCase = state.commercialCases.find((item) => String(item.id) === String(state.selectedCase.id)) || state.commercialCases[0] || null;
  }
  if (state.selectedCase) {
    openCommercialGroup(commercialCaseKey(state.selectedCase));
  }
  renderCommercialCases();
}

function selectCommercialCase(id) {
  state.selectedCase = state.commercialCases.find((item) => String(item.id) === String(id)) || null;
  if (state.selectedCase) {
    openCommercialGroup(commercialCaseKey(state.selectedCase));
  }
  renderCommercialCases();
}

async function advanceCommercialCase(status) {
  if (!state.selectedCase) return;
  await apiFetchOptional(ctxRef, ctxRef.API + '/comercial_api.php?action=case-advance', {
    method: 'POST',
    body: JSON.stringify({ id: state.selectedCase.id, status, note: 'Cambio manual desde Operador' }),
  });
  await loadCommercialCases(ctxRef);
  await loadOps(ctxRef);
}

async function promoteCommercialCase() {
  if (!state.selectedCase) return;
  await apiFetchOptional(ctxRef, ctxRef.API + '/comercial_api.php?action=case-promote', {
    method: 'POST',
    body: JSON.stringify({ id: state.selectedCase.id }),
  });
  await loadCommercialCases(ctxRef);
  await loadOps(ctxRef);
}

async function renderChat(ctx) {
  const log = document.getElementById(`${PREFIX}-chat-log`);
  const room = state.selected ? state.selected.id + '__ops' : null;
  state.chatRoom = room;
  const roomLabel = document.getElementById(`${PREFIX}-chat-room`);
  if (roomLabel) roomLabel.textContent = room || '—';
  if (!log || !room) {
    if (log) log.innerHTML = emptyState('Chat', 'Seleccioná una operación para chatear.');
    return;
  }

  const data = await apiFetchOptional(ctx, ctx.API + '/chat.php?room_id=' + encodeURIComponent(room));
  if (!data || data.ok === false) {
    log.innerHTML = emptyState('Chat', 'Chat no disponible para esta sesión.');
    return;
  }
  const msgs = Array.isArray(data?.messages) ? data.messages : [];
  log.innerHTML = msgs.length ? msgs.map((msg) => `
    <div class="jva-msg ${String(msg.sender_role || '').toLowerCase().includes('oper') ? 'me' : ''}">
      <div class="jva-muted" style="font-size:11px;margin-bottom:4px;">${esc(msg.sender_name || msg.sender_role || 'Usuario')} · ${esc(fmtDateTime(msg.created_at))}</div>
      <div>${esc(msg.message || '')}</div>
    </div>
  `).join('') : emptyState('Chat', 'Sin mensajes todavía.');
}

async function sendChat(ctx) {
  const input = document.getElementById(`${PREFIX}-chat-input`);
  if (!input || !state.selected || !input.value.trim()) return;
  const message = input.value.trim();
  input.value = '';
  const data = await apiFetchOptional(ctx, ctx.API + '/chat.php', {
    method: 'POST',
    body: JSON.stringify({ room_id: state.selected.id + '__ops', message }),
  });
  if (!data || data.ok === false) {
    const log = document.getElementById(`${PREFIX}-chat-log`);
    if (log) log.innerHTML = emptyState('Chat', 'Chat no disponible para esta sesión.');
    return;
  }
  await renderChat(ctx);
}

async function advanceStatus(ctx, newStatus) {
  if (!state.selected || !newStatus) return;
  const body = { operation_id: state.selected.id, status: newStatus };
  const data = await apiFetch(ctx, ctx.API + '/operation.php', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (data && data.ok !== false) {
    await loadOps(ctx);
  }
}

function doPanic(ctx) {
  if (window.PanicBridge?.callNumber) {
    window.PanicBridge.callNumber('911');
  } else {
    window.location.href = 'tel:911';
  }
  if (window.PanicBridge?.sendSMS) {
    window.PanicBridge.sendSMS('+59897971122', 'ayuda');
  }
  if (ctx?.SESSION && state.selected) {
    fetch(ctx.API + '/panic.php', {
      method: 'POST',
      headers: ctx.authHeaders(),
      body: JSON.stringify({ role: 'operador', user_id: ctx.SESSION.user_id, operation_id: state.selected.id }),
    }).catch(() => {});
  }
}

async function renderConfig(ctx) {
  const box = document.getElementById(`${PREFIX}-config-body`);
  if (!box) return;
  const session = ctx.SESSION;
  const luciaConf = JSON.parse(localStorage.getItem('jva_lucia_config') || '{}');
  const mailConf  = JSON.parse(localStorage.getItem('jva_mail_imap_config') || '{}');
  const sessionUser = session.username || '';
  const defaultEmail = mailConf.username || (sessionUser ? sessionUser + '@joathilogistica.com' : '—');

  box.innerHTML = `
    <div class="jva-grid" style="gap:14px;">

      <div class="jva-card">
        <div class="jva-title">👤 Sesión activa</div>
        <div class="jva-sub" style="margin-top:6px;">${esc(session.full_name || session.username)}</div>
        <div class="jva-sub">Rol: <strong>${esc(session.role)}</strong></div>
        <div class="jva-sub">Expira: ${esc(fmtDateTime(session.expires_at))}</div>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="jva-btn secondary" id="${PREFIX}-refresh-token">Refrescar token</button>
          <button class="jva-btn danger" id="${PREFIX}-panic-btn">Pánico</button>
        </div>
      </div>

      <div class="jva-card">
        <div class="jva-title">🌐 Sistema LUCIA</div>
        <div class="jva-sub" style="margin-top:6px;">Dirección Nacional de Aduanas — Uruguay</div>
        <div class="jva-sub" style="margin-top:2px;">URL: <code style="font-size:11px;">aplicaciones.aduanas.gub.uy</code></div>
        <div class="jva-field" style="margin-top:12px;">
          <label>Usuario LUCIA</label>
          <input class="jva-input" id="${PREFIX}-lucia-user" placeholder="Ej. OTR5733" value="${esc(luciaConf.user || '')}">
        </div>
        <div style="margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="jva-btn" id="${PREFIX}-lucia-open">Abrir LUCIA ↗</button>
          <button class="jva-btn secondary" id="${PREFIX}-lucia-save">Guardar usuario</button>
        </div>
        ${luciaConf.user ? `<div class="jva-muted" style="margin-top:8px;">Usuario guardado: <strong>${esc(luciaConf.user)}</strong></div>` : ''}
      </div>

      <div class="jva-card">
        <div class="jva-title">📧 Correo electrónico</div>
        <div class="jva-sub" style="margin-top:6px;">Cuenta: <strong>${esc(defaultEmail)}</strong></div>
        <div class="jva-sub">IMAP: mail.joathilogistica.com <span class="jva-chip ok" style="margin-left:4px;">993 SSL</span></div>
        <div class="jva-sub" style="margin-top:4px;">SMTP: mail.joathilogistica.com <span class="jva-chip ok" style="margin-left:4px;">465 SSL</span></div>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="jva-btn secondary" id="${PREFIX}-goto-correo">Ir a bandeja ↓</button>
          <button class="jva-btn secondary" id="${PREFIX}-clear-mail-config">Limpiar credenciales</button>
        </div>
      </div>

    </div>
  `;

  // Sesión
  const btn = document.getElementById(`${PREFIX}-refresh-token`);
  if (btn) {
    btn.addEventListener('click', async () => {
      const data = await apiFetch(ctx, ctx.API + '/refresh_token.php', { method: 'POST', body: '{}' });
      if (data && data.ok !== false && data.expires_at) {
        ctx.SESSION.expires_at = data.expires_at;
        localStorage.setItem('jva_session', JSON.stringify(ctx.SESSION));
        btn.textContent = 'Token actualizado ✓';
        setTimeout(() => { btn.textContent = 'Refrescar token'; }, 2000);
      }
    });
  }
  const panicBtn = document.getElementById(`${PREFIX}-panic-btn`);
  if (panicBtn) panicBtn.addEventListener('click', () => doPanic(ctx));

  // Lucia
  const luciaOpen = document.getElementById(`${PREFIX}-lucia-open`);
  if (luciaOpen) {
    luciaOpen.addEventListener('click', () => {
      window.open('https://aplicaciones.aduanas.gub.uy/LuciaXMenuNuevo/Globales.Menues.Inicio.aspx', '_blank', 'noopener');
    });
  }
  const luciaSave = document.getElementById(`${PREFIX}-lucia-save`);
  if (luciaSave) {
    luciaSave.addEventListener('click', () => {
      const userVal = (document.getElementById(`${PREFIX}-lucia-user`)?.value || '').trim();
      if (!userVal) return;
      localStorage.setItem('jva_lucia_config', JSON.stringify({ user: userVal }));
      luciaSave.textContent = 'Guardado ✓';
      setTimeout(() => { luciaSave.textContent = 'Guardar usuario'; }, 1500);
    });
  }

  // Correo
  const gotoCorreo = document.getElementById(`${PREFIX}-goto-correo`);
  if (gotoCorreo) {
    gotoCorreo.addEventListener('click', () => {
      const tab = document.querySelector(`[data-tab="${PREFIX}-correo"]`);
      if (tab) tab.click();
    });
  }
  const clearMail = document.getElementById(`${PREFIX}-clear-mail-config`);
  if (clearMail) {
    clearMail.addEventListener('click', () => {
      if (!confirm('¿Limpiar credenciales de correo guardadas?')) return;
      localStorage.removeItem('jva_mail_imap_config');
      clearMail.textContent = 'Limpiado ✓';
      setTimeout(() => { clearMail.textContent = 'Limpiar credenciales'; }, 1500);
    });
  }
}

async function initialLoad(ctx) {
  await loadOps(ctx);
  await loadApprovals(ctx);
  await loadNotifications(ctx);
  await renderChat(ctx);
  await renderConfig(ctx);
  ensureMailConfigForm();
}

async function sendCompose(ctx) {
  const form = document.getElementById(`${PREFIX}-compose-form`);
  const result = document.getElementById(`${PREFIX}-compose-result`);
  const mailForm = document.getElementById(`${PREFIX}-mail-form`);
  if (!form || !result) return;

  const mailConf = JSON.parse(localStorage.getItem('jva_mail_imap_config') || '{}');
  const sessionUser = ctx.SESSION?.username || '';
  const fromEmail = mailConf.username || (sessionUser ? sessionUser + '@joathilogistica.com' : '');

  const payload = {
    from:     fromEmail,
    to:       form.to.value.trim(),
    cc:       form.cc.value.trim(),
    subject:  form.subject.value.trim(),
    body:     form.body.value.trim(),
    // SMTP auth from saved IMAP config
    smtp_host:     mailConf.host || 'mail.joathilogistica.com',
    smtp_port:     465,
    smtp_username: mailConf.username || fromEmail,
    smtp_password: mailConf.password || (mailForm?.password?.value || ''),
  };

  if (!payload.to) {
    result.innerHTML = `<div class="jva-chip warn">Ingresá una dirección de destino.</div>`;
    return;
  }

  result.innerHTML = `<div class="jva-muted">Enviando…</div>`;
  const data = await apiFetch(ctx, ctx.API + '/smtp_send.php', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!data || data.ok === false) {
    result.innerHTML = `<div class="jva-chip warn">${esc(data?.error || 'Error al enviar')}</div>`;
    return;
  }
  result.innerHTML = `<div class="jva-chip ok">Enviado correctamente ✓</div>`;
  form.to.value = '';
  form.cc.value = '';
  form.subject.value = '';
  form.body.value = '';
}

function wireComposeTab(ctx) {
  const sendBtn  = document.getElementById(`${PREFIX}-compose-send`);
  const clearBtn = document.getElementById(`${PREFIX}-compose-clear`);
  const form     = document.getElementById(`${PREFIX}-compose-form`);
  if (!form) return;
  // Pre-fill "De"
  const mailConf = JSON.parse(localStorage.getItem('jva_mail_imap_config') || '{}');
  const sessionUser = ctx.SESSION?.username || '';
  const fromEmail = mailConf.username || (sessionUser ? sessionUser + '@joathilogistica.com' : '');
  if (form.from) form.from.value = fromEmail;
  if (sendBtn) sendBtn.addEventListener('click', () => sendCompose(ctx));
  if (clearBtn) clearBtn.addEventListener('click', () => {
    form.to.value = ''; form.cc.value = '';
    form.subject.value = ''; form.body.value = '';
    const result = document.getElementById(`${PREFIX}-compose-result`);
    if (result) result.innerHTML = '';
  });
}

async function renderChatPoll(ctx) {
  if (!state.selected) return;
  await renderChat(ctx);
}

export async function init(ctx) {
  bag.run();
  bag = cleanupBag();
  mountStyle(STYLE_ID, CSS);
  ctxRef = ctx;

  setAppBody(shellLayout({
    prefix: PREFIX,
    activeTab: 'operaciones',
    title: 'Operador / Admin',
    subtitle: 'Operaciones, aprobaciones, comercial, correo, chat y configuración.',
    tabs: [
      { id: 'operaciones', label: 'Operaciones', icon: '⚙', content: `
        <div class="jva-grid jva-two">
          <div class="jva-card">
            <div class="jva-title">Listado activo</div>
            <div class="jva-sub" style="margin-top:6px;">Pendientes: <span id="${PREFIX}-pending-count">0</span></div>
            <div id="${PREFIX}-ops-list" class="jva-list" style="margin-top:12px;"></div>
          </div>
          <div class="jva-card">
            <div class="jva-title">Detalle</div>
            <div id="${PREFIX}-ops-detail" style="margin-top:12px;"></div>
          </div>
        </div>
      `},
      { id: 'comercial', label: 'Comercial', icon: '☰', content: `
        <div class="jva-grid jva-two">
          <div class="jva-card">
            <div class="jva-title">Casos comerciales</div>
            <div class="jva-sub" style="margin-top:6px;">Casos abiertos desde correo, cotización y seguimiento. Total: <span id="${PREFIX}-case-count">0</span></div>
            <div id="${PREFIX}-cases-list" class="jva-list" style="margin-top:12px;"></div>
          </div>
          <div class="jva-card">
            <div class="jva-title">Detalle comercial</div>
            <div id="${PREFIX}-case-detail" style="margin-top:12px;"></div>
          </div>
        </div>
      `},
      { id: 'aprobaciones', label: 'Aprobaciones', icon: '✓', content: `<div class="jva-card"><div id="${PREFIX}-approvals-list" class="jva-list"></div></div>` },
      { id: 'correo', label: 'Correo', icon: '✉', content: `
        <div class="jva-grid jva-two">
          <div class="jva-card">
            <div class="jva-title">IMAP</div>
            <form id="${PREFIX}-mail-form" onsubmit="return false;">
              <div class="jva-field"><label>Host</label><input class="jva-input" name="host" value="mail.joathilogistica.com"></div>
              <div class="jva-field"><label>Port</label><input class="jva-input" name="port" value="993"></div>
              <div class="jva-field"><label>Usuario</label><input class="jva-input" name="username"></div>
              <div class="jva-field"><label>Clave</label><input class="jva-input" name="password" type="password"></div>
              <div class="jva-field"><label>Folder</label><input class="jva-input" name="folder" value="INBOX"></div>
              <div class="jva-field"><label>Limit</label><input class="jva-input" name="limit" value="20"></div>
              <div class="jva-actions">
                <button class="jva-btn" id="${PREFIX}-mail-load" type="button">Cargar bandeja</button>
              </div>
            </form>
          </div>
          <div class="jva-card">
            <div class="jva-title">Bandeja</div>
            <div id="${PREFIX}-mail-output" style="margin-top:12px;"></div>
          </div>
        </div>
      `},
      { id: 'componer', label: 'Componer', icon: '✏', content: `
        <div class="jva-grid jva-two">
          <div class="jva-card">
            <div class="jva-title">Nuevo mensaje</div>
            <form id="${PREFIX}-compose-form" onsubmit="return false;" style="margin-top:12px;">
              <div class="jva-field"><label>De</label><input class="jva-input" name="from" readonly placeholder="(auto desde config)"></div>
              <div class="jva-field"><label>Para</label><input class="jva-input" name="to" placeholder="destinatario@ejemplo.com"></div>
              <div class="jva-field"><label>CC</label><input class="jva-input" name="cc" placeholder="(opcional)"></div>
              <div class="jva-field"><label>Asunto</label><input class="jva-input" name="subject" placeholder="Asunto del mensaje"></div>
              <div class="jva-field"><label>Mensaje</label><textarea class="jva-textarea" name="body" style="min-height:140px;" placeholder="Cuerpo del correo..."></textarea></div>
              <div class="jva-actions">
                <button class="jva-btn" id="${PREFIX}-compose-send" type="button">Enviar</button>
                <button class="jva-btn secondary" id="${PREFIX}-compose-clear" type="button">Limpiar</button>
              </div>
            </form>
            <div id="${PREFIX}-compose-result" style="margin-top:12px;"></div>
          </div>
          <div class="jva-card">
            <div class="jva-title">Config. SMTP</div>
            <div class="jva-sub" style="margin-top:6px;">Las credenciales se toman del formulario IMAP (misma cuenta).</div>
            <div class="jva-muted" style="margin-top:10px;">Host: mail.joathilogistica.com</div>
            <div class="jva-muted">Puerto SMTP: 465 (SSL)</div>
            <div class="jva-muted" style="margin-top:8px;">Si el envío falla, verificá que la contraseña IMAP esté guardada en la pestaña Correo.</div>
          </div>
        </div>
      `},
      { id: 'imap', label: 'IMAP Diag.', icon: '🧪', content: `
        <div class="jva-card">
          <div class="jva-title">Servidor IMAP</div>
          <div class="jva-sub" style="margin-top:6px;">Diagnóstico del buzón configurado para el operador.</div>
          <div id="${PREFIX}-imap-diagnostic" style="margin-top:12px;"></div>
        </div>
      `},
      { id: 'chat', label: 'Chat', icon: '💬', content: `
        <div class="jva-card jva-chat">
          <div class="jva-muted">Sala actual: <span id="${PREFIX}-chat-room">—</span></div>
          <div id="${PREFIX}-chat-log" class="jva-chat-log"></div>
          <div class="jva-field">
            <label>Mensaje</label>
            <textarea id="${PREFIX}-chat-input" class="jva-textarea" placeholder="Escribí un mensaje"></textarea>
          </div>
          <div class="jva-actions">
            <button class="jva-btn" id="${PREFIX}-chat-send">Enviar</button>
          </div>
        </div>
      `},
      { id: 'notificaciones', label: 'Notificaciones', icon: '🔔', content: `<div class="jva-card"><div id="${PREFIX}-notifications-list" class="jva-list"></div></div>` },
      { id: 'configuracion', label: 'Config.', icon: '⚙', content: `<div id="${PREFIX}-config-body"></div>` },
    ],
  }));

  const root = document.getElementById('appBody');
  wireTabs(root, PREFIX, async (tabId) => {
    if (tabId === 'correo') ensureMailConfigForm();
    if (tabId === 'componer') wireComposeTab(ctx);
    if (tabId === 'imap') await renderImapDiagnostic(ctx);
    if (tabId === 'comercial') renderCommercialCases();
  });

  root.querySelectorAll('.jva-btn').forEach((btn) => {
    if (btn.id === `${PREFIX}-mail-load`) {
      btn.addEventListener('click', () => loadMailbox(ctx));
    }
    if (btn.id === `${PREFIX}-chat-send`) {
      btn.addEventListener('click', () => sendChat(ctx));
    }
  });

  const chatInput = document.getElementById(`${PREFIX}-chat-input`);
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat(ctx);
      }
    });
  }

  await initialLoad(ctx);
  if (document.getElementById(`${PREFIX}-imap-diagnostic`)) {
    await renderImapDiagnostic(ctx);
  }
  if (state.chatTimer) clearInterval(state.chatTimer);
  state.chatTimer = setInterval(() => {
    if (state.selected) renderChat(ctx);
  }, 3000);
  state.notifTimer = setInterval(() => loadNotifications(ctx), 30000);
  state.pendingTimer = setInterval(() => loadApprovals(ctx), 30000);
  state.commercialTimer = setInterval(() => loadCommercialCases(ctx), 30000);
  bag.add(() => clearInterval(state.notifTimer));
  bag.add(() => clearInterval(state.chatTimer));
  bag.add(() => clearInterval(state.pendingTimer));
  bag.add(() => clearInterval(state.commercialTimer));
  bag.add(() => { ctxRef = null; });
}

export function destroy() {
  bag.run();
  bag = cleanupBag();
}
