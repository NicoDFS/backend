import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/project', () => ({
  ProjectService: {
    saveConfirmedProject: vi.fn(),
    getProjectsByOwner: vi.fn(),
  },
}));
vi.mock('../../../services/fairlaunch', () => ({
  FairlaunchService: {
    saveConfirmedFairlaunch: vi.fn(),
    getFairlaunchesByOwner: vi.fn(),
  },
}));
vi.mock('../../../services/launchpad/deploymentVerifier', () => ({
  verifyDeployment: vi.fn(),
}));

import { projectResolvers } from '../project';
import { fairlaunchResolvers } from '../fairlaunch';
import { ProjectService } from '../../../services/project';
import { FairlaunchService } from '../../../services/fairlaunch';
import { verifyDeployment } from '../../../services/launchpad/deploymentVerifier';

const OWNER = '0xabcdef0123456789abcdef0123456789abcdef01';

type ProjectRow = Awaited<ReturnType<typeof ProjectService.saveConfirmedProject>>;
type FairlaunchRow = Awaited<ReturnType<typeof FairlaunchService.saveConfirmedFairlaunch>>;
const NOW = new Date('2026-08-27T00:00:00Z');

const presaleInput = {
  name: 'Test', description: 'd', saleToken: '0x1', baseToken: '0x2',
  tokenRate: '1', liquidityRate: '1', softCap: '1', hardCap: '2', liquidityPercent: '60',
  presaleStart: NOW.toISOString(), presaleEnd: NOW.toISOString(), lpLockDuration: '30',
  contractAddress: '0x1111111111111111111111111111111111111111',
  transactionHash: '0x' + 'ab'.repeat(32), blockNumber: 254000,
};
const fairlaunchInput = {
  name: 'Test', description: 'd', saleToken: '0x1', baseToken: '0x2',
  buybackRate: '1', sellingAmount: '1', softCap: '1', liquidityPercent: '60',
  fairlaunchStart: NOW.toISOString(), fairlaunchEnd: NOW.toISOString(), isWhitelist: false,
  contractAddress: '0x1111111111111111111111111111111111111111',
  transactionHash: '0x' + 'ab'.repeat(32), blockNumber: 254000,
};
const savedRow = (extra: object) => ({
  ...extra, ownerAddress: OWNER, deployedAt: NOW, createdAt: NOW,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('launchpad ownership comes from the receipt, not a session', () => {
  it('saveProjectAfterDeployment stores the verified deployer as ownerAddress', async () => {
    vi.mocked(verifyDeployment).mockResolvedValue({ ownerAddress: OWNER, blockNumber: 254000 });
    vi.mocked(ProjectService.saveConfirmedProject).mockResolvedValue(
      savedRow({ ...presaleInput, presaleStart: NOW, presaleEnd: NOW }) as unknown as ProjectRow,
    );

    const result = await projectResolvers.Mutation.saveProjectAfterDeployment(null, { input: presaleInput });

    expect(verifyDeployment).toHaveBeenCalledWith(presaleInput);
    expect(ProjectService.saveConfirmedProject).toHaveBeenCalledWith({ ...presaleInput, ownerAddress: OWNER });
    expect(result.ownerAddress).toBe(OWNER);
    expect(result).not.toHaveProperty('user');
  });

  it('saveFairlaunchAfterDeployment stores the verified deployer as ownerAddress', async () => {
    vi.mocked(verifyDeployment).mockResolvedValue({ ownerAddress: OWNER, blockNumber: 254000 });
    vi.mocked(FairlaunchService.saveConfirmedFairlaunch).mockResolvedValue(
      savedRow({ ...fairlaunchInput, fairlaunchStart: NOW, fairlaunchEnd: NOW }) as unknown as FairlaunchRow,
    );

    const result = await fairlaunchResolvers.Mutation.saveFairlaunchAfterDeployment(null, { input: fairlaunchInput });

    expect(verifyDeployment).toHaveBeenCalledWith(fairlaunchInput);
    expect(FairlaunchService.saveConfirmedFairlaunch).toHaveBeenCalledWith({ ...fairlaunchInput, ownerAddress: OWNER });
    expect(result.ownerAddress).toBe(OWNER);
  });

  it('refuses to save anything when the receipt check fails', async () => {
    vi.mocked(verifyDeployment).mockRejectedValue(new Error('contractAddress was not created by this transaction'));

    await expect(
      projectResolvers.Mutation.saveProjectAfterDeployment(null, { input: presaleInput }),
    ).rejects.toThrow(/not created by this transaction/);
    await expect(
      fairlaunchResolvers.Mutation.saveFairlaunchAfterDeployment(null, { input: fairlaunchInput }),
    ).rejects.toThrow(/not created by this transaction/);

    expect(ProjectService.saveConfirmedProject).not.toHaveBeenCalled();
    expect(FairlaunchService.saveConfirmedFairlaunch).not.toHaveBeenCalled();
  });

  it('projectsByOwner / fairlaunchesByOwner scope by the address argument', async () => {
    vi.mocked(ProjectService.getProjectsByOwner).mockResolvedValue([]);
    vi.mocked(FairlaunchService.getFairlaunchesByOwner).mockResolvedValue([]);

    await projectResolvers.Query.projectsByOwner(null, { ownerAddress: OWNER, limit: 5, offset: 10 });
    await fairlaunchResolvers.Query.fairlaunchesByOwner(null, { ownerAddress: OWNER });

    expect(ProjectService.getProjectsByOwner).toHaveBeenCalledWith(OWNER, 5, 10);
    expect(FairlaunchService.getFairlaunchesByOwner).toHaveBeenCalledWith(OWNER, 10, 0);
  });
});
