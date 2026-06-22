/**
 * Read-only diagnostic for the authenticateWithWallet username-collision bug.
 *
 * Reports which User rows collide with the username/email derived from a
 * Thirdweb wallet login, and whether the userService fix will recover them.
 *
 * Usage:
 *   node scripts/diagnose-wallet-user.mjs <walletAddress> [email]
 *
 * Performs ONLY reads (findFirst/findMany). It never writes or deletes.
 */

import fs from 'fs';
import { PrismaClient } from '@prisma/client';

// Minimal .env loader — Prisma Client (unlike the prisma CLI) does not read
// .env itself, so DATABASE_URL must be in the environment before connecting.
if (!process.env.DATABASE_URL) {
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
}

const prisma = new PrismaClient();

const walletArg = process.argv[2];
const emailArg = process.argv[3];

if (!walletArg) {
  console.error('Usage: node scripts/diagnose-wallet-user.mjs <walletAddress> [email]');
  process.exit(1);
}

const normalizedAddress = walletArg.toLowerCase();

const pick = (u) =>
  u && {
    id: u.id,
    username: u.username,
    email: u.email,
    thirdwebWalletAddress: u.thirdwebWalletAddress,
    walletMigrationStatus: u.walletMigrationStatus,
    createdAt: u.createdAt,
  };

async function main() {
  console.log('=== Wallet auth diagnostic ===');
  console.log('walletAddress (raw):       ', walletArg);
  console.log('walletAddress (normalized):', normalizedAddress);
  if (emailArg) console.log('email:                     ', emailArg);
  console.log();

  // 1. Old fast-path lookup: by thirdwebWalletAddress only.
  const byThirdweb = await prisma.user.findFirst({
    where: { thirdwebWalletAddress: normalizedAddress },
  });

  // 2. Row that owns the username the create() would try to insert.
  const byUsername = await prisma.user.findFirst({
    where: { username: normalizedAddress },
  });

  // 3. The account RINDRA referenced (if an email was supplied).
  const byEmail = emailArg
    ? await prisma.user.findFirst({ where: { email: emailArg } })
    : null;

  console.log('[1] Match by thirdwebWalletAddress (old code path):');
  console.log(byThirdweb ? pick(byThirdweb) : '  (none)');
  console.log();

  console.log('[2] Match by username == normalized wallet address:');
  console.log(byUsername ? pick(byUsername) : '  (none)');
  console.log();

  if (emailArg) {
    console.log(`[3] Match by email == ${emailArg}:`);
    console.log(byEmail ? pick(byEmail) : '  (none)');
    console.log();
  }

  // Verdict against the new lookup logic (thirdweb OR username).
  console.log('=== Verdict ===');
  if (byThirdweb) {
    console.log('OLD code: OK   — found via thirdwebWalletAddress, no create attempted.');
    console.log('NEW code: OK   — same fast path.');
  } else if (byUsername) {
    console.log('OLD code: FAIL — not found by thirdwebWalletAddress, create() collides on');
    console.log(`                 username "${normalizedAddress}" (owned by user ${byUsername.id}).`);
    console.log('                 This is the reported P2002 crash.');
    console.log('NEW code: OK   — matched by username; thirdwebWalletAddress will be');
    console.log('                 backfilled and this existing account reused.');
    if (byUsername.thirdwebWalletAddress && byUsername.thirdwebWalletAddress !== normalizedAddress) {
      console.log();
      console.log('NOTE: that row already has a DIFFERENT thirdwebWalletAddress:');
      console.log('     ', byUsername.thirdwebWalletAddress);
      console.log('      Backfill will overwrite it — review before deploying.');
    }
  } else {
    console.log('OLD code: OK   — no collision, a fresh user would be created.');
    console.log('NEW code: OK   — same, fresh user created.');
  }

  if (emailArg && byEmail && (!byUsername || byEmail.id !== byUsername.id)) {
    console.log();
    console.log(`NOTE: the email ${emailArg} belongs to a SEPARATE account`);
    console.log(`      (user ${byEmail.id}, username "${byEmail.username}") than the`);
    console.log('      wallet/username row above. Deleting it would not have fixed the');
    console.log('      username collision.');
  }
}

main()
  .catch((e) => {
    console.error('Diagnostic failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
