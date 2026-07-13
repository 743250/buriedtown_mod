"use strict";

const {
    loadIntoSandbox
} = require("../core");
const {
    createVmSandbox,
    createCountStorage
} = require("./runtime-boundaries");

/**
 * NPC 经济 / 电台链路共用 sandbox。
 * 覆盖：服务层 emit、读档解锁、emitter 换绑、RadioNode/MessageView 生命周期。
 */
function createEconomySandbox(options) {
    options = options || {};
    const sandbox = createVmSandbox();
    const gameDay = options.gameDay != null ? Number(options.gameDay) : 1;

    loadIntoSandbox(sandbox, "assets/src/util/emitter.js");
    loadIntoSandbox(sandbox, "assets/src/util/utils.js");
    loadIntoSandbox(sandbox, "assets/src/util/memoryUtil.js");
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    loadIntoSandbox(sandbox, "assets/src/data/npcConfig.js");
    loadIntoSandbox(sandbox, "assets/src/data/itemEconomyConfig.js");
    if (options.withBroadcastConfig) {
        loadIntoSandbox(sandbox, "assets/src/data/npcBroadcastConfig.js");
    }

    sandbox.GameRuntime.bootstrap({
        emitter: sandbox.utils.emitter,
        timer: {
            formatTime: function () {
                return { d: gameDay, h: 6, m: 0, s: 0 };
            },
            getTimeDayStr: function () {
                return "第" + (gameDay + 1) + "天";
            },
            getTimeHourStr: function () {
                return "06:00";
            }
        }
    });

    loadIntoSandbox(sandbox, "assets/src/game/NpcEconomyService.js");
    loadIntoSandbox(sandbox, "assets/src/game/RadioFeedService.js");

    if (options.withUi) {
        installUiStubs(sandbox);
        loadIntoSandbox(sandbox, "assets/src/ui/LogView.js");
    }

    return sandbox;
}

function createStorage(counts) {
    const storage = createCountStorage(counts || {});
    storage.map = storage.counts;
    return storage;
}

function createNpc(sandbox, npcId, options) {
    options = options || {};
    const id = Number(npcId);
    return {
        id: id,
        isUnlocked: options.isUnlocked !== false,
        reputation: sandbox.memoryUtil.encode(Number(options.reputation) || 0),
        storage: createStorage(options.counts),
        config: sandbox.utils.clone(sandbox.npcConfig[String(id)] || sandbox.npcConfig[id] || {}),
        getName: options.getName || function () {
            return "NPC-" + id;
        }
    };
}

function createNpcManager(sandbox, npcSpecs) {
    const npcList = {};
    Object.keys(npcSpecs || {}).forEach(function (npcId) {
        const spec = npcSpecs[npcId] || {};
        npcList[String(npcId)] = createNpc(sandbox, npcId, spec);
    });
    return {
        npcList: npcList,
        getNPC: function (id) {
            return this.npcList[String(id)] || this.npcList[id] || null;
        }
    };
}

function installMapStubs(sandbox) {
    sandbox.PurchaseAndroid = { payType: 0, PAY_TYPE_GOOGLE_PLAY: 1 };
    sandbox.adHelper = { enable: false };
    sandbox.AD_SITE = 999;
    sandbox.BOSS_SITE = 998;
    sandbox.WORK_SITE = 997;
    sandbox.HOME_SITE = 100;
    sandbox.DataLog = { genSiteLog: function () {} };
    sandbox.role = {
        getChoosenRoleType: function () {
            return 1;
        }
    };
    sandbox.RoleRuntimeService = {
        applyInitialUnlocks: function () {}
    };
    if (!sandbox.GameRuntime.getEmitter) {
        sandbox.GameRuntime.getEmitter = function () {
            return sandbox.utils.emitter;
        };
    }
}

function installUiStubs(sandbox) {
    sandbox.cc.error = function () {};
    sandbox.cc.warn = function () {};
    sandbox.cc.log = function () {};
    sandbox.cc.color = function () {
        return { r: 0, g: 0, b: 0, a: 255 };
    };
    sandbox.cc.color.WHITE = "white";
    sandbox.cc.color.RED = "red";
    sandbox.cc.color.GREEN = "green";
    sandbox.cc.color.BLACK = "black";
    sandbox.cc.color.BLUE = "blue";
    sandbox.cc.color.YELLOW = "yellow";
    sandbox.cc.color.GRAY = "gray";
    sandbox.cc.p = function (x, y) {
        return { x: x, y: y };
    };
    sandbox.cc.size = function (w, h) {
        return { width: w, height: h };
    };
    sandbox.cc.SCROLLVIEW_DIRECTION_VERTICAL = 1;

    sandbox.cc.Layer = function () {
        this.children = [];
        this.addChild = function (child) {
            this.children.push(child);
        };
        this.getChildren = function () {
            return this.children;
        };
        this.getChildByTag = function (tag) {
            for (var i = 0; i < this.children.length; i++) {
                if (this.children[i].tag === tag) {
                    return this.children[i];
                }
            }
            return null;
        };
    };

    sandbox.cc.Node = function () {
        this.children = [];
        this.width = 0;
        this.height = 0;
        this.addChild = function (child) {
            this.children.push(child);
        };
        this.setContentSize = function (w, h) {
            this.width = w;
            this.height = h;
        };
        this.setAnchorPoint = function () {};
        this.setPosition = function (x, y) {
            this.x = x;
            this.y = y;
        };
        this.getChildByTag = function (tag) {
            for (var i = 0; i < this.children.length; i++) {
                if (this.children[i].tag === tag) {
                    return this.children[i];
                }
            }
            return null;
        };
    };

    sandbox.cc.LabelTTF = function (text) {
        this.string = String(text == null ? "" : text);
        this.height = Math.max(16, Math.ceil(this.string.length / 24) * 16);
        this.width = 280;
        this.setAnchorPoint = function () {};
        this.setPosition = function () {};
        this.setColor = function () {};
        this.setString = function (s) {
            this.string = String(s == null ? "" : s);
        };
        this.tag = 0;
    };

    sandbox.cc.ScrollView = sandbox.cc.Class.extend({
        ctor: function (size, container) {
            this._viewSize = size || { width: 300, height: 200 };
            this._contentSize = {
                width: this._viewSize.width,
                height: this._viewSize.height
            };
            this.mycontainer = container || new sandbox.cc.Layer();
            this._offset = { x: 0, y: 0 };
        },
        setDirection: function () {},
        setBounceable: function () {},
        setClippingToBounds: function () {},
        setDelegate: function () {},
        getViewSize: function () {
            return this._viewSize;
        },
        getContentSize: function () {
            return this._contentSize;
        },
        setContentSize: function (w, h) {
            if (typeof w === "object" && w) {
                this._contentSize = w;
            } else {
                this._contentSize = { width: w, height: h };
            }
        },
        setContentOffset: function (p) {
            this._offset = p || { x: 0, y: 0 };
        },
        getContentOffset: function () {
            return this._offset;
        }
    });

    sandbox.uiUtil = {
        fontFamily: { normal: "Arial" },
        fontSize: { COMMON_2: 14, COMMON_3: 12 }
    };
    sandbox.UITheme = {
        colors: {
            TEXT_ERROR: "red",
            TEXT_SUCCESS: "green",
            TEXT_NORMAL: "white",
            TEXT_TITLE: "black"
        }
    };
    sandbox.Record = sandbox.Record || {};
    sandbox.Record.getUUID = function () {
        return "test-uuid";
    };
    sandbox.Navigation = {
        nodeName: {
            RADIO_NODE: "RadioNode",
            BUILD_NODE: "BuildNode"
        }
    };
    if (sandbox.utils) {
        sandbox.utils.timeToStr = function () {
            return "刚刚";
        };
    }

    // 名称查找：npc 用对象，模板字符串用 format 结果
    const prevGetString = sandbox.stringUtil.getString;
    sandbox.stringUtil.getString = function (id) {
        if (typeof id === "string" && id.indexOf("npc_") === 0) {
            return { name: "NPC-" + id.slice(4) };
        }
        if (arguments.length > 1 && (id === 1377 || id === 1378 || id === 1379 || id === 1380
            || id === "1377" || id === "1378" || id === "1379" || id === "1380")) {
            const args = Array.prototype.slice.call(arguments, 1);
            return args.join(" ");
        }
        if (typeof prevGetString === "function") {
            return prevGetString.apply(this, arguments);
        }
        return { title: "item-" + id };
    };
}

/**
 * 模拟 BuildNode._init 同步触达 checkVisible 的时序。
 * 故意不预置 this.data，强制验证 RadioNode._init 自己的初始化顺序。
 */
function createRadioNodeInitHarness(sandbox) {
    sandbox.Navigation = sandbox.Navigation || {
        nodeName: { RADIO_NODE: "RadioNode" }
    };
    sandbox.BuildNode = sandbox.cc.Class.extend({
        _init: function () {
            if (typeof this.checkVisible === "function") {
                this.checkVisible();
            }
        }
    });
    loadIntoSandbox(sandbox, "assets/src/ui/radioNode.js");

    const radioNode = Object.create(sandbox.RadioNode.prototype);
    radioNode.setName = function () {};
    radioNode.msgView = {
        addLog: function () {}
    };
    radioNode.addMsg = function (msg) {
        if (!Array.isArray(this.data)) {
            throw new Error("this.data is not initialized during flush");
        }
        this.data.push(msg);
    };
    radioNode.build = { level: 0, id: 15 };
    radioNode.bg = {
        width: 300,
        getChildByName: function () {
            return { setVisible: function () {} };
        },
        addChild: function () {}
    };
    radioNode.sectionView = { y: 200, height: 40 };
    radioNode.checkVisible = function () {
        if (this.build && this.build.level >= 0) {
            this._flushRadioFeedBuffer();
            this._bindEconomyListener();
        }
    };
    radioNode._super = function () {
        sandbox.BuildNode.prototype._init.call(this);
    };
    return radioNode;
}

module.exports = {
    createEconomySandbox: createEconomySandbox,
    createStorage: createStorage,
    createNpc: createNpc,
    createNpcManager: createNpcManager,
    installMapStubs: installMapStubs,
    installUiStubs: installUiStubs,
    createRadioNodeInitHarness: createRadioNodeInitHarness
};
