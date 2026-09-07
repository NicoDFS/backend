import { BridgeService } from '../../services/bridge';
import { LaunchpadService } from '../../services/launchpad';
import { StakingService } from '../../services/staking';
import { MonitoringService } from '../../services/monitoring';
import { ProjectService } from '../../services/project';

// No sessions: the API is public, and the only "ownership" it knows about is the
// deployer address proven from a tx receipt when launchpad metadata is saved.
export type Context = {
  bridgeService: typeof BridgeService;
  launchpadService: typeof LaunchpadService;
  stakingService: typeof StakingService;
  monitoringService: typeof MonitoringService;
  projectService: typeof ProjectService;
};

export async function createContext(): Promise<Context> {
  return {
    bridgeService: BridgeService,
    launchpadService: LaunchpadService,
    stakingService: StakingService,
    monitoringService: MonitoringService,
    projectService: ProjectService,
  };
}
