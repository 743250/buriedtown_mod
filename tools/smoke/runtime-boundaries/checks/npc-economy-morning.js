"use strict";

const {
    assert
} = require("../../lib/core");
const {
    createEconomySandbox,
    createNpc
} = require("../../lib/fixtures/npc-economy-harness");

/**
 * 早晨 day 回调整条链（无完整 Player/Timer）：
 * syncUnlockedFlagsFromMap → 每个 NPC updateTradingItem/runDailyTick
 * → RadioFeed 有当日条目 + player.log 有文案。
 */
function runMorningDayCallbackChainSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 4 });
    const logs = [];
    const unlocked = createNpc(sandbox, 1, {
        isUnlocked: false,
        counts: { 1105022: 0 },
        reputation: 0
    });
    unlocked.dailyTickDay = 0;
    unlocked.updateTradingItem = function () {
        if (typeof sandbox.NpcEconomyService !== "undefined"
            && sandbox.NpcEconomyService
            && typeof sandbox.NpcEconomyService.runDailyTick === "function"
            && typeof sandbox.NpcEconomyService.getCurrentGameDay === "function") {
            const currentDay = sandbox.NpcEconomyService.getCurrentGameDay();
            const lastDay = Number(this.dailyTickDay) || 0;
            const elapsed = lastDay > 0 ? Math.max(1, currentDay - lastDay) : 1;
            sandbox.NpcEconomyService.runDailyTick(this, elapsed);
            this.dailyTickDay = currentDay;
        }
    };

    const manager = {
        npcList: { "1": unlocked },
        getNPC: function (id) {
            return this.npcList[String(id)] || null;
        },
        updateTradingItem: function () {
            if (typeof sandbox.NpcEconomyService !== "undefined"
                && sandbox.NpcEconomyService
                && typeof sandbox.NpcEconomyService.syncUnlockedFlagsFromMap === "function") {
                sandbox.NpcEconomyService.syncUnlockedFlagsFromMap(this);
            }
            for (const npcId in this.npcList) {
                if (this.npcList.hasOwnProperty(npcId)) {
                    this.npcList[npcId].updateTradingItem();
                }
            }
        }
    };

    sandbox.GameRuntime.getPlayer = function () {
        return {
            map: { npcMap: { "1": true } },
            npcManager: manager,
            log: {
                addMsg: function (msg) {
                    logs.push(msg);
                }
            }
        };
    };

    manager.updateTradingItem();

    assert(unlocked.isUnlocked === true,
        "morning chain must sync isUnlocked from map before tick");
    assert(Number(unlocked.dailyTickDay) === 4,
        "morning chain must stamp dailyTickDay to current game day");

    const feed = sandbox.RadioFeedService.getFeed();
    assert(feed.length > 0, "morning day chain must publish radio feed entries");
    assert(feed.every(function (e) { return Number(e.gameDay) === 4; }),
        "morning feed entries must use current game day");
    assert(feed.every(function (e) {
        return typeof e.time === "string" && e.time.indexOf("第") === 0;
    }), "morning feed time must be game-time string, not Date.now");
    assert(logs.length > 0,
        "morning day chain must write player main log lines");
    assert(logs.every(function (line) {
        return typeof line === "string" && line.length > 0;
    }), "player log lines from morning economy must be non-empty strings");

    return {
        name: "npc-economy-morning-day-chain",
        ok: true,
        detail: "validated morning day callback chain fills feed and player.log"
    };
}

/**
 * 跨天补算：dailyTickDay 落后时 elapsed = current - last，库存按天数产消。
 */
function runCrossDayElapsedCatchupSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 10 });
    const produceId = 1105011;
    const npc = createNpc(sandbox, 6, {
        isUnlocked: true,
        counts: {}
    });
    if (!npc.config.economyOverride || !npc.config.economyOverride["1105011"]) {
        npc.config = {
            favorite: [[]],
            trading: [[{ itemId: produceId, num: 1 }]],
            economyOverride: {
                "1105011": { dailyProduce: 2, targetStock: 20 }
            }
        };
    }
    if (!npc.config.trading || !npc.config.trading[0]
        || !npc.config.trading[0].some(function (e) {
            return e && Number(e.itemId) === produceId;
        })) {
        npc.config.trading = [[{ itemId: produceId, num: 1 }]];
        npc.config.economyOverride = npc.config.economyOverride || {};
        npc.config.economyOverride["1105011"] = { dailyProduce: 2, targetStock: 20 };
        npc.config.favorite = npc.config.favorite || [[]];
    }

    const dailyProduce = sandbox.NpcEconomyService._getEffectiveEntry(
        npc, produceId, "trading"
    ).dailyProduce;
    assert(dailyProduce > 0, "precondition: produce item has dailyProduce");

    npc.dailyTickDay = 7;
    npc.updateTradingItem = function () {
        const currentDay = sandbox.NpcEconomyService.getCurrentGameDay();
        const lastDay = Number(this.dailyTickDay) || 0;
        const elapsed = lastDay > 0 ? Math.max(1, currentDay - lastDay) : 1;
        sandbox.NpcEconomyService.runDailyTick(this, elapsed);
        this.dailyTickDay = currentDay;
    };
    npc.updateTradingItem();

    const expectedElapsed = 10 - 7;
    const stock = npc.storage.getNumByItemId(produceId);
    assert(Math.abs(stock - dailyProduce * expectedElapsed) < 1e-9,
        "cross-day catchup should produce dailyProduce*elapsed="
            + (dailyProduce * expectedElapsed) + " got " + stock);
    assert(Number(npc.dailyTickDay) === 10,
        "dailyTickDay should advance to current day after catchup");

    return {
        name: "npc-economy-cross-day-catchup",
        ok: true,
        detail: "validated multi-day elapsed catchup multiplies daily produce"
    };
}

module.exports = [
    runMorningDayCallbackChainSmoke,
    runCrossDayElapsedCatchupSmoke
];
