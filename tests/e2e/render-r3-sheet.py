#!/usr/bin/env python3
"""
R3 Ink-Wash Contact-Sheet Rasterizer & Visual Quality Verifier (Pillow 13.0.0).

Consumes exported JSON draw traces from tests/e2e/r3_inkwash.e2e.test.ts:
  1. 6chars_normal_vs_awakened.json  -> r3_6chars_normal_vs_awakened.png  (6x2)
  2. 18_skins.json                  -> r3_18_skins_sheet.png             (6x3)
  3. 8_enemies_normal_vs_elite.json -> r3_8_enemies_normal_vs_elite.png  (8x2)
  4. 12_bosses_p1_vs_p2.json        -> r3_12_bosses_p1_vs_p2.png         (6x4)

Always creates .nomedia in --out-dir, writes all 4 PNGs + r3_metrics.json, and
evaluates blank_cells, nan_cells, shadow_blur_cells, unbalanced_save_restore,
ink-wash luminance contrast spread, and pairwise MAE thresholds.
"""

import argparse
import colorsys
import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

HEX_RE = re.compile(r"^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
RGB_RE = re.compile(
    r"^rgba?\(\s*([0-9.+-]+)\s*,\s*([0-9.+-]+)\s*,\s*([0-9.+-]+)(?:\s*,\s*([0-9.+-]+))?\s*\)$",
    re.IGNORECASE,
)
HSL_RE = re.compile(
    r"^hsla?\(\s*([0-9.+-]+)\s*,\s*([0-9.+-]+)%\s*,\s*([0-9.+-]+)%(?:\s*,\s*([0-9.+-]+))?\s*\)$",
    re.IGNORECASE,
)


def parse_css_color(color_spec, global_alpha=1.0):
    """Parse #RGB, #RGBA, #RRGGBB, #RRGGBBAA, rgb(...), rgba(...), hsl(...), hsla(...) safely."""
    ga = max(0.0, min(1.0, float(global_alpha)))
    if isinstance(color_spec, dict) and color_spec.get("__gradient"):
        stops = color_spec.get("stops") or []
        if not stops:
            return (255, 255, 255, int(round(255 * ga)))
        best = stops[min(len(stops) - 1, len(stops) // 2)][1]
        for _, col in stops:
            _, _, _, a = parse_css_color(col, 1.0)
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

    m_hsl = HSL_RE.match(s)
    if m_hsl:
        h_deg = float(m_hsl.group(1)) % 360.0
        sat = max(0.0, min(1.0, float(m_hsl.group(2)) / 100.0))
        lit = max(0.0, min(1.0, float(m_hsl.group(3)) / 100.0))
        a_f = float(m_hsl.group(4)) if m_hsl.group(4) is not None else 1.0
        a_f = max(0.0, min(1.0, a_f))
        rf, gf, bf = colorsys.hls_to_rgb(h_deg / 360.0, lit, sat)
        return (
            int(round(rf * 255)),
            int(round(gf * 255)),
            int(round(bf * 255)),
            max(0, min(255, int(round(255.0 * a_f * ga)))),
        )

    named = {
        "white": (255, 255, 255),
        "black": (0, 0, 0),
        "red": (255, 0, 0),
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


def build_r3_cell_backdrop(width, height, floor_y):
    """Dark arena floor #0b0e16 backdrop matching Scarlet Sheath combat lane."""
    base = Image.new("RGBA", (width, height), (11, 14, 22, 255))
    draw = ImageDraw.Draw(base, "RGBA")
    for y in range(0, floor_y, 4):
        frac = y / max(1, floor_y - 1)
        r = int(11 + frac * 11)
        g = int(14 + frac * 14)
        b = int(22 + frac * 22)
        draw.rectangle([0, y, width, min(floor_y, y + 4)], fill=(r, g, b, 255))

    # Subtle mid-ground horizon atmospheric band (composited so base stays alpha=255)
    band_top = max(40, floor_y - 54)
    mist = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    mdraw = ImageDraw.Draw(mist, "RGBA")
    mdraw.rectangle([0, band_top, width, floor_y], fill=(24, 32, 50, 72))
    base = Image.alpha_composite(base, mist)
    draw = ImageDraw.Draw(base, "RGBA")

    # Dark arena floor #0b0e16
    draw.rectangle([0, floor_y, width, height], fill=(11, 14, 22, 255))
    draw.line([(0, floor_y), (width, floor_y)], fill=(71, 85, 105, 220), width=2)
    for x in range(0, width, 44):
        draw.line([(x, floor_y), (x - 18, height)], fill=(30, 41, 59, 105), width=1)
    draw.rectangle([0, 0, width - 1, height - 1], outline=(38, 48, 68, 210), width=1)
    return base


def composite_layer(base, layer, mode):
    if mode == "lighter":
        r, g, b, a = layer.split()
        pr = ImageChops.multiply(r, a)
        pg = ImageChops.multiply(g, a)
        pb = ImageChops.multiply(b, a)
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

    col_mid = sample_gradient_stops(stops, 0.55, ga)
    if rect_pts and len(rect_pts) >= 3:
        draw.polygon([tuple(p) for p in rect_pts], fill=col_mid)
    elif subpaths:
        for sp in subpaths:
            pts = sp.get("pts") or []
            if len(pts) >= 3:
                draw.polygon([tuple(p) for p in pts], fill=col_mid)
    return True


def has_non_finite_command(commands):
    for cmd in commands:
        for key in ("globalAlpha", "lineWidth", "x", "y", "fontSize"):
            v = cmd.get(key)
            if isinstance(v, (int, float)) and not math.isfinite(v):
                return True
        for pt in cmd.get("rectPts") or []:
            if not (math.isfinite(pt[0]) and math.isfinite(pt[1])):
                return True
        for sp in cmd.get("subpaths") or []:
            for pt in sp.get("pts") or []:
                if not (math.isfinite(pt[0]) and math.isfinite(pt[1])):
                    return True
    return False


def draw_dashed_polyline(draw, pts, dash, rgba, width):
    if not dash or len(dash) == 0 or len(pts) < 2:
        draw.line(pts, fill=rgba, width=width, joint="curve")
        return
    pattern = [max(1.0, float(d)) for d in dash]
    if len(pattern) % 2 == 1:
        pattern = pattern * 2
    pat_idx = 0
    pat_rem = pattern[0]
    drawing = True
    for i in range(len(pts) - 1):
        x0, y0 = pts[i]
        x1, y1 = pts[i + 1]
        seg_len = math.hypot(x1 - x0, y1 - y0)
        if seg_len < 1e-4:
            continue
        pos = 0.0
        while pos < seg_len:
            step = min(pat_rem, seg_len - pos)
            t0 = pos / seg_len
            t1 = (pos + step) / seg_len
            if drawing:
                ax = x0 + (x1 - x0) * t0
                ay = y0 + (y1 - y0) * t0
                bx = x0 + (x1 - x0) * t1
                by = y0 + (y1 - y0) * t1
                draw.line([(ax, ay), (bx, by)], fill=rgba, width=width)
            pos += step
            pat_rem -= step
            if pat_rem <= 1e-4:
                pat_idx = (pat_idx + 1) % len(pattern)
                pat_rem = pattern[pat_idx]
                drawing = not drawing


def rasterize_r3_cell(width, height, floor_y, commands, title, subtitle):
    base = build_r3_cell_backdrop(width, height, floor_y)
    coverage = Image.new("L", (width, height), 0)

    for cmd in commands:
        op = cmd.get("op")
        ga = float(cmd.get("globalAlpha", 1.0))
        if ga <= 0.002:
            continue
        comp = cmd.get("composite", "source-over")
        style = cmd.get("style")
        lw = max(1, int(round(float(cmd.get("lineWidth", 1.0)))))
        line_cap = cmd.get("lineCap", "butt")
        line_dash = cmd.get("lineDash")

        layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer, "RGBA")

        if op in ("fill", "fillRect") and isinstance(style, dict) and style.get("__gradient"):
            draw_gradient_fill(layer, cmd, cmd.get("subpaths"), cmd.get("rectPts"))
            coverage = ImageChops.lighter(coverage, layer.split()[3])
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
                draw_dashed_polyline(draw, closed, line_dash, rgba, lw)
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
                    draw_dashed_polyline(draw, tpts, line_dash, rgba, lw)
                    if line_cap == "round" and lw >= 3 and not line_dash:
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
            fsize = max(9, int(cmd.get("fontSize", 13)))
            font = ImageFont.load_default(size=fsize)
            draw.text((tx, ty), txt, fill=rgba, font=font, anchor="mm")

        coverage = ImageChops.lighter(coverage, layer.split()[3])
        base = composite_layer(base, layer, comp)

    # Header bar (y = 6..36)
    hdr_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(hdr_layer, "RGBA")
    hdraw.rectangle([6, 6, width - 6, 36], fill=(11, 15, 24, 222), outline=(71, 85, 105, 215), width=1)
    title_font = ImageFont.load_default(size=13)
    sub_font = ImageFont.load_default(size=10)
    hdraw.text((14, 21), title, fill=(248, 250, 252, 255), font=title_font, anchor="lm")
    hdraw.text((width - 14, 21), subtitle, fill=(148, 163, 184, 255), font=sub_font, anchor="rm")
    base = Image.alpha_composite(base, hdr_layer)
    return base, coverage


def compute_cell_metrics(img, bg_ref, coverage, header_crop_y=40):
    w, h = img.size
    c_img = img.crop((0, header_crop_y, w, h)).convert("RGB")
    c_bg = bg_ref.crop((0, header_crop_y, w, h)).convert("RGB")
    c_cov = coverage.crop((0, header_crop_y, w, h))

    diff = ImageChops.difference(c_img, c_bg)
    diff_px = diff.getdata()
    img_px = c_img.getdata()
    cov_px = c_cov.getdata()

    visible_active = 0
    entity_lumas = []
    for idx, (dr, dg, db) in enumerate(diff_px):
        if dr > 14 or dg > 14 or db > 14:
            visible_active += 1
        if cov_px[idx] > 20:
            r, g, b = img_px[idx]
            luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
            entity_lumas.append(luma)

    total_px = max(1, (h - header_crop_y) * w)
    non_bg_ratio = visible_active / total_px

    if not entity_lumas:
        return {
            "non_bg_ratio": round(non_bg_ratio, 4),
            "entity_pixels": 0,
            "p10_luma": 0.0,
            "p95_luma": 0.0,
            "luma_spread": 0.0,
            "dark_ink_ratio": 0.0,
            "bright_contrast_ratio": 0.0,
        }

    entity_lumas.sort()
    n = len(entity_lumas)
    p10 = entity_lumas[min(n - 1, int(0.10 * n))]
    p95 = entity_lumas[min(n - 1, int(0.95 * n))]
    dark_cnt = sum(1 for l in entity_lumas if l < 55.0)
    bright_cnt = sum(1 for l in entity_lumas if l >= 140.0)

    return {
        "non_bg_ratio": round(non_bg_ratio, 4),
        "entity_pixels": n,
        "p10_luma": round(p10, 2),
        "p95_luma": round(p95, 2),
        "luma_spread": round(p95 - p10, 2),
        "dark_ink_ratio": round(dark_cnt / n, 4),
        "bright_contrast_ratio": round(bright_cnt / n, 4),
    }


def compute_mae(img_a, img_b):
    diff = ImageChops.difference(img_a.convert("RGB"), img_b.convert("RGB"))
    hist = diff.histogram()
    total_px = img_a.size[0] * img_a.size[1]
    total_sum = 0
    for channel_offset in (0, 256, 512):
        for val in range(256):
            total_sum += val * hist[channel_offset + val]
    return total_sum / max(1, total_px * 3)


def process_sheet(json_path, out_png_path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    cols = int(data["cols"])
    rows = int(data["rows"])
    cell_w = int(data["width"])
    cell_h = int(data["height"])
    cells = data.get("cells") or []

    grid = Image.new("RGBA", (cell_w * cols, cell_h * rows), (11, 14, 22, 255))
    rendered = []
    blank_cells = []
    nan_cells = []
    shadow_blur_cells = []
    unbalanced_save_restore = []
    low_contrast_cells = []
    cell_metrics = {}

    for idx, item in enumerate(cells):
        key = str(item["key"])
        w = int(item.get("width", cell_w))
        h = int(item.get("height", cell_h))
        floor_y = int(item.get("floorY", int(round(h * 0.8))))
        commands = item.get("commands") or []

        if bool(item.get("nanDetected")) or has_non_finite_command(commands):
            nan_cells.append(key)
        if bool(item.get("shadowBlurUsed")):
            shadow_blur_cells.append(key)
        if int(item.get("saveCount", 0)) != int(item.get("restoreCount", 0)):
            unbalanced_save_restore.append(key)

        img, coverage = rasterize_r3_cell(
            w, h, floor_y, commands, item.get("title", key), item.get("subtitle", "")
        )
        bg_ref = build_r3_cell_backdrop(w, h, floor_y)
        cm = compute_cell_metrics(img, bg_ref, coverage, header_crop_y=40)
        cell_metrics[key] = cm

        if cm["non_bg_ratio"] <= 0.020 or len(commands) == 0:
            blank_cells.append(key)

        if cm["luma_spread"] < 110.0 or cm["dark_ink_ratio"] < 0.03 or cm["bright_contrast_ratio"] < 0.03:
            low_contrast_cells.append({
                "key": key,
                "luma_spread": cm["luma_spread"],
                "dark_ink_ratio": cm["dark_ink_ratio"],
                "bright_contrast_ratio": cm["bright_contrast_ratio"],
            })

        col = idx % cols
        row = idx // cols
        grid.paste(img, (col * cell_w, row * cell_h))
        rendered.append((item, img.crop((0, 40, w, h))))

    grid.save(out_png_path, "PNG")
    with Image.open(out_png_path) as chk:
        chk.verify()

    return {
        "png_path": str(out_png_path),
        "cell_count": len(cells),
        "blank_cells": blank_cells,
        "nan_cells": nan_cells,
        "shadow_blur_cells": shadow_blur_cells,
        "unbalanced_save_restore": unbalanced_save_restore,
        "low_contrast_cells": low_contrast_cells,
        "cell_metrics": cell_metrics,
        "rendered": rendered,
    }


def main():
    parser = argparse.ArgumentParser(description="Rasterize R3 Ink-Wash contact sheets with Pillow.")
    parser.add_argument("--input-dir", required=True, help="Directory containing R3 JSON trace files")
    parser.add_argument("--out-dir", required=True, help="Directory for PNG sheets and r3_metrics.json")
    args = parser.parse_args()

    in_dir = Path(args.input_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    nomedia = out_dir / ".nomedia"
    if not nomedia.exists():
        nomedia.write_text("", encoding="utf-8")

    sheets = [
        ("6chars", "6chars_normal_vs_awakened.json", "r3_6chars_normal_vs_awakened.png"),
        ("18skins", "18_skins.json", "r3_18_skins_sheet.png"),
        ("8enemies", "8_enemies_normal_vs_elite.json", "r3_8_enemies_normal_vs_elite.png"),
        ("12bosses", "12_bosses_p1_vs_p2.json", "r3_12_bosses_p1_vs_p2.png"),
    ]

    all_blank = []
    all_nan = []
    all_shadow = []
    all_unbalanced = []
    all_low_contrast = []
    sheet_summaries = {}
    rendered_by_sheet = {}

    for sid, json_name, png_name in sheets:
        jpath = in_dir / json_name
        ppath = out_dir / png_name
        res = process_sheet(jpath, ppath)
        all_blank.extend([f"{sid}:{k}" for k in res["blank_cells"]])
        all_nan.extend([f"{sid}:{k}" for k in res["nan_cells"]])
        all_shadow.extend([f"{sid}:{k}" for k in res["shadow_blur_cells"]])
        all_unbalanced.extend([f"{sid}:{k}" for k in res["unbalanced_save_restore"]])
        all_low_contrast.extend([{**lc, "sheet": sid} for lc in res["low_contrast_cells"]])
        sheet_summaries[sid] = {
            "png_path": res["png_path"],
            "cell_count": res["cell_count"],
            "blank_cells": res["blank_cells"],
            "low_contrast_count": len(res["low_contrast_cells"]),
            "cell_metrics": res["cell_metrics"],
        }
        rendered_by_sheet[sid] = res["rendered"]

    # Pairwise MAE checks
    low_mae_pairs = []

    def check_paired_variants(sid, var_a, var_b):
        by_group = {}
        for item, crop_img in rendered_by_sheet[sid]:
            grp = item["group"]
            by_group.setdefault(grp, {})[item["variant"]] = crop_img
        maes = {}
        for grp, vars_map in sorted(by_group.items()):
            mae = compute_mae(vars_map[var_a], vars_map[var_b])
            maes[grp] = round(mae, 4)
            if mae <= 1.2:
                low_mae_pairs.append({"sheet": sid, "group": grp, "pair": [var_a, var_b], "mae": round(mae, 4)})
        return maes

    normal_vs_awakened_mae = check_paired_variants("6chars", "normal", "awakened")
    normal_vs_elite_mae = check_paired_variants("8enemies", "normal", "elite")
    boss_p1_vs_p2_mae = check_paired_variants("12bosses", "phase1", "phase2")

    # Cross-boss distinction (among all 12 bosses in phase1 and phase2)
    bosses_p1 = [(item["group"], img) for item, img in rendered_by_sheet["12bosses"] if item["variant"] == "phase1"]
    boss_cross_min_mae = float("inf")
    boss_cross_min_pair = None
    for i in range(len(bosses_p1)):
        for j in range(i + 1, len(bosses_p1)):
            b1, im1 = bosses_p1[i]
            b2, im2 = bosses_p1[j]
            mae = compute_mae(im1, im2)
            if mae < boss_cross_min_mae:
                boss_cross_min_mae = mae
                boss_cross_min_pair = [b1, b2]
            if mae <= 1.2:
                low_mae_pairs.append({"sheet": "12bosses_cross_p1", "pair": [b1, b2], "mae": round(mae, 4)})

    # Cross-skin distinction (among all 18 skins)
    skins_18 = [(item["key"], img) for item, img in rendered_by_sheet["18skins"]]
    skins_cross_min_mae = float("inf")
    skins_cross_min_pair = None
    for i in range(len(skins_18)):
        for j in range(i + 1, len(skins_18)):
            s1, im1 = skins_18[i]
            s2, im2 = skins_18[j]
            mae = compute_mae(im1, im2)
            if mae < skins_cross_min_mae:
                skins_cross_min_mae = mae
                skins_cross_min_pair = [s1, s2]
            if mae <= 1.2:
                low_mae_pairs.append({"sheet": "18skins_cross", "pair": [s1, s2], "mae": round(mae, 4)})

    ok = (
        len(all_blank) == 0
        and len(all_nan) == 0
        and len(all_shadow) == 0
        and len(all_unbalanced) == 0
        and len(all_low_contrast) == 0
        and len(low_mae_pairs) == 0
    )

    report = {
        "ok": ok,
        "blank_cells": all_blank,
        "nan_cells": all_nan,
        "shadow_blur_cells": all_shadow,
        "unbalanced_save_restore": all_unbalanced,
        "low_contrast_cells": all_low_contrast,
        "low_mae_pairs": low_mae_pairs,
        "pairwise_mae": {
            "normal_vs_awakened": normal_vs_awakened_mae,
            "normal_vs_elite": normal_vs_elite_mae,
            "boss_p1_vs_p2": boss_p1_vs_p2_mae,
            "bosses_cross_p1_min": round(boss_cross_min_mae, 4),
            "bosses_cross_p1_min_pair": boss_cross_min_pair,
            "skins_18_cross_min": round(skins_cross_min_mae, 4),
            "skins_18_cross_min_pair": skins_cross_min_pair,
        },
        "sheets": sheet_summaries,
    }

    metrics_path = out_dir / "r3_metrics.json"
    metrics_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "sheets"}))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
