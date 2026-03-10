var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var BuriedTownRuntimeBundle = (function () {
    // src-mod/shared/global.ts
    function getGlobalScope() {
        if (typeof globalThis !== "undefined") {
            return globalThis;
        }
        if (typeof window !== "undefined") {
            return window;
        }
        if (typeof self !== "undefined") {
            return self;
        }
        return Function("return this")();
    }
    // src-mod/bootstrap/BootstrapPatches.ts
    var SOUND_STORAGE_KEY = "sound";
    function getCc() {
        return getGlobalScope().cc || null;
    }
    function needSound() {
        var cc = getCc();
        if (!cc || !cc.sys || !cc.sys.localStorage) {
            return true;
        }
        var rawValue = cc.sys.localStorage.getItem(SOUND_STORAGE_KEY) || 1;
        return rawValue == 1;
    }
    function setSound(isOn) {
        var cc = getCc();
        if (!cc || !cc.sys || !cc.sys.localStorage) {
            return;
        }
        cc.sys.localStorage.setItem(SOUND_STORAGE_KEY, isOn ? 1 : 2);
    }
    var LOG_LEVEL = {
        v: { name: "verbose", level: 1 },
        i: { name: "info", level: 2 },
        w: { name: "warn", level: 3 },
        d: { name: "debug", level: 4 },
        e: { name: "error", level: 5 }
    };
    var BootstrapPatches = {
        _installed: false,
        install: function () {
            var globalScope2 = getGlobalScope();
            var cc = globalScope2.cc;
            if (!cc || this._installed) {
                return;
            }
            this._installed = true;
            globalScope2.setSound = setSound;
            globalScope2.needSound = needSound;
            cc.ENVIRONMENT_COCOS = cc.log ? 1 : 0;
            if (!cc.originAudioEngine) {
                cc.originAudioEngine = {};
            }
            if (cc.audioEngine) {
                cc.originAudioEngine.playEffect = function (char, loop) {
                    if (!needSound()) {
                        return;
                    }
                    return cc.audioEngine.playEffect(char, loop);
                };
                cc.originAudioEngine.stopEffect = function (effectId) {
                    if (!needSound()) {
                        return;
                    }
                    cc.audioEngine.stopEffect(effectId);
                };
                cc.originAudioEngine.playMusic = function (url, loop) {
                    if (!needSound()) {
                        return;
                    }
                    cc.audioEngine.playMusic(url, loop);
                };
                cc.originAudioEngine.stopMusic = function (releaseData) {
                    if (!needSound()) {
                        return;
                    }
                    cc.audioEngine.stopMusic(releaseData);
                };
            }
            if (!cc.originLog) {
                cc.originLog = cc.log ? cc.log.bind(cc) : function () {
                };
            }
            if (!cc._log) {
                cc._log = function (levelInfo, message) {
                    if (LOG_LEVEL.v.level > levelInfo.level) {
                        return;
                    }
                    cc.originLog("[t " + levelInfo.name + "]" + message);
                };
            }
            cc.log = function (message) {
                cc._log(LOG_LEVEL.v, message);
            };
            cc.v = function (message) {
                cc._log(LOG_LEVEL.v, message);
            };
            cc.i = function (message) {
                cc._log(LOG_LEVEL.i, message);
            };
            cc.w = function (message) {
                cc._log(LOG_LEVEL.w, message);
            };
            cc.d = function (message) {
                cc._log(LOG_LEVEL.d, message);
            };
            cc.e = function (message) {
                cc._log(LOG_LEVEL.e, message);
            };
        }
    };
    // src-mod/bootstrap/DebugFlags.ts
    var STORAGE_KEY = {
        PURCHASE_BYPASS_SDK: "debug_purchase_bypass_sdk",
        PURCHASE_AUTO_UNLOCK: "debug_purchase_auto_unlock",
        CONTENT_VALIDATION: "debug_content_validation"
    };
    function getLocalStorage() {
        var globalScope2 = getGlobalScope();
        var cc = globalScope2.cc;
        return cc && cc.sys && cc.sys.localStorage ? cc.sys.localStorage : null;
    }
    function readBoolFlag(storageKey, fallbackValue) {
        var storage = getLocalStorage();
        if (!storage || !storageKey) {
            return fallbackValue;
        }
        var rawValue = storage.getItem(storageKey);
        if (rawValue === null || rawValue === void 0 || rawValue === "") {
            return fallbackValue;
        }
        var normalized = ("" + rawValue).toLowerCase();
        if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
            return true;
        }
        if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
            return false;
        }
        return fallbackValue;
    }
    var DebugFlags = {
        STORAGE_KEY: STORAGE_KEY,
        isContentValidationEnabled: function () {
            return readBoolFlag(STORAGE_KEY.CONTENT_VALIDATION, false);
        },
        getPurchaseDebugFlags: function () {
            return {
                unlockAllRoleAndTalentForTest: readBoolFlag(STORAGE_KEY.PURCHASE_AUTO_UNLOCK, false),
                bypassPaySdkForTest: readBoolFlag(STORAGE_KEY.PURCHASE_BYPASS_SDK, false)
            };
        },
        createLegacyEnvironmentConfig: function () {
            return {
                STORAGE_KEY: STORAGE_KEY,
                isContentValidationEnabled: this.isContentValidationEnabled.bind(this),
                getPurchaseDebugFlags: this.getPurchaseDebugFlags.bind(this)
            };
        }
    };
    // src-mod/domain/save/SaveGameV2.ts
    var SAVE_GAME_VERSION = 2;
    var SaveGameV2 = {
        createEnvelope: function (slot, data, previousEnvelope) {
            var now = ( /* @__PURE__ */new Date()).toISOString();
            return {
                saveVersion: SAVE_GAME_VERSION,
                slot: slot,
                createdAt: previousEnvelope && previousEnvelope.createdAt ? previousEnvelope.createdAt : now,
                updatedAt: now,
                data: data || {},
                meta: previousEnvelope && previousEnvelope.meta ? previousEnvelope.meta : {}
            };
        },
        isEnvelope: function (value) {
            return !!(value && typeof value === "object" && Number(value.saveVersion) === SAVE_GAME_VERSION && value.data && typeof value.data === "object");
        }
    };
    // src-mod/app/services/SessionAppService.ts
    var SessionAppService = /** @class */ (function () {
        function SessionAppService(router, navigation) {
            this.router = router;
            this.navigation = navigation || null;
        }
        SessionAppService.prototype.stopActiveMusic = function () {
            var globalScope2 = getGlobalScope();
            if (this.navigation && typeof this.navigation.stopMusic === "function") {
                this.navigation.stopMusic();
                return;
            }
            if (globalScope2.audioManager && typeof globalScope2.audioManager.stopMusic === "function") {
                globalScope2.audioManager.stopMusic(globalScope2.audioManager.music && globalScope2.audioManager.music.MAIN_PAGE);
            }
        };
        SessionAppService.prototype.initRuntime = function () {
            var globalScope2 = getGlobalScope();
            if (globalScope2.Record && typeof globalScope2.Record.init === "function") {
                globalScope2.Record.init(globalScope2.Record.getCurrentRecordName());
            }
            if (this.navigation && typeof this.navigation.init === "function") {
                this.navigation.init();
            }
            else if (globalScope2.Navigation && typeof globalScope2.Navigation.init === "function") {
                globalScope2.Navigation.init();
            }
            if (globalScope2.utils && globalScope2.utils.emitter) {
                globalScope2.utils.emitter.removeAllListeners();
            }
            if (globalScope2.utils && typeof globalScope2.Emitter === "function") {
                globalScope2.utils.emitter = new globalScope2.Emitter();
            }
            if (globalScope2.cc && typeof globalScope2.TimerManager === "function") {
                globalScope2.cc.timer = new globalScope2.TimerManager();
            }
            if (typeof globalScope2.Player === "function") {
                globalScope2.player = new globalScope2.Player();
            }
            if (globalScope2.player && typeof globalScope2.player.restore === "function") {
                globalScope2.player.restore();
            }
            if (globalScope2.userGuide && typeof globalScope2.userGuide.init === "function") {
                globalScope2.userGuide.init();
            }
            if (globalScope2.Medal && typeof globalScope2.Medal.initCompletedForOneGame === "function") {
                globalScope2.Medal.initCompletedForOneGame(false);
            }
            if (globalScope2.Record && typeof globalScope2.Record.restore === "function" && !globalScope2.Record.restore("randomPack") && typeof globalScope2.Record.save === "function" && globalScope2.utils && typeof globalScope2.utils.getRandomInt === "function") {
                globalScope2.Record.save("randomPack", globalScope2.utils.getRandomInt(1, 2));
            }
            return globalScope2.player || null;
        };
        SessionAppService.prototype.startRuntime = function () {
            var globalScope2 = getGlobalScope();
            if (globalScope2.player && typeof globalScope2.player.start === "function") {
                globalScope2.player.start();
            }
            if (globalScope2.IAPPackage && typeof globalScope2.IAPPackage.applyActiveTalentStartGifts === "function" && globalScope2.player) {
                var gifted = globalScope2.IAPPackage.applyActiveTalentStartGifts(globalScope2.player);
                if (gifted && globalScope2.Record && typeof globalScope2.Record.saveAll === "function") {
                    globalScope2.Record.saveAll();
                }
            }
        };
        SessionAppService.prototype.stopRuntime = function () {
            var globalScope2 = getGlobalScope();
            if (globalScope2.cc && globalScope2.cc.timer) {
                globalScope2.cc.timer.stop();
            }
        };
        SessionAppService.prototype.prepareNewGame = function () {
            var globalScope2 = getGlobalScope();
            if (globalScope2.Record && typeof globalScope2.Record.deleteRecord === "function") {
                globalScope2.Record.deleteRecord(globalScope2.Record.getCurrentRecordName());
            }
            if (globalScope2.Record && typeof globalScope2.Record.setType === "function") {
                globalScope2.Record.setType(-1);
            }
            if (globalScope2.IAPPackage && typeof globalScope2.IAPPackage.resetConsumeIAP === "function") {
                globalScope2.IAPPackage.resetConsumeIAP();
            }
            if (globalScope2.Medal && typeof globalScope2.Medal.newGameReset === "function") {
                globalScope2.Medal.newGameReset();
            }
            if (globalScope2.Medal && typeof globalScope2.Medal.initCompletedForOneGame === "function") {
                globalScope2.Medal.initCompletedForOneGame(true);
            }
        };
        SessionAppService.prototype.reliveRuntime = function () {
            var globalScope2 = getGlobalScope();
            this.initRuntime();
            this.startRuntime();
            if (globalScope2.player && typeof globalScope2.player.relive === "function") {
                globalScope2.player.relive();
            }
        };
        SessionAppService.prototype.startNewGame = function (slot) {
            var globalScope2 = getGlobalScope();
            if (globalScope2.Record && typeof globalScope2.Record.setCurrentSlot === "function") {
                globalScope2.Record.setCurrentSlot(slot);
            }
            this.stopActiveMusic();
            if (globalScope2.DataLog && typeof globalScope2.DataLog.increaseRound === "function") {
                globalScope2.DataLog.increaseRound();
            }
            this.prepareNewGame();
            this.router.runScene("ChooseScene");
        };
        SessionAppService.prototype.continueGame = function (slot) {
            var globalScope2 = getGlobalScope();
            if (globalScope2.Record && typeof globalScope2.Record.setCurrentSlot === "function") {
                globalScope2.Record.setCurrentSlot(slot);
            }
            this.stopActiveMusic();
            this.initRuntime();
            this.startRuntime();
            this.router.runScene("MainScene");
        };
        SessionAppService.prototype.relive = function () {
            this.reliveRuntime();
        };
        SessionAppService.prototype.saveAll = function () {
            var globalScope2 = getGlobalScope();
            if (globalScope2.Record && typeof globalScope2.Record.saveAll === "function") {
                globalScope2.Record.saveAll();
            }
        };
        return SessionAppService;
    }());
    // src-mod/app/services/WorldAppService.ts
    var WorldAppService = /** @class */ (function () {
        function WorldAppService() {
        }
        WorldAppService.prototype.getPlayer = function () {
            return getGlobalScope().player || null;
        };
        WorldAppService.prototype.supportsZiplineFramework = function () {
            var globalScope2 = getGlobalScope();
            return !!(globalScope2.RoleRuntimeService && typeof globalScope2.RoleRuntimeService.isZiplineFrameworkAvailable === "function" && globalScope2.player && globalScope2.RoleRuntimeService.isZiplineFrameworkAvailable(globalScope2.player));
        };
        WorldAppService.prototype.enterWorldMap = function () {
            var player = this.getPlayer();
            if (player && typeof player.enterWorldMap === "function") {
                player.enterWorldMap();
            }
        };
        WorldAppService.prototype.enterSite = function (siteId) {
            var player = this.getPlayer();
            if (player && typeof player.enterSite === "function") {
                player.enterSite(siteId);
            }
        };
        return WorldAppService;
    }());
    // src-mod/app/services/TravelAppService.ts
    var TravelAppService = /** @class */ (function () {
        function TravelAppService() {
        }
        TravelAppService.prototype.buildPlan = function (startPos, endPos) {
            var globalScope2 = getGlobalScope();
            if (!globalScope2.TravelService || typeof globalScope2.TravelService.buildPlan !== "function") {
                return null;
            }
            var player = globalScope2.player || {};
            return globalScope2.TravelService.buildPlan({
                startPos: startPos,
                endPos: endPos,
                storage: player.storage || null,
                weather: player.weather || null,
                ziplineNetwork: player.ziplineNetwork || null,
                map: player.map || null
            });
        };
        return TravelAppService;
    }());
    // src-mod/app/services/CombatAppService.ts
    var CombatAppService = /** @class */ (function () {
        function CombatAppService() {
        }
        CombatAppService.prototype.createBattle = function (battleInfo, isDodge) {
            var globalScope2 = getGlobalScope();
            if (typeof globalScope2.Battle !== "function") {
                return null;
            }
            return new globalScope2.Battle(battleInfo, !!isDodge);
        };
        return CombatAppService;
    }());
    // src-mod/app/services/NavigationAppService.ts
    var NavigationAppService = /** @class */ (function () {
        function NavigationAppService(screenFactory, musicPolicy, nodeNames) {
            this.screenFactory = screenFactory;
            this.musicPolicy = musicPolicy;
            this.nodeNames = nodeNames || {};
            this.stack = [];
            this.currentMusic = null;
            this.siteMusic = null;
        }
        NavigationAppService.prototype.getGlobalNavigation = function () {
            return getGlobalScope().Navigation || null;
        };
        NavigationAppService.prototype.syncFacade = function () {
            var navigationFacade = this.getGlobalNavigation();
            if (!navigationFacade) {
                return;
            }
            navigationFacade._array = this.stack.slice();
            navigationFacade.currentMusic = this.currentMusic;
            navigationFacade.siteMusic = this.siteMusic;
        };
        NavigationAppService.prototype.ensureStack = function () {
            if (!Array.isArray(this.stack)) {
                this.stack = [];
            }
        };
        NavigationAppService.prototype.logNavigationError = function (message) {
            var globalScope2 = getGlobalScope();
            if (globalScope2.cc && typeof globalScope2.cc.error === "function") {
                globalScope2.cc.error("[Navigation] " + message);
            }
        };
        NavigationAppService.prototype.createNodeForEntry = function (nodeInfo) {
            if (!nodeInfo || !nodeInfo.nodeName) {
                return null;
            }
            var node = this.screenFactory.createNode(nodeInfo.nodeName, nodeInfo.userData);
            if (!node) {
                this.logNavigationError("node ctor unavailable: " + nodeInfo.nodeName);
                return null;
            }
            if (typeof node.setName === "function") {
                node.setName("bottom");
            }
            return node;
        };
        NavigationAppService.prototype.commitCurrentNode = function (nodeInfo, node) {
            this.applyMusic(nodeInfo.nodeName);
            this.save();
            if (typeof node.afterInit === "function") {
                node.afterInit();
            }
            return node;
        };
        NavigationAppService.prototype.renderCurrentNode = function (pruneInvalidEntries) {
            this.ensureStack();
            if (this.stack.length === 0) {
                return this.forward(this.nodeNames.HOME_NODE);
            }
            var nodeInfo = this.stack[this.stack.length - 1];
            var node = this.createNodeForEntry(nodeInfo);
            while (!node && pruneInvalidEntries && this.stack.length > 1) {
                this.stack.pop();
                this.syncFacade();
                nodeInfo = this.stack[this.stack.length - 1];
                node = this.createNodeForEntry(nodeInfo);
            }
            if (!node) {
                return null;
            }
            return this.commitCurrentNode(nodeInfo, node);
        };
        NavigationAppService.prototype.withStackMutation = function (mutator) {
            var previousStack = this.stack.slice();
            mutator();
            var node = this.renderCurrentNode(false);
            if (node) {
                return node;
            }
            this.stack = previousStack.slice();
            this.syncFacade();
            if (this.stack.length === 0) {
                return null;
            }
            return this.current();
        };
        NavigationAppService.prototype.resolveMusicName = function (nodeName) {
            var globalScope2 = getGlobalScope();
            var audioManager = globalScope2.audioManager;
            if (!audioManager || !audioManager.music) {
                return null;
            }
            switch (nodeName) {
                case this.nodeNames.HOME_NODE:
                case this.nodeNames.BUILD_NODE:
                case this.nodeNames.STORAGE_NODE:
                case this.nodeNames.GATE_NODE:
                case this.nodeNames.RADIO_NODE:
                case this.nodeNames.GATE_OUT_NODE:
                    return audioManager.music.HOME;
                case this.nodeNames.DEATH_NODE:
                    this.changeSiteMusic();
                    return audioManager.music.DEATH;
                case this.nodeNames.MAP_NODE:
                    this.changeSiteMusic();
                    return audioManager.music.MAP;
                case this.nodeNames.NPC_NODE:
                case this.nodeNames.NPC_STORAGE_NODE:
                    return audioManager.music.NPC;
                case this.nodeNames.SITE_NODE:
                case this.nodeNames.AD_SITE_NODE:
                case this.nodeNames.WORK_SITE_NODE:
                case this.nodeNames.BOSS_SITE_NODE:
                case this.nodeNames.SITE_STORAGE_NODE:
                case this.nodeNames.BATTLE_AND_WORK_NODE:
                case this.nodeNames.WORK_ROOM_STORAGE_NODE:
                    return this.getSiteMusic();
                default:
                    return null;
            }
        };
        NavigationAppService.prototype.applyMusic = function (nodeName) {
            var globalScope2 = getGlobalScope();
            var audioManager = globalScope2.audioManager;
            var musicName = this.resolveMusicName(nodeName);
            if (!audioManager || !musicName || musicName === this.currentMusic) {
                this.syncFacade();
                return;
            }
            if (this.currentMusic) {
                audioManager.stopMusic(this.currentMusic);
            }
            this.currentMusic = musicName;
            audioManager.playMusic(this.currentMusic, true);
            this.syncFacade();
        };
        NavigationAppService.prototype.init = function () {
            this.stack = [];
            this.currentMusic = null;
            this.siteMusic = null;
            this.restore();
            this.syncFacade();
            return this;
        };
        NavigationAppService.prototype.forward = function (nodeName, userData) {
            var _this = this;
            this.ensureStack();
            return this.withStackMutation(function () {
                _this.stack.push({
                    nodeName: nodeName,
                    userData: userData
                });
            });
        };
        NavigationAppService.prototype.back = function () {
            var _this = this;
            this.ensureStack();
            return this.withStackMutation(function () {
                if (_this.stack.length > 0) {
                    _this.stack.pop();
                }
            });
        };
        NavigationAppService.prototype.current = function () {
            return this.renderCurrentNode(true);
        };
        NavigationAppService.prototype.getSiteMusic = function () {
            var globalScope2 = getGlobalScope();
            var audioManager = globalScope2.audioManager;
            if (!audioManager || !audioManager.music) {
                return null;
            }
            if (!this.siteMusic) {
                var musicPool = [audioManager.music.SITE_1, audioManager.music.SITE_2, audioManager.music.SITE_3];
                var utils = globalScope2.utils;
                var randomIndex = utils && typeof utils.getRandomInt === "function" ? utils.getRandomInt(0, musicPool.length - 1) : 0;
                this.siteMusic = musicPool[randomIndex];
            }
            this.syncFacade();
            return this.siteMusic;
        };
        NavigationAppService.prototype.changeSiteMusic = function () {
            this.siteMusic = null;
            this.syncFacade();
        };
        NavigationAppService.prototype.stopMusic = function () {
            var globalScope2 = getGlobalScope();
            if (this.currentMusic && globalScope2.audioManager) {
                globalScope2.audioManager.stopMusic(this.currentMusic);
            }
            this.syncFacade();
        };
        NavigationAppService.prototype.root = function (nodeName, userData) {
            var _this = this;
            this.ensureStack();
            return this.withStackMutation(function () {
                _this.stack = [{
                        nodeName: nodeName,
                        userData: userData
                    }];
                _this.syncFacade();
            });
        };
        NavigationAppService.prototype.replace = function (nodeName, userData) {
            var _this = this;
            this.ensureStack();
            return this.withStackMutation(function () {
                if (_this.stack.length > 0) {
                    _this.stack.pop();
                }
                _this.stack.push({
                    nodeName: nodeName,
                    userData: userData
                });
            });
        };
        NavigationAppService.prototype.getClz = function (nodeName) {
            return this.screenFactory.getCtor(nodeName);
        };
        NavigationAppService.prototype.gotoDeathNode = function () {
            var globalScope2 = getGlobalScope();
            var runningScene = globalScope2.cc && globalScope2.cc.director && typeof globalScope2.cc.director.getRunningScene === "function" ? globalScope2.cc.director.getRunningScene() : null;
            if (!runningScene) {
                return null;
            }
            if (typeof runningScene.removeChildByName === "function") {
                runningScene.removeChildByName("dialog");
            }
            var layer = typeof runningScene.getChildByName === "function" ? runningScene.getChildByName("main") : null;
            if (!layer) {
                return null;
            }
            if (typeof layer.removeChildByName === "function") {
                layer.removeChildByName("bottom");
            }
            var deathNode = this.root(this.nodeNames.DEATH_NODE);
            if (deathNode && typeof layer.addChild === "function") {
                layer.addChild(deathNode);
            }
            return deathNode;
        };
        NavigationAppService.prototype.save = function () {
            var globalScope2 = getGlobalScope();
            if (!globalScope2.Record || typeof globalScope2.Record.save !== "function") {
                return;
            }
            globalScope2.Record.save("navigation", {
                _array: this.stack.slice()
            });
            if (typeof globalScope2.Record.saveAll === "function") {
                globalScope2.Record.saveAll();
            }
            this.syncFacade();
        };
        NavigationAppService.prototype.restore = function () {
            var globalScope2 = getGlobalScope();
            if (!globalScope2.Record || typeof globalScope2.Record.restore !== "function") {
                this.stack = [];
                this.syncFacade();
                return this.stack;
            }
            var saveObj = globalScope2.Record.restore("navigation");
            this.stack = saveObj && Array.isArray(saveObj._array) ? saveObj._array.slice() : [];
            this.syncFacade();
            return this.stack;
        };
        NavigationAppService.prototype.getCurrentMusic = function () {
            return this.currentMusic;
        };
        return NavigationAppService;
    }());
    // src-mod/app/services/CommerceAppService.ts
    var TALENT_LEVEL_TEXT_MAP = {
        1: "\u4E00",
        2: "\u4E8C",
        3: "\u4E09"
    };
    var CommerceAppService = /** @class */ (function () {
        function CommerceAppService() {
        }
        CommerceAppService.prototype.normalizePurchaseId = function (purchaseId) {
            var normalized = parseInt(String(purchaseId), 10);
            return isNaN(normalized) ? null : normalized;
        };
        CommerceAppService.prototype.clonePlainObject = function (value) {
            if (!value || typeof value !== "object") {
                return {};
            }
            var clone = {};
            Object.keys(value).forEach(function (key) {
                clone[key] = value[key];
            });
            return clone;
        };
        CommerceAppService.prototype.initPackage = function () {
            var globalScope2 = getGlobalScope();
            if (globalScope2.PurchaseService && typeof globalScope2.PurchaseService.initPackage === "function") {
                globalScope2.PurchaseService.initPackage();
            }
        };
        CommerceAppService.prototype.isPaySdkBypassedForTest = function () {
            var globalScope2 = getGlobalScope();
            return !!(globalScope2.PurchaseService && typeof globalScope2.PurchaseService.isPaySdkBypassedForTest === "function" && globalScope2.PurchaseService.isPaySdkBypassedForTest());
        };
        CommerceAppService.prototype.getRoleTypeByPurchaseId = function (purchaseId) {
            var globalScope2 = getGlobalScope();
            var resolvedPurchaseId = this.normalizePurchaseId(purchaseId);
            if (resolvedPurchaseId === null || !globalScope2.PurchaseService || typeof globalScope2.PurchaseService.getExchangeIdsByPurchaseId !== "function" || !globalScope2.ExchangeAchievementConfig) {
                return null;
            }
            var exchangeIds = globalScope2.PurchaseService.getExchangeIdsByPurchaseId(resolvedPurchaseId) || [];
            if (!exchangeIds.length) {
                return null;
            }
            var exchangeConfig = globalScope2.ExchangeAchievementConfig[exchangeIds[0]];
            if (!exchangeConfig || exchangeConfig.type !== "character") {
                return null;
            }
            return exchangeConfig.targetId;
        };
        CommerceAppService.prototype.getPurchaseStringConfig = function (purchaseId) {
            var globalScope2 = getGlobalScope();
            var resolvedPurchaseId = this.normalizePurchaseId(purchaseId);
            var fallbackName = resolvedPurchaseId === null ? "ID unknown" : "ID " + resolvedPurchaseId;
            var stringKey = resolvedPurchaseId === null ? null : "p_" + resolvedPurchaseId;
            var rawConfig = stringKey && globalScope2.stringUtil && typeof globalScope2.stringUtil.getString === "function" ? globalScope2.stringUtil.getString(stringKey) : null;
            var strConfig = this.clonePlainObject(rawConfig);
            if (typeof strConfig.name !== "string" || strConfig.name.length === 0) {
                strConfig.name = fallbackName;
            }
            if (typeof strConfig.des !== "string") {
                strConfig.des = "";
            }
            if (typeof strConfig.effect !== "string") {
                strConfig.effect = "";
            }
            if (!/^ID\s+\d+$/.test(strConfig.name) || resolvedPurchaseId === null || !globalScope2.PurchaseService || typeof globalScope2.PurchaseService.getExchangeIdsByPurchaseId !== "function" || !globalScope2.ExchangeAchievementConfig) {
                return strConfig;
            }
            var exchangeIds = globalScope2.PurchaseService.getExchangeIdsByPurchaseId(resolvedPurchaseId) || [];
            if (!exchangeIds.length) {
                return strConfig;
            }
            var exchangeConfig = globalScope2.ExchangeAchievementConfig[exchangeIds[0]];
            if (!exchangeConfig || exchangeConfig.type !== "character") {
                return strConfig;
            }
            var roleInfo = globalScope2.role && typeof globalScope2.role.getRoleInfo === "function" ? globalScope2.role.getRoleInfo(exchangeConfig.targetId) : null;
            if (roleInfo) {
                strConfig.name = roleInfo.name || strConfig.name;
                if (!strConfig.des) {
                    strConfig.des = roleInfo.des || "";
                }
                if (!strConfig.effect) {
                    strConfig.effect = roleInfo.effect || "";
                }
                return strConfig;
            }
            if (exchangeConfig.name) {
                strConfig.name = exchangeConfig.name;
            }
            return strConfig;
        };
        CommerceAppService.prototype.getTalentDisplayInfo = function (purchaseId, baseName) {
            var globalScope2 = getGlobalScope();
            var resolvedPurchaseId = this.normalizePurchaseId(purchaseId);
            if (resolvedPurchaseId === null || !globalScope2.PurchaseService || typeof globalScope2.PurchaseService.isTalentPurchase !== "function" || !globalScope2.PurchaseService.isTalentPurchase(resolvedPurchaseId)) {
                return null;
            }
            var currentLevel = globalScope2.Medal && typeof globalScope2.Medal.getTalentLevel === "function" ? globalScope2.Medal.getTalentLevel(resolvedPurchaseId) : 0;
            var maxLevel = globalScope2.TalentService && typeof globalScope2.TalentService.getTalentMaxLevel === "function" ? globalScope2.TalentService.getTalentMaxLevel(resolvedPurchaseId) : 3;
            var nextLevel = currentLevel >= maxLevel ? maxLevel : currentLevel + 1;
            var strConfig = this.getPurchaseStringConfig(resolvedPurchaseId);
            var talentName = baseName || strConfig.name || "";
            var baseDes = (strConfig.des || "").replace(/\\n/g, "\n");
            var effectList = globalScope2.TalentService && typeof globalScope2.TalentService.getTalentTierEffectTextList === "function" ? globalScope2.TalentService.getTalentTierEffectTextList(resolvedPurchaseId) : [];
            if (!Array.isArray(effectList) || effectList.length === 0) {
                var fallbackEffect = (strConfig.effect || "").replace(/\\n/g, "\n") || "\u6548\u679C\u589E\u5F3A";
                effectList = [];
                for (var effectIndex = 0; effectIndex < maxLevel; effectIndex++) {
                    effectList.push(fallbackEffect);
                }
            }
            var tierLines = [];
            for (var level = 1; level <= maxLevel; level++) {
                var tierEffectText = effectList[level - 1] || effectList[effectList.length - 1] || "\u6548\u679C\u589E\u5F3A";
                tierLines.push((TALENT_LEVEL_TEXT_MAP[level] || String(level)) + "\u7EA7 " + tierEffectText);
            }
            var currentEffectText = currentLevel >= 1 ? effectList[Math.max(0, Math.min(effectList.length - 1, currentLevel - 1))] || "" : "\u65E0";
            var nextEffectText = currentLevel >= maxLevel ? "\u65E0" : effectList[Math.max(0, Math.min(effectList.length - 1, nextLevel - 1))] || "";
            var desParts = [];
            if (baseDes) {
                desParts.push(baseDes);
            }
            if (desParts.length === 0) {
                desParts.push("\u80FD\u529B\u63CF\u8FF0: \u6682\u65E0");
            }
            var effectParts = [
                "\u5F53\u524D\u80FD\u529B\u6548\u679C: " + currentEffectText,
                "\u4E0B\u4E00\u9636\u6BB5\u80FD\u529B\u6548\u679C: " + nextEffectText
            ];
            var cardName = talentName;
            if (currentLevel >= maxLevel) {
                cardName = talentName + "\uFF08\u5DF2\u6EE1\u7EA7\uFF09";
            }
            else if (currentLevel >= 1) {
                cardName = talentName + "\uFF08\u5347\u81F3" + (TALENT_LEVEL_TEXT_MAP[nextLevel] || String(nextLevel)) + "\u7EA7\uFF09";
            }
            else {
                cardName = talentName + "\uFF08\u89E3\u9501" + (TALENT_LEVEL_TEXT_MAP[nextLevel] || String(nextLevel)) + "\u7EA7\uFF09";
            }
            return {
                currentLevel: currentLevel,
                nextLevel: nextLevel,
                isMaxLevel: currentLevel >= maxLevel,
                displayName: talentName,
                cardName: cardName,
                desText: desParts.join("\n\n"),
                effectText: effectParts.join("\n"),
                tierLines: tierLines
            };
        };
        return CommerceAppService;
    }());
    // src-mod/platform/PlatformFacade.ts
    var PlatformFacade = /** @class */ (function () {
        function PlatformFacade() {
        }
        PlatformFacade.prototype.getPurchaseAndroid = function () {
            return getGlobalScope().PurchaseAndroid || null;
        };
        PlatformFacade.prototype.getPurchaseService = function () {
            return getGlobalScope().PurchaseService || null;
        };
        PlatformFacade.prototype.getAdHelper = function () {
            return getGlobalScope().adHelper || null;
        };
        PlatformFacade.prototype.getGameCenter = function () {
            return getGlobalScope().gameCenter || null;
        };
        PlatformFacade.prototype.getCommonUtil = function () {
            return getGlobalScope().CommonUtil || null;
        };
        PlatformFacade.prototype.getReflection = function () {
            var globalScope2 = getGlobalScope();
            return globalScope2.jsb && globalScope2.jsb.reflection ? globalScope2.jsb.reflection : null;
        };
        PlatformFacade.prototype.getUpdateBridge = function () {
            return getGlobalScope().up || null;
        };
        return PlatformFacade;
    }());
    // src-mod/router/LegacyRouter.ts
    var LegacyScreenFactory = /** @class */ (function () {
        function LegacyScreenFactory() {
        }
        LegacyScreenFactory.prototype.createCtorInstance = function (ctorName, args) {
            if (args === void 0) { args = []; }
            var globalScope2 = getGlobalScope();
            var Ctor = globalScope2[ctorName];
            if (typeof Ctor !== "function") {
                return null;
            }
            return new (Function.prototype.bind.apply(Ctor, [null].concat(args)))();
        };
        LegacyScreenFactory.prototype.createScene = function (sceneName, args) {
            if (args === void 0) { args = []; }
            return this.createCtorInstance(sceneName, args);
        };
        LegacyScreenFactory.prototype.createNode = function (nodeName, userData) {
            return this.createCtorInstance(nodeName, [userData]);
        };
        LegacyScreenFactory.prototype.getCtor = function (ctorName) {
            return getGlobalScope()[ctorName] || null;
        };
        LegacyScreenFactory.prototype.createCurrentNode = function () {
            var globalScope2 = getGlobalScope();
            if (!globalScope2.Navigation || typeof globalScope2.Navigation.current !== "function") {
                return null;
            }
            return globalScope2.Navigation.current();
        };
        return LegacyScreenFactory;
    }());
    var LegacyMusicPolicy = /** @class */ (function () {
        function LegacyMusicPolicy() {
        }
        LegacyMusicPolicy.prototype.stopCurrentMusic = function () {
            var globalScope2 = getGlobalScope();
            if (globalScope2.Navigation && typeof globalScope2.Navigation.stopMusic === "function") {
                globalScope2.Navigation.stopMusic();
            }
        };
        LegacyMusicPolicy.prototype.getCurrentMusic = function () {
            var globalScope2 = getGlobalScope();
            return globalScope2.Navigation ? globalScope2.Navigation.currentMusic : null;
        };
        return LegacyMusicPolicy;
    }());
    var LegacyRouter = /** @class */ (function () {
        function LegacyRouter(screenFactory, musicPolicy) {
            this.screenFactory = screenFactory;
            this.musicPolicy = musicPolicy;
        }
        LegacyRouter.prototype.forward = function (nodeName, userData) {
            var globalScope2 = getGlobalScope();
            return globalScope2.Navigation && typeof globalScope2.Navigation.forward === "function" ? globalScope2.Navigation.forward(nodeName, userData) : null;
        };
        LegacyRouter.prototype.back = function () {
            var globalScope2 = getGlobalScope();
            return globalScope2.Navigation && typeof globalScope2.Navigation.back === "function" ? globalScope2.Navigation.back() : null;
        };
        LegacyRouter.prototype.root = function (nodeName, userData) {
            var globalScope2 = getGlobalScope();
            return globalScope2.Navigation && typeof globalScope2.Navigation.root === "function" ? globalScope2.Navigation.root(nodeName, userData) : null;
        };
        LegacyRouter.prototype.replace = function (nodeName, userData) {
            var globalScope2 = getGlobalScope();
            return globalScope2.Navigation && typeof globalScope2.Navigation.replace === "function" ? globalScope2.Navigation.replace(nodeName, userData) : null;
        };
        LegacyRouter.prototype.runScene = function (sceneName, args) {
            if (args === void 0) { args = []; }
            var globalScope2 = getGlobalScope();
            var scene = this.screenFactory.createScene(sceneName, args);
            if (scene && globalScope2.cc && globalScope2.cc.director) {
                globalScope2.cc.director.runScene(scene);
            }
            return scene;
        };
        return LegacyRouter;
    }());
    // src-mod/app/AppContext.ts
    function createAppContext(assetResolver2, metadata) {
        var globalScope2 = getGlobalScope();
        var screenFactory = new LegacyScreenFactory();
        var musicPolicy = new LegacyMusicPolicy();
        var router = new LegacyRouter(screenFactory, musicPolicy);
        var platform = new PlatformFacade();
        var navigationService = new NavigationAppService(screenFactory, musicPolicy, globalScope2.Navigation ? globalScope2.Navigation.nodeName : {});
        var sessionService = new SessionAppService(router, navigationService);
        return {
            services: {
                session: sessionService,
                world: new WorldAppService(),
                travel: new TravelAppService(),
                combat: new CombatAppService(),
                navigation: navigationService,
                commerce: new CommerceAppService()
            },
            stores: {
                get player() {
                    return globalScope2.player || null;
                },
                get game() {
                    return globalScope2.game || null;
                },
                get navigation() {
                    return globalScope2.Navigation || null;
                },
                get record() {
                    return globalScope2.Record || null;
                }
            },
            platform: platform,
            router: router,
            eventBus: globalScope2.utils ? globalScope2.utils.emitter : null,
            assets: assetResolver2,
            legacy: {
                get player() {
                    return globalScope2.player || null;
                },
                get game() {
                    return globalScope2.game || null;
                },
                get navigation() {
                    return globalScope2.Navigation || null;
                }
            },
            metadata: metadata
        };
    }
    // src-mod/ui/AssetResolver.ts
    var DEFAULT_SPRITES = {
        character: "npc_dig_0.png",
        talent: "icon_iap_0.png",
        purchase: "icon_iap_101.png",
        item: "icon_item_1101051.png",
        itemDetail: "dig_item_1101051.png",
        site: "site_1.png"
    };
    function getSafetyHelper() {
        return getGlobalScope().SafetyHelper || null;
    }
    var AssetResolver = /** @class */ (function () {
        function AssetResolver() {
            this.DEFAULT_SPRITES = DEFAULT_SPRITES;
        }
        AssetResolver.prototype.loadWithFallback = function (primaryName, fallbackName, context) {
            var globalScope2 = getGlobalScope();
            var safetyHelper = getSafetyHelper();
            var sprite = null;
            if (primaryName && safetyHelper && typeof safetyHelper.safeLoadSprite === "function") {
                sprite = safetyHelper.safeLoadSprite(primaryName, null);
            }
            if (sprite) {
                return sprite;
            }
            if (primaryName && fallbackName && globalScope2.cc && typeof globalScope2.cc.log === "function") {
                globalScope2.cc.log("[AssetResolver] fallback " + context + " missing=" + primaryName + " fallback=" + fallbackName);
            }
            return safetyHelper && typeof safetyHelper.safeLoadSprite === "function" ? safetyHelper.safeLoadSprite(fallbackName, null) : null;
        };
        AssetResolver.prototype.getCharacterIcon = function (roleType, fallbackName) {
            var globalScope2 = getGlobalScope();
            var iconHelper = globalScope2.IconHelper;
            var iconName = "npc_dig_" + roleType + ".png";
            if (iconHelper && typeof iconHelper.getRolePortraitFrameName === "function") {
                iconName = iconHelper.getRolePortraitFrameName(roleType, false, fallbackName || DEFAULT_SPRITES.character);
            }
            return this.loadWithFallback(iconName, fallbackName || DEFAULT_SPRITES.character, "character:" + roleType);
        };
        AssetResolver.prototype.getTalentIcon = function (purchaseId, fallbackName) {
            return this.loadWithFallback("icon_iap_" + purchaseId + ".png", fallbackName || DEFAULT_SPRITES.talent, "talent:" + purchaseId);
        };
        AssetResolver.prototype.getPurchaseIcon = function (purchaseId, fallbackName) {
            return this.loadWithFallback("icon_iap_" + purchaseId + ".png", fallbackName || DEFAULT_SPRITES.purchase, "purchase:" + purchaseId);
        };
        AssetResolver.prototype.getItemIcon = function (itemId, fallbackName) {
            return this.loadWithFallback("icon_item_" + itemId + ".png", fallbackName || DEFAULT_SPRITES.item, "item:" + itemId);
        };
        AssetResolver.prototype.getSiteIcon = function (siteId, fallbackName) {
            return this.loadWithFallback("site_" + siteId + ".png", fallbackName || DEFAULT_SPRITES.site, "site:" + siteId);
        };
        AssetResolver.prototype.createLegacyFacade = function () {
            var self2 = this;
            return {
                DEFAULT_SPRITES: DEFAULT_SPRITES,
                getCharacterIcon: function (roleType, fallbackName) {
                    return self2.getCharacterIcon(roleType, fallbackName);
                },
                getTalentIcon: function (purchaseId, fallbackName) {
                    return self2.getTalentIcon(purchaseId, fallbackName);
                },
                getPurchaseIcon: function (purchaseId, fallbackName) {
                    return self2.getPurchaseIcon(purchaseId, fallbackName);
                },
                getItemIcon: function (itemId, fallbackName) {
                    return self2.getItemIcon(itemId, fallbackName);
                },
                getSiteIcon: function (siteId, fallbackName) {
                    return self2.getSiteIcon(siteId, fallbackName);
                }
            };
        };
        return AssetResolver;
    }());
    // src-mod/runtime/runtime-entry.ts
    var globalScope = getGlobalScope();
    var assetResolver = new AssetResolver();
    function createSafetyHelper() {
        return {
            safeCall: function (fn, defaultValue) {
                var args = [];
                for (var _i = 2; _i < arguments.length; _i++) {
                    args[_i - 2] = arguments[_i];
                }
                if (typeof fn !== "function") {
                    return defaultValue;
                }
                try {
                    return fn.apply(null, args);
                }
                catch (error) {
                    if (globalScope.cc && typeof globalScope.cc.error === "function") {
                        globalScope.cc.error("SafeCall failed: " + error);
                    }
                    return defaultValue;
                }
            },
            safeCallWithFallback: function (fn, defaultValue) {
                var args = [];
                for (var _i = 2; _i < arguments.length; _i++) {
                    args[_i - 2] = arguments[_i];
                }
                if (typeof fn !== "function") {
                    return defaultValue;
                }
                try {
                    var result = fn.apply(null, args);
                    return result || defaultValue;
                }
                catch (error) {
                    if (globalScope.cc && typeof globalScope.cc.error === "function") {
                        globalScope.cc.error("SafeCallWithFallback failed: " + error);
                    }
                    return defaultValue;
                }
            },
            isEmpty: function (value) {
                return value === void 0 || value === null || value === "";
            },
            safeJSONParse: function (jsonText, defaultValue, context) {
                if (this.isEmpty(jsonText)) {
                    return defaultValue;
                }
                try {
                    return JSON.parse(jsonText);
                }
                catch (error) {
                    if (globalScope.cc && typeof globalScope.cc.error === "function") {
                        globalScope.cc.error("safeJSONParse failed" + (context ? " [" + context + "]" : "") + ": " + error);
                    }
                    return defaultValue;
                }
            },
            safeLoadSprite: function (spriteName, fallbackName) {
                if (this.isEmpty(spriteName)) {
                    return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
                }
                try {
                    var controller = globalScope.autoSpriteFrameController;
                    if (controller && typeof controller.getSpriteFromSpriteName === "function") {
                        var sprite = controller.getSpriteFromSpriteName(spriteName);
                        if (sprite) {
                            return sprite;
                        }
                    }
                    return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
                }
                catch (error) {
                    if (globalScope.cc && typeof globalScope.cc.error === "function") {
                        globalScope.cc.error("safeLoadSprite failed: " + spriteName + ", " + error);
                    }
                    return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
                }
            }
        };
    }
    function createErrorHandler(safetyHelper) {
        return {
            logError: function (context, error, extraInfo) {
                var message = error instanceof Error ? error.message : error;
                var logMessage = "[ERROR] " + context + ": " + message + (extraInfo !== void 0 ? " | " + JSON.stringify(extraInfo) : "");
                if (globalScope.cc && typeof globalScope.cc.error === "function") {
                    globalScope.cc.error(logMessage);
                }
            },
            safeExecute: function (fn, context, fallback) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                return safetyHelper.safeCall.apply(safetyHelper, __spreadArray([fn, fallback], args, false));
            }
        };
    }
    var bootstrap = globalScope.BuriedTownBootstrap || {};
    var manifest = null;
    bootstrap.setManifest = function (nextManifest) {
        manifest = nextManifest || null;
    };
    bootstrap.getManifest = function () {
        return manifest;
    };
    bootstrap.registerLanguageBundle = function (_locale, _stringMap) {
    };
    bootstrap.getSupportedLocales = function () {
        if (manifest && Array.isArray(manifest.locales) && manifest.locales.length > 0) {
            return manifest.locales.slice();
        }
        return ["zh", "en"];
    };
    bootstrap.resolveLocale = function (requestedLocale) {
        var supportedLocales = this.getSupportedLocales();
        var locale = requestedLocale;
        if (!locale && globalScope.cc && globalScope.cc.sys && globalScope.cc.sys.localStorage) {
            locale = globalScope.cc.sys.localStorage.getItem("language");
        }
        if (!locale && globalScope.cc && globalScope.cc.sys) {
            locale = globalScope.cc.sys.language;
        }
        locale = locale || "zh";
        if (locale === "zh-Hant") {
            locale = "zh";
        }
        if (supportedLocales.indexOf(locale) !== -1) {
            return locale;
        }
        if (locale.indexOf("zh") === 0 && supportedLocales.indexOf("zh") !== -1) {
            return "zh";
        }
        if (supportedLocales.indexOf("en") !== -1) {
            return "en";
        }
        return supportedLocales[0] || "zh";
    };
    bootstrap.loadLanguageBundle = function (requestedLocale, callback) {
        var resolvedLocale = this.resolveLocale(requestedLocale);
        var manifestRef = this.getManifest();
        var bundleMap = manifestRef && manifestRef.bundles ? manifestRef.bundles.lang || {} : {};
        var bundlePath = bundleMap[resolvedLocale];
        if (!bundlePath) {
            if (callback) {
                callback(resolvedLocale);
            }
            return;
        }
        if (globalScope.cc && globalScope.cc.sys && !globalScope.cc.sys.isNative) {
            globalScope.cc.loader.loadJs([bundlePath], function () {
                if (globalScope.cc && globalScope.cc.sys && globalScope.cc.sys.localStorage) {
                    globalScope.cc.sys.localStorage.setItem("language", resolvedLocale);
                }
                if (callback) {
                    callback(resolvedLocale);
                }
            });
            return;
        }
        var searchPaths = globalScope.jsb && globalScope.jsb.fileUtils ? globalScope.jsb.fileUtils.getSearchPaths() : [];
        for (var index = 0; index < searchPaths.length; index++) {
            var fullPath = searchPaths[index] + bundlePath;
            if (globalScope.jsb.fileUtils.isFileExist(fullPath) || globalScope.jsb.fileUtils.isFileExist(fullPath.replace(/\.js$/i, ".jsc"))) {
                if (typeof globalScope.__cleanScript === "function") {
                    globalScope.__cleanScript(fullPath);
                }
                if (typeof globalScope.require === "function") {
                    globalScope.require(fullPath);
                }
                if (globalScope.cc && globalScope.cc.sys && globalScope.cc.sys.localStorage) {
                    globalScope.cc.sys.localStorage.setItem("language", resolvedLocale);
                }
                break;
            }
        }
        if (callback) {
            callback(resolvedLocale);
        }
    };
    function installLegacyGlobals() {
        BootstrapPatches.install();
        var safetyHelper = createSafetyHelper();
        globalScope.DebugFlags = DebugFlags;
        globalScope.EnvironmentConfig = DebugFlags.createLegacyEnvironmentConfig();
        globalScope.SafetyHelper = safetyHelper;
        globalScope.ErrorHandler = createErrorHandler(safetyHelper);
        globalScope.AssetResolver = assetResolver;
        globalScope.ResourceFallback = assetResolver.createLegacyFacade();
        globalScope.SaveGameV2Runtime = SaveGameV2;
    }
    bootstrap.afterLegacyRuntimeLoaded = function (requestedLocale) {
        installLegacyGlobals();
        var resolvedLocale = this.resolveLocale(requestedLocale);
        var appContext = createAppContext(assetResolver, {
            locale: resolvedLocale,
            manifestVersion: manifest ? manifest.version || 0 : 0
        });
        globalScope.AppContext = appContext;
        globalScope.BuriedTownAppContext = appContext;
        this.appContext = appContext;
        return appContext;
    };
    bootstrap.getAppContext = function () {
        return this.appContext || null;
    };
    globalScope.BuriedTownBootstrap = bootstrap;
    installLegacyGlobals();
})();
