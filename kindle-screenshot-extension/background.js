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
      saveFolderName: '',
      pageDelay: 1500
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated to version', chrome.runtime.getManifest().version);

    // 古い設定を削除して新しい設定に移行
    chrome.storage.local.remove('promptSaveLocation');
  }
});

// ============================================
// メッセージリスナー
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  // ファイルダウンロード処理
  if (message.action === 'downloadFile') {
    handleDownloadFile(message, sendResponse);
    return true; // 非同期レスポンスを有効化
  }

  // スクリーンショット処理
  if (message.action === 'captureScreenshot') {
    handleCaptureScreenshot(sender, sendResponse);
    return true; // 非同期レスポンスを有効化
  }

  return true;
});

// ============================================
// スクリーンショット処理
// ============================================

async function handleCaptureScreenshot(sender, sendResponse) {
  try {
    console.log('Capturing screenshot for tab:', sender.tab.id);

    // タブのスクリーンショットを撮影
    const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
      format: 'png'
    });

    console.log('Screenshot captured successfully');
    sendResponse({ success: true, dataUrl: dataUrl });
  } catch (error) {
    console.error('Screenshot failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ============================================
// ファイルダウンロード処理
// ============================================

async function handleDownloadFile(message, sendResponse) {
  try {
    console.log('=== [background.js] handleDownloadFile START ===');
    console.log('[background.js] Received filename:', message.filename);
    console.log('[background.js] Received folderName:', message.folderName);
    console.log('[background.js] Received saveAs:', message.saveAs);

    // 必ずサブフォルダを作成する
    // フォルダ名が指定されていない場合はデフォルトで「kindle」を使用
    let folderName = message.folderName && message.folderName.trim() !== ''
      ? message.folderName.trim()
      : 'kindle';

    console.log('[background.js] Using folder name:', folderName);

    const filename = `${folderName}/${message.filename}`;
    console.log('[background.js] Final download path:', filename);

    const downloadOptions = {
      url: message.url,
      filename: filename,
      saveAs: message.saveAs || false
    };
    console.log('[background.js] Download options:', downloadOptions);

    const downloadId = await chrome.downloads.download(downloadOptions);

    console.log('[background.js] Download started successfully with ID:', downloadId);
    console.log('=== [background.js] handleDownloadFile SUCCESS ===');
    sendResponse({ success: true, downloadId: downloadId });
  } catch (error) {
    console.error('[background.js] Download failed with error:', error);
    console.error('[background.js] Error details:', error.message, error.stack);
    console.log('=== [background.js] handleDownloadFile FAILED ===');
    sendResponse({ success: false, error: error.message });
  }
}

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
