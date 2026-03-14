const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");

function readFile(relativePath) {
    return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function loadIntoSandbox(sandbox, relativePath) {
    sandbox.module = { exports: {} };
    sandbox.exports = sandbox.module.exports;
    vm.runInContext(readFile(relativePath), sandbox, { filename: relativePath });
    return sandbox.module.exports;
}

function loadJsList() {
    const sandbox = { jsList: null };
    vm.createContext(sandbox);
    vm.runInContext(readFile("assets/src/jsList.js"), sandbox, { filename: "assets/src/jsList.js" });
    return sandbox.jsList || [];
}

function getSourceIndex(list, value) {
    return list.indexOf(value);
}

function createExtendableClass() {
    function BaseClass() {
        if (typeof this.ctor === "function") {
            const result = this.ctor.apply(this, arguments);
            if (result && (typeof result === "object" || typeof result === "function")) {
                return result;
            }
        }
        return this;
    }

    BaseClass.prototype = {
        ctor: function () {},
        _super: function () {},
        addChild: function (child) {
            if (!this._children) {
                this._children = [];
            }
            this._children.push(child);
            return child;
        },
        removeChild: function (child) {
            if (!this._children) {
                return;
            }
            this._children = this._children.filter(function (entry) {
                return entry !== child;
            });
        },
        getChildByName: function (name) {
            if (!this._children) {
                return null;
            }
            for (let index = 0; index < this._children.length; index++) {
                const child = this._children[index];
                if (child && typeof child.getName === "function" && child.getName() === name) {
                    return child;
                }
                if (child && child.name === name) {
                    return child;
                }
            }
            return null;
        },
        removeAllChildren: function () {
            this._children = [];
        },
        setName: function (name) {
            this.name = name;
        },
        getName: function () {
            return this.name || null;
        },
        scheduleOnce: function (callback) {
            if (typeof callback === "function") {
                callback.call(this);
            }
        },
        schedule: function () {},
        stopAllActions: function () {},
        runAction: function () {},
        setPosition: function (x, y) {
            this.x = x;
            this.y = y;
        },
        setVisible: function (visible) {
            this.visible = visible;
        },
        setAnchorPoint: function (x, y) {
            this.anchorX = x;
            this.anchorY = y;
        },
        setContentSize: function (size) {
            if (!size) {
                return;
            }
            this.width = size.width || size[0] || this.width || 0;
            this.height = size.height || size[1] || this.height || 0;
        },
        onEnter: function () {},
        onExit: function () {}
    };

    BaseClass.extend = function (definition) {
        const Parent = this;
        const prototype = Object.create(Parent.prototype);

        Object.keys(definition || {}).forEach(function (key) {
            const property = definition[key];
            if (typeof property === "function" && typeof Parent.prototype[key] === "function") {
                prototype[key] = function () {
                    const previousSuper = this._super;
                    this._super = Parent.prototype[key];
                    try {
                        return property.apply(this, arguments);
                    } finally {
                        this._super = previousSuper;
                    }
                };
            } else {
                prototype[key] = property;
            }
        });

        function Class() {
            if (typeof this.ctor === "function") {
                const result = this.ctor.apply(this, arguments);
                if (result && (typeof result === "object" || typeof result === "function")) {
                    return result;
                }
            }
            return this;
        }

        Class.prototype = prototype;
        Class.prototype.constructor = Class;
        Class.extend = Parent.extend;
        return Class;
    };

    return BaseClass;
}

function runManifestSmoke() {
    const project = JSON.parse(readFile("assets/project.json"));
    const jsList = loadJsList();
    const preloadingSource = readFile("assets/src/util/preloading.js");
    const assetsManagerSource = readFile("assets/src/util/AssetsManager.js");
    const menuSource = readFile("assets/src/ui/MenuScene.js");

    assert(Array.isArray(project.jsList) && project.jsList.length > 0, "project.json jsList is missing");
    assert(project.jsList[0] === "src/util/preloading.js", "project.json must bootstrap via preloading.js");

    [
        "src/game/record.js",
        "src/game/GameRuntime.js",
        "src/game/game.js",
        "src/game/player.js",
        "src/ui/baseScene.js",
        "src/ui/MainScene.js",
        "src/ui/MenuScene.js",
        "src/ui/ChooseScene.js",
        "src/ui/SplashScene.js"
    ].forEach(function (relativePath) {
        assert(jsList.indexOf(relativePath) !== -1, "jsList is missing " + relativePath);
    });

    assert(getSourceIndex(jsList, "src/game/record.js") < getSourceIndex(jsList, "src/game/game.js"), "record.js must load before game.js");
    assert(getSourceIndex(jsList, "src/game/GameRuntime.js") < getSourceIndex(jsList, "src/game/game.js"), "GameRuntime.js must load before game.js");
    assert(getSourceIndex(jsList, "src/ui/baseScene.js") < getSourceIndex(jsList, "src/ui/MainScene.js"), "baseScene.js must load before MainScene.js");
    assert(getSourceIndex(jsList, "src/ui/baseScene.js") < getSourceIndex(jsList, "src/ui/MenuScene.js"), "baseScene.js must load before MenuScene.js");
    assert(getSourceIndex(jsList, "src/ui/baseScene.js") < getSourceIndex(jsList, "src/ui/ChooseScene.js"), "baseScene.js must load before ChooseScene.js");
    assert(getSourceIndex(jsList, "src/ui/topFrame.js") < getSourceIndex(jsList, "src/ui/MainScene.js"), "topFrame.js must load before MainScene.js");

    assert(/cc\.director\.runScene\(new MenuScene\(\)\);/.test(preloadingSource), "preloading.js must hand off H5 startup to MenuScene");
    assert(/cc\.loader\.loadJs\(\["src\/jsList\.js"\]/.test(assetsManagerSource), "AssetsManager.js must load jsList.js");
    assert(/cc\.director\.runScene\(new SplashScene\(\)\);/.test(assetsManagerSource) || /cc\.director\.runScene\(new MenuScene\(\)\);/.test(assetsManagerSource), "AssetsManager.js must hand off native startup to SplashScene or MenuScene");
    assert(/game\.init\(\);\s*game\.start\(\);\s*cc\.director\.runScene\(new MainScene\(\)\);/m.test(menuSource), "MenuScene continue-flow must call game.init/start and enter MainScene");

    return {
        name: "manifest",
        ok: true,
        detail: "validated startup manifest, jsList anchors and startup scene handoff contracts"
    };
}

function createPreloadingSandbox(isNative, os) {
    const loadJsCalls = [];
    const loadedScripts = [];
    const preloadCalls = [];
    const runScenes = [];
    const loaderSceneActions = [];

    const sandbox = {
        console: console,
        require: require,
        module: { exports: {} },
        exports: {},
        globalThis: null,
        jsList: null,
        sdkbox: {
            PluginChartboost: {
                init: function () {
                    sandbox.chartboostInitialized = true;
                }
            }
        },
        AssetsManagerLoaderScene: function () {
            this.sceneName = "AssetsManagerLoaderScene";
            this.loadGame = function () {
                loaderSceneActions.push("loadGame");
            };
        },
        MenuScene: function () {
            this.sceneName = "MenuScene";
        },
        cc: {
            sys: {
                isNative: !!isNative,
                os: os || "web",
                OS_IOS: "ios",
                LANGUAGE_CHINESE: "zh",
                language: "en"
            },
            loader: {
                loadJs: function (files, callback) {
                    loadJsCalls.push(files.slice());
                    if (files.length === 1 && files[0] === "src/jsList.js") {
                        sandbox.jsList = loadJsList();
                        if (typeof callback === "function") {
                            callback(null);
                        }
                        return;
                    }
                    Array.prototype.push.apply(loadedScripts, files);
                    if (typeof callback === "function") {
                        callback(null);
                    }
                }
            },
            LoaderScene: {
                preload: function (resources, callback, context) {
                    preloadCalls.push(resources.slice());
                    if (typeof callback === "function") {
                        callback.call(context || null);
                    }
                }
            },
            director: {
                runScene: function (scene) {
                    runScenes.push(scene && scene.sceneName ? scene.sceneName : "unknown-scene");
                }
            },
            Node: function Node() {}
        }
    };

    sandbox.cc.Node.prototype = {};
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);

    return {
        sandbox: sandbox,
        loadJsCalls: loadJsCalls,
        loadedScripts: loadedScripts,
        preloadCalls: preloadCalls,
        runScenes: runScenes,
        loaderSceneActions: loaderSceneActions
    };
}

function runPreloadingFlowSmoke() {
    const h5 = createPreloadingSandbox(false, "web");
    loadIntoSandbox(h5.sandbox, "assets/src/util/preloading.js");

    assert(h5.loadJsCalls.length >= 2, "H5 preloading should load jsList and expanded script files");
    assert(h5.loadJsCalls[0][0] === "src/jsList.js", "H5 preloading must start from jsList.js");
    assert(h5.loadedScripts.indexOf("src/game/game.js") !== -1, "H5 preloading did not expand game.js from jsList");
    assert(h5.loadedScripts.indexOf("src/ui/MenuScene.js") !== -1, "H5 preloading did not expand MenuScene.js from jsList");

    h5.sandbox.beginGame();
    assert(h5.preloadCalls.length === 1, "H5 beginGame should preload UI resources once");
    assert(h5.runScenes.indexOf("MenuScene") !== -1, "H5 beginGame must enter MenuScene");

    const native = createPreloadingSandbox(true, "ios");
    loadIntoSandbox(native.sandbox, "assets/src/util/preloading.js");

    assert(native.loadJsCalls.length >= 1, "Native preloading should load AssetsManager.js");
    assert(native.loadJsCalls[0][0] === "src/util/AssetsManager.js", "Native preloading must start from AssetsManager.js");

    native.sandbox.beginGame();
    assert(native.sandbox.chartboostInitialized === true, "Native iOS beginGame should initialize Chartboost");
    assert(native.runScenes.indexOf("AssetsManagerLoaderScene") !== -1, "Native beginGame must enter AssetsManagerLoaderScene");
    assert(native.loaderSceneActions.indexOf("loadGame") !== -1, "Native beginGame must trigger AssetsManagerLoaderScene.loadGame");

    return {
        name: "preloading-flow",
        ok: true,
        detail: "validated H5/native preloading branches and scene handoff"
    };
}

function runGameBootstrapSmoke() {
    const calls = {
        recordInitNames: [],
        navInit: 0,
        emitters: 0,
        timers: 0,
        players: 0,
        playerRestore: 0,
        playerStart: 0,
        userGuideInit: 0,
        medalFlags: [],
        randomPackSaved: null,
        saveAll: 0
    };

    const sandbox = {
        console: console,
        require: require,
        module: { exports: {} },
        exports: {},
        globalThis: null,
        utils: {
            getRandomInt: function (min, max) {
                return max;
            }
        },
        Record: {
            init: function (name) {
                calls.recordInitNames.push(name);
            },
            getCurrentRecordName: function () {
                return "slot1";
            },
            restore: function (key) {
                return false;
            },
            save: function (key, value) {
                calls.randomPackSaved = [key, value];
            },
            saveAll: function () {
                calls.saveAll += 1;
            },
            deleteRecord: function () {},
            setType: function () {}
        },
        Navigation: {
            init: function () {
                calls.navInit += 1;
            }
        },
        Emitter: function () {
            calls.emitters += 1;
            this.removeAllListeners = function () {};
        },
        TimerManager: function () {
            calls.timers += 1;
        },
        Player: function () {
            calls.players += 1;
            this.restore = function () {
                calls.playerRestore += 1;
            };
            this.start = function () {
                calls.playerStart += 1;
            };
            this.relive = function () {};
        },
        userGuide: {
            init: function () {
                calls.userGuideInit += 1;
            }
        },
        Medal: {
            initCompletedForOneGame: function (flag) {
                calls.medalFlags.push(flag);
            },
            newGameReset: function () {}
        },
        IAPPackage: {
            applyActiveTalentStartGifts: function () {
                return false;
            },
            resetConsumeIAP: function () {}
        },
        cc: {
            timer: null
        }
    };

    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);

    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    loadIntoSandbox(sandbox, "assets/src/game/game.js");

    assert(sandbox.game && typeof sandbox.game.init === "function", "game.init is missing");
    assert(typeof sandbox.game.start === "function", "game.start is missing");

    sandbox.game.init();
    sandbox.game.start();

    assert(calls.recordInitNames.length === 1 && calls.recordInitNames[0] === "slot1", "game.init must initialize Record with current slot");
    assert(calls.navInit === 1, "game.init must initialize Navigation once");
    assert(calls.emitters === 1, "game.init must create one runtime emitter");
    assert(calls.timers === 1, "game.init must create one timer manager");
    assert(calls.players === 1, "game.init must create one player instance");
    assert(calls.playerRestore === 1, "game.init must restore player state once");
    assert(calls.userGuideInit === 1, "game.init must initialize userGuide once");
    assert(calls.medalFlags.length === 1 && calls.medalFlags[0] === false, "game.init must reset Medal completion flag for current game");
    assert(Array.isArray(calls.randomPackSaved) && calls.randomPackSaved[0] === "randomPack", "game.init must backfill randomPack when missing");
    assert(sandbox.GameRuntime.getPlayer() === sandbox.player, "game.init must sync global player through GameRuntime");
    assert(sandbox.cc.timer === sandbox.GameRuntime.getTimer(), "game.init must sync timer through GameRuntime");
    assert(calls.playerStart === 1, "game.start must invoke player.start once");

    return {
        name: "game-bootstrap",
        ok: true,
        detail: "validated game.init/game.start bootstrap contract against stub runtime"
    };
}

function createSceneDefinitionSandbox() {
    const BaseClass = createExtendableClass();
    const NodeClass = BaseClass.extend({});
    const LayerClass = NodeClass.extend({});
    const SceneClass = NodeClass.extend({});
    const state = {
        spriteFrames: []
    };

    const sandbox = {
        console: console,
        require: require,
        module: { exports: {} },
        exports: {},
        globalThis: null,
        window: null,
        APP_NAVIGATION: null,
        PurchaseAndroid: {
            exitGame: function () {}
        },
        BottomFrameNode: function () {},
        BossSiteNode: function () {},
        uiUtil: {
            showBackMenuDialog: function () {}
        },
        game: {
            stop: function () {}
        },
        autoSpriteFrameController: {
            addSpriteFrames: function (file) {
                state.spriteFrames.push(file);
            }
        },
        Navigation: {
            current: function () {
                return new NodeClass();
            },
            stopMusic: function () {}
        },
                TopFrameNode: NodeClass.extend({}),
        DialogBig: LayerClass.extend({}),
        DialogTiny: LayerClass.extend({}),
        Record: {
            validateRecord: function () {}
        },
        cc: {
            KEY: {
                back: "back"
            },
            winSize: {
                width: 640,
                height: 1136
            },
            visibleRect: {
                width: 640,
                height: 1136
            },
            EventListener: {
                KEYBOARD: "keyboard",
                create: function (config) {
                    return config;
                }
            },
            eventManager: {
                addListener: function () {}
            },
            director: {
                runScene: function () {},
                popScene: function () {},
                getRunningScene: function () {
                    return new SceneClass();
                }
            },
            spriteFrameCache: {
                removeSpriteFramesFromFile: function () {}
            },
            Node: NodeClass,
            Layer: LayerClass,
            Scene: SceneClass,
            Class: BaseClass,
            log: function () {}
        }
    };

    sandbox.globalThis = sandbox;
    sandbox.window = sandbox;
    vm.createContext(sandbox);

    return {
        sandbox: sandbox,
        state: state
    };
}

function runSceneDefinitionSmoke() {
    const setup = createSceneDefinitionSandbox();
    const sandbox = setup.sandbox;

    loadIntoSandbox(sandbox, "assets/src/ui/baseScene.js");
    loadIntoSandbox(sandbox, "assets/src/ui/MainScene.js");
    loadIntoSandbox(sandbox, "assets/src/ui/MenuScene.js");
    loadIntoSandbox(sandbox, "assets/src/ui/ChooseScene.js");

    assert(typeof sandbox.BaseScene === "function", "BaseScene failed to load into startup sandbox");
    assert(typeof sandbox.MainScene === "function", "MainScene failed to load into startup sandbox");
    assert(typeof sandbox.MenuScene === "function", "MenuScene failed to load into startup sandbox");
    assert(typeof sandbox.ChooseScene === "function", "ChooseScene failed to load into startup sandbox");

    const menuScene = new sandbox.MenuScene(false);
    const mainScene = new sandbox.MainScene();

    assert(menuScene.sceneName === "MenuScene", "MenuScene ctor contract changed unexpectedly");
    assert(mainScene.getChildByName("main"), "MainScene ctor must attach main layer");
    assert(setup.state.spriteFrames.indexOf("res/menu.plist") !== -1, "MenuScene/MainScene should register menu sprite frames");

    return {
        name: "scene-definitions",
        ok: true,
        detail: "validated BaseScene/MenuScene/MainScene/ChooseScene definitions with lightweight VM loading"
    };
}

function main() {
    const checks = [
        runManifestSmoke(),
        runPreloadingFlowSmoke(),
        runGameBootstrapSmoke(),
        runSceneDefinitionSmoke()
    ];

    console.log("Startup smoke checks passed:");
    checks.forEach(function (check) {
        console.log("- " + check.name + ": " + check.detail);
    });
}

try {
    main();
} catch (error) {
    console.error("Startup smoke checks failed:");
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
}


