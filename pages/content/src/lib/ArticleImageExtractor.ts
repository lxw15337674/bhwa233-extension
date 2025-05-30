export interface ArticleImage {
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

export class ArticleImageExtractor {
  private static readonly ARTICLE_SELECTORS = [
    'article',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '.main-content',
    '#content',
    '.post-body',
    '.article-body',
    '.markdown-body',
  ];

  private static readonly POSITION_WEIGHTS = {
    'hero-image': 10,
    'featured-image': 9,
    'first-paragraph': 8,
    'early-content': 6,
    'mid-content': 4,
    'late-content': 2,
    unknown: 1,
  };

  private static readonly SITE_SPECIFIC_RULES: Record<string, any> = {
    'medium.com': {
      articleSelector: 'article',
      imageSelector: 'figure img',
      excludeSelectors: ['.avatar', '.clap-icon'],
    },
    'zhihu.com': {
      articleSelector: '.RichContent',
      imageSelector: '.RichContent img',
      excludeSelectors: ['.Avatar', '.Icon'],
    },
    'juejin.cn': {
      articleSelector: '.markdown-body',
      imageSelector: '.markdown-body img',
    },
  };

  static async extractArticleImages(): Promise<ArticleImage[]> {
    try {
      const articleContainer = this.findArticleContainer();
      if (!articleContainer) {
        console.log('未找到文章容器，使用整个页面');
        return this.extractFromPage();
      }

      console.log('找到文章容器:', articleContainer);
      return this.extractFromContainer(articleContainer);
    } catch (error) {
      console.error('提取文章图片失败:', error);
      return [];
    }
  }

  private static findArticleContainer(): Element | null {
    // 尝试站点特定规则
    const hostname = window.location.hostname;
    const siteRule = this.SITE_SPECIFIC_RULES[hostname];

    if (siteRule?.articleSelector) {
      const container = document.querySelector(siteRule.articleSelector);
      if (container) return container;
    }

    // 通用选择器
    for (const selector of this.ARTICLE_SELECTORS) {
      const element = document.querySelector(selector);
      if (element && this.isValidArticleContainer(element)) {
        return element;
      }
    }

    return null;
  }

  private static isValidArticleContainer(element: Element): boolean {
    const text = element.textContent || '';
    const paragraphs = element.querySelectorAll('p').length;
    const headings = element.querySelectorAll('h1,h2,h3,h4,h5,h6').length;

    return text.length > 500 && paragraphs >= 2 && headings >= 1;
  }

  private static async extractFromContainer(container: Element): Promise<ArticleImage[]> {
    const images = container.querySelectorAll('img');
    const candidates: ArticleImage[] = [];

    for (const img of Array.from(images)) {
      if (await this.isValidArticleImage(img)) {
        const imageData = await this.analyzeImage(img, container);
        if (imageData) {
          candidates.push(imageData);
        }
      }
    }

    return candidates.sort((a, b) => b.score - a.score).slice(0, 6); // 返回前6张候选图片
  }

  private static async extractFromPage(): Promise<ArticleImage[]> {
    const images = document.querySelectorAll('img');
    const candidates: ArticleImage[] = [];

    for (const img of Array.from(images)) {
      if (await this.isValidArticleImage(img)) {
        const imageData = await this.analyzeImage(img, document.body);
        if (imageData) {
          candidates.push(imageData);
        }
      }
    }

    return candidates
      .filter(img => img.score > 10) // 提高筛选标准
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  private static async isValidArticleImage(img: HTMLImageElement): Promise<boolean> {
    // 检查图片是否可见
    if (img.offsetWidth === 0 || img.offsetHeight === 0) return false;

    // 检查图片是否在视窗外
    const rect = img.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return false;

    // 排除明显的装饰性图片
    const src = this.extractBestImageSrc(img);
    if (!src || src.includes('avatar') || src.includes('icon') || src.includes('logo')) {
      return false;
    }

    // 检查CSS类名
    const className = img.className.toLowerCase();
    if (className.includes('avatar') || className.includes('icon') || className.includes('emoji')) {
      return false;
    }

    // 等待图片加载
    return this.waitForImageLoad(img);
  }

  private static async waitForImageLoad(img: HTMLImageElement): Promise<boolean> {
    return new Promise(resolve => {
      if (img.complete && img.naturalWidth > 0) {
        resolve(img.naturalWidth >= 100 && img.naturalHeight >= 100);
      } else {
        img.onload = () => resolve(img.naturalWidth >= 100 && img.naturalHeight >= 100);
        img.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 3000);
      }
    });
  }

  private static async analyzeImage(img: HTMLImageElement, container: Element): Promise<ArticleImage | null> {
    const src = this.extractBestImageSrc(img);
    if (!src) return null;

    const rect = img.getBoundingClientRect();
    const dimensions = {
      width: rect.width,
      height: rect.height,
    };

    const score = this.calculateImageScore(img, container);
    const position = this.getImagePosition(img, container);
    const format = this.getImageFormat(src);

    return {
      src,
      alt: img.alt || '',
      score,
      position,
      dimensions,
      format,
    };
  }

  private static extractBestImageSrc(img: HTMLImageElement): string {
    // 优先使用高分辨率图片
    if (img.srcset) {
      const srcsetEntries = this.parseSrcset(img.srcset);
      const highRes = srcsetEntries.find(entry => entry.width >= 400);
      if (highRes) return highRes.src;
    }

    // 检查 data-src (懒加载)
    return img.dataset.src || img.dataset.original || img.src;
  }

  private static parseSrcset(srcset: string): Array<{ src: string; width: number }> {
    return srcset.split(',').map(entry => {
      const parts = entry.trim().split(' ');
      const src = parts[0];
      const width = parts[1] ? parseInt(parts[1].replace('w', '')) : 0;
      return { src, width };
    });
  }

  private static calculateImageScore(img: HTMLImageElement, container: Element): number {
    let score = 0;

    // 1. 尺寸评分 (0-30分)
    const rect = img.getBoundingClientRect();
    if (rect.width >= 400 && rect.height >= 300) score += 30;
    else if (rect.width >= 200 && rect.height >= 150) score += 20;
    else if (rect.width >= 100 && rect.height >= 100) score += 10;

    // 2. 位置评分 (0-25分)
    const position = this.getImagePosition(img, container);
    score += this.POSITION_WEIGHTS[position] || 0;

    // 3. 语义评分 (0-25分)
    score += this.evaluateImageSemantics(img);

    // 4. 技术质量 (0-20分)
    score += this.evaluateTechnicalQuality(img);

    return score;
  }

  private static getImagePosition(img: HTMLImageElement, container: Element): string {
    // 检查CSS类名中的位置指示
    const className = img.className.toLowerCase();
    if (className.includes('hero') || className.includes('banner')) return 'hero-image';
    if (className.includes('featured')) return 'featured-image';

    // 检查父元素的类名
    const parent = img.closest('figure, div, section');
    if (parent) {
      const parentClass = parent.className.toLowerCase();
      if (parentClass.includes('hero') || parentClass.includes('featured')) {
        return 'featured-image';
      }
    }

    // 根据在容器中的位置判断
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    const relativeTop = (imgRect.top - containerRect.top) / containerRect.height;

    if (relativeTop <= 0.3) return 'early-content';
    if (relativeTop <= 0.7) return 'mid-content';
    return 'late-content';
  }

  private static evaluateImageSemantics(img: HTMLImageElement): number {
    let score = 0;

    // Alt文本评分
    if (img.alt && img.alt.length > 5) {
      score += 10;
      if (img.alt.length > 20) score += 5;
    }

    // 检查周围文本
    const nearbyText = this.getNearbyText(img, 200);
    if (nearbyText && nearbyText.length > 50) {
      score += 10;
    }

    return Math.min(score, 25);
  }

  private static evaluateTechnicalQuality(img: HTMLImageElement): number {
    let score = 0;

    // 图片格式评分
    const src = img.src.toLowerCase();
    if (src.includes('.webp')) score += 10;
    else if (src.includes('.jpg') || src.includes('.jpeg')) score += 8;
    else if (src.includes('.png')) score += 6;

    // 响应式图片加分
    if (img.srcset) score += 5;

    // 懒加载图片加分（说明被重视）
    if (img.dataset.src || img.loading === 'lazy') score += 5;

    return Math.min(score, 20);
  }

  private static getNearbyText(img: HTMLImageElement, maxDistance: number): string {
    const walker = document.createTreeWalker(img.parentElement || document.body, NodeFilter.SHOW_TEXT, null);

    let text = '';
    let node;

    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      if (textNode.textContent && textNode.textContent.trim()) {
        text += textNode.textContent.trim() + ' ';
        if (text.length > maxDistance) break;
      }
    }

    return text.trim();
  }

  private static getImageFormat(src: string): string {
    const url = src.toLowerCase();
    if (url.includes('.webp')) return 'webp';
    if (url.includes('.jpg') || url.includes('.jpeg')) return 'jpeg';
    if (url.includes('.png')) return 'png';
    if (url.includes('.gif')) return 'gif';
    if (url.includes('.svg')) return 'svg';
    return 'unknown';
  }
}
