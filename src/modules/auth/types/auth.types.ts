export interface JwtPayload {
  sub: string;
  email: string;
  roleId: string | null;
  tenantId: string | null;
  branchId: string | null;
  isSuperAdmin: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  isSuperAdmin: boolean;
  roleId: string | null;
  roleName: string | null;
  tenantId: string | null;
  tenantName: string | null;
  branchId: string | null;
}

export interface AuthTokensResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface StaffMembershipRecord {
  id: bigint;
  tenantId: bigint | null;
  branchId: bigint | null;
  roleId: bigint;
  statusId?: bigint;
  role: { id: bigint; name: string };
  tenant: { id: bigint; name: string } | null;
}

export interface StaffUserRecord {
  id: bigint;
  email: string | null;
  phone: string | null;
  fullName: string;
  passwordHash: string | null;
  statusId: bigint;
  tenantId?: bigint | null;
  tenant?: { name: string } | null;
  memberships: StaffMembershipRecord[];
}
