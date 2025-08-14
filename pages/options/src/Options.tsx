import '@src/Options.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, extensionConfigStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useState, useEffect } from 'react';

const Options = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const config = useStorage(extensionConfigStorage);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingMemoConnection, setIsTestingMemoConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [memoTestResult, setMemoTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 本地状态管理输入值，避免输入时失焦
  const [localConfig, setLocalConfig] = useState({
    apiUrl: '',
    apiKey: '',
    memoApiUrl: '',
    memoApiKey: '',
  });

  // 初始化本地状态
  useEffect(() => {
    setLocalConfig({
      apiUrl: config.apiUrl || '',
      apiKey: config.apiKey || '',
      memoApiUrl: config.memoApiUrl || '',
      memoApiKey: config.memoApiKey || '',
    });
  }, [config]);

  // 处理输入变化
  const handleInputChange = (field: keyof typeof localConfig, value: string) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // 处理失焦时保存
  const handleInputBlur = async (field: keyof typeof localConfig, value: string) => {
    try {
      await extensionConfigStorage.set(prev => ({
        ...prev,
        [field]: value,
      }));
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const result = await extensionConfigStorage.testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTestMemoConnection = async () => {
    setIsTestingMemoConnection(true);
    setMemoTestResult(null);
    try {
      const result = await extensionConfigStorage.testMemoConnection();
      setMemoTestResult(result);
    } catch (error) {
      setMemoTestResult({
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setIsTestingMemoConnection(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (confirm('确定要重置所有配置为默认值吗？')) {
      setIsSaving(true);
      try {
        await extensionConfigStorage.resetToDefaults();
        setTestResult(null);
        setMemoTestResult(null);
      } catch (error) {
        console.error('重置配置失败:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className={cn('App', isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-800 text-gray-100')}>
      <header className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold">扩展设置</h1>
        <p className="text-sm opacity-75">配置您的API设置和其他选项</p>
      </header>

      <main className="lg:w-128 mx-auto w-64 space-y-8 md:w-96">
        {/* API 配置 */}
        <section className="rounded-lg bg-white/80 p-6 shadow-sm dark:bg-gray-900/80">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">🔗 API 配置</h2>

          <div className="space-y-4">
            {/* 书签 API 配置 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">📚 书签API配置</h3>

              {/* API URL */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">API URL</label>
                <input
                  type="url"
                  value={localConfig.apiUrl}
                  onChange={e => handleInputChange('apiUrl', e.target.value)}
                  onBlur={e => handleInputBlur('apiUrl', e.target.value)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-sm',
                    'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-100',
                  )}
                  placeholder="http://localhost:8080"
                  disabled={isSaving}
                />
                <p className="mt-1 text-xs opacity-75">书签API的基础URL地址</p>
              </div>

              {/* API Key */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">API 密钥</label>
                <input
                  type="password"
                  value={localConfig.apiKey}
                  onChange={e => handleInputChange('apiKey', e.target.value)}
                  onBlur={e => handleInputBlur('apiKey', e.target.value)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-sm',
                    'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-100',
                  )}
                  placeholder="您的API密钥"
                  disabled={isSaving}
                />
                <p className="mt-1 text-xs opacity-75">用于API认证的密钥</p>
              </div>

              {/* 书签API连接测试 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || isSaving}
                  className={cn(
                    'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isLight
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                      : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-600',
                  )}>
                  {isTestingConnection ? '测试中...' : '测试书签API'}
                </button>

                {testResult && (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                    )}>
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>

            {/* Memo API 配置 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">📝 Memo API配置</h3>

              {/* Memo API URL */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Memo API URL</label>
                <input
                  type="url"
                  value={localConfig.memoApiUrl}
                  onChange={e => handleInputChange('memoApiUrl', e.target.value)}
                  onBlur={e => handleInputBlur('memoApiUrl', e.target.value)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-sm',
                    'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-100',
                  )}
                  placeholder="http://localhost:3000/api"
                  disabled={isSaving}
                />
                <p className="mt-1 text-xs opacity-75">Memo API的基础URL地址</p>
              </div>

              {/* Memo API Key */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">Memo API 密钥</label>
                <input
                  type="password"
                  value={localConfig.memoApiKey}
                  onChange={e => handleInputChange('memoApiKey', e.target.value)}
                  onBlur={e => handleInputBlur('memoApiKey', e.target.value)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-sm',
                    'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-100',
                  )}
                  placeholder="您的Memo API密钥"
                  disabled={isSaving}
                />
                <p className="mt-1 text-xs opacity-75">用于Memo API认证的密钥</p>
              </div>

              {/* Memo API连接测试 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestMemoConnection}
                  disabled={isTestingMemoConnection || isSaving}
                  className={cn(
                    'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isLight
                      ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
                      : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-600',
                  )}>
                  {isTestingMemoConnection ? '测试中...' : '测试Memo API'}
                </button>

                {memoTestResult && (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      memoTestResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                    )}>
                    {memoTestResult.message}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 操作区域 */}
        <section className="rounded-lg bg-white/80 p-6 shadow-sm dark:bg-gray-900/80">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">🔧 操作</h2>

          <div className="flex gap-3">
            <button
              onClick={handleResetToDefaults}
              disabled={isSaving}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-red-500',
                isLight
                  ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400'
                  : 'bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-600',
              )}>
              {isSaving ? '重置中...' : '重置为默认值'}
            </button>
          </div>
        </section>
      </main>
      {/* 
      <footer className="mt-8 text-center text-sm opacity-75">
        <p>
          Edit <code>pages/options/src/Options.tsx</code>
        </p>
      </footer> */}
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
