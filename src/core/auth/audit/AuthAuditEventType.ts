export type AuthAuditEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'signup'
  | 'email_confirmed'
  | 'password_reset_requested'
  | 'password_reset_completed';
