import { ArticleImageExtractor } from './lib/ArticleImageExtractor';
import type { ArticleImage } from './lib/ArticleImageExtractor';

// 监听来自popup的图片提取请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractArticleImages') {
    console.log('收到图片提取请求');

    ArticleImageExtractor.extractArticleImages()
      .then((images: ArticleImage[]) => {
        console.log('提取到文章图片:', images);
        sendResponse({ success: true, images });
      })
      .catch(error => {
        console.error('图片提取失败:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 表示异步响应
  }

  return false; // 对于其他消息类型，不处理
});

export const sampleFunction = () => {
  console.log('content script - sampleFunction() called from another module');
};
