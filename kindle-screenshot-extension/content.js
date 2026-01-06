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

    // 現在のページ番号を取得（可能であれば）
    const pageNumber = getCurrentPageNumber() || 'current';

    // 画像を保存
    await downloadImage(screenshot, `kindle_page_${pageNumber}.png`, settings.saveLocation);

    console.log('Image saved');

    // PDFに変換（オプション）
    if (settings.convertToPdf) {
      console.log('Converting to PDF...');
      await convertToPdf([screenshot], `kindle_page_${pageNumber}.pdf`, settings.saveLocation);
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
      await downloadImage(screenshot, `kindle_page_${targetPage}.png`, settings.saveLocation);
    }

    // ページめくり間隔
    if (i < pages.length - 1) {
      await sleep(settings.pageDelay);
    }
  }

  // PDFに変換（オプション）
  if (settings.convertToPdf && screenshots && screenshots.length > 0) {
    await convertToPdf(screenshots, `kindle_pages_${pages[0]}-${pages[pages.length - 1]}.pdf`, settings.saveLocation);
  }

  console.log('All pages captured!');
}

// 機能3: 全ページをキャプチャ
async function captureAllPages(settings) {
  console.log('Capturing all pages...');

  const screenshots = settings.convertToPdf ? [] : null; // PDFに変換する場合のみ配列を使用
  let pageNumber = 1;
  let hasNextPage = true;

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
      await downloadImage(screenshot, `kindle_page_${pageNumber}.png`, settings.saveLocation);
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
    await convertToPdf(screenshots, `kindle_all_pages.pdf`, settings.saveLocation);
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
  // html2canvasライブラリを動的に読み込み
  if (!window.html2canvas) {
    await loadHtml2Canvas();
  }

  // 要素をCanvasに変換
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    scale: 2, // 高解像度
    logging: false
  });

  // CanvasをBase64 PNG画像に変換
  return canvas.toDataURL('image/png');
}

// html2canvasライブラリを読み込み
function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) {
      console.log('html2canvas already loaded');
      resolve();
      return;
    }

    console.log('Loading html2canvas...');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => {
      console.log('html2canvas loaded successfully');
      resolve();
    };
    script.onerror = (error) => {
      console.error('Failed to load html2canvas:', error);
      reject(new Error('html2canvasライブラリの読み込みに失敗しました。インターネット接続を確認してください。'));
    };
    document.head.appendChild(script);
  });
}

// ============================================
// ファイル保存
// ============================================

// 画像をダウンロード
async function downloadImage(dataUrl, filename, saveLocation) {
  // Data URLをBlobに変換
  const blob = dataURLToBlob(dataUrl);
  const url = URL.createObjectURL(blob);

  // 保存先を選択する場合はbackground scriptを経由
  if (saveLocation === 'prompt') {
    try {
      // background.jsにメッセージを送信してダウンロード
      await chrome.runtime.sendMessage({
        action: 'downloadFile',
        url: url,
        filename: filename,
        saveAs: true
      });
    } catch (error) {
      console.warn('Background download failed, using fallback:', error);
      downloadImageFallback(url, filename);
    } finally {
      // 少し待ってからURLを解放
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } else {
    // 通常のダウンロード
    downloadImageFallback(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// 通常のダウンロード（フォールバック）
function downloadImageFallback(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// PDFに変換してダウンロード
async function convertToPdf(dataUrls, filename, saveLocation) {
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

  // 保存先を選択する場合はbackground scriptを経由
  if (saveLocation === 'prompt') {
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    try {
      // background.jsにメッセージを送信してダウンロード
      await chrome.runtime.sendMessage({
        action: 'downloadFile',
        url: url,
        filename: filename,
        saveAs: true
      });
    } catch (error) {
      console.warn('Background download failed, using fallback:', error);
      pdf.save(filename);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } else {
    // 通常の保存
    pdf.save(filename);
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
