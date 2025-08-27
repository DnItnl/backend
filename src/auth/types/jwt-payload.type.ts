export interface JwtPayload {
  sub: string; // user ID
  email: string; // user email
  username: string; // user username
  iat?: number; // issued at (автоматически добавляется JWT)
  exp?: number; // expires at (автоматически добавляется JWT)
}
