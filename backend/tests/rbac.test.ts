import { describe, it, expect, vi } from 'vitest';
import { requireOwnership } from '../src/common/middleware/rbac.middleware';
describe('Resource ownership defaults', () => {
  it('denies access when the owner cannot be determined', () => {
    const next = vi.fn();
    requireOwnership(() => undefined)({ user: { id: 'user', roles: ['CUSTOMER'] } } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
