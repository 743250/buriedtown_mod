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
