const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox
} = require("../../lib/fixtures/runtime-boundaries");

function runPowerGridSmoke() {
    const sandbox = createVmSandbox();
    sandbox.role = {
        getRoleConfig: function (roleType) {
            if (Number(roleType) === 96) {
                return {
                    actionTags: ["powered"],
                    powerGrid: {
                        generation: 10,
                        overloadDecayMultiplier: 3,
                        overloadBrokenProbability: 0.15
                    },
                    workSiteRepair: {
                        lastTimeMinutes: 0,
                        brokenProbability: 0.02,
                        maintenanceMax: 100,
                        maintenanceDecayPerHour: 1
                    }
                };
            }
            return { actionTags: [] };
        },
        getChoosenRoleType: function () {
            return 6;
        }
    };
    sandbox.RoleType = { STRANGER: 6 };
    sandbox.WORK_SITE = 204;
    sandbox.npcConfig = {};
    sandbox.IAPPackage = {
        isIAPUnlocked: function () { return true; },
        isAlphaUnlocked: function () { return false; },
        isBetaUnlocked: function () { return true; }
    };
    sandbox.buildConfig = {
        "6": [{
            id: 6,
            produceList: []
        }, {
            id: 6,
            produceList: []
        }, {
            id: 6,
            produceList: [],
            powerCost: 6,
            requirePoweredWorksite: true
        }],
        "4": [{
            id: 4,
            produceList: [],
            powerCost: 4,
            autoPower: true
        }],
        "18": [{
            id: 18,
            requirePoweredWorksite: true,
            powerCost: 8,
            produceList: []
        }]
    };
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");
    loadIntoSandbox(sandbox, "assets/src/game/RoleRuntimeService.js");
    loadIntoSandbox(sandbox, "assets/src/game/Build.js");

    let workSiteActive = true;
    const bootstrapPlayer = {
        roleType: 96,
        room: {},
        storage: { counts: {}, getNumByItemId: function () { return 0; } },
        log: { addMsg: function () {} },
        map: {
            getSite: function () {
                return { isActive: workSiteActive };
            }
        }
    };
    sandbox.GameRuntime.bootstrap({
        player: bootstrapPlayer,
        timer: {
            pause: function () {},
            resume: function () {},
            now: function () { return 123; }
        },
        emitter: sandbox.utils.emitter,
        record: sandbox.Record
    });

    const RRS = sandbox.RoleRuntimeService;
    const Build = sandbox.Build;

    // 1. getCurrentPowerLoad：只统计 powerEnabled && powerCost>0 的建筑
    const room = {
        builds: {},
        forEach: function (action) {
            for (var bid in this.builds) {
                action(this.builds[bid]);
            }
        },
        getBuild: function (bid) {
            return this.builds[bid];
        },
        getBuildLevel: function (bid) {
            var build = this.builds[bid];
            return build ? build.level : -1;
        }
    };
    const player = {
        roleType: 96,
        room: room
    };

    // 厨房灶台 build4 autoPower：发电厂有电即耗4，停电为0
    const kitchen = new Build(4, 0, null);
    room.builds[4] = kitchen;
    assert(RRS.getCurrentPowerLoad(player) === 4, "autoPower kitchen should draw 4 while the worksite is online");
    workSiteActive = false;
    assert(RRS.getCurrentPowerLoad(player) === 0, "autoPower kitchen should draw 0 while the worksite is offline");
    workSiteActive = true;

    // 电炉 build18 开关型：默认断电0，通电8，停电不计
    const stove = new Build(18, 0, null);
    room.builds[18] = stove;
    assert(RRS.getCurrentPowerLoad(player) === 4, "stove off draws only kitchen load");
    stove.setPowerEnabled(true);
    assert(RRS.getCurrentPowerLoad(player) === 12, "stove on adds its powerCost");
    workSiteActive = false;
    assert(RRS.getCurrentPowerLoad(player) === 0, "stove/kitchen should draw 0 while the worksite is offline");
    workSiteActive = true;
    stove.setPowerEnabled(false);
    delete room.builds[18];

    const build6 = new Build(6, 2, null);
    const build6b = new Build(6, 2, null);
    room.builds[6] = build6;
    room.builds[600] = build6b;

    assert(RRS.getCurrentPowerLoad(player) === 4, "kitchen autoPower draws 4 while others off");
    assert(build6.isPowerEnabled() === false, "powered build should start disabled");
    build6.setPowerEnabled(true);
    assert(RRS.getCurrentPowerLoad(player) === 10, "distiller on adds its powerCost (4+6)");
    build6b.setPowerEnabled(true);
    assert(RRS.getCurrentPowerLoad(player) === 16, "two enabled distillers sum with kitchen (4+6+6)");

    // 2. getPowerGridOverloadState：role96 配 generation 10 下 load 10 不过载、load 16 过载
    build6b.setPowerEnabled(false);
    const safeState = RRS.getPowerGridOverloadState(player);
    assert(safeState.overloaded === false, "load 10 within generation 10 should not overload");
    assert(safeState.decayPerHour === 0, "no overload should not add decay");
    build6b.setPowerEnabled(true);
    const overState = RRS.getPowerGridOverloadState(player);
    assert(overState.overloaded === true, "load 16 over generation 10 should overload");
    assert(overState.decayPerHour === 3, "overload should apply the configured decay multiplier");
    assert(overState.brokenProbability === 0.15, "overload should apply the configured broken probability");
    build6b.setPowerEnabled(false);

    // 3. isBuildActionVisible：requirePowerEnabled / hideWhenPowerEnabledForTags 四象限
    const electricFormula = {
        id: 1201062,
        runtimeRule: {
            includeAnyTags: ["powered"],
            requirePoweredWorksite: true,
            requirePowerEnabled: true
        }
    };
    const woodFormula = {
        id: 1201061,
        runtimeRule: {
            hideWhenPowerEnabledForTags: ["powered"]
        }
    };
    assert(RRS.isBuildActionVisible(electricFormula, 96, { isWorkSitePowered: true, isPowerEnabled: true }) === true,
        "electric formula should be visible when powered and switched on");
    assert(RRS.isBuildActionVisible(electricFormula, 96, { isWorkSitePowered: true, isPowerEnabled: false }) === false,
        "electric formula should be hidden when switch is off");
    assert(RRS.isBuildActionVisible(electricFormula, 96, { isWorkSitePowered: false, isPowerEnabled: true }) === false,
        "electric formula should be hidden when the worksite is offline");
    assert(RRS.isBuildActionVisible(electricFormula, 6, { isWorkSitePowered: true, isPowerEnabled: true }) === false,
        "electric formula should stay hidden for roles without the powered tag");
    assert(RRS.isBuildActionVisible(woodFormula, 96, { isWorkSitePowered: true, isPowerEnabled: true }) === false,
        "wood formula should be hidden while the switch is on");
    assert(RRS.isBuildActionVisible(woodFormula, 96, { isWorkSitePowered: true, isPowerEnabled: false }) === true,
        "wood formula should return when the switch is off");
    assert(RRS.isBuildActionVisible(woodFormula, 6, { isWorkSitePowered: true, isPowerEnabled: true }) === true,
        "wood formula should not be hidden for roles without the powered tag");

    // 4. Build save/restore 往返：powerEnabled 保持；旧档 undefined 兜底 false
    build6.setPowerEnabled(true);
    const saved = build6.save();
    assert(saved.powerEnabled === true, "save should persist powerEnabled");
    const restored = new Build(6, 2, saved);
    assert(restored.isPowerEnabled() === true, "restore should keep powerEnabled true");
    const legacy = new Build(6, 2, { id: 6, level: 2, saveActions: {} });
    assert(legacy.isPowerEnabled() === false, "legacy save without powerEnabled should default to false");

    // 5. setPowerEnabled 对无 powerCost 的建筑是 no-op
    const build6lvl0 = new Build(6, 0, null);
    assert(build6lvl0.isPowerEnabled() === false, "level-0 distiller has no powerCost and cannot be powered");
    assert(build6lvl0.setPowerEnabled(true) === false, "setPowerEnabled should refuse builds without powerCost");

    return {
        name: "power-grid",
        ok: true,
        detail: "validated power load summation (incl. autoPower stove), overload state, electric/wood formula visibility matrix, and Build powerEnabled persistence"
    };
}

module.exports = [
    runPowerGridSmoke
];
