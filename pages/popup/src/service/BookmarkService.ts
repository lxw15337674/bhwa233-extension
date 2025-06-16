import { getApiConfig } from './config';
import axios from 'axios';

export interface Tag {
  id: string;
  name: string;
  remark: string | null;
  createTime: string;
  updateTime: string;
  deletedAt: string | null;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  remark: string;
  content?: string | null;
  image?: string | null;
  tags?: Tag[]; // 生成的标签对象数组
  summary?: string | null; // AI生成的摘要
  createTime: string;
  updateTime: string;
  deletedAt?: string | null;
  loading?: boolean; // API返回数据中包含的字段
}

export type NewBookmark = Omit<Bookmark, 'id' | 'createTime' | 'updateTime'>;

// 内容提取结果接口
export interface ExtractedContent {
  title: string | null;
  content: string | null;
  textContent: string | null;
  length: number;
  excerpt: string | null;
}

// 消息类型定义
interface MessageRequest {
  action: 'EXTRACT_CONTENT';
}

interface MessageResponse {
  success: boolean;
  data?: ExtractedContent;
  error?: string;
}

export class BookmarkService {
  // 处理提取的内容，确保适合存储
  private static processExtractedContent(content: ExtractedContent): string | null {
    if (!content.textContent) {
      return null;
    }

    let processedContent = content.textContent;

    // 清理内容：移除多余的空白和换行
    processedContent = processedContent
      .replace(/\s+/g, ' ') // 将多个空白字符替换为单个空格
      .replace(/\n\s*\n/g, '\n') // 将多个换行替换为单个换行
      .trim();

    // 如果内容太长，截取前5000个字符作为摘要
    const maxLength = 5000;
    if (processedContent.length > maxLength) {
      // 在合适的位置截断（尽量在句号、问号或感叹号后）
      const truncated = processedContent.substring(0, maxLength);
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf('。'),
        truncated.lastIndexOf('！'),
        truncated.lastIndexOf('？'),
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?'),
      );

      if (lastSentenceEnd > maxLength * 0.8) {
        // 如果找到了合适的句子结尾，且位置不太靠前
        processedContent = truncated.substring(0, lastSentenceEnd + 1);
      } else {
        // 否则简单截断并添加省略号
        processedContent = truncated + '...';
      }
    }

    return processedContent;
  }

  // 通过消息传递提取页面内容
  static async extractContent(): Promise<ExtractedContent | null> {
    try {
      // 获取当前活跃标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('无法获取当前标签页');
      }

      console.log('向content script发送内容提取请求...');

      // 发送消息到content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'EXTRACT_CONTENT',
      } as MessageRequest);

      const messageResponse = response as MessageResponse;

      if (messageResponse.success && messageResponse.data) {
        console.log('从content script收到提取结果:', {
          title: messageResponse.data.title,
          length: messageResponse.data.length,
          excerptLength: messageResponse.data.excerpt?.length || 0,
        });
        return messageResponse.data;
      } else {
        console.warn('内容提取失败:', messageResponse.error);
        return null;
      }
    } catch (error) {
      console.error('与content script通信失败:', error);
      return null;
    }
  }

  // 获取单个书签 - 仅通过URL查询
  static async getBookmark(url: string): Promise<Bookmark | null> {
    console.log('开始获取单个书签:', url);
    try {
      const config = await getApiConfig();
      const bookmark = await axios.get(`${config.API_URL}/api/bookmark/search?url=${encodeURIComponent(url)}`, {
        headers: config.API_HEADERS,
      });
      if (bookmark.data) {
        console.log('获取到书签:', bookmark.data);
        return bookmark.data as Bookmark;
      } else {
        return null;
      }
    } catch (error) {
      console.error('获取单个书签失败:', error);
      return null;
    }
  }

  // 添加新书签
  static async addBookmark(bookmarkData: NewBookmark): Promise<Bookmark> {
    console.log('开始添加书签，准备提取内容...');

    // 首先尝试提取页面内容
    let extractedContent: ExtractedContent | null = null;
    try {
      extractedContent = await this.extractContent();
      if (extractedContent) {
        console.log('内容提取成功:', {
          title: extractedContent.title,
          length: extractedContent.length,
          excerpt: extractedContent.excerpt?.substring(0, 100) + '...',
        });
      }
    } catch (error) {
      console.warn('内容提取失败，继续保存书签:', error);
    }

    const newBookmark = {
      url: bookmarkData.url,
      title: bookmarkData.title,
      remark: bookmarkData.remark || '',
      image: bookmarkData.image || null,
      // 使用提取的内容作为content，如果没有则为空
      content: extractedContent ? this.processExtractedContent(extractedContent) : null,
    };

    console.log('准备发送书签数据到API:', {
      url: newBookmark.url,
      title: newBookmark.title,
      remark: newBookmark.remark,
      image: newBookmark.image,
      contentLength: newBookmark.content?.length || 0,
    });

    try {
      const config = await getApiConfig();
      const response = await axios.post(`${config.API_URL}/api/bookmark`, newBookmark, {
        headers: config.API_HEADERS,
      });
      console.log('API响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('保存书签失败:', error);
      throw error;
    }
  }

  // 删除书签 - 使用 URL 代替 ID
  static async removeBookmark(url: string): Promise<void> {
    try {
      const config = await getApiConfig();
      // 将 URL 编码以便在请求路径中安全使用
      const encodedUrl = encodeURIComponent(url);
      await axios.delete(`${config.API_URL}/api/bookmark/search?url=${encodedUrl}`, {
        headers: config.API_HEADERS,
      });
    } catch (error) {
      console.error('删除书签失败:', error);
      throw error;
    }
  }
}
