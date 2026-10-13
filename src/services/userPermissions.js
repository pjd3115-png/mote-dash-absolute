import { createPermissions } from '@/services/permissions';

export const PROFILES = {
  Admin_c: { label: 'Admin', isDefault: false, isPublic: false, canManageTeam: false, reportsTo: null },
  Member_c: { label: 'Reviewer', isDefault: true, isPublic: false, canManageTeam: false, reportsTo: 'Admin_c' },
};

const TABLE_PERMISSIONS = {
  Admin_c: {
    checks_c: { access: 'Full' },
    claims_c: { access: 'Full' },
  },
  Member_c: {
    checks_c: { access: 'Full' },
    claims_c: { access: 'Read' },
  },
};

export const { getProfileMeta, getTableAccess, getFieldAccess } = createPermissions(PROFILES, TABLE_PERMISSIONS);
