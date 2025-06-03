import { createStorage, StorageEnum } from '../base/index.js';
import type { ExtensionConfigStateType, ExtensionConfigStorageType } from '../base/types.js';

// URL验证函数
const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

const storage = createStorage<ExtensionConfigStateType>(
  'extension-config-storage-key',
  {
    apiUrl: 'http://localhost:3000/api/bookmark',
    apiKey: '987654321',
  },
  {
    storageEnum: StorageEnum.Sync, // 使用Sync存储以支持跨设备同步
    liveUpdate: true,
  },
);

export const extensionConfigStorage: ExtensionConfigStorageType = {
  ...storage,

  // 验证配置
  validateConfig: (config: Partial<ExtensionConfigStateType>): boolean => {
    if (config.apiUrl && !isValidUrl(config.apiUrl)) {
      return false;
    }
    if (config.apiKey && config.apiKey.trim().length < 3) {
      return false;
    }
    return true;
  },

  // 重置为默认配置
  resetToDefaults: async () => {
    await storage.set({
      apiUrl: 'http://localhost:3000/api/bookmark',
      apiKey: '987654321',
    });
  },

  // 测试API连接
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const config = await storage.get();
      const response = await fetch(`${config.apiUrl}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': config.apiKey,
        },
      });

      if (response.ok) {
        return { success: true, message: 'API连接成功' };
      } else {
        return { success: false, message: `API连接失败: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `连接错误: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  },
};
