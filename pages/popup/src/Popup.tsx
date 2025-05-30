import '@src/Popup.css';
import { BookmarkService } from './service/BookmarkService';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useEffect, useState } from 'react';

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage);

  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [operationStatus, setOperationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  // Removed status state

  // Get current tab info when popup opens
  useEffect(() => {
    const getCurrentTabInfo = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab?.title) {
        setCurrentUrl(tab.url);
        setCurrentTitle(tab.title);

        // Check if URL is already bookmarked
        setLoading(true);
        try {
          const bookmark = await BookmarkService.getBookmark(tab.url);
          if (bookmark) {
            setIsBookmarked(true);
            setRemark(bookmark.remark || '');
            setUpdatedAt(bookmark.updatedAt);
          }
        } catch (error) {
          console.error('Error checking bookmark status:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    getCurrentTabInfo();
  }, []);

  // Reset operation status after 2 seconds
  useEffect(() => {
    if (operationStatus !== 'idle') {
      const timer = setTimeout(() => setOperationStatus('idle'), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [operationStatus]);

  const handleSaveBookmark = async () => {
    setLoading(true);
    setOperationStatus('idle');

    try {
      let result;

      if (isBookmarked) {
        // 对于更新，我们需要先删除旧的书签，然后创建新的
        // 因为新API不支持基于ID的更新，只能通过URL操作
        await BookmarkService.removeBookmark(currentUrl);
        result = await BookmarkService.addBookmark({
          url: currentUrl,
          title: currentTitle,
          remark,
        });
      } else {
        // Create new bookmark
        result = await BookmarkService.addBookmark({
          url: currentUrl,
          title: currentTitle,
          remark,
        });
        setIsBookmarked(true);
      }

      if (result) {
        setUpdatedAt(result.updatedAt);
        setOperationStatus('success');
      }
    } catch (error) {
      console.error('Error saving bookmark:', error);
      setOperationStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBookmark = async () => {
    if (!isBookmarked) return;

    setLoading(true);
    try {
      await BookmarkService.removeBookmark(currentUrl);
      setIsBookmarked(false);
      setRemark('');
      setUpdatedAt(undefined);
      setOperationStatus('success');
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      setOperationStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('App flex-col p-4', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
      <header className={cn('mb-4 text-center', isLight ? 'text-gray-900' : 'text-gray-100')}>
        <h1 className="text-lg font-bold">网页书签</h1>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Page Title */}
        <div className="mb-4">
          <h2 className={cn('truncate font-semibold', isLight ? 'text-gray-800' : 'text-gray-200')}>
            {currentTitle || '无标题'}
          </h2>
          <p className={cn('truncate text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>
            {currentUrl || '无 URL'}
          </p>
        </div>

        {/* Bookmark Status */}
        {isBookmarked && (
          <div className={cn('mb-4 rounded p-2', isLight ? 'bg-blue-50' : 'bg-gray-700')}>
            <div className="flex items-center justify-between">
              <span className={cn('truncate text-xs', isLight ? 'text-blue-700' : 'text-blue-300')}>
                {updatedAt ? '最后更新: ' + new Date(updatedAt).toLocaleString() : '已收藏'}
              </span>
              <button
                onClick={handleDeleteBookmark}
                disabled={loading}
                className={cn(
                  'rounded px-2 py-1 text-xs',
                  isLight ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-gray-600',
                )}>
                删除
              </button>
            </div>
          </div>
        )}

        {/* Notes Input */}
        <div className="mb-4">
          <label
            htmlFor="remark"
            className={cn('mb-1 block text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
            备注
          </label>
          <textarea
            id="remark"
            value={remark}
            onChange={e => setRemark(e.target.value)}
            placeholder="在此输入备注信息..."
            rows={3}
            className={cn(
              'w-full rounded border p-2 focus:outline-none focus:ring-2',
              isLight
                ? 'border-gray-300 bg-white focus:ring-blue-300'
                : 'border-gray-600 bg-gray-700 focus:ring-blue-700',
            )}
            disabled={loading}
          />
        </div>

        {/* Action Button */}
        <div className="mt-4">
          <button
            onClick={handleSaveBookmark}
            disabled={loading}
            className={cn(
              'w-full rounded px-4 py-2 font-medium transition-colors duration-200',
              // Base styles based on bookmark status
              isBookmarked
                ? isLight
                  ? 'border border-blue-500 text-blue-500 hover:bg-blue-50'
                  : 'border border-blue-500 text-blue-400 hover:bg-gray-700'
                : isLight
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700',
              // Loading state
              loading && 'cursor-not-allowed opacity-50',
              // Success state
              operationStatus === 'success' &&
                !loading &&
                (isLight
                  ? 'border-green-500 bg-green-500 text-white hover:bg-green-600'
                  : 'border-green-600 bg-green-600 text-white hover:bg-green-700'),
              // Error state
              operationStatus === 'error' &&
                !loading &&
                (isLight
                  ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                  : 'border-red-600 bg-red-600 text-white hover:bg-red-700'),
            )}>
            {loading
              ? '操作中...'
              : operationStatus === 'success'
                ? '操作成功'
                : operationStatus === 'error'
                  ? '操作失败'
                  : isBookmarked
                    ? '更新书签'
                    : '保存为书签'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
