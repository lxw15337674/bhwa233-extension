import { API_CONFIG } from './config';
import axios from 'axios';

export interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  remark: string;
  summary: string | null;
  image: string | null;
  createTime: string;
  updateTime: string;
}

export class BookmarkService {
  // 获取单个书签 - 仅通过URL查询
  static async getBookmark(url: string): Promise<Bookmark | null> {
    console.log('开始获取单个书签:', url);
    try {
      const bookmark = await axios.get(`${API_CONFIG.API_URL}?url=${encodeURIComponent(url)}`, {
        headers: API_CONFIG.API_HEADERS,
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
  static async addBookmark(bookmarkData: { url: string; title: string; remark?: string }): Promise<Bookmark> {
    const newBookmark = {
      url: bookmarkData.url,
      title: bookmarkData.title,
      remark: bookmarkData.remark || '',
    };

    console.log('准备发送书签数据到API:', {
      url: newBookmark.url,
      title: newBookmark.title,
      remark: newBookmark.remark,
    });

    try {
      const response = await axios.post(`${API_CONFIG.API_URL}`, newBookmark, {
        headers: API_CONFIG.API_HEADERS,
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
      // 将 URL 编码以便在请求路径中安全使用
      const encodedUrl = encodeURIComponent(url);
      await axios.delete(`${API_CONFIG.API_URL}?url=${encodedUrl}`, {
        headers: API_CONFIG.API_HEADERS,
      });
    } catch (error) {
      console.error('删除书签失败:', error);
      throw error;
    }
  }
}
