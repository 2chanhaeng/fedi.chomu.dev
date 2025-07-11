export interface ProviderUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}
