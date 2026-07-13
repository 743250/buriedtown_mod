"use strict";

const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox,
    createCountStorage
} = require("../../lib/fixtures/runtime-boundaries");
const {
    createEconomySandbox,
    createNpc: createHarnessNpc,
    createNpcManager,
    installMapStubs
} = require("../../lib/fixtures/npc-economy-harness");

function createBroadcastSandbox() {
    const sandbox = createVmSandbox();
    loadIntoSandbox(sandbox, "assets/src/util/emitter.js");
    loadIntoSandbox(sandbox, "assets/src/util/utils.js");
    loadIntoSandbox(sandbox, "assets/src/util/memoryUtil.js");
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    loadIntoSandbox(sandbox, "assets/src/data/npcConfig.js");
    loadIntoSandbox(sandbox, "assets/src/data/itemEconomyConfig.js");
    loadIntoSandbox(sandbox, "assets/src/data/npcBroadcastConfig.js");
    sandbox.GameRuntime.bootstrap({
        emitter: sandbox.utils.emitter,
        timer: {
            formatTime: function () {
                return { d: 1, h: 6, m: 0, s: 0 };
            },
            getTimeDayStr: function () {
                return "第2天";
            },
            getTimeHourStr: function () {
                return "06:00";
            }
        }
    });
    loadIntoSandbox(sandbox, "assets/src/game/NpcEconomyService.js");
    loadIntoSandbox(sandbox, "assets/src/game/RadioFeedService.js");
    return sandbox;
}

function createStorage(counts) {
    const storage = createCountStorage(counts || {});
    storage.map = storage.counts;
    return storage;
}

function createNpc(sandbox, npcId, options) {
    options = options || {};
    return {
        id: Number(npcId),
        isUnlocked: options.isUnlocked !== false,
        reputation: sandbox.memoryUtil.encode(Number(options.reputation) || 0),
        storage: createStorage(options.counts),
        config: sandbox.utils.clone(sandbox.npcConfig[npcId])
    };
}

function createRadioNodeStub(sandbox) {
    sandbox.BuildNode = sandbox.cc.Class.extend({
        onExit: function () {}
    });
    loadIntoSandbox(sandbox, "assets/src/ui/radioNode.js");
    const radioNode = Object.create(sandbox.RadioNode.prototype);
    radioNode.data = [];
    radioNode.addMsg = function (msg) {
        this.data.push(msg);
    };
    radioNode._super = function () {};
    return radioNode;
}

function runUnlockedNpcRealConfigBroadcastSmoke() {
    const sandbox = createBroadcastSandbox();
    sandbox.NpcEconomyService.getCurrentGameDay = function () { return 1; };

    const broadcastNpcIds = [];
    Object.keys(sandbox.npcConfig).forEach(function (npcId) {
        const before = sandbox.RadioFeedService.getFeed().length;
        sandbox.NpcEconomyService.runDailyTick(createNpc(sandbox, npcId), 1);
        const after = sandbox.RadioFeedService.getFeed().length;
        if (after > before) {
            broadcastNpcIds.push(Number(npcId));
        }
    });

    assert(broadcastNpcIds.length >= 6,
        "Unlocked NPCs with economy config should publish daily radio broadcasts");

    return {
        name: "npc-economy-unlocked-real-config",
        ok: true,
        detail: "validated real NPC economy configs emit daily radio broadcasts for unlocked NPCs"
    };
}

/**
 * 日产物 trading 广播必须有第一人称自定义文案，避免回落到「杰夫 的 木质材料…」第三人称模板。
 */
function runTradingProduceFirstPersonBroadcastSmoke() {
    const sandbox = createBroadcastSandbox();
    const tiers = ["very_low", "low", "balanced", "high", "very_high"];
    const names = [];

    [1, 2, 3, 4, 5, 6].forEach(function (npcId) {
        const cfg = sandbox.npcConfig[String(npcId)] || sandbox.npcConfig[npcId] || {};
        const override = cfg.economyOverride || {};
        const produceIds = Object.keys(override).filter(function (itemId) {
            const entry = override[itemId] || {};
            return entry.dailyProduce != null && Number(entry.dailyProduce) > 0;
        });
        assert(produceIds.length > 0, "npc " + npcId + " should have dailyProduce items");

        const bc = sandbox.npcBroadcastConfig[String(npcId)] || sandbox.npcBroadcastConfig[npcId] || {};
        const trading = bc.trading || {};
        produceIds.forEach(function (itemId) {
            const texts = trading[String(itemId)] || trading[itemId];
            assert(texts, "npc " + npcId + " trading text missing for produce item " + itemId);
            tiers.forEach(function (tier) {
                const line = texts[tier];
                assert(typeof line === "string" && line.length > 0,
                    "npc " + npcId + " item " + itemId + " tier " + tier + " must be non-empty");
                assert(line.indexOf("的 " + itemId) < 0,
                    "custom trading text must not look like generic third-person template");
            });
            // 命中自定义后 _resolveBroadcastText 前缀「名字：」+ 第一人称句
            const resolved = sandbox.NpcEconomyService._resolveBroadcastText(
                npcId, itemId, "very_low", "trading"
            );
            assert(resolved.indexOf("：") >= 0,
                "npc " + npcId + " produce " + itemId + " should use speaker-prefixed first-person line, got " + resolved);
            assert(!/ 的 .+ 库存/.test(resolved),
                "npc " + npcId + " produce " + itemId + " must not fall back to third-person template, got " + resolved);
        });
        names.push(String(npcId));
    });

    // 杰夫木头：明确第一人称
    const jeffWood = sandbox.NpcEconomyService._resolveBroadcastText(3, 1101011, "very_low", "trading");
    assert(jeffWood.indexOf("我的木头") >= 0 || jeffWood.indexOf("我") >= 0,
        "Jeff wood broadcast should be first-person, got " + jeffWood);

    // 无自定义配置时，通用回落也必须是「名字：我…」，不能「名字 的 物品…」
    const fallbackLow = sandbox.NpcEconomyService._resolveBroadcastText(
        99, 9999999, "very_low", "trading"
    );
    const fallbackBalanced = sandbox.NpcEconomyService._resolveBroadcastText(
        99, 9999999, "balanced", "favorite"
    );
    assert(fallbackLow.indexOf("：我") >= 0 || /：我的 /.test(fallbackLow),
        "fallback trading must be first-person body, got " + fallbackLow);
    assert(!/NPC 99 的 /.test(fallbackLow) && !/NPC-99 的 /.test(fallbackLow),
        "fallback must not use third-person 名字的, got " + fallbackLow);
    assert(fallbackBalanced.indexOf("：我") >= 0,
        "fallback favorite balanced must be first-person, got " + fallbackBalanced);

    return {
        name: "npc-economy-trading-produce-first-person",
        ok: true,
        detail: "validated first-person trading broadcast for produce items of NPCs " + names.join("/")
    };
}

/**
 * Feed 去重契约：跨 gameDay 保留；同日重复折叠；time 为游戏内中文时刻。
 */
function runRadioFeedDedupSmoke() {
    const sandbox = createBroadcastSandbox();
    const basePayload = {
        npcId: 1,
        favorite: [{ itemId: 1105022, tier: "low" }],
        trading: []
    };

    sandbox.RadioFeedService.onDailyBroadcast(Object.assign({}, basePayload, {
        gameDay: 1,
        time: "第2天 06:00"
    }));
    sandbox.RadioFeedService.onDailyBroadcast(Object.assign({}, basePayload, {
        gameDay: 2,
        time: "第3天 06:00"
    }));
    let feed = sandbox.RadioFeedService.getFeed();
    assert(feed.length === 2,
        "RadioFeedService should keep separate broadcasts when gameDay differs");
    assert(feed[0]._dedupKey !== feed[1]._dedupKey,
        "RadioFeedService dedup keys should include gameDay");
    assert(feed.every(function (e) {
        return typeof e.time === "string" && e.time.indexOf("第") === 0;
    }), "radio feed time must be game-time string, not Date.now ms");

    const sameDay = {
        npcId: 1,
        gameDay: 3,
        time: "第4天 06:00",
        favorite: [{ itemId: 1105022, tier: "low" }],
        trading: []
    };
    sandbox.RadioFeedService.clear();
    sandbox.RadioFeedService.onDailyBroadcast(sameDay);
    sandbox.RadioFeedService.onDailyBroadcast(sameDay);
    assert(sandbox.RadioFeedService.getFeed().length === 1,
        "RadioFeedService should dedupe repeated entries from the same gameDay");

    return {
        name: "npc-economy-feed-dedup",
        ok: true,
        detail: "validated feed gameDay-scoped dedup and Chinese game-time strings"
    };
}

/**
 * RadioNode 本地去重：跨天保留；同日折叠。
 */
function runRadioNodeDedupSmoke() {
    const sandbox = createBroadcastSandbox();
    const radioNode = createRadioNodeStub(sandbox);

    radioNode.addLocalSystemMsg({
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        economyKind: "favorite",
        gameDay: 1,
        time: "第2天 06:00"
    });
    radioNode.addLocalSystemMsg({
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        economyKind: "favorite",
        gameDay: 2,
        time: "第3天 06:00"
    });
    assert(radioNode.data.length === 2,
        "RadioNode should keep local system messages from different gameDays");

    const entry = {
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        economyKind: "favorite",
        gameDay: 1,
        time: "第2天 06:00"
    };
    radioNode.data = [];
    radioNode.addLocalSystemMsg(entry);
    radioNode.addLocalSystemMsg(entry);
    assert(radioNode.data.length === 1,
        "RadioNode should dedupe repeated local system messages from the same gameDay");

    return {
        name: "npc-economy-radio-node-dedup",
        ok: true,
        detail: "validated RadioNode local gameDay-scoped deduplication"
    };
}

function runRadioNodeLiveListenerSmoke() {
    const sandbox = createBroadcastSandbox();
    const radioNode = createRadioNodeStub(sandbox);
    sandbox.RadioNode.prototype._bindEconomyListener.call(radioNode);

    sandbox.utils.emitter.emit(sandbox.NpcEconomyService.EVENT_DAILY_BROADCAST, {
        npcId: 1,
        gameDay: 1,
        time: "第2天 06:00",
        favorite: [{ itemId: 1105022, tier: "low" }],
        trading: []
    });

    assert(radioNode.data.length === 1,
        "RadioNode live listener should enqueue entries from the current broadcast payload");
    assert(typeof radioNode.data[0].time === "string"
        && radioNode.data[0].time.indexOf("第") === 0,
        "live radio entry time must be game-time string");

    return {
        name: "npc-economy-radio-node-live-listener",
        ok: true,
        detail: "validated open radio UI receives current broadcast entries with game time"
    };
}

function runBalancedTierBroadcastSmoke() {
    const sandbox = createBroadcastSandbox();
    sandbox.NpcEconomyService.getCurrentGameDay = function () { return 1; };
    const npc = createNpc(sandbox, 1, { counts: { 1105022: 3.5 } });

    sandbox.NpcEconomyService.runDailyTick(npc, 1);

    const hasBalanced = sandbox.RadioFeedService.getFeed().some(function (entry) {
        return entry.npcId === 1 && entry.itemId === 1105022 && entry.tier === "balanced";
    });
    assert(hasBalanced, "Balanced economy tier should still be broadcast to radio feed");

    return {
        name: "npc-economy-balanced-broadcast",
        ok: true,
        detail: "validated balanced tier entries remain visible in the radio feed"
    };
}

function runLockedNpcDoesNotBroadcastSmoke() {
    const sandbox = createBroadcastSandbox();
    sandbox.NpcEconomyService.getCurrentGameDay = function () { return 1; };
    const npc = createNpc(sandbox, 1, { isUnlocked: false });

    sandbox.NpcEconomyService.runDailyTick(npc, 1);

    assert(sandbox.RadioFeedService.getFeed().length === 0,
        "Locked NPCs should not publish radio broadcasts");

    return {
        name: "npc-economy-locked-silent",
        ok: true,
        detail: "validated locked NPCs remain excluded from radio broadcasts"
    };
}

function runConsumePoolBroadcastMergedSmoke() {
    const sandbox = createBroadcastSandbox();
    sandbox.NpcEconomyService.getCurrentGameDay = function () { return 1; };
    const npc = createNpc(sandbox, 2, { counts: { 1103011: 0 } });

    sandbox.NpcEconomyService.runDailyTick(npc, 1);

    const favEntries = sandbox.RadioFeedService.getFeed().filter(function (entry) {
        return entry.npcId === 2 && entry.economyKind === "favorite";
    });
    assert(favEntries.length === 1,
        "consumePool favorite broadcast should collapse to one radio entry, got " + favEntries.length);
    assert(favEntries[0].itemId === 1103011,
        "jin_food pool representative item should be first override key 1103011");

    return {
        name: "npc-economy-pool-broadcast-merged",
        ok: true,
        detail: "validated consumePool favorite broadcasts collapse to a single radio entry"
    };
}

/**
 * ensureToday 矩阵：空缓冲补发 / 二次 no-op / morning 后 no-op /
 * 不写 player.log / map-only 解锁 / 无解锁合法空。
 */
function runEnsureTodayMatrixSmoke() {
    // 1) 空缓冲：解锁 1/4，锁定 2 → 补发且不含锁定
    const sandbox = createBroadcastSandbox();
    sandbox.NpcEconomyService.getCurrentGameDay = function () { return 7; };
    const manager = {
        npcList: {
            "1": createNpc(sandbox, 1, { isUnlocked: true }),
            "4": createNpc(sandbox, 4, { isUnlocked: true }),
            "2": createNpc(sandbox, 2, { isUnlocked: false })
        }
    };
    assert(sandbox.RadioFeedService.getFeed().length === 0, "precondition: empty feed");
    const filled = sandbox.NpcEconomyService.ensureTodayRadioFeed(manager);
    assert(filled === true, "ensureToday should publish when feed has no current-day entries");
    const feed = sandbox.RadioFeedService.getFeed();
    assert(feed.length >= 2, "opened radio should backfill unlocked NPC broadcasts");
    assert(feed.every(function (entry) { return Number(entry.gameDay) === 7; }),
        "backfilled radio entries should use current game day");
    assert(feed.every(function (entry) { return entry.npcId === 1 || entry.npcId === 4; }),
        "locked NPCs must stay out of ensureTodayRadioFeed");
    const filledAgain = sandbox.NpcEconomyService.ensureTodayRadioFeed(manager);
    assert(filledAgain === false, "repeat ensureToday must no-op when day already buffered");
    assert(sandbox.RadioFeedService.getFeed().length === feed.length,
        "repeat ensureToday must not grow feed");

    // 2) morning tick 后 ensure no-op
    const s2 = createEconomySandbox({ gameDay: 5 });
    const npc2 = createHarnessNpc(s2, 1, { isUnlocked: true, counts: { 1105022: 0 } });
    const mgr2 = createNpcManager(s2, {});
    mgr2.npcList = { "1": npc2 };
    mgr2.getNPC = function (id) { return this.npcList[String(id)] || null; };
    s2.GameRuntime.getPlayer = function () {
        return {
            map: { npcMap: { "1": true } },
            npcManager: mgr2,
            log: { addMsg: function () {} }
        };
    };
    s2.NpcEconomyService.runDailyTick(npc2, 1);
    const afterMorning = s2.RadioFeedService.getFeed().length;
    assert(afterMorning > 0, "precondition: morning tick filled feed");
    assert(s2.NpcEconomyService.ensureTodayRadioFeed(mgr2) === false,
        "ensureToday after morning must no-op");
    assert(s2.RadioFeedService.getFeed().length === afterMorning,
        "ensureToday after morning must not grow feed");

    // 3) ensure 不写 player.log
    const s3 = createEconomySandbox({ gameDay: 8 });
    const logs = [];
    const npc3 = createHarnessNpc(s3, 1, { isUnlocked: true, counts: { 1105022: 0 } });
    const mgr3 = {
        npcList: { "1": npc3 },
        getNPC: function (id) { return this.npcList[String(id)] || null; }
    };
    s3.GameRuntime.getPlayer = function () {
        return {
            map: { npcMap: { "1": true } },
            npcManager: mgr3,
            log: { addMsg: function (msg) { logs.push(msg); } }
        };
    };
    s3.NpcEconomyService.ensureTodayRadioFeed(mgr3);
    assert(s3.RadioFeedService.getFeed().length > 0, "ensureToday should fill radio feed");
    assert(logs.length === 0,
        "ensureToday backfill must not write player.log, got " + logs.length);

    // 4) map-only 解锁
    const s4 = createEconomySandbox({ gameDay: 9 });
    const locked = createHarnessNpc(s4, 1, { isUnlocked: false, counts: { 1105022: 0 } });
    const mgr4 = createNpcManager(s4, {});
    mgr4.npcList = { "1": locked };
    mgr4.getNPC = function (id) { return this.npcList[String(id)] || null; };
    s4.GameRuntime.getPlayer = function () {
        return {
            map: { npcMap: { "1": true } },
            npcManager: mgr4
        };
    };
    assert(s4.NpcEconomyService.ensureTodayRadioFeed(mgr4) === true,
        "ensureToday should fill from map-only unlock");
    assert(locked.isUnlocked === true,
        "ensureToday should sync isUnlocked from map.npcMap");
    assert(s4.RadioFeedService.getFeed().length > 0,
        "ensureToday must publish after map-only unlock sync");

    // 5) 无解锁合法空
    const s5 = createEconomySandbox({ gameDay: 2 });
    const mgr5 = createNpcManager(s5, {
        "1": { isUnlocked: false, counts: { 1105022: 0 } },
        "2": { isUnlocked: false }
    });
    s5.GameRuntime.getPlayer = function () {
        return { map: { npcMap: {} }, npcManager: mgr5 };
    };
    s5.NpcEconomyService.ensureTodayRadioFeed(mgr5);
    assert(s5.RadioFeedService.getFeed().length === 0,
        "no unlocked NPCs must keep radio feed empty");
    s5.NpcEconomyService.ensureTodayRadioFeed(mgr5);
    assert(s5.RadioFeedService.getFeed().length === 0,
        "repeat ensure with no unlocks must stay empty");

    return {
        name: "npc-economy-ensure-today-matrix",
        ok: true,
        detail: "validated ensureToday fill/no-op/no-player-log/map-only/legal-empty matrix"
    };
}

function runRadioNodeUnbindOnExitSmoke() {
    const sandbox = createBroadcastSandbox();
    const radioNode = createRadioNodeStub(sandbox);
    sandbox.RadioNode.prototype._bindEconomyListener.call(radioNode);
    assert(radioNode._economyListenerBound === true, "radio listener should bind while open");

    sandbox.RadioNode.prototype.onExit.call(radioNode);
    assert(radioNode._economyListenerBound === false, "radio listener should unbind on exit");

    sandbox.utils.emitter.emit(sandbox.NpcEconomyService.EVENT_DAILY_BROADCAST, {
        npcId: 1,
        gameDay: 1,
        time: "第2天 06:00",
        favorite: [{ itemId: 1105022, tier: "low" }],
        trading: []
    });
    assert(radioNode.data.length === 0,
        "closed radio node must not keep receiving economy broadcasts");

    return {
        name: "npc-economy-radio-node-unbind",
        ok: true,
        detail: "validated RadioNode unbinds economy listener on exit"
    };
}

/**
 * 解锁时序：map.unlockNpc 写 isUnlocked；syncUnlockedFlagsFromMap 从 npcMap 回填。
 */
function runUnlockPathSmoke() {
    const sandbox = createBroadcastSandbox();
    installMapStubs(sandbox);
    sandbox.GameRuntime.getPlayer = function () {
        return sandbox._player;
    };
    sandbox.GameRuntime.getEmitter = function () {
        return sandbox.utils.emitter;
    };
    loadIntoSandbox(sandbox, "assets/src/game/map.js");

    const npc = createNpc(sandbox, 1, { isUnlocked: false });
    npc.getName = function () { return "老罗"; };
    const logs = [];
    sandbox._player = {
        npcManager: {
            getNPC: function (id) {
                return Number(id) === 1 ? npc : null;
            }
        },
        log: {
            addMsg: function () {
                logs.push(Array.prototype.slice.call(arguments));
            }
        }
    };

    const map = new sandbox.Map();
    map.unlockNpc(1);
    assert(npc.isUnlocked === true,
        "map.unlockNpc must set npc.isUnlocked so economy broadcasts can fire");
    assert(map.npcMap[1] === true || map.npcMap["1"] === true,
        "map.unlockNpc must place NPC on the map");
    assert(logs.length === 1, "first map unlock should log once");
    map.unlockNpc(1);
    assert(logs.length === 1, "repeat unlock must not re-log");

    // sync from map.npcMap
    const s2 = createBroadcastSandbox();
    s2.NpcEconomyService.getCurrentGameDay = function () { return 3; };
    const locked = createNpc(s2, 1, { isUnlocked: false });
    const manager = {
        npcList: { "1": locked },
        getNPC: function (id) {
            return this.npcList[String(id)] || this.npcList[id] || null;
        }
    };
    s2.GameRuntime.getPlayer = function () {
        return {
            map: { npcMap: { "1": true } },
            npcManager: manager
        };
    };
    s2.NpcEconomyService.syncUnlockedFlagsFromMap(manager);
    assert(locked.isUnlocked === true,
        "syncUnlockedFlagsFromMap should promote map-visible NPCs to isUnlocked");
    s2.NpcEconomyService.runDailyTick(locked, 1);
    assert(s2.RadioFeedService.getFeed().length > 0,
        "map-visible NPC should broadcast after unlock flag sync");

    return {
        name: "npc-economy-unlock-path",
        ok: true,
        detail: "validated map.unlockNpc and syncUnlockedFlagsFromMap unlock paths"
    };
}

module.exports = [
    runUnlockedNpcRealConfigBroadcastSmoke,
    runTradingProduceFirstPersonBroadcastSmoke,
    runRadioFeedDedupSmoke,
    runRadioNodeDedupSmoke,
    runRadioNodeLiveListenerSmoke,
    runBalancedTierBroadcastSmoke,
    runLockedNpcDoesNotBroadcastSmoke,
    runConsumePoolBroadcastMergedSmoke,
    runEnsureTodayMatrixSmoke,
    runRadioNodeUnbindOnExitSmoke,
    runUnlockPathSmoke
];
