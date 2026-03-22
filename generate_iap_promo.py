"""
MaisokuDB Pro - IAPプロモーション画像生成スクリプト
出力: iap_promo_maisokudb_pro.png (1024x1024)

App Store審査要件:
  - 1024 x 1024 px
  - スクリーンショット不可
  - 文字は大きく・読みやすく
  - そのIAPを直接的に表現すること
"""

from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 1024
OUT = "iap_promo_maisokudb_pro.png"

# macOS 日本語フォント（文字化け防止）
FONT_BOLD = "/System/Library/Fonts/ヒラギノ角ゴシック W9.ttc"
FONT      = "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"
FONT_REG  = "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc"

# カラーパレット（アプリのテーマに合わせる）
BG        = (10, 10, 9)         # #0a0a09
ACCENT    = (232, 68, 58)       # #e8443a
ACCENT_DIM= (180, 40, 34)
CARD_BG   = (22, 22, 20)       # #161614
TEXT      = (245, 240, 232)    # #f5f0e8
TEXT_SUB  = (176, 168, 152)    # #b0a898
BORDER    = (42, 42, 40)       # #2a2a28
GOLD      = (212, 175, 55)     # PRO バッジ色


def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def rounded_rect(draw, xy, radius, fill, outline=None, outline_width=2):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill,
                           outline=outline, width=outline_width)


img  = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# ── グラデーション風の背景装飾（左上に赤い光）──
for i in range(200):
    alpha = int(30 * (1 - i / 200))
    draw.ellipse(
        [-100 + i, -100 + i, 400 - i, 400 - i],
        fill=(232, 68, 58, alpha) if False else ACCENT,
        outline=None,
    )
# 手動でグラデーション円を描く（Pillow は RGBA blend が必要なのでシンプルな方法で）
overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
for i in range(180):
    a = int(18 * (1 - i / 180))
    od.ellipse([-60 + i, -60 + i, 320 - i, 320 - i],
               fill=(232, 68, 58, a))
img_rgba = img.convert("RGBA")
img_rgba = Image.alpha_composite(img_rgba, overlay)
img = img_rgba.convert("RGB")
draw = ImageDraw.Draw(img)

# ── カードベース ──
card_margin = 56
rounded_rect(draw,
             [card_margin, card_margin, W - card_margin, H - card_margin],
             radius=40, fill=CARD_BG,
             outline=BORDER, outline_width=2)

cx = W // 2  # 中央X

# ── PRO バッジ ──
badge_w, badge_h = 160, 50
badge_x = cx - badge_w // 2
badge_y = 128
rounded_rect(draw,
             [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
             radius=14, fill=ACCENT)
f_badge = load_font(FONT_BOLD, 26)
draw.text((cx, badge_y + badge_h // 2), "PRO", font=f_badge,
          fill=TEXT, anchor="mm")

# ── アプリ名 ──
f_appname = load_font(FONT_BOLD, 72)
draw.text((cx, 240), "MaisokuDB", font=f_appname, fill=TEXT, anchor="mm")

# ── キャッチコピー ──
f_catch = load_font(FONT_REG, 30)
draw.text((cx, 316), "不動産投資分析をもっとスマートに", font=f_catch,
          fill=TEXT_SUB, anchor="mm")

# ── 区切り線 ──
line_y = 360
draw.line([(card_margin + 60, line_y), (W - card_margin - 60, line_y)],
          fill=BORDER, width=2)

# ── 機能リスト ──
features = [
    ("∞", "AI解析・PDF読み込み", "マイソクから物件情報を自動抽出"),
    ("∞", "物件保存",           "登録件数に制限なし"),
    ("◆", "相場比較",           "取引事例・内部DBで割安・割高を判定"),
    ("↑", "出口予測",           "地価トレンド×5年CAGR で売却益を試算"),
    ("¥", "収益シミュレーション", "16銀行の融資条件で手取り収支を計算"),
]

f_icon   = load_font(FONT_BOLD, 36)
f_feat   = load_font(FONT_BOLD, 32)
f_desc   = load_font(FONT_REG, 22)

feat_start_y = 374
feat_gap     = 80
icon_x       = card_margin + 80
text_x       = icon_x + 60

for i, (icon, title, desc) in enumerate(features):
    y = feat_start_y + i * feat_gap
    draw.text((icon_x, y + 12), icon, font=f_icon, fill=ACCENT, anchor="lm")
    draw.text((text_x, y), title, font=f_feat, fill=TEXT, anchor="lm")
    draw.text((text_x, y + 38), desc, font=f_desc, fill=TEXT_SUB, anchor="lm")

# ── 区切り線 ──
line2_y = feat_start_y + len(features) * feat_gap + 4
draw.line([(card_margin + 60, line2_y), (W - card_margin - 60, line2_y)],
          fill=BORDER, width=2)

# ── 価格表示 ──
price_y = line2_y + 36
f_price_label = load_font(FONT_REG, 24)
f_price       = load_font(FONT_BOLD, 76)
f_price_unit  = load_font(FONT_REG, 22)
f_footer      = load_font(FONT_REG, 20)

draw.text((cx, price_y), "月額　¥1,480　/ 月（税込）", font=f_price_label,
          fill=TEXT_SUB, anchor="mm")
draw.text((cx, price_y + 54), "¥1,480", font=f_price, fill=ACCENT, anchor="mm")
draw.text((cx, price_y + 108), "いつでもキャンセル可能　・　自動更新",
          font=f_price_unit, fill=TEXT_SUB, anchor="mm")

img.save(OUT, "PNG")
print(f"✅ 生成完了: {OUT}  ({W}x{H}px)")
