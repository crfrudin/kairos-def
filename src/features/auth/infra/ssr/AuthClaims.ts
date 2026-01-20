export type AuthClaims = {
  is_authenticated: boolean;
  user_id: string | null;
  email_confirmed: boolean;
};
