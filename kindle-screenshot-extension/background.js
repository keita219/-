// ============================================
// Kindle Screenshot Tool - Background Script
// バックグラウンドで動作するサービスワーカー
// ============================================

console.log('Kindle Screenshot Tool: Background script loaded');

// ============================================
// 拡張機能インストール時の処理
// ============================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');

    // デフォルト設定を保存
    chrome.storage.local.set({
      convertToPdf: false,
      pageDelay: 1500
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// ============================================
// メッセージリスナー
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  // 将来的な拡張機能のために予約
  // 現在は特に処理なし

  return true;
});

// ============================================
// コンテキストメニュー（将来的な拡張機能）
// ============================================

// 右クリックメニューを追加（オプション機能として残しておく）
// chrome.contextMenus.create({
//   id: 'captureCurrentPage',
//   title: '現在のページをスクリーンショット',
//   contexts: ['page'],
//   documentUrlPatterns: [
//     'https://read.amazon.com/*',
//     'https://read.amazon.co.jp/*'
//   ]
// });

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   if (info.menuItemId === 'captureCurrentPage') {
//     chrome.tabs.sendMessage(tab.id, {
//       action: 'captureCurrentPage',
//       settings: { convertToPdf: false, pageDelay: 1500 }
//     });
//   }
// });
