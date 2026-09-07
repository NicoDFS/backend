import { describe, it, expect, vi } from 'vitest';
import { ethers } from 'ethers';
import { verifyDeployment, DeploymentVerificationError } from '../deploymentVerifier';

const TX = '0x' + 'ab'.repeat(32);
const SALE = '0x1111111111111111111111111111111111111111';
const FACTORY = '0x2222222222222222222222222222222222222222';
const DEPLOYER = '0xAbCdEf0123456789AbCdEf0123456789AbCdEf01';
const BLOCK = 254_000;

function receipt(overrides: Partial<ethers.providers.TransactionReceipt> = {}) {
  return {
    status: 1,
    blockNumber: BLOCK,
    from: DEPLOYER,
    contractAddress: null as unknown as string,
    logs: [] as ethers.providers.Log[],
    ...overrides,
  } as ethers.providers.TransactionReceipt;
}

function providerReturning(r: ethers.providers.TransactionReceipt | null) {
  return { getTransactionReceipt: vi.fn().mockResolvedValue(r) } as unknown as ethers.providers.Provider;
}

const claim = { transactionHash: TX, contractAddress: SALE, blockNumber: BLOCK };

describe('verifyDeployment', () => {
  it('accepts a factory deployment where the sale address is an indexed topic', async () => {
    const log = { address: FACTORY, topics: ['0xdead', ethers.utils.hexZeroPad(SALE, 32)] } as ethers.providers.Log;
    const provider = providerReturning(receipt({ logs: [log] }));

    const result = await verifyDeployment(claim, provider);

    expect(result).toEqual({ ownerAddress: DEPLOYER.toLowerCase(), blockNumber: BLOCK });
    expect(provider.getTransactionReceipt).toHaveBeenCalledWith(TX);
  });

  it('accepts when the sale contract itself emitted a log', async () => {
    const log = { address: SALE, topics: ['0xdead'] } as ethers.providers.Log;
    await expect(verifyDeployment(claim, providerReturning(receipt({ logs: [log] })))).resolves.toMatchObject({
      ownerAddress: DEPLOYER.toLowerCase(),
    });
  });

  it('accepts a direct (non-factory) deployment via receipt.contractAddress', async () => {
    await expect(
      verifyDeployment(claim, providerReturning(receipt({ contractAddress: SALE.toUpperCase().replace('0X', '0x') }))),
    ).resolves.toMatchObject({ ownerAddress: DEPLOYER.toLowerCase() });
  });

  it('rejects when the tx never touched the claimed contract', async () => {
    const log = { address: FACTORY, topics: ['0xdead', ethers.utils.hexZeroPad(FACTORY, 32)] } as ethers.providers.Log;
    await expect(verifyDeployment(claim, providerReturning(receipt({ logs: [log] })))).rejects.toThrow(
      /not created by this transaction/,
    );
  });

  it('rejects a reverted tx', async () => {
    await expect(verifyDeployment(claim, providerReturning(receipt({ status: 0 })))).rejects.toThrow(/reverted/);
  });

  it('rejects an unmined / unknown tx', async () => {
    await expect(verifyDeployment(claim, providerReturning(null))).rejects.toThrow(/not found/);
  });

  it('rejects a blockNumber that does not match the receipt', async () => {
    const log = { address: SALE, topics: [] } as unknown as ethers.providers.Log;
    await expect(
      verifyDeployment({ ...claim, blockNumber: BLOCK + 1 }, providerReturning(receipt({ logs: [log] }))),
    ).rejects.toThrow(/blockNumber mismatch/);
  });

  it('rejects malformed input before touching the provider', async () => {
    const provider = providerReturning(receipt());
    await expect(verifyDeployment({ ...claim, transactionHash: '0x123' }, provider)).rejects.toBeInstanceOf(
      DeploymentVerificationError,
    );
    await expect(verifyDeployment({ ...claim, contractAddress: 'not-an-address' }, provider)).rejects.toBeInstanceOf(
      DeploymentVerificationError,
    );
    expect(provider.getTransactionReceipt).not.toHaveBeenCalled();
  });
});
