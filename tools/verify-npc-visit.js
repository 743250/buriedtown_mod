#!/usr/bin/env node
"use strict";

/**
 * NPC 访客概率机制验证
 * 回答：为什么玩家第 14 天还没有 NPC 上门？
 *
 * A. 数学分布：复刻 npc.js visitPlayer 判定核心（rand <= 25），大样本验证分布
 * B. 跨时段漏触发：updateTime 一次跳过多个 24h 周期时，day 回调是否漏触发
 * C. 读档时序：不同时刻读档，当天 6:00 的访客判定是否保留
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function loadIntoSandbox(sandbox, relativePath) {
    sandbox.module = { exports: {} };
    sandbox.exports = sandbox.module.exports;
    vm.runInContext(readRepoFile(relativePath), sandbox, { filename: relativePath });
    return sandbox.module.exports;
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
        Record: {
            saveAll: function () {},
            init: function () {},
            restore: function () { return null; },
            getCurrentRecordName: function () { return "slot1"; },
            getCurrentSlot: function () { return 1; },
            hasRecord: function () { return false; }
        },
        GameRuntime: null,
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
            d: function () {},
            e: function () {},
            i: function () {},
            log: function () {}
        }
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    return sandbox;
}

function createExtendableBaseClass() {
    function BaseClass() {
        if (this.ctor) {
            this.ctor.apply(this, arguments);
        }
    }

    BaseClass.extend = function (definition) {
        const Parent = this;
        function SubClass() {
            if (this.ctor) {
                this.ctor.apply(this, arguments);
            }
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

// ---------- 测试 A：数学分布 ----------
// 判定核心复刻自 npc.js visitPlayer（assets/src/game/npc.js:763-780）：
//   day >= 2 才判定；同一天不重复；getRandomInt(0,100) <= 25 触发
function simulateVisitRun(dayCount, getRandomInt) {
    let visitDays = [];
    let lastVisitDay = -1;
    for (let d = 2; d <= dayCount; d++) {
        if (lastVisitDay === d) {
            continue;
        }
        const rand = getRandomInt(0, 100);
        if (rand <= 25) {
            visitDays.push(d);
            lastVisitDay = d;
        }
    }
    return visitDays;
}

function runDistributionTest(getRandomInt) {
    const RUNS = 100000;
    const DAYS = 30;
    let neverVisit = 0;
    let firstVisitAfter13 = 0; // 前 13 天判定全不中（用户场景：第 14 天仍无人）
    let firstVisitCounts = new Array(DAYS + 1).fill(0);
    let visitDayCounts = new Array(DAYS + 1).fill(0);

    for (let i = 0; i < RUNS; i++) {
        const visits = simulateVisitRun(DAYS, getRandomInt);
        if (visits.length === 0) {
            neverVisit++;
        }
        const first = visits.length > 0 ? visits[0] : Infinity;
        if (first > 13) {
            firstVisitAfter13++;
        }
        for (let j = 0; j < visits.length; j++) {
            visitDayCounts[visits[j]]++;
        }
    }

    const pct = function (n) {
        return (n * 100 / RUNS).toFixed(2) + "%";
    };

    console.log("=== 测试 A：判定分布（复刻 visitPlayer，rand<=25）===");
    console.log("样本：%d 个进程 × %d 天", RUNS, DAYS);
    console.log("30 天完全无访客：%s（%d 次）", pct(neverVisit), neverVisit);
    console.log("前 13 天判定全不中（第14天仍无人）：%s（%d 次）", pct(firstVisitAfter13), firstVisitAfter13);
    console.log("每日命中比例（应约 25%）:");
    let s = "";
    for (let d = 2; d <= 16; d++) {
        s += "d" + d + ":" + pct(visitDayCounts[d]) + "  ";
    }
    console.log("  " + s);
    console.log("首次访客日分布（d2-d16）:");
    s = "";
    for (let d = 2; d <= 16; d++) {
        s += "d" + d + ":" + pct(firstVisitCounts[d]) + "  ";
    }
    console.log("  " + s);
}

// ---------- 测试 B：跨时段漏触发 ----------
function runTimezoneSkipTest(sandbox) {
    console.log("");
    console.log("=== 测试 B：updateTime 跨时段漏触发 ===");
    const TimerManager = sandbox.TimerManager;

    const tm = new TimerManager();
    tm.time = 6 * 3600 + 1; // day0 6:00:01
    let dayCount = 0;
    let nightCount = 0;
    tm.addTimerCallbackDayAndNight(null, function (flag) {
        if (flag === "day") dayCount++;
        else nightCount++;
    });

    // 一次性推进 74 小时（跨过 3 个 6:00 触发点：day1/2/3）
    tm.updateTime(74 * 3600);
    console.log("一次 updateTime(74h)：day 回调触发 %d 次（期望 3 次，day1/2/3 各 1）", dayCount);
    if (dayCount < 3) {
        console.log("  -> 确认漏触发：跨时段时中间周期的 day 回调被跳过");
    }

    // 正常逐帧推进对比：每帧 1 分钟，推进 3 天
    const tm2 = new TimerManager();
    tm2.time = 6 * 3600 + 1;
    let dayCount2 = 0;
    tm2.addTimerCallbackDayAndNight(null, function (flag) {
        if (flag === "day") dayCount2++;
    });
    for (let i = 0; i < 3 * 24 * 60; i++) {
        tm2.updateTime(60); // 每分钟推进 1 分钟游戏时间
    }
    console.log("正常逐帧推进 3 天（每帧 1 分钟）：day 回调触发 %d 次（期望 3 次）", dayCount2);
}

// ---------- 测试 C：读档时序 ----------
function runLoadTimingTest(sandbox) {
    console.log("");
    console.log("=== 测试 C：读档时刻对当天访客判定的影响 ===");
    const TimerManager = sandbox.TimerManager;

    function dayCallbackHitsAtLoad(loadDay, loadHour) {
        const tm = new TimerManager();
        tm.time = loadDay * 86400 + loadHour * 3600 + 1;
        let dayCount = 0;
        tm.addTimerCallbackDayAndNight(null, function (flag) {
            if (flag === "day") dayCount++;
        });
        // 推进到下一个 6:00 之后
        const cur = tm.formatTime();
        const targetDay = cur.h >= 6 ? cur.d + 1 : cur.d;
        const target = targetDay * 86400 + 6 * 3600 + 60;
        tm.updateTime(target - tm.time);
        return dayCount;
    }

    const cases = [
        { h: 3, note: "凌晨 3 点读档（当天 6:00 未到）" },
        { h: 10, note: "上午 10 点读档（当天 6:00 已过）" },
        { h: 20, note: "晚上 20 点读档（当天 6:00 已过）" }
    ];
    cases.forEach(function (c) {
        const hits = dayCallbackHitsAtLoad(3, c.h);
        console.log("  %s -> 推进到次日 6:00 后 day 回调触发 %d 次", c.note, hits);
        if (c.h >= 6 && hits === 0) {
            console.log("     -> 确认：白天/晚上读档会丢掉当天的访客判定（6:00 时无人判定）");
        }
    });
}

// ---------- main ----------
function main() {
    const sandbox = createVmSandbox();
    loadIntoSandbox(sandbox, "assets/src/util/emitter.js");
    const utilsModule = loadIntoSandbox(sandbox, "assets/src/util/utils.js");
    sandbox.utils = utilsModule;
    loadIntoSandbox(sandbox, "assets/src/game/TimeManager.js");

    if (typeof sandbox.TimerManager !== "function") {
        console.error("TimerManager 加载失败：sandbox.TimerManager = " + sandbox.TimerManager);
        process.exit(1);
    }

    const getRandomInt = utilsModule.getRandomInt;
    if (typeof getRandomInt !== "function") {
        console.error("utils.getRandomInt 加载失败");
        process.exit(1);
    }

    runDistributionTest(getRandomInt);
    runTimezoneSkipTest(sandbox);
    runLoadTimingTest(sandbox);

    console.log("");
    console.log("（源码引用：判定核心 npc.js:763-780；updateTime TimeManager.js:73-95；");
    console.log(" addTimerCallbackByDay TimeManager.js:225-247；addTimerCallbackDayAndNight TimeManager.js:262-269）");
}

main();
