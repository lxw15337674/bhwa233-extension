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
    apiUrl: 'http://localhost:8080',
    apiKey: '987654321',
    memoApiUrl: 'http://localhost:3000',
    memoApiKey: 'memox-api-2024',
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
    if (config.memoApiUrl && !isValidUrl(config.memoApiUrl)) {
      return false;
    }
    if (config.memoApiKey && config.memoApiKey.trim().length < 3) {
      return false;
    }
    return true;
  },

  // 重置为默认配置
  resetToDefaults: async () => {
    await storage.set({
      apiUrl: 'http://localhost:8080',
      apiKey: '987654321',
      memoApiUrl: 'http://localhost:3000',
      memoApiKey: 'memox-api-2024',
    });
  },

  // 测试书签API连接
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const config = await storage.get();
      const response = await fetch(`${config.apiUrl}/api/bookmark/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        },
      });

      if (response.ok) {
        return { success: true, message: '书签API连接成功' };
      } else {
        return { success: false, message: `书签API连接失败: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `书签API连接错误: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  },

  // 测试Memo API连接
  testMemoConnection: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const config = await storage.get();
      if (!config.memoApiUrl || !config.memoApiKey) {
        return { success: false, message: 'Memo API配置不完整' };
      }

      // 尝试获取memo列表作为健康检查
      const response = await fetch(`${config.memoApiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.memoApiKey,
        },
      });

      if (response.ok) {
        return { success: true, message: 'Memo API连接成功' };
      } else {
        return { success: false, message: `Memo API连接失败: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `Memo API连接错误: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  },
};
