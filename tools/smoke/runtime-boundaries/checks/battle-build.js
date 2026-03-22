const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox
} = require("../../lib/fixtures/runtime-boundaries");

function bootstrapGameRuntime(sandbox) {
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    sandbox.GameRuntime.bootstrap({
        player: sandbox.player || null,
        timer: sandbox.cc.timer || null,
        emitter: sandbox.utils.emitter || null,
        record: sandbox.Record || null
    });
    if (sandbox.RoleRuntimeService) {
        sandbox.GameKernel.register("RoleRuntimeService", sandbox.RoleRuntimeService);
    }
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

function runMeleeIndependentCooldownSmoke() {
    const sandbox = createVmSandbox();
    let weaponUses = 0;
    let bulletConsumed = 0;
    let meleeHitCount = 0;
    let gunHitCount = 0;

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
        },
        1302011: {
            effect_weapon: {
                atk: 8,
                atkCD: 1,
                range: 1,
                precise: 1
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
            ATTACK_4: "attack_4",
            ATTACK_2: "attack_2",
            ATTACK_6: "attack_6"
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
        underAtk: function (weapon) {
            if (weapon instanceof sandbox.BattleEquipmentSystem.Gun) {
                gunHitCount++;
                return;
            }
            meleeHitCount++;
        }
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
    const melee = new sandbox.BattleEquipmentSystem.Weapon(1302011, battlePlayer);

    assert(gun.action(0) === true, "gun should fire at the start of combat");
    assert(melee.action(0) === true, "melee weapon should no longer be blocked by gun shared cooldown");
    assert(gunHitCount === 1 && meleeHitCount === 1,
        "gun and melee should both attack during the same combat tick when ready");
    assert(weaponUses === 2, "gun and melee should both record weapon usage when they attack independently");
    assert(bulletConsumed === 1, "melee attacks should not consume bullets while gun cooldown remains shared");

    return {
        name: "battle-melee-independent-cooldown",
        ok: true,
        detail: "validated melee weapon cooldown stays independent from gun shared cooldown"
    };
}

function runBattleHeadshotLogSmoke() {
    const sandbox = createVmSandbox();
    const battleLogs = [];

    sandbox.cc.clampf = function (value, minValue, maxValue) {
        return Math.max(minValue, Math.min(maxValue, value));
    };
    sandbox.Math = Object.create(Math);
    sandbox.Math.random = function () {
        return 0;
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
                deathHit: 1,
                dtDeathHit: 0
            }
        }
    };
    sandbox.monsterConfig = {
        1: {
            prefixType: 1,
            hp: 30,
            speed: 1,
            attack: 1,
            precise: 1
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
            MONSTER_DIE: "monster_die"
        },
        playEffect: function () {
            return 1;
        },
        stopEffect: function () {}
    };
    sandbox.stringUtil = {
        getString: function (id) {
            var args = Array.prototype.slice.call(arguments, 1);
            var value;
            if (id === 1048) {
                value = "你使用%s向%s僵尸射击";
            } else if (id === 1051) {
                value = "精准的射击！命中了%s僵尸的头部";
            } else if (id === 1052) {
                value = "%s僵尸受到了%s点伤害";
            } else if (id === 1054) {
                value = "你没有击中目标";
            } else if (id === 1056) {
                value = "你杀死了%s只%s僵尸";
            } else if (id === "monsterType_1") {
                value = "普通";
            } else if (id === 1301052) {
                return { title: "测试手枪" };
            } else {
                value = "" + id;
            }
            if (typeof value !== "string" || args.length === 0) {
                return value;
            }
            args.forEach(function (arg) {
                value = value.replace("%s", arg);
            });
            return value;
        }
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

    bootstrapGameRuntime(sandbox);
    loadIntoSandbox(sandbox, "assets/src/game/BattleEquipmentSystem.js");
    loadIntoSandbox(sandbox, "assets/src/game/BattleActors.js");

    const battle = {
        processLog: function (message) {
            battleLogs.push(message);
        },
        recordMonsterKill: function () {},
        removeMonster: function () {},
        checkGameEnd: function () {},
        isBattleEnd: false
    };
    const monster = new sandbox.BattleActors.Monster(battle, 1);
    monster.line = { index: 0 };
    const battlePlayer = {
        bulletNum: 60,
        toolNum: 0,
        runtimeConfig: {
            monsterDodgeRate: 0
        },
        battle: battle
    };
    const gun = new sandbox.BattleEquipmentSystem.Gun(1301052, battlePlayer);

    monster.underAtk(gun);

    assert(battleLogs.indexOf("你使用测试手枪向普通僵尸射击") !== -1,
        "gun attack log should still be emitted before headshot resolution");
    assert(battleLogs.indexOf("精准的射击！命中了普通僵尸的头部") !== -1,
        "headshot attacks should emit the dedicated critical-hit log");
    assert(monster.attr.hp === 10, "headshot attacks should still deal double bullet damage");
    assert(monster.isDie() === false, "headshot attacks should not force an instant kill under the double-damage rule");

    return {
        name: "battle-headshot-log",
        ok: true,
        detail: "validated gun headshots keep the dedicated critical-hit log while following the double-damage rule"
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

    bootstrapGameRuntime(sandbox);
    loadIntoSandbox(sandbox, "assets/src/game/BuildActionEffectService.js");
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

    bootstrapGameRuntime(sandbox);
    loadIntoSandbox(sandbox, "assets/src/game/BuildActionEffectService.js");
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

function runBuildRuntimeDelegationSmoke() {
    const sandbox = createVmSandbox();
    let runtimeCostCalls = 0;
    let runtimeSaveCalls = 0;
    let runtimeLogCalls = 0;
    let processPercent = 0;
    let upgradeFinished = 0;
    let acceleratedTime = null;
    let playedEffect = null;

    sandbox.WORK_SITE = 900;
    sandbox.TimerCallback = function (time, target, callbacks) {
        this.time = time;
        this.target = target;
        this.process = callbacks.process;
        this.end = callbacks.end;
    };

    const runtimeEmitter = {
        emitted: [],
        emit: function (name, payload) {
            this.emitted.push([name, payload]);
        }
    };
    const runtimeRecord = {
        saveAll: function () {
            runtimeSaveCalls++;
        }
    };
    const runtimeTimer = {
        addTimerCallback: function (timerCallback) {
            if (typeof timerCallback.process === "function") {
                timerCallback.process(30);
            }
            if (typeof timerCallback.end === "function") {
                timerCallback.end();
            }
            return timerCallback;
        },
        accelerateWorkTime: function (time) {
            acceleratedTime = time;
        }
    };
    const runtimePlayer = {
        storage: {
            validateItem: function (itemId, num) {
                return itemId === 1101011 && num === 1;
            }
        },
        map: {
            getSite: function (siteId) {
                return siteId === sandbox.WORK_SITE ? { isActive: true } : null;
            }
        },
        room: {
            isBuildExist: function (bid, level) {
                return bid === 1 && level === 0;
            },
            getBuildCurrentName: function () {
                return "Runtime Workbench";
            }
        },
        validateItems: function (cost) {
            return Array.isArray(cost) && cost.length === 1 && cost[0].itemId === 1101011;
        },
        costItems: function () {
            runtimeCostCalls++;
        },
        log: {
            addMsg: function () {
                runtimeLogCalls++;
            }
        }
    };

    sandbox.audioManager = {
        sound: {
            BUILD_UPGRADE: "build-upgrade"
        },
        playEffect: function (effectName) {
            playedEffect = effectName;
        }
    };
    sandbox.RoleRuntimeService = {
        getBuildMaxLevel: function (bid, defaultMaxLevel) {
            return defaultMaxLevel;
        },
        applyBuildActionRuntimeState: function () {
            return true;
        },
        applyRoomBuildStates: function () {}
    };
    sandbox.BuildActionFactory = {
        createBuildActions: function () {
            return [];
        },
        resolveBuildActiveState: function () {
            return null;
        }
    };
    sandbox.buildConfig = {
        "2": [
            { produceList: [] },
            {
                produceList: [],
                condition: { bid: 1, level: 0 },
                cost: [{ itemId: 1101011, num: 1 }],
                createTime: 1
            }
        ]
    };
    sandbox.player = runtimePlayer;
    sandbox.cc.timer = runtimeTimer;
    sandbox.utils.emitter = runtimeEmitter;
    sandbox.Record = runtimeRecord;

    bootstrapGameRuntime(sandbox);

    sandbox.player = {
        storage: {
            validateItem: function () {
                throw new Error("Build.js should not validate storage through global player");
            }
        },
        map: {
            getSite: function () {
                throw new Error("Build.js should not read work site through global player");
            }
        },
        room: {
            isBuildExist: function () {
                throw new Error("Build.js should not validate build condition through global player");
            },
            getBuildCurrentName: function () {
                throw new Error("Build.js should not log build name through global player");
            }
        },
        validateItems: function () {
            throw new Error("Build.js should not validate upgrade cost through global player");
        },
        costItems: function () {
            throw new Error("Build.js should not pay upgrade cost through global player");
        },
        log: {
            addMsg: function () {
                throw new Error("Build.js should not log through global player");
            }
        }
    };
    sandbox.cc.timer = {
        addTimerCallback: function () {
            throw new Error("Build.js should not schedule upgrade timer through global cc.timer");
        },
        accelerateWorkTime: function () {
            throw new Error("Build.js should not accelerate upgrade time through global cc.timer");
        }
    };
    sandbox.utils.emitter = {
        emit: function () {
            throw new Error("Build.js should not emit build updates through global utils.emitter");
        }
    };
    sandbox.Record = {
        saveAll: function () {
            throw new Error("Build.js should not save through global Record");
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/Build.js");

    const build = new sandbox.Build(2, 0);
    assert(build._hasStorageItem(1101011) === true,
        "Build.js should resolve storage validation through GameRuntime player");
    assert(build._isWorkSitePowered() === true,
        "Build.js should resolve work site power state through GameRuntime player");
    assert(build.canUpgrade().buildUpgradeType === sandbox.BuildUpgradeType.UPGRADABLE,
        "Build.js should resolve upgrade eligibility through GameRuntime player");

    build.upgrade(function (percent) {
        processPercent = percent;
    }, function () {
        upgradeFinished++;
    });

    assert(runtimeCostCalls === 1, "Build.js should pay upgrade cost through GameRuntime player");
    assert(processPercent === 50, "Build.js should report upgrade progress through runtime timer callbacks");
    assert(upgradeFinished === 1 && build.level === 1,
        "Build.js should complete upgrade through runtime timer callbacks");
    assert(acceleratedTime === 60, "Build.js should accelerate work time through GameRuntime timer");
    assert(runtimeEmitter.emitted.length === 1
        && runtimeEmitter.emitted[0][0] === sandbox.GameEvents.BUILD_NODE_UPDATE,
        "Build.js should emit build refresh through GameRuntime emitter");
    assert(runtimeSaveCalls === 1, "Build.js should save upgraded state through GameRuntime record");
    assert(runtimeLogCalls === 1, "Build.js should log upgrade completion through GameRuntime player");
    assert(playedEffect === "build-upgrade", "Build.js should preserve upgrade audio effect");

    return {
        name: "build-runtime-delegation",
        ok: true,
        detail: "validated Build.js resolves player, timer, emitter and record through GameRuntime instead of direct globals"
    };
}

module.exports = [
    runBattleCadenceSmoke,
    runMeleeIndependentCooldownSmoke,
    runBattleHeadshotLogSmoke,
    runCraftBuildActionReuseSmoke,
    runBonfireStateSmoke,
    runBuildRegistrySmoke,
    runBuildRuntimeDelegationSmoke
];
