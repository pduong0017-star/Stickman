#!/usr/bin/env python3
"""
Headless Canvas2D Draw-Trace -> PNG Rasterizer & Pixel Distinctness Verifier
Uses Pillow 13.0.0 with custom CSS color parser (rgba/rgb/#RRGGBBAA/#RRGGBB),
linear/radial gradient approximation, and additive ('lighter') compositing.
"""

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

HEX_RE = re.compile(r"^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
RGB_RE = re.compile(
    r"^rgba?\(\s*([0-9.+-]+)\s*,\s*([0-9.+-]+)\s*,\s*([0-9.+-]+)(?:\s*,\s*([0-9.+-]+))?\s*\)$",
    re.IGNORECASE,
)


def parse_css_color(color_spec, global_alpha=1.0):
    """Parse #RGB, #RGBA, #RRGGBB, #RRGGBBAA, rgb(...), rgba(...) safely."""
    ga = max(0.0, min(1.0, float(global_alpha)))
    if isinstance(color_spec, dict) and color_spec.get("__gradient"):
        stops = color_spec.get("stops") or []
        if not stops:
            return (255, 255, 255, int(round(255 * ga)))
        # Pick highest-alpha / most representative middle-to-bright stop
        best = stops[min(len(stops) - 1, len(stops) // 2)][1]
        for _, col in stops:
            r, g, b, a = parse_css_color(col, 1.0)
            if a > 20:
                best = col
                if a >= 120:
                    break
        return parse_css_color(best, ga)

    if not isinstance(color_spec, str):
        return (255, 255, 255, int(round(255 * ga)))

    s = color_spec.strip()
    m_hex = HEX_RE.match(s)
    if m_hex:
        h = m_hex.group(1)
        if len(h) in (3, 4):
            r = int(h[0] * 2, 16)
            g = int(h[1] * 2, 16)
            b = int(h[2] * 2, 16)
            a = int(h[3] * 2, 16) if len(h) == 4 else 255
        elif len(h) == 6:
            r = int(h[0:2], 16)
            g = int(h[2:4], 16)
            b = int(h[4:6], 16)
            a = 255
        else:
            r = int(h[0:2], 16)
            g = int(h[2:4], 16)
            b = int(h[4:6], 16)
            a = int(h[6:8], 16)
        return (r, g, b, max(0, min(255, int(round(a * ga)))))

    m_rgb = RGB_RE.match(s)
    if m_rgb:
        r = max(0, min(255, int(round(float(m_rgb.group(1))))))
        g = max(0, min(255, int(round(float(m_rgb.group(2))))))
        b = max(0, min(255, int(round(float(m_rgb.group(3))))))
        a_f = float(m_rgb.group(4)) if m_rgb.group(4) is not None else 1.0
        a_f = max(0.0, min(1.0, a_f))
        return (r, g, b, max(0, min(255, int(round(255.0 * a_f * ga)))))

    named = {
        "white": (255, 255, 255),
        "black": (0, 0, 0),
        "transparent": (0, 0, 0),
    }
    low = s.lower()
    if low == "transparent":
        return (0, 0, 0, 0)
    if low in named:
        r, g, b = named[low]
        return (r, g, b, int(round(255 * ga)))
    return (255, 255, 255, int(round(255 * ga)))


def lerp_rgba(c0, c1, t):
    t = max(0.0, min(1.0, t))
    return (
        int(round(c0[0] + (c1[0] - c0[0]) * t)),
        int(round(c0[1] + (c1[1] - c0[1]) * t)),
        int(round(c0[2] + (c1[2] - c0[2]) * t)),
        int(round(c0[3] + (c1[3] - c0[3]) * t)),
    )


def sample_gradient_stops(stops, t, global_alpha):
    if not stops:
        return (255, 255, 255, int(round(255 * global_alpha)))
    parsed = [(float(off), parse_css_color(col, global_alpha)) for off, col in stops]
    parsed.sort(key=lambda item: item[0])
    if t <= parsed[0][0]:
        return parsed[0][1]
    if t >= parsed[-1][0]:
        return parsed[-1][1]
    for idx in range(len(parsed) - 1):
        o0, c0 = parsed[idx]
        o1, c1 = parsed[idx + 1]
        if o0 <= t <= o1:
            span = max(1e-6, o1 - o0)
            return lerp_rgba(c0, c1, (t - o0) / span)
    return parsed[-1][1]


def build_stage_backdrop(width, height):
    base = Image.new("RGBA", (width, height), (9, 11, 16, 255))
    draw = ImageDraw.Draw(base, "RGBA")
    # Subtle vertical sky gradient
    for y in range(0, height, 4):
        frac = y / max(1, height - 1)
        r = int(9 + frac * 9)
        g = int(11 + frac * 13)
        b = int(16 + frac * 22)
        draw.rectangle([0, y, width, min(height, y + 4)], fill=(r, g, b, 255))
    # Stage floor band at y=345
    floor_y = 345
    draw.rectangle([0, floor_y, width, height], fill=(14, 19, 30, 255))
    draw.line([(0, floor_y), (width, floor_y)], fill=(56, 72, 102, 220), width=2)
    for x in range(0, width, 48):
        draw.line([(x, floor_y), (x - 24, height)], fill=(30, 41, 59, 120), width=1)
    return base


def composite_layer(base, layer, mode):
    if mode == "lighter":
        # Premultiply layer RGB by its alpha, then add cleanly onto base
        r, g, b, a = layer.split()
        a_norm = a
        pr = ImageChops.multiply(r, a_norm)
        pg = ImageChops.multiply(g, a_norm)
        pb = ImageChops.multiply(b, a_norm)
        full_alpha = Image.new("L", layer.size, 0)
        glow_rgba = Image.merge("RGBA", (pr, pg, pb, full_alpha))
        return ImageChops.add(base, glow_rgba)
    return Image.alpha_composite(base, layer)


def draw_gradient_fill(layer, cmd, subpaths, rect_pts):
    style = cmd.get("style")
    ga = float(cmd.get("globalAlpha", 1.0))
    draw = ImageDraw.Draw(layer, "RGBA")
    if not isinstance(style, dict) or not style.get("__gradient"):
        return False

    stops = style.get("stops") or []
    kind = style.get("kind", "linear")
    if kind == "radial":
        cx = float(style.get("x1", 0))
        cy = float(style.get("y1", 0))
        r_outer = max(2.0, float(style.get("r1", 40)))
        r_inner = max(0.0, float(style.get("r0", 0)))
        rings = 10
        for step in range(rings, 0, -1):
            frac = step / rings
            rad = r_inner + (r_outer - r_inner) * frac
            col = sample_gradient_stops(stops, frac, ga * (1.0 / rings * 2.2))
            if col[3] <= 0:
                continue
            draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=col)
        return True

    # Linear gradient: draw polygon clipped via alpha mask or representative solid/layered fill
    col_mid = sample_gradient_stops(stops, 0.55, ga)
    if rect_pts and len(rect_pts) >= 3:
        draw.polygon([tuple(p) for p in rect_pts], fill=col_mid)
    elif subpaths:
        for sp in subpaths:
            pts = sp.get("pts") or []
            if len(pts) >= 3:
                draw.polygon([tuple(p) for p in pts], fill=col_mid)
    return True


def rasterize_commands(width, height, commands, title, subtitle, motif):
    base = build_stage_backdrop(width, height)

    for cmd in commands:
        op = cmd.get("op")
        ga = float(cmd.get("globalAlpha", 1.0))
        if ga <= 0.002:
            continue
        comp = cmd.get("composite", "source-over")
        style = cmd.get("style")
        lw = max(1, int(round(float(cmd.get("lineWidth", 1.0)))))
        line_cap = cmd.get("lineCap", "butt")

        layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer, "RGBA")

        if op in ("fill", "fillRect") and isinstance(style, dict) and style.get("__gradient"):
            draw_gradient_fill(layer, cmd, cmd.get("subpaths"), cmd.get("rectPts"))
            base = composite_layer(base, layer, comp)
            continue

        rgba = parse_css_color(style, ga)
        if rgba[3] <= 0:
            continue

        if op == "fillRect":
            pts = cmd.get("rectPts") or []
            if len(pts) >= 3:
                draw.polygon([tuple(p) for p in pts], fill=rgba)
        elif op == "strokeRect":
            pts = cmd.get("rectPts") or []
            if len(pts) >= 3:
                closed = [tuple(p) for p in pts] + [tuple(pts[0])]
                draw.line(closed, fill=rgba, width=lw)
        elif op == "fill":
            for sp in cmd.get("subpaths") or []:
                pts = sp.get("pts") or []
                if len(pts) >= 3:
                    draw.polygon([tuple(p) for p in pts], fill=rgba)
        elif op == "stroke":
            for sp in cmd.get("subpaths") or []:
                pts = sp.get("pts") or []
                if len(pts) >= 2:
                    tpts = [tuple(p) for p in pts]
                    draw.line(tpts, fill=rgba, width=lw, joint="curve")
                    if line_cap == "round" and lw >= 3:
                        rad = lw * 0.45
                        for end_pt in (tpts[0], tpts[-1]):
                            draw.ellipse(
                                [end_pt[0] - rad, end_pt[1] - rad, end_pt[0] + rad, end_pt[1] + rad],
                                fill=rgba,
                            )
        elif op in ("fillText", "strokeText"):
            txt = str(cmd.get("text", ""))
            tx = float(cmd.get("x", 0))
            ty = float(cmd.get("y", 0))
            fsize = max(10, int(cmd.get("fontSize", 16)))
            font = ImageFont.load_default(size=fsize)
            draw.text((tx, ty), txt, fill=rgba, font=font, anchor="mm")

        base = composite_layer(base, layer, comp)

    # Crisp label header badge (outside slash area, top-left)
    hdr_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(hdr_layer, "RGBA")
    hdraw.rectangle([12, 12, width - 12, 54], fill=(11, 15, 24, 210), outline=(71, 85, 105, 220), width=1)
    title_font = ImageFont.load_default(size=18)
    sub_font = ImageFont.load_default(size=13)
    hdraw.text((24, 20), title, fill=(248, 250, 252, 255), font=title_font)
    hdraw.text((width - 24, 24), f"{subtitle} [{motif}]", fill=(148, 163, 184, 255), font=sub_font, anchor="ra")
    base = Image.alpha_composite(base, hdr_layer)
    return base


def compute_non_bg_ratio(img, bg_ref):
    diff = ImageChops.difference(img.convert("RGB"), bg_ref.convert("RGB"))
    # Sum RGB diffs and count pixels with channel max diff > 14
    px = diff.getdata()
    active = 0
    slash_active = 0
    w, h = img.size
    for idx, (dr, dg, db) in enumerate(px):
        if dr > 14 or dg > 14 or db > 14:
            active += 1
            x = idx % w
            y = idx // w
            if x >= 270 and 120 <= y <= 410:
                slash_active += 1
    return active / max(1, w * h), slash_active


def compute_mae(img_a, img_b):
    diff = ImageChops.difference(img_a.convert("RGB"), img_b.convert("RGB"))
    hist = diff.histogram()
    total_px = img_a.size[0] * img_a.size[1]
    total_sum = 0
    for channel_offset in (0, 256, 512):
        for val in range(256):
            total_sum += val * hist[channel_offset + val]
    return total_sum / max(1, total_px * 3)


def slugify_filename(index, key):
    clean = key.replace(":", "_")
    return f"skin_{index:02d}_{clean}.png"


def main():
    parser = argparse.ArgumentParser(description="Rasterize 12-skin Stickman draw traces with Pillow.")
    parser.add_argument("--input", required=True, help="Path to JSON traces file")
    parser.add_argument("--out-dir", required=True, help="Directory for rendered PNGs and metrics JSON")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    nomedia = out_dir / ".nomedia"
    if not nomedia.exists():
        nomedia.write_text("", encoding="utf-8")

    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    skins = data.get("skins") or []
    if len(skins) != 12:
        print(json.dumps({"ok": False, "error": f"Expected 12 skins, got {len(skins)}"}))
        return 1

    rendered_images = []
    non_bg_ratios = {}
    slash_zone_pixels = {}
    output_files = []

    for item in skins:
        idx = int(item["index"])
        key = str(item["key"])
        w = int(item.get("width", 720))
        h = int(item.get("height", 480))
        img = rasterize_commands(
            w,
            h,
            item.get("commands") or [],
            item.get("title", key),
            item.get("subtitle", ""),
            item.get("motif", ""),
        )
        fname = slugify_filename(idx, key)
        fpath = out_dir / fname
        img.save(fpath, "PNG")

        # Verify PNG readability
        with Image.open(fpath) as chk:
            chk.verify()

        bg_ref = build_stage_backdrop(w, h)
        # Mask out header bar from bg comparison by comparing against backdrop+header
        ratio, slash_px = compute_non_bg_ratio(img, bg_ref)
        non_bg_ratios[key] = round(ratio, 4)
        slash_zone_pixels[key] = slash_px
        rendered_images.append((key, img))
        output_files.append(str(fpath))

    # Build 4x3 contact sheet grid (2880x1440)
    cell_w = rendered_images[0][1].size[0]
    cell_h = rendered_images[0][1].size[1]
    grid = Image.new("RGBA", (cell_w * 4, cell_h * 3), (9, 11, 16, 255))
    for i, (_, img) in enumerate(rendered_images):
        col = i % 4
        row = i // 4
        grid.paste(img, (col * cell_w, row * cell_h))
    grid_path = out_dir / "all_12_skins_grid.png"
    grid.save(grid_path, "PNG")
    with Image.open(grid_path) as chk_grid:
        chk_grid.verify()

    # Pairwise MAE across all 66 pairs (cropping top header row y>=60 so header text doesn't inflate MAE)
    cropped = [(k, im.crop((0, 60, im.size[0], im.size[1]))) for k, im in rendered_images]
    min_mae = float("inf")
    min_pair = None
    duplicate_pairs = []
    for i in range(len(cropped)):
        for j in range(i + 1, len(cropped)):
            k1, im1 = cropped[i]
            k2, im2 = cropped[j]
            mae = compute_mae(im1, im2)
            if mae < min_mae:
                min_mae = mae
                min_pair = [k1, k2]
            if mae <= 1.5:
                duplicate_pairs.append({"pair": [k1, k2], "mae": round(mae, 4)})

    blank_skins = [k for k, r in non_bg_ratios.items() if r <= 0.05]
    ok = (len(blank_skins) == 0) and (len(duplicate_pairs) == 0) and (min_mae > 1.5)

    report = {
        "ok": ok,
        "skin_count": len(rendered_images),
        "grid_path": str(grid_path),
        "output_files": output_files,
        "non_bg_ratios": non_bg_ratios,
        "slash_zone_pixels": slash_zone_pixels,
        "blank_skins": blank_skins,
        "pairwise_pairs_checked": len(cropped) * (len(cropped) - 1) // 2,
        "pairwise_mae_min": round(min_mae, 4),
        "min_mae_pair": min_pair,
        "duplicate_pairs": duplicate_pairs,
    }
    metrics_path = out_dir / "render_metrics.json"
    metrics_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
