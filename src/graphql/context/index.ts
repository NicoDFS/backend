import { DexService } from '../../services/dex';
import { BridgeService } from '../../services/bridge';
import { LaunchpadService } from '../../services/launchpad';
import { StakingService } from '../../services/staking';
import { MonitoringService } from '../../services/monitoring';
import { HyperlaneApiService } from '../../services/bridge/hyperlane-api';
import { userService } from '../../services/user/userService';
import { walletService } from '../../services/user/walletService';

export type Context = {
  dexService: typeof DexService;
  bridgeService: typeof BridgeService;
  launchpadService: typeof LaunchpadService;
  stakingService: typeof StakingService;
  monitoringService: typeof MonitoringService;
  hyperlaneApiService: typeof HyperlaneApiService;
  userService: typeof userService;
  walletService: typeof walletService;
  req?: any;
};

export async function createContext({ req }: { req?: any } = {}): Promise<Context> {
  return {
    dexService: DexService,
    bridgeService: BridgeService,
    launchpadService: LaunchpadService,
    stakingService: StakingService,
    monitoringService: MonitoringService,
    hyperlaneApiService: HyperlaneApiService,
    userService,
    walletService,
    req,
  };
}
