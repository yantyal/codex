export type HealthResponse = { status: 'ok' };
export type AuthUserResponse = { id: string; name: string; email: string };
export type AuthResponse = { user: AuthUserResponse; csrfToken: string };
export type ApiErrorResponse = { message: string };
