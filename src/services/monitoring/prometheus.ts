import axios from 'axios';

// Define supported chains
export type ChainType = 'kalychain' | 'bnb' | 'arbitrum' | 'polygon';

// Get Prometheus endpoints from environment variables
const PROMETHEUS_ENDPOINTS = {
  relayer: process.env.RELAYER_PROMETHEUS_URL || 'http://localhost:9090',
  validators: {
    kalychain: process.env.VALIDATOR_KALYCHAIN_PROMETHEUS_URL || 'http://localhost:9091',
    bnb: process.env.VALIDATOR_BNB_PROMETHEUS_URL || 'http://localhost:9092',
    arbitrum: process.env.VALIDATOR_ARBITRUM_PROMETHEUS_URL || 'http://localhost:9093',
    polygon: process.env.VALIDATOR_POLYGON_PROMETHEUS_URL || 'http://localhost:9094'
  }
};

export const PrometheusService = {
  async getRelayerMetrics() {
    try {
      const response = await axios.get(`${PROMETHEUS_ENDPOINTS.relayer}/api/v1/query`, {
        params: {
          query: 'up{job="relayer"}'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching relayer metrics:', error);
      return null;
    }
  },

  async getValidatorMetrics(chain: ChainType) {
    try {
      const endpoint = PROMETHEUS_ENDPOINTS.validators[chain];
      if (!endpoint) {
        throw new Error(`No endpoint configured for ${chain} validator`);
      }

      const response = await axios.get(`${endpoint}/api/v1/query`, {
        params: {
          query: `up{job="validator"}`
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching ${chain} validator metrics:`, error);
      return null;
    }
  },

  async getAllValidatorsMetrics() {
    const results: Record<ChainType, any> = {} as Record<ChainType, any>;

    // Get metrics for each validator in parallel
    const chains: ChainType[] = ['kalychain', 'bnb', 'arbitrum', 'polygon'];
    await Promise.all(
      chains.map(async (chain) => {
        results[chain] = await this.getValidatorMetrics(chain);
      })
    );

    return results;
  },

  async getNodeHealth(nodeType: 'relayer' | ChainType, isValidator = false) {
    try {
      let endpoint;
      let jobName;

      if (nodeType === 'relayer') {
        endpoint = PROMETHEUS_ENDPOINTS.relayer;
        jobName = 'relayer';
      } else if (isValidator) {
        endpoint = PROMETHEUS_ENDPOINTS.validators[nodeType as ChainType];
        jobName = 'validator';
      } else {
        throw new Error(`Invalid node type: ${nodeType}`);
      }

      if (!endpoint) {
        throw new Error(`No endpoint configured for ${nodeType}`);
      }

      const response = await axios.get(`${endpoint}/api/v1/query`, {
        params: {
          query: `process_uptime_seconds{job="${jobName}"}`
        }
      });

      return {
        isUp: response.data.data.result.length > 0,
        uptime: response.data.data.result[0]?.value[1] || 0
      };
    } catch (error) {
      console.error(`Error fetching ${nodeType} health:`, error);
      return {
        isUp: false,
        uptime: 0
      };
    }
  },

  async getAllValidatorsHealth() {
    const results: Record<ChainType, any> = {} as Record<ChainType, any>;

    // Get health for each validator in parallel
    const chains: ChainType[] = ['kalychain', 'bnb', 'arbitrum', 'polygon'];
    await Promise.all(
      chains.map(async (chain) => {
        results[chain] = await this.getNodeHealth(chain, true);
      })
    );

    return results;
  },

  async getNodeResourceUsage(nodeType: 'relayer' | ChainType, isValidator = false) {
    try {
      let endpoint;
      let jobName;

      if (nodeType === 'relayer') {
        endpoint = PROMETHEUS_ENDPOINTS.relayer;
        jobName = 'relayer';
      } else if (isValidator) {
        endpoint = PROMETHEUS_ENDPOINTS.validators[nodeType as ChainType];
        jobName = 'validator';
      } else {
        throw new Error(`Invalid node type: ${nodeType}`);
      }

      if (!endpoint) {
        throw new Error(`No endpoint configured for ${nodeType}`);
      }

      const [cpuResponse, memoryResponse, diskResponse] = await Promise.all([
        axios.get(`${endpoint}/api/v1/query`, {
          params: {
            query: `rate(process_cpu_seconds_total{job="${jobName}"}[5m]) * 100`
          }
        }),
        axios.get(`${endpoint}/api/v1/query`, {
          params: {
            query: `process_resident_memory_bytes{job="${jobName}"} / 1024 / 1024`
          }
        }),
        axios.get(`${endpoint}/api/v1/query`, {
          params: {
            query: `node_filesystem_avail_bytes{job="${jobName}", mountpoint="/"} / 1024 / 1024 / 1024`
          }
        })
      ]);

      return {
        cpu: cpuResponse.data.data.result[0]?.value[1] || 0,
        memory: memoryResponse.data.data.result[0]?.value[1] || 0,
        diskAvailable: diskResponse.data.data.result[0]?.value[1] || 0
      };
    } catch (error) {
      console.error(`Error fetching ${nodeType} resource usage:`, error);
      return {
        cpu: 0,
        memory: 0,
        diskAvailable: 0
      };
    }
  },

  async getAllValidatorsResourceUsage() {
    const results: Record<ChainType, any> = {} as Record<ChainType, any>;

    // Get resource usage for each validator in parallel
    const chains: ChainType[] = ['kalychain', 'bnb', 'arbitrum', 'polygon'];
    await Promise.all(
      chains.map(async (chain) => {
        results[chain] = await this.getNodeResourceUsage(chain, true);
      })
    );

    return results;
  },

  async getMessageProcessingMetrics(nodeType: 'relayer' | ChainType, isValidator = false) {
    try {
      let endpoint;
      let jobName;

      if (nodeType === 'relayer') {
        endpoint = PROMETHEUS_ENDPOINTS.relayer;
        jobName = 'relayer';
      } else if (isValidator) {
        endpoint = PROMETHEUS_ENDPOINTS.validators[nodeType as ChainType];
        jobName = 'validator';
      } else {
        throw new Error(`Invalid node type: ${nodeType}`);
      }

      if (!endpoint) {
        throw new Error(`No endpoint configured for ${nodeType}`);
      }

      const query = jobName === 'relayer'
        ? 'hyperlane_relayer_messages_processed_total'
        : 'hyperlane_validator_messages_signed_total';

      const response = await axios.get(`${endpoint}/api/v1/query`, {
        params: { query }
      });

      return {
        messagesProcessed: response.data.data.result[0]?.value[1] || 0,
        chain: nodeType !== 'relayer' ? nodeType : undefined
      };
    } catch (error) {
      console.error(`Error fetching ${nodeType} message metrics:`, error);
      return {
        messagesProcessed: 0,
        chain: nodeType !== 'relayer' ? nodeType : undefined
      };
    }
  },

  async getAllValidatorsMessageMetrics() {
    const results: Record<ChainType, any> = {} as Record<ChainType, any>;

    // Get message metrics for each validator in parallel
    const chains: ChainType[] = ['kalychain', 'bnb', 'arbitrum', 'polygon'];
    await Promise.all(
      chains.map(async (chain) => {
        results[chain] = await this.getMessageProcessingMetrics(chain, true);
      })
    );

    return results;
  }
};
