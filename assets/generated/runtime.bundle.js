var BuriedTownRuntimeBundle = (() => {
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
    const cc = getCc();
    if (!cc || !cc.sys || !cc.sys.localStorage) {
      return true;
    }
    const rawValue = cc.sys.localStorage.getItem(SOUND_STORAGE_KEY) || 1;
    return rawValue == 1;
  }
  function setSound(isOn) {
    const cc = getCc();
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
    install() {
      const globalScope2 = getGlobalScope();
      const cc = globalScope2.cc;
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
        cc.originAudioEngine.playEffect = function(char, loop) {
          if (!needSound()) {
            return;
          }
          return cc.audioEngine.playEffect(char, loop);
        };
        cc.originAudioEngine.stopEffect = function(effectId) {
          if (!needSound()) {
            return;
          }
          cc.audioEngine.stopEffect(effectId);
        };
        cc.originAudioEngine.playMusic = function(url, loop) {
          if (!needSound()) {
            return;
          }
          cc.audioEngine.playMusic(url, loop);
        };
        cc.originAudioEngine.stopMusic = function(releaseData) {
          if (!needSound()) {
            return;
          }
          cc.audioEngine.stopMusic(releaseData);
        };
      }
      if (!cc.originLog) {
        cc.originLog = cc.log ? cc.log.bind(cc) : function() {
        };
      }
      if (!cc._log) {
        cc._log = function(levelInfo, message) {
          if (LOG_LEVEL.v.level > levelInfo.level) {
            return;
          }
          cc.originLog("[t " + levelInfo.name + "]" + message);
        };
      }
      cc.log = function(message) {
        cc._log(LOG_LEVEL.v, message);
      };
      cc.v = function(message) {
        cc._log(LOG_LEVEL.v, message);
      };
      cc.i = function(message) {
        cc._log(LOG_LEVEL.i, message);
      };
      cc.w = function(message) {
        cc._log(LOG_LEVEL.w, message);
      };
      cc.d = function(message) {
        cc._log(LOG_LEVEL.d, message);
      };
      cc.e = function(message) {
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
    const globalScope2 = getGlobalScope();
    const cc = globalScope2.cc;
    return cc && cc.sys && cc.sys.localStorage ? cc.sys.localStorage : null;
  }
  function readBoolFlag(storageKey, fallbackValue) {
    const storage = getLocalStorage();
    if (!storage || !storageKey) {
      return fallbackValue;
    }
    const rawValue = storage.getItem(storageKey);
    if (rawValue === null || rawValue === void 0 || rawValue === "") {
      return fallbackValue;
    }
    const normalized = ("" + rawValue).toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
      return true;
    }
    if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
      return false;
    }
    return fallbackValue;
  }
  var DebugFlags = {
    STORAGE_KEY,
    isContentValidationEnabled() {
      return readBoolFlag(STORAGE_KEY.CONTENT_VALIDATION, false);
    },
    getPurchaseDebugFlags() {
      return {
        unlockAllRoleAndTalentForTest: readBoolFlag(STORAGE_KEY.PURCHASE_AUTO_UNLOCK, false),
        bypassPaySdkForTest: readBoolFlag(STORAGE_KEY.PURCHASE_BYPASS_SDK, false)
      };
    },
    createLegacyEnvironmentConfig() {
      return {
        STORAGE_KEY,
        isContentValidationEnabled: this.isContentValidationEnabled.bind(this),
        getPurchaseDebugFlags: this.getPurchaseDebugFlags.bind(this)
      };
    }
  };

  // src-mod/domain/save/SaveGameV2.ts
  var SAVE_GAME_VERSION = 2;
  var SaveGameV2 = {
    createEnvelope(slot, data, previousEnvelope) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      return {
        saveVersion: SAVE_GAME_VERSION,
        slot,
        createdAt: previousEnvelope && previousEnvelope.createdAt ? previousEnvelope.createdAt : now,
        updatedAt: now,
        data: data || {},
        meta: previousEnvelope && previousEnvelope.meta ? previousEnvelope.meta : {}
      };
    },
    isEnvelope(value) {
      return !!(value && typeof value === "object" && Number(value.saveVersion) === SAVE_GAME_VERSION && value.data && typeof value.data === "object");
    }
  };

  // src-mod/app/services/SessionAppService.ts
  var SessionAppService = class {
    constructor(router, navigation) {
      this.router = router;
      this.navigation = navigation || null;
    }
    stopActiveMusic() {
      const globalScope2 = getGlobalScope();
      if (this.navigation && typeof this.navigation.stopMusic === "function") {
        this.navigation.stopMusic();
        return;
      }
      if (globalScope2.audioManager && typeof globalScope2.audioManager.stopMusic === "function") {
        globalScope2.audioManager.stopMusic(globalScope2.audioManager.music && globalScope2.audioManager.music.MAIN_PAGE);
      }
    }
    initRuntime() {
      const globalScope2 = getGlobalScope();
      if (globalScope2.Record && typeof globalScope2.Record.init === "function") {
        globalScope2.Record.init(globalScope2.Record.getCurrentRecordName());
      }
      if (this.navigation && typeof this.navigation.init === "function") {
        this.navigation.init();
      } else if (globalScope2.Navigation && typeof globalScope2.Navigation.init === "function") {
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
    }
    startRuntime() {
      const globalScope2 = getGlobalScope();
      if (globalScope2.player && typeof globalScope2.player.start === "function") {
        globalScope2.player.start();
      }
      if (globalScope2.IAPPackage && typeof globalScope2.IAPPackage.applyActiveTalentStartGifts === "function" && globalScope2.player) {
        const gifted = globalScope2.IAPPackage.applyActiveTalentStartGifts(globalScope2.player);
        if (gifted && globalScope2.Record && typeof globalScope2.Record.saveAll === "function") {
          globalScope2.Record.saveAll();
        }
      }
    }
    stopRuntime() {
      const globalScope2 = getGlobalScope();
      if (globalScope2.cc && globalScope2.cc.timer) {
        globalScope2.cc.timer.stop();
      }
    }
    prepareNewGame() {
      const globalScope2 = getGlobalScope();
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
    }
    reliveRuntime() {
      const globalScope2 = getGlobalScope();
      this.initRuntime();
      this.startRuntime();
      if (globalScope2.player && typeof globalScope2.player.relive === "function") {
        globalScope2.player.relive();
      }
    }
    startNewGame(slot) {
      const globalScope2 = getGlobalScope();
      if (globalScope2.Record && typeof globalScope2.Record.setCurrentSlot === "function") {
        globalScope2.Record.setCurrentSlot(slot);
      }
      this.stopActiveMusic();
      if (globalScope2.DataLog && typeof globalScope2.DataLog.increaseRound === "function") {
        globalScope2.DataLog.increaseRound();
      }
      this.prepareNewGame();
      this.router.runScene("ChooseScene");
    }
    continueGame(slot) {
      const globalScope2 = getGlobalScope();
      if (globalScope2.Record && typeof globalScope2.Record.setCurrentSlot === "function") {
        globalScope2.Record.setCurrentSlot(slot);
      }
      this.stopActiveMusic();
      this.initRuntime();
      this.startRuntime();
      this.router.runScene("MainScene");
    }
    relive() {
      this.reliveRuntime();
    }
    saveAll() {
      const globalScope2 = getGlobalScope();
      if (globalScope2.Record && typeof globalScope2.Record.saveAll === "function") {
        globalScope2.Record.saveAll();
      }
    }
  };

  // src-mod/app/services/WorldAppService.ts
  var WorldAppService = class {
    getPlayer() {
      return getGlobalScope().player || null;
    }
    supportsZiplineFramework() {
      const globalScope2 = getGlobalScope();
      return !!(globalScope2.RoleRuntimeService && typeof globalScope2.RoleRuntimeService.isZiplineFrameworkAvailable === "function" && globalScope2.player && globalScope2.RoleRuntimeService.isZiplineFrameworkAvailable(globalScope2.player));
    }
    enterWorldMap() {
      const player = this.getPlayer();
      if (player && typeof player.enterWorldMap === "function") {
        player.enterWorldMap();
      }
    }
    enterSite(siteId) {
      const player = this.getPlayer();
      if (player && typeof player.enterSite === "function") {
        player.enterSite(siteId);
      }
    }
  };

  // src-mod/app/services/TravelAppService.ts
  var TravelAppService = class {
    buildPlan(startPos, endPos) {
      const globalScope2 = getGlobalScope();
      if (!globalScope2.TravelService || typeof globalScope2.TravelService.buildPlan !== "function") {
        return null;
      }
      const player = globalScope2.player || {};
      return globalScope2.TravelService.buildPlan({
        startPos,
        endPos,
        storage: player.storage || null,
        weather: player.weather || null,
        ziplineNetwork: player.ziplineNetwork || null,
        map: player.map || null
      });
    }
  };

  // src-mod/app/services/CombatAppService.ts
  var CombatAppService = class {
    createBattle(battleInfo, isDodge) {
      const globalScope2 = getGlobalScope();
      if (typeof globalScope2.Battle !== "function") {
        return null;
      }
      return new globalScope2.Battle(battleInfo, !!isDodge);
    }
  };

  // src-mod/app/services/NavigationAppService.ts
  var NavigationAppService = class {
    constructor(screenFactory, musicPolicy, nodeNames) {
      this.screenFactory = screenFactory;
      this.musicPolicy = musicPolicy;
      this.nodeNames = nodeNames || {};
      this.stack = [];
      this.currentMusic = null;
      this.siteMusic = null;
    }
    getGlobalNavigation() {
      return getGlobalScope().Navigation || null;
    }
    syncFacade() {
      const navigationFacade = this.getGlobalNavigation();
      if (!navigationFacade) {
        return;
      }
      navigationFacade._array = this.stack.slice();
      navigationFacade.currentMusic = this.currentMusic;
      navigationFacade.siteMusic = this.siteMusic;
    }
    ensureStack() {
      if (!Array.isArray(this.stack)) {
        this.stack = [];
      }
    }
    logNavigationError(message) {
      const globalScope2 = getGlobalScope();
      if (globalScope2.cc && typeof globalScope2.cc.error === "function") {
        globalScope2.cc.error("[Navigation] " + message);
      }
    }
    createNodeForEntry(nodeInfo) {
      if (!nodeInfo || !nodeInfo.nodeName) {
        return null;
      }
      const node = this.screenFactory.createNode(nodeInfo.nodeName, nodeInfo.userData);
      if (!node) {
        this.logNavigationError("node ctor unavailable: " + nodeInfo.nodeName);
        return null;
      }
      if (typeof node.setName === "function") {
        node.setName("bottom");
      }
      return node;
    }
    commitCurrentNode(nodeInfo, node) {
      this.applyMusic(nodeInfo.nodeName);
      this.save();
      if (typeof node.afterInit === "function") {
        node.afterInit();
      }
      return node;
    }
    renderCurrentNode(pruneInvalidEntries) {
      this.ensureStack();
      if (this.stack.length === 0) {
        return this.forward(this.nodeNames.HOME_NODE);
      }
      let nodeInfo = this.stack[this.stack.length - 1];
      let node = this.createNodeForEntry(nodeInfo);
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
    }
    withStackMutation(mutator) {
      const previousStack = this.stack.slice();
      mutator();
      const node = this.renderCurrentNode(false);
      if (node) {
        return node;
      }
      this.stack = previousStack.slice();
      this.syncFacade();
      if (this.stack.length === 0) {
        return null;
      }
      return this.current();
    }
    resolveMusicName(nodeName) {
      const globalScope2 = getGlobalScope();
      const audioManager = globalScope2.audioManager;
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
    }
    applyMusic(nodeName) {
      const globalScope2 = getGlobalScope();
      const audioManager = globalScope2.audioManager;
      const musicName = this.resolveMusicName(nodeName);
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
    }
    init() {
      this.stack = [];
      this.currentMusic = null;
      this.siteMusic = null;
      this.restore();
      this.syncFacade();
      return this;
    }
    forward(nodeName, userData) {
      this.ensureStack();
      return this.withStackMutation(() => {
        this.stack.push({
          nodeName,
          userData
        });
      });
    }
    back() {
      this.ensureStack();
      return this.withStackMutation(() => {
        if (this.stack.length > 0) {
          this.stack.pop();
        }
      });
    }
    current() {
      return this.renderCurrentNode(true);
    }
    getSiteMusic() {
      const globalScope2 = getGlobalScope();
      const audioManager = globalScope2.audioManager;
      if (!audioManager || !audioManager.music) {
        return null;
      }
      if (!this.siteMusic) {
        const musicPool = [audioManager.music.SITE_1, audioManager.music.SITE_2, audioManager.music.SITE_3];
        const utils = globalScope2.utils;
        const randomIndex = utils && typeof utils.getRandomInt === "function" ? utils.getRandomInt(0, musicPool.length - 1) : 0;
        this.siteMusic = musicPool[randomIndex];
      }
      this.syncFacade();
      return this.siteMusic;
    }
    changeSiteMusic() {
      this.siteMusic = null;
      this.syncFacade();
    }
    stopMusic() {
      const globalScope2 = getGlobalScope();
      if (this.currentMusic && globalScope2.audioManager) {
        globalScope2.audioManager.stopMusic(this.currentMusic);
      }
      this.syncFacade();
    }
    root(nodeName, userData) {
      this.ensureStack();
      return this.withStackMutation(() => {
        this.stack = [{
          nodeName,
          userData
        }];
        this.syncFacade();
      });
    }
    replace(nodeName, userData) {
      this.ensureStack();
      return this.withStackMutation(() => {
        if (this.stack.length > 0) {
          this.stack.pop();
        }
        this.stack.push({
          nodeName,
          userData
        });
      });
    }
    getClz(nodeName) {
      return this.screenFactory.getCtor(nodeName);
    }
    gotoDeathNode() {
      const globalScope2 = getGlobalScope();
      const runningScene = globalScope2.cc && globalScope2.cc.director && typeof globalScope2.cc.director.getRunningScene === "function" ? globalScope2.cc.director.getRunningScene() : null;
      if (!runningScene) {
        return null;
      }
      if (typeof runningScene.removeChildByName === "function") {
        runningScene.removeChildByName("dialog");
      }
      const layer = typeof runningScene.getChildByName === "function" ? runningScene.getChildByName("main") : null;
      if (!layer) {
        return null;
      }
      if (typeof layer.removeChildByName === "function") {
        layer.removeChildByName("bottom");
      }
      const deathNode = this.root(this.nodeNames.DEATH_NODE);
      if (deathNode && typeof layer.addChild === "function") {
        layer.addChild(deathNode);
      }
      return deathNode;
    }
    save() {
      const globalScope2 = getGlobalScope();
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
    }
    restore() {
      const globalScope2 = getGlobalScope();
      if (!globalScope2.Record || typeof globalScope2.Record.restore !== "function") {
        this.stack = [];
        this.syncFacade();
        return this.stack;
      }
      const saveObj = globalScope2.Record.restore("navigation");
      this.stack = saveObj && Array.isArray(saveObj._array) ? saveObj._array.slice() : [];
      this.syncFacade();
      return this.stack;
    }
    getCurrentMusic() {
      return this.currentMusic;
    }
  };

  // src-mod/app/services/CommerceAppService.ts
  var TALENT_LEVEL_TEXT_MAP = {
    1: "\u4E00",
    2: "\u4E8C",
    3: "\u4E09"
  };
  var CommerceAppService = class {
    normalizePurchaseId(purchaseId) {
      const normalized = parseInt(String(purchaseId), 10);
      return isNaN(normalized) ? null : normalized;
    }
    clonePlainObject(value) {
      if (!value || typeof value !== "object") {
        return {};
      }
      return Object.assign({}, value);
    }
    initPackage() {
      const globalScope2 = getGlobalScope();
      if (globalScope2.PurchaseService && typeof globalScope2.PurchaseService.initPackage === "function") {
        globalScope2.PurchaseService.initPackage();
      }
    }
    isPaySdkBypassedForTest() {
      const globalScope2 = getGlobalScope();
      return !!(globalScope2.PurchaseService && typeof globalScope2.PurchaseService.isPaySdkBypassedForTest === "function" && globalScope2.PurchaseService.isPaySdkBypassedForTest());
    }
    getRoleTypeByPurchaseId(purchaseId) {
      const globalScope2 = getGlobalScope();
      const resolvedPurchaseId = this.normalizePurchaseId(purchaseId);
      if (resolvedPurchaseId === null || !globalScope2.PurchaseService || typeof globalScope2.PurchaseService.getExchangeIdsByPurchaseId !== "function" || !globalScope2.ExchangeAchievementConfig) {
        return null;
      }
      const exchangeIds = globalScope2.PurchaseService.getExchangeIdsByPurchaseId(resolvedPurchaseId) || [];
      if (!exchangeIds.length) {
        return null;
      }
      const exchangeConfig = globalScope2.ExchangeAchievementConfig[exchangeIds[0]];
      if (!exchangeConfig || exchangeConfig.type !== "character") {
        return null;
      }
      return exchangeConfig.targetId;
    }
    getPurchaseStringConfig(purchaseId) {
      const globalScope2 = getGlobalScope();
      const resolvedPurchaseId = this.normalizePurchaseId(purchaseId);
      const fallbackName = resolvedPurchaseId === null ? "ID unknown" : "ID " + resolvedPurchaseId;
      const stringKey = resolvedPurchaseId === null ? null : "p_" + resolvedPurchaseId;
      const rawConfig = stringKey && globalScope2.stringUtil && typeof globalScope2.stringUtil.getString === "function" ? globalScope2.stringUtil.getString(stringKey) : null;
      const strConfig = this.clonePlainObject(rawConfig);
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
      const exchangeIds = globalScope2.PurchaseService.getExchangeIdsByPurchaseId(resolvedPurchaseId) || [];
      if (!exchangeIds.length) {
        return strConfig;
      }
      const exchangeConfig = globalScope2.ExchangeAchievementConfig[exchangeIds[0]];
      if (!exchangeConfig || exchangeConfig.type !== "character") {
        return strConfig;
      }
      const roleInfo = globalScope2.role && typeof globalScope2.role.getRoleInfo === "function" ? globalScope2.role.getRoleInfo(exchangeConfig.targetId) : null;
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
    }
    getTalentDisplayInfo(purchaseId, baseName) {
      const globalScope2 = getGlobalScope();
      const resolvedPurchaseId = this.normalizePurchaseId(purchaseId);
      if (resolvedPurchaseId === null || !globalScope2.PurchaseService || typeof globalScope2.PurchaseService.isTalentPurchase !== "function" || !globalScope2.PurchaseService.isTalentPurchase(resolvedPurchaseId)) {
        return null;
      }
      const currentLevel = globalScope2.Medal && typeof globalScope2.Medal.getTalentLevel === "function" ? globalScope2.Medal.getTalentLevel(resolvedPurchaseId) : 0;
      const maxLevel = globalScope2.TalentService && typeof globalScope2.TalentService.getTalentMaxLevel === "function" ? globalScope2.TalentService.getTalentMaxLevel(resolvedPurchaseId) : 3;
      const nextLevel = currentLevel >= maxLevel ? maxLevel : currentLevel + 1;
      const strConfig = this.getPurchaseStringConfig(resolvedPurchaseId);
      const talentName = baseName || strConfig.name || "";
      const baseDes = (strConfig.des || "").replace(/\\n/g, "\n");
      let effectList = globalScope2.TalentService && typeof globalScope2.TalentService.getTalentTierEffectTextList === "function" ? globalScope2.TalentService.getTalentTierEffectTextList(resolvedPurchaseId) : [];
      if (!Array.isArray(effectList) || effectList.length === 0) {
        const fallbackEffect = (strConfig.effect || "").replace(/\\n/g, "\n") || "\u6548\u679C\u589E\u5F3A";
        effectList = [];
        for (let effectIndex = 0; effectIndex < maxLevel; effectIndex++) {
          effectList.push(fallbackEffect);
        }
      }
      const tierLines = [];
      for (let level = 1; level <= maxLevel; level++) {
        const tierEffectText = effectList[level - 1] || effectList[effectList.length - 1] || "\u6548\u679C\u589E\u5F3A";
        tierLines.push((TALENT_LEVEL_TEXT_MAP[level] || String(level)) + "\u7EA7 " + tierEffectText);
      }
      const currentEffectText = currentLevel >= 1 ? effectList[Math.max(0, Math.min(effectList.length - 1, currentLevel - 1))] || "" : "\u65E0";
      const nextEffectText = currentLevel >= maxLevel ? "\u65E0" : effectList[Math.max(0, Math.min(effectList.length - 1, nextLevel - 1))] || "";
      const desParts = [];
      if (baseDes) {
        desParts.push(baseDes);
      }
      if (desParts.length === 0) {
        desParts.push("\u80FD\u529B\u63CF\u8FF0: \u6682\u65E0");
      }
      const effectParts = [
        "\u5F53\u524D\u80FD\u529B\u6548\u679C: " + currentEffectText,
        "\u4E0B\u4E00\u9636\u6BB5\u80FD\u529B\u6548\u679C: " + nextEffectText
      ];
      let cardName = talentName;
      if (currentLevel >= maxLevel) {
        cardName = talentName + "\uFF08\u5DF2\u6EE1\u7EA7\uFF09";
      } else if (currentLevel >= 1) {
        cardName = talentName + "\uFF08\u5347\u81F3" + (TALENT_LEVEL_TEXT_MAP[nextLevel] || String(nextLevel)) + "\u7EA7\uFF09";
      } else {
        cardName = talentName + "\uFF08\u89E3\u9501" + (TALENT_LEVEL_TEXT_MAP[nextLevel] || String(nextLevel)) + "\u7EA7\uFF09";
      }
      return {
        currentLevel,
        nextLevel,
        isMaxLevel: currentLevel >= maxLevel,
        displayName: talentName,
        cardName,
        desText: desParts.join("\n\n"),
        effectText: effectParts.join("\n"),
        tierLines
      };
    }
  };

  // src-mod/platform/PlatformFacade.ts
  var PlatformFacade = class {
    getPurchaseAndroid() {
      return getGlobalScope().PurchaseAndroid || null;
    }
    getPurchaseService() {
      return getGlobalScope().PurchaseService || null;
    }
    getAdHelper() {
      return getGlobalScope().adHelper || null;
    }
    getGameCenter() {
      return getGlobalScope().gameCenter || null;
    }
    getCommonUtil() {
      return getGlobalScope().CommonUtil || null;
    }
    getReflection() {
      const globalScope2 = getGlobalScope();
      return globalScope2.jsb && globalScope2.jsb.reflection ? globalScope2.jsb.reflection : null;
    }
    getUpdateBridge() {
      return getGlobalScope().up || null;
    }
  };

  // src-mod/router/LegacyRouter.ts
  var LegacyScreenFactory = class {
    createCtorInstance(ctorName, args = []) {
      const globalScope2 = getGlobalScope();
      const Ctor = globalScope2[ctorName];
      if (typeof Ctor !== "function") {
        return null;
      }
      return new (Function.prototype.bind.apply(Ctor, [null].concat(args)))();
    }
    createScene(sceneName, args = []) {
      return this.createCtorInstance(sceneName, args);
    }
    createNode(nodeName, userData) {
      return this.createCtorInstance(nodeName, [userData]);
    }
    getCtor(ctorName) {
      return getGlobalScope()[ctorName] || null;
    }
    createCurrentNode() {
      const globalScope2 = getGlobalScope();
      if (!globalScope2.Navigation || typeof globalScope2.Navigation.current !== "function") {
        return null;
      }
      return globalScope2.Navigation.current();
    }
  };
  var LegacyMusicPolicy = class {
    stopCurrentMusic() {
      const globalScope2 = getGlobalScope();
      if (globalScope2.Navigation && typeof globalScope2.Navigation.stopMusic === "function") {
        globalScope2.Navigation.stopMusic();
      }
    }
    getCurrentMusic() {
      const globalScope2 = getGlobalScope();
      return globalScope2.Navigation ? globalScope2.Navigation.currentMusic : null;
    }
  };
  var LegacyRouter = class {
    constructor(screenFactory, musicPolicy) {
      this.screenFactory = screenFactory;
      this.musicPolicy = musicPolicy;
    }
    forward(nodeName, userData) {
      const globalScope2 = getGlobalScope();
      return globalScope2.Navigation && typeof globalScope2.Navigation.forward === "function" ? globalScope2.Navigation.forward(nodeName, userData) : null;
    }
    back() {
      const globalScope2 = getGlobalScope();
      return globalScope2.Navigation && typeof globalScope2.Navigation.back === "function" ? globalScope2.Navigation.back() : null;
    }
    root(nodeName, userData) {
      const globalScope2 = getGlobalScope();
      return globalScope2.Navigation && typeof globalScope2.Navigation.root === "function" ? globalScope2.Navigation.root(nodeName, userData) : null;
    }
    replace(nodeName, userData) {
      const globalScope2 = getGlobalScope();
      return globalScope2.Navigation && typeof globalScope2.Navigation.replace === "function" ? globalScope2.Navigation.replace(nodeName, userData) : null;
    }
    runScene(sceneName, args = []) {
      const globalScope2 = getGlobalScope();
      const scene = this.screenFactory.createScene(sceneName, args);
      if (scene && globalScope2.cc && globalScope2.cc.director) {
        globalScope2.cc.director.runScene(scene);
      }
      return scene;
    }
  };

  // src-mod/app/AppContext.ts
  function createAppContext(assetResolver2, metadata) {
    const globalScope2 = getGlobalScope();
    const screenFactory = new LegacyScreenFactory();
    const musicPolicy = new LegacyMusicPolicy();
    const router = new LegacyRouter(screenFactory, musicPolicy);
    const platform = new PlatformFacade();
    const navigationService = new NavigationAppService(screenFactory, musicPolicy, globalScope2.Navigation ? globalScope2.Navigation.nodeName : {});
    const sessionService = new SessionAppService(router, navigationService);
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
      platform,
      router,
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
      metadata
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
  var AssetResolver = class {
    constructor() {
      this.DEFAULT_SPRITES = DEFAULT_SPRITES;
    }
    loadWithFallback(primaryName, fallbackName, context) {
      const globalScope2 = getGlobalScope();
      const safetyHelper = getSafetyHelper();
      let sprite = null;
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
    }
    getCharacterIcon(roleType, fallbackName) {
      const globalScope2 = getGlobalScope();
      const iconHelper = globalScope2.IconHelper;
      let iconName = "npc_dig_" + roleType + ".png";
      if (iconHelper && typeof iconHelper.getRolePortraitFrameName === "function") {
        iconName = iconHelper.getRolePortraitFrameName(roleType, false, fallbackName || DEFAULT_SPRITES.character);
      }
      return this.loadWithFallback(iconName, fallbackName || DEFAULT_SPRITES.character, "character:" + roleType);
    }
    getTalentIcon(purchaseId, fallbackName) {
      return this.loadWithFallback("icon_iap_" + purchaseId + ".png", fallbackName || DEFAULT_SPRITES.talent, "talent:" + purchaseId);
    }
    getPurchaseIcon(purchaseId, fallbackName) {
      return this.loadWithFallback("icon_iap_" + purchaseId + ".png", fallbackName || DEFAULT_SPRITES.purchase, "purchase:" + purchaseId);
    }
    getItemIcon(itemId, fallbackName) {
      return this.loadWithFallback("icon_item_" + itemId + ".png", fallbackName || DEFAULT_SPRITES.item, "item:" + itemId);
    }
    getSiteIcon(siteId, fallbackName) {
      return this.loadWithFallback("site_" + siteId + ".png", fallbackName || DEFAULT_SPRITES.site, "site:" + siteId);
    }
    createLegacyFacade() {
      const self2 = this;
      return {
        DEFAULT_SPRITES,
        getCharacterIcon(roleType, fallbackName) {
          return self2.getCharacterIcon(roleType, fallbackName);
        },
        getTalentIcon(purchaseId, fallbackName) {
          return self2.getTalentIcon(purchaseId, fallbackName);
        },
        getPurchaseIcon(purchaseId, fallbackName) {
          return self2.getPurchaseIcon(purchaseId, fallbackName);
        },
        getItemIcon(itemId, fallbackName) {
          return self2.getItemIcon(itemId, fallbackName);
        },
        getSiteIcon(siteId, fallbackName) {
          return self2.getSiteIcon(siteId, fallbackName);
        }
      };
    }
  };

  // src-mod/runtime/runtime-entry.ts
  var globalScope = getGlobalScope();
  var assetResolver = new AssetResolver();
  function createSafetyHelper() {
    return {
      safeCall(fn, defaultValue, ...args) {
        if (typeof fn !== "function") {
          return defaultValue;
        }
        try {
          return fn.apply(null, args);
        } catch (error) {
          if (globalScope.cc && typeof globalScope.cc.error === "function") {
            globalScope.cc.error("SafeCall failed: " + error);
          }
          return defaultValue;
        }
      },
      safeCallWithFallback(fn, defaultValue, ...args) {
        if (typeof fn !== "function") {
          return defaultValue;
        }
        try {
          const result = fn.apply(null, args);
          return result || defaultValue;
        } catch (error) {
          if (globalScope.cc && typeof globalScope.cc.error === "function") {
            globalScope.cc.error("SafeCallWithFallback failed: " + error);
          }
          return defaultValue;
        }
      },
      isEmpty(value) {
        return value === void 0 || value === null || value === "";
      },
      safeJSONParse(jsonText, defaultValue, context) {
        if (this.isEmpty(jsonText)) {
          return defaultValue;
        }
        try {
          return JSON.parse(jsonText);
        } catch (error) {
          if (globalScope.cc && typeof globalScope.cc.error === "function") {
            globalScope.cc.error("safeJSONParse failed" + (context ? " [" + context + "]" : "") + ": " + error);
          }
          return defaultValue;
        }
      },
      safeLoadSprite(spriteName, fallbackName) {
        if (this.isEmpty(spriteName)) {
          return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
        }
        try {
          const controller = globalScope.autoSpriteFrameController;
          if (controller && typeof controller.getSpriteFromSpriteName === "function") {
            const sprite = controller.getSpriteFromSpriteName(spriteName);
            if (sprite) {
              return sprite;
            }
          }
          return fallbackName ? this.safeLoadSprite(fallbackName, null) : null;
        } catch (error) {
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
      logError(context, error, extraInfo) {
        const message = error instanceof Error ? error.message : error;
        const logMessage = "[ERROR] " + context + ": " + message + (extraInfo !== void 0 ? " | " + JSON.stringify(extraInfo) : "");
        if (globalScope.cc && typeof globalScope.cc.error === "function") {
          globalScope.cc.error(logMessage);
        }
      },
      safeExecute(fn, context, fallback, ...args) {
        return safetyHelper.safeCall(fn, fallback, ...args);
      }
    };
  }
  var bootstrap = globalScope.BuriedTownBootstrap || {};
  var manifest = null;
  bootstrap.setManifest = function(nextManifest) {
    manifest = nextManifest || null;
  };
  bootstrap.getManifest = function() {
    return manifest;
  };
  bootstrap.registerLanguageBundle = function(_locale, _stringMap) {
  };
  bootstrap.getSupportedLocales = function() {
    if (manifest && Array.isArray(manifest.locales) && manifest.locales.length > 0) {
      return manifest.locales.slice();
    }
    return ["zh", "en"];
  };
  bootstrap.resolveLocale = function(requestedLocale) {
    const supportedLocales = this.getSupportedLocales();
    let locale = requestedLocale;
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
  bootstrap.loadLanguageBundle = function(requestedLocale, callback) {
    const resolvedLocale = this.resolveLocale(requestedLocale);
    const manifestRef = this.getManifest();
    const bundleMap = manifestRef && manifestRef.bundles ? manifestRef.bundles.lang || {} : {};
    const bundlePath = bundleMap[resolvedLocale];
    if (!bundlePath) {
      if (callback) {
        callback(resolvedLocale);
      }
      return;
    }
    if (globalScope.cc && globalScope.cc.sys && !globalScope.cc.sys.isNative) {
      globalScope.cc.loader.loadJs([bundlePath], function() {
        if (globalScope.cc && globalScope.cc.sys && globalScope.cc.sys.localStorage) {
          globalScope.cc.sys.localStorage.setItem("language", resolvedLocale);
        }
        if (callback) {
          callback(resolvedLocale);
        }
      });
      return;
    }
    const searchPaths = globalScope.jsb && globalScope.jsb.fileUtils ? globalScope.jsb.fileUtils.getSearchPaths() : [];
    for (let index = 0; index < searchPaths.length; index++) {
      const fullPath = searchPaths[index] + bundlePath;
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
    const safetyHelper = createSafetyHelper();
    globalScope.DebugFlags = DebugFlags;
    globalScope.EnvironmentConfig = DebugFlags.createLegacyEnvironmentConfig();
    globalScope.SafetyHelper = safetyHelper;
    globalScope.ErrorHandler = createErrorHandler(safetyHelper);
    globalScope.AssetResolver = assetResolver;
    globalScope.ResourceFallback = assetResolver.createLegacyFacade();
    globalScope.SaveGameV2Runtime = SaveGameV2;
  }
  bootstrap.afterLegacyRuntimeLoaded = function(requestedLocale) {
    installLegacyGlobals();
    const resolvedLocale = this.resolveLocale(requestedLocale);
    const appContext = createAppContext(assetResolver, {
      locale: resolvedLocale,
      manifestVersion: manifest ? manifest.version || 0 : 0
    });
    globalScope.AppContext = appContext;
    globalScope.BuriedTownAppContext = appContext;
    this.appContext = appContext;
    return appContext;
  };
  bootstrap.getAppContext = function() {
    return this.appContext || null;
  };
  globalScope.BuriedTownBootstrap = bootstrap;
  installLegacyGlobals();
})();
