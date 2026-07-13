"use strict";

const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createEconomySandbox,
    createNpc,
    installMapStubs
} = require("../../lib/fixtures/npc-economy-harness");

/**
 * 读档恢复：map.npcMap 有 NPC、存档 isUnlocked=false 时，
 * map.restore 必须回填 isUnlocked，否则广播永久静默。
 */
function runMapRestoreUnlocksNpcSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 3 });
    installMapStubs(sandbox);
    sandbox.GameRuntime.getEmitter = function () {
        return sandbox.utils.emitter;
    };

    const npc = createNpc(sandbox, 1, { isUnlocked: false, counts: { 1105022: 0 } });
    const manager = {
        npcList: { "1": npc },
        getNPC: function (id) {
            return Number(id) === 1 || id === "1" ? npc : null;
        }
    };
    sandbox.GameRuntime.getPlayer = function () {
        return {
            npcManager: manager,
            log: { addMsg: function () {} }
        };
    };

    loadIntoSandbox(sandbox, "assets/src/game/map.js");
    const map = new sandbox.Map();
    map.restore({
        npcMap: [1],
        siteMap: {},
        pos: { x: 0, y: 0 },
        needDeleteSiteList: []
    });

    assert(npc.isUnlocked === true,
        "map.restore must promote map-visible NPCs to isUnlocked");
    assert(map.npcMap[1] === true || map.npcMap["1"] === true,
        "map.restore must rebuild npcMap");

    sandbox.NpcEconomyService.runDailyTick(npc, 1);
    assert(sandbox.RadioFeedService.getFeed().length > 0,
        "restored map-visible NPC should broadcast after restore unlock sync");

    return {
        name: "npc-economy-map-restore-unlock",
        ok: true,
        detail: "validated map.restore backfills isUnlocked and enables broadcast"
    };
}

/**
 * GameRuntime 换 emitter 后，日广播仍应进入 RadioFeedService 缓冲。
 * 生产路径：game.js new Emitter() → setEmitter，旧 bind 会失效。
 */
function runEmitterRebindOnSetEmitterSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 4 });
    const oldEmitter = sandbox.utils.emitter;
    const newEmitter = new sandbox.Emitter();

    sandbox.GameRuntime.setEmitter(newEmitter);
    assert(sandbox.utils.emitter === newEmitter,
        "setEmitter must re-point utils.emitter");
    assert(sandbox.utils.emitter !== oldEmitter,
        "precondition: emitter instance changed");

    const npc = createNpc(sandbox, 1, { isUnlocked: true, counts: { 1105022: 0 } });
    sandbox.NpcEconomyService.runDailyTick(npc, 1);

    const feed = sandbox.RadioFeedService.getFeed();
    assert(feed.length > 0,
        "after GameRuntime.setEmitter, daily tick must still fill radio feed via rebind");
    assert(feed.every(function (e) { return e.npcId === 1; }),
        "rebound feed entries should belong to the unlocked NPC");

    return {
        name: "npc-economy-emitter-rebind",
        ok: true,
        detail: "validated RadioFeedService rebinds after GameRuntime.setEmitter"
    };
}

module.exports = [
    runMapRestoreUnlocksNpcSmoke,
    runEmitterRebindOnSetEmitterSmoke
];
