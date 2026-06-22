#!/usr/bin/env node
/*
 * UI inspection report generator (AI self-test loop).
 *
 * Reads capture_*.json + render_*.png pairs from dist/, produces a
 * Markdown report for AI to inspect what the UI looks like after code
 * changes. Entirely local: no device, no user action.
 *
 * Pairing convention:
 *   capture_<scene>.json  -> render_<scene>.png
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const RUNTIME_DIR = __dirname;
const DIST = path.resolve(RUNTIME_DIR, "..", "dist");
const WORK = path.resolve(RUNTIME_DIR, "..", ".work");
const REPO = path.resolve(RUNTIME_DIR, "..", "..", "..");

function parseArgs(argv) {
    const args = {
        out: path.join(DIST, "runtime_report.md"),
        stdout: false,
        noAscii: false,
        work: WORK,
        pngDir: DIST
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--stdout") args.stdout = true;
        else if (a === "--no-ascii") args.noAscii = true;
        else if (a === "--out") args.out = path.resolve(argv[++i]);
        else if (a === "--work") args.work = path.resolve(argv[++i]);
        else if (a === "--png-dir") args.pngDir = path.resolve(argv[++i]);
        else if (a === "--help" || a === "-h") {
            printUsage();
            process.exit(0);
        }
    }
    return args;
}

function printUsage() {
    console.log([
        "Usage: node tools/ui-preview/runtime/inspect.js [--out path] [--work path] [--png-dir path] [--stdout] [--no-ascii]",
        "",
        "Scans <work>/capture_*.json + <png-dir>/render_*.png pairs and writes a Markdown report.",
        "Defaults: --work=.work/  --png-dir=dist/  --out=dist/runtime_report.md"
    ].join("\n"));
}

function discoverSnapshots(workDir, pngDir) {
    if (!fs.existsSync(workDir)) return [];
    const entries = fs.readdirSync(workDir);
    const jsons = entries.filter(function (n) { return /^capture_.*\.json$/.test(n); });
    return jsons.map(function (jsonName) {
        const base = jsonName.replace(/^capture_/, "").replace(/\.json$/, "");
        const jsonPath = path.join(workDir, jsonName);
        const devicePng = path.join(pngDir, "render_device_" + base + ".png");
        const renderPng = fs.existsSync(devicePng)
            ? devicePng
            : path.join(pngDir, "render_" + base + ".png");
        const hasRender = fs.existsSync(renderPng);
        return {
            id: base,
            title: base,
            json: jsonPath,
            png: hasRender ? renderPng : null,
            hasPng: hasRender
        };
    }).sort(function (a, b) { return a.id.localeCompare(b.id); });
}

function walk(node, fn, depth, pathParts) {
    if (!node) return;
    depth = depth || 0;
    pathParts = pathParts || [];
    const name = node.name || node.kind || "node";
    const nextPath = pathParts.concat(name);
    fn(node, depth, nextPath);
    (node.children || []).forEach(function (child) {
        walk(child, fn, depth + 1, nextPath);
    });
}

function rectFor(node, parentOrigin, parentScale, winH) {
    const sx = parentScale.x * (node.scaleX === undefined ? 1 : Number(node.scaleX) || 1);
    const sy = parentScale.y * (node.scaleY === undefined ? 1 : Number(node.scaleY) || 1);
    const w = (Number(node.width) || 0) * sx;
    const h = (Number(node.height) || 0) * sy;
    const ax = node.ignoreAnchor ? 0 : (node.anchorX === undefined ? 0 : Number(node.anchorX) || 0);
    const ay = node.ignoreAnchor ? 0 : (node.anchorY === undefined ? 0 : Number(node.anchorY) || 0);
    const anchorX = parentOrigin.x + (Number(node.x) || 0) * parentScale.x;
    const anchorY = parentOrigin.y + (Number(node.y) || 0) * parentScale.y;
    const blX = anchorX - w * ax;
    const blY = anchorY - h * ay;
    return {
        x: blX,
        y: winH - (blY + h),
        cocosX: blX,
        cocosY: blY,
        w: w,
        h: h,
        anchorX: anchorX,
        anchorY: anchorY,
        scale: { x: sx, y: sy },
        childOrigin: { x: blX, y: blY }
    };
}

function collectLayout(root, win) {
    const rows = [];
    function visit(node, depth, pathParts, parentOrigin, parentScale) {
        if (node.visible === false) return;
        const rect = rectFor(node, parentOrigin, parentScale, win.height);
        const renderable = isRenderable(node, rect);
        if (renderable) {
            rows.push({
                node: node,
                depth: depth,
                path: pathParts.join(" > "),
                rect: rect,
                area: Math.max(0, rect.w) * Math.max(0, rect.h)
            });
        }
        const children = (node.children || []).slice().sort(function (a, b) {
            return (a.zOrder || 0) - (b.zOrder || 0);
        });
        children.forEach(function (child) {
            const name = child.name || child.kind || "node";
            visit(child, depth + 1, pathParts.concat(name), rect.childOrigin, rect.scale);
        });
    }
    visit(root, 0, [root.name || root.kind || "scene"], { x: 0, y: 0 }, { x: 1, y: 1 });
    return rows;
}

function isRenderable(node, rect) {
    if (node.kind === "Sprite" && node.spriteFrameName) return true;
    if (node.kind === "Label" && node.text) return true;
    if (node.kind === "LayerColor" && rect.w > 0 && rect.h > 0) return true;
    if (node.hasClick && rect.w > 0 && rect.h > 0) return true;
    if (["StatusButton", "AttrButton", "Button", "ButtonWithPressed", "ButtonAtChooseScene", "SpriteButton", "DialogBig", "DialogSmall", "TableView", "ScrollView"].indexOf(node.kind) !== -1 && rect.w > 0 && rect.h > 0) {
        return true;
    }
    return false;
}

function summarizeTree(payload) {
    const counts = {};
    const labels = [];
    const clickable = [];
    const sprites = [];
    walk(payload.scene, function (node, depth, pathParts) {
        counts[node.kind] = (counts[node.kind] || 0) + 1;
        if (node.kind === "Label" && node.text) {
            labels.push(String(node.text));
        }
        if (node.hasClick) clickable.push(pathParts.join(" > "));
        if (node.kind === "Sprite" && node.spriteFrameName) sprites.push(node.spriteFrameName);
    });
    return {
        counts: counts,
        labels: labels,
        clickable: clickable,
        sprites: sprites
    };
}

function buildSpriteIndex() {
    const standalone = new Set();
    const atlas = new Set();
    const roots = [
        path.join(REPO, "assets", "res"),
        path.join(REPO, "T版游戏assets", "assets", "res")
    ];

    function scan(dir) {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                scan(p);
            } else if (entry.isFile()) {
                if (/\.png$/i.test(entry.name)) standalone.add(entry.name);
                if (/\.plist$/i.test(entry.name)) {
                    try {
                        const text = fs.readFileSync(p, "utf8");
                        const re = /<key>([^<]+\.png)<\/key>/g;
                        let m;
                        while ((m = re.exec(text))) atlas.add(m[1]);
                    } catch (err) {
                        // Ignore malformed plist files. Missing sprite checks are advisory.
                    }
                }
            }
        }
    }

    roots.forEach(scan);
    return { standalone: standalone, atlas: atlas };
}

function findMissingSprites(sprites, spriteIndex) {
    const unique = Array.from(new Set(sprites.map(function (name) {
        return String(name || "").replace(/^#/, "").replace(/^(res\/|assets\/res\/)/, "");
    }).filter(Boolean))).sort();
    return unique.filter(function (name) {
        // Match by basename — captures sometimes prefix the dir (e.g. "npc/x.png",
        // "res/npc/x.png") but spriteIndex keys on filename only.
        const base = name.split("/").pop();
        return !spriteIndex.standalone.has(base) && !spriteIndex.atlas.has(base)
            && !spriteIndex.standalone.has(name) && !spriteIndex.atlas.has(name);
    });
}

function outOfBounds(layout, win) {
    return layout.filter(function (item) {
        const r = item.rect;
        if (r.w <= 1 || r.h <= 1) return false;
        if (item.node.spriteFrameName === "btn_common_white_normal.png") return false;
        if (/TableView|TableViewCell|ScrollView|innerContainer/.test(item.path)) return false;
        return r.x < -2 || r.y < -2 || r.x + r.w > win.width + 2 || r.y + r.h > win.height + 2;
    });
}

function findLargeOverlays(layout, win) {
    const viewportArea = win.width * win.height;
    return layout.filter(function (item) {
        const node = item.node;
        return node.kind === "LayerColor"
            && item.area >= viewportArea * 0.65
            && node.color
            && Number(node.color.a) < 255;
    });
}

function topLayout(layout) {
    return layout
        .filter(function (item) {
            return item.area > 900 || item.node.kind === "Label";
        })
        .sort(function (a, b) {
            if (a.depth !== b.depth) return a.depth - b.depth;
            return b.area - a.area;
        })
        .slice(0, 14);
}

function isLabelItem(item) {
    return item.node.kind === "Label" && item.node.text;
}

function isSpriteItem(item) {
    return item.node.kind === "Sprite" && item.node.spriteFrameName;
}

function appendTree(node, depth, win, lines, parentOrigin, parentScale, maxDepth) {
    if (!node || maxDepth > 8) return;
    const rect = rectFor(node, parentOrigin, parentScale, win.height);
    const indent = "  ".repeat(depth);
    let label = node.kind || "Node";
    if (node.name) label += ":" + node.name;
    if (node.kind === "Label" && node.text) label += " \"" + compact(String(node.text), 24) + "\"";
    if (node.kind === "Sprite" && node.spriteFrameName) label += " #" + node.spriteFrameName;
    if (node.hasClick) label += " [click]";
    const visible = node.visible === false ? " (hidden)" : "";
    lines.push(indent + "- " + label + " @ " + fmtRect(rect) + visible);
    const children = (node.children || []).slice().sort(function (a, b) {
        return (a.zOrder || 0) - (b.zOrder || 0);
    });
    children.forEach(function (child) {
        appendTree(child, depth + 1, win, lines, rect.childOrigin, rect.scale, maxDepth + 1);
    });
}

function appendRegionBreakdown(layout, win, lines) {
    const bands = [
        { name: "top (0-33%)", y0: 0, y1: win.height * 0.33 },
        { name: "middle (33-66%)", y0: win.height * 0.33, y1: win.height * 0.66 },
        { name: "bottom (66-100%)", y0: win.height * 0.66, y1: win.height }
    ];
    bands.forEach(function (band) {
        const items = layout.filter(function (item) {
            if (item.area <= 0) return false;
            const cy = item.rect.y + item.rect.h / 2;
            return cy >= band.y0 && cy < band.y1;
        }).sort(function (a, b) {
            return (a.rect.x) - (b.rect.x);
        }).slice(0, 12);
        lines.push("- " + band.name + ": " + (items.length ? items.length + " nodes" : "empty"));
        items.forEach(function (item) {
            lines.push("  - " + describeNode(item));
        });
    });
}

function fmtRect(r) {
    return [
        Math.round(r.x),
        Math.round(r.y),
        Math.round(r.w),
        Math.round(r.h)
    ].join(",");
}

function describeNode(item) {
    const n = item.node;
    let label = n.kind;
    if (n.name) label += ":" + n.name;
    if (n.kind === "Label" && n.text) label += " \"" + compact(n.text, 24) + "\"";
    if (n.kind === "Sprite" && n.spriteFrameName) label += " #" + n.spriteFrameName;
    if (n.hasClick) label += " [click]";
    return label + " @ " + fmtRect(item.rect);
}

function compact(value, maxLen) {
    value = String(value || "").replace(/\s+/g, " ");
    if (value.length <= maxLen) return value;
    return value.slice(0, maxLen - 1) + "...";
}

function parsePng(filePath) {
    const b = fs.readFileSync(filePath);
    let off = 8;
    let w = 0;
    let h = 0;
    let bit = 0;
    let color = 0;
    const chunks = [];
    while (off < b.length) {
        const len = b.readUInt32BE(off);
        const type = b.toString("ascii", off + 4, off + 8);
        const data = b.subarray(off + 8, off + 8 + len);
        off += 12 + len;
        if (type === "IHDR") {
            w = data.readUInt32BE(0);
            h = data.readUInt32BE(4);
            bit = data[8];
            color = data[9];
        } else if (type === "IDAT") {
            chunks.push(data);
        } else if (type === "IEND") {
            break;
        }
    }
    const channels = color === 2 ? 3 : color === 6 ? 4 : color === 0 ? 1 : 0;
    if (bit !== 8 || !channels) {
        throw new Error("unsupported PNG format: " + filePath);
    }
    const raw = zlib.inflateSync(Buffer.concat(chunks));
    const stride = w * channels;
    const out = Buffer.alloc(h * stride);
    let ro = 0;
    let po = 0;
    for (let y = 0; y < h; y++) {
        const filter = raw[ro++];
        for (let x = 0; x < stride; x++) {
            const val = raw[ro++];
            const left = x >= channels ? out[po - channels] : 0;
            const up = y ? out[po - stride] : 0;
            const upLeft = y && x >= channels ? out[po - stride - channels] : 0;
            let v = val;
            if (filter === 1) v = (val + left) & 255;
            else if (filter === 2) v = (val + up) & 255;
            else if (filter === 3) v = (val + Math.floor((left + up) / 2)) & 255;
            else if (filter === 4) v = (val + paeth(left, up, upLeft)) & 255;
            else if (filter !== 0) throw new Error("unsupported PNG filter: " + filter);
            out[po++] = v;
        }
    }
    return { width: w, height: h, channels: channels, pixels: out };
}

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

function imageStats(pngPath) {
    const img = parsePng(pngPath);
    const total = img.width * img.height;
    let dark = 0;
    let bright = 0;
    let sum = 0;
    for (let i = 0; i < total; i++) {
        const o = i * img.channels;
        const r = img.pixels[o];
        const g = img.channels > 1 ? img.pixels[o + 1] : r;
        const b = img.channels > 2 ? img.pixels[o + 2] : r;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += lum;
        if (lum < 70) dark++;
        if (lum > 190) bright++;
    }
    return {
        width: img.width,
        height: img.height,
        avg: sum / total,
        darkPct: dark * 100 / total,
        brightPct: bright * 100 / total,
        ascii: asciiImage(img, 42, 18)
    };
}

function asciiImage(img, cols, rows) {
    const chars = " .:-=+*#%@";
    const lines = [];
    for (let ry = 0; ry < rows; ry++) {
        let line = "";
        for (let cx = 0; cx < cols; cx++) {
            const x0 = Math.floor(cx * img.width / cols);
            const x1 = Math.max(x0 + 1, Math.floor((cx + 1) * img.width / cols));
            const y0 = Math.floor(ry * img.height / rows);
            const y1 = Math.max(y0 + 1, Math.floor((ry + 1) * img.height / rows));
            let sum = 0;
            let count = 0;
            for (let y = y0; y < y1; y += 3) {
                for (let x = x0; x < x1; x += 3) {
                    const o = (y * img.width + x) * img.channels;
                    const r = img.pixels[o];
                    const g = img.channels > 1 ? img.pixels[o + 1] : r;
                    const b = img.channels > 2 ? img.pixels[o + 2] : r;
                    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    count++;
                }
            }
            const idx = Math.min(chars.length - 1, Math.floor((sum / Math.max(1, count)) / 256 * chars.length));
            line += chars[idx];
        }
        lines.push(line.replace(/\s+$/g, ""));
    }
    return lines.join("\n");
}

function makeReport(args) {
    const snapshots = discoverSnapshots(args.work, args.pngDir);
    const spriteIndex = buildSpriteIndex();
    const lines = [];
    lines.push("# Runtime UI Preview Report");
    lines.push("");
    lines.push("Generated: " + new Date().toISOString());
    lines.push("Source: local render.py output (render_*.png in dist/)");
    lines.push("");
    lines.push("- Snapshots found: " + snapshots.length);
    lines.push("");

    if (snapshots.length === 0) {
        lines.push("No `capture_*.json` found in `" + args.work + "`.");
        lines.push("");
        lines.push("AI self-test: run `bash tools/ui-preview/run-all.sh` to regenerate captures + renders + reports.");
        return lines.join("\n");
    }

    const overall = {
        missing: new Set()
    };

    snapshots.forEach(function (snapshot) {
        if (!fs.existsSync(snapshot.json)) {
            lines.push("## " + snapshot.title);
            lines.push("");
            lines.push("- Missing JSON: " + snapshot.json);
            lines.push("");
            return;
        }

        const payload = JSON.parse(fs.readFileSync(snapshot.json, "utf8"));
        const win = payload.winSize || { width: 640, height: 1136 };
        const summary = summarizeTree(payload);
        const layout = collectLayout(payload.scene, win);
        const missing = findMissingSprites(summary.sprites, spriteIndex);
        const outBounds = outOfBounds(layout, win);
        const overlays = findLargeOverlays(layout, win);

        missing.forEach(function (name) { overall.missing.add(name); });

        lines.push("## " + snapshot.title);
        lines.push("");
        lines.push("- JSON: `capture_" + snapshot.id + ".json`");
        lines.push("- PNG: " + (snapshot.hasPng
            ? "`" + path.basename(snapshot.png) + "`"
            : "(missing)"));
        if (payload.timestamp) lines.push("- Captured: " + payload.timestamp);
        lines.push("- Viewport: " + win.width + "x" + win.height);
        lines.push("- Nodes: " + Object.keys(summary.counts).sort().map(function (key) { return key + "=" + summary.counts[key]; }).join(", "));
        lines.push("- Click targets: " + summary.clickable.length);
        if (snapshot.hasPng) {
            const stats = imageStats(snapshot.png);
            lines.push("- Image: avgLum=" + stats.avg.toFixed(1) + ", dark=" + stats.darkPct.toFixed(1) + "%, bright=" + stats.brightPct.toFixed(1) + "%");
        }
        lines.push("- Missing sprites: " + (missing.length ? missing.join(", ") : "none"));
        lines.push("- Out of viewport: " + (outBounds.length ? outBounds.slice(0, 6).map(describeNode).join(" | ") : "none"));
        lines.push("- Large translucent overlays: " + overlays.length);
        lines.push("");
        lines.push("Top layout nodes:");
        topLayout(layout).forEach(function (item) {
            lines.push("- " + "  ".repeat(Math.min(item.depth, 4)) + describeNode(item));
        });

        const labelPreview = summary.labels.slice(0, 10).map(function (text) {
            return "`" + compact(text, 28).replace(/`/g, "'") + "`";
        }).join(", ");
        lines.push("");
        lines.push("Visible labels: " + (labelPreview || "none"));

        lines.push("");
        lines.push("### Full node tree");
        lines.push("");
        lines.push("```");
        appendTree(payload.scene, 0, win, lines, { x: 0, y: 0 }, { x: 1, y: 1 }, 0);
        lines.push("```");

        lines.push("");
        lines.push("### Labels (" + layout.filter(isLabelItem).length + ")");
        lines.push("");
        layout.filter(isLabelItem).forEach(function (item) {
            const n = item.node;
            const col = n.color ? "rgb(" + [n.color.r, n.color.g, n.color.b].join(",") + ")" : "default";
            lines.push("- \"" + compact(String(n.text || ""), 40) + "\" @ "
                + fmtRect(item.rect) + " fs=" + (n.fontSize || 16) + " " + col);
        });

        lines.push("");
        lines.push("### Sprites (" + layout.filter(isSpriteItem).length + ")");
        lines.push("");
        layout.filter(isSpriteItem).forEach(function (item) {
            const n = item.node;
            const sizeTag = n.explicitSize ? "explicit" : "auto";
            lines.push("- #" + n.spriteFrameName + " @ "
                + fmtRect(item.rect) + " " + sizeTag);
        });

        lines.push("");
        lines.push("### Region breakdown");
        lines.push("");
        appendRegionBreakdown(layout, win, lines);

        if (!args.noAscii && snapshot.hasPng) {
            const stats = imageStats(snapshot.png);
            lines.push("");
            lines.push("Thumbnail:");
            lines.push("```text");
            lines.push(stats.ascii);
            lines.push("```");
        }
        lines.push("");
    });

    const summary = [
        "## Summary",
        "",
        "- Missing sprites: " + (overall.missing.size ? Array.from(overall.missing).sort().join(", ") : "none"),
        ""
    ];

    return lines.slice(0, 6).concat(summary, lines.slice(6)).join("\n");
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const report = makeReport(args);
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, report + "\n", "utf8");
    if (args.stdout) process.stdout.write(report + "\n");
    else process.stderr.write("[inspect] wrote " + args.out + "\n");
}

main();
