// 这个文件将被注入到页面中执行内容提取
import { Readability } from '@mozilla/readability';

export interface ExtractedContent {
  title: string | null;
  content: string | null;
  textContent: string | null;
  length: number;
  excerpt: string | null;
}

// 在页面中执行的内容提取函数
export const extractContentFromPage = (): ExtractedContent | null => {
  try {
    // 检查页面是否已经加载完成
    if (document.readyState !== 'complete') {
      return null;
    }

    // 创建文档副本
    const documentClone = document.cloneNode(true) as Document;

    // 创建 Readability 实例
    const reader = new Readability(documentClone, {
      charThreshold: 500,
      classesToPreserve: ['highlight', 'important'],
    });

    // 解析文章内容
    const article = reader.parse();

    if (!article) {
      return null;
    }

    return {
      title: article.title ?? null,
      content: article.content ?? null,
      textContent: article.textContent ?? null,
      length: article.length ?? 0,
      excerpt: article.excerpt ?? null,
    };
  } catch (error) {
    console.error('内容提取失败:', error);
    return null;
  }
};
