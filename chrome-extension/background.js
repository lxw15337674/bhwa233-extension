// background/service worker for manifest v3
import { MemoService } from '../pages/popup/src/service/MemoService';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-selection-as-memo',
    title: '保存选中内容为笔记',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-selection-as-memo' && info.selectionText && tab) {
    try {
      // 构造笔记数据
      const memoData = {
        content: info.selectionText,
        link: {
          url: info.pageUrl || tab.url || '',
          text: tab.title || '',
        },
        images: [], // 不支持图片
      };
      // 直接调用 MemoService 保存
      await MemoService.createMemo(memoData);
      // 通知用户
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: '笔记已保存',
        message: '选中内容已保存为笔记',
      });
    } catch (e) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: '保存失败',
        message: '笔记保存失败，请重试',
      });
    }
  }
});
