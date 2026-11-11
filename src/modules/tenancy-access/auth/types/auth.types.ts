export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user?: AuthUser;
}
