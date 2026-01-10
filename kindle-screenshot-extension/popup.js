// ============================================
// Kindle Screenshot Tool - Popup Script
// ポップアップUI（拡張機能のメイン画面）の制御
// ============================================

// グローバル変数
let isCancelled = false; // キャンセルフラグ

// DOM要素の取得
const elements = {
  // ボタン
  captureCurrentPage: document.getElementById('captureCurrentPage'),
  captureRange: document.getElementById('captureRange'),
  captureAllPages: document.getElementById('captureAllPages'),
  cancelCapture: document.getElementById('cancelCapture'),

  // 入力フィールド
  pageRange: document.getElementById('pageRange'),
  convertToPdf: document.getElementById('convertToPdf'),
  saveFolderName: document.getElementById('saveFolderName'),
  pageDelay: document.getElementById('pageDelay'),

  // ステータス表示
  status: document.getElementById('status'),
  progress: document.getElementById('progress')
};

// ============================================
// イベントリスナーの設定
// ============================================

// ページ読み込み完了時に実行
document.addEventListener('DOMContentLoaded', () => {
  // 各ボタンのクリックイベント
  elements.captureCurrentPage.addEventListener('click', handleCaptureCurrentPage);
  elements.captureRange.addEventListener('click', handleCaptureRange);
  elements.captureAllPages.addEventListener('click', handleCaptureAllPages);
  elements.cancelCapture.addEventListener('click', handleCancel);

  // 設定の読み込み
  loadSettings();
});

// ============================================
// 設定の保存と読み込み
// ============================================

// 設定を保存
function saveSettings() {
  chrome.storage.local.set({
    convertToPdf: elements.convertToPdf.checked,
    saveFolderName: elements.saveFolderName.value.trim(),
    pageDelay: parseInt(elements.pageDelay.value)
  });
}

// 設定を読み込み
function loadSettings() {
  chrome.storage.local.get(['convertToPdf', 'saveFolderName', 'pageDelay'], (result) => {
    elements.convertToPdf.checked = result.convertToPdf || false;
    elements.saveFolderName.value = result.saveFolderName || '';
    elements.pageDelay.value = result.pageDelay || 1500;
  });
}

// 設定変更時に保存
elements.convertToPdf.addEventListener('change', saveSettings);
elements.saveFolderName.addEventListener('input', saveSettings);
elements.pageDelay.addEventListener('change', saveSettings);

// ============================================
// ボタンハンドラー（各機能の処理開始）
// ============================================

// 機能1: 現在のページをキャプチャ
async function handleCaptureCurrentPage() {
  try {
    showStatus('現在のページを保存中...', 'info');
    setButtonsEnabled(false);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // URLチェック
    if (!tab.url.includes('read.amazon.com') && !tab.url.includes('read.amazon.co.jp')) {
      showStatus('❌ Kindle Cloud Readerで本を開いてください', 'error');
      setButtonsEnabled(true);
      return;
    }

    // content.jsにメッセージを送信
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'captureCurrentPage',
      settings: getSettings()
    });

    if (response.success) {
      showStatus('✅ 保存完了！', 'success');
    } else {
      showStatus('❌ エラー: ' + response.error, 'error');
    }
  } catch (error) {
    // 接続エラーの場合は詳細なメッセージを表示
    if (error.message.includes('Could not establish connection') || error.message.includes('Receiving end does not exist')) {
      showStatus('❌ ページを再読み込みしてください（F5キー）', 'error');
    } else {
      showStatus('❌ エラー: ' + error.message, 'error');
    }
  } finally {
    setButtonsEnabled(true);
  }
}

// 機能2: 指定ページをキャプチャ
async function handleCaptureRange() {
  try {
    const rangeInput = elements.pageRange.value.trim();

    if (!rangeInput) {
      showStatus('⚠️ ページ範囲を入力してください', 'error');
      return;
    }

    // ページ範囲のパース
    const pages = parsePageRange(rangeInput);

    if (pages.length === 0) {
      showStatus('⚠️ 有効なページ範囲を入力してください', 'error');
      return;
    }

    showStatus('保存準備中...', 'info');
    setButtonsEnabled(false);
    isCancelled = false;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // URLチェック
    if (!tab.url.includes('read.amazon.com') && !tab.url.includes('read.amazon.co.jp')) {
      showStatus('❌ Kindle Cloud Readerで本を開いてください', 'error');
      setButtonsEnabled(true);
      return;
    }

    // content.jsにメッセージを送信
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'capturePages',
      pages: pages,
      settings: getSettings()
    });

    if (response.success) {
      showStatus('✅ 保存完了！', 'success');
    } else {
      showStatus('❌ エラー: ' + response.error, 'error');
    }
  } catch (error) {
    // 接続エラーの場合は詳細なメッセージを表示
    if (error.message.includes('Could not establish connection') || error.message.includes('Receiving end does not exist')) {
      showStatus('❌ ページを再読み込みしてください（F5キー）', 'error');
    } else {
      showStatus('❌ エラー: ' + error.message, 'error');
    }
  } finally {
    setButtonsEnabled(true);
  }
}

// 機能3: 全ページをキャプチャ
async function handleCaptureAllPages() {
  try {
    const confirmed = confirm('全ページのスクリーンショットを撮影します。\nページ数が多い場合、時間がかかります。\n実行しますか？');

    if (!confirmed) return;

    showStatus('保存準備中...', 'info');
    setButtonsEnabled(false);
    isCancelled = false;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // URLチェック
    if (!tab.url.includes('read.amazon.com') && !tab.url.includes('read.amazon.co.jp')) {
      showStatus('❌ Kindle Cloud Readerで本を開いてください', 'error');
      setButtonsEnabled(true);
      return;
    }

    // content.jsにメッセージを送信
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'captureAllPages',
      settings: getSettings()
    });

    if (response.success) {
      showStatus('✅ 保存完了！', 'success');
    } else {
      showStatus('❌ エラー: ' + response.error, 'error');
    }
  } catch (error) {
    // 接続エラーの場合は詳細なメッセージを表示
    if (error.message.includes('Could not establish connection') || error.message.includes('Receiving end does not exist')) {
      showStatus('❌ ページを再読み込みしてください（F5キー）', 'error');
    } else {
      showStatus('❌ エラー: ' + error.message, 'error');
    }
  } finally {
    setButtonsEnabled(true);
  }
}

// キャンセル処理
function handleCancel() {
  isCancelled = true;
  showStatus('⚠️ キャンセルしました', 'info');
  setButtonsEnabled(true);
  showProgress(false);
}

// ============================================
// ユーティリティ関数
// ============================================

// ページ範囲のパース（例: "1-10, 15, 20-30" → [1,2,3,...,10,15,20,...,30]）
function parsePageRange(rangeStr) {
  const pages = new Set();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();

    if (trimmed.includes('-')) {
      // 範囲指定（例: "1-10"）
      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));

      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        continue;
      }

      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      // 単一ページ（例: "15"）
      const page = parseInt(trimmed);

      if (!isNaN(page) && page >= 1) {
        pages.add(page);
      }
    }
  }

  // ソートして配列に変換
  return Array.from(pages).sort((a, b) => a - b);
}

// 現在の設定を取得
function getSettings() {
  return {
    convertToPdf: elements.convertToPdf.checked,
    saveFolderName: elements.saveFolderName.value.trim(),
    pageDelay: parseInt(elements.pageDelay.value)
  };
}

// ステータスメッセージを表示
function showStatus(message, type = 'info') {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  elements.status.classList.remove('hidden');

  // 成功/エラーメッセージは5秒後に自動で消す
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      elements.status.classList.add('hidden');
    }, 5000);
  }
}

// 進捗状況を更新（ステータスエリアに統合表示）
function updateProgress(current, total, percent) {
  if (total && total !== null) {
    // 総ページ数が分かる場合: 「保存中（1/100）」
    showStatus(`保存中（${current}/${total}）`, 'info');
  } else {
    // 総ページ数が不明な場合: 「保存中（50ページ）」
    showStatus(`保存中（${current}ページ）`, 'info');
  }
}

// ボタンの有効/無効を切り替え
function setButtonsEnabled(enabled) {
  elements.captureCurrentPage.disabled = !enabled;
  elements.captureRange.disabled = !enabled;
  elements.captureAllPages.disabled = !enabled;
}

// ============================================
// メッセージリスナー（content.jsからの進捗通知を受信）
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateProgress') {
    updateProgress(message.current, message.total, message.percent);
  } else if (message.action === 'captureComplete') {
    showStatus('✅ 保存完了！', 'success');
    setButtonsEnabled(true);
    showProgress(false);
  } else if (message.action === 'captureError') {
    showStatus('❌ エラー: ' + message.error, 'error');
    setButtonsEnabled(true);
    showProgress(false);
  }

  return true;
});
