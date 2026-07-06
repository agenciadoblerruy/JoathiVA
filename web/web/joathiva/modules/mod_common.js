export function mountStyle(id, css) {
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }
  style.textContent = css;
  return style;
}

export function setAppBody(html) {
  document.getElementById('appBody').innerHTML = html;
}

export async function apiFetch(ctx, url, options = {}) {
  try {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = { ...(options.headers || {}), ...ctx.authHeaders() };
    if (isFormData) {
      delete headers['Content-Type'];
      delete headers['content-type'];
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      window.dispatchEvent(new Event('jva:session-expired'));
      return null;
    }

    const text = await res.text();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch (_) {
      return { ok: false, error: 'Respuesta inválida del servidor' };
    }
  } catch (_) {
    return null;
  }
}

export async function apiFetchOptional(ctx, url, options = {}) {
  try {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = { ...(options.headers || {}), ...ctx.authHeaders() };
    if (isFormData) {
      delete headers['Content-Type'];
      delete headers['content-type'];
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      return { ok: false, status: 401, error: 'No autorizado' };
    }

    const text = await res.text();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch (_) {
      return { ok: false, error: 'Respuesta inválida del servidor' };
    }
  } catch (_) {
    return null;
  }
}

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('es-UY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export function emptyState(title, detail = 'Sin datos disponibles') {
  return `
    <div style="padding:24px;border:1px dashed rgba(14,59,46,.18);border-radius:18px;background:#fff;">
      <div style="font-weight:800;margin-bottom:6px;">${esc(title)}</div>
      <div style="color:#637487;font-size:13px;line-height:1.5;">${esc(detail)}</div>
    </div>
  `;
}

export function shellLayout({ prefix, tabs, activeTab, title, subtitle }) {
  return `
    <div class="tab-nav" id="${prefix}-nav">
      ${tabs.map((tab, index) => `
        <button class="tab-btn ${tab.id === activeTab || (!activeTab && index === 0) ? 'active' : ''}" data-tab="${tab.id}" id="${prefix}-tab-${tab.id}">
          <div class="tab-icon">${tab.icon || '◌'}</div>
          <div>${esc(tab.label)}</div>
        </button>
      `).join('')}
    </div>
    <div class="tab-contents">
      <div style="padding:18px 18px 0;">
        <div style="margin-bottom:12px;">
          <div style="font-size:22px;font-weight:900;letter-spacing:-.04em;">${esc(title)}</div>
          <div style="font-size:13px;color:#637487;margin-top:4px;">${esc(subtitle || '')}</div>
        </div>
      </div>
      ${tabs.map((tab, index) => `
        <div class="tab-content ${tab.id === activeTab || (!activeTab && index === 0) ? 'active' : ''}" id="${prefix}-content-${tab.id}" data-content="${tab.id}">
          ${tab.content}
        </div>
      `).join('')}
    </div>
  `;
}

export function wireTabs(root, prefix, onChange) {
  const buttons = Array.from(root.querySelectorAll('.tab-btn'));
  const contents = Array.from(root.querySelectorAll('.tab-content'));
  const activate = (tabId) => {
    buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
    contents.forEach((content) => content.classList.toggle('active', content.dataset.content === tabId));
    if (typeof onChange === 'function') onChange(tabId);
  };
  buttons.forEach((btn) => btn.addEventListener('click', () => activate(btn.dataset.tab)));
  const defaultTab = buttons.find((btn) => btn.classList.contains('active'))?.dataset.tab || buttons[0]?.dataset.tab;
  if (defaultTab) activate(defaultTab);
  return activate;
}

export function cleanupBag() {
  const items = [];
  return {
    add(fn) { if (typeof fn === 'function') items.push(fn); },
    run() { while (items.length) { try { items.pop()(); } catch (_) {} } },
  };
}

export function badgeForStatus(status) {
  const s = String(status || '').toUpperCase();
  if (['OPERATIVA_FINALIZADA', 'CONTENEDOR_ENTREGADO', 'PAID', 'APROBADO', 'ACTIVE', 'ACTIVA'].includes(s)) return 'ok';
  if (['CANCELADA', 'REJECTED', 'OVERDUE', 'VENCIDA', 'PENDING', 'PENDIENTE'].includes(s)) return 'warn';
  return 'neutral';
}
