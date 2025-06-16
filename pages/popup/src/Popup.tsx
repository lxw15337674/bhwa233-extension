import '@src/Popup.css';
import { BookmarkService } from './service/BookmarkService';
import { uploadToGallery } from './service/upload';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import {
  Bookmark as BookmarkIcon,
  BookmarkCheck,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Image,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Bookmark } from './service/BookmarkService';

interface ArticleImage {
  src: string;
  alt: string;
  score: number;
  position: string;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
}

const Popup = () => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [operationStatus, setOperationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [articleImages, setArticleImages] = useState<ArticleImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [existBookmark, setExistBookmark] = useState<Bookmark | null>(null);
  // Get current tab info when popup opens
  useEffect(() => {
    const getCurrentTabInfo = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab?.title) {
        setCurrentUrl(tab.url);
        setCurrentTitle(tab.title);

        // 同时提取文章图片
        extractArticleImages(tab.id);

        try {
          const bookmark = await BookmarkService.getBookmark(tab.url);
          if (bookmark) {
            setExistBookmark(bookmark);
          }
        } catch (error) {
          console.error('Error checking bookmark status:', error);
        }
      }
    };

    getCurrentTabInfo();
  }, []);

  // Extract article images from current page
  const extractArticleImages = async (tabId: number | undefined) => {
    if (!tabId) return;

    setImagesLoading(true);
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'extractArticleImages',
      });
      if (response?.success && response.images) {
        console.log('收到文章图片:', response.images);
        setArticleImages(response.images);
        // 自动选择第一张图片
        if (response.images.length > 0) {
          setSelectedImage(response.images[0].src);
        }
      } else {
        console.log('未提取到文章图片:', response?.error);
        setArticleImages([]);
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('图片提取失败:', error);

      // 检查是否是连接错误
      if (error.message && error.message.includes('Could not establish connection')) {
        console.warn('Content script 未加载，可能需要刷新页面');
        // 可以在这里设置一个状态来显示提示信息给用户
      }

      setArticleImages([]);
    } finally {
      setImagesLoading(false);
    }
  };

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
      let finalImageUrl = selectedImage;

      // 如果选择了图片，先上传到gallery服务器
      if (selectedImage) {
        console.log('开始上传图片到gallery:', selectedImage);
        setUploadingImage(true);
        try {
          const uploadedImageUrl = await uploadToGallery(selectedImage);
          if (uploadedImageUrl) {
            console.log('图片上传成功:', uploadedImageUrl);
            finalImageUrl = uploadedImageUrl;
          } else {
            console.warn('图片上传失败，使用原始URL');
            // 如果上传失败，仍然使用原始图片URL
          }
        } catch (uploadError) {
          console.error('图片上传出错:', uploadError);
          // 上传失败时，仍然使用原始图片URL，不阻断书签保存
        } finally {
          setUploadingImage(false);
        }
      }

      const result = await BookmarkService.addBookmark({
        url: currentUrl,
        title: currentTitle,
        remark,
        image: finalImageUrl,
      });

      if (result) {
        setExistBookmark(result);
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
    if (!existBookmark) return;

    setLoading(true);
    try {
      await BookmarkService.removeBookmark(currentUrl);
      setExistBookmark(null);
      setOperationStatus('success');
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      setOperationStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App bg-background flex-col p-6 dark:bg-black dark:text-white">
      <main className="flex flex-1 flex-col space-y-6">
        {/* Page Title & Bookmark Status */}
        <div className="bg-card rounded-lg border p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:border-[#232329] dark:bg-[#18181b] dark:text-white">
          <div className="flex flex-col gap-2">
            <h2
              className="text-foreground line-clamp-2 text-base font-semibold leading-tight dark:text-white"
              title={currentTitle}>
              {currentTitle || '无标题'}
            </h2>
            <p className="text-muted-foreground truncate text-xs dark:text-white/60">{currentUrl}</p>
            {existBookmark && (
              <div className="mt-1 space-y-2">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {new Date(existBookmark.updateTime).toLocaleString()}
                  </span>
                  <button
                    onClick={handleDeleteBookmark}
                    disabled={loading}
                    className="text-destructive hover:bg-destructive/10 ml-auto flex items-center space-x-1 rounded-md px-2 py-1 text-xs transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30">
                    <Trash2 className="h-3 w-3" />
                    <span>删除</span>
                  </button>
                </div>
                {existBookmark.remark && (
                  <div className="bg-muted/50 rounded-md p-2 dark:bg-[#232329]/50">
                    <p className="text-muted-foreground text-xs leading-relaxed dark:text-white/70">
                      <span className="font-medium">备注：</span>
                    </p>
                    <div className="max-h-16 overflow-y-auto">
                      <p className="text-muted-foreground break-words text-xs leading-relaxed dark:text-white/70">
                        {existBookmark.remark}
                      </p>
                    </div>
                  </div>
                )}

                {/* 显示生成的标签 */}
                {existBookmark.tags && existBookmark.tags.length > 0 && (
                  <div className="bg-muted/50 rounded-md p-2 dark:bg-[#232329]/50">
                    <p className="text-muted-foreground text-xs leading-relaxed dark:text-white/70">
                      <span className="font-medium">智能标签：</span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {existBookmark.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 显示AI生成的摘要 */}
                {existBookmark.summary && (
                  <div className="bg-muted/50 rounded-md p-2 dark:bg-[#232329]/50">
                    <p className="text-muted-foreground text-xs leading-relaxed dark:text-white/70">
                      <span className="font-medium">智能摘要：</span>
                    </p>
                    <div className="max-h-20 overflow-y-auto">
                      <p className="text-muted-foreground break-words text-left text-xs leading-relaxed dark:text-white/70">
                        {existBookmark.summary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Article Images */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Image className="text-muted-foreground h-4 w-4" />
            <span className="text-foreground text-sm font-medium dark:text-white">文章配图</span>
            {selectedImage && (
              <span className="text-muted-foreground ml-auto text-xs">
                已选择 {articleImages.findIndex(img => img.src === selectedImage) + 1}/{articleImages.length}
              </span>
            )}
          </div>

          {imagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              <span className="text-muted-foreground ml-2 text-sm">正在提取图片...</span>
            </div>
          ) : articleImages.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {articleImages.slice(0, 6).map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedImage(image.src)}
                  className={cn(
                    'bg-muted group relative aspect-square cursor-pointer overflow-hidden rounded-md border-2 transition-all duration-200',
                    selectedImage === image.src
                      ? 'z-10 scale-105 transform border-blue-500 shadow-xl ring-4 ring-blue-500/30'
                      : 'border-transparent hover:scale-[1.02] hover:border-blue-300 hover:shadow-md',
                  )}
                  title={`${image.alt || '无描述'} (${Math.round(image.score)}分)`}>
                  <img
                    src={image.src}
                    alt={image.alt || '文章图片'}
                    className={cn(
                      'h-full w-full object-cover transition-all duration-200',
                      selectedImage === image.src ? 'brightness-110' : 'group-hover:scale-105',
                    )}
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  {index === 0 && (
                    <div className="bg-primary text-primary-foreground absolute left-1 top-1 rounded px-1.5 py-0.5 text-xs font-medium">
                      推荐
                    </div>
                  )}
                  {selectedImage === image.src && (
                    <>
                      <div className="absolute inset-0 rounded-md border border-blue-500" />
                    </>
                  )}
                  <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-xs text-white">
                    {Math.round(image.score)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Image className="text-muted-foreground/50 h-12 w-12" />
              <p className="text-muted-foreground mt-2 text-sm">未找到文章图片</p>
              <p className="text-muted-foreground/70 text-xs">当前页面可能不包含合适的图片内容</p>
            </div>
          )}
        </div>

        {/* Notes Input */}
        <div className="space-y-3">
          <textarea
            id="remark"
            value={remark}
            onChange={e => setRemark(e.target.value)}
            placeholder="在此输入备注信息..."
            rows={3}
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#18181b] dark:text-white dark:placeholder:text-white/40"
            disabled={loading}
          />
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleSaveBookmark}
            disabled={loading}
            className={cn(
              'ring-offset-background focus-visible:ring-ring inline-flex h-10 w-full items-center justify-center space-x-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
              // Base styles based on bookmark status
              existBookmark
                ? 'border-input bg-background hover:bg-accent hover:text-accent-foreground border dark:border-[#232329] dark:bg-[#18181b] dark:text-white dark:hover:bg-[#232329]'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-black',
              // Success state
              operationStatus === 'success' && !loading && 'bg-green-600 text-white hover:bg-green-700',
              // Error state
              operationStatus === 'error' &&
                !loading &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}>
            {loading ? (
              uploadingImage ? (
                <>
                  <Upload className="h-4 w-4 animate-pulse" />
                  <span>正在上传图片...</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>保存中...</span>
                </>
              )
            ) : operationStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>操作成功</span>
              </>
            ) : operationStatus === 'error' ? (
              <>
                <XCircle className="h-4 w-4" />
                <span>操作失败</span>
              </>
            ) : existBookmark ? (
              <>
                <Save className="h-4 w-4" />
                <span>更新书签</span>
              </>
            ) : (
              <>
                <BookmarkIcon className="h-4 w-4" />
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
