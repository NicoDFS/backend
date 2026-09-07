import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { KALYCHAIN_TOKENS, KALYCHAIN_CONTRACTS } from '../chain';

/**
 * Guard: the 3888 chain is gone. Nothing in the backend or its subgraphs may reference the old
 * chain id, the abandoned Clisha id-holder, 3888-era contract addresses, or the 3888 RPC.
 */
const ROOT = resolve(__dirname, '../../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'build', 'generated', '.next', '__tests__'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|yaml|yml|toml|prisma)$/.test(name)) out.push(p);
  }
  return out;
}

const files = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'subgraphs')), join(ROOT, 'package.json')];

const FORBIDDEN: Array<[string, RegExp]> = [
  ['chain id 3888', /\b3888\b/],
  ['chain id 3889', /\b3889\b/],
  ['clisha', /clisha/i],
  ['3888 mainnet RPC', /https:\/\/rpc\.kalychain\.io/],
  ['old kalyswap/ subgraph names', /kalyswap\/(dex|bridge|staking|launchpad|farming)-subgraph/],
  ['3888 WKLC (= 3890 mailbox, never a token here)', /0x069255299Bb729399f3CECaBdc73d15d3D10a2A3.*WKLC/i],
  ['3888 USDT', /0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A/i],
  ['3888 KalyStaking', /0xF670A2D32a2b25e181B26Abb02614a20eA1eA2D9/i],
  ['3888 Mailbox', /0xa87EF115066A311C88A6E5E86B93E4E2b1C33723/i],
  ['3888 KLC HypNative', /0x8A1ABbB167b149F2493C8141091028fD812Da6E4/i],
  ['V2 factory', /0xD42Af909d323D88e0E933B6c50D3e91c279004ca/i],
  ['V2 router', /0x183F288BF7EEBe1A3f318F4681dF4a70ef32B2f3/i],
  ['KSWAP', /0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a/i],
];

describe('no 3888 leftovers', () => {
  it.each(FORBIDDEN)('nothing references %s', (_label, re) => {
    const hits = files.filter(f => re.test(readFileSync(f, 'utf8'))).map(f => f.replace(ROOT + '/', ''));
    expect(hits).toEqual([]);
  });
});

describe('subgraph manifests match config/chain.ts', () => {
  const known = new Set([
    ...Object.values(KALYCHAIN_TOKENS).map(t => t.address.toLowerCase()),
    ...Object.values(KALYCHAIN_CONTRACTS).map(a => a.toLowerCase()),
  ]);
  it.each(['bridge', 'staking', 'launchpad'])('%s: every data source is on network kmt at a known 3890 address', (name) => {
    const yaml = readFileSync(join(ROOT, 'subgraphs', name, 'subgraph.yaml'), 'utf8');
    const networks = [...yaml.matchAll(/^\s+network:\s*(\S+)/gm)].map(m => m[1]);
    expect(networks.length).toBeGreaterThan(0);
    expect(new Set(networks)).toEqual(new Set(['kmt']));
    const addresses = [...yaml.matchAll(/address:\s*"(0x[0-9a-fA-F]{40})"/g)].map(m => m[1].toLowerCase());
    expect(addresses.length).toBeGreaterThan(0);
    for (const a of addresses) expect(known.has(a), `${name}: ${a} not in config/chain.ts`).toBe(true);
  });

  it('graph-node is configured for chain kmt on the 3890 RPC', () => {
    expect(readFileSync(join(ROOT, 'subgraphs/config.toml'), 'utf8')).toMatch(/\[chains\.kmt\][\s\S]*https:\/\/[a-z0-9.-]*kalychain\.io\/rpc/);
    expect(readFileSync(join(ROOT, 'subgraphs/docker-compose.yml'), 'utf8')).toMatch(/'kmt:https:\/\/[a-z0-9.-]*kalychain\.io\/rpc'/);
  });
});
