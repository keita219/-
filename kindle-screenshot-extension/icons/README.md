# アイコンファイルの生成方法

`icon.svg` を以下のサイズのPNG画像に変換してください：

1. **icon16.png** - 16x16ピクセル
2. **icon48.png** - 48x48ピクセル
3. **icon128.png** - 128x128ピクセル

## オンライン変換ツール（推奨）

以下のサイトでSVGをPNGに変換できます：

- https://svgtopng.com/
- https://cloudconvert.com/svg-to-png
- https://convertio.co/ja/svg-png/

## コマンドラインツール

ImageMagickがインストールされている場合：

```bash
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

Inkscapeがインストールされている場合：

```bash
inkscape icon.svg -w 16 -h 16 -o icon16.png
inkscape icon.svg -w 48 -h 48 -o icon48.png
inkscape icon.svg -w 128 -h 128 -o icon128.png
```

## 注意

拡張機能を読み込む前に、必ずPNGファイルを生成してください。
SVGファイルのままでは拡張機能が正しく動作しません。
