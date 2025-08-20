import 'webextension-polyfill';
import { exampleThemeStorage, extensionConfigStorage } from '@extension/storage';

// 默认配置（作为回退）
const DEFAULT_CONFIG = {
  MEMO_API_URL: 'http://localhost:3000',
  MEMO_API_KEY: 'memox-api-2024',
};

// 获取 API 配置
const getApiConfig = async () => {
  try {
    const config = await extensionConfigStorage.get();
    return {
      MEMO_API_URL: config.memoApiUrl || DEFAULT_CONFIG.MEMO_API_URL,
      MEMO_API_KEY: config.memoApiKey || DEFAULT_CONFIG.MEMO_API_KEY,
    };
  } catch (error) {
    console.error('Failed to load extension config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
};

// 创建笔记的函数
const createMemo = async (content: string, url: string, title: string) => {
  try {
    const config = await getApiConfig();

    const memoData = {
      content,
      link: {
        url,
        text: title,
      },
      images: [], // 不支持图片
    };

    const response = await fetch(`${config.MEMO_API_URL}/api/memos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.MEMO_API_KEY,
      },
      body: JSON.stringify(memoData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Failed to create memo:', error);
    throw error;
  }
};

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-selection-as-memo',
    title: '保存选中内容为笔记',
    contexts: ['selection'],
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-selection-as-memo' && info.selectionText && tab) {
    try {
      await createMemo(info.selectionText, info.pageUrl || tab.url || '', tab.title || '');

      // 发送成功消息到 content script
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'showToast',
          type: 'success',
          message: '笔记已保存',
        });
      }
      console.log('笔记保存成功');
    } catch (error) {
      console.error('Error saving memo:', error);

      // 发送失败消息到 content script
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'showToast',
          type: 'error',
          message: '笔记保存失败',
        });
      }
    }
  }
});

// 处理快捷键命令
chrome.commands.onCommand.addListener(async command => {
  if (command === 'save-selection-memo') {
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      // 通过 content script 获取选中文本
      const result = await chrome.tabs.sendMessage(tab.id, {
        action: 'getSelectedText',
      });

      if (result?.selectedText?.trim()) {
        console.log('Selected text:', result.selectedText);
        await createMemo(result.selectedText, tab.url || '', tab.title || '');

        // 发送成功消息到 content script
        chrome.tabs.sendMessage(tab.id, {
          action: 'showToast',
          type: 'success',
          message: '笔记已保存',
        });
        console.log('快捷键保存成功');
      } else {
        console.log('No text selected');
        // 发送提示消息到 content script
        chrome.tabs.sendMessage(tab.id, {
          action: 'showToast',
          type: 'warning',
          message: '请先选中文本',
        });
      }
    } catch (error) {
      console.error('Error saving memo via shortcut:', error);

      // 发送失败消息到 content script
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (currentTab?.id) {
        chrome.tabs.sendMessage(currentTab.id, {
          action: 'showToast',
          type: 'error',
          message: '保存失败',
        });
      }
    }
  }
});

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");
