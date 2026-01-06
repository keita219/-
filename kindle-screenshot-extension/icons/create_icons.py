#!/usr/bin/env python3
"""
Kindle Screenshot Tool のアイコンを生成
本とカメラを組み合わせたアイコンデザイン
"""

from PIL import Image, ImageDraw
import os

def create_book_camera_icon(size):
    """本とカメラを組み合わせたアイコンを生成"""
    # 透明な背景で画像を作成
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # グラデーション背景（紫色）
    for y in range(size):
        # グラデーション計算
        ratio = y / size
        r = int(102 + (118 - 102) * ratio)
        g = int(126 + (75 - 126) * ratio)
        b = int(234 + (162 - 234) * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # 角を丸くする
    radius = size // 8
    # 四隅に透明な円を描画して角を丸くする
    draw.ellipse([0, 0, radius*2, radius*2], fill=(102, 126, 234, 255))
    draw.ellipse([size-radius*2, 0, size, radius*2], fill=(118, 75, 162, 255))
    draw.ellipse([0, size-radius*2, radius*2, size], fill=(118, 75, 162, 255))
    draw.ellipse([size-radius*2, size-radius*2, size, size], fill=(118, 75, 162, 255))

    # 本のアイコン（白い矩形）
    book_margin = size // 5
    book_width = size - book_margin * 2
    book_height = int(book_width * 1.1)
    book_x = book_margin
    book_y = (size - book_height) // 2

    # 本の背景（白）
    draw.rounded_rectangle(
        [book_x, book_y, book_x + book_width, book_y + book_height],
        radius=size // 32,
        fill=(255, 255, 255, 240)
    )

    # ページの線（横線）
    line_color = (102, 126, 234, 150)
    line_count = 5
    line_spacing = book_height // (line_count + 1)
    line_width = max(1, size // 64)
    line_margin = size // 16

    for i in range(1, line_count + 1):
        y_pos = book_y + line_spacing * i
        draw.line(
            [book_x + line_margin, y_pos, book_x + book_width - line_margin, y_pos],
            fill=line_color,
            width=line_width
        )

    # カメラアイコン（右下に配置）
    camera_size = size // 3
    camera_x = size - camera_size - size // 10
    camera_y = size - camera_size - size // 10

    # カメラの外側の円
    draw.ellipse(
        [camera_x, camera_y, camera_x + camera_size, camera_y + camera_size],
        fill=(118, 75, 162, 255)
    )

    # カメラのレンズ（外側）
    lens_margin = camera_size // 6
    draw.ellipse(
        [camera_x + lens_margin, camera_y + lens_margin,
         camera_x + camera_size - lens_margin, camera_y + camera_size - lens_margin],
        outline=(255, 255, 255, 255),
        width=max(1, size // 48)
    )

    # カメラのレンズ（内側・白）
    lens_inner_margin = camera_size // 4
    draw.ellipse(
        [camera_x + lens_inner_margin, camera_y + lens_inner_margin,
         camera_x + camera_size - lens_inner_margin, camera_y + camera_size - lens_inner_margin],
        fill=(255, 255, 255, 255)
    )

    # カメラの上部（ファインダー部分）
    finder_width = camera_size // 2
    finder_height = camera_size // 6
    finder_x = camera_x + (camera_size - finder_width) // 2
    finder_y = camera_y - finder_height

    draw.rounded_rectangle(
        [finder_x, finder_y, finder_x + finder_width, finder_y + finder_height],
        radius=size // 64,
        fill=(118, 75, 162, 255)
    )

    return img

def main():
    """メイン処理"""
    print('📸 Kindle Screenshot Tool - アイコン生成中...')
    print('=' * 60)

    # スクリプトのディレクトリに移動
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # 必要なアイコンサイズ
    sizes = [
        (16, 'icon16.png'),
        (48, 'icon48.png'),
        (128, 'icon128.png')
    ]

    # 各サイズのアイコンを生成
    for size, filename in sizes:
        print(f'生成中: {filename} ({size}x{size})', end=' ... ')

        # アイコンを生成
        icon = create_book_camera_icon(size)

        # 保存
        icon.save(filename, 'PNG')

        # ファイルサイズを確認
        file_size = os.path.getsize(filename)
        print(f'✅ 完了 ({file_size:,} bytes)')

    print('=' * 60)
    print('✅ すべてのアイコンを生成しました！')
    print('')
    print('生成されたファイル:')
    for size, filename in sizes:
        if os.path.exists(filename):
            file_size = os.path.getsize(filename)
            print(f'  - {filename}: {size}x{size}px ({file_size:,} bytes)')

if __name__ == '__main__':
    main()
