"use strict";

const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox,
    createCountStorage
} = require("../../lib/fixtures/runtime-boundaries");

function createBroadcastSandbox() {
    const sandbox = createVmSandbox();
    loadIntoSandbox(sandbox, "assets/src/util/emitter.js");
    loadIntoSandbox(sandbox, "assets/src/util/utils.js");
    loadIntoSandbox(sandbox, "assets/src/util/memoryUtil.js");
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    loadIntoSandbox(sandbox, "assets/src/data/npcConfig.js");
    loadIntoSandbox(sandbox, "assets/src/data/itemEconomyConfig.js");
    sandbox.GameRuntime.bootstrap({
        emitter: sandbox.utils.emitter,
        timer: {
            formatTime: function () {
                return { d: 1, h: 6, m: 0, s: 0 };
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

function runRadioFeedTimeDedupSmoke() {
    const sandbox = createBroadcastSandbox();
    const basePayload = {
        npcId: 1,
        favorite: [{ itemId: 1105022, tier: "low" }],
        trading: []
    };

    sandbox.RadioFeedService.onDailyBroadcast(Object.assign({}, basePayload, { gameDay: 1, time: 1000 }));
    sandbox.RadioFeedService.onDailyBroadcast(Object.assign({}, basePayload, { gameDay: 2, time: 2000 }));

    const feed = sandbox.RadioFeedService.getFeed();
    assert(feed.length === 2,
        "RadioFeedService should keep separate broadcasts when time differs");
    assert(feed[0]._dedupKey !== feed[1]._dedupKey,
        "RadioFeedService dedup keys should include broadcast time");

    return {
        name: "npc-economy-feed-time-dedup",
        ok: true,
        detail: "validated radio feed deduplication is scoped to broadcast time"
    };
}

function runRadioFeedSameTimeDedupSmoke() {
    const sandbox = createBroadcastSandbox();
    const payload = {
        npcId: 1,
        gameDay: 1,
        time: 1000,
        favorite: [{ itemId: 1105022, tier: "low" }],
        trading: []
    };

    sandbox.RadioFeedService.onDailyBroadcast(payload);
    sandbox.RadioFeedService.onDailyBroadcast(payload);

    assert(sandbox.RadioFeedService.getFeed().length === 1,
        "RadioFeedService should dedupe repeated entries from the same broadcast time");

    return {
        name: "npc-economy-feed-same-time-dedup",
        ok: true,
        detail: "validated repeated same-time radio feed entries are deduplicated"
    };
}

function runRadioNodeTimeDedupSmoke() {
    const sandbox = createBroadcastSandbox();
    sandbox.BuildNode = sandbox.cc.Class.extend({});
    loadIntoSandbox(sandbox, "assets/src/ui/radioNode.js");

    const radioNode = Object.create(sandbox.RadioNode.prototype);
    radioNode.data = [];
    radioNode.addMsg = function (msg) {
        this.data.push(msg);
    };

    radioNode.addLocalSystemMsg({
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        economyKind: "favorite",
        gameDay: 1,
        time: 1000
    });
    radioNode.addLocalSystemMsg({
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        economyKind: "favorite",
        gameDay: 2,
        time: 2000
    });

    assert(radioNode.data.length === 2,
        "RadioNode should keep local system messages from different broadcast times");

    return {
        name: "npc-economy-radio-node-time-dedup",
        ok: true,
        detail: "validated radio UI local message deduplication is scoped to broadcast time"
    };
}

function runRadioNodeSameTimeDedupSmoke() {
    const sandbox = createBroadcastSandbox();
    sandbox.BuildNode = sandbox.cc.Class.extend({});
    loadIntoSandbox(sandbox, "assets/src/ui/radioNode.js");

    const radioNode = Object.create(sandbox.RadioNode.prototype);
    radioNode.data = [];
    radioNode.addMsg = function (msg) {
        this.data.push(msg);
    };
    const entry = {
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        economyKind: "favorite",
        gameDay: 1,
        time: 1000
    };

    radioNode.addLocalSystemMsg(entry);
    radioNode.addLocalSystemMsg(entry);

    assert(radioNode.data.length === 1,
        "RadioNode should dedupe repeated local system messages from the same broadcast time");

    return {
        name: "npc-economy-radio-node-same-time-dedup",
        ok: true,
        detail: "validated repeated same-time radio UI entries are deduplicated"
    };
}

function runRadioNodeLiveListenerSmoke() {
    const sandbox = createBroadcastSandbox();
    sandbox.BuildNode = sandbox.cc.Class.extend({});
    loadIntoSandbox(sandbox, "assets/src/ui/radioNode.js");

    const radioNode = Object.create(sandbox.RadioNode.prototype);
    radioNode.data = [];
    radioNode.addMsg = function (msg) {
        this.data.push(msg);
    };
    sandbox.RadioNode.prototype._bindEconomyListener.call(radioNode);

    sandbox.utils.emitter.emit(sandbox.NpcEconomyService.EVENT_DAILY_BROADCAST, {
        npcId: 1,
        gameDay: 1,
        time: 3000,
        favorite: [{ itemId: 1105022, tier: "low" }],
        trading: []
    });

    assert(radioNode.data.length === 1,
        "RadioNode live listener should enqueue entries from the current broadcast payload");

    return {
        name: "npc-economy-radio-node-live-listener",
        ok: true,
        detail: "validated open radio UI receives current broadcast entries"
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

module.exports = [
    runUnlockedNpcRealConfigBroadcastSmoke,
    runRadioFeedTimeDedupSmoke,
    runRadioFeedSameTimeDedupSmoke,
    runRadioNodeTimeDedupSmoke,
    runRadioNodeSameTimeDedupSmoke,
    runRadioNodeLiveListenerSmoke,
    runBalancedTierBroadcastSmoke,
    runLockedNpcDoesNotBroadcastSmoke
];
