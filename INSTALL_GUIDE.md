# Kindle Screenshot Tool - 確実なインストール手順

## ⚠️ 重要：完全な再インストール手順

以下の手順を**必ず順番通り**に実行してください。途中の手順を飛ばすと、古いバージョンが残ってしまいます。

---

## 📋 ステップ1: 古いバージョンを完全に削除

### 1-1. 拡張機能を削除
1. Chromeで `chrome://extensions/` を開く
2. 「Kindle Screenshot Tool」を見つける
3. **「削除」** ボタンをクリック
4. 確認ダイアログで **「削除」** を選択

### 1-2. Chromeのキャッシュをクリア
1. Chromeで `chrome://settings/clearBrowserData` を開く
2. 期間：**「全期間」** を選択
3. 以下にチェック:
   - ✅ **「キャッシュされた画像とファイル」**
4. **「データを削除」** をクリック

### 1-3. Service Workerをクリア
1. Chromeで `chrome://serviceworker-internals/` を開く
2. 「Kindle Screenshot Tool」関連のWorkerがあれば **「Unregister」** をクリック

### 1-4. Chromeを完全再起動
1. Chromeを **完全に終了**（すべてのウィンドウを閉じる）
2. Chromeを再起動

---

## 📥 ステップ2: 最新版をインストール

### 2-1. ZIPファイルをダウンロード
1. GitHubから `kindle-screenshot-extension.zip` をダウンロード
2. デスクトップなど分かりやすい場所に保存

### 2-2. ZIPファイルを解凍
1. `kindle-screenshot-extension.zip` を **右クリック**
2. **「すべて展開」** または **「解凍」** を選択
3. 解凍先フォルダを確認（デスクトップ推奨）

### 2-3. 拡張機能をインストール
1. Chromeで `chrome://extensions/` を開く
2. 右上の **「デベロッパーモード」** をONにする
3. **「パッケージ化されていない拡張機能を読み込む」** をクリック
4. 解凍した **`kindle-screenshot-extension`** フォルダを選択
5. **「フォルダーの選択」** をクリック

### 2-4. バージョン確認
- 拡張機能一覧で **「v1.1」** と表示されていることを確認
- 表示されていない場合は、拡張機能の詳細を開いて確認

---

## 🔧 ステップ3: Chrome設定の確認

### 3-1. ダウンロード設定を確認
1. Chromeで `chrome://settings/downloads` を開く
2. **「ダウンロード前に各ファイルの保存場所を確認する」をOFF**にする
   - ⚠️ これがONだと、毎回保存場所ダイアログが表示されます

### 3-2. ダウンロードフォルダを確認
- ダウンロード先が正しく設定されているか確認
- サブフォルダはこのダウンロードフォルダ内に自動作成されます

---

## 📖 ステップ4: Kindleページで動作確認

### 4-1. Kindle Cloud Readerを開く
1. https://read.amazon.co.jp/ にアクセス
2. 任意の書籍を開く
3. **F5キーでページを再読み込み**（重要！）

### 4-2. デバッグコンソールを開く
1. Kindleページで **F12キー** を押す
2. **「Console」** タブを開く
3. ログがクリアな状態にする（必要に応じて「Clear console」をクリック）

### 4-3. 拡張機能を実行
1. 拡張機能アイコンをクリック
2. **「保存フォルダ」** に任意の名前を入力（例: `test-book`）
3. **「指定ページ」** をクリック
4. ページ範囲入力欄に **「1-2」** と入力（2ページのテスト）
5. **「指定ページ」** ボタンをクリック

---

## 🔍 ステップ5: デバッグログの確認

### 5-1. コンソールで以下のログを確認してください

#### ✅ 正常動作時のログ例:
```
[popup.js] Settings: {convertToPdf: false, saveFolderName: "test-book", pageDelay: 1500}
[content.js] getBookTitle() called
[content.js] Trying selector "title": 吾輩は猫である - Kindle Cloud Reader
[content.js] Book title found: 吾輩は猫である
[content.js] downloadImage called with folderName: test-book filename: [吾輩は猫である][1].png

=== [background.js] handleDownloadFile START ===
[background.js] Received filename: [吾輩は猫である][1].png
[background.js] Received folderName: test-book
[background.js] Using folder name: test-book
[background.js] Final download path: test-book/[吾輩は猫である][1].png
[background.js] Download started successfully with ID: 123
=== [background.js] handleDownloadFile SUCCESS ===
```

### 5-2. 確認ポイント

| 確認項目 | 期待される値 | 意味 |
|---------|-------------|------|
| `saveFolderName` | 入力した名前 | フォルダ名が正しく渡されている |
| `Book title found` | 書籍名 | 書籍名が取得できている |
| `Final download path` | `フォルダ名/[書籍名][ページ].png` | 正しいパスが生成されている |
| `Download started successfully` | 表示される | ダウンロードが開始された |

### 5-3. ダウンロードフォルダを確認
1. Windowsエクスプローラーで **「ダウンロード」** フォルダを開く
2. **`test-book`** フォルダが作成されているか確認
3. フォルダ内に **`[書籍名][1].png`** **`[書籍名][2].png`** があるか確認

---

## ❌ 問題が発生した場合

### ケース1: フォルダが作成されない

**コンソールログで確認:**
- `Using folder name:` が表示されているか
- `Final download path:` に `フォルダ名/` が含まれているか

**もし空の場合:**
```javascript
// ログ例
[background.js] Received folderName: undefined
[background.js] Using folder name: kindle  // デフォルト値が使用される
```
→ popup.jsの設定が正しく渡されていない可能性

**対処法:**
1. 拡張機能を **「🔄 再読み込み」**
2. Kindleページを **F5で再読み込み**
3. もう一度実行

### ケース2: ファイル名が `kindle_page_1.png` のまま

**コンソールログで確認:**
```
[content.js] Book title found: kindle_book
```
→ 書籍名が取得できていない

**デバッグログを確認:**
```
[content.js] Trying selector "title": Kindle Cloud Reader
[content.js] Trying selector "#kindleReader_header_title": not found
...
```
→ どのセレクタでも書籍名を取得できていない

**対処法:**
1. コンソールログのすべての `Trying selector` の結果をコピー
2. 取得できているテキストを確認
3. 必要に応じてセレクタを追加

### ケース3: 「Could not establish connection」エラー

**原因:**
- content.jsがページにロードされていない

**対処法:**
1. `chrome://extensions/` で拡張機能を **「🔄 再読み込み」**
2. Kindleページを **F5で再読み込み**
3. もう一度実行

---

## 📝 コンソールログをコピーして送る方法

問題が解決しない場合は、以下の手順でログを送ってください：

1. コンソールで右クリック → **「Save as...」**
2. または、ログをすべて選択してコピー
3. テキストファイルに貼り付けて送信

特に重要なログ：
- `[popup.js] Settings:`
- `[content.js] Book title found:`
- `[background.js] Final download path:`
- エラーメッセージ（赤文字）

---

## ✅ 成功の確認

以下がすべて確認できれば成功です：

1. ✅ ダウンロードフォルダに **サブフォルダが作成**されている
2. ✅ ファイル名が **`[書籍名][ページ].png`** 形式になっている
3. ✅ 画像が正しくダウンロードされている
4. ✅ コンソールにエラーが表示されていない

---

## 🎯 まとめ

1. **古いバージョンを完全削除**（Chrome再起動含む）
2. **最新版(v1.1)をインストール**
3. **Chrome設定でダウンロードダイアログをOFF**
4. **Kindleページを再読み込み(F5)**
5. **コンソールでデバッグログを確認**

この手順で確実に動作します！
