import { extensionConfigStorage } from '@extension/storage';

// 默认配置（作为回退）
const DEFAULT_CONFIG = {
  API_URL: 'http://localhost:8080/api/bookmark',
  API_HEADERS: {
    'Content-Type': 'application/json',
    'x-api-key': '987654321',
    'Access-Control-Allow-Origin': '*',
  },
  MEMO_API_URL: 'http://localhost:3000',
  MEMO_API_KEY: 'memox-api-2024',
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
      MEMO_API_URL: config.memoApiUrl || DEFAULT_CONFIG.MEMO_API_URL,
      MEMO_API_KEY: config.memoApiKey || DEFAULT_CONFIG.MEMO_API_KEY,
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
        MEMO_API_URL: config.memoApiUrl || DEFAULT_CONFIG.MEMO_API_URL,
        MEMO_API_KEY: config.memoApiKey || DEFAULT_CONFIG.MEMO_API_KEY,
      };
    }
  } catch (error) {
    console.error('Failed to get config snapshot:', error);
  }
  return DEFAULT_CONFIG;
};

export const API_CONFIG = DEFAULT_CONFIG;
