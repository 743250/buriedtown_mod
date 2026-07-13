"use strict";

const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createEconomySandbox,
    createNpc,
    createRadioNodeInitHarness
} = require("../../lib/fixtures/npc-economy-harness");

/**
 * 根因复现：BuildNode._init → checkVisible 同步 flush 时，
 * RadioNode 必须先有 this.data，否则本地广播被 try/catch 静默丢掉。
 */
function runRadioNodeInitOrderFlushSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 5 });
    sandbox.GameRuntime.getPlayer = function () {
        return {
            npcManager: {
                npcList: {
                    "1": createNpc(sandbox, 1, {
                        isUnlocked: true,
                        counts: { 1105022: 0 }
                    })
                },
                getNPC: function (id) {
                    return this.npcList[String(id)] || null;
                }
            }
        };
    };

    const radioNode = createRadioNodeInitHarness(sandbox);
    sandbox.RadioNode.prototype._init.call(radioNode);

    assert(Array.isArray(radioNode.data),
        "RadioNode._init must initialize this.data before super flush");
    assert(radioNode.data.length > 0,
        "opening radio must flush ensureTodayRadioFeed entries without silent throw, got "
            + radioNode.data.length);
    assert(radioNode.data.every(function (e) {
        return e && e.kind === "npc_economy";
    }), "flushed radio entries must be npc_economy local system messages");

    return {
        name: "npc-economy-radio-node-init-order",
        ok: true,
        detail: "validated RadioNode initializes data before super-driven feed flush"
    };
}

/**
 * MessageView 对 npc_economy 条目必须能建出可见高度节点，且不抛。
 */
function runMessageViewNpcEconomyRenderSmoke() {
    const sandbox = createEconomySandbox({ withUi: true, withBroadcastConfig: true, gameDay: 1 });
    assert(typeof sandbox.MessageView === "function"
        || (sandbox.MessageView && sandbox.MessageView.prototype),
        "MessageView must load under UI stubs");

    const view = Object.create(sandbox.MessageView.prototype);
    view.getViewSize = function () {
        return { width: 300, height: 200 };
    };

    const log = {
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        tier: "low",
        economyKind: "favorite",
        gameDay: 1,
        time: "第2天 06:00",
        _dedupKey: "1|1|1105022|favorite"
    };

    let node = null;
    try {
        node = sandbox.MessageView.prototype.createOneItem.call(view, log);
    } catch (e) {
        throw new Error("MessageView.createOneItem npc_economy must not throw: " + e);
    }

    assert(node, "npc_economy item must create a node");
    assert(Number(node.height) > 0,
        "npc_economy item node height must be > 0, got " + node.height);
    assert(node.log === log || (node.log && node.log.kind === "npc_economy"),
        "npc_economy node should retain log payload");

    const header = node.getChildByTag(1);
    assert(header && typeof header.string === "string",
        "npc_economy item must have a header label");
    assert(header.string.indexOf("NPC-1") === 0 || header.string.indexOf("老罗") === 0,
        "header must start with speaker name, got " + header.string);
    assert(header.string.indexOf("第2天 06:00") > 0,
        "header must use game-time string, got " + header.string);
    assert(!/秒前|分钟前|小时前|天前|刚刚/.test(header.string),
        "header must not use real-world relative time, got " + header.string);

    // 自定义第一人称文案：正文可无名字，但标题行必须有
    const body = node.getChildByTag(2);
    assert(body && body.string, "npc_economy body text must exist");
    // 默认无谈判专家：不带具体点价
    assert(String(body.string).indexOf("→") < 0,
        "without talent body must not include price shift, got " + body.string);

    // balanced 也要能渲染（之前文案缺省容易空串）
    const balanced = {
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        tier: "balanced",
        economyKind: "favorite",
        gameDay: 1,
        time: "第2天 06:00"
    };
    const node2 = sandbox.MessageView.prototype.createOneItem.call(view, balanced);
    assert(node2 && Number(node2.height) > 0,
        "balanced tier npc_economy item must render with height > 0");
    const header2 = node2.getChildByTag(1);
    assert(header2 && header2.string.indexOf(" · ") > 0,
        "header must be 'Name · time' form, got " + (header2 && header2.string));
    assert(header2.string.indexOf("第2天 06:00") > 0,
        "balanced header must keep game-time string, got " + header2.string);

    // 谈判专家：同档只写当前价；换挡写 基准→当前
    sandbox.itemConfig = sandbox.itemConfig || {
        "1105022": { id: "1105022", price: 3.75 }
    };
    sandbox.TalentService = {
        hasChosenTalent: function (id) { return Number(id) === 123; }
    };
    const npcForIntel = createNpc(sandbox, 1, {
        isUnlocked: true,
        counts: { 1105022: 0 }
    });
    sandbox.GameRuntime.getPlayer = function () {
        return {
            npcManager: {
                getNPC: function () { return npcForIntel; }
            }
        };
    };
    const sameTier = {
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        tier: "very_low",
        economyKind: "favorite",
        gameDay: 2,
        time: "第3天 06:00",
        tierChanged: false
    };
    const node3 = sandbox.MessageView.prototype.createOneItem.call(view, sameTier);
    const body3 = node3.getChildByTag(2);
    assert(body3 && /收购价\s+\d/.test(String(body3.string)),
        "same-tier with talent should include current price, got " + (body3 && body3.string));
    assert(String(body3.string).indexOf("→") < 0,
        "same-tier body must not include from→to, got " + (body3 && body3.string));

    const changed = {
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        tier: "very_low",
        economyKind: "favorite",
        gameDay: 3,
        time: "第4天 06:00",
        tierChanged: true,
        previousTier: "balanced"
    };
    const node4 = sandbox.MessageView.prototype.createOneItem.call(view, changed);
    const body4 = node4.getChildByTag(2);
    assert(body4 && String(body4.string).indexOf("→") >= 0,
        "tierChanged body should include from→to, got " + (body4 && body4.string));

    // 无天赋：即便 mark tierChanged 也不带数值
    sandbox.TalentService.hasChosenTalent = function () { return false; };
    const noTalent = {
        kind: "npc_economy",
        npcId: 1,
        itemId: 1105022,
        tier: "very_low",
        economyKind: "favorite",
        gameDay: 4,
        time: "第5天 06:00",
        tierChanged: true,
        previousTier: "balanced"
    };
    const node5 = sandbox.MessageView.prototype.createOneItem.call(view, noTalent);
    const body5 = node5.getChildByTag(2);
    assert(body5 && String(body5.string).indexOf("→") < 0
        && !/收购价\s+\d/.test(String(body5.string)),
        "without talent body must not include price numbers, got "
            + (body5 && body5.string));

    return {
        name: "npc-economy-message-view-render",
        ok: true,
        detail: "validated MessageView talent-gated current price vs tier-change shift"
    };
}

/**
 * LogView.addLog 后应把 offset 钉在底部，避免内容在视口外。
 * 不走 MessageView 多层 ctor（smoke 的 Class.extend 对多层 _super 会栈溢出），
 * 直接用 LogView 原型方法 + 最小桩验证 offset 契约。
 */
function runMessageViewScrollToLatestSmoke() {
    const sandbox = createEconomySandbox({ withUi: true, gameDay: 1 });

    const view = {
        data: [],
        mycontainer: new sandbox.cc.Layer(),
        _viewSize: { width: 300, height: 120 },
        _contentSize: { width: 300, height: 120 },
        _offset: { x: 0, y: 99 },
        getViewSize: function () { return this._viewSize; },
        getContentSize: function () { return this._contentSize; },
        setContentSize: function (w, h) {
            this._contentSize = { width: w, height: h };
        },
        setContentOffset: function (p) {
            this._offset = p || { x: 0, y: 0 };
        },
        getContentOffset: function () {
            return this._offset;
        },
        updateContentSize: sandbox.LogView.prototype.updateContentSize,
        createOneItem: function () {
            const node = new sandbox.cc.Node();
            node.height = 40;
            node.width = 300;
            node.setAnchorPoint = function () {};
            node.setPosition = function (x, y) {
                this.x = x;
                this.y = y;
            };
            return node;
        }
    };

    sandbox.LogView.prototype.addLog.call(view, {
        time: "06:00",
        txt: "economy line"
    });

    const offset = view.getContentOffset();
    assert(offset && Number(offset.y) === 0,
        "LogView should pin content offset y=0 after addLog, got "
            + JSON.stringify(offset));
    assert(view.data && view.data.length === 1,
        "addLog should keep one item in view data");

    return {
        name: "npc-economy-message-view-scroll",
        ok: true,
        detail: "validated LogView pins scroll offset to latest radio entry"
    };
}

/**
 * 打开电台：ensure 一次后 UI data 有条目；重复 flush 不靠重复 ensure 刷屏
 * （同 time/dedup key 去重）。
 */
function runRadioOpenFlushDedupSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 6 });
    sandbox.Navigation = { nodeName: { RADIO_NODE: "RadioNode" } };
    sandbox.BuildNode = sandbox.cc.Class.extend({});
    loadIntoSandbox(sandbox, "assets/src/ui/radioNode.js");

    const manager = {
        npcList: {
            "1": createNpc(sandbox, 1, { isUnlocked: true, counts: { 1105022: 0 } })
        },
        getNPC: function (id) {
            return this.npcList[String(id)] || null;
        }
    };
    sandbox.GameRuntime.getPlayer = function () {
        return { npcManager: manager };
    };

    const radioNode = Object.create(sandbox.RadioNode.prototype);
    radioNode.data = [];
    radioNode.addMsg = function (msg) {
        this.data.push(msg);
    };

    sandbox.RadioNode.prototype._flushRadioFeedBuffer.call(radioNode);
    const firstLen = radioNode.data.length;
    assert(firstLen > 0, "first open flush should load economy entries");

    // 同日再次 flush：ensure 应 no-op，已有 dedup key 的条目不重复
    sandbox.RadioNode.prototype._flushRadioFeedBuffer.call(radioNode);
    assert(radioNode.data.length === firstLen,
        "second open flush must not duplicate same-day radio entries, first="
            + firstLen + " second=" + radioNode.data.length);

    return {
        name: "npc-economy-radio-open-flush-dedup",
        ok: true,
        detail: "validated radio open flush is idempotent for same-day entries"
    };
}

module.exports = [
    runRadioNodeInitOrderFlushSmoke,
    runMessageViewNpcEconomyRenderSmoke,
    runMessageViewScrollToLatestSmoke,
    runRadioOpenFlushDedupSmoke
];
