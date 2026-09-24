import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, ADMIN_EMAIL } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const app = document.getElementById('app');
const state = { user: null, stores: [], accounts: [], selected: null, query: '', role: 'Todos', emailStatus: 'Todos' };
const ROLES = ['Gerente', 'Cajero', 'Asesor/a de sala', 'Vendedor/a de campo', 'Ventas por definir', 'Jefe de bodega', 'Rol por definir'];
let dialogClose = null;

function node(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function button(label, className, onClick) {
  const element = node('button', `btn ${className}`, label);
  element.type = 'button';
  element.addEventListener('click', onClick);
  return element;
}

function notice(message, error = false) {
  let root = document.querySelector('.toast-area');
  if (!root) { root = node('div', 'toast-area'); document.body.append(root); }
  const item = node('div', `toast-msg${error ? ' error' : ''}`, message);
  root.append(item);
  setTimeout(() => item.remove(), 4600);
}

function report(error) {
  const message = error?.message || 'Ocurrió un error al guardar. Intentá de nuevo.';
  notice(message, true);
}

async function loadData() {
  const [storeResult, accountResult] = await Promise.all([
    supabase.from('stores').select('*').order('name'),
    supabase.from('accounts').select('*').order('role').order('email')
  ]);
  if (storeResult.error) throw storeResult.error;
  if (accountResult.error) throw accountResult.error;
  state.stores = storeResult.data || [];
  state.accounts = accountResult.data || [];
  if (!state.stores.some(store => store.code === state.selected)) state.selected = state.stores[0]?.code || null;
  renderDashboard();
}

function createHeader() {
  const header = node('header', 'topbar');
  const inside = node('div', 'top-inner');
  inside.append(node('div', 'brand-mark', 'R'));
  const title = node('div');
  title.append(node('div', 'brand-overline', 'RENOVA · AGRISYSTEMS'), node('div', 'brand-title', 'Correos por tienda'));
  const user = node('div', 'top-user');
  user.append(node('span', '', state.user?.email || ''));
  user.append(button('Cerrar sesión', '', async () => {
    await supabase.auth.signOut();
    state.user = null;
    state.stores = [];
    state.accounts = [];
    renderLogin();
  }));
  inside.append(title, user); header.append(inside); return header;
}

function renderLogin() {
  app.replaceChildren();
  const wrap = node('main', 'login-wrap');
  const card = node('div', 'login-card');
  card.append(node('div', 'brand-overline', 'RENOVA · AGRISYSTEMS'),
    node('h1', '', 'Consolidado de correos'),
    node('p', '', 'Acceso de IT. Recibirás un enlace de ingreso en el correo autorizado.'));
  const form = node('form');
  const label = node('label', 'form-label', 'Correo autorizado');
  label.htmlFor = 'login-email';
  const email = node('input', 'form-control');
  email.id = 'login-email'; email.type = 'email'; email.value = ADMIN_EMAIL;
  email.autocomplete = 'email'; email.required = true;
  const submit = node('button', 'btn btn-renova', 'Enviar enlace de ingreso');
  submit.type = 'submit';
  const message = node('div', 'auth-message');
  form.append(label, email, submit, message);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (email.value.trim().toLowerCase() !== ADMIN_EMAIL) {
      message.textContent = 'Esta aplicación está habilitada únicamente para el correo de IT.';
      message.className = 'auth-message text-danger'; return;
    }
    submit.disabled = true; message.textContent = 'Solicitando enlace...';
    const { error } = await supabase.auth.signInWithOtp({
      email: ADMIN_EMAIL,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: true }
    });
    submit.disabled = false;
    message.textContent = error ? error.message : 'Revisá la bandeja de IT y abrí el enlace desde este navegador.';
    message.className = `auth-message ${error ? 'text-danger' : 'text-success'}`;
  });
  card.append(form);
  card.append(node('p', 'small mt-4 mb-0', 'Los datos no son públicos. El acceso a las tablas está restringido en la base de datos.'));
  wrap.append(card); app.append(wrap);
}

function filteredStores() {
  const q = state.query.toLocaleLowerCase('es');
  return state.stores.filter(store => !q || `${store.name} ${store.code}`.toLocaleLowerCase('es').includes(q) ||
    state.accounts.some(account => account.store_code === store.code &&
      `${account.email || ''} ${account.collaborator || ''} ${account.role}`.toLocaleLowerCase('es').includes(q)));
}

function statusPill(value, store = false) {
  const positive = value === 'confirmada' || value === 'confirmado';
  return node('span', `status-pill ${positive ? 'confirmed' : 'pending'}`,
    store ? positive ? 'Sucursal confirmada' : 'Sucursal pendiente' : positive ? 'Correo confirmado' : 'Correo pendiente');
}

function renderDashboard() {
  app.replaceChildren(createHeader());
  const main = node('main', 'main');
  const heading = node('section', 'page-head');
  const headLeft = node('div');
  headLeft.append(node('h1', '', 'Consolidado de sucursales'),
    node('p', '', 'Confirmá cada sucursal y cada correo por separado. Podés registrar varias personas en un mismo rol.'));
  const actions = node('div', 'page-actions');
  actions.append(button('Nueva sucursal', 'btn-soft btn-sm', () => openStoreForm()),
    button('Exportar CSV', 'btn-soft btn-sm', exportCsv));
  heading.append(headLeft, actions); main.append(heading);

  const kpis = node('section', 'kpis');
  const values = [
    ['Sucursales', state.stores.length],
    ['Sucursales confirmadas', state.stores.filter(store => store.status === 'confirmada').length],
    ['Correos registrados', state.accounts.filter(account => account.email).length],
    ['Correos confirmados', state.accounts.filter(account => account.email_status === 'confirmado').length]
  ];
  for (const [label, number] of values) {
    const tile = node('div', 'kpi');
    tile.append(node('div', 'kpi-label', label), node('div', 'kpi-value', String(number)));
    kpis.append(tile);
  }
  main.append(kpis);

  const board = node('div', 'workspace');
  const left = node('aside', 'box');
  const leftHeader = node('div', 'box-head');
  leftHeader.append(node('h2', '', 'Sucursales'), node('small', 'muted', `${filteredStores().length} visibles`));
  left.append(leftHeader);
  const searchWrap = node('div', 'p-3 border-bottom');
  const search = node('input', 'form-control form-control-sm');
  search.type = 'search'; search.placeholder = 'Buscar tienda, correo o persona';
  search.setAttribute('aria-label', 'Buscar tienda, correo o persona'); search.value = state.query;
  search.addEventListener('input', () => {
    state.query = search.value.trim();
    const cursor = search.selectionStart;
    renderDashboard();
    const newInput = document.querySelector('input[type="search"]');
    newInput?.focus();
    try { newInput?.setSelectionRange(cursor, cursor); } catch { /* no selección durante IME */ }
  });
  searchWrap.append(search); left.append(searchWrap);
  const list = node('div', 'store-scroll');
  if (!filteredStores().length) list.append(node('div', 'empty', 'No hay sucursales para esta búsqueda.'));
  for (const store of filteredStores()) {
    const row = node('button', `store-row${state.selected === store.code ? ' selected' : ''}`);
    row.type = 'button'; row.setAttribute('aria-pressed', String(state.selected === store.code));
    const info = node('div'); info.append(node('div', 'store-name', store.name), node('div', 'store-code', store.code));
    const right = node('div', 'store-right');
    right.append(node('strong', '', String(state.accounts.filter(a => a.store_code === store.code).length)), statusPill(store.status, true));
    row.append(info, right);
    row.addEventListener('click', () => { state.selected = store.code; state.role = 'Todos'; state.emailStatus = 'Todos'; renderDashboard(); });
    list.append(row);
  }
  left.append(list);
  const detail = node('section', 'box');
  renderStoreDetail(detail);
  board.append(left, detail); main.append(board);
  main.append(node('p', 'footer-note', 'Los registros importados siguen pendientes hasta que IT los confirme. Una persona sin correo también puede aparecer como plaza pendiente.'));
  app.append(main);
}

function renderStoreDetail(root) {
  const store = state.stores.find(item => item.code === state.selected);
  if (!store) { root.append(node('div', 'empty', 'Seleccioná una sucursal.')); return; }
  const head = node('div', 'detail-head');
  const line = node('div', 'detail-top');
  const title = node('div');
  title.append(node('h2', '', store.name), node('small', '', store.code));
  const actions = node('div', 'detail-actions');
  actions.append(statusPill(store.status, true));
  actions.append(button('Editar sucursal', 'btn-soft btn-sm', () => openStoreForm(store)));
  line.append(title, actions); head.append(line);
  const confirm = button(store.status === 'confirmada' ? 'Reabrir revisión' : 'Confirmar sucursal',
    store.status === 'confirmada' ? 'btn-soft btn-sm mt-2' : 'btn-renova btn-sm mt-2',
    () => changeStoreStatus(store));
  head.append(confirm);
  if (store.notes) head.append(node('div', 'notes', store.notes));
  const count = state.accounts.filter(account => account.store_code === store.code).length;
  head.append(node('div', 'detail-sub', `${count} registro${count === 1 ? '' : 's'} · ${state.accounts.filter(a => a.store_code === store.code && a.email).length} con correo`));
  root.append(head);

  const bar = node('div', 'section-bar');
  bar.append(node('strong', '', 'Correos y colaboradores'));
  const filters = node('div', 'mini-filters');
  filters.append(selectControl('Rol', ['Todos', ...ROLES], state.role, value => { state.role = value; renderDashboard(); }),
    selectControl('Estado', ['Todos', 'pendiente', 'confirmado'], state.emailStatus, value => { state.emailStatus = value; renderDashboard(); }),
    button('Agregar correo', 'btn-renova btn-sm', () => openAccountForm({ store_code: store.code })));
  bar.append(filters); root.append(bar);

  const list = node('div', 'accounts');
  const items = state.accounts.filter(account => account.store_code === store.code &&
    (state.role === 'Todos' || account.role === state.role) &&
    (state.emailStatus === 'Todos' || account.email_status === state.emailStatus));
  if (!items.length) {
    const blank = node('div', 'empty');
    blank.append(node('h3', '', 'Sin registros en este filtro'), node('div', '', 'Agregá una cuenta o cambiá el filtro para ver el resto.'));
    list.append(blank);
  }
  for (const account of items) {
    const row = node('article', 'account');
    const info = node('div', 'account-main');
    info.append(node('div', 'account-email', account.email || 'Sin correo asignado'),
      node('div', 'account-person', account.collaborator || 'Responsable por confirmar'),
      node('div', 'account-role', account.role));
    const right = node('div', 'account-actions');
    right.append(statusPill(account.email_status));
    right.append(button('Editar', 'btn-soft btn-sm', () => openAccountForm(account)));
    if (account.email) right.append(button(account.email_status === 'confirmado' ? 'Reabrir' : 'Confirmar',
      account.email_status === 'confirmado' ? 'btn-soft btn-sm' : 'btn-renova btn-sm',
      () => changeAccountStatus(account)));
    row.append(info, right); list.append(row);
  }
  root.append(list);
}

function selectControl(label, values, selected, onChange) {
  const select = node('select', 'form-select form-select-sm');
  select.setAttribute('aria-label', `Filtrar por ${label.toLowerCase()}`);
  for (const value of values) {
    const option = node('option', '', value === 'Todos' ? `${label}: todos` : value);
    option.value = value; select.append(option);
  }
  select.value = selected;
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

async function changeStoreStatus(store) {
  const confirmed = store.status !== 'confirmada';
  if (!window.confirm(confirmed ? `¿Confirmás la información de ${store.name}?` : `¿Volvés a dejar ${store.name} pendiente?`)) return;
  const { error } = await supabase.from('stores').update({
    status: confirmed ? 'confirmada' : 'pendiente',
    confirmed_at: confirmed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }).eq('code', store.code).select().single();
  if (error) return report(error);
  await loadData(); notice(confirmed ? 'Sucursal confirmada.' : 'Sucursal pendiente de revisión.');
}

async function changeAccountStatus(account) {
  const confirmed = account.email_status !== 'confirmado';
  if (confirmed && !account.email) return notice('Agregá un correo antes de confirmarlo.', true);
  if (!window.confirm(confirmed ? `¿Verificaste el correo ${account.email} y su asignación?` : `¿Volvés a dejar ${account.email} pendiente?`)) return;
  const { error } = await supabase.from('accounts').update({
    email_status: confirmed ? 'confirmado' : 'pendiente',
    confirmed_at: confirmed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }).eq('id', account.id).select().single();
  if (error) return report(error);
  await loadData(); notice(confirmed ? 'Correo confirmado.' : 'Correo pendiente de revisión.');
}

function inputField(form, title, name, value, { type = 'text', required = false, max = 160, help = '' } = {}) {
  const field = node('div', 'mb-3');
  const id = `field-${name}`;
  const label = node('label', 'form-label', title); label.htmlFor = id;
  const input = type === 'textarea' ? node('textarea', 'form-control') : node('input', 'form-control');
  input.id = id; input.name = name; input.value = value || ''; input.required = required;
  input.maxLength = max;
  if (type !== 'textarea') input.type = type; else input.rows = 3;
  field.append(label, input);
  if (help) field.append(node('div', 'form-text', help));
  form.append(field);
}

function formSelect(form, title, name, values, selected) {
  const wrap = node('div', 'mb-3');
  const label = node('label', 'form-label', title); label.htmlFor = `field-${name}`;
  const select = node('select', 'form-select');
  select.id = `field-${name}`; select.name = name;
  for (const [value, text] of values) { const option = node('option', '', text); option.value = value; select.append(option); }
  select.value = selected; wrap.append(label, select); form.append(wrap);
}

function modal(title, build, save) {
  dialogClose?.();
  const shade = node('div', 'modal d-block'); shade.style.background = '#0b283c88'; shade.tabIndex = -1;
  const center = node('div', 'modal-dialog modal-dialog-centered modal-dialog-scrollable');
  const content = node('div', 'modal-content');
  const header = node('div', 'modal-header');
  header.append(node('h2', 'modal-title', title));
  const close = node('button', 'btn-close'); close.type = 'button'; close.setAttribute('aria-label', 'Cerrar');
  header.append(close);
  const form = node('form');
  const body = node('div', 'modal-body'); build(body); form.append(body);
  const footer = node('div', 'modal-footer');
  footer.append(button('Cancelar', 'btn-soft', () => hide()));
  const submit = node('button', 'btn btn-renova', 'Guardar'); submit.type = 'submit'; footer.append(submit);
  form.append(footer); content.append(header, form); center.append(content); shade.append(center);
  function hide() { shade.remove(); document.removeEventListener('keydown', esc); dialogClose = null; }
  function esc(event) { if (event.key === 'Escape') hide(); }
  close.addEventListener('click', hide);
  shade.addEventListener('click', event => { if (event.target === shade) hide(); });
  document.addEventListener('keydown', esc);
  form.addEventListener('submit', async event => {
    event.preventDefault(); submit.disabled = true;
    try {
      const saved = await save(form);
      if (saved === false) { submit.disabled = false; return; }
      hide(); await loadData();
    }
    catch (error) { report(error); submit.disabled = false; }
  });
  dialogClose = hide; document.body.append(shade);
  form.querySelector('input')?.focus();
}

function openStoreForm(store = null) {
  modal(store ? 'Editar sucursal' : 'Nueva sucursal', body => {
    inputField(body, 'Código', 'code', store?.code || '', { required: true, max: 80 });
    inputField(body, 'Nombre de la sucursal', 'name', store?.name || '', { required: true });
    inputField(body, 'Observaciones', 'notes', store?.notes || '', { type: 'textarea', max: 4000 });
    body.append(node('p', 'form-text', 'El estado de confirmación se cambia desde la ficha de la sucursal.'));
  }, async form => {
    const values = Object.fromEntries(new FormData(form));
    const payload = { code: values.code.trim(), name: values.name.trim(), notes: values.notes.trim(), updated_at: new Date().toISOString() };
    const query = store ? supabase.from('stores').update(payload).eq('code', store.code) : supabase.from('stores').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    state.selected = data.code; notice(store ? 'Sucursal actualizada.' : 'Sucursal creada.');
  });
}

function openAccountForm(account = null) {
  const editing = !!account?.id;
  modal(editing ? 'Editar registro' : 'Agregar correo a la sucursal', body => {
    formSelect(body, 'Sucursal', 'store_code', state.stores.map(s => [s.code, `${s.name} · ${s.code}`]), account?.store_code || state.selected);
    inputField(body, 'Colaborador o plaza', 'collaborator', account?.collaborator || '', { max: 160, help: 'Podés escribir VACANTE si el correo corresponde a una plaza sin titular.' });
    formSelect(body, 'Rol', 'role', ROLES.map(role => [role, role]), account?.role || 'Asesor/a de sala');
    inputField(body, 'Correo electrónico', 'email', account?.email || '', { type: 'email', max: 254, help: 'Puede quedar vacío si la persona todavía no tiene correo.' });
    formSelect(body, 'Estado del correo', 'email_status', [['pendiente','Pendiente de confirmar'],['confirmado','Confirmado']], account?.email_status || 'pendiente');
    inputField(body, 'Observaciones', 'notes', account?.notes || '', { type: 'textarea', max: 4000 });
    if (editing) body.append(node('div', 'form-text', `Origen: ${account.source || 'Alta manual'}`));
  }, async form => {
    const values = Object.fromEntries(new FormData(form));
    const email = values.email.trim().toLowerCase() || null;
    if (values.email_status === 'confirmado' && !email) throw new Error('No se puede confirmar un registro sin correo.');
    if (values.email_status === 'confirmado' && (!editing || account.email_status !== 'confirmado') &&
        !window.confirm('¿Comprobaste el correo y su asignación antes de confirmarlo?')) return false;
    const payload = {
      store_code: values.store_code, collaborator: values.collaborator.trim(), role: values.role,
      email, email_status: values.email_status, notes: values.notes.trim(), updated_at: new Date().toISOString(),
      confirmed_at: values.email_status === 'confirmado' ? account?.confirmed_at || new Date().toISOString() : null
    };
    if (!editing) payload.source = 'Alta manual en el sistema web';
    const query = editing ? supabase.from('accounts').update(payload).eq('id', account.id) : supabase.from('accounts').insert(payload);
    const { error } = await query.select().single();
    if (error) throw error;
    state.selected = values.store_code; notice(editing ? 'Registro actualizado.' : 'Correo agregado a la sucursal.');
  });
}

function exportCsv() {
  const columns = ['Sucursal','Código','Colaborador','Rol','Correo','Estado del correo','Estado de sucursal','Observaciones'];
  const quote = value => {
    const raw = String(value ?? '');
    const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const lines = [columns.map(quote).join(',')];
  for (const account of state.accounts) {
    const store = state.stores.find(item => item.code === account.store_code);
    lines.push([store?.name, account.store_code, account.collaborator, account.role, account.email,
      account.email_status, store?.status, account.notes].map(quote).join(','));
  }
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'correos-tiendas-consolidado.csv'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

app.replaceChildren(node('div', 'loading-screen', 'Cargando consolidado...'));
supabase.auth.getSession().then(async ({ data, error }) => {
  if (error) throw error;
  state.user = data.session?.user || null;
  if (!state.user) { renderLogin(); return; }
  await loadData();
}).catch(error => { renderLogin(); report(error); });

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user && !state.user) {
    state.user = session.user;
    setTimeout(() => loadData().catch(report), 0);
  }
});
