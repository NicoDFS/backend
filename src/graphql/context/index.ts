import { DexService } from '../../services/dex';
import { BridgeService } from '../../services/bridge';
import { LaunchpadService } from '../../services/launchpad';
import { StakingService } from '../../services/staking';
import { MonitoringService } from '../../services/monitoring';
import { HyperlaneApiService } from '../../services/bridge/hyperlane-api';

export type Context = {
  dexService: typeof DexService;
  bridgeService: typeof BridgeService;
  launchpadService: typeof LaunchpadService;
  stakingService: typeof StakingService;
  monitoringService: typeof MonitoringService;
  hyperlaneApiService: typeof HyperlaneApiService;
};

export async function createContext(): Promise<Context> {
  return {
    dexService: DexService,
    bridgeService: BridgeService,
    launchpadService: LaunchpadService,
    stakingService: StakingService,
    monitoringService: MonitoringService,
    hyperlaneApiService: HyperlaneApiService,
  };
}
