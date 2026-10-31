import jwt from 'jsonwebtoken';
import { z } from 'zod';

const sessionClaims = z.object({
  sub: z.string().uuid(),
  jti: z.string().uuid(),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
  tokenUse: z.enum(['access', 'refresh']),
  tokenVersion: z.number().int().nonnegative(),
});

export type SessionClaims = z.infer<typeof sessionClaims>;

export function verifySessionToken(token: string, secret: string, use: SessionClaims['tokenUse']): SessionClaims {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  const parsed = sessionClaims.safeParse(decoded);
  if (!parsed.success || parsed.data.tokenUse !== use) {
    throw new jwt.JsonWebTokenError('Invalid session claims');
  }
  return parsed.data;
}
