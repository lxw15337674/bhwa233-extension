import { extensionConfigStorage } from '@extension/storage';

// 默认配置（作为回退）
const DEFAULT_CONFIG = {
  API_URL: 'http://localhost:8080/api/bookmark',
  API_HEADERS: {
    'Content-Type': 'application/json',
    'x-api-key': '987654321',
    'Access-Control-Allow-Origin': '*',
  },
};

// 获取当前配置的函数
export const getApiConfig = async () => {
  try {
    const config = await extensionConfigStorage.get();
    return {
      API_URL: config.apiUrl || DEFAULT_CONFIG.API_URL,
      API_HEADERS: {
        ...DEFAULT_CONFIG.API_HEADERS,
        'x-api-key': config.apiKey || DEFAULT_CONFIG.API_HEADERS['x-api-key'],
      },
    };
  } catch (error) {
    console.error('Failed to load extension config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
};

// 同步获取配置的函数（用于已经加载过配置的情况）
export const getApiConfigSync = () => {
  try {
    const config = extensionConfigStorage.getSnapshot();
    if (config) {
      return {
        API_URL: config.apiUrl || DEFAULT_CONFIG.API_URL,
        API_HEADERS: {
          ...DEFAULT_CONFIG.API_HEADERS,
          'x-api-key': config.apiKey || DEFAULT_CONFIG.API_HEADERS['x-api-key'],
        },
      };
    }
  } catch (error) {
    console.error('Failed to get config snapshot:', error);
  }
  return DEFAULT_CONFIG;
};

// 为了向后兼容，保留旧的API_CONFIG导出（但标记为已弃用）
/** @deprecated 请使用 getApiConfig() 或 getApiConfigSync() */
export const API_CONFIG = DEFAULT_CONFIG;
