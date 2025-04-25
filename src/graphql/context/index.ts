import { DexService } from '../../services/dex';
import { BridgeService } from '../../services/bridge';
import { LaunchpadService } from '../../services/launchpad';
import { StakingService } from '../../services/staking';

export type Context = {
  dexService: typeof DexService;
  bridgeService: typeof BridgeService;
  launchpadService: typeof LaunchpadService;
  stakingService: typeof StakingService;
};

export async function createContext(): Promise<Context> {
  return {
    dexService: DexService,
    bridgeService: BridgeService,
    launchpadService: LaunchpadService,
    stakingService: StakingService,
  };
}
