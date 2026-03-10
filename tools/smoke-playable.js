const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const repoRoot = path.resolve(__dirname, "..");
const legacyBundleChecks = [
    {
        pattern: /=>/,
        description: "arrow function"
    },
    {
        pattern: /(^|[^\w$])const\s+[A-Za-z_$]/m,
        description: "const declaration"
    },
    {
        pattern: /(^|[^\w$])let\s+[A-Za-z_$]/m,
        description: "let declaration"
    },
    {
        pattern: /(^|[^\w$])class\s+[A-Za-z_$]/m,
        description: "class declaration"
    }
];

function loadRuntimeClasses() {
    const result = esbuild.buildSync({
        stdin: {
            contents: [
                'import { NavigationAppService } from "./src-mod/app/services/NavigationAppService";',
                'import { SessionAppService } from "./src-mod/app/services/SessionAppService";',
                'import { LegacyScreenFactory, LegacyMusicPolicy } from "./src-mod/router/LegacyRouter";',
                "export { NavigationAppService, SessionAppService, LegacyScreenFactory, LegacyMusicPolicy };"
            ].join("\n"),
            resolveDir: repoRoot,
            sourcefile: "tools/smoke-playable-entry.ts",
            loader: "ts"
        },
        bundle: true,
        platform: "node",
        format: "cjs",
        write: false,
        target: ["node18"]
    });

    const output = result.outputFiles[0].text;
    const module = { exports: {} };
    const fn = new Function("require", "module", "exports", "__dirname", "__filename", output);
    fn(require, module, module.exports, repoRoot, path.join(repoRoot, "tools", "smoke-playable-entry.js"));
    return module.exports;
}

const {
    NavigationAppService,
    SessionAppService,
    LegacyScreenFactory,
    LegacyMusicPolicy
} = loadRuntimeClasses();

function resetGlobals() {
    [
        "cc",
        "Navigation",
        "Record",
        "audioManager",
        "utils",
        "HomeNode",
        "MapNode",
        "DeathNode",
        "Emitter",
        "TimerManager",
        "Player",
        "player",
        "userGuide",
        "Medal",
        "IAPPackage",
        "DataLog"
    ].forEach((key) => {
        delete globalThis[key];
    });
}

function createCtor(name) {
    function LegacyNode(userData) {
        this.nodeName = name;
        this.userData = userData;
        this.afterInitCalled = false;
    }
    LegacyNode.prototype.setName = function (nodeName) {
        this.name = nodeName;
    };
    LegacyNode.prototype.afterInit = function () {
        this.afterInitCalled = true;
    };
    return LegacyNode;
}

function runNavigationSmokeTest() {
    resetGlobals();

    const musicCalls = [];
    const savedRecords = {};
    const errorMessages = [];

    globalThis.cc = {
        error: function (message) {
            errorMessages.push(String(message));
        },
        director: {
            getRunningScene: function () {
                return null;
            }
        }
    };
    globalThis.audioManager = {
        music: {
            HOME: "home",
            MAP: "map",
            DEATH: "death",
            NPC: "npc",
            SITE_1: "site-1",
            SITE_2: "site-2",
            SITE_3: "site-3"
        },
        playMusic: function (name, loop) {
            musicCalls.push(["play", name, loop]);
        },
        stopMusic: function (name) {
            musicCalls.push(["stop", name]);
        }
    };
    globalThis.utils = {
        getRandomInt: function () {
            return 0;
        }
    };
    globalThis.Record = {
        save: function (key, value) {
            savedRecords[key] = JSON.parse(JSON.stringify(value));
        },
        saveAll: function () {
        },
        restore: function (key) {
            return savedRecords[key] ? JSON.parse(JSON.stringify(savedRecords[key])) : null;
        }
    };
    globalThis.Navigation = {
        nodeName: {
            HOME_NODE: "HomeNode",
            MAP_NODE: "MapNode",
            DEATH_NODE: "DeathNode"
        }
    };
    globalThis.HomeNode = createCtor("HomeNode");
    globalThis.MapNode = createCtor("MapNode");
    globalThis.DeathNode = createCtor("DeathNode");

    const service = new NavigationAppService(
        new LegacyScreenFactory(),
        new LegacyMusicPolicy(),
        globalThis.Navigation.nodeName
    );

    const homeNode = service.current();
    assert.equal(homeNode.nodeName, "HomeNode");
    assert.equal(homeNode.name, "bottom");
    assert.equal(homeNode.afterInitCalled, true);
    assert.deepEqual(savedRecords.navigation._array, [{ nodeName: "HomeNode" }]);
    assert.equal(globalThis.Navigation.currentMusic, "home");

    const mapNode = service.forward("MapNode", 201);
    assert.equal(mapNode.nodeName, "MapNode");
    assert.equal(mapNode.userData, 201);
    assert.equal(globalThis.Navigation.currentMusic, "map");
    assert.equal(savedRecords.navigation._array.length, 2);

    const recoveredNode = service.forward("MissingNode", 999);
    assert.equal(recoveredNode.nodeName, "MapNode");
    assert.equal(savedRecords.navigation._array.length, 2);
    assert.equal(savedRecords.navigation._array[1].nodeName, "MapNode");

    const replacedFallback = service.replace("MissingNode", 123);
    assert.equal(replacedFallback.nodeName, "MapNode");
    assert.equal(savedRecords.navigation._array.length, 2);
    assert.equal(savedRecords.navigation._array[1].nodeName, "MapNode");

    const backNode = service.back();
    assert.equal(backNode.nodeName, "HomeNode");
    assert.equal(savedRecords.navigation._array.length, 1);
    assert.equal(savedRecords.navigation._array[0].nodeName, "HomeNode");

    assert.ok(musicCalls.some((call) => call[0] === "play" && call[1] === "home"));
    assert.ok(musicCalls.some((call) => call[0] === "play" && call[1] === "map"));
    assert.ok(errorMessages.some((message) => message.indexOf("node ctor unavailable: MissingNode") !== -1));
}

function runSessionSmokeTest() {
    resetGlobals();

    const calls = [];
    let currentSlot = 1;

    globalThis.cc = {};
    globalThis.Record = {
        getCurrentRecordName: function () {
            return "slot-" + currentSlot;
        },
        setCurrentSlot: function (slot) {
            currentSlot = slot;
            calls.push(["setCurrentSlot", slot]);
        },
        init: function (recordName) {
            calls.push(["record.init", recordName]);
        },
        restore: function () {
            return null;
        },
        save: function (key, value) {
            calls.push(["record.save", key, value]);
        },
        saveAll: function () {
            calls.push(["record.saveAll"]);
        },
        deleteRecord: function (recordName) {
            calls.push(["deleteRecord", recordName]);
        },
        setType: function (type) {
            calls.push(["setType", type]);
        }
    };
    globalThis.utils = {
        emitter: {
            removeAllListeners: function () {
                calls.push(["emitter.removeAll"]);
            }
        },
        getRandomInt: function () {
            return 2;
        }
    };
    globalThis.Emitter = function () {
        calls.push(["Emitter.created"]);
        this.removeAllListeners = function () {
            calls.push(["Emitter.removeAll"]);
        };
    };
    globalThis.TimerManager = function () {
        this.stop = function () {
            calls.push(["timer.stop"]);
        };
        calls.push(["TimerManager.created"]);
    };
    globalThis.Player = function () {
        calls.push(["Player.created"]);
        this.restore = function () {
            calls.push(["player.restore"]);
        };
        this.start = function () {
            calls.push(["player.start"]);
        };
        this.relive = function () {
            calls.push(["player.relive"]);
        };
    };
    globalThis.userGuide = {
        init: function () {
            calls.push(["userGuide.init"]);
        }
    };
    globalThis.Medal = {
        newGameReset: function () {
            calls.push(["Medal.newGameReset"]);
        },
        initCompletedForOneGame: function (flag) {
            calls.push(["Medal.initCompletedForOneGame", flag]);
        }
    };
    globalThis.IAPPackage = {
        resetConsumeIAP: function () {
            calls.push(["IAP.resetConsumeIAP"]);
        },
        applyActiveTalentStartGifts: function () {
            calls.push(["IAP.applyActiveTalentStartGifts"]);
            return false;
        }
    };
    globalThis.DataLog = {
        increaseRound: function () {
            calls.push(["DataLog.increaseRound"]);
        }
    };

    const router = {
        runScene: function (sceneName) {
            calls.push(["runScene", sceneName]);
        }
    };
    const navigation = {
        init: function () {
            calls.push(["navigation.init"]);
        },
        stopMusic: function () {
            calls.push(["navigation.stopMusic"]);
        }
    };

    const service = new SessionAppService(router, navigation);
    service.startNewGame(2);
    assert.deepEqual(calls.slice(0, 7), [
        ["setCurrentSlot", 2],
        ["navigation.stopMusic"],
        ["DataLog.increaseRound"],
        ["deleteRecord", "slot-2"],
        ["setType", -1],
        ["IAP.resetConsumeIAP"],
        ["Medal.newGameReset"]
    ]);
    assert.ok(calls.some((call) => call[0] === "runScene" && call[1] === "ChooseScene"));

    calls.length = 0;
    service.continueGame(3);
    assert.ok(calls.some((call) => call[0] === "setCurrentSlot" && call[1] === 3));
    assert.ok(calls.some((call) => call[0] === "navigation.stopMusic"));
    assert.ok(calls.some((call) => call[0] === "record.init" && call[1] === "slot-3"));
    assert.ok(calls.some((call) => call[0] === "navigation.init"));
    assert.ok(calls.some((call) => call[0] === "Player.created"));
    assert.ok(calls.some((call) => call[0] === "player.restore"));
    assert.ok(calls.some((call) => call[0] === "player.start"));
    assert.ok(calls.some((call) => call[0] === "runScene" && call[1] === "MainScene"));

    calls.length = 0;
    service.reliveRuntime();
    assert.ok(calls.some((call) => call[0] === "player.relive"));
}

function runGeneratedBundleCompatibilityTest() {
    const generatedDir = path.join(repoRoot, "assets", "generated");
    const runtimeBundlePath = path.join(generatedDir, "runtime.bundle.js");
    const platformBundlePath = path.join(generatedDir, "platform.bundle.js");
    const langDir = path.join(generatedDir, "lang");
    const bundlePaths = [runtimeBundlePath, platformBundlePath];

    bundlePaths.forEach((bundlePath) => {
        assert.ok(fs.existsSync(bundlePath), "Missing generated bundle: " + path.relative(repoRoot, bundlePath));
        const sourceText = fs.readFileSync(bundlePath, "utf8");
        assert.ok(sourceText.trim().length > 0, path.relative(repoRoot, bundlePath) + " is empty");
        legacyBundleChecks.forEach((check) => {
            assert.equal(
                check.pattern.test(sourceText),
                false,
                path.relative(repoRoot, bundlePath) + " still contains legacy-incompatible syntax: " + check.description
            );
        });
    });

    if (!fs.existsSync(langDir)) {
        throw new Error("Missing generated language bundle directory: " + path.relative(repoRoot, langDir));
    }

    fs.readdirSync(langDir)
        .filter((fileName) => /\.bundle\.js$/i.test(fileName))
        .forEach((fileName) => {
            const bundlePath = path.join(langDir, fileName);
            const sourceText = fs.readFileSync(bundlePath, "utf8");
            assert.equal(
                sourceText.indexOf("})(typeof window !== 'undefined' ? window : globalThis);") !== -1,
                false,
                path.relative(repoRoot, bundlePath) + " still uses an unsafe global fallback"
            );
            assert.notEqual(
                sourceText.indexOf("typeof globalThis !== 'undefined' ? globalThis"),
                -1,
                path.relative(repoRoot, bundlePath) + " is missing the guarded global fallback"
            );
        });
}

try {
    runGeneratedBundleCompatibilityTest();
    runNavigationSmokeTest();
    runSessionSmokeTest();
    console.log("Playable smoke checks passed.");
} catch (error) {
    console.error("Playable smoke checks failed.");
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
}
