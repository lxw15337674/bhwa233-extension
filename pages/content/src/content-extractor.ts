import { Readability } from '@mozilla/readability';

// 内容提取结果接口
interface ExtractedContent {
  title: string | null;
  content: string | null;
  textContent: string | null;
  length: number;
  excerpt: string | null;
}

// 消息类型定义
interface MessageRequest {
  action: 'EXTRACT_CONTENT';
  data?: unknown;
}

interface MessageResponse {
  success: boolean;
  data?: ExtractedContent;
  error?: string;
}

class ContentExtractor {
  // 提取页面内容
  static extractContent(): ExtractedContent | null {
    try {
      console.log('开始提取页面内容...');

      // 检查页面是否已经加载完成
      if (document.readyState !== 'complete') {
        console.warn('页面尚未完全加载');
        return null;
      }

      // 创建文档副本
      const documentClone = document.cloneNode(true) as Document;

      // 创建 Readability 实例
      const reader = new Readability(documentClone, {
        charThreshold: 500,
        classesToPreserve: ['highlight', 'important'],
        keepClasses: true,
      });

      // 解析文章内容
      const article = reader.parse();

      if (!article) {
        console.warn('无法提取文章内容');
        return null;
      }

      const result: ExtractedContent = {
        title: article.title || null,
        content: article.content || null,
        textContent: article.textContent || null,
        length: article.length || 0,
        excerpt: article.excerpt || null,
      };

      console.log('内容提取成功:', {
        title: result.title,
        length: result.length,
        excerptLength: result.excerpt?.length || 0,
      });

      return result;
    } catch (error) {
      console.error('内容提取失败:', error);
      return null;
    }
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(
  (request: MessageRequest, sender, sendResponse: (response: MessageResponse) => void) => {
    console.log('Content script收到消息:', request);

    if (request.action === 'EXTRACT_CONTENT') {
      try {
        const extractedContent = ContentExtractor.extractContent();

        if (extractedContent) {
          sendResponse({
            success: true,
            data: extractedContent,
          });
        } else {
          sendResponse({
            success: false,
            error: '无法提取页面内容',
          });
        }
      } catch (error) {
        console.error('处理内容提取请求时出错:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    // 返回true表示我们会异步发送响应
    return true;
  },
);

console.log('内容提取器已加载');

export type { ExtractedContent, MessageRequest, MessageResponse };
