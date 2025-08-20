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
  action: 'EXTRACT_CONTENT' | 'getSelectedText' | 'showToast';
  type?: 'success' | 'error' | 'warning';
  message?: string;
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

// Toast 通知类
class ToastNotification {
  private static createToast(type: 'success' | 'error' | 'warning', message: string): void {
    // 移除已存在的 toast
    const existingToast = document.getElementById('ext-memo-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.id = 'ext-memo-toast';

    // 样式
    const colors = {
      success: { bg: '#4CAF50', icon: '✓' },
      error: { bg: '#F44336', icon: '✗' },
      warning: { bg: '#FF9800', icon: '⚠' },
    };

    const color = colors[type];

    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${color.bg};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 200px;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out;
        opacity: 0;
      ">
        <span style="font-size: 16px;">${color.icon}</span>
        <span>${message}</span>
      </div>
    `;

    // 添加到页面
    document.body.appendChild(toast);

    // 动画显示
    requestAnimationFrame(() => {
      const toastElement = toast.querySelector('div') as HTMLElement;
      toastElement.style.transform = 'translateX(0)';
      toastElement.style.opacity = '1';
    });

    // 3秒后自动移除
    setTimeout(() => {
      if (toast && toast.parentNode) {
        const toastElement = toast.querySelector('div') as HTMLElement;
        toastElement.style.transform = 'translateX(100%)';
        toastElement.style.opacity = '0';

        setTimeout(() => {
          if (toast && toast.parentNode) {
            toast.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  static show(type: 'success' | 'error' | 'warning', message: string): void {
    ToastNotification.createToast(type, message);
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request: MessageRequest, sender, sendResponse) => {
  console.log('收到消息:', request);

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
  } else if (request.action === 'getSelectedText') {
    try {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';

      sendResponse({
        success: true,
        selectedText,
      });
    } catch (error) {
      console.error('获取选中文本时出错:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  } else if (request.action === 'showToast') {
    try {
      if (request.type && request.message) {
        ToastNotification.show(request.type, request.message);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: '缺少 type 或 message 参数' });
      }
    } catch (error) {
      console.error('显示 Toast 时出错:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  // 返回true表示我们会异步发送响应
  return true;
});

console.log('内容提取器已加载');

export type { ExtractedContent, MessageRequest, MessageResponse };
