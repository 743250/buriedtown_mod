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

function runSyntaxSmoke() {
    const files = [
        "assets/src/game/GameRuntime.js",
        "assets/src/game/game.js",
        "assets/src/game/player.js",
        "assets/src/game/TravelService.js",
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
            getCurrentRecordName: function () { return "slot1"; }
        },
        cc: {
            timer: null,
            color: { WHITE: "white", RED: "red" },
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
            applyHomeProduceEffect: function (produce) { return produce; }
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

function loadIntoSandbox(sandbox, relativePath) {
    sandbox.module = { exports: {} };
    sandbox.exports = sandbox.module.exports;
    vm.runInContext(readFile(relativePath), sandbox, { filename: relativePath });
    return sandbox.module.exports;
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
    loadIntoSandbox(sandbox, "assets/src/data/formulaConfig.js");
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
    assert(sandbox.RoleRuntimeService._buildActionVisibilityGroups.length === 0, "RoleRuntimeService legacy visibility groups should now be empty");

    return {
        name: "role-runtime-rules",
        ok: true,
        detail: "validated config-driven jin, luo, stranger, jie, yazi, bier, king and powered build action visibility rules"
    };
}

function runLoadChainSmoke() {
    const jsListSource = readFile("assets/src/jsList.js");
    const battleSource = readFile("assets/src/game/Battle.js");
    const siteSource = readFile("assets/src/game/site.js");

    assert(jsListSource.indexOf("src/game/GameRuntime.js") !== -1, "jsList is missing GameRuntime");
    assert(jsListSource.indexOf("BattleScene.js") === -1, "legacy BattleScene should not be in active jsList");
    assert(battleSource.indexOf("Battle.EVENTS") !== -1, "Battle runtime event contract is missing");
    assert(battleSource.indexOf("module.exports = {") !== -1, "Battle module export shape is missing");
    assert(siteSource.indexOf("module.exports = {") !== -1, "site module export shape is missing");

    return {
        name: "load-chain",
        ok: true,
        detail: "validated jsList and module boundary markers"
    };
}

function main() {
    const checks = [
        runSyntaxSmoke(),
        runRuntimeContextSmoke(),
        runRoleRuntimeRuleSmoke(),
        runLoadChainSmoke()
    ];

    console.log("Smoke checks passed:");
    checks.forEach(function (check) {
        console.log("- " + check.name + ": " + check.detail);
    });
}

try {
    main();
} catch (error) {
    console.error("Smoke checks failed:");
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
}
