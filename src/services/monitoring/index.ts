import { PrometheusService, ChainType } from './prometheus';
import { AlertService } from './alerts';

// Thresholds for resource usage alerts
const THRESHOLDS = {
  CPU_PERCENT: 80,
  MEMORY_MB: 1024,
  DISK_GB_AVAILABLE: 5
};

// Supported chains
const CHAINS: ChainType[] = ['kalychain', 'bnb', 'arbitrum', 'polygon'];

export const MonitoringService = {
  async getRelayerHealth() {
    return PrometheusService.getNodeHealth('relayer');
  },

  async getValidatorHealth(chain: ChainType) {
    return PrometheusService.getNodeHealth(chain, true);
  },

  async getAllValidatorsHealth() {
    return PrometheusService.getAllValidatorsHealth();
  },

  async getRelayerResourceUsage() {
    return PrometheusService.getNodeResourceUsage('relayer');
  },

  async getValidatorResourceUsage(chain: ChainType) {
    return PrometheusService.getNodeResourceUsage(chain, true);
  },

  async getAllValidatorsResourceUsage() {
    return PrometheusService.getAllValidatorsResourceUsage();
  },

  async getRelayerMessageMetrics() {
    return PrometheusService.getMessageProcessingMetrics('relayer');
  },

  async getValidatorMessageMetrics(chain: ChainType) {
    return PrometheusService.getMessageProcessingMetrics(chain, true);
  },

  async getAllValidatorsMessageMetrics() {
    return PrometheusService.getAllValidatorsMessageMetrics();
  },

  async checkAndAlertNodeStatus() {
    // Check relayer
    const relayerHealth = await PrometheusService.getNodeHealth('relayer');
    if (!relayerHealth.isUp) {
      await AlertService.sendNodeDownAlert('relayer', relayerHealth);
    }

    // Check all validators
    const validatorsHealth = await PrometheusService.getAllValidatorsHealth();
    const alerts = [];

    for (const chain of CHAINS) {
      if (!validatorsHealth[chain].isUp) {
        alerts.push(
          AlertService.sendNodeDownAlert(`${chain} validator`, validatorsHealth[chain])
        );
      }
    }

    await Promise.all(alerts);

    return {
      relayerStatus: relayerHealth.isUp ? 'UP' : 'DOWN',
      validatorsStatus: Object.fromEntries(
        CHAINS.map(chain => [chain, validatorsHealth[chain].isUp ? 'UP' : 'DOWN'])
      )
    };
  },

  async checkAndAlertResourceUsage() {
    // Check relayer resources
    const relayerResources = await PrometheusService.getNodeResourceUsage('relayer');
    const alerts = [];

    if (relayerResources.cpu > THRESHOLDS.CPU_PERCENT) {
      alerts.push(AlertService.sendResourceWarningAlert('relayer', 'CPU', relayerResources.cpu, THRESHOLDS.CPU_PERCENT));
    }

    if (relayerResources.memory > THRESHOLDS.MEMORY_MB) {
      alerts.push(AlertService.sendResourceWarningAlert('relayer', 'memory', relayerResources.memory, THRESHOLDS.MEMORY_MB));
    }

    if (relayerResources.diskAvailable < THRESHOLDS.DISK_GB_AVAILABLE) {
      alerts.push(AlertService.sendResourceWarningAlert('relayer', 'disk space', relayerResources.diskAvailable, THRESHOLDS.DISK_GB_AVAILABLE));
    }

    // Check all validators resources
    const validatorsResources = await PrometheusService.getAllValidatorsResourceUsage();

    for (const chain of CHAINS) {
      const resources = validatorsResources[chain];

      if (resources.cpu > THRESHOLDS.CPU_PERCENT) {
        alerts.push(AlertService.sendResourceWarningAlert(`${chain} validator`, 'CPU', resources.cpu, THRESHOLDS.CPU_PERCENT));
      }

      if (resources.memory > THRESHOLDS.MEMORY_MB) {
        alerts.push(AlertService.sendResourceWarningAlert(`${chain} validator`, 'memory', resources.memory, THRESHOLDS.MEMORY_MB));
      }

      if (resources.diskAvailable < THRESHOLDS.DISK_GB_AVAILABLE) {
        alerts.push(AlertService.sendResourceWarningAlert(`${chain} validator`, 'disk space', resources.diskAvailable, THRESHOLDS.DISK_GB_AVAILABLE));
      }
    }

    await Promise.all(alerts);

    return {
      relayerResources,
      validatorsResources
    };
  },

  async getFullMonitoringData() {
    const [
      relayerHealth,
      validatorsHealth,
      relayerResources,
      validatorsResources,
      relayerMetrics,
      validatorsMetrics
    ] = await Promise.all([
      this.getRelayerHealth(),
      this.getAllValidatorsHealth(),
      this.getRelayerResourceUsage(),
      this.getAllValidatorsResourceUsage(),
      this.getRelayerMessageMetrics(),
      this.getAllValidatorsMessageMetrics()
    ]);

    return {
      relayer: {
        health: relayerHealth,
        resources: relayerResources,
        metrics: relayerMetrics
      },
      validators: Object.fromEntries(
        CHAINS.map(chain => [
          chain,
          {
            health: validatorsHealth[chain],
            resources: validatorsResources[chain],
            metrics: validatorsMetrics[chain]
          }
        ])
      )
    };
  }
};
