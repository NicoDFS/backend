import { ethers } from 'ethers';
import { getProvider } from '../../blockchain/providers';

export class DeploymentVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeploymentVerificationError';
  }
}

export interface DeploymentClaim {
  transactionHash: string;
  contractAddress: string;
  blockNumber: number;
}

export interface VerifiedDeployment {
  /** Lower-cased sender of the deployment tx. This is the only notion of "owner" a launchpad row has. */
  ownerAddress: string;
  blockNumber: number;
}

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

/**
 * Prove on-chain that `transactionHash` created `contractAddress`, and return the
 * address that sent it. Launchpad rows are keyed to that address — there is no
 * session or user account behind them, so this receipt check is the whole
 * authorization story for saving project metadata.
 *
 * The factories emit the new sale contract as an indexed event arg (the frontend
 * reads it from `topics`), so "created in this tx" means the address shows up as
 * a log topic, a log emitter, or the receipt's own `contractAddress`.
 */
export async function verifyDeployment(
  claim: DeploymentClaim,
  provider: ethers.providers.Provider = getProvider(),
): Promise<VerifiedDeployment> {
  if (!TX_HASH_RE.test(claim.transactionHash)) {
    throw new DeploymentVerificationError('transactionHash is not a valid 32-byte hex hash');
  }
  if (!ethers.utils.isAddress(claim.contractAddress)) {
    throw new DeploymentVerificationError('contractAddress is not a valid address');
  }

  const receipt = await provider.getTransactionReceipt(claim.transactionHash);
  if (!receipt) {
    throw new DeploymentVerificationError('Transaction not found or not yet mined');
  }
  if (receipt.status !== 1) {
    throw new DeploymentVerificationError('Deployment transaction reverted');
  }
  if (receipt.blockNumber !== claim.blockNumber) {
    throw new DeploymentVerificationError(
      `blockNumber mismatch: claimed ${claim.blockNumber}, receipt says ${receipt.blockNumber}`,
    );
  }

  const contract = claim.contractAddress.toLowerCase();
  const contractAsTopic = ethers.utils.hexZeroPad(contract, 32).toLowerCase();
  const createdHere =
    receipt.contractAddress?.toLowerCase() === contract ||
    receipt.logs.some(
      (log) =>
        log.address.toLowerCase() === contract ||
        log.topics.some((topic) => topic.toLowerCase() === contractAsTopic),
    );
  if (!createdHere) {
    throw new DeploymentVerificationError('contractAddress was not created by this transaction');
  }

  return {
    ownerAddress: receipt.from.toLowerCase(),
    blockNumber: receipt.blockNumber,
  };
}
