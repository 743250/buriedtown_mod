const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox
} = require("../../lib/fixtures/runtime-boundaries");

function bootstrapGameRuntime(sandbox, options) {
    options = options || {};
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    sandbox.GameRuntime.bootstrap({
        player: options.player || sandbox.player || null,
        timer: options.timer || sandbox.cc.timer || null,
        emitter: options.emitter || sandbox.utils.emitter || null,
        record: options.record || sandbox.Record || null
    });
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

function runWorkSiteMaintenanceCatchupSmoke() {
    const sandbox = createVmSandbox();
    sandbox.cc.log = function () {};
    sandbox.cc.timer = { time: 0 };
    sandbox.Storage = function () {};
    sandbox.Storage.prototype.save = function () {
        return {};
    };
    sandbox.Storage.prototype.restore = function () {};
    sandbox.SiteConfigService = {
        getSiteConfig: function () {
            return {
                coordinate: { x: 0, y: 0 }
            };
        }
    };
    sandbox.RoleRuntimeService = {
        getWorkSiteRepairConfig: function () {
            return {
                brokenProbability: 1,
                maintenanceMax: 2,
                maintenanceDecayPerHour: 1
            };
        }
    };

    bootstrapGameRuntime(sandbox, {
        player: { roleType: 4 }
    });
    const siteModule = loadIntoSandbox(sandbox, "assets/src/game/site.js");
    const workSite = new siteModule.WorkSite(204);
    workSite.isActive = true;
    workSite.maintenance = 2;
    workSite.fixedTime = 0;

    sandbox.cc.timer.time = 2 * 60 * 60;
    workSite.checkActive();

    assert(workSite.getMaintenanceValue() === 0,
        "WorkSite should catch up maintenance decay across long time jumps");
    assert(workSite.isActive === false,
        "WorkSite should roll break checks for each elapsed hour once maintenance reaches zero");

    return {
        name: "worksite-maintenance-catchup",
        ok: true,
        detail: "validated WorkSite maintenance and break checks catch up after long time jumps"
    };
}

function runRecordRuntimeBindingSmoke() {
    const sandbox = createVmSandbox();
    let playerSaveCount = 0;
    let timerSaveCount = 0;
    sandbox.SafetyHelper = {
        safeJSONParse: function (value, fallbackValue) {
            if (!value) {
                return fallbackValue;
            }
            try {
                return JSON.parse(value);
            } catch (error) {
                return fallbackValue;
            }
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    loadIntoSandbox(sandbox, "assets/src/game/record.js");

    sandbox.Record.init("slot1");
    sandbox.GameRuntime.bootstrap({
        record: sandbox.Record,
        player: {
            save: function () {
                playerSaveCount++;
                return { hp: 240 };
            }
        },
        timer: {
            save: function () {
                timerSaveCount++;
                return { time: 123 };
            }
        }
    });
    sandbox.Record.bindRuntime(sandbox.GameRuntime);

    sandbox.player = {
        save: function () {
            throw new Error("Record.saveAll should not read the global player");
        }
    };
    sandbox.cc.timer = {
        save: function () {
            throw new Error("Record.saveAll should not read the global timer");
        }
    };

    sandbox.Record.saveAll();

    assert(playerSaveCount === 1 && timerSaveCount === 1,
        "Record.saveAll should persist player and timer from the bound GameRuntime");
    assert(sandbox.Record.recordObj.player && sandbox.Record.recordObj.player.hp === 240,
        "Record.saveAll should store the runtime player payload");
    assert(sandbox.Record.recordObj.time && sandbox.Record.recordObj.time.time === 123,
        "Record.saveAll should store the runtime timer payload");

    return {
        name: "record-runtime-binding",
        ok: true,
        detail: "validated Record.saveAll persists through the bound GameRuntime instead of direct globals"
    };
}

module.exports = [
    runTimerRepeatAlignmentSmoke,
    runWorkSiteMaintenanceCatchupSmoke,
    runRecordRuntimeBindingSmoke
];
