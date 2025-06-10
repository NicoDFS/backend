import { DexService } from '../../services/dex';
import { BridgeService } from '../../services/bridge';
import { LaunchpadService } from '../../services/launchpad';
import { StakingService } from '../../services/staking';
import { MonitoringService } from '../../services/monitoring';
import { HyperlaneApiService } from '../../services/bridge/hyperlane-api';
import { userService } from '../../services/user/userService';
import { walletService } from '../../services/user/walletService';
import { apiKeyService, ApiKey, ApiKeyPermissions } from '../../services/auth/apiKeyService';
import { ProjectService } from '../../services/project';

export type Context = {
  dexService: typeof DexService;
  bridgeService: typeof BridgeService;
  launchpadService: typeof LaunchpadService;
  stakingService: typeof StakingService;
  monitoringService: typeof MonitoringService;
  hyperlaneApiService: typeof HyperlaneApiService;
  userService: typeof userService;
  walletService: typeof walletService;
  apiKeyService: typeof apiKeyService;
  projectService: typeof ProjectService;
  req?: any;
  // Authentication context
  user?: any;
  apiKey?: ApiKey;
  authType?: 'jwt' | 'apikey';
};

export async function createContext({ req }: { req?: any } = {}): Promise<Context> {
  const context: Context = {
    dexService: DexService,
    bridgeService: BridgeService,
    launchpadService: LaunchpadService,
    stakingService: StakingService,
    monitoringService: MonitoringService,
    hyperlaneApiService: HyperlaneApiService,
    userService,
    walletService,
    apiKeyService,
    projectService: ProjectService,
    req,
  };

  // Handle authentication
  if (req?.headers) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        // JWT Authentication
        const token = authHeader.replace('Bearer ', '');
        try {
          const decoded = userService.verifyToken(token);
          if (decoded) {
            const user = await userService.getUserById(decoded.id);
            if (user) {
              context.user = user;
              context.authType = 'jwt';
            }
          }
        } catch (error) {
          // JWT validation failed, continue without auth
        }
      } else if (authHeader.startsWith('ApiKey ')) {
        // API Key Authentication
        const apiKey = authHeader.replace('ApiKey ', '');
        try {
          const validation = await apiKeyService.validateApiKey(apiKey);
          if (validation.isValid && validation.apiKey) {
            const user = await userService.getUserById(validation.apiKey.userId);
            context.apiKey = validation.apiKey;
            context.user = user;
            context.authType = 'apikey';
          }
        } catch (error) {
          // API key validation failed, continue without auth
        }
      }
    }
  }

  return context;
}
