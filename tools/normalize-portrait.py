#!/usr/bin/env python3
"""
Normalize standalone portrait art into project-ready PNGs.

This tool intentionally uses only the Python standard library so it can run in
the current workspace without Pillow/ImageMagick.
"""

from __future__ import annotations

import argparse
import copy
import json
import math
import os
import struct
import sys
import zlib


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

PRESETS = {
    "npc_dig": {
        "canvas": [446, 264],
        "padding": [0, 0, 0, 0],
        "fit_mode": "contain",
        "align": ["center", "bottom"],
        "trim_alpha": True,
        "alpha_threshold": 1,
        "cut": [0, 0, 0, 0],
        "scale": 1.0,
        "offset": [0, 0],
        "background": [0, 0, 0, 0],
        "preview_box_color": [64, 220, 120, 255]
    },
    "npc_map": {
        "canvas": [56, 56],
        "padding": [2, 2, 2, 2],
        "fit_mode": "cover",
        "align": ["center", "top"],
        "trim_alpha": True,
        "alpha_threshold": 1,
        "cut": [0, 0, 0, 0],
        "scale": 1.0,
        "offset": [0, 0],
        "background": [0, 0, 0, 0],
        "preview_box_color": [64, 220, 120, 255]
    }
}


class ImageData(object):
    def __init__(self, width, height, pixels):
        self.width = int(width)
        self.height = int(height)
        self.pixels = bytearray(pixels)

    def clone(self):
        return ImageData(self.width, self.height, bytearray(self.pixels))


def clamp(value, min_value, max_value):
    return max(min_value, min(max_value, value))


def ensure_dir(path):
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def parse_int_list(text, expected_len=None, name="value"):
    if text is None:
        return None
    parts = [part.strip() for part in str(text).split(",")]
    if expected_len is not None and len(parts) != expected_len:
        raise ValueError("%s expects %d comma-separated values" % (name, expected_len))
    values = [int(float(part)) for part in parts]
    return values


def parse_float_list(text, expected_len=None, name="value"):
    if text is None:
        return None
    parts = [part.strip() for part in str(text).split(",")]
    if expected_len is not None and len(parts) != expected_len:
        raise ValueError("%s expects %d comma-separated values" % (name, expected_len))
    return [float(part) for part in parts]


def parse_align(text):
    if text is None:
        return None
    parts = [part.strip().lower() for part in text.split(",")]
    if len(parts) != 2:
        raise ValueError("align expects two values like center,bottom")
    return parts


def png_crc(chunk_type, chunk_data):
    return zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF


def make_chunk(chunk_type, chunk_data):
    return (
        struct.pack(">I", len(chunk_data))
        + chunk_type
        + chunk_data
        + struct.pack(">I", png_crc(chunk_type, chunk_data))
    )


def paeth_predictor(a, b, c):
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def unfilter_scanline(filter_type, scanline, previous, bytes_per_pixel):
    result = bytearray(scanline)
    if filter_type == 0:
        return result
    if filter_type == 1:
        for index in range(len(result)):
            left = result[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            result[index] = (result[index] + left) & 0xFF
        return result
    if filter_type == 2:
        for index in range(len(result)):
            up = previous[index] if previous else 0
            result[index] = (result[index] + up) & 0xFF
        return result
    if filter_type == 3:
        for index in range(len(result)):
            left = result[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            up = previous[index] if previous else 0
            result[index] = (result[index] + ((left + up) // 2)) & 0xFF
        return result
    if filter_type == 4:
        for index in range(len(result)):
            left = result[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            up = previous[index] if previous else 0
            up_left = previous[index - bytes_per_pixel] if previous and index >= bytes_per_pixel else 0
            result[index] = (result[index] + paeth_predictor(left, up, up_left)) & 0xFF
        return result
    raise ValueError("Unsupported PNG filter type: %s" % filter_type)


def load_png(path):
    with open(path, "rb") as handle:
        data = handle.read()

    if data[:8] != PNG_SIGNATURE:
        raise ValueError("Not a PNG file: %s" % path)

    offset = 8
    width = None
    height = None
    bit_depth = None
    color_type = None
    interlace = None
    idat_parts = []

    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        chunk_type = data[offset + 4:offset + 8]
        chunk_data = data[offset + 8:offset + 8 + length]
        offset += 12 + length

        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", chunk_data)
        elif chunk_type == b"IDAT":
            idat_parts.append(chunk_data)
        elif chunk_type == b"IEND":
            break

    if width is None or height is None:
        raise ValueError("PNG missing IHDR: %s" % path)
    if bit_depth != 8:
        raise ValueError("Only 8-bit PNGs are supported: %s" % path)
    if interlace != 0:
        raise ValueError("Interlaced PNGs are not supported: %s" % path)
    if color_type not in (2, 6):
        raise ValueError("Only RGB/RGBA PNGs are supported: %s" % path)

    raw = zlib.decompress(b"".join(idat_parts))
    bytes_per_pixel = 4 if color_type == 6 else 3
    stride = width * bytes_per_pixel
    expected = (stride + 1) * height
    if len(raw) != expected:
        raise ValueError("Unexpected decoded PNG length for %s" % path)

    rgba = bytearray(width * height * 4)
    previous = bytearray(stride)
    src_offset = 0
    dst_offset = 0

    for _ in range(height):
        filter_type = raw[src_offset]
        src_offset += 1
        scanline = raw[src_offset:src_offset + stride]
        src_offset += stride
        unfiltered = unfilter_scanline(filter_type, scanline, previous, bytes_per_pixel)
        previous = unfiltered

        if color_type == 6:
            rgba[dst_offset:dst_offset + width * 4] = unfiltered
        else:
            for index in range(width):
                base = index * 3
                rgba[dst_offset + index * 4 + 0] = unfiltered[base + 0]
                rgba[dst_offset + index * 4 + 1] = unfiltered[base + 1]
                rgba[dst_offset + index * 4 + 2] = unfiltered[base + 2]
                rgba[dst_offset + index * 4 + 3] = 255
        dst_offset += width * 4

    return ImageData(width, height, rgba)


def save_png(path, image):
    ensure_dir(path)
    scanline_stride = image.width * 4
    raw = bytearray()
    for row in range(image.height):
        raw.append(0)
        start = row * scanline_stride
        raw.extend(image.pixels[start:start + scanline_stride])

    compressed = zlib.compress(bytes(raw), 9)
    ihdr = struct.pack(">IIBBBBB", image.width, image.height, 8, 6, 0, 0, 0)
    payload = bytearray()
    payload.extend(PNG_SIGNATURE)
    payload.extend(make_chunk(b"IHDR", ihdr))
    payload.extend(make_chunk(b"IDAT", compressed))
    payload.extend(make_chunk(b"IEND", b""))

    with open(path, "wb") as handle:
        handle.write(payload)


def alpha_bounds(image, threshold):
    min_x = image.width
    min_y = image.height
    max_x = -1
    max_y = -1

    for y in range(image.height):
        row_base = y * image.width * 4
        for x in range(image.width):
            alpha = image.pixels[row_base + x * 4 + 3]
            if alpha >= threshold:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < min_x or max_y < min_y:
        return [0, 0, image.width, image.height]
    return [min_x, min_y, max_x - min_x + 1, max_y - min_y + 1]


def crop_image(image, rect):
    x, y, width, height = [int(value) for value in rect]
    x = clamp(x, 0, image.width)
    y = clamp(y, 0, image.height)
    width = clamp(width, 0, image.width - x)
    height = clamp(height, 0, image.height - y)
    if width <= 0 or height <= 0:
        raise ValueError("Crop produced an empty image")

    cropped = bytearray(width * height * 4)
    for row in range(height):
        src_start = ((y + row) * image.width + x) * 4
        src_end = src_start + width * 4
        dst_start = row * width * 4
        cropped[dst_start:dst_start + width * 4] = image.pixels[src_start:src_end]
    return ImageData(width, height, cropped)


def cut_image_edges(image, edges):
    left, top, right, bottom = [max(0, int(value)) for value in edges]
    width = image.width - left - right
    height = image.height - top - bottom
    return crop_image(image, [left, top, width, height])


def resize_image(image, target_width, target_height):
    target_width = int(target_width)
    target_height = int(target_height)
    if target_width <= 0 or target_height <= 0:
        raise ValueError("Resize target must be positive")
    if target_width == image.width and target_height == image.height:
        return image.clone()

    result = bytearray(target_width * target_height * 4)
    src_w = image.width
    src_h = image.height

    for y in range(target_height):
        src_y = ((y + 0.5) * src_h / target_height) - 0.5
        y0 = clamp(int(math.floor(src_y)), 0, src_h - 1)
        y1 = clamp(y0 + 1, 0, src_h - 1)
        ty = max(0.0, min(1.0, src_y - y0))

        for x in range(target_width):
            src_x = ((x + 0.5) * src_w / target_width) - 0.5
            x0 = clamp(int(math.floor(src_x)), 0, src_w - 1)
            x1 = clamp(x0 + 1, 0, src_w - 1)
            tx = max(0.0, min(1.0, src_x - x0))

            for channel in range(4):
                p00 = image.pixels[(y0 * src_w + x0) * 4 + channel]
                p10 = image.pixels[(y0 * src_w + x1) * 4 + channel]
                p01 = image.pixels[(y1 * src_w + x0) * 4 + channel]
                p11 = image.pixels[(y1 * src_w + x1) * 4 + channel]
                top_value = p00 + (p10 - p00) * tx
                bottom_value = p01 + (p11 - p01) * tx
                value = int(round(top_value + (bottom_value - top_value) * ty))
                result[(y * target_width + x) * 4 + channel] = clamp(value, 0, 255)

    return ImageData(target_width, target_height, result)


def create_canvas(width, height, background):
    r, g, b, a = [clamp(int(value), 0, 255) for value in background]
    pixels = bytearray(width * height * 4)
    for index in range(width * height):
        base = index * 4
        pixels[base + 0] = r
        pixels[base + 1] = g
        pixels[base + 2] = b
        pixels[base + 3] = a
    return ImageData(width, height, pixels)


def blend_over(dst_rgba, src_rgba):
    sr, sg, sb, sa = src_rgba
    dr, dg, db, da = dst_rgba
    if sa <= 0:
        return [dr, dg, db, da]
    src_alpha = sa / 255.0
    dst_alpha = da / 255.0
    out_alpha = src_alpha + dst_alpha * (1.0 - src_alpha)
    if out_alpha <= 0:
        return [0, 0, 0, 0]

    def blend_channel(src_channel, dst_channel):
        return int(round(((src_channel * src_alpha) + (dst_channel * dst_alpha * (1.0 - src_alpha))) / out_alpha))

    return [
        clamp(blend_channel(sr, dr), 0, 255),
        clamp(blend_channel(sg, dg), 0, 255),
        clamp(blend_channel(sb, db), 0, 255),
        clamp(int(round(out_alpha * 255.0)), 0, 255)
    ]


def composite_image(canvas, subject, x, y):
    placed = canvas.clone()
    for sy in range(subject.height):
        dy = y + sy
        if dy < 0 or dy >= placed.height:
            continue
        for sx in range(subject.width):
            dx = x + sx
            if dx < 0 or dx >= placed.width:
                continue
            src_base = (sy * subject.width + sx) * 4
            dst_base = (dy * placed.width + dx) * 4
            src_rgba = subject.pixels[src_base:src_base + 4]
            dst_rgba = placed.pixels[dst_base:dst_base + 4]
            blended = blend_over(dst_rgba, src_rgba)
            placed.pixels[dst_base:dst_base + 4] = bytearray(blended)
    return placed


def draw_rect_outline(image, rect, color):
    x, y, width, height = rect
    if width <= 0 or height <= 0:
        return image
    outlined = image.clone()
    r, g, b, a = [clamp(int(value), 0, 255) for value in color]
    points = []
    for px in range(x, x + width):
        points.append((px, y))
        points.append((px, y + height - 1))
    for py in range(y, y + height):
        points.append((x, py))
        points.append((x + width - 1, py))
    for px, py in points:
        if 0 <= px < outlined.width and 0 <= py < outlined.height:
            base = (py * outlined.width + px) * 4
            outlined.pixels[base:base + 4] = bytearray([r, g, b, a])
    return outlined


def get_fit_box(spec):
    canvas_width, canvas_height = spec["canvas"]
    if spec.get("fit_box"):
        x, y, width, height = [int(value) for value in spec["fit_box"]]
        return [x, y, width, height]

    left, top, right, bottom = [int(value) for value in spec.get("padding", [0, 0, 0, 0])]
    return [
        left,
        top,
        max(1, canvas_width - left - right),
        max(1, canvas_height - top - bottom)
    ]


def compute_aligned_position(box, subject_width, subject_height, align, offset):
    box_x, box_y, box_width, box_height = box
    align_x, align_y = align
    offset_x, offset_y = [int(value) for value in offset]

    if align_x == "left":
        x = box_x
    elif align_x == "right":
        x = box_x + box_width - subject_width
    else:
        x = box_x + int(round((box_width - subject_width) / 2.0))

    if align_y == "top":
        y = box_y
    elif align_y == "bottom":
        y = box_y + box_height - subject_height
    else:
        y = box_y + int(round((box_height - subject_height) / 2.0))

    return [x + offset_x, y + offset_y]


def apply_pipeline(source_image, spec):
    working = source_image.clone()
    report = {
        "source_size": [source_image.width, source_image.height],
        "steps": []
    }

    if spec.get("trim_alpha", False):
        bounds = alpha_bounds(working, int(spec.get("alpha_threshold", 1)))
        report["trim_bounds"] = bounds
        working = crop_image(working, bounds)
        report["steps"].append({"trim_alpha": bounds})

    if spec.get("crop"):
        working = crop_image(working, spec["crop"])
        report["steps"].append({"crop": spec["crop"]})

    if spec.get("cut"):
        working = cut_image_edges(working, spec["cut"])
        report["steps"].append({"cut": spec["cut"]})

    fit_box = get_fit_box(spec)
    fit_mode = spec.get("fit_mode", "contain")
    scale_multiplier = float(spec.get("scale", 1.0))
    if working.width <= 0 or working.height <= 0:
        raise ValueError("Image became empty after trimming/cropping")

    scale_x = float(fit_box[2]) / float(working.width)
    scale_y = float(fit_box[3]) / float(working.height)
    scale = max(scale_x, scale_y) if fit_mode == "cover" else min(scale_x, scale_y)
    scale *= scale_multiplier
    scaled_width = max(1, int(round(working.width * scale)))
    scaled_height = max(1, int(round(working.height * scale)))
    working = resize_image(working, scaled_width, scaled_height)
    report["scaled_size"] = [working.width, working.height]
    report["fit_box"] = fit_box

    canvas = create_canvas(spec["canvas"][0], spec["canvas"][1], spec.get("background", [0, 0, 0, 0]))
    position = compute_aligned_position(fit_box, working.width, working.height, spec.get("align", ["center", "center"]), spec.get("offset", [0, 0]))
    report["position"] = position
    composited = composite_image(canvas, working, position[0], position[1])

    preview = None
    if spec.get("preview"):
        preview = draw_rect_outline(composited, fit_box, spec.get("preview_box_color", [64, 220, 120, 255]))

    return composited, preview, report


def merge_spec(preset_name=None, overrides=None):
    spec = {}
    if preset_name:
        if preset_name not in PRESETS:
            raise ValueError("Unknown preset: %s" % preset_name)
        spec.update(copy.deepcopy(PRESETS[preset_name]))
    if overrides:
        for key, value in overrides.items():
            if value is not None:
                spec[key] = value
    if "canvas" not in spec:
        raise ValueError("Spec is missing canvas dimensions")
    if "align" not in spec:
        spec["align"] = ["center", "center"]
    return spec


def inspect_image(image, threshold):
    return {
        "size": [image.width, image.height],
        "alpha_bounds": alpha_bounds(image, threshold)
    }


def load_batch_config(path):
    with open(path, "r", encoding="utf-8") as handle:
        config = json.load(handle)
    if "source" not in config:
        raise ValueError("Batch config is missing source")
    if "outputs" not in config or not isinstance(config["outputs"], list) or len(config["outputs"]) == 0:
        raise ValueError("Batch config must contain a non-empty outputs list")
    return config


def run_inspect(args):
    image = load_png(args.input)
    result = inspect_image(image, args.alpha_threshold)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("size: %dx%d" % (result["size"][0], result["size"][1]))
        print("alpha_bounds: %s" % ",".join(str(value) for value in result["alpha_bounds"]))


def build_cli_spec(args):
    overrides = {
        "canvas": parse_int_list(args.canvas, 2, "canvas") if args.canvas else None,
        "fit_box": parse_int_list(args.fit_box, 4, "fit_box") if args.fit_box else None,
        "padding": parse_int_list(args.padding, 4, "padding") if args.padding else None,
        "crop": parse_int_list(args.crop, 4, "crop") if args.crop else None,
        "cut": parse_int_list(args.cut, 4, "cut") if args.cut else None,
        "align": parse_align(args.align) if args.align else None,
        "offset": parse_int_list(args.offset, 2, "offset") if args.offset else None,
        "background": parse_int_list(args.background, 4, "background") if args.background else None,
        "preview_box_color": parse_int_list(args.preview_box_color, 4, "preview_box_color") if args.preview_box_color else None,
        "trim_alpha": args.trim_alpha,
        "alpha_threshold": args.alpha_threshold,
        "fit_mode": args.fit_mode,
        "scale": args.scale,
        "preview": args.preview
    }
    return merge_spec(args.preset, overrides)


def write_normalized_output(source_path, output_path, spec):
    source_image = load_png(source_path)
    normalized, preview, report = apply_pipeline(source_image, spec)
    save_png(output_path, normalized)
    if spec.get("preview") and preview is not None:
        save_png(spec["preview"], preview)
    return report


def run_normalize(args):
    spec = build_cli_spec(args)
    report = write_normalized_output(args.input, args.output, spec)
    print(json.dumps(report, ensure_ascii=False, indent=2))


def run_batch(args):
    config = load_batch_config(args.config)
    source_path = config["source"]
    for entry in config["outputs"]:
        name = entry.get("name") or os.path.basename(entry["output"])
        spec = merge_spec(entry.get("preset"), entry)
        report = write_normalized_output(source_path, entry["output"], spec)
        print(json.dumps({
            "name": name,
            "output": entry["output"],
            "report": report
        }, ensure_ascii=False, indent=2))


def build_parser():
    parser = argparse.ArgumentParser(
        description="Normalize standalone portrait PNGs into project-ready portrait/map icon outputs."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    inspect_parser = subparsers.add_parser("inspect", help="Inspect PNG dimensions and non-transparent bounds.")
    inspect_parser.add_argument("input", help="Source PNG path")
    inspect_parser.add_argument("--alpha-threshold", type=int, default=1, help="Alpha threshold used for visible bounds")
    inspect_parser.add_argument("--json", action="store_true", help="Print JSON instead of human-readable output")
    inspect_parser.set_defaults(func=run_inspect)

    normalize_parser = subparsers.add_parser("normalize", help="Normalize a single PNG with a preset and overrides.")
    normalize_parser.add_argument("--input", required=True, help="Source PNG path")
    normalize_parser.add_argument("--output", required=True, help="Output PNG path")
    normalize_parser.add_argument("--preset", choices=sorted(PRESETS.keys()), default="npc_dig", help="Preset name")
    normalize_parser.add_argument("--canvas", help="Override canvas size, e.g. 446,264")
    normalize_parser.add_argument("--fit-box", help="Override fit box x,y,w,h")
    normalize_parser.add_argument("--padding", help="Override padding left,top,right,bottom")
    normalize_parser.add_argument("--crop", help="Crop x,y,w,h before fitting")
    normalize_parser.add_argument("--cut", help="Trim extra edges left,top,right,bottom after crop/alpha trim")
    normalize_parser.add_argument("--align", help="Placement align, e.g. center,bottom")
    normalize_parser.add_argument("--offset", help="Placement offset x,y")
    normalize_parser.add_argument("--background", help="Background RGBA, e.g. 0,0,0,0")
    normalize_parser.add_argument("--preview", help="Optional preview output path with fit box guide")
    normalize_parser.add_argument("--preview-box-color", help="Guide color RGBA, e.g. 64,220,120,255")
    normalize_parser.add_argument("--trim-alpha", action="store_true", default=None, help="Crop transparent borders before fitting")
    normalize_parser.add_argument("--alpha-threshold", type=int, default=None, help="Alpha threshold used for trim-alpha")
    normalize_parser.add_argument("--fit-mode", choices=["contain", "cover"], default=None, help="How the trimmed image fits inside the box")
    normalize_parser.add_argument("--scale", type=float, default=None, help="Extra scale multiplier after fit")
    normalize_parser.set_defaults(func=run_normalize)

    batch_parser = subparsers.add_parser("batch", help="Run multiple normalized outputs from a JSON config.")
    batch_parser.add_argument("config", help="JSON config path")
    batch_parser.set_defaults(func=run_batch)

    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except Exception as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
