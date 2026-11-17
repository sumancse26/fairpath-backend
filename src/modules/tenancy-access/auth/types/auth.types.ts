export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface TenantRoleInfo {
  tenantId: string | null;
  tenantName?: string;
  // tenantSlug?: string;
  roleName: string;
  // roleSlug: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status: string;
  isSuperAdmin: boolean;
  memberships: TenantRoleInfo[];
}

export interface AuthTokensResponse {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RefreshTokenResponse {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface StaffMembershipRecord {
  id: bigint;
  tenantId: bigint | null;
  status: string;
  role: {
    name: string;
    // slug: string;
  };
  tenant: {
    id: bigint;
    name: string;
    // slug: string;
  } | null;
}

export interface StaffUserRecord {
  id: bigint;
  email: string | null;
  phone: string | null;
  fullName: string;
  passwordHash: string | null;
  status: string;
  memberships: StaffMembershipRecord[];
}
