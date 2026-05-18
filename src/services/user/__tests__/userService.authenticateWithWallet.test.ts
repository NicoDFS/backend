import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Prisma client singleton before importing the service. The alias
// `@/lib/prisma` resolves to the same module userService imports via
// `../../lib/prisma`, so this intercepts the real DB client.
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { userService } from '../userService';

const WALLET = '0xAbCdEf0000000000000000000000000000001234';
const NORM = WALLET.toLowerCase();

// Shape a User row well enough for generateAuthToken + the resolver.
const makeUser = (over: Record<string, unknown> = {}) => ({
  id: 'user-1',
  username: NORM,
  email: null,
  passwordHash: 'hash',
  salt: 'salt',
  thirdwebWalletAddress: NORM,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...over,
});

// Mimics a Prisma P2002 unique-constraint error.
const p2002 = (target: string[]) =>
  Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: { target },
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('userService.authenticateWithWallet', () => {
  it('found-by-thirdweb: returns existing user, no create/update', async () => {
    const existing = makeUser();
    mockPrisma.user.findFirst.mockResolvedValueOnce(existing);

    const { token, user } = await userService.authenticateWithWallet(WALLET);

    expect(user.id).toBe('user-1');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    // Lookup matches on either field, lowercased.
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { thirdwebWalletAddress: NORM },
          { username: NORM },
        ],
      },
    });
  });

  it('legacy found-by-username: backfills thirdwebWalletAddress, no create', async () => {
    // Legacy row: username == wallet, but thirdwebWalletAddress never set.
    const legacy = makeUser({ thirdwebWalletAddress: null });
    mockPrisma.user.findFirst.mockResolvedValueOnce(legacy);
    mockPrisma.user.update.mockResolvedValueOnce(makeUser());

    const { user } = await userService.authenticateWithWallet(WALLET);

    expect(user.thirdwebWalletAddress).toBe(NORM);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { thirdwebWalletAddress: NORM },
    });
  });

  it('regression: P2002 on username (the reported crash) recovers via re-lookup + backfill', async () => {
    // Initial lookup misses (concurrent insert / race), create then collides
    // on the unique username, and the second lookup finds the now-existing
    // row. Old code threw here; new code must backfill and return it.
    mockPrisma.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeUser({ thirdwebWalletAddress: null }));
    mockPrisma.user.create.mockRejectedValueOnce(p2002(['username']));
    mockPrisma.user.update.mockResolvedValueOnce(makeUser());

    const { user } = await userService.authenticateWithWallet(WALLET);

    expect(user.id).toBe('user-1');
    expect(user.thirdwebWalletAddress).toBe(NORM);
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('email-conflict: drops the conflicting email and creates the wallet user', async () => {
    mockPrisma.user.findFirst
      .mockResolvedValueOnce(null) // initial lookup
      .mockResolvedValueOnce(null); // re-lookup after P2002 finds no wallet row
    mockPrisma.user.create
      .mockRejectedValueOnce(p2002(['email'])) // email already taken elsewhere
      .mockResolvedValueOnce(makeUser({ email: null })); // retry sans email

    const { user } = await userService.authenticateWithWallet(
      WALLET,
      'taken@example.com',
    );

    expect(user.id).toBe('user-1');
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(2);
    // The retry create must not include the conflicting email.
    const retryArgs = mockPrisma.user.create.mock.calls[1][0];
    expect(retryArgs.data.email).toBeUndefined();
    expect(retryArgs.data.username).toBe(NORM);
    expect(retryArgs.data.thirdwebWalletAddress).toBe(NORM);
  });

  it('no existing user: creates a fresh wallet user', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce(makeUser());

    const { user } = await userService.authenticateWithWallet(WALLET);

    expect(user.id).toBe('user-1');
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    const args = mockPrisma.user.create.mock.calls[0][0];
    expect(args.data.username).toBe(NORM);
    expect(args.data.thirdwebWalletAddress).toBe(NORM);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('non-P2002 errors propagate', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockRejectedValueOnce(new Error('db down'));

    await expect(userService.authenticateWithWallet(WALLET)).rejects.toThrow(
      'db down',
    );
  });
});
