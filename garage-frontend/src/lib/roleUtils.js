const toSlug = (value) => {
  if (!value) return '';
  return String(value).trim().toLowerCase();
};

export const ROLE_GROUPS = {
  admin: new Set([
    'Admin',
    'Administrator',
    'System Manager',
    'Manager Bengkel',
    'Garage Manager',
    'Head Manager Bengkel',
    'Head Admin',
  ]),
  sparepart: new Set([
    'Sparepart',
    'Spare Part',
    'Head Sparepart',
    'Head Spare Part',
    'Inventory',
    'Inventory Controller',
  ]),
  serviceAdvisor: new Set([
    'Service Advisor',
    'Service',
    'Servis',
    'Head Service',
  ]),
  qualityManager: new Set([
    'Quality Manager',
    'QC Manager',
    'QC Lead',
    'Quality Control',
  ]),
  foreman: new Set([
    'Foreman',
    'Qc Foreman',
    'Qc Foreman & Opl',
  ]),
  mechanic: new Set([
    'Technician',
    'Teknisi',
    'Head Teknisi',
  ]),
  cashier: new Set([
    'Cashier',
    'Head Cashier',
  ]),
  finance: new Set([
    'Finance',
    'Finance Staff',
    'Finance Manager',
  ]),
  receptionist: new Set([
    'Front Desk',
    'Registrasi',
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
    const normalizedRole = toSlug(role);
    if (roleSet.has(normalizedRole)) {
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

// ✅ IMPROVED: Return more specific role
export const determinePrimaryRole = (roles = [], username) => {
  if (username && username.toLowerCase() === 'administrator') {
    return 'admin';
  }

  const normalized = buildRoleSet(roles);
  
  // Check in priority order
  if (hasRoleInGroup(normalized, 'admin')) {
    return 'admin';
  }
  
  if (hasRoleInGroup(normalized, 'foreman')) {
    return 'foreman';
  }

  if (hasRoleInGroup(normalized, 'mechanic')) {
    return 'mechanic';
  }

  if (hasRoleInGroup(normalized, 'serviceAdvisor')) {
    return 'serviceAdvisor';
  }

  if (hasRoleInGroup(normalized, 'qualityManager')) {
    return 'qualityManager';
  }

  if (hasRoleInGroup(normalized, 'sparepart')) {
    return 'sparepart';
  }

  if (hasRoleInGroup(normalized, 'cashier')) {
    return 'cashier';
  }

  if (hasRoleInGroup(normalized, 'finance')) {
    return 'finance';
  }
  
  if (hasRoleInGroup(normalized, 'receptionist')) {
    return 'receptionist';
  }

  // Default fallback
  return 'branch';
};