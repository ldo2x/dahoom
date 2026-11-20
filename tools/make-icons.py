# -*- coding: utf-8 -*-
"""يولّد أيقونات التطبيق وصورة المشاركة (assets/app/).

التشغيل (ويندوز):  python tools/make-icons.py
يحتاج: Pillow + arabic-reshaper + python-bidi  (pip install pillow arabic-reshaper python-bidi)
الخط: Tahoma Bold من ويندوز (C:/Windows/Fonts/tahomabd.ttf).
الألوان من css/style.css: --brand #FF3D81 ، --bg #0D0B14 ، --ink #120F1C ، ألوان السدو.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # جذر المشروع
OUT = os.path.join(ROOT, 'assets', 'app')
os.makedirs(OUT, exist_ok=True)

FONT_BOLD = 'C:/Windows/Fonts/tahomabd.ttf'
FONT_REG = 'C:/Windows/Fonts/tahoma.ttf'
BRAND = (255, 61, 129)        # --brand
BRAND_DEEP = (194, 16, 77)    # --brand-ink (day) — ظل الحافة
BG = (13, 11, 20)             # --bg
BG2 = (26, 23, 38)            # --surface
INK = (18, 15, 28)            # --ink
TEXT = (247, 244, 239)        # --text
MUTE = (189, 182, 204)        # --mute
SADU_RED, SADU_GOLD, SADU_CREAM, SADU_DARK = (196, 43, 58), (227, 164, 58), (241, 230, 210), (22, 18, 31)

SS = 4  # رسم بدقة أعلى ثم تصغير = حواف ناعمة


def ar(s):
    """تشكيل الحروف العربية وترتيبها من اليمين لليسار (PIL بدون raqm)."""
    return get_display(arabic_reshaper.reshape(s))


def glyph_center(draw, xy, text, font, fill, shadow=None, shadow_off=(0, 0)):
    """يرسم النص في المنتصف حسب حدود الحرف الفعلية (مو مقاييس الخط)."""
    l, t, r, b = draw.textbbox((0, 0), text, font=font)
    x = xy[0] - (l + r) / 2
    y = xy[1] - (t + b) / 2
    if shadow:
        draw.text((x + shadow_off[0], y + shadow_off[1]), text, font=font, fill=shadow)
    draw.text((x, y), text, font=font, fill=fill)


def mark(size, full_bleed=False, letter_scale=0.70, radius_ratio=0.22):
    """علامة دحوم: مربع وردي + «د» أبيض بظل حبري (ستايل بطاقات الميمز)."""
    S = size * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if full_bleed:
        d.rectangle([0, 0, S, S], fill=BRAND)
        # حافة سفلية أغمق مثل أزرار الموقع
        d.rectangle([0, int(S * 0.94), S, S], fill=BRAND_DEEP)
    else:
        r = int(S * radius_ratio)
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=BRAND_DEEP)
        d.rounded_rectangle([0, 0, S - 1, int(S * 0.955)], radius=r, fill=BRAND)
    font = ImageFont.truetype(FONT_BOLD, int(S * letter_scale))
    off = int(S * 0.035)
    glyph_center(d, (S / 2, S * 0.49), 'د', font, (255, 255, 255), shadow=INK, shadow_off=(-off * 0.0, off))
    return im.resize((size, size), Image.LANCZOS)


def save(im, name, flatten=None):
    p = os.path.join(OUT, name)
    if flatten:
        bg = Image.new('RGB', im.size, flatten)
        bg.paste(im, mask=im.split()[3])
        im = bg
    im.save(p, optimize=True)
    print('wrote', os.path.relpath(p, ROOT), im.size)


def sadu_band(w, h):
    """شريط سدو (نفس نقشة --sadu-band بالـ CSS)."""
    tile_w, tile_h = 32, 14
    k = h / tile_h
    tw = tile_w * k
    im = Image.new('RGB', (w, h), SADU_DARK)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w, 2 * k], fill=SADU_RED)
    d.rectangle([0, h - 2 * k, w, h], fill=SADU_RED)
    x = 0.0
    while x < w:
        P = lambda px, py: (x + px * k, py * k)
        d.polygon([P(0, 11), P(8, 3), P(16, 11), P(24, 3), P(32, 11)], fill=SADU_GOLD)
        for cx in (8, 24):
            d.polygon([P(cx, 6.6), P(cx + 1.8, 8.6), P(cx, 10.6), P(cx - 1.8, 8.6)], fill=SADU_RED)
        d.polygon([P(16, 4.2), P(17.3, 5.6), P(16, 7), P(14.7, 5.6)], fill=SADU_CREAM)
        x += tw
    return im


def og():
    W, H = 1200, 630
    S = SS // 2
    im = Image.new('RGB', (W * S, H * S), BG)
    d = ImageDraw.Draw(im)
    # توهج وردي خفيف خلف العلامة
    glow = Image.new('RGB', im.size, BG)
    gd = ImageDraw.Draw(glow)
    cx, cy = int(W * S * 0.78), int(H * S * 0.46)
    gd.ellipse([cx - 330 * S, cy - 330 * S, cx + 330 * S, cy + 330 * S], fill=(70, 18, 44))
    glow = glow.filter(ImageFilter.GaussianBlur(120 * S))
    im = Image.blend(im, glow, 1.0)
    d = ImageDraw.Draw(im)
    # العلامة يمين (اتجاه القراءة)
    m = mark(300 * S)
    im.paste(m, (cx - m.width // 2, cy - m.height // 2), m)
    # النصوص يسار العلامة، محاذاة يمين
    right = int(W * S * 0.60)
    f_title = ImageFont.truetype(FONT_BOLD, 150 * S)
    f_tag = ImageFont.truetype(FONT_BOLD, 50 * S)
    f_sub = ImageFont.truetype(FONT_REG, 32 * S)

    def text_right(y, s, font, fill):
        t = ar(s)
        l, tt, r, b = d.textbbox((0, 0), t, font=font)
        d.text((right - r, y - tt), t, font=font, fill=fill)
        return b - tt

    y = 120 * S
    y += text_right(y, 'دحوم', f_title, TEXT) + 44 * S
    y += text_right(y, 'ألعاب الجمعة والسوالف', f_tag, BRAND) + 30 * S
    text_right(y, 'الشاشة للكل والجوال بيد كل لاعب', f_sub, MUTE)
    im = im.resize((W, H), Image.LANCZOS)
    band = sadu_band(W, 28)
    im.paste(band, (0, H - 28))
    p = os.path.join(OUT, 'og.png')
    im.save(p, optimize=True)
    print('wrote', os.path.relpath(p, ROOT), im.size)


if __name__ == '__main__':
    save(mark(512), 'icon-512.png')
    save(mark(192), 'icon-192.png')
    save(mark(32, radius_ratio=0.25, letter_scale=0.78), 'favicon-32.png')
    # maskable: لازم الخلفية تغطي كل المربع والحرف داخل منطقة الأمان (80%)
    save(mark(512, full_bleed=True, letter_scale=0.52), 'maskable-512.png')
    save(mark(192, full_bleed=True, letter_scale=0.52), 'maskable-192.png')
    # آبل تقص الزوايا بنفسها وما تقبل الشفافية
    save(mark(180, full_bleed=True, letter_scale=0.62), 'apple-touch-icon.png', flatten=BRAND)
    og()
