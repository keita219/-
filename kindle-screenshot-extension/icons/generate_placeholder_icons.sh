#!/bin/bash
# プレースホルダーアイコンを生成（開発用）
# 実際の運用前に、icon.svgから適切なPNG画像を生成してください

# Base64エンコードされた簡易PNGアイコンを生成
create_placeholder_icon() {
  size=$1
  output=$2
  
  # 簡易的な単色PNGを生成（紫色の四角）
  cat > "$output" << PNGEOF
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==
PNGEOF
}

# 各サイズのプレースホルダーを作成
create_placeholder_icon 16 icon16.png
create_placeholder_icon 48 icon48.png
create_placeholder_icon 128 icon128.png

echo "プレースホルダーアイコンを作成しました"
echo "実際の運用前に、icon.svgから適切なPNG画像を生成してください"
