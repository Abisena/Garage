const toSlug = (value) => {
  if (!value) return '';
  return String(value).trim().toLowerCase();
};

export const ROLE_GROUPS = {
  admin: new Set([
    'admin',
    'administrator',
    'system manager',
    'manager bengkel',
    'garage manager',
    'head manager bengkel',
    'head admin',
  ]),
  sparepart: new Set([
    'sparepart',
    'spare part',
    'head sparepart',
    'head spare part',
    'inventory',
    'inventory controller',
  ]),
  serviceAdvisor: new Set([
    'service advisor',
    'service',
    'servis',
    'head service',
  ]),
  foreman: new Set([
    'foreman',
    'qc foreman',
    'qc foreman & opl',
  ]),
  mechanic: new Set([
    'mechanic',
    'mekanik',
    'technician',
    'teknisi',
    'head teknisi',
    'head mechanic',
  ]),
};

export const SPECIALIST_ROLE_GROUPS = ['sparepart', 'serviceAdvisor', 'foreman', 'mechanic'];

export const buildRoleSet = (roles = []) => {
  const normalized = new Set();
  (roles || []).forEach((role) => {
    const slug = toSlug(role);
    if (slug) {
      normalized.add(slug);
    }
  });
  return normalized;
};

export const hasRoleInGroup = (roleSet, groupName) => {
  if (!roleSet || !(roleSet instanceof Set)) {
    return false;
  }

  const targetGroup = ROLE_GROUPS[groupName];
  if (!targetGroup) {
    return false;
  }

  for (const role of targetGroup) {
    if (roleSet.has(role)) {
      return true;
    }
  }
  return false;
};

export const isUserPrivileged = (user, roleSet) => {
  const normalized = roleSet || buildRoleSet(user?.roles);
  if (user?.username && user.username.toLowerCase() === 'administrator') {
    return true;
  }

  return hasRoleInGroup(normalized, 'admin');
};

export const determinePrimaryRole = (roles = [], username) => {
  if (username && username.toLowerCase() === 'administrator') {
    return 'admin';
  }

  const normalized = buildRoleSet(roles);
  if (hasRoleInGroup(normalized, 'admin')) {
    return 'admin';
  }

  return 'branch';
};
