#!/usr/bin/env node
/*
 * generate-all.js — vm-based UI scene generator.
 *
 * Loads cc-stub + cc-stub-extras in a Node vm, then either:
 *   --self-test     : build a synthetic tree from cc-stub classes and dump it
 *   --target <file> : load a real assets/src/ui/*.js file, instantiate its
 *                     top-level class, and dump the resulting node tree.
 *
 * Output: dist/capture_<name>.json with the same schema as
 * assets/src/util/uiExporter.js (so inspect.js / render.py consume it
 * identically to real-device captures).
 *
 * Usage:
 *   node tools/ui-preview/runtime/generate-all.js --self-test
 *   node tools/ui-preview/runtime/generate-all.js --target src/ui/LogView.js
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RUNTIME_DIR = __dirname;
const DIST = path.resolve(RUNTIME_DIR, "..", "dist");
const REPO = path.resolve(RUNTIME_DIR, "..", "..", "..");
const SRC = path.join(REPO, "assets", "src");

function parseArgs(argv) {
    const args = { selfTest: false, target: null, outDir: DIST, name: null, verbose: false, instantiate: null, ctorArgs: null, setupJs: null, afterJs: null, localStorageJson: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--self-test") args.selfTest = true;
        else if (a === "--target") args.target = argv[++i];
        else if (a === "--out-dir") args.outDir = path.resolve(argv[++i]);
        else if (a === "--name") args.name = argv[++i];
        else if (a === "--instantiate") args.instantiate = argv[++i];
        else if (a === "--ctor-args") args.ctorArgs = argv[++i];
        else if (a === "--setup-js") args.setupJs = argv[++i];
        else if (a === "--after-js") args.afterJs = argv[++i];
        else if (a === "--local-storage-json") args.localStorageJson = argv[++i];
        else if (a === "--verbose" || a === "-v") args.verbose = true;
        else if (a === "--help" || a === "-h") {
            console.log("Usage: generate-all.js --self-test | --target <file> [--instantiate GlobalName] [--ctor-args json] [--setup-js code] [--after-js code] [--local-storage-json path] [--name n] [--out-dir d]");
            process.exit(0);
        }
    }
    return args;
}

function preloadLocalStorage(cc, filePath) {
    if (!filePath) return;
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) {
        throw new Error("local storage json not found: " + abs);
    }
    const payload = JSON.parse(fs.readFileSync(abs, "utf8"));
    const data = payload && payload.localStorage ? payload.localStorage : payload;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("local storage json must be an object: " + abs);
    }
    Object.keys(data).forEach(function (key) {
        const value = data[key];
        cc.sys.localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    });
    console.log("[generate-all] preloaded localStorage keys from " + abs + ": " + Object.keys(data).join(", "));
}

// =============================================================================
// vm context construction
// =============================================================================

function buildContext(cc) {
    // Build runtime singleton instances once — real GameRuntime.js (loaded
    // later from jsList) overwrites our stub GameRuntime but its getPlayer()
    // falls back to the global `player`. So we expose the same instances both
    // as sandbox globals and through a stub GameRuntime that returns them.
    const runtime = makeRuntimeInstances();

    // Global stubs that real UI source relies on at load time.
    // Keep these minimal — only what's needed for file load + ctor.
    const sandbox = {
        cc: cc,
        console: console,
        require: require,
        module: module,
        exports: exports,
        process: process,
        Buffer: Buffer,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        JSON: JSON,
        Math: Math,
        Date: Date,
        Error: Error,
        RegExp: RegExp,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Function: Function,
        // Cocos global singletons (real files reference these directly).
        // `game` is later overwritten by game.js, but EnvironmentConfig.js
        // (earlier in jsList) references cc.game.EVENT_HIDE — keep the stub
        // until the real one lands.
        game: {
            initApp: function () {},
            EVENT_HIDE: "game_hide",
            EVENT_SHOW: "game_show",
            onPause: function () {},
            onResume: function () {}
        },
        GameRuntime: makeGameRuntimeStub(runtime),
        jsb: {
            // Native JNI bridge — PurchaseAndroid/ads call into Java via
            // jsb.reflection.callStaticMethod. No native in UI dump; no-op.
            reflection: {
                callStaticMethod: function () {}
            },
            fileUtils: {
                getWritablePath: function () { return "/tmp/"; },
                // Real Cocos checks the search paths + app bundle. For UI dump
                // we check the repo's asset directories so resolveStandaloneSpritePaths
                // returns only existing files (avoids noisy "not found" logs).
                isFileExist: function (relPath) {
                    if (!relPath || typeof relPath !== "string") return false;
                    if (fs.existsSync(relPath)) return true;
                    const REPO = path.resolve(__dirname, "..", "..", "..");
                    const candidates = [
                        path.join(REPO, "assets", "res", relPath),
                        path.join(REPO, "assets", "res", relPath.replace(/^res\//, "")),
                        path.join(REPO, "res", relPath),
                        path.join(REPO, "res", relPath.replace(/^res\//, "")),
                        path.join(REPO, "assets", relPath)
                    ];
                    return candidates.some(function (p) { return fs.existsSync(p); });
                },
                isDirectoryExist: function (relPath) {
                    if (!relPath) return false;
                    if (fs.existsSync(relPath) && fs.statSync(relPath).isDirectory()) return true;
                    const REPO = path.resolve(__dirname, "..", "..", "..");
                    const candidates = [
                        path.join(REPO, "assets", "res", relPath),
                        path.join(REPO, "res", relPath)
                    ];
                    return candidates.some(function (p) { try { return fs.existsSync(p) && fs.statSync(p).isDirectory(); } catch (e) { return false; } });
                },
                fullPathForFilename: function (relPath) {
                    if (fs.existsSync(relPath)) return relPath;
                    const REPO = path.resolve(__dirname, "..", "..", "..");
                    const candidates = [
                        path.join(REPO, "assets", "res", relPath),
                        path.join(REPO, "assets", "res", relPath.replace(/^res\//, "")),
                        path.join(REPO, "res", relPath),
                        path.join(REPO, "res", relPath.replace(/^res\//, ""))
                    ];
                    for (const c of candidates) if (fs.existsSync(c)) return c;
                    return relPath;
                }
            }
        },
        utils: {
            clone: function (v) { return JSON.parse(JSON.stringify(v)); },
            splitLog: function () { return []; },
            invokeCallback: function () {},
            emitter: runtime.emitter
        },
        // Runtime singletons — also exposed as globals so real GameRuntime.js's
        // fallback paths (getPlayer → global player, getEmitter → utils.emitter,
        // getRecord → global Record) resolve to the same instances after the
        // real GameRuntime overwrites our stub.
        player: runtime.player,
        timer: runtime.timer,
        Record: runtime.record
    };
    sandbox.global = sandbox;
    sandbox.window = sandbox; // uiExporter checks `typeof window`
    vm.createContext(sandbox);
    return sandbox;
}

function makeContainer() {
    // Bag/storage/tmpbag share a common iteration/increase/decrease API in
    // player.js. Give them no-op stubs so UI ctors that iterate them just see
    // an empty collection.
    return {
        forEach: function (cb) {},
        increaseItem: function () {},
        decreaseItem: function () {},
        size: function () { return 0; },
        length: 0
    };
}

function makeRuntimeInstances() {
    const emitter = {
        _handlers: {},
        on: function (evt, cb) { (this._handlers[evt] = this._handlers[evt] || []).push(cb); return cb; },
        off: function (evt, cb) { if (this._handlers[evt]) this._handlers[evt] = this._handlers[evt].filter(function (h) { return h !== cb; }); },
        emit: function (evt) { (this._handlers[evt] || []).forEach(function (h) { try { h(); } catch (e) {} }); },
        listeners: function (evt) { return this._handlers[evt] || []; }
    };
    const player = {
        weather: { weatherId: 0, getWeatherName: function () { return "clear"; } },
        temperature: 20,
        roleType: 0,
        isAtHome: function () { return false; },
        getAttrPercentage: function () { return 0; },
        getAttrStr: function (a) { return "0"; },
        getSetting: function () { return false; },
        setSetting: function () {},
        goHome: function () {},
        saveAll: function () {},
        useItem: function () {},
        storage: makeContainer(),
        tmpbag: makeContainer(),
        bag: makeContainer(),
        equip: { isEquiped: function () { return false; } },
        log: { addMsg: function () {} },
        map: { getSite: function () { return null; }, deleteUnusableSite: function () {} },
        room: { getBuild: function () { return null; } },
        ziplineNetwork: { hasLinksForEntity: function () { return false; } },
        getCurrentMapEntityId: function () { return 0; },
        getCurrentMapEntityKey: function () { return null; },
        buffManager: { getDisplayBuffsByAttr: function () { return []; } }
    };
    const timer = {
        formatTime: function () { return { d: 1, h: 8, m: 0, s: 0 }; },
        getSeason: function () { return 0; },
        getTimeHourStr: function () { return "08:00"; },
        getTimeDayStr: function () { return "Day 1"; },
        addTimerCallback: function (cb) { return cb; },
        removeTimerCallback: function () {},
        pause: function () {},
        resume: function () {}
    };
    const record = { saveAll: function () {} };
    return { emitter: emitter, player: player, timer: timer, record: record };
}

function makeGameRuntimeStub(runtime) {
    return {
        getPlayer: function () { return runtime.player; },
        getTimer: function () { return runtime.timer; },
        getEmitter: function () { return runtime.emitter; },
        getRecord: function () { return runtime.record; }
    };
}

// =============================================================================
// File loading
// =============================================================================

function loadFile(sandbox, relPath) {
    let abs = path.join(SRC, relPath.replace(/^src\//, ""));
    if (!fs.existsSync(abs)) {
        // string.js is a build-time artifact that picks a language file at
        // runtime; the repo only ships string_zh.js. Fall back to it so
        // `var string = {...}` is defined for stringUtil.getString.
        if (relPath === "src/data/string/string.js") {
            const zh = path.join(SRC, "data/string/string_zh.js");
            if (fs.existsSync(zh)) abs = zh;
            else throw new Error("missing " + relPath + " and fallback string_zh.js");
        } else {
            throw new Error("ENOENT: " + abs);
        }
    }
    const code = fs.readFileSync(abs, "utf8");
    const script = new vm.Script(code, { filename: abs });
    script.runInContext(sandbox);
}

// =============================================================================
// Dump (delegates to real UiExporter._dumpNode for schema parity)
// =============================================================================

function dumpNode(sandbox, node) {
    if (!sandbox.UiExporter || !sandbox.UiExporter._dumpNode) {
        throw new Error("UiExporter not loaded");
    }
    return sandbox.UiExporter._dumpNode(node);
}

function writeCapture(args, name, sceneNode, winSize) {
    const payload = {
        winSize: winSize || { width: 640, height: 1136 },
        timestamp: new Date().toISOString(),
        deviceInfo: { os: "stub", osVersion: "vm" },
        scene: sceneNode
    };
    fs.mkdirSync(args.outDir, { recursive: true });
    const outPath = path.join(args.outDir, "capture_" + name + ".json");
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
    console.log("[generate-all] wrote " + outPath);
    return outPath;
}

// =============================================================================
// Self-test: build a synthetic tree, verify defaults
// =============================================================================

function runSelfTest(sandbox, args) {
    const cc = sandbox.cc;

    // Scene root (Layer defaults: anchor 0,0, ignoreAnchor=true, size=winSize)
    const scene = new cc.Scene();
    scene.setName("SelfTestScene");

    // Background sprite — anchor 0.5,0.5, content size from atlas/PNG
    const bg = new cc.Sprite("#menu_bg.png");
    bg.setName("bg");
    bg.setPosition(cc.winSize.width / 2, cc.winSize.height / 2);
    scene.addChild(bg);

    // LabelTTF — anchor 0.5,0.5, content size auto
    const title = new cc.LabelTTF("测试标题", "", 24);
    title.setName("title");
    title.setPosition(cc.winSize.width / 2, cc.winSize.height - 100);
    bg.addChild(title);

    // LayerColor — anchor 0,0 + ignoreAnchor, size 200x100, red
    const overlay = new cc.LayerColor(cc.color(255, 0, 0, 128), 200, 100);
    overlay.setName("overlay");
    overlay.setPosition(50, 50);
    scene.addChild(overlay);

    // Menu — anchor 0,0 + ignoreAnchor (like Layer)
    const menu = new cc.Menu();
    menu.setName("menu");
    menu.setPosition(100, 200);
    scene.addChild(menu);

    // DrawNode — anchor 0.5,0.5
    const draw = new cc.DrawNode();
    draw.setName("draw");
    draw.drawRect(cc.p(0, 0), cc.p(50, 50), cc.color(0, 255, 0, 255), 1, cc.color(0, 0, 0, 255));
    draw.setPosition(300, 300);
    scene.addChild(draw);

    const tree = dumpNode(sandbox, scene);

    // --- assertions ---
    const checks = [];
    function check(cond, msg) { checks.push({ ok: !!cond, msg: msg }); }

    check(tree.kind === "Scene", "scene kind=Scene (got " + tree.kind + ")");
    check(tree.anchorX === 0 && tree.anchorY === 0, "scene anchor 0,0 (Layer default)");
    check(tree.width === cc.winSize.width && tree.height === cc.winSize.height, "scene size=winSize");
    check(tree.children && tree.children.length === 4, "scene has 4 children");

    const bgNode = tree.children[0];
    check(bgNode.kind === "Sprite", "bg kind=Sprite");
    check(bgNode.anchorX === 0.5 && bgNode.anchorY === 0.5, "bg anchor 0.5,0.5 (Sprite default)");
    check(bgNode.spriteFrameName === "menu_bg.png", "bg spriteFrameName");
    check(bgNode.width > 0 && bgNode.height > 0, "bg has real size from atlas/PNG (" + bgNode.width + "x" + bgNode.height + ")");

    const titleNode = bgNode.children[0];
    check(titleNode.kind === "Label", "title kind=Label");
    check(titleNode.text === "测试标题", "title text");
    check(titleNode.fontSize === 24, "title fontSize=24");
    check(titleNode.anchorX === 0.5 && titleNode.anchorY === 0.5, "title anchor 0.5,0.5");

    const overlayNode = tree.children[1];
    check(overlayNode.kind === "LayerColor", "overlay kind=LayerColor");
    check(overlayNode.color && overlayNode.color.r === 255 && overlayNode.color.a === 128, "overlay color+alpha");
    check(overlayNode.width === 200 && overlayNode.height === 100, "overlay size 200x100");

    const menuNode = tree.children[2];
    check(menuNode.kind === "Menu", "menu kind=Menu");
    check(menuNode.anchorX === 0 && menuNode.anchorY === 0, "menu anchor 0,0 (Menu default)");

    const drawNode = tree.children[3];
    check(drawNode.kind === "DrawNode", "draw kind=DrawNode");
    check(drawNode.width === 50 && drawNode.height === 50, "draw size 50x50 (from drawRect)");

    const passed = checks.filter(function (c) { return c.ok; }).length;
    const failed = checks.length - passed;
    checks.forEach(function (c) {
        console.log((c.ok ? "  PASS  " : "  FAIL  ") + c.msg);
    });
    console.log("[self-test] " + passed + "/" + checks.length + " passed" + (failed ? ", " + failed + " FAILED" : ""));

    writeCapture(args, args.name || "selftest", tree, cc.winSize);
    return failed === 0;
}

// =============================================================================
// Main
// =============================================================================

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.selfTest && !args.target) {
        console.error("Usage: generate-all.js --self-test | --target <file>");
        process.exit(1);
    }

    // Load cc-stub and extras as plain modules (they export CC)
    const cc = require(path.join(RUNTIME_DIR, "cc-stub.js"));
    const extras = require(path.join(RUNTIME_DIR, "cc-stub-extras.js"));
    extras.installIntoCC(cc);

    const sandbox = buildContext(cc);
    try {
        preloadLocalStorage(cc, args.localStorageJson);
    } catch (e) {
        console.error("[generate-all] localStorage preload failed: " + e.message);
        process.exit(5);
    }

    // Load UiExporter so we share the real _dumpNode schema with device captures.
    loadFile(sandbox, "src/util/uiExporter.js");

    if (args.selfTest) {
        const ok = runSelfTest(sandbox, args);
        process.exit(ok ? 0 : 1);
    }

    if (args.target) {
        // Load the ENTIRE jsList.js (the Cocos startup order — authoritative
        // source). We used to load only up to the target's position, but that
        // left plugin-layer modules (CommonUtil, PurchaseService, Record,
        // networkUtil, …) unloaded when the target was an early UI scene,
        // which made game.bootstrapRun() impossible. Loading everything means
        // game.bootstrapRun() can run the real init path, and any UI target
        // sees the same runtime state as on device.
        const jsListPath = path.join(SRC, "jsList.js");
        const jsListCode = fs.readFileSync(jsListPath, "utf8");
        // jsList.js is a plain `var jsList = ["...", "..."];` — extract entries.
        const entryRe = /"([^"]+\.js)"/g;
        const entries = [];
        let m;
        while ((m = entryRe.exec(jsListCode)) !== null) entries.push(m[1]);

        const targetRel = args.target.replace(/^\/+/, "");
        const targetIdx = entries.indexOf(targetRel);
        if (targetIdx < 0) {
            console.warn("[generate-all] target not found in jsList: " + targetRel + " (will still load full jsList)");
        }
        console.log("[generate-all] loading " + entries.length + " files from jsList (full)");
        let loadFailures = 0;
        for (let i = 0; i < entries.length; i++) {
            const rel = entries[i];
            try {
                loadFile(sandbox, rel);
            } catch (e) {
                loadFailures++;
                console.warn("[generate-all] load failed: " + rel + " — " + e.message);
                // Continue — some files may fail but later ones might still work.
            }
        }
        if (loadFailures) {
            console.log("[generate-all] " + loadFailures + " file(s) failed to load");
        }

        // Real GameRuntime.js (loaded from jsList) overwrites our stub and
        // starts with _state.{player,timer,emitter,record} = null. Prefer
        // running the real game.bootstrapRun() so Player/Timer/Emitter/Record
        // are constructed by the game itself — same code path as the device,
        // no per-scene stubbing. bootstrapRun is in game.js (loaded as part
        // of jsList before any UI target).
        if (sandbox.game && typeof sandbox.game.bootstrapRun === "function") {
            try {
                sandbox.game.bootstrapRun();
                console.log("[generate-all] game.bootstrapRun() ok");
            } catch (e) {
                console.warn("[generate-all] game.bootstrapRun failed: " + e.message);
                // Fall back to manual GameRuntime.bootstrap so UI ctors at
                // least have *some* runtime instances.
                if (sandbox.GameRuntime && typeof sandbox.GameRuntime.bootstrap === "function") {
                    try {
                        sandbox.GameRuntime.bootstrap({
                            player: sandbox.player,
                            timer: sandbox.timer,
                            emitter: sandbox.utils && sandbox.utils.emitter,
                            record: sandbox.Record
                        });
                    } catch (e2) {
                        console.warn("[generate-all] GameRuntime.bootstrap fallback failed: " + e2.message);
                    }
                }
            }
        }

        if (args.instantiate) {
            if (args.setupJs) {
                try {
                    vm.runInContext(args.setupJs, sandbox, { filename: "setup-js" });
                    console.log("[generate-all] setup-js ok");
                } catch (e) {
                    console.error("[generate-all] setup-js failed: " + e.message);
                    process.exit(3);
                }
            }

            const Ctor = sandbox[args.instantiate];
            if (typeof Ctor !== "function") {
                console.error("[generate-all] global '" + args.instantiate + "' not found / not a function");
                console.error("available functions: " + Object.keys(sandbox).filter(function (k) {
                    return typeof sandbox[k] === "function";
                }).sort().join(", "));
                process.exit(2);
            }
            let ctorArgs = [];
            if (args.ctorArgs) {
                ctorArgs = JSON.parse("[" + args.ctorArgs + "]");
            }
            console.log("[generate-all] new " + args.instantiate + "(" + ctorArgs.map(JSON.stringify).join(", ") + ")");
            const instance = new (Function.prototype.bind.apply(Ctor, [null].concat(ctorArgs)))();
            // Scenes built in onEnter (Cocos pattern: ctor sets state, onEnter
            // builds visible children). Register as running scene and call
            // onEnter so the UI tree is actually populated before dumping.
            try {
                if (sandbox.cc && sandbox.cc.director && typeof sandbox.cc.director.runScene === "function") {
                    sandbox.cc.director.runScene(instance);
                }
                if (typeof instance.onEnter === "function") {
                    instance.onEnter();
                }
            } catch (e) {
                console.warn("[generate-all] onEnter failed: " + e.message);
            }
            sandbox.__previewInstance = instance;
            if (args.afterJs) {
                try {
                    vm.runInContext(args.afterJs, sandbox, { filename: "after-js" });
                    console.log("[generate-all] after-js ok");
                } catch (e) {
                    console.error("[generate-all] after-js failed: " + e.message);
                    process.exit(4);
                }
            }
            const tree = dumpNode(sandbox, instance);
            const name = args.name || args.instantiate;
            writeCapture(args, name, tree, sandbox.cc.winSize);
        } else {
            // Caller asked for load only — print available globals.
            console.log("[generate-all] target loaded: " + args.target);
            console.log("[generate-all] sandbox keys (filtered):");
            Object.keys(sandbox).filter(function (k) {
                return !["cc", "console", "require", "module", "exports", "process",
                    "Buffer", "setTimeout", "clearTimeout", "setInterval",
                    "clearInterval", "JSON", "Math", "Date", "Error", "RegExp",
                    "Array", "Object", "String", "Number", "Boolean", "Function",
                    "global", "window", "game", "GameRuntime", "jsb", "utils",
                    "UiExporter"].includes(k);
            }).sort().forEach(function (k) {
                console.log("  " + k + " : " + typeof sandbox[k]);
            });
        }
    }
}

main();
