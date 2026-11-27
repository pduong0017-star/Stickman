#!/usr/bin/env python3
"""
Headless 5x7 Stickman Pose Sheet Rasterizer & Visual Distinctness Verifier.
Reuses the Pillow 13.0.0 CSS color parser, gradient approximation, and additive
('lighter') compositing pipeline from render-skins.py without modifying it.
"""

import argparse
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


def parse_css_color(color_spec, global_alpha=1.0):
    """Parse #RGB, #RGBA, #RRGGBB, #RRGGBBAA, rgb(...), rgba(...) safely."""
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


def build_pose_cell_backdrop(width, height, floor_y):
    base = Image.new("RGBA", (width, height), (9, 11, 16, 255))
    draw = ImageDraw.Draw(base, "RGBA")
    for y in range(0, height, 4):
        frac = y / max(1, height - 1)
        r = int(9 + frac * 9)
        g = int(11 + frac * 13)
        b = int(16 + frac * 22)
        draw.rectangle([0, y, width, min(height, y + 4)], fill=(r, g, b, 255))

    # Subtle vertical reference line at fighter anchor x=width*0.47
    anchor_x = int(round(width * 0.47))
    draw.line([(anchor_x, 40), (anchor_x, floor_y)], fill=(30, 41, 59, 130), width=1)

    # Ground floor band & crisp baseline
    draw.rectangle([0, floor_y, width, height], fill=(14, 19, 30, 255))
    draw.line([(0, floor_y), (width, floor_y)], fill=(71, 85, 105, 235), width=2)
    for x in range(0, width, 40):
        draw.line([(x, floor_y), (x - 16, height)], fill=(30, 41, 59, 115), width=1)
    # Subtle cell border
    draw.rectangle([0, 0, width - 1, height - 1], outline=(30, 41, 59, 200), width=1)
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


def rasterize_pose_cell(width, height, floor_y, commands, title):
    base = build_pose_cell_backdrop(width, height, floor_y)

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
            fsize = max(10, int(cmd.get("fontSize", 14)))
            font = ImageFont.load_default(size=fsize)
            draw.text((tx, ty), txt, fill=rgba, font=font, anchor="mm")

        base = composite_layer(base, layer, comp)

    # Header bar (y = 6..34)
    hdr_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(hdr_layer, "RGBA")
    hdraw.rectangle([8, 6, width - 8, 34], fill=(11, 15, 24, 215), outline=(71, 85, 105, 210), width=1)
    title_font = ImageFont.load_default(size=14)
    hdraw.text((width // 2, 20), title, fill=(248, 250, 252, 255), font=title_font, anchor="mm")
    base = Image.alpha_composite(base, hdr_layer)
    return base


def compute_non_bg_ratio(img, bg_ref, header_crop_y=40):
    c_img = img.crop((0, header_crop_y, img.size[0], img.size[1])).convert("RGB")
    c_bg = bg_ref.crop((0, header_crop_y, bg_ref.size[0], bg_ref.size[1])).convert("RGB")
    diff = ImageChops.difference(c_img, c_bg)
    px = diff.getdata()
    active = 0
    for dr, dg, db in px:
        if dr > 14 or dg > 14 or db > 14:
            active += 1
    w, h = c_img.size
    return active / max(1, w * h)


def compute_mae(img_a, img_b):
    diff = ImageChops.difference(img_a.convert("RGB"), img_b.convert("RGB"))
    hist = diff.histogram()
    total_px = img_a.size[0] * img_a.size[1]
    total_sum = 0
    for channel_offset in (0, 256, 512):
        for val in range(256):
            total_sum += val * hist[channel_offset + val]
    return total_sum / max(1, total_px * 3)


def main():
    parser = argparse.ArgumentParser(description="Rasterize 5x7 Stickman pose sheet with Pillow.")
    parser.add_argument("--input", required=True, help="Path to pose traces JSON file")
    parser.add_argument("--out-dir", required=True, help="Directory for rendered PNGs and pose_metrics.json")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    nomedia = out_dir / ".nomedia"
    if not nomedia.exists():
        nomedia.write_text("", encoding="utf-8")

    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    characters = data.get("characters") or []
    poses = data.get("poses") or []
    cells = data.get("cells") or []
    expected_count = len(characters) * len(poses)

    if len(characters) != 5 or len(poses) != 7 or len(cells) != expected_count:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": f"Expected 5x7=35 pose cells, got {len(characters)}x{len(poses)} ({len(cells)} cells)",
                }
            )
        )
        return 1

    cell_w = int(data.get("width", 320))
    cell_h = int(data.get("height", 260))

    rendered_by_char = {c: {} for c in characters}
    non_bg_ratios = {}
    blank_cells = []
    nan_cells = []

    for item in cells:
        char_id = str(item["characterId"])
        pose = str(item["pose"])
        key = f"{char_id}:{pose}"
        w = int(item.get("width", cell_w))
        h = int(item.get("height", cell_h))
        floor_y = int(item.get("floorY", int(round(h * 0.79))))
        commands = item.get("commands") or []

        if bool(item.get("nanDetected")) or has_non_finite_command(commands):
            nan_cells.append(key)

        img = rasterize_pose_cell(w, h, floor_y, commands, item.get("title", key))
        bg_ref = build_pose_cell_backdrop(w, h, floor_y)
        ratio = compute_non_bg_ratio(img, bg_ref, header_crop_y=40)
        non_bg_ratios[key] = round(ratio, 4)
        if ratio <= 0.012:
            blank_cells.append(key)

        if char_id in rendered_by_char:
            rendered_by_char[char_id][pose] = img

    # Write per-character strips (7 x cell_w x cell_h) & unified 5x7 contact sheet
    strip_paths = []
    grid = Image.new("RGBA", (cell_w * len(poses), cell_h * len(characters)), (9, 11, 16, 255))

    for row_idx, char_id in enumerate(characters):
        strip = Image.new("RGBA", (cell_w * len(poses), cell_h), (9, 11, 16, 255))
        for col_idx, pose in enumerate(poses):
            cell_img = rendered_by_char[char_id][pose]
            strip.paste(cell_img, (col_idx * cell_w, 0))
            grid.paste(cell_img, (col_idx * cell_w, row_idx * cell_h))
        strip_path = out_dir / f"poses_{char_id}.png"
        strip.save(strip_path, "PNG")
        with Image.open(strip_path) as chk:
            chk.verify()
        strip_paths.append(str(strip_path))

    grid_path = out_dir / "all_5_chars_poses_grid.png"
    grid.save(grid_path, "PNG")
    with Image.open(grid_path) as chk_grid:
        chk_grid.verify()

    # Intra-character pose-to-pose MAE (cropping y>=40 so header labels do not affect MAE)
    intra_char_mae = {}
    low_diff_pairs = []
    global_min_mae = float("inf")

    for char_id in characters:
        cropped_poses = [
            (p, rendered_by_char[char_id][p].crop((0, 40, cell_w, cell_h)))
            for p in poses
        ]
        char_min = float("inf")
        char_min_pair = None
        pairs_checked = 0
        for i in range(len(cropped_poses)):
            for j in range(i + 1, len(cropped_poses)):
                p1, im1 = cropped_poses[i]
                p2, im2 = cropped_poses[j]
                mae = compute_mae(im1, im2)
                pairs_checked += 1
                if mae < char_min:
                    char_min = mae
                    char_min_pair = [p1, p2]
                if mae < global_min_mae:
                    global_min_mae = mae
                if mae <= 1.0:
                    low_diff_pairs.append(
                        {"characterId": char_id, "pair": [p1, p2], "mae": round(mae, 4)}
                    )
        intra_char_mae[char_id] = {
            "min_mae": round(char_min, 4),
            "min_pair": char_min_pair,
            "pairs_checked": pairs_checked,
        }

    ok = (
        len(blank_cells) == 0
        and len(nan_cells) == 0
        and len(low_diff_pairs) == 0
        and global_min_mae > 1.0
    )

    report = {
        "ok": ok,
        "cell_count": len(cells),
        "grid_path": str(grid_path),
        "strip_paths": strip_paths,
        "blank_cells": blank_cells,
        "nan_cells": nan_cells,
        "non_bg_ratios": non_bg_ratios,
        "intra_char_mae": intra_char_mae,
        "min_intra_mae": round(global_min_mae, 4),
        "low_diff_pairs": low_diff_pairs,
    }

    metrics_path = out_dir / "pose_metrics.json"
    metrics_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
