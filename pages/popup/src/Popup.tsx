import '@src/Popup.css';
import { BookmarkService } from './service/BookmarkService';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useEffect, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  XCircle} from 'lucide-react';

const Popup = () => {
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
        try {
          const bookmark = await BookmarkService.getBookmark(tab.url);
          if (bookmark) {
            setIsBookmarked(true);
            setRemark(bookmark.remark || '');
            setUpdatedAt(bookmark.updateTime);
          }
        } catch (error) {
          console.error('Error checking bookmark status:', error);
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
      result = await BookmarkService.addBookmark({
        url: currentUrl,
        title: currentTitle,
        remark,
      });
      setIsBookmarked(true);

      if (result) {
        setUpdatedAt(result.updateTime);
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
    <div className="App flex-col bg-background p-6 dark:bg-black dark:text-white">
      <main className="flex flex-1 flex-col space-y-6">
        {/* Page Title & Bookmark Status */}
        <div className="rounded-lg border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-[#18181b] dark:border-[#232329] dark:text-white">
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold leading-tight text-foreground text-base dark:text-white line-clamp-2" title={currentTitle}>
              {currentTitle || '无标题'}
            </h2>
            <p className="text-muted-foreground text-xs truncate dark:text-white/60">
              {currentUrl}
            </p>
            {isBookmarked && updatedAt && (
              <div className="flex items-center gap-2 mt-1">
                <BookmarkCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400 text-xs">
                  {new Date(updatedAt).toLocaleString()}
                </span>
                <button
                  onClick={handleDeleteBookmark}
                  disabled={loading}
                  className="flex items-center space-x-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:text-red-400 dark:hover:bg-red-900/30 ml-auto">
                  <Trash2 className="w-3 h-3" />
                  <span>删除</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notes Input */}
        <div className="space-y-3">
          <textarea
            id="remark"
            value={remark}
            onChange={e => setRemark(e.target.value)}
            placeholder="在此输入备注信息..."
            rows={3}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none dark:bg-[#18181b] dark:text-white dark:placeholder:text-white/40"
            disabled={loading}
          />
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleSaveBookmark}
            disabled={loading}
            className={cn(
              'inline-flex w-full items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 space-x-2',
              // Base styles based on bookmark status
              isBookmarked
                ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:bg-[#18181b] dark:text-white dark:border-[#232329] dark:hover:bg-[#232329]'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black',
              // Success state
              operationStatus === 'success' &&
              !loading &&
              'bg-green-600 text-white hover:bg-green-700',
              // Error state
              operationStatus === 'error' &&
              !loading &&
              'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>操作中...</span>
              </>
            ) : operationStatus === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>操作成功</span>
              </>
            ) : operationStatus === 'error' ? (
              <>
                <XCircle className="w-4 h-4" />
                <span>操作失败</span>
              </>
            ) : isBookmarked ? (
              <>
                <Save className="w-4 h-4" />
                <span>更新书签</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>保存为书签</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
