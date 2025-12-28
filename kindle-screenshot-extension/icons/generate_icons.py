#!/usr/bin/env python3
"""
簡易アイコン生成スクリプト
SVGからPNGへの変換ツールがない場合の代替手段として、
シンプルな単色アイコンを生成します。
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    """指定サイズのアイコンを生成"""
    # 紫色のグラデーション背景
    img = Image.new('RGB', (size, size), color=(102, 126, 234))
    draw = ImageDraw.Draw(img)

    # 円形を描画（簡易カメラアイコン）
    padding = size // 4
    draw.ellipse(
        [padding, padding, size - padding, size - padding],
        fill=(118, 75, 162),
        outline=(255, 255, 255),
        width=max(1, size // 32)
    )

    # 内側の円（レンズ）
    inner_padding = size // 3
    draw.ellipse(
        [inner_padding, inner_padding, size - inner_padding, size - inner_padding],
        fill=(255, 255, 255),
        outline=(118, 75, 162),
        width=max(1, size // 48)
    )

    # 保存
    img.save(filename, 'PNG')
    print(f'✅ {filename} を生成しました ({size}x{size})')

def main():
    """メイン処理"""
    print('📸 Kindle Screenshot Tool - アイコン生成')
    print('=' * 50)

    # 必要なアイコンサイズ
    sizes = [
        (16, 'icon16.png'),
        (48, 'icon48.png'),
        (128, 'icon128.png')
    ]

    # 各サイズのアイコンを生成
    for size, filename in sizes:
        create_icon(size, filename)

    print('=' * 50)
    print('✅ 全てのアイコンを生成しました！')
    print('')
    print('⚠️  注意: これはプレースホルダーアイコンです')
    print('   実際の運用では icon.svg から適切なPNGを生成してください')

if __name__ == '__main__':
    try:
        main()
    except ImportError:
        print('❌ エラー: Pillowライブラリがインストールされていません')
        print('')
        print('以下のコマンドでインストールしてください：')
        print('  pip install Pillow')
        print('')
        print('または、README.mdの手順に従ってオンラインツールで')
        print('icon.svgをPNGに変換してください')
