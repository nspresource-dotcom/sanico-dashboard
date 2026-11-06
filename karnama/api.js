// لایهٔ ارتباط با سرور
async function call(method, path, body, query) {
  const url = new URL(path, location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = {};
  try { data = await res.json(); } catch { /* بدون بدنه */ }
  if (!res.ok) {
    const err = new Error(data.error || 'خطا در ارتباط با سرور');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const API = {
  mode: 'server',
  login: (username, password) => call('POST', '/api/auth/login', { username, password }),
  logout: () => call('POST', '/api/auth/logout', {}),
  me: () => call('GET', '/api/auth/me'),
  changePassword: (current, next) => call('POST', '/api/auth/password', { current, next }),

  users: {
    list: () => call('GET', '/api/users'),
    create: (d) => call('POST', '/api/users', d),
    update: (id, d) => call('PATCH', `/api/users/${id}`, d),
    setPassword: (id, password) => call('POST', `/api/users/${id}/password`, { password }),
    impact: (id) => call('GET', `/api/users/${id}/impact`),
    remove: (id, confirmUsername) => call('DELETE', `/api/users/${id}`, {
      acknowledge: true, confirm_username: confirmUsername,
    }),
  },

  boards: {
    list: () => call('GET', '/api/boards'),
    create: (d) => call('POST', '/api/boards', d),
    update: (id, d) => call('PATCH', `/api/boards/${id}`, d),
  },

  board: {
    get: (boardId) => call('GET', '/api/board', null, { board_id: boardId }),
    addColumn: (d) => call('POST', '/api/columns', d),
    updateColumn: (id, d) => call('PATCH', `/api/columns/${id}`, d),
    removeColumn: (id) => call('DELETE', `/api/columns/${id}`, {}),
  },

  labels: {
    list: () => call('GET', '/api/labels'),
    create: (d) => call('POST', '/api/labels', d),
    remove: (id) => call('DELETE', `/api/labels/${id}`, {}),
    setOn: (taskId, ids) => call('PUT', `/api/tasks/${taskId}/labels`, { label_ids: ids }),
  },

  tasks: {
    get: (id) => call('GET', `/api/tasks/${id}`),
    create: (d) => call('POST', '/api/tasks', d),
    update: (id, d) => call('PATCH', `/api/tasks/${id}`, d),
    remove: (id) => call('DELETE', `/api/tasks/${id}`, {}),
    comment: (id, body) => call('POST', `/api/tasks/${id}/comments`, { body }),
    addCheck: (id, title) => call('POST', `/api/tasks/${id}/checklist`, { title }),
    setCheck: (cid, d) => call('PATCH', `/api/checklist/${cid}`, d),
    delCheck: (cid) => call('DELETE', `/api/checklist/${cid}`, {}),
    addLink: (id, d) => call('POST', `/api/tasks/${id}/links`, d),
    delLink: (lid) => call('DELETE', `/api/links/${lid}`, {}),
  },

  notifications: {
    list: () => call('GET', '/api/notifications'),
    markRead: (ids) => call('POST', '/api/notifications/read', { ids }),
  },

  recurrences: {
    list: () => call('GET', '/api/recurrences'),
    create: (d) => call('POST', '/api/recurrences', d),
    update: (id, d) => call('PATCH', `/api/recurrences/${id}`, d),
    remove: (id) => call('DELETE', `/api/recurrences/${id}`, {}),
  },

  units: {
    list: () => call('GET', '/api/units'),
    create: (d) => call('POST', '/api/units', d),
    update: (id, d) => call('PATCH', `/api/units/${id}`, d),
    productivity: (id, query) => call('GET', `/api/units/${id}/productivity`, null, query),
    score: (id, d) => call('PUT', `/api/units/${id}/score`, d),
  },

  review: {
    list: () => call('GET', '/api/review'),
    submit: (taskId) => call('POST', `/api/tasks/${taskId}/submit`, {}),
    decide: (taskId, d) => call('POST', `/api/tasks/${taskId}/review`, d),
  },

  reports: {
    units: (query) => call('GET', '/api/reports/units', null, query),
  },

  positions: {
    list: () => call('GET', '/api/positions'),
    create: (d) => call('POST', '/api/positions', d),
    update: (id, d) => call('PATCH', `/api/positions/${id}`, d),
    remove: (id) => call('DELETE', `/api/positions/${id}`, {}),
    assign: (userId, positionId) => call('PUT', `/api/users/${userId}/position`,
      { position_id: positionId || null }),
  },

  kpi: {
    list: (query) => call('GET', '/api/kpi', null, query),
    create: (d) => call('POST', '/api/kpi', d),
    update: (id, d) => call('PATCH', `/api/kpi/${id}`, d),
    remove: (id) => call('DELETE', `/api/kpi/${id}`, {}),
    setValue: (id, d) => call('PUT', `/api/kpi/${id}/value`, d),
  },

  stock: {
    setup: () => call('GET', '/api/stock/setup'),
    onHand: (query) => call('GET', '/api/stock', null, query),
    card: (query) => call('GET', '/api/stock/card', null, query),
    items: (query) => call('GET', '/api/stock/items', null, query),
    createItem: (d) => call('POST', '/api/stock/items', d),
    updateItem: (id, d) => call('PATCH', `/api/stock/items/${id}`, d),
    warehouses: () => call('GET', '/api/stock/warehouses'),
    createWarehouse: (d) => call('POST', '/api/stock/warehouses', d),
    updateWarehouse: (id, d) => call('PATCH', `/api/stock/warehouses/${id}`, d),
    createUom: (d) => call('POST', '/api/stock/uoms', d),
    createGroup: (d) => call('POST', '/api/stock/groups', d),
    entries: (query) => call('GET', '/api/stock/entries', null, query),
    entry: (id) => call('GET', `/api/stock/entries/${id}`),
    createEntry: (d) => call('POST', '/api/stock/entries', d),
    updateEntry: (id, d) => call('PATCH', `/api/stock/entries/${id}`, d),
    removeEntry: (id) => call('DELETE', `/api/stock/entries/${id}`, {}),
    submitEntry: (id) => call('POST', `/api/stock/entries/${id}/submit`, {}),
    cancelEntry: (id, reason) => call('POST', `/api/stock/entries/${id}/cancel`, { reason }),
  },

  chat: {
    list: () => call('GET', '/api/chat'),
    unread: () => call('GET', '/api/chat/unread'),
    directory: () => call('GET', '/api/chat/directory'),
    direct: (userId) => call('POST', '/api/chat/direct', { user_id: userId }),
    group: (title, userIds) => call('POST', '/api/chat/group', { title, user_ids: userIds }),
    messages: (id, query) => call('GET', `/api/chat/${id}/messages`, null, query),
    send: (id, d) => call('POST', `/api/chat/${id}/messages`, d),
    update: (id, d) => call('PATCH', `/api/chat/${id}`, d),
    mute: (id, muted) => call('PATCH', `/api/chat/${id}/mute`, { muted }),
    leave: (id) => call('POST', `/api/chat/${id}/leave`, {}),
    editMessage: (mid, body) => call('PATCH', `/api/chat/messages/${mid}`, { body }),
    removeMessage: (mid) => call('DELETE', `/api/chat/messages/${mid}`, {}),
  },

  notify: {
    status: () => call('GET', '/api/notify/status'),
    test: (userId) => call('POST', '/api/notify/test', { user_id: userId || null }),
  },

  myday: () => call('GET', '/api/myday'),
  workload: () => call('GET', '/api/workload'),

  timelogs: {
    list: (query) => call('GET', '/api/timelogs', null, query),
    create: (d) => call('POST', '/api/timelogs', d),
    update: (id, d) => call('PATCH', `/api/timelogs/${id}`, d),
    remove: (id) => call('DELETE', `/api/timelogs/${id}`, {}),
    review: (ids, status, note) => call('POST', '/api/timelogs/review', { ids, status, review_note: note }),
  },

  scores: {
    list: (query) => call('GET', '/api/scores', null, query),
    save: (d) => call('PUT', '/api/scores', d),
  },

  stats: (query) => call('GET', '/api/stats', null, query),
};
