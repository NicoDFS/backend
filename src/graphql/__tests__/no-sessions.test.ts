import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Guard: the custodial-wallet / password / JWT / API-key surface was deleted on
 * 2026-08-27 (thirdweb in-app wallets need no backend session). If any of these
 * names come back into the schema, something is being re-added by accident.
 */
const ROOT = resolve(__dirname, '../../..');
const schemaSrc = readFileSync(resolve(ROOT, 'src/graphql/schema.ts'), 'utf8');
const prismaSrc = readFileSync(resolve(ROOT, 'prisma/schema.prisma'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

describe('no session / custodial surface in the GraphQL schema', () => {
  it.each([
    'authenticateWithWallet', 'login(', 'register(', 'me: User', 'createWallet', 'importWallet', 'exportWallet',
    'sendTransaction', 'trackSendTransaction', 'createApiKey', 'myApiKeys', 'walletMigrationStatus',
    'linkThirdwebWallet', 'type User ', 'type Wallet ', 'type ApiKey ', 'type AuthResponse', 'user: User!',
  ])('schema does not expose %s', (needle) => {
    expect(schemaSrc).not.toContain(needle);
  });

  it('launchpad rows are keyed to the on-chain deployer', () => {
    expect(schemaSrc).toContain('ownerAddress: String!');
    expect(schemaSrc).toContain('projectsByOwner(ownerAddress: String!');
    expect(schemaSrc).toContain('fairlaunchesByOwner(ownerAddress: String!');
  });
});

describe('no session / custodial storage', () => {
  it.each(['model User ', 'model Wallet ', 'model ApiKey ', 'model Transaction ', 'model WalletMigration ', 'passwordHash', 'encryptedPrivateKey'])(
    'prisma schema has no %s', (needle) => expect(prismaSrc).not.toContain(needle),
  );
  it('Project and FairlaunchProject carry ownerAddress instead of a user relation', () => {
    expect(prismaSrc.match(/ownerAddress\s+String/g)).toHaveLength(2);
    expect(prismaSrc).not.toMatch(/userId/);
  });
});

describe('no auth dependencies or endpoints', () => {
  it.each(['jsonwebtoken', 'bcryptjs', 'crypto', 'uuid'])('package.json no longer depends on %s', (dep) => {
    expect(pkg.dependencies).not.toHaveProperty(dep);
  });
  it.each([
    'src/pages/api/auth/thirdweb.ts', 'src/services/user', 'src/services/auth', 'src/services/migration',
    'src/graphql/resolvers/user.ts', 'src/graphql/resolvers/apiKey.ts', 'src/graphql/resolvers/migration.ts',
  ])('%s is gone', (p) => expect(existsSync(resolve(ROOT, p))).toBe(false));
});
