import { Context } from '../context';
import { ChainType } from '../../services/monitoring/prometheus';

// Helper function to validate chain parameter
function validateChain(chain: string): ChainType {
  const validChains: ChainType[] = ['kalychain', 'bnb', 'arbitrum', 'polygon'];
  if (!validChains.includes(chain as ChainType)) {
    throw new Error(`Invalid chain: ${chain}. Valid chains are: ${validChains.join(', ')}`);
  }
  return chain as ChainType;
}

export const monitoringResolvers = {
  Query: {
    relayerHealth: async (_: any, __: any, { monitoringService }: Context) => {
      return monitoringService.getRelayerHealth();
    },

    validatorHealth: async (_: any, { chain }: { chain: string }, { monitoringService }: Context) => {
      return monitoringService.getValidatorHealth(validateChain(chain));
    },

    validatorsHealth: async (_: any, __: any, { monitoringService }: Context) => {
      const health = await monitoringService.getAllValidatorsHealth();
      return {
        kalychain: { health: health.kalychain, resources: {}, metrics: {} },
        bnb: { health: health.bnb, resources: {}, metrics: {} },
        arbitrum: { health: health.arbitrum, resources: {}, metrics: {} },
        polygon: { health: health.polygon, resources: {}, metrics: {} }
      };
    },

    relayerResourceUsage: async (_: any, __: any, { monitoringService }: Context) => {
      return monitoringService.getRelayerResourceUsage();
    },

    validatorResourceUsage: async (_: any, { chain }: { chain: string }, { monitoringService }: Context) => {
      return monitoringService.getValidatorResourceUsage(validateChain(chain));
    },

    validatorsResourceUsage: async (_: any, __: any, { monitoringService }: Context) => {
      const resources = await monitoringService.getAllValidatorsResourceUsage();
      return {
        kalychain: { health: {}, resources: resources.kalychain, metrics: {} },
        bnb: { health: {}, resources: resources.bnb, metrics: {} },
        arbitrum: { health: {}, resources: resources.arbitrum, metrics: {} },
        polygon: { health: {}, resources: resources.polygon, metrics: {} }
      };
    },

    relayerMetrics: async (_: any, __: any, { monitoringService }: Context) => {
      return monitoringService.getRelayerMessageMetrics();
    },

    validatorMetrics: async (_: any, { chain }: { chain: string }, { monitoringService }: Context) => {
      return monitoringService.getValidatorMessageMetrics(validateChain(chain));
    },

    validatorsMetrics: async (_: any, __: any, { monitoringService }: Context) => {
      const metrics = await monitoringService.getAllValidatorsMessageMetrics();
      return {
        kalychain: { health: {}, resources: {}, metrics: metrics.kalychain },
        bnb: { health: {}, resources: {}, metrics: metrics.bnb },
        arbitrum: { health: {}, resources: {}, metrics: metrics.arbitrum },
        polygon: { health: {}, resources: {}, metrics: metrics.polygon }
      };
    },

    fullMonitoringData: async (_: any, __: any, { monitoringService }: Context) => {
      return monitoringService.getFullMonitoringData();
    }
  }
};
