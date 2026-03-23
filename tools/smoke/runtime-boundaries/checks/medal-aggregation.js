const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox
} = require("../../lib/fixtures/runtime-boundaries");

function createMedalSandbox(currentSlot) {
    const sandbox = createVmSandbox();
    sandbox.SafetyHelper = {
        isEmpty: function (value) {
            return value === undefined || value === null || value === "";
        },
        safeJSONParse: function (value, fallbackValue) {
            try {
                return JSON.parse(value);
            } catch (error) {
                return fallbackValue;
            }
        }
    };
    sandbox.Record = {
        SLOT_COUNT: 3,
        _currentSlot: Number(currentSlot) || 1,
        getCurrentSlot: function () {
            return this._currentSlot;
        },
        setCurrentSlot: function (slot) {
            this._currentSlot = Number(slot) || 1;
        }
    };
    return sandbox;
}

function writeStorageJson(storage, key, value) {
    storage.setItem(key, JSON.stringify(value));
}

function readStorageJson(storage, key) {
    const rawValue = storage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : null;
}

function runMedalV3AggregationSmoke() {
    const sandbox = createMedalSandbox(1);
    const storage = sandbox.cc.sys.localStorage;

    writeStorageJson(storage, "medalProgressAccount_v3", {
        zombie_kills_total: 210,
        canned_eaten_total: 25
    });
    writeStorageJson(storage, "medalProgressRun_slot_1_v3", {
        survival_days_run: 40,
        secret_room_end_run: 4
    });
    writeStorageJson(storage, "medalProgressRun_slot_2_v3", {
        survival_days_run: 70,
        secret_room_end_run: 8
    });

    loadIntoSandbox(sandbox, "assets/src/game/medal.js");
    sandbox.Medal.init();

    assert(sandbox.Medal._map[203].aimCompleted === 210,
        "Medal should restore cumulative account progress from the v3 global account bucket");
    assert(sandbox.Medal._map[703].aimCompleted === 25,
        "Medal should restore other cumulative account progress from the v3 global account bucket");
    assert(sandbox.Medal._map[103].aimCompleted === 70,
        "Medal should aggregate run progress by the best slot value");
    assert(sandbox.Medal._map[303].aimCompleted === 8,
        "Medal should aggregate other run progress by the best slot value");
    assert(sandbox.Medal._map[202].completed === 1 && sandbox.Medal._map[201].completed === 0,
        "Medal completion should still derive from the rebuilt aggregated progress");

    return {
        name: "medal-v3-aggregation",
        ok: true,
        detail: "validated v3 medal storage keeps account progress global and run progress aggregated by slot max"
    };
}

function runMedalLegacyMigrationSmoke() {
    const sandbox = createMedalSandbox(2);
    const storage = sandbox.cc.sys.localStorage;

    writeStorageJson(storage, "medalProgress", {
        account: {
            zombie_kills_total: 300
        },
        run: {
            survival_days_run: 60
        }
    });
    writeStorageJson(storage, "medalForOneGame", [103, 203]);

    loadIntoSandbox(sandbox, "assets/src/game/medal.js");
    sandbox.Medal.init();
    sandbox.Medal.initCompletedForOneGame(false);

    const migratedAccountProgress = readStorageJson(storage, "medalProgressAccount_v3");
    const migratedRunProgress = readStorageJson(storage, "medalProgressRun_slot_2_v3");
    const migratedCompleted = readStorageJson(storage, "medalCompleteRun_slot_2_v3");

    assert(storage.getItem("medalProgress") === null
        && storage.getItem("medalForOneGame") === null,
        "Medal should remove deprecated legacy medal progress keys after v3 migration");
    assert(migratedAccountProgress && migratedAccountProgress.zombie_kills_total === 300,
        "Medal should migrate legacy cumulative progress into the v3 account bucket");
    assert(migratedRunProgress && migratedRunProgress.survival_days_run === 60,
        "Medal should migrate legacy run progress into the current slot v3 bucket");
    assert(JSON.stringify(migratedCompleted) === "[103,203]",
        "Medal should migrate per-run completed medals into the current slot v3 key");

    sandbox.Medal.trackProgress(sandbox.MedalProgressKey.ZOMBIE_KILLS, 10, sandbox.MedalProgressScope.ACCOUNT);
    sandbox.Medal.trackProgress(sandbox.MedalProgressKey.SURVIVAL_DAYS, 5, sandbox.MedalProgressScope.RUN);

    assert(readStorageJson(storage, "medalProgressAccount_v3").zombie_kills_total === 310,
        "Medal should keep persisting cumulative progress only in the v3 account bucket");
    assert(readStorageJson(storage, "medalProgressRun_slot_2_v3").survival_days_run === 65,
        "Medal should keep persisting run progress only in the current slot v3 bucket");
    assert(sandbox.Medal._map[203].aimCompleted === 310 && sandbox.Medal._map[103].aimCompleted === 65,
        "Medal should rebuild medal aim progress from migrated v3 storage after tracking");

    return {
        name: "medal-legacy-migration",
        ok: true,
        detail: "validated legacy medal progress migrates into v3 keys and legacy keys are removed"
    };
}

function runMedalNewGameResetSmoke() {
    const sandbox = createMedalSandbox(1);
    const storage = sandbox.cc.sys.localStorage;

    writeStorageJson(storage, "medalProgressAccount_v3", {
        zombie_kills_total: 210
    });
    writeStorageJson(storage, "medalProgressRun_slot_1_v3", {
        survival_days_run: 75
    });
    writeStorageJson(storage, "medalProgressRun_slot_2_v3", {
        survival_days_run: 70
    });
    writeStorageJson(storage, "medalCompleteRun_slot_1_v3", [103]);

    loadIntoSandbox(sandbox, "assets/src/game/medal.js");
    sandbox.Medal.init();
    sandbox.Medal.newGameReset();

    assert(storage.getItem("medalProgressRun_slot_1_v3") === null,
        "Medal.newGameReset should clear the current slot run-progress bucket");
    assert(JSON.stringify(readStorageJson(storage, "medalCompleteRun_slot_1_v3")) === "[]",
        "Medal.newGameReset should clear the current slot completed-medal list");
    assert(sandbox.Medal._map[201].aimCompleted === 210,
        "Medal.newGameReset should preserve cumulative account progress");
    assert(sandbox.Medal._map[103].aimCompleted === 70,
        "Medal.newGameReset should rebuild run progress from the remaining slot data");

    return {
        name: "medal-new-game-reset",
        ok: true,
        detail: "validated overwriting a slot clears only that slot's run medal state while keeping account progress"
    };
}

module.exports = [
    runMedalV3AggregationSmoke,
    runMedalLegacyMigrationSmoke,
    runMedalNewGameResetSmoke
];
