const vm = require("vm");
const {
    assert,
    loadIntoSandbox,
    readRepoFile: readFile,
    runSmokeSuite,
    runSmokeSuiteCli
} = require("../lib/core");

function createExtendableBaseClass() {
    function BaseClass() {
        if (this.ctor) {
            this.ctor.apply(this, arguments);
        }
    }

    BaseClass.extend = function (definition) {
        const Parent = this;
        function SubClass() {
            const previousSuper = this._super;
            this._super = function () {
                if (Parent.prototype && typeof Parent.prototype.ctor === "function") {
                    return Parent.prototype.ctor.apply(this, arguments);
                }
                if (typeof Parent === "function") {
                    return Parent.apply(this, arguments);
                }
            };
            if (this.ctor) {
                this.ctor.apply(this, arguments);
            }
            this._super = previousSuper;
        }
        SubClass.prototype = Object.create(Parent.prototype || {});
        Object.keys(definition || {}).forEach(function (key) {
            SubClass.prototype[key] = definition[key];
        });
        SubClass.prototype.constructor = SubClass;
        SubClass.extend = Parent.extend;
        return SubClass;
    };

    return BaseClass;
}

function runSyntaxSmoke() {
    const files = [
        "assets/src/data/playerConfig.js",
        "assets/src/data/playerAttrEffect.js",
        "assets/src/data/weatherConfig.js",
        "assets/src/game/GameRuntime.js",
        "assets/src/game/game.js",
        "assets/src/game/player.js",
        "assets/src/game/TravelService.js",
        "assets/src/game/Build.js",
        "assets/src/game/PlayerPersistenceService.js",
        "assets/src/game/BuildActionEffectService.js",
        "assets/src/game/buildAction.js",
        "assets/src/game/Battle.js",
        "assets/src/game/site.js",
        "assets/src/ui/MapActor.js",
        "assets/src/ui/MapInteractionController.js",
        "assets/src/ui/dialog.js",
        "assets/src/ui/battleAndWorkNode.js"
    ];

    files.forEach(function (relativePath) {
        new Function(readFile(relativePath));
    });

    return {
        name: "syntax",
        ok: true,
        detail: "compiled " + files.length + " files"
    };
}

function createVmSandbox() {
    const scheduler = {
        scheduleUpdateForTarget: function () {},
        unscheduleUpdateForTarget: function () {}
    };
    const localStorageState = {};
    const sandbox = {
        console: console,
        require: require,
        module: { exports: {} },
        exports: {},
        globalThis: null,
        utils: {
            emitter: {
                emitted: [],
                emit: function (name, payload) {
                    this.emitted.push([name, payload]);
                }
            },
            clone: function (value) {
                return JSON.parse(JSON.stringify(value));
            }
        },
        Record: {
            saveAll: function () {},
            init: function () {},
            restore: function () { return null; },
            getCurrentRecordName: function () { return "slot1"; }
        },
        cc: {
            Class: createExtendableBaseClass(),
            director: {
                getScheduler: function () {
                    return scheduler;
                }
            },
            sys: {
                isNative: false,
                localStorage: {
                    getItem: function (key) {
                        return Object.prototype.hasOwnProperty.call(localStorageState, key)
                            ? localStorageState[key]
                            : null;
                    },
                    setItem: function (key, value) {
                        localStorageState[key] = String(value);
                    },
                    removeItem: function (key) {
                        delete localStorageState[key];
                    }
                }
            },
            assert: function (condition, message) {
                if (!condition) {
                    throw new Error(message || "assert failed");
                }
            },
            timer: null,
            color: { WHITE: "white", RED: "red" },
            d: function () {},
            e: function () {},
            i: function () {},
            pDistance: function (a, b) {
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                return Math.sqrt(dx * dx + dy * dy);
            }
        },
        stringUtil: {
            getString: function (id) {
                return { title: "item-" + id };
            }
        },
        Achievement: {
            checkMake: function () {},
            checkProduce: function () {},
            checkCost: function () {}
        },
        TalentService: {
            applyHomeProduceEffect: function (produce) { return produce; },
            applyActiveTalentStartGifts: function () { return false; },
            getInfectIncreaseEffect: function (value) { return value; },
            migrateLegacyElitePistol: function () { return false; },
            reconcilePlayerHpByTalentSelection: function () {},
            bindIAPCompatApi: function (target) {
                const self = this;
                Object.keys(self).forEach(function (methodName) {
                    if (methodName === "bindIAPCompatApi" || typeof self[methodName] !== "function") {
                        return;
                    }
                    target[methodName] = function () {
                        return self[methodName].apply(self, arguments);
                    };
                });
            }
        },
        ItemRuntimeService: {
            applyProduceWeatherBonuses: function (produce) { return produce; },
            rollCraftProduce: function (produce) { return produce; }
        }
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    return sandbox;
}

function runRuntimeContextSmoke() {
    const sandbox = createVmSandbox();
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    loadIntoSandbox(sandbox, "assets/src/game/TravelService.js");
    loadIntoSandbox(sandbox, "assets/src/game/BuildActionEffectService.js");

    const runtimePlayer = {
        roleType: 1,
        map: { pos: { x: 0, y: 0 } },
        ziplineNetwork: {},
        weather: { getValue: function () { return 0; } },
        storage: {
            counts: {},
            getNumByItemId: function (itemId) {
                return this.counts[itemId] || 0;
            }
        },
        room: {
            getBuildCurrentName: function () {
                return "Workbench";
            }
        },
        getCurrentMapEntityId: function () { return 100; },
        getCurrentMapEntityKey: function () { return "site:100"; },
        gainItems: function (items) {
            const storage = this.storage;
            items.forEach(function (item) {
                storage.counts[item.itemId] = (storage.counts[item.itemId] || 0) + item.num;
            });
        },
        log: {
            logs: [],
            addMsg: function () {
                this.logs.push(Array.prototype.slice.call(arguments));
            }
        }
    };

    sandbox.GameRuntime.bootstrap({
        player: runtimePlayer,
        timer: {
            pause: function () {},
            resume: function () {},
            now: function () { return 123; }
        },
        emitter: sandbox.utils.emitter,
        record: sandbox.Record
    });

    const travelPlan = sandbox.TravelService.buildRuntimePlan({ endPos: { x: 3, y: 4 } });
    assert(travelPlan && travelPlan.distance === 5, "TravelService.buildRuntimePlan failed");

    const action = {
        bid: 2,
        id: 2,
        step: 1,
        pastTime: 0,
        config: { produce: [{ itemId: 101, num: 2 }], placedTime: 5 },
        addTimer: function (time, totalTime, cb) {
            this.timerArgs = [time, totalTime];
            cb();
        },
        _finishActioning: function (opt) {
            this.finishOpt = opt || {};
        }
    };

    sandbox.BuildActionEffectService.startPlacedTimer(action, {
        itemInfo: action.config.produce[0],
        placedTime: 300
    });
    assert(action.step === 2, "BuildActionEffectService.startPlacedTimer failed");

    const produce = sandbox.BuildActionEffectService.buildPlacedProduce(action, {
        applyGreenhouseBonus: true,
        rollCraftProduce: true
    });
    sandbox.BuildActionEffectService.grantProducedItems(action, produce, {
        achievementMethod: "checkProduce",
        logMessageId: 1092,
        resetStep: 0,
        finishOptions: { enableLeftBtn: false }
    });
    assert(runtimePlayer.storage.getNumByItemId(101) === 2, "BuildActionEffectService.grantProducedItems failed");
    assert(runtimePlayer.log.logs.length > 0, "BuildActionEffectService did not log output");

    return {
        name: "runtime-context",
        ok: true,
        detail: "validated GameRuntime, travel plan and build action helpers"
    };
}

function runRoleRuntimeRuleSmoke() {
    const sandbox = createVmSandbox();
    sandbox.role = {
        getRoleConfig: function (roleType) {
            if (Number(roleType) === 99) {
                return { actionTags: ["jin"] };
            }
            if (Number(roleType) === 98) {
                return { actionTags: ["luo"] };
            }
            if (Number(roleType) === 97) {
                return { actionTags: ["stranger"] };
            }
            if (Number(roleType) === 96) {
                return { actionTags: ["king"] };
            }
            if (Number(roleType) === 95) {
                return { actionTags: ["jie"] };
            }
            if (Number(roleType) === 94) {
                return { actionTags: ["yazi"] };
            }
            if (Number(roleType) === 93) {
                return { actionTags: ["bier"] };
            }
            if (Number(roleType) === 92) {
                return { actionTags: ["powered"] };
            }
            return { actionTags: [] };
        },
        getChoosenRoleType: function () {
            return 6;
        }
    };
    sandbox.RoleType = { STRANGER: 6 };
    sandbox.npcConfig = {};
    sandbox.IAPPackage = {
        isIAPUnlocked: function (purchaseId) { return Number(purchaseId) === 105; },
        isBootUnlocked: function () { return false; },
        isBigBagUnlocked: function () { return true; }
    };
    loadIntoSandbox(sandbox, "assets/src/data/formulaConfig.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");
    loadIntoSandbox(sandbox, "assets/src/game/RoleRuntimeService.js");

    const jinOnlyAction = {
        id: 1203012,
        config: sandbox.formulaConfig["1203012"]
    };
    const nonJinAction = {
        id: 1203011,
        config: sandbox.formulaConfig["1203011"]
    };
    const luoBlockedAction = {
        id: 1205033,
        config: sandbox.formulaConfig["1205033"]
    };
    const strangerOnlyAction = {
        id: 1201071,
        config: sandbox.formulaConfig["1201071"]
    };
    const kingOnlyAction = {
        id: 1202053,
        config: sandbox.formulaConfig["1202053"]
    };
    const strangerKingAction = {
        id: 1205011,
        config: sandbox.formulaConfig["1205011"]
    };
    const jieOnlyAction = {
        id: 1201011,
        config: sandbox.formulaConfig["1201011"]
    };
    const yaziOnlyAction = {
        id: 1201022,
        config: sandbox.formulaConfig["1201022"]
    };
    const yaziKingAction = {
        id: 1401071,
        config: sandbox.formulaConfig["1401071"]
    };
    const yaziBlockedAction = {
        id: 1401011,
        config: sandbox.formulaConfig["1401011"]
    };
    const poweredOnlyAction = {
        id: 1203064,
        config: sandbox.formulaConfig["1203064"]
    };
    const poweredHiddenAction = {
        id: 1203063,
        config: sandbox.formulaConfig["1203063"]
    };
    const bierKingAction = {
        id: 1401052,
        config: sandbox.formulaConfig["1401052"]
    };
    const purchaseLockedAction = {
        id: 999001,
        runtimeRule: {
            purchaseLock: {
                purchaseId: 106,
                checkFn: "isBootUnlocked"
            }
        }
    };

    assert(sandbox.RoleRuntimeService._getBuildActionRules(jinOnlyAction).length === 1, "jin include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(nonJinAction).length === 1, "jin exclude rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(luoBlockedAction).length === 1, "luo exclude rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(strangerOnlyAction).length === 1, "stranger include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(kingOnlyAction).length === 1, "king/bier include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(strangerKingAction).length === 1, "stranger/bier/king include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(jieOnlyAction).length === 1, "jie include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(yaziOnlyAction).length === 1, "yazi include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(yaziKingAction).length === 1, "yazi/king include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(yaziBlockedAction).length === 1, "yazi/bier exclude rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(poweredOnlyAction).length === 1, "powered include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(poweredHiddenAction).length === 1, "powered hide rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(bierKingAction).length === 1, "bier/king include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(jinOnlyAction, 99, {}) === true, "jin-tagged role should see jin-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(jinOnlyAction, 6, {}) === false, "non-jin role should not see jin-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(nonJinAction, 99, {}) === false, "jin-tagged role should hide non-jin action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(nonJinAction, 6, {}) === true, "non-jin role should keep non-jin action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(luoBlockedAction, 98, {}) === false, "luo-tagged role should hide luo-blocked action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(luoBlockedAction, 6, {}) === true, "non-luo role should keep luo-blocked action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(strangerOnlyAction, 97, {}) === true, "stranger-tagged role should see stranger-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(strangerOnlyAction, 6, {}) === false, "non-stranger role should not see stranger-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(kingOnlyAction, 96, {}) === true, "king-tagged role should see king/bier action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(kingOnlyAction, 6, {}) === false, "non-king role should not see king/bier action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(strangerKingAction, 97, {}) === true, "stranger-tagged role should see stranger/bier/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(strangerKingAction, 6, {}) === false, "default role should not see stranger/bier/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(jieOnlyAction, 95, {}) === true, "jie-tagged role should see jie-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(jieOnlyAction, 6, {}) === false, "non-jie role should not see jie-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziOnlyAction, 94, {}) === true, "yazi-tagged role should see yazi-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziOnlyAction, 6, {}) === false, "default role should not see yazi-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziKingAction, 94, {}) === true, "yazi-tagged role should see yazi/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziKingAction, 96, {}) === true, "king-tagged role should see yazi/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziKingAction, 6, {}) === false, "default role should not see yazi/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziBlockedAction, 94, {}) === false, "yazi-tagged role should hide yazi/bier-blocked action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziBlockedAction, 93, {}) === false, "bier-tagged role should hide yazi/bier-blocked action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziBlockedAction, 6, {}) === true, "default role should keep yazi/bier-blocked action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredOnlyAction, 92, { isWorkSitePowered: true }) === true, "powered-tagged role should see powered-only action when worksite is powered");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredOnlyAction, 92, { isWorkSitePowered: false }) === false, "powered-only action should stay hidden when worksite is not powered");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredOnlyAction, 6, { isWorkSitePowered: true }) === false, "default role should not see powered-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredHiddenAction, 92, { isWorkSitePowered: true }) === false, "powered-tagged role should hide powered-blocked action when worksite is powered");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredHiddenAction, 92, { isWorkSitePowered: false }) === true, "powered-blocked action should stay visible when worksite is not powered");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredHiddenAction, 6, { isWorkSitePowered: true }) === true, "default role should keep powered-blocked action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(bierKingAction, 93, {}) === true, "bier-tagged role should see bier/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(bierKingAction, 96, {}) === true, "king-tagged role should see bier/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(bierKingAction, 6, {}) === false, "default role should not see bier/king action");
    assert(sandbox.PurchaseService.isPurchaseLockUnlocked(purchaseLockedAction.runtimeRule.purchaseLock) === false,
        "PurchaseService should interpret purchaseLock compatibility checks");
    assert(sandbox.PurchaseService.isPurchaseLockUnlocked({
        purchaseId: 105,
        checkFn: "isBigBagUnlocked"
    }) === true, "PurchaseService should resolve legacy purchaseLock checkFn through purchase ids");
    assert(sandbox.RoleRuntimeService.getBuildActionLockState(purchaseLockedAction).isLocked === true,
        "RoleRuntimeService should lock actions when PurchaseService reports purchaseLock unmet");
    sandbox.PurchaseService.isPurchaseLockUnlocked = function (purchaseLock) {
        return purchaseLock && purchaseLock.checkFn === "isBootUnlocked";
    };
    sandbox.IAPPackage.isIAPUnlocked = function () {
        throw new Error("RoleRuntimeService should not read purchase state directly from IAPPackage");
    };
    assert(sandbox.RoleRuntimeService.getBuildActionLockState(purchaseLockedAction).isLocked === false,
        "RoleRuntimeService should delegate purchaseLock checks through PurchaseService when available");
    assert(sandbox.RoleRuntimeService._buildActionVisibilityGroups.length === 0, "RoleRuntimeService legacy visibility groups should now be empty");

    return {
        name: "role-runtime-rules",
        ok: true,
        detail: "validated config-driven jin, luo, stranger, jie, yazi, bier, king, powered and purchase-lock build action rules"
    };
}

function runTimerRepeatAlignmentSmoke() {
    const sandbox = createVmSandbox();
    sandbox.player = {
        log: {
            addMsg: function () {}
        }
    };
    sandbox.stringUtil = {
        getString: function () {
            return "";
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/TimeManager.js");

    const timer = new sandbox.TimerManager();
    const toTime = function (d, h, m, s) {
        return timer.objToTime({ d: d, h: h, m: m || 0, s: s || 0 });
    };

    timer.time = toTime(0, 20, 0, 0);
    let dayTriggers = 0;
    const dayCallback = timer.addTimerCallbackDayByDay(null, function () {
        dayTriggers++;
    });

    timer.updateTime(toTime(1, 6, 0, 0) - timer.time);

    assert(dayTriggers === 1, "day-by-day callback should trigger once when jumping across midnight");
    assert(dayCallback.getEndTime() === toTime(2, 0, 0, 0), "day-by-day callback should stay aligned to midnight after a long jump");

    const timer2 = new sandbox.TimerManager();
    const toTime2 = function (d, h, m, s) {
        return timer2.objToTime({ d: d, h: h, m: m || 0, s: s || 0 });
    };

    timer2.time = toTime2(0, 18, 0, 0);
    const stageTransitions = [];
    const dayNightCallbacks = timer2.addTimerCallbackDayAndNight(null, function (flag) {
        stageTransitions.push(flag);
    });

    timer2.updateTime(toTime2(0, 23, 0, 0) - timer2.time);

    assert(stageTransitions.length === 1 && stageTransitions[0] === "night", "skip-to-night jump should trigger the night transition once");
    assert(dayNightCallbacks[1].getEndTime() === toTime2(1, 20, 0, 0), "night callback should stay aligned to 20:00 after a long jump");

    return {
        name: "timer-repeat-alignment",
        ok: true,
        detail: "validated recurring timer callbacks stay aligned after long time jumps"
    };
}

function runBattleCadenceSmoke() {
    const sandbox = createVmSandbox();
    let weaponUses = 0;
    let bulletConsumed = 0;

    sandbox.cc.clampf = function (value, minValue, maxValue) {
        return Math.max(minValue, Math.min(maxValue, value));
    };
    sandbox.itemConfig = {
        1305011: {
            effect_weapon: {
                atk: 10
            }
        },
        1301052: {
            effect_weapon: {
                atkCD: 2,
                range: 5,
                bulletMin: 1,
                bulletMax: 1,
                precise: 1,
                dtPrecise: 0,
                deathHit: 0,
                dtDeathHit: 0
            }
        }
    };
    sandbox.Equipment = {
        HAND: 1
    };
    sandbox.RoleRuntimeService = {
        getSpiritPrecisePenalty: function () { return 0; },
        getVigourPrecisePenalty: function () { return 0; }
    };
    sandbox.CombatResolver = {
        normalizeRate: function (value, defaultValue) {
            value = Number(value);
            return isNaN(value) ? defaultValue : value;
        },
        resolveTwoPhaseHit: function () {
            return { success: true };
        },
        getDamageAfterDefense: function (attack, def, minDamage) {
            return Math.max(minDamage, attack - def);
        }
    };
    sandbox.audioManager = {
        sound: {
            ATTACK_4: "attack_4"
        },
        playEffect: function () {
            return 1;
        },
        stopEffect: function () {}
    };
    sandbox.player = {
        vigourEffect: function () { return 1; },
        weather: {
            getValue: function () { return 0; }
        },
        map: {
            getSite: function () {
                return { isActive: true };
            }
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/BattleEquipmentSystem.js");

    const targetMonster = {
        line: { index: 0 },
        isDie: function () { return false; },
        underAtk: function () {}
    };
    const battlePlayer = {
        bulletNum: 60,
        toolNum: 0,
        runtimeConfig: {
            monsterDodgeRate: 0
        },
        currentTime: 0,
        sharedAttackReadyAt: 0,
        getBattleTime: function () {
            return this.currentTime;
        },
        isInSharedAttackCooldown: function (battleTime) {
            return this.sharedAttackReadyAt > battleTime;
        },
        enterSharedAttackCooldown: function (cooldown, battleTime) {
            this.sharedAttackReadyAt = Number((battleTime + cooldown).toFixed(3));
        },
        battle: {
            targetMon: targetMonster,
            isBattleEnd: false,
            recordWeaponUse: function () {
                weaponUses++;
            },
            recordBulletConsumed: function () {
                bulletConsumed++;
            },
            processLog: function () {}
        }
    };

    const gun = new sandbox.BattleEquipmentSystem.Gun(1301052, battlePlayer);
    let actionCount = 0;
    for (let i = 0; i < 20; i++) {
        const battleTime = Number((i * 0.1).toFixed(1));
        battlePlayer.currentTime = battleTime;
        gun.update(battleTime);
        if (gun.action(battleTime)) {
            actionCount++;
        }
    }

    assert(actionCount === 1, "gun should only fire once before a 2 second cooldown expires");
    assert(weaponUses === 1, "weapon use record should stay aligned with cooldown gating");
    assert(bulletConsumed === 1, "single-shot cooldown test gun should only consume one bullet before cooldown ends");

    battlePlayer.currentTime = 2;
    gun.update(2);
    assert(gun.action(2) === true, "gun should fire again exactly when cooldown reaches 2 seconds");

    return {
        name: "battle-cadence",
        ok: true,
        detail: "validated absolute-time weapon cooldown gating stays stable across repeated battle ticks"
    };
}

function runCraftBuildActionReuseSmoke() {
    const sandbox = createVmSandbox();
    sandbox.player = {
        getItemNumInPlayer: function () { return 50; },
        dog: {
            canFeed: function () { return true; },
            feed: function () {},
            isActive: function () { return false; }
        },
        isBombActive: false
    };
    sandbox.uiUtil = {
        checkVigour: function () { return true; },
        showItemDialog: function () {},
        showBuildActionDialog: function () {},
        showTinyInfoDialog: function () {},
        showCraftCountSliderDialog: function () {},
        getItemIconFrameName: function () { return ""; },
        getDefaultSpriteName: function () { return ""; }
    };
    sandbox.buildActionConfig = {
        "5": [{
            cost: [{ itemId: 1101011, num: 1 }],
            makeTime: 240,
            max: 6
        }],
        "12": [{
            cost: [{ itemId: 1103041, num: 2 }],
            makeTime: 30
        }],
        "17": [{
            cost: [{ itemId: 1303012, num: 3 }],
            makeTime: 30
        }],
        "8": [{
            produce: [{ itemId: 1103041, num: 4 }],
            cost: [{ itemId: 1103011, num: 2 }],
            makeTime: 30,
            placedTime: [2880, 4320]
        }],
        "9": [{
            effect: {
                spirit: 1
            }
        }],
        "19": [{
            effect: {
                spirit: 1
            }
        }]
    };
    sandbox.formulaConfig = {};
    sandbox.RoleRuntimeService = {
        getRestActionTypes: function () {
            return [];
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/buildAction.js");

    const formulaProto = sandbox.Formula && sandbox.Formula.prototype;
    const trapProto = sandbox.TrapBuildAction && sandbox.TrapBuildAction.prototype;
    assert(formulaProto && trapProto, "buildAction prototypes should load into sandbox");
    assert(sandbox.BuildActionTypeRegistry, "BuildActionTypeRegistry should load into sandbox");
    assert(sandbox.BuildActionTypeRegistry._types.formula, "formula action type should be registered");
    assert(sandbox.BuildActionTypeRegistry._types.rest, "rest action type should be registered");
    assert(sandbox.BuildActionTypeRegistry._types.smoke, "smoke action type should be registered");
    assert(sandbox.BuildActionTypeRegistry._types.trap, "trap action type should be registered");
    assert(sandbox.BuildActionTypeRegistry._types.bed, "bed action type should be registered");
    assert(sandbox.BuildActionTypeRegistry._types.dog, "dog action type should be registered");
    assert(sandbox.BuildActionTypeRegistry._types.bomb, "bomb action type should be registered");
    assert(sandbox.BuildActionTypeRegistry._types.bonfire, "bonfire action type should be registered");
    assert(typeof sandbox.BuildActionFactory.registerBuildActionGroup === "function",
        "BuildActionFactory should expose build-action group registration");
    assert(typeof sandbox.BuildActionFactory.createBuildActions === "function",
        "BuildActionFactory should expose build-action group creation");

    assert(formulaProto.getBatchCount.call({ config: { batchCount: 7 } }) === 7, "Formula should read batchCount from config");

    const limitedBatchAction = {
        config: {
            cost: [{ itemId: 1103011, num: 2 }],
            batchCount: 4
        },
        supportsBatchCraft: formulaProto.supportsBatchCraft,
        getBatchCount: formulaProto.getBatchCount
    };
    assert(formulaProto.getMaxBatchCraftCount.call(limitedBatchAction) === 4, "Formula batch craft should clamp to configured batchCount");

    const freeBatchAction = {
        config: {
            cost: [],
            batchCount: 6
        },
        supportsBatchCraft: formulaProto.supportsBatchCraft,
        getBatchCount: formulaProto.getBatchCount
    };
    assert(formulaProto.getMaxBatchCraftCount.call(freeBatchAction) === 6, "Formula no-cost batch craft should still respect configured batchCount");

    assert(trapProto.place === formulaProto.place, "TrapBuildAction should reuse Formula place flow");
    assert(typeof trapProto.tryAutoSet === "function", "TrapBuildAction should expose auto-set flow");
    assert(typeof sandbox.TrapAutoSetBuildAction === "function", "Trap auto-set companion action should load into sandbox");
    assert(typeof sandbox.DogAutoFeedBuildAction === "function", "Dog auto-feed companion action should load into sandbox");

    const trapAction = sandbox.BuildActionTypeRegistry.create("trap", { bid: 8 });
    const bedAction = sandbox.BuildActionTypeRegistry.create("bed", {
        bid: 19,
        level: 0,
        bedActionType: sandbox.BedBuildActionType.SLEEP_4_HOUR
    });
    const bedActions = sandbox.BuildActionFactory.createBedActions(19, 0);
    const trapBuildActions = sandbox.BuildActionFactory.createBuildActions(8, 0);
    const bedBuildActions = sandbox.BuildActionFactory.createBuildActions(9, 0);
    const bonfireBuildActions = sandbox.BuildActionFactory.createBuildActions(5, 0);
    const dogBuildActions = sandbox.BuildActionFactory.createBuildActions(12, 0);
    const bombBuildActions = sandbox.BuildActionFactory.createBuildActions(17, 0);
    const dogAction = sandbox.BuildActionTypeRegistry.create("dog", { bid: 12 });
    const bombAction = sandbox.BuildActionTypeRegistry.create("bomb", { bid: 17 });
    assert(trapAction && typeof trapAction.clickAction1 === "function", "trap action type should create runnable actions");
    assert(bedAction && bedAction.getActionKey() === "19:2", "bed action type should create keyed actions");
    assert(bedActions.length === 4, "bed action factory should create all bed action variants");
    assert(bedActions.map(function (action) { return action.getActionKey(); }).join(",") === "19:1,19:2,19:3,19:4",
        "bed action factory should create stable keyed variants");
    assert(trapBuildActions.length === 2 && trapBuildActions[1].getActionKey() === "8:auto_set",
        "build action group factory should compose trap auto-set companion actions");
    assert(bedBuildActions.length === 4 && bedBuildActions[0].getActionKey() === "9:1",
        "build action group factory should compose bed action variants by build id");
    assert(bonfireBuildActions.length === 1 && bonfireBuildActions[0].id === 5,
        "build action group factory should compose bonfire fuel actions");
    assert(dogBuildActions.length === 2 && dogBuildActions[1].getActionKey() === "12:auto_feed",
        "build action group factory should compose dog auto-feed companion actions");
    assert(bombBuildActions.length === 1 && bombBuildActions[0].id === 17,
        "build action group factory should compose bomb timed-state actions");
    assert(dogAction && typeof dogAction.clickAction1 === "function", "dog action type should create runnable actions");
    assert(bombAction && typeof bombAction.clickAction1 === "function", "bomb action type should create runnable actions");
    assert(sandbox.BuildActionFactory.resolveBuildActiveState({
        id: 5,
        actions: [{
            isActive: function () {
                return true;
            }
        }]
    }) === true, "BuildActionFactory should expose build active-state hooks for bonfire-like builds");
    assert(sandbox.BuildActionFactory.resolveBuildActiveState({ id: 2, actions: [] }) === null,
        "BuildActionFactory should keep default builds on generic active-state handling");

    return {
        name: "craft-build-action-reuse",
        ok: true,
        detail: "validated action type registry plus build-level action group composition for Trap/Bed/Dog/Bomb/Bonfire"
    };
}

function runBonfireStateSmoke() {
    const sandbox = createVmSandbox();
    const timerCallbacks = [];
    const buildSignals = [];
    let recordSaveCount = 0;
    let temperatureUpdates = 0;
    let itemCosts = 0;

    sandbox.TimerCallback = function (time, target, callbacks) {
        this.time = time;
        this.target = target;
        this.process = callbacks.process;
        this.end = callbacks.end;
    };
    sandbox.cc.timer = {
        time: 360,
        addTimerCallback: function (timerCallback, startTime) {
            const callbackInfo = {
                callback: timerCallback,
                startTime: startTime === undefined || startTime === null ? this.time : startTime
            };
            timerCallbacks.push(callbackInfo);
            return callbackInfo;
        }
    };
    sandbox.Record.saveAll = function () {
        recordSaveCount++;
    };
    sandbox.player = {
        validateItems: function () { return true; },
        costItems: function () { itemCosts++; },
        updateTemperature: function () { temperatureUpdates++; },
        log: {
            addMsg: function () {}
        }
    };
    sandbox.uiUtil = {
        checkVigour: function () { return true; },
        showBuildActionDialog: function () {},
        showTinyInfoDialog: function () {},
        getItemIconFrameName: function () { return ""; },
        getDefaultSpriteName: function () { return ""; }
    };
    sandbox.buildActionConfig = {
        "5": [{
            cost: [{ itemId: 1101011, num: 1 }],
            makeTime: 240,
            max: 6
        }]
    };
    sandbox.formulaConfig = {};

    loadIntoSandbox(sandbox, "assets/src/game/buildAction.js");

    const bonfireAction = sandbox.BuildActionTypeRegistry.create("bonfire", { bid: 5 });
    bonfireAction.build = {
        setActiveBtnIndex: function (key) {
            buildSignals.push(["set", key]);
        },
        resetActiveBtnIndex: function (key) {
            buildSignals.push(["reset", key]);
        }
    };

    bonfireAction.clickAction1();

    assert(itemCosts === 1, "bonfire click should spend cost once");
    assert(bonfireAction.fuel === 1, "bonfire click should add one fuel");
    assert(temperatureUpdates === 1, "bonfire fuel add should refresh temperature once");
    assert(recordSaveCount === 1, "bonfire fuel add should save record once");
    assert(timerCallbacks.length === 1, "bonfire first fuel should schedule one timer");
    assert(buildSignals.length === 1 && buildSignals[0][0] === "set", "bonfire first fuel should activate build button");

    const savedState = bonfireAction.save();
    assert(savedState.fuel === 1, "bonfire save should persist fuel");
    assert(savedState.startTime === timerCallbacks[0].startTime, "bonfire save should persist timer start time");

    const restoredAction = sandbox.BuildActionTypeRegistry.create("bonfire", { bid: 5 });
    restoredAction.build = bonfireAction.build;
    restoredAction.restore(savedState);
    assert(restoredAction.fuel === 1, "bonfire restore should recover fuel");
    assert(timerCallbacks.length === 2, "bonfire restore should resubscribe timer");

    timerCallbacks[1].callback.end();

    assert(restoredAction.fuel === 0, "bonfire timer end should consume fuel");
    assert(temperatureUpdates === 2, "bonfire fuel depletion should refresh temperature");
    assert(recordSaveCount === 2, "bonfire timer end should save record");
    assert(buildSignals[1][0] === "reset", "bonfire depletion should reset build button");

    return {
        name: "bonfire-state",
        ok: true,
        detail: "validated bonfire registry action save/restore and fuel timer state transitions"
    };
}

function runBuildRegistrySmoke() {
    const sandbox = createVmSandbox();
    const buildActionCalls = [];
    function createAction(id, actionKey) {
        return {
            id: id,
            actionKey: actionKey,
            step: 0,
            fuel: 0,
            isActioning: false,
            save: function () { return {}; },
            restore: function () {},
            canMake: function () { return false; },
            getActionKey: function () { return this.actionKey || this.id; }
        };
    }

    sandbox.buildConfig = {
        "2": [{ produceList: [] }],
        "5": [{ produceList: [] }],
        "8": [{ produceList: [] }],
        "9": [{ produceList: [] }],
        "10": [{ produceList: [] }],
        "12": [{ produceList: [] }],
        "17": [{ produceList: [] }]
    };
    sandbox.buildUpgradeConfig = {};
    sandbox.BuildActionFactory = {
        createBuildActions: function (bid, level) {
            buildActionCalls.push([bid, level]);
            switch (bid) {
                case 5:
                    return [createAction(bid, bid + ":bonfire")];
                case 8:
                    return [
                        createAction(bid, bid + ":trap"),
                        createAction(bid, bid + ":auto_set")
                    ];
                case 9:
                    return [
                        createAction(bid, bid + ":1"),
                        createAction(bid, bid + ":2"),
                        createAction(bid, bid + ":3"),
                        createAction(bid, bid + ":4")
                    ];
                case 10:
                    return [createAction(bid, bid + ":rest")];
                case 12:
                    return [
                        createAction(bid, bid + ":dog"),
                        createAction(bid, bid + ":auto_feed")
                    ];
                case 17:
                    return [createAction(bid, bid + ":bomb")];
                default:
                    return [createAction(bid, bid + ":formula")];
            }
        }
    };
    sandbox.RoleRuntimeService = {
        applyRoomBuildStates: function () {}
    };

    loadIntoSandbox(sandbox, "assets/src/game/Build.js");

    const room = new sandbox.Room();
    room.createBuild(5, 0);
    room.createBuild(8, 0);
    room.createBuild(9, 0);
    room.createBuild(10, 0);
    room.createBuild(12, 0);
    room.createBuild(17, 0);
    room.createBuild(2, 0);

    assert(typeof sandbox.BuildTypeRegistry === "undefined",
        "Build.js should no longer expose special build-type registration");
    assert(buildActionCalls.map(function (entry) { return entry.join(":"); }).join(",") === "5:0,8:0,9:0,10:0,12:0,17:0,2:0",
        "Room.createBuild should delegate all action composition through BuildActionFactory.createBuildActions");
    assert(room.getBuild(5) instanceof sandbox.Build, "bonfire should now use the generic Build model");
    assert(room.getBuild(8) instanceof sandbox.Build, "trap should now use the generic Build model");
    assert(room.getBuild(9) instanceof sandbox.Build, "bed should now use the generic Build model");
    assert(room.getBuild(10) instanceof sandbox.Build, "rest build should now use the generic Build model");
    assert(room.getBuild(12) instanceof sandbox.Build, "dog build should now use the generic Build model");
    assert(room.getBuild(17) instanceof sandbox.Build, "bomb build should now use the generic Build model");
    assert(room.getBuild(8).actions.length === 2 && room.getBuild(8).actions[1].getActionKey() === "8:auto_set",
        "trap build should restore both primary and companion actions from the factory");
    assert(room.getBuild(9).actions.length === 4 && room.getBuild(9).actions[3].getActionKey() === "9:4",
        "bed build should restore all sleep action variants from the factory");
    assert(room.getBuild(12).actions.length === 2 && room.getBuild(12).actions[1].getActionKey() === "12:auto_feed",
        "dog build should restore auto-feed companion action from the factory");
    assert(room.getBuild(2).actions.length === 1 && room.getBuild(2).actions[0].getActionKey() === "2:formula",
        "default builds should still restore action lists from the shared factory entry point");

    return {
        name: "build-registry",
        ok: true,
        detail: "validated Build.js delegates action composition to BuildActionFactory and keeps builds on the generic model"
    };
}

function createCountStorage(initialCounts) {
    const counts = Object.assign({}, initialCounts || {});
    return {
        counts: counts,
        validateItem: function (itemId, num) {
            return (this.counts[itemId] || 0) >= Number(num);
        },
        getNumByItemId: function (itemId) {
            return this.counts[itemId] || 0;
        },
        increaseItem: function (itemId, num) {
            this.counts[itemId] = (this.counts[itemId] || 0) + Number(num);
        },
        decreaseItem: function (itemId, num) {
            const nextValue = (this.counts[itemId] || 0) - Number(num);
            if (nextValue > 0) {
                this.counts[itemId] = nextValue;
            } else {
                delete this.counts[itemId];
            }
        }
    };
}

function createPurchaseRewardPlayer(initialState) {
    initialState = initialState || {};
    const playerObj = {
        storage: createCountStorage(initialState.storage),
        bag: createCountStorage(initialState.bag),
        room: {
            buildLevels: Object.assign({}, initialState.buildLevels || {}),
            createCalls: [],
            isBuildExist: function (bid, level) {
                return Object.prototype.hasOwnProperty.call(this.buildLevels, bid) && this.buildLevels[bid] >= level;
            },
            createBuild: function (bid, level) {
                this.buildLevels[bid] = level;
                this.createCalls.push([bid, level]);
            }
        }
    };
    playerObj.getItemNumInPlayer = function (itemId) {
        return this.storage.getNumByItemId(itemId) + this.bag.getNumByItemId(itemId);
    };
    return playerObj;
}

function runPurchaseUnlockRewardSmoke() {
    const sandbox = createVmSandbox();
    sandbox.IAPPackage = {
        isIAPUnlocked: function (purchaseId) {
            return purchaseId === 105 || purchaseId === 106 || purchaseId === 107;
        }
    };
    sandbox.player = createPurchaseRewardPlayer({ bag: { 1305024: 1 } });

    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");

    assert(sandbox.PurchaseService._grantUnlockReward(105) === false,
        "PurchaseService should not duplicate unlock reward items already owned in bag");
    assert(sandbox.player.storage.getNumByItemId(1305024) === 0,
        "PurchaseService should not backfill storage when bag already owns the unlock reward item");

    const reconcilePlayer = createPurchaseRewardPlayer({ bag: { 1305024: 1 } });
    assert(sandbox.PurchaseService.reconcileUnlockRewardsForPlayer(reconcilePlayer, [105, 106, 107]) === true,
        "PurchaseService should reconcile missing unlock rewards for unlocked purchases");
    assert(reconcilePlayer.storage.getNumByItemId(1305024) === 0,
        "PurchaseService should not duplicate big bag reward when it already exists in bag");
    assert(reconcilePlayer.storage.getNumByItemId(1304024) === 1,
        "PurchaseService should restore the boots unlock reward when it is missing");
    assert(reconcilePlayer.room.buildLevels[12] === 0,
        "PurchaseService should restore dog house unlock reward at build level 0");
    assert(reconcilePlayer.room.createCalls.length === 1 && reconcilePlayer.room.createCalls[0][1] === 0,
        "PurchaseService should create dog house using the unlocked build level");
    assert(sandbox.PurchaseService.reconcileUnlockRewardsForPlayer(reconcilePlayer, [105, 106, 107]) === false,
        "PurchaseService unlock reward reconciliation should be idempotent once rewards exist");

    return {
        name: "purchase-unlock-rewards",
        ok: true,
        detail: "validated purchase unlock reward grant/reconcile flow avoids duplicate items and restores dog house at unlocked level"
    };
}

function runPurchaseExchangeConfigSmoke() {
    const sandbox = createVmSandbox();
    sandbox.TalentService = {
        isTalentPurchaseId: function (purchaseId) {
            return Number(purchaseId) === 120;
        },
        getTalentMaxLevel: function () {
            return 3;
        }
    };
    loadIntoSandbox(sandbox, "assets/src/data/roleConfigTable.js");
    loadIntoSandbox(sandbox, "assets/src/game/role.js");
    loadIntoSandbox(sandbox, "assets/src/game/medal.js");
    loadIntoSandbox(sandbox, "assets/src/plugin/purchaseList.js");
    loadIntoSandbox(sandbox, "assets/src/game/IAPPackage.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");
    sandbox.Medal._exchangeMap = {
        2005: { unlocked: true }
    };
    sandbox.Medal._achievementPoints = 0;

    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(108)) === "[1001]",
        "IAPPackage should resolve legacy paid role exchanges from ExchangeAchievementConfig via role config");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(114)) === "[1007]",
        "IAPPackage should resolve new role exchanges from ExchangeAchievementConfig via role config");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(105)) === "[3001]",
        "IAPPackage should resolve exchange-only item purchases from ExchangeAchievementConfig");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(107)) === "[3003]",
        "IAPPackage should resolve dog house exchange purchase from ExchangeAchievementConfig");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(120)) === "[2005,2105,2205]",
        "IAPPackage should resolve ordered talent exchange levels from ExchangeAchievementConfig");
    assert(sandbox.IAPPackage.getExchangeIdByPurchaseId(120) === 2105,
        "IAPPackage should return the next unexchanged talent level after configured exchange sorting");
    assert(sandbox.IAPPackage.isExchangePurchase(110) === true,
        "IAPPackage should keep exchange-role purchases on config-driven exchange flow");
    assert(sandbox.IAPPackage.isExchangePurchase(203) === false,
        "IAPPackage should not treat consumable support packs as exchange-config purchases");
    assert(sandbox.PurchaseService.isTalentPurchase(120) === true,
        "PurchaseService should source talent purchase detection from TalentService");
    const paidRoleType = sandbox.role.getRoleTypeByPurchaseId(108);
    sandbox.PurchaseService.isUnlocked = function (purchaseId) {
        return Number(purchaseId) === 108;
    };
    sandbox.Medal.isExchanged = function () {
        throw new Error("role.isRoleUnlocked should prefer PurchaseService purchase-state checks");
    };
    assert(sandbox.PurchaseService.isRoleUnlocked(paidRoleType) === true,
        "PurchaseService should resolve paid role unlock state through purchase ids");
    assert(sandbox.role.isRoleUnlocked(paidRoleType) === true,
        "role.isRoleUnlocked should delegate purchase-required role unlock state through PurchaseService");
    assert(typeof sandbox.IAPPackage.getPreciseEffect === "undefined",
        "IAPPackage should no longer mirror talent gameplay effect APIs");
    assert(typeof sandbox.IAPPackage.hasChosenTalent === "undefined",
        "IAPPackage should no longer mirror talent selection APIs");

    return {
        name: "purchase-exchange-config",
        ok: true,
        detail: "validated IAPPackage derives exchange mappings from config while talent gameplay ownership stays outside the purchase chain"
    };
}

function runTalentSelectionMigrationSmoke() {
    const sandbox = createVmSandbox();
    sandbox.Record = {
        getCurrentSlot: function () {
            return 2;
        },
        hasRecord: function (slot) {
            return Number(slot) === 2;
        },
        getAllRecordNames: function () {
            return ["record", "record_2", "record_3"];
        }
    };
    sandbox.PurchaseService = {
        isUnlocked: function () {
            return true;
        }
    };

    loadIntoSandbox(sandbox, "assets/src/data/talentConfigTable.js");
    loadIntoSandbox(sandbox, "assets/src/game/TalentService.js");

    sandbox.cc.sys.localStorage.setItem("chosenTalent_slot_2", "120");
    assert(JSON.stringify(sandbox.TalentService.getChosenTalentPurchaseIds()) === "[120]",
        "TalentService should migrate legacy slot single-choice keys into chosenTalents_slot storage");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents_slot_2") === "[120]",
        "TalentService should persist migrated slot talent selection in chosenTalents_slot storage");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalent_slot_2") === null,
        "TalentService should remove legacy chosenTalent_slot storage after migration");

    sandbox.TalentService.resetChosenTalentCache();
    sandbox.Record.getCurrentSlot = function () {
        return 1;
    };
    sandbox.Record.hasRecord = function (slot) {
        return Number(slot) === 1;
    };
    sandbox.cc.sys.localStorage.setItem("chosenTalents", "[121,122]");
    assert(JSON.stringify(sandbox.TalentService.getChosenTalentPurchaseIds()) === "[121,122]",
        "TalentService should migrate legacy global chosenTalents storage for single-record saves");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents_slot_1") === "[121,122]",
        "TalentService should rewrite migrated global talent selections into slot-scoped storage");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents") === null,
        "TalentService should remove legacy global chosenTalents storage after migration");

    sandbox.TalentService.chooseTalents([120, 121]);
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents_slot_1") === "[120,121]",
        "TalentService should keep chosenTalents_slot as the only live talent selection storage");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalent_slot_1") === null,
        "TalentService should stop writing legacy chosenTalent_slot mirror keys");

    return {
        name: "talent-selection-migration",
        ok: true,
        detail: "validated TalentService migrates legacy talent selection keys into chosenTalents_slot storage and stops writing mirror keys"
    };
}

function runPlayerPersistencePurchaseDelegationSmoke() {
    const sandbox = createVmSandbox();
    let purchaseReconcileCount = 0;
    let recordSaveCount = 0;
    let talentMigrationCount = 0;
    let talentHpReconcileCount = 0;

    sandbox.IAPPackage = {
        isBigBagUnlocked: function () {
            throw new Error("PlayerPersistenceService should prefer PurchaseService unlock reconciliation");
        },
        isBootUnlocked: function () {
            throw new Error("PlayerPersistenceService should prefer PurchaseService unlock reconciliation");
        },
        isDogHouseUnlocked: function () {
            throw new Error("PlayerPersistenceService should prefer PurchaseService unlock reconciliation");
        }
    };
    sandbox.TalentService = {
        migrateLegacyElitePistol: function () {
            talentMigrationCount++;
            return false;
        },
        reconcilePlayerHpByTalentSelection: function () {
            talentHpReconcileCount++;
        }
    };
    sandbox.PurchaseService = {
        reconcileUnlockRewardsForPlayer: function () {
            purchaseReconcileCount++;
            return true;
        }
    };
    sandbox.RoleRuntimeService = {
        ensureRoomBuildStates: function () { return false; },
        ensureInitialUnlocks: function () { return false; },
        ensureSpecialItems: function () {}
    };
    sandbox.Record = {
        saveAll: function () {
            recordSaveCount++;
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/PlayerPersistenceService.js");

    sandbox.PlayerPersistenceService._applyPostRestoreFixups({
        storage: createCountStorage(),
        bag: createCountStorage(),
        room: {},
        map: {},
        roleType: 6
    });

    assert(purchaseReconcileCount === 1,
        "PlayerPersistenceService should delegate unlock reward reconciliation to PurchaseService when available");
    assert(talentMigrationCount === 1,
        "PlayerPersistenceService should delegate legacy elite pistol migration to TalentService");
    assert(talentHpReconcileCount === 1,
        "PlayerPersistenceService should delegate talent hp reconciliation to TalentService");
    assert(recordSaveCount === 1,
        "PlayerPersistenceService should persist post-restore mutations after PurchaseService reconciliation");

    return {
        name: "player-persistence-purchase-delegation",
        ok: true,
        detail: "validated PlayerPersistenceService delegates talent restore fixups to TalentService and unlock reward reconciliation to PurchaseService"
    };
}

function runLoadChainSmoke() {
    const jsListSource = readFile("assets/src/jsList.js");
    const battleSource = readFile("assets/src/game/Battle.js");
    const siteSource = readFile("assets/src/game/site.js");
    const roleRuntimeSource = readFile("assets/src/game/RoleRuntimeService.js");
    const utilsSource = readFile("assets/src/util/utils.js");

    assert(jsListSource.indexOf("src/game/GameRuntime.js") !== -1, "jsList is missing GameRuntime");
    assert(jsListSource.indexOf("BattleScene.js") === -1, "legacy BattleScene should not be in active jsList");
    assert(battleSource.indexOf("Battle.EVENTS") !== -1, "Battle runtime event contract is missing");
    assert(battleSource.indexOf("module.exports = {") !== -1, "Battle module export shape is missing");
    assert(siteSource.indexOf("module.exports = {") !== -1, "site module export shape is missing");
    assert(roleRuntimeSource.indexOf("IAPPackage.isIAPUnlocked") === -1,
        "RoleRuntimeService should not read purchase lock state directly from IAPPackage");
    assert(utilsSource.indexOf("IAPPackage.syncIAPPurchased") === -1
        && utilsSource.indexOf("IAPPackage.onIAPPaied") === -1,
        "utils purchase sync should delegate purchased unlock handling through PurchaseService");

    return {
        name: "load-chain",
        ok: true,
        detail: "validated jsList and module boundary markers, including purchase boundary delegation"
    };
}

const CHECKS = [
    runSyntaxSmoke,
    runRuntimeContextSmoke,
    runRoleRuntimeRuleSmoke,
    runTimerRepeatAlignmentSmoke,
    runBattleCadenceSmoke,
    runCraftBuildActionReuseSmoke,
    runBonfireStateSmoke,
    runBuildRegistrySmoke,
    runPurchaseUnlockRewardSmoke,
    runPurchaseExchangeConfigSmoke,
    runTalentSelectionMigrationSmoke,
    runPlayerPersistencePurchaseDelegationSmoke,
    runLoadChainSmoke
];

function runChecks() {
    return runSmokeSuite(CHECKS);
}

function runCli() {
    return runSmokeSuiteCli({
        successTitle: "Smoke checks passed",
        failureTitle: "Smoke checks failed",
        checks: CHECKS
    });
}

module.exports = {
    runChecks: runChecks,
    runCli: runCli
};

if (require.main === module) {
    runCli();
}
