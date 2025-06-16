# 内容提取功能实现方案

## 实现概述

我们使用了**方案1：在Content Script中提取内容**的架构，通过以下方式集成@mozilla/readability来提取文章内容：

## 架构设计

### 1. Content Script (content-extractor.ts)
- 位置: `pages/content/src/content-extractor.ts`
- 功能: 
  - 使用@mozilla/readability提取页面内容
  - 监听来自popup的消息请求
  - 返回提取的文章内容

### 2. BookmarkService 修改
- 位置: `pages/popup/src/service/BookmarkService.ts`
- 新增功能:
  - `extractContent()`: 通过消息传递与content script通信
  - `processExtractedContent()`: 处理和优化提取的内容
  - 在`addBookmark()`中自动提取并添加文章摘要

### 3. 消息传递机制
- Popup -> Content Script: 发送`EXTRACT_CONTENT`消息
- Content Script -> Popup: 返回提取的内容或错误信息

## 主要特性

### 内容提取
- 使用@mozilla/readability的完整功能
- 支持多种文章格式和网站结构
- 自动清理和优化提取的内容

### 内容处理
- 移除多余的空白和换行符
- 智能截断长文章（最大5000字符）
- 在合适的句子边界截断，保持内容完整性

### 错误处理
- 页面加载状态检查
- 提取失败时的降级处理
- 详细的日志记录用于调试

### 用户体验
- 异步提取，不阻塞UI
- 即使提取失败也能正常保存书签
- 在控制台提供详细的执行信息

## 使用流程

1. 用户在网页上点击扩展图标打开popup
2. 用户点击"添加书签"按钮
3. BookmarkService.addBookmark()被调用
4. 自动向content script发送内容提取请求
5. Content script使用Readability提取页面内容
6. 提取的内容被处理和优化
7. 包含摘要的书签数据发送到API保存

## 技术细节

### 依赖包
- `@mozilla/readability`: 核心内容提取库
- `axios`: HTTP请求处理

### 权限要求
- `tabs`: 获取当前标签页信息
- `scripting`: 与content script通信（已有）
- `host_permissions`: 访问网页内容（已有）

### 消息格式
```typescript
// 请求消息
interface MessageRequest {
  action: 'EXTRACT_CONTENT';
}

// 响应消息
interface MessageResponse {
  success: boolean;
  data?: ExtractedContent;
  error?: string;
}
```

## 优势

1. **性能优越**: 直接在页面上下文中运行，访问完整DOM
2. **兼容性好**: 支持各种网站结构和动态内容
3. **安全可靠**: 在沙箱环境中运行，符合扩展安全要求
4. **维护简单**: 代码结构清晰，易于扩展和维护
5. **用户体验佳**: 自动提取，无需用户额外操作

## 扩展建议

1. 可以添加用户自定义摘要长度的设置
2. 支持不同类型内容的特殊处理（如代码、表格等）
3. 添加内容质量评分，过滤低质量提取结果
4. 支持多语言内容的特殊处理
