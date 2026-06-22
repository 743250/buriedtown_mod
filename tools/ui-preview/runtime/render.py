#!/usr/bin/env python3
"""
tools/ui-preview/runtime/render.py

Reads a JSON scene tree produced by `dump-topframe.js` (or any stub-driven
dumper) and renders it to a PNG. Geometry is in Cocos2d-JS conventions
(origin bottom-left, anchor point per node). The renderer:
  - resolves world positions by walking the tree
  - flips Y so PIL's top-left origin matches what players see on the device
  - looks up sprite frames from `assets/res/<dir>/<name>.png` (standalone PNGs
    only — atlas .plist/.pvr.ccz frames are drawn as labeled placeholders)
  - draws labels using NotoSansCJK so Chinese strings show correctly

Usage:
  python3 tools/ui-preview/runtime/render.py \
      --in tools/ui-preview/dist/runtime_topframe.json \
      --out tools/ui-preview/dist/snap_runtime_topframe.png
"""

import argparse
import json
import os
import re
import struct
import zlib
import plistlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageMath

REPO = Path(__file__).resolve().parents[3]
ASSET_DIRS = [
    REPO / "assets" / "res" / "ui",
    REPO / "assets" / "res" / "medal",
    REPO / "assets" / "res" / "icon",
    REPO / "assets" / "res" / "npc",
    REPO / "assets" / "res" / "site",
    REPO / "assets" / "res" / "home",
    REPO / "assets" / "res" / "build",
    REPO / "assets" / "res" / "dig_build",
    REPO / "assets" / "res" / "dig_item",
    REPO / "assets" / "res" / "dig_monster",
    REPO / "assets" / "res" / "dig_work",
    REPO / "assets" / "res" / "gate",
    REPO / "assets" / "res" / "map",
    REPO / "assets" / "res" / "menu",
    REPO / "assets" / "res" / "rank",
    REPO / "assets" / "res" / "end",
    REPO / "assets" / "res" / "day",
    REPO / "assets" / "res" / "day2",
    REPO / "assets" / "res" / "weather",
    REPO / "assets" / "res",
]
ATLAS_PLIST_DIRS = [
    REPO / "assets" / "res",
]
# When the in-tree .pvr.ccz is encrypted (CCZp magic), we fall back to the
# unencrypted originals shipped under T版游戏assets/.
ATLAS_FALLBACK_DIRS = [
    REPO / "T版游戏assets" / "assets" / "res",
]
FONT_PATH = "/system/fonts/NotoSansCJK-Regular.ttc"

# Atlas caches
_ATLAS_INDEX = None       # {sprite_name: plist_path_str}
_ATLAS_FRAMES = {}        # {plist_path_str: {sprite_name: frame_dict}}
_ATLAS_IMAGE = {}         # {plist_path_str: PIL.Image RGBA or None}
_ATLAS_FRAME_CACHE = {}   # {sprite_name: PIL.Image (upright)}

# Persistent atlas image cache directory
ATLAS_CACHE_DIR = Path(__file__).parent / ".atlas-cache"


def _parse_cocos_nums(s):
    return [int(n) for n in re.findall(r"-?\d+", s)]


def _decode_pvr_v2(data):
    if len(data) < 52:
        raise ValueError("PVR data too short")
    hdr = struct.unpack("<13I", data[:52])
    height, width = hdr[1], hdr[2]
    flags = hdr[4]
    bpp = hdr[6]
    pf = flags & 0xff
    pix_count = width * height
    if pf == 0x12:  # RGBA8888
        pixels = data[52:52 + pix_count * 4]
        return Image.frombytes("RGBA", (width, height), pixels)
    if pf == 0x10:  # RGBA4444 (little-endian 16bpp)
        pixels = data[52:52 + pix_count * 2]
        out = bytearray(pix_count * 4)
        for i in range(pix_count):
            v = pixels[i * 2] | (pixels[i * 2 + 1] << 8)
            out[i*4:i*4+4] = bytes([
                ((v >> 12) & 0x0f) * 17,
                ((v >> 8) & 0x0f) * 17,
                ((v >> 4) & 0x0f) * 17,
                (v & 0x0f) * 17
            ])
        return Image.frombytes("RGBA", (width, height), bytes(out))
    if pf == 0x11:  # RGBA5551 (LE 16bpp)
        pixels = data[52:52 + pix_count * 2]
        out = bytearray(pix_count * 4)
        for i in range(pix_count):
            v = pixels[i * 2] | (pixels[i * 2 + 1] << 8)
            r = ((v >> 11) & 0x1f) * 255 // 31
            g = ((v >> 6) & 0x1f) * 255 // 31
            b = ((v >> 1) & 0x1f) * 255 // 31
            a = 255 if (v & 1) else 0
            out[i*4:i*4+4] = bytes([r, g, b, a])
        return Image.frombytes("RGBA", (width, height), bytes(out))
    if pf == 0x14:  # RGB565
        pixels = data[52:52 + pix_count * 2]
        return Image.frombytes("RGB", (width, height), pixels, "raw", "BGR;16").convert("RGBA")
    raise ValueError("unsupported PVR pixel format 0x%02x" % pf)


def _load_atlas_image_for_plist(plist_path):
    key = str(plist_path)
    if key in _ATLAS_IMAGE:
        return _ATLAS_IMAGE[key]
    plist_path = Path(plist_path)
    base = plist_path.with_suffix("")

    # Try persistent disk cache first
    cache_name = base.name + ".png"
    cache_path = ATLAS_CACHE_DIR / cache_name
    if cache_path.exists():
        try:
            img = Image.open(cache_path).convert("RGBA")
            _ATLAS_IMAGE[key] = img
            return img
        except Exception:
            pass

    candidates = [base.with_suffix(".png"), base.with_suffix(".pvr.ccz")]
    # T版 fallback: same atlas name in fallback dirs
    for fb in ATLAS_FALLBACK_DIRS:
        candidates.append(fb / (base.name + ".png"))
        candidates.append(fb / (base.name + ".pvr.ccz"))
    img = None
    for c in candidates:
        if not c.exists():
            continue
        try:
            if c.suffix == ".png":
                img = Image.open(c).convert("RGBA")
                break
            # .pvr.ccz
            with open(c, "rb") as fh:
                raw = fh.read()
            if raw[:4] != b"CCZ!":
                # Encrypted (CCZp) atlases need the game's key — skip.
                continue
            pvr = zlib.decompress(raw[16:])
            img = _decode_pvr_v2(pvr)
            break
        except Exception:
            continue

    # Write to disk cache for future runs
    if img is not None:
        try:
            ATLAS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
            img.save(str(cache_path), "PNG")
        except Exception:
            pass

    _ATLAS_IMAGE[key] = img
    return img


def _build_atlas_index():
    global _ATLAS_INDEX
    if _ATLAS_INDEX is not None:
        return _ATLAS_INDEX
    _ATLAS_INDEX = {}
    for d in ATLAS_PLIST_DIRS:
        if not d.exists():
            continue
        for plist_path in sorted(d.glob("*.plist")):
            try:
                with open(plist_path, "rb") as fh:
                    pl = plistlib.load(fh)
            except Exception:
                continue
            frames = pl.get("frames") or {}
            _ATLAS_FRAMES[str(plist_path)] = frames
            for name in frames:
                _ATLAS_INDEX.setdefault(name, str(plist_path))
    return _ATLAS_INDEX


def find_atlas_frame(name):
    """Return an upright PIL.Image for `name` if it lives in any atlas, else None."""
    if not name:
        return None
    name = name.lstrip("#")
    if name in _ATLAS_FRAME_CACHE:
        return _ATLAS_FRAME_CACHE[name]
    idx = _build_atlas_index()
    plist_path = idx.get(name)
    if not plist_path:
        return None
    fdef = _ATLAS_FRAMES[plist_path].get(name)
    if not fdef:
        return None
    atlas = _load_atlas_image_for_plist(plist_path)
    if atlas is None:
        return None
    fr = _parse_cocos_nums(fdef.get("frame", ""))   # x, y, w, h (source dims)
    if len(fr) < 4:
        return None
    x, y, w, h = fr[:4]
    rotated = bool(fdef.get("rotated"))
    if rotated:
        # In-atlas region is (h, w); rotate 270° to get upright.
        crop = atlas.crop((x, y, x + h, y + w)).transpose(Image.ROTATE_270)
    else:
        crop = atlas.crop((x, y, x + w, y + h))
    _ATLAS_FRAME_CACHE[name] = crop
    return crop


def find_atlas_frame_meta(name):
    """Return dict with the atlas frame metadata for `name`, else None.
    Keys: source_size (w,h), source_color_rect (x,y,w,h), offset (dx,dy),
    frame_size (w,h) — i.e., the trim rect size in atlas (==
    sourceColorRect.size when present)."""
    if not name:
        return None
    key = name.lstrip("#")
    idx = _build_atlas_index()
    plist_path = idx.get(key)
    if not plist_path:
        return None
    fdef = _ATLAS_FRAMES[plist_path].get(key)
    if not fdef:
        return None
    fr = _parse_cocos_nums(fdef.get("frame", ""))  # x y w h in atlas
    ss = _parse_cocos_nums(fdef.get("sourceSize", ""))
    off = _parse_cocos_nums(fdef.get("offset", ""))
    scr = _parse_cocos_nums(fdef.get("sourceColorRect", ""))
    rotated = bool(fdef.get("rotated"))
    if len(fr) < 4 or len(ss) < 2:
        return None
    # frame_size: trim rect dimensions (rotated frames store w/h swapped)
    if rotated:
        fw, fh = fr[3], fr[2]
    else:
        fw, fh = fr[2], fr[3]
    if len(scr) < 4:
        # Fall back: derive sourceColorRect from offset + frame size
        # Cocos: offset = (origin_x + fw/2 - ss_w/2, origin_y + fh/2 - ss_h/2)
        # where origin is sourceColorRect.origin in source-image coords (top-left convention).
        ox = (off[0] if len(off) >= 1 else 0) + (ss[0] - fw) / 2.0
        oy = (off[1] if len(off) >= 2 else 0) + (ss[1] - fh) / 2.0
        scr = [ox, oy, fw, fh]
    return {
        "source_size": (ss[0], ss[1]),
        "source_color_rect": (scr[0], scr[1], scr[2], scr[3]),
        "offset": (off[0] if len(off) >= 1 else 0, off[1] if len(off) >= 2 else 0),
        "frame_size": (fw, fh),
    }


def load_font(size):
    try:
        return ImageFont.truetype(FONT_PATH, size)
    except Exception:
        return ImageFont.load_default()


def wrap_text_for_width(text, font, max_width):
    text = str(text or "")
    if not max_width or max_width <= 0:
        return text.splitlines() or [text]
    lines = []
    for paragraph in text.splitlines() or [""]:
        current = ""
        for ch in paragraph:
            candidate = current + ch
            try:
                width = font.getlength(candidate)
            except Exception:
                width = len(candidate) * font.size * 0.6
            if current and width > max_width:
                lines.append(current)
                current = ch
            else:
                current = candidate
        lines.append(current)
    return lines


def premul_resize(im, size, resample=Image.LANCZOS):
    """Resize an RGBA image using premultiplied alpha so transparent
    pixels do not bleed bright RGB values into the visible edges.

    Steps:
      1. Multiply R/G/B by (A/255).
      2. Resize the premultiplied RGBA.
      3. Divide R/G/B by (A/255) to recover straight alpha.

    This matches what real GPU samplers do; PIL's default LANCZOS on
    straight-alpha RGBA produces white/halo fringes around trimmed sprites
    (visible as "bright edges" on icons and avatars).
    """
    if im.mode != "RGBA":
        return im.resize(size, resample)
    r, g, b, a = im.split()
    # ImageMath returns 'I' (int32); convert each premultiplied channel back to L.
    rp = ImageMath.eval("convert((r * a + 127) / 255, 'L')", r=r, a=a)
    gp = ImageMath.eval("convert((g * a + 127) / 255, 'L')", g=g, a=a)
    bp = ImageMath.eval("convert((b * a + 127) / 255, 'L')", b=b, a=a)
    pm = Image.merge("RGBA", (rp, gp, bp, a))
    pm_resized = pm.resize(size, resample)
    rr, gg, bb, aa = pm_resized.split()
    # Un-premultiply only where alpha > 0; ImageMath handles zero by short-circuit.
    ru = ImageMath.eval(
        "convert(255 * r / max(a, 1), 'L')", r=rr, a=aa
    )
    gu = ImageMath.eval(
        "convert(255 * g / max(a, 1), 'L')", g=gg, a=aa
    )
    bu = ImageMath.eval(
        "convert(255 * b / max(a, 1), 'L')", b=bb, a=aa
    )
    return Image.merge("RGBA", (ru, gu, bu, aa))


def rgba_tuple(c, default=(255, 255, 255, 255)):
    if not c:
        return default
    return (
        int(c.get("r", default[0])),
        int(c.get("g", default[1])),
        int(c.get("b", default[2])),
        int(c.get("a", default[3])),
    )


def find_sprite(name):
    if not name:
        return None
    name = name.lstrip("#")
    direct_candidates = [
        REPO / name,
        REPO / "assets" / name,
        REPO / "assets" / "res" / name,
        REPO / "assets" / "res" / re.sub(r"^(res/|assets/res/)", "", name),
    ]
    for p in direct_candidates:
        if p.exists():
            return p
    for d in ASSET_DIRS:
        p = d / name
        if p.exists():
            return p
        p = d / Path(name).name
        if p.exists():
            return p
    return None


_SPRITE_SIZE_CACHE = {}


def real_sprite_size(name):
    """Return (w, h) for a sprite frame. Prefer atlas frame size (trim-aware,
    matches Cocos cc.Sprite contentSize semantics), fall back to standalone
    PNG size only when the frame is not in any atlas."""
    if not name:
        return None
    key = name.lstrip("#")
    if key in _SPRITE_SIZE_CACHE:
        return _SPRITE_SIZE_CACHE[key]
    result = None
    frame = find_atlas_frame(key)
    if frame is not None:
        result = (frame.width, frame.height)
    if result is None:
        p = find_sprite(key)
        if p:
            try:
                with Image.open(p) as im:
                    result = (im.width, im.height)
            except Exception:
                result = None
    _SPRITE_SIZE_CACHE[key] = result
    return result


def cocos_to_image(x_bl, y_bl, w, h, win_h):
    """Given a node's bottom-left in cocos coords + content size, return
    the rectangle in PIL image coords (top-left origin)."""
    top = win_h - (y_bl + h)
    return (x_bl, top, x_bl + w, top + h)


def intersect_rect(a, b):
    if not a:
        return b
    if not b:
        return a
    x1 = max(a[0], b[0])
    y1 = max(a[1], b[1])
    x2 = min(a[2], b[2])
    y2 = min(a[3], b[3])
    if x2 <= x1 or y2 <= y1:
        return None
    return (x1, y1, x2, y2)


def collect_render_ops(node, parent_origin_x, parent_origin_y, parent_scale, win_h, ops, clip_rect=None):
    """Walk the tree, computing each node's world bottom-left + content size,
    and appending a render op (type, geometry, payload) per renderable node."""
    if not node.get("visible", True):
        return
    sx = node.get("scaleX", 1) or 1
    sy = node.get("scaleY", 1) or 1
    eff_sx = parent_scale[0] * sx
    eff_sy = parent_scale[1] * sy

    w = (node.get("width") or 0) * eff_sx
    h = (node.get("height") or 0) * eff_sy
    ax = 0 if node.get("ignoreAnchor") else node.get("anchorX", 0)
    ay = 0 if node.get("ignoreAnchor") else node.get("anchorY", 0)

    # Sprite: if the game code did not explicitly setContentSize, use the real
    # sprite frame size so the rendered geometry matches what players see.
    kind = node.get("kind")
    sprite_name = node.get("spriteFrameName")
    if kind in ("Sprite", "Scale9Sprite") and sprite_name and not node.get("explicitSize"):
        real_size = real_sprite_size(sprite_name)
        if real_size:
            w = real_size[0] * eff_sx
            h = real_size[1] * eff_sy

    # Label: if no explicit dimensions, use real font metrics instead of the
    # stub's character-width estimate so the anchor math is accurate.
    text_str = node.get("text")
    font_size = node.get("fontSize") or 16
    dims = node.get("dimensions") or {}
    if kind == "Label" and text_str and not node.get("explicitSize") and not dims.get("width"):
        fs = max(8, int(font_size * max(eff_sx, eff_sy)))
        font = load_font(fs)
        try:
            real_w = font.getlength(str(text_str))
        except Exception:
            real_w = 0
        if real_w > 0:
            w = real_w
        line_h = max(fs + 2, int(fs * 1.25))
        h = line_h

    # node anchor world position
    world_anchor_x = parent_origin_x + (node.get("x") or 0) * parent_scale[0]
    world_anchor_y = parent_origin_y + (node.get("y") or 0) * parent_scale[1]

    # bottom-left in cocos coords
    bl_x = world_anchor_x - w * ax
    bl_y = world_anchor_y - h * ay

    name = node.get("name") or ""
    sprite = node.get("spriteFrameName")
    text = text_str
    color = node.get("color") or {"r": 255, "g": 255, "b": 255, "a": 255}

    # Schedule rendering
    if kind in ("Sprite", "Scale9Sprite") and sprite:
        ops.append(("sprite", (bl_x, bl_y, w, h), {
            "name": sprite,
            "node": name,
            "clip": clip_rect,
        }))
    elif kind in ("Label",):
        ops.append(("label", (bl_x, bl_y, w, h), {
            "text": text or "",
            "font_size": int(font_size * max(eff_sx, eff_sy)),
            "color": color,
            "anchor_x": ax,
            "anchor_y": ay,
            "world_anchor_x": world_anchor_x,
            "world_anchor_y": world_anchor_y,
            "dimensions": node.get("dimensions"),
            "hAlignment": node.get("hAlignment", 0),
            "vAlignment": node.get("vAlignment", 0),
            "stroke": node.get("stroke"),
            "clip": clip_rect,
        }))
    elif kind == "LayerColor":
        ops.append(("rect_filled", (bl_x, bl_y, w, h), {
            "color": color,
            "label": name or "LayerColor",
            "opacity": node.get("opacity", 255),
            "clip": clip_rect,
        }))
    elif kind in ("StatusButton", "AttrButton", "ButtonWithPressed",
                  "ButtonInScrollView", "Button", "DialogBig", "LogView",
                  "Node"):
        if w > 0 and h > 0:
            ops.append(("rect_outline", (bl_x, bl_y, w, h), {
                "label": "%s:%s" % (kind, name) if name else kind,
                "kind": kind,
                "clip": clip_rect,
            }))

    # Children: their parent_origin is this node's bottom-left in cocos
    children = node.get("children") or []
    # Sort children by zOrder so higher zOrder draws later
    children = sorted(children, key=lambda c: c.get("zOrder") or 0)
    child_clip = clip_rect
    if kind in ("ScrollView", "TableView", "CCTableView", "CCScrollView") and w > 0 and h > 0:
        own_clip = (bl_x, bl_y, bl_x + w, bl_y + h)
        child_clip = intersect_rect(clip_rect, own_clip) if clip_rect else own_clip
    for child in children:
        collect_render_ops(child, bl_x, bl_y, (eff_sx, eff_sy), win_h, ops, child_clip)


def render(scene_payload, out_path, annotate=False, debug_outline=False, player_view=False):
    win = scene_payload.get("winSize") or {"width": 640, "height": 1136}
    win_w = int(win["width"])
    win_h = int(win["height"])

    img = Image.new("RGBA", (win_w, win_h), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    draw.rectangle((0, 0, win_w - 1, win_h - 1), outline=(180, 180, 180, 255), width=2)

    ops = []
    collect_render_ops(scene_payload["scene"], 0, 0, (1, 1), win_h, ops)

    placeholder_count = {"sprite_missing": 0}

    for op_type, geom, payload in ops:
        x_bl, y_bl, w, h = geom
        if w <= 0 and h <= 0 and op_type not in ("label",):
            continue
        clip = payload.get("clip")
        clip_img = None
        if clip:
            clip_img = cocos_to_image(clip[0], clip[1], clip[2] - clip[0], clip[3] - clip[1], win_h)

        if op_type == "sprite":
            rect = cocos_to_image(x_bl, y_bl, w if w > 0 else 56, h if h > 0 else 56, win_h)
            visible_rect = intersect_rect(rect, clip_img) if clip_img else rect
            if visible_rect is None:
                continue
            target_w = max(1, int(rect[2] - rect[0]))
            target_h = max(1, int(rect[3] - rect[1]))
            spr = None
            # The exported node rect is authoritative for preview layout.
            # Atlas sourceColorRect is already reflected in the game-created node
            # size/scale; applying it again here makes trimmed frames render as
            # narrow slivers, especially npc_dig_* portraits.
            atlas_meta = None
            spr = find_atlas_frame(payload["name"])
            if spr is None:
                spr_path = find_sprite(payload["name"])
                if spr_path:
                    try:
                        spr = Image.open(spr_path).convert("RGBA")
                    except Exception:
                        spr = None
            if spr is not None:
                try:
                    # When we have atlas metadata, place the trim image inside
                    # the contentSize rect according to sourceColorRect. Cocos
                    # draws the trim rect at its position within sourceSize,
                    # scaled by (target / sourceSize). The remainder of the
                    # contentSize stays transparent — this is the key reason
                    # over-large sourceSize sprites don't actually paint over
                    # neighbors on real devices.
                    placed = False
                    if atlas_meta is not None:
                        ss_w, ss_h = atlas_meta["source_size"]
                        scr_x, scr_y, scr_w, scr_h = atlas_meta["source_color_rect"]
                        fw, fh = atlas_meta["frame_size"]
                        if ss_w > 0 and ss_h > 0 and scr_w > 0 and scr_h > 0 and fw > 0 and fh > 0:
                            kx = target_w / float(ss_w)
                            ky = target_h / float(ss_h)
                            inner_w = max(1, int(round(scr_w * kx)))
                            inner_h = max(1, int(round(scr_h * ky)))
                            # sourceColorRect uses top-left origin in source-image coords;
                            # rect is in image coords (top-left origin too).
                            inner_x = int(rect[0] + scr_x * kx)
                            inner_y = int(rect[1] + scr_y * ky)
                            try:
                                # Atlas frame size may differ slightly from
                                # sourceColorRect size; resize trim image to
                                # the scaled sourceColorRect.
                                trim_img = premul_resize(spr, (inner_w, inner_h), Image.LANCZOS)
                            except Exception:
                                trim_img = None
                            if trim_img is not None:
                                inner_rect = (inner_x, inner_y, inner_x + inner_w, inner_y + inner_h)
                                vis = intersect_rect(inner_rect, clip_img) if clip_img else inner_rect
                                if vis is not None:
                                    if vis != inner_rect:
                                        crop_box = (
                                            max(0, int(vis[0] - inner_rect[0])),
                                            max(0, int(vis[1] - inner_rect[1])),
                                            max(0, int(vis[2] - inner_rect[0])),
                                            max(0, int(vis[3] - inner_rect[1])),
                                        )
                                        trim_img = trim_img.crop(crop_box)
                                    img.alpha_composite(trim_img, (int(vis[0]), int(vis[1])))
                                placed = True
                    if not placed:
                        spr = premul_resize(spr, (target_w, target_h), Image.LANCZOS)
                        if visible_rect != rect:
                            crop_box = (
                                max(0, int(visible_rect[0] - rect[0])),
                                max(0, int(visible_rect[1] - rect[1])),
                                max(0, int(visible_rect[2] - rect[0])),
                                max(0, int(visible_rect[3] - rect[1])),
                            )
                            spr = spr.crop(crop_box)
                        img.alpha_composite(spr, (int(visible_rect[0]), int(visible_rect[1])))
                except Exception:
                    draw.rectangle(visible_rect, outline=(220, 80, 80, 255), width=1)
                    draw.text((visible_rect[0] + 2, visible_rect[1] + 2), "ERR " + payload["name"],
                              fill=(255, 200, 200, 255), font=load_font(10))
            else:
                placeholder_count["sprite_missing"] += 1
                draw.rectangle(visible_rect, outline=(120, 180, 240, 255), width=1)
                draw.text((visible_rect[0] + 2, visible_rect[1] + 2), payload["name"],
                          fill=(180, 220, 255, 255), font=load_font(9))

        elif op_type == "label":
            text = payload["text"]
            if not text:
                continue
            fs = max(8, int(payload["font_size"]))
            font = load_font(fs)
            rect = cocos_to_image(x_bl, y_bl, w if w > 0 else 1, h if h > 0 else fs * 1.25, win_h)
            visible_rect = intersect_rect(rect, clip_img) if clip_img else rect
            if visible_rect is None:
                continue
            dimensions = payload.get("dimensions") or {}
            max_width = max(0, int(rect[2] - rect[0])) if dimensions.get("width") else 0
            lines = wrap_text_for_width(text, font, max_width)
            line_h = max(fs + 2, int(fs * 1.25))
            fill = rgba_tuple(payload["color"])
            brightness = fill[0] * 0.299 + fill[1] * 0.587 + fill[2] * 0.114
            stroke_fill = (0, 0, 0, fill[3]) if brightness > 150 else (255, 255, 255, fill[3])
            stroke_width = max(1, int(fs / 12))
            stroke = payload.get("stroke") or {}
            if stroke.get("enabled"):
                stroke_fill = rgba_tuple(stroke.get("color"), stroke_fill)
                stroke_width = max(stroke_width, int(stroke.get("size") or 0))

            text_h = line_h * len(lines)
            v_alignment = int(payload.get("vAlignment") or 0)
            if dimensions.get("height") and v_alignment == 1:
                y = rect[1] + max(0, (rect[3] - rect[1] - text_h) / 2)
            elif dimensions.get("height") and v_alignment == 2:
                y = rect[3] - text_h
            else:
                y = rect[1]

            h_alignment = int(payload.get("hAlignment") or 0)
            box_w = max(0, rect[2] - rect[0])
            for line in lines:
                if clip_img and (y < clip_img[1] or y + line_h > clip_img[3]):
                    y += line_h
                    continue
                try:
                    line_w = font.getlength(line)
                except Exception:
                    line_w = len(line) * fs * 0.6
                x = rect[0]
                if dimensions.get("width"):
                    if h_alignment == 1:
                        x = rect[0] + max(0, (box_w - line_w) / 2)
                    elif h_alignment == 2:
                        x = rect[0] + max(0, box_w - line_w)
                draw.text((x, y), line, fill=fill, font=font,
                          stroke_width=stroke_width, stroke_fill=stroke_fill)
                y += line_h

        elif op_type == "rect_filled":
            rect = cocos_to_image(x_bl, y_bl, w, h, win_h)
            rect = intersect_rect(rect, clip_img) if clip_img else rect
            if rect is None:
                continue
            c = payload["color"]
            alpha = int(payload.get("opacity", c.get("a", 255)))
            fill = (int(c["r"]), int(c["g"]), int(c["b"]), alpha)
            if fill[3] < 255:
                overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
                overlay_draw = ImageDraw.Draw(overlay)
                overlay_draw.rectangle(rect, fill=fill)
                img.alpha_composite(overlay)
            else:
                draw.rectangle(rect, fill=fill)

        elif op_type == "rect_outline":
            if not debug_outline:
                continue
            rect = cocos_to_image(x_bl, y_bl, w, h, win_h)
            rect = intersect_rect(rect, clip_img) if clip_img else rect
            if rect is None:
                continue
            kind = payload.get("kind", "")
            outline = {
                "StatusButton": (120, 200, 240, 200),
                "AttrButton": (200, 180, 120, 200),
                "ButtonWithPressed": (160, 160, 200, 180),
                "Button": (200, 160, 120, 220),
                "DialogBig": (240, 230, 180, 255),
                "LogView": (140, 160, 180, 160),
                "Node": (90, 90, 110, 120),
            }.get(kind, (140, 140, 160, 160))
            draw.rectangle(rect, outline=outline, width=1)
            label = payload.get("label", "")
            if label and kind in ("StatusButton", "AttrButton", "DialogBig"):
                draw.text((rect[0] + 2, rect[1] + 2), label,
                          fill=outline, font=load_font(9))

    if annotate:
        footer_h = 28
        draw.rectangle((0, win_h - footer_h, win_w, win_h),
                       fill=(20, 22, 28, 230))
        note = "runtime-render | win %dx%d | click=%s | sprite_missing=%d" % (
            win_w, win_h, scene_payload.get("click") or "-",
            placeholder_count["sprite_missing"],
        )
        draw.text((6, win_h - footer_h + 6), note,
                  fill=(220, 220, 220, 255), font=load_font(12))

    if player_view:
        device_w = 1080
        device_h = 2400
        # Composite the 640x1136 design canvas into a 1080x2400 frame so the
        # PNG visually matches what the user sees on their Android device.
        # The canvas is scaled to 1024px width and centered.
        content_w = 1024
        content_h = int(round(win_h * (content_w / float(win_w))))
        framed = Image.new("RGBA", (device_w, device_h), (0, 0, 0, 255))
        scaled = img.resize((content_w, content_h), Image.LANCZOS)
        framed.alpha_composite(scaled, ((device_w - content_w) // 2, (device_h - content_h) // 2))
        img = framed

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(str(out_path), "PNG")
    print("[render] wrote %s (%dx%d, sprite_missing=%d)" % (
        out_path, img.width, img.height, placeholder_count["sprite_missing"]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="input", required=True)
    ap.add_argument("--out", dest="output", required=True)
    ap.add_argument("--annotate", action="store_true")
    ap.add_argument("--debug-outline", action="store_true")
    ap.add_argument("--player-view", action="store_true",
                    help="Composite the logical canvas into a 1080x2400 black frame for user-side comparison.")
    args = ap.parse_args()
    with open(args.input, "r", encoding="utf8") as fh:
        payload = json.load(fh)
    render(payload, args.output, annotate=args.annotate,
           debug_outline=args.debug_outline, player_view=args.player_view)


if __name__ == "__main__":
    main()
