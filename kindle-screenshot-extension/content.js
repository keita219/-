// ============================================
// Kindle Screenshot Tool - Content Script
// Kindleページに注入されるスクリプト
// ページ操作とスクリーンショット撮影を担当
// ============================================

console.log('Kindle Screenshot Tool: Content script loaded');

// ============================================
// メッセージリスナー（popup.jsからの指示を受信）
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  // 非同期処理のため、trueを返す
  (async () => {
    try {
      if (message.action === 'captureCurrentPage') {
        await captureCurrentPage(message.settings);
        sendResponse({ success: true });
      } else if (message.action === 'capturePages') {
        await capturePages(message.pages, message.settings);
        sendResponse({ success: true });
      } else if (message.action === 'captureAllPages') {
        await captureAllPages(message.settings);
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error('Error:', error);
      // エラーメッセージを適切に取得
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && error.toString && error.toString() !== '[object Object]' && error.toString() !== '[object Event]') {
        errorMessage = error.toString();
      }
      sendResponse({ success: false, error: errorMessage });
    }
  })();

  return true; // 非同期レスポンスを有効化
});

// ============================================
// キャプチャ処理
// ============================================

// 機能1: 現在のページをキャプチャ
async function captureCurrentPage(settings) {
  try {
    console.log('Capturing current page...');

    // 本文エリアを取得
    const bookContent = getBookContentElement();

    if (!bookContent) {
      throw new Error('Kindleの本文エリアが見つかりませんでした。Kindle Cloud Readerで本を開いていますか？');
    }

    console.log('Book content found, capturing element...');

    // スクリーンショットを撮影
    const screenshot = await captureElement(bookContent);

    console.log('Screenshot captured, saving...');

    // 書籍名とページ番号を取得
    const bookTitle = getBookTitle();
    const pageNumber = getCurrentPageNumber() || 'current';
    const filename = `[${bookTitle}][${pageNumber}].png`;

    // 画像を保存
    await downloadImage(screenshot, filename, settings.saveFolderName);

    console.log('Image saved');

    // PDFに変換（オプション）
    if (settings.convertToPdf) {
      console.log('Converting to PDF...');
      const pdfFilename = `[${bookTitle}][${pageNumber}].pdf`;
      await convertToPdf([screenshot], pdfFilename, settings.saveFolderName);
      console.log('PDF conversion complete');
    }

    console.log('Capture complete!');
  } catch (error) {
    console.error('Error in captureCurrentPage:', error);
    throw error;
  }
}

// 機能2: 指定ページをキャプチャ
async function capturePages(pages, settings) {
  console.log('Capturing pages:', pages);

  const screenshots = settings.convertToPdf ? [] : null; // PDFに変換する場合のみ配列を使用
  const currentPage = getCurrentPageNumber() || 1;
  const bookTitle = getBookTitle();

  for (let i = 0; i < pages.length; i++) {
    const targetPage = pages[i];

    // 進捗を通知（パーセント表示）
    const percent = Math.round(((i + 1) / pages.length) * 100);
    notifyProgress(i + 1, pages.length, percent);

    // 目的のページに移動
    await navigateToPage(targetPage, currentPage, settings.pageDelay);

    // 本文エリアを取得
    const bookContent = getBookContentElement();

    if (!bookContent) {
      console.warn(`Page ${targetPage}: Book content not found`);
      continue;
    }

    // スクリーンショットを撮影
    const screenshot = await captureElement(bookContent);

    // 保存処理
    if (settings.convertToPdf) {
      // PDF変換する場合は配列に保存
      screenshots.push(screenshot);
    } else {
      // 即座にダウンロード（メモリ節約）
      const filename = `[${bookTitle}][${targetPage}].png`;
      await downloadImage(screenshot, filename, settings.saveFolderName);
    }

    // ページめくり間隔
    if (i < pages.length - 1) {
      await sleep(settings.pageDelay);
    }
  }

  // PDFに変換（オプション）
  if (settings.convertToPdf && screenshots && screenshots.length > 0) {
    const pdfFilename = `[${bookTitle}][${pages[0]}-${pages[pages.length - 1]}].pdf`;
    await convertToPdf(screenshots, pdfFilename, settings.saveFolderName);
  }

  console.log('All pages captured!');
}

// 機能3: 全ページをキャプチャ
async function captureAllPages(settings) {
  console.log('Capturing all pages...');

  const screenshots = settings.convertToPdf ? [] : null; // PDFに変換する場合のみ配列を使用
  let pageNumber = 1;
  let hasNextPage = true;
  const bookTitle = getBookTitle();

  while (hasNextPage) {
    // 進捗を通知（総ページ数不明なので、現在ページのみ表示）
    notifyProgress(pageNumber, null, null);

    // 本文エリアを取得
    const bookContent = getBookContentElement();

    if (!bookContent) {
      console.warn(`Page ${pageNumber}: Book content not found`);
      break;
    }

    // スクリーンショットを撮影
    const screenshot = await captureElement(bookContent);

    // 保存処理
    if (settings.convertToPdf) {
      // PDF変換する場合は配列に保存
      screenshots.push(screenshot);
    } else {
      // 即座にダウンロード（メモリ節約）
      const filename = `[${bookTitle}][${pageNumber}].png`;
      await downloadImage(screenshot, filename, settings.saveFolderName);
    }

    // 次のページへ移動
    hasNextPage = await goToNextPage();

    if (hasNextPage) {
      await sleep(settings.pageDelay);
      pageNumber++;
    }
  }

  // PDFに変換（オプション）
  if (settings.convertToPdf && screenshots && screenshots.length > 0) {
    const pdfFilename = `[${bookTitle}][all_pages].pdf`;
    await convertToPdf(screenshots, pdfFilename, settings.saveFolderName);
  }

  console.log(`All ${pageNumber} pages captured!`);
}

// ============================================
// Kindleページ操作ヘルパー関数
// ============================================

// 本文エリアのDOM要素を取得
function getBookContentElement() {
  // Kindle Cloud Readerの本文エリアを取得
  // セレクタは複数試す（Kindleの仕様変更に対応）
  const selectors = [
    '#KindleReaderIFrame', // iframeの場合
    '[id^="column_"]', // カラム要素
    '.readerContentColumn', // カラム要素（別パターン）
    '#kindleReader_book_frame', // 旧バージョン
    'iframe[title="Book content"]' // iframeのタイトル
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);

    if (element) {
      // iframeの場合は、その中身を取得
      if (element.tagName === 'IFRAME') {
        try {
          return element.contentDocument.body;
        } catch (e) {
          console.warn('Cannot access iframe content:', e);
          continue;
        }
      }

      return element;
    }
  }

  // セレクタで見つからない場合は、可視エリア全体を返す
  console.warn('Book content element not found, using document body');
  return document.body;
}

// Kindle書籍名を取得
function getBookTitle() {
  console.log('[content.js] getBookTitle() called');

  // Kindle Cloud Readerのタイトル要素を取得
  const selectors = [
    'title', // ページタイトル（最優先）
    '#kindleReader_header_title', // ヘッダータイトル
    '.book-title', // 書籍タイトル
    '[id*="title"]', // ID内にtitleを含む要素
    'h1', // h1要素
    'header h1', // ヘッダー内のh1
    '[class*="title"]' // クラス内にtitleを含む要素
  ];

  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      console.log(`[content.js] Trying selector "${selector}":`, element ? element.textContent.substring(0, 50) : 'not found');

      if (element && element.textContent.trim()) {
        let title = element.textContent.trim();

        // ページタイトルから書籍名を抽出（"書籍名 - Kindle Cloud Reader"形式）
        if (selector === 'title') {
          // パターン1: "書籍名 - Kindle Cloud Reader"
          let match = title.match(/^(.+?)\s*[-–—]\s*Kindle/i);
          if (match) {
            title = match[1].trim();
          } else {
            // パターン2: "Kindle Cloud Reader - 書籍名"
            match = title.match(/Kindle.*?[-–—]\s*(.+)$/i);
            if (match) {
              title = match[1].trim();
            }
          }
        }

        // ファイル名に使用できない文字を除去
        title = title.replace(/[<>:"/\\|?*]/g, '').trim();

        // 有効なタイトルが取得できた場合
        if (title && title.length > 0 && title !== 'Kindle Cloud Reader') {
          console.log('[content.js] Book title found:', title);
          return title;
        }
      }
    } catch (error) {
      console.warn(`[content.js] Error with selector "${selector}":`, error);
    }
  }

  console.warn('[content.js] Book title not found, using default "kindle_book"');
  return 'kindle_book';
}

// 現在のページ番号を取得
function getCurrentPageNumber() {
  // Kindle Cloud Readerのページ番号表示要素を取得
  const selectors = [
    '[id^="kindleReader_pageTurn_"]', // ページ番号表示
    '.kindleProgressBar', // プログレスバー
    '#kindleReader_book_progress' // 進捗表示
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);

    if (element) {
      // ページ番号をテキストから抽出
      const match = element.textContent.match(/(\d+)/);

      if (match) {
        return parseInt(match[1]);
      }
    }
  }

  return null;
}

// 指定ページに移動
async function navigateToPage(targetPage, currentPage, delay) {
  const diff = targetPage - currentPage;

  if (diff === 0) {
    return; // 既に目的のページ
  }

  const isForward = diff > 0;
  const clicks = Math.abs(diff);

  for (let i = 0; i < clicks; i++) {
    if (isForward) {
      await goToNextPage();
    } else {
      await goToPreviousPage();
    }

    await sleep(delay);
  }
}

// 次のページへ移動
async function goToNextPage() {
  // Kindle Cloud Readerの「次へ」ボタンをクリック
  const nextButtons = [
    '#kindleReader_pageTurn_right', // 右矢印
    '.nextButton', // 次へボタン
    'button[aria-label="Next Page"]', // アクセシビリティラベル
    '[id^="kindleReader_pageTurn_right"]' // ID部分一致
  ];

  for (const selector of nextButtons) {
    const button = document.querySelector(selector);

    if (button && !button.disabled) {
      button.click();
      await sleep(300); // クリック後の待機
      return true;
    }
  }

  // ボタンが見つからない場合は、右クリック領域をクリック
  const bookContent = getBookContentElement();

  if (bookContent) {
    const rect = bookContent.getBoundingClientRect();
    const clickX = rect.right - 50; // 右端から50px
    const clickY = rect.top + rect.height / 2; // 中央

    bookContent.click();
    await sleep(300);
    return true;
  }

  return false; // ページめくり失敗
}

// 前のページへ移動
async function goToPreviousPage() {
  // Kindle Cloud Readerの「前へ」ボタンをクリック
  const prevButtons = [
    '#kindleReader_pageTurn_left', // 左矢印
    '.prevButton', // 前へボタン
    'button[aria-label="Previous Page"]', // アクセシビリティラベル
    '[id^="kindleReader_pageTurn_left"]' // ID部分一致
  ];

  for (const selector of prevButtons) {
    const button = document.querySelector(selector);

    if (button && !button.disabled) {
      button.click();
      await sleep(300);
      return true;
    }
  }

  return false;
}

// ============================================
// スクリーンショット関連
// ============================================

// DOM要素をキャプチャしてBase64画像データURLを返す
async function captureElement(element) {
  // background.jsにスクリーンショット要求を送信
  console.log('Requesting screenshot from background...');

  const response = await chrome.runtime.sendMessage({
    action: 'captureScreenshot'
  });

  if (response.success) {
    console.log('Screenshot captured successfully');
    return response.dataUrl;
  } else {
    throw new Error(response.error || 'スクリーンショットの撮影に失敗しました');
  }
}

// html2canvasは使用しないため削除（Chrome APIを使用）

// ============================================
// ファイル保存
// ============================================

// 画像をダウンロード
async function downloadImage(dataUrl, filename, folderName) {
  console.log('[content.js] downloadImage called with folderName:', folderName, 'filename:', filename);

  // Data URLをBlobに変換
  const blob = dataURLToBlob(dataUrl);
  const url = URL.createObjectURL(blob);

  try {
    // background.jsにメッセージを送信してダウンロード
    await chrome.runtime.sendMessage({
      action: 'downloadFile',
      url: url,
      filename: filename,
      folderName: folderName,
      saveAs: false
    });
    console.log('[content.js] Download message sent successfully');
  } catch (error) {
    console.error('[content.js] Download failed:', error);
    throw error;
  } finally {
    // 少し待ってからURLを解放
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// PDFに変換してダウンロード
async function convertToPdf(dataUrls, filename, folderName) {
  // jsPDFライブラリを動的に読み込み
  if (!window.jspdf) {
    await loadJsPDF();
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');

  for (let i = 0; i < dataUrls.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }

    // 画像をPDFに追加（A4サイズに自動調整）
    const imgProps = pdf.getImageProperties(dataUrls[i]);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(dataUrls[i], 'PNG', 0, 0, pdfWidth, pdfHeight);
  }

  const pdfBlob = pdf.output('blob');
  const url = URL.createObjectURL(pdfBlob);

  try {
    // background.jsにメッセージを送信してダウンロード
    await chrome.runtime.sendMessage({
      action: 'downloadFile',
      url: url,
      filename: filename,
      folderName: folderName,
      saveAs: false
    });
  } catch (error) {
    console.error('PDF download failed:', error);
    throw error;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// jsPDFライブラリを読み込み
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) {
      console.log('jsPDF already loaded');
      resolve();
      return;
    }

    console.log('Loading jsPDF...');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      console.log('jsPDF loaded successfully');
      resolve();
    };
    script.onerror = (error) => {
      console.error('Failed to load jsPDF:', error);
      reject(new Error('jsPDFライブラリの読み込みに失敗しました。インターネット接続を確認してください。'));
    };
    document.head.appendChild(script);
  });
}

// ============================================
// ユーティリティ関数
// ============================================

// Data URLをBlobに変換
function dataURLToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mimeType = parts[0].match(/:(.*?);/)[1];
  const byteString = atob(parts[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: mimeType });
}

// 指定ミリ秒待機
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 進捗を通知
function notifyProgress(current, total, percent) {
  chrome.runtime.sendMessage({
    action: 'updateProgress',
    current: current,
    total: total,
    percent: percent
  });
}
