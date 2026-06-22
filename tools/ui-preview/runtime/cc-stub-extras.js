/*
 * cc-stub-extras.js — atlas + texture + sprite-frame plumbing for cc-stub.
 *
 * Loads .plist + .pvr.ccz/.png atlases from assets/res, populates
 * spriteFrameCache so CCSprite.initWithSpriteFrameName gets real sizes,
 * and feeds CC._textureSizes so initWithFile knows PNG dimensions.
 *
 * render.py already does atlas decoding for PNG output — this file does
 * the lighter-weight "frame name → size" lookup needed by the stub so
 * node trees have correct content sizes without rendering pixels.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..", "..");

const ASSET_DIRS = [
    REPO + "/assets/res/ui",
    REPO + "/assets/res/icon",
    REPO + "/assets/res/npc",
    REPO + "/assets/res/site",
    REPO + "/assets/res/home",
    REPO + "/assets/res/build",
    REPO + "/assets/res/dig_build",
    REPO + "/assets/res/dig_item",
    REPO + "/assets/res/dig_monster",
    REPO + "/assets/res/dig_work",
    REPO + "/assets/res/gate",
    REPO + "/assets/res/map",
    REPO + "/assets/res/menu",
    REPO + "/assets/res/rank",
    REPO + "/assets/res/end",
    REPO + "/assets/res/day",
    REPO + "/assets/res/day2",
    REPO + "/assets/res/weather",
    REPO + "/assets/res"
];

const ATLAS_PLIST_DIRS = [
    REPO + "/assets/res"
];

const ATLAS_FALLBACK_DIRS = [
    REPO + "/T版游戏assets/assets/res"
];

// =============================================================================
// Plist parsing (tiny — just extracts what we need)
// =============================================================================

function parsePlistPlistlib(text) {
    // plistlib not installed; use manual parser
    return null;
}

// Minimal plist XML parser: extracts frames dict { "name.png": { frame, rotated, ... } }
function parseAtlasPlist(text) {
    const frames = {};
    // Quick & dirty regex-based frame extraction
    const frameBlockRe = /<key>([^<]+\.png)<\/key>\s*<dict>([\s\S]*?)<\/dict>/g;
    let m;
    while ((m = frameBlockRe.exec(text)) !== null) {
        const name = m[1];
        const body = m[2];
        const frameMatch = body.match(/<key>frame<\/key>\s*<string>([^<]+)<\/string>/);
        const rotatedMatch = body.match(/<key>rotated<\/key>\s*<(true|false)\/>/);
        const sourceSizeMatch = body.match(/<key>sourceSize<\/key>\s*<string>([^<]+)<\/string>/);
        const offsetMatch = body.match(/<key>offset<\/key>\s*<string>([^<]+)<\/string>/);

        const parseNums = function (s) {
            return (s || "").match(/-?\d+(\.\d+)?/g).map(Number);
        };

        const fr = {
            frame: frameMatch ? parseNums(frameMatch[1]) : [0, 0, 0, 0],
            rotated: rotatedMatch ? rotatedMatch[1] === "true" : false,
            sourceSize: sourceSizeMatch ? parseNums(sourceSizeMatch[1]) : [0, 0],
            offset: offsetMatch ? parseNums(offsetMatch[1]) : [0, 0]
        };
        frames[name] = fr;
    }
    return frames;
}

// =============================================================================
// Atlas index: { spriteName: { w, h } }
// =============================================================================

const _atlasFrameSizes = {}; // spriteName → { width, height } (sourceSize)
const _atlasLoaded = new Set();
const _plistFrames = {}; // plistPath → { spriteName: SpriteFrame-like }

function loadAllAtlases() {
    for (const dir of ATLAS_PLIST_DIRS) {
        if (!fs.existsSync(dir)) continue;
        let entries;
        try { entries = fs.readdirSync(dir); } catch (e) { continue; }
        for (const name of entries) {
            if (!name.endsWith(".plist")) continue;
            const plistPath = path.join(dir, name);
            if (_atlasLoaded.has(plistPath)) continue;
            _atlasLoaded.add(plistPath);
            let text;
            try { text = fs.readFileSync(plistPath, "utf8"); } catch (e) { continue; }
            const frames = parseAtlasPlist(text);
            const frameMap = {};
            for (const k in frames) {
                const f = frames[k];
                _atlasFrameSizes[k] = { width: f.sourceSize[0], height: f.sourceSize[1] };
                frameMap[k] = {
                    name: k,
                    _originalSize: { width: f.sourceSize[0], height: f.sourceSize[1] },
                    getOriginalSize: function () { return this._originalSize; }
                };
            }
            _plistFrames[plistPath] = frameMap;
        }
    }
}

function getPlistFrames(plistPath) {
    // Direct path lookup
    if (_plistFrames[plistPath]) return _plistFrames[plistPath];
    // Real code sometimes passes just the plist name (e.g. "ui.plist").
    // Search loaded plists for a matching basename.
    const base = path.basename(plistPath);
    for (const p in _plistFrames) {
        if (path.basename(p) === base) return _plistFrames[p];
    }
    return null;
}

// =============================================================================
// Standalone PNG sizes: scan all asset dirs, read PNG header for dimensions
// =============================================================================

const _pngSizes = {}; // filename → { width, height }
let _pngScanDone = false;

function pngHeaderSize(buf) {
    // PNG: 8-byte sig, then IHDR chunk (4-byte len + "IHDR" + 13 bytes data)
    if (buf.length < 24) return null;
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return null; // not PNG
    // IHDR width = bytes 16-19, height = bytes 20-23 (big-endian)
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { width: w, height: h };
}

function scanStandalonePngs() {
    if (_pngScanDone) return;
    _pngScanDone = true;
    const seen = new Set();
    const scan = function (dir) {
        if (!fs.existsSync(dir)) return;
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
        for (const e of entries) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) {
                scan(p);
            } else if (e.isFile() && e.name.endsWith(".png")) {
                if (seen.has(e.name)) continue;
                seen.add(e.name);
                try {
                    const fd = fs.openSync(p, "r");
                    const buf = Buffer.alloc(24);
                    fs.readSync(fd, buf, 0, 24, 0);
                    fs.closeSync(fd);
                    const sz = pngHeaderSize(buf);
                    if (sz) _pngSizes[e.name] = sz;
                } catch (err) {
                    // skip
                }
            }
        }
    };
    for (const d of ASSET_DIRS) scan(d);
}

// =============================================================================
// Public API
// =============================================================================

function getSpriteFrameSize(name) {
    name = String(name || "").replace(/^#/, "");
    if (_atlasFrameSizes[name]) return _atlasFrameSizes[name];
    if (!_pngScanDone) scanStandalonePngs();
    if (_pngSizes[name]) return _pngSizes[name];
    // Callers pass paths like "res/npc/npc_dig_8.png" but _pngSizes is keyed
    // by basename. Fall back to basename lookup before giving up.
    const base = path.basename(name);
    if (base !== name && _pngSizes[base]) return _pngSizes[base];
    return null;
}

function installIntoCC(cc) {
    cc._textureSizes = cc._textureSizes || {};

    // Wire up atlas loader (called from CC._loadAtlasPlist)
    cc._extrasLoadAtlasPlist = function (plistPath, framesMap) {
        let text;
        try { text = fs.readFileSync(plistPath, "utf8"); } catch (e) { return; }
        const frames = parseAtlasPlist(text);
        for (const k in frames) {
            const f = frames[k];
            _atlasFrameSizes[k] = { width: f.sourceSize[0], height: f.sourceSize[1] };
            // Also populate the passed framesMap with a lightweight SpriteFrame
            const sf = new cc.SpriteFrame();
            sf._name = k;
            sf._originalSize = { width: f.sourceSize[0], height: f.sourceSize[1] };
            sf._rect = { x: f.frame[0], y: f.frame[1], width: f.frame[2], height: f.frame[3] };
            framesMap[k] = sf;
        }
    };

    // Wire up texture size lookup (called from CCSprite.initWithFile)
    cc._lookupTextureSize = function (filename) {
        return getSpriteFrameSize(filename);
    };

    // Wire up plist valueMap lookup (called from cc.loader.getRes)
    cc._extrasGetPlistFrames = getPlistFrames;

    // Eagerly load all atlases + scan PNGs
    loadAllAtlases();
    scanStandalonePngs();

    // Inject the discovered frame sizes into spriteFrameCache so
    // initWithSpriteFrameName works for any frame, not just loaded plists.
    for (const name in _atlasFrameSizes) {
        if (!cc.spriteFrameCache.getSpriteFrame(name)) {
            const sf = new cc.SpriteFrame();
            sf._name = name;
            sf._originalSize = _atlasFrameSizes[name];
            cc.spriteFrameCache.addSpriteFrame(sf, name);
        }
    }
    for (const name in _pngSizes) {
        if (!cc.spriteFrameCache.getSpriteFrame(name)) {
            const sf = new cc.SpriteFrame();
            sf._name = name;
            sf._originalSize = _pngSizes[name];
            cc.spriteFrameCache.addSpriteFrame(sf, name);
        }
    }
}

module.exports = {
    installIntoCC: installIntoCC,
    getSpriteFrameSize: getSpriteFrameSize,
    loadAllAtlases: loadAllAtlases,
    scanStandalonePngs: scanStandalonePngs,
    getPlistFrames: getPlistFrames,
    _atlasFrameSizes: _atlasFrameSizes,
    _plistFrames: _plistFrames,
    _pngSizes: _pngSizes
};
