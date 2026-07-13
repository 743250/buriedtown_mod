"use strict";

const {
    assert
} = require("../../lib/core");
const {
    createEconomySandbox,
    createNpc,
    createStorage
} = require("../../lib/fixtures/npc-economy-harness");
const {
    NPC_ECONOMY_DESIGN_TABLE
} = require("../../lib/fixtures/npc-economy-design");

function makeSyntheticNpc(sandbox, options) {
    options = options || {};
    return {
        id: options.id || 9001,
        isUnlocked: options.isUnlocked !== false,
        reputation: sandbox.memoryUtil.encode(Number(options.reputation) || 0),
        storage: createStorage(options.counts || {}),
        config: options.config || {
            favorite: [[]],
            trading: [[]],
            economyOverride: {}
        },
        getName: function () {
            return "Synthetic";
        }
    };
}

/**
 * 五档标签：r = current/target 边界。
 * very_low <0.2, low <0.6, balanced <1.4, high <1.8, very_high >=1.8
 */
function runTierLabelBoundariesSmoke() {
    const sandbox = createEconomySandbox();
    const svc = sandbox.NpcEconomyService;
    const cases = [
        { current: 0, target: 10, expect: "very_low" },
        { current: 1.9, target: 10, expect: "very_low" },
        { current: 2, target: 10, expect: "low" },
        { current: 5.9, target: 10, expect: "low" },
        { current: 6, target: 10, expect: "balanced" },
        { current: 13.9, target: 10, expect: "balanced" },
        { current: 14, target: 10, expect: "high" },
        { current: 17.9, target: 10, expect: "high" },
        { current: 18, target: 10, expect: "very_high" },
        { current: 100, target: 10, expect: "very_high" },
        { current: 5, target: 0, expect: "balanced" }
    ];
    cases.forEach(function (c) {
        const label = svc._getTierLabel(c.current, c.target);
        assert(label === c.expect,
            "tier label for r=" + (c.target ? c.current / c.target : "n/a")
                + " expected " + c.expect + " got " + label);
    });
    return {
        name: "npc-economy-tier-label-boundaries",
        ok: true,
        detail: "validated five-tier stock ratio labels at boundary values"
    };
}

/**
 * 收购价倍率随库存档位变化（非 pool）。
 * base price 1.2，targetStock 10：
 * stock 0 → 1.4 * 1.2；stock 10 → 1.0 * 1.2；stock 20 → 0.6 * 1.2
 */
function runFavoritePriceMultiplierSmoke() {
    const sandbox = createEconomySandbox();
    const npc = makeSyntheticNpc(sandbox, {
        counts: { 1105022: 0 },
        config: {
            favorite: [[{ itemId: 1105022, price: 1.2 }]],
            trading: [[]],
            economyOverride: {
                "1105022": { dailyConsume: 2, targetStock: 10 }
            }
        }
    });
    const svc = sandbox.NpcEconomyService;

    let mul = svc.getFavoritePriceMultiplier(npc, 1105022);
    assert(Math.abs(mul - 1.2 * 1.4) < 1e-9,
        "very_low stock favorite mul should be 1.68, got " + mul);

    npc.storage = createStorage({ 1105022: 10 });
    mul = svc.getFavoritePriceMultiplier(npc, 1105022);
    assert(Math.abs(mul - 1.2) < 1e-9,
        "balanced stock favorite mul should be 1.2, got " + mul);

    npc.storage = createStorage({ 1105022: 20 });
    mul = svc.getFavoritePriceMultiplier(npc, 1105022);
    assert(Math.abs(mul - 1.2 * 0.6) < 1e-9,
        "very_high stock favorite mul should be 0.72, got " + mul);

    return {
        name: "npc-economy-favorite-price-multiplier",
        ok: true,
        detail: "validated favorite price multipliers across stock tiers"
    };
}

/**
 * 日产：trading 有 dailyProduce 时库存增加；无日产的 trading 不广播。
 */
function runDailyProduceAndTradingBroadcastSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 1 });
    const produceId = 1105011;
    const noProduceId = 1303022;
    const npc = makeSyntheticNpc(sandbox, {
        counts: {},
        config: {
            favorite: [[]],
            trading: [[{ itemId: produceId, num: 1 }, { itemId: noProduceId, num: 1 }]],
            economyOverride: {
                "1105011": { dailyProduce: 4, targetStock: 20 },
                // 显式 0：关闭日产（即使 trading.num>0 也不回退）
                "1303022": { dailyProduce: 0 }
            }
        }
    });

    sandbox.NpcEconomyService.runDailyTick(npc, 1);
    assert(npc.storage.getNumByItemId(produceId) === 4,
        "dailyProduce 4 should add 4 stock after 1 day, got "
            + npc.storage.getNumByItemId(produceId));
    assert(npc.storage.getNumByItemId(noProduceId) === 0,
        "explicit dailyProduce 0 must not produce, got "
            + npc.storage.getNumByItemId(noProduceId));

    const feed = sandbox.RadioFeedService.getFeed();
    const trading = feed.filter(function (e) {
        return e.economyKind === "trading";
    });
    assert(trading.some(function (e) { return e.itemId === produceId; }),
        "trading with dailyProduce must broadcast");
    assert(!trading.some(function (e) { return e.itemId === noProduceId; }),
        "trading with explicit dailyProduce 0 must not broadcast");

    return {
        name: "npc-economy-daily-produce-trading",
        ok: true,
        detail: "validated daily produce and trading broadcast filter"
    };
}

/**
 * 日消：独立 dailyConsume 扣库存；不足则扣到 0。
 */
function runDailyConsumeIndependentSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 1 });
    const itemId = 1105022;
    const npc = makeSyntheticNpc(sandbox, {
        counts: { 1105022: 3 },
        config: {
            favorite: [[{ itemId: itemId, price: 1.2 }]],
            trading: [[]],
            economyOverride: {
                "1105022": { dailyConsume: 0.5, targetStock: 3 }
            }
        }
    });

    sandbox.NpcEconomyService.runDailyTick(npc, 1);
    assert(Math.abs(npc.storage.getNumByItemId(itemId) - 2.5) < 1e-9,
        "dailyConsume 0.5 from 3 should leave 2.5, got "
            + npc.storage.getNumByItemId(itemId));

    // 再消 10 天（elapsed clamp 前由调用方算；这里直接传 10）
    sandbox.NpcEconomyService.runDailyTick(npc, 10);
    assert(npc.storage.getNumByItemId(itemId) === 0,
        "over-consume should clamp stock to 0, got "
            + npc.storage.getNumByItemId(itemId));

    return {
        name: "npc-economy-daily-consume-independent",
        ok: true,
        detail: "validated independent dailyConsume and floor at zero"
    };
}

/**
 * consumePool：按库存多的优先扣，池日消取 max。
 * 两成员 A=5 B=1，dailyConsume=2 → 先扣 A 剩 3，B 仍 1。
 */
function runConsumePoolPreferRichestSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 1 });
    const a = 1103011;
    const b = 1103022;
    const npc = makeSyntheticNpc(sandbox, {
        counts: { 1103011: 5, 1103022: 1 },
        config: {
            favorite: [[{ itemId: a, price: 1.2 }, { itemId: b, price: 1.2 }]],
            trading: [[]],
            economyOverride: {
                "1103011": { consumePool: "test_pool", dailyConsume: 2 },
                "1103022": { consumePool: "test_pool", dailyConsume: 2 }
            }
        }
    });

    sandbox.NpcEconomyService.runDailyTick(npc, 1);
    assert(Math.abs(npc.storage.getNumByItemId(a) - 3) < 1e-9,
        "pool should consume from richest first: A 5→3, got "
            + npc.storage.getNumByItemId(a));
    assert(Math.abs(npc.storage.getNumByItemId(b) - 1) < 1e-9,
        "poorer member B should stay 1, got " + npc.storage.getNumByItemId(b));

    return {
        name: "npc-economy-pool-prefer-richest",
        ok: true,
        detail: "validated consumePool drains richest member first"
    };
}

/**
 * 自产自销：trading ∩ favorite 不日消、不进 favorite 广播。
 */
function runSelfTradedSkipConsumeAndFavoriteBroadcastSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 1 });
    // 老罗 1305011 同时在 favorite 与 trading
    const npc = createNpc(sandbox, 1, {
        isUnlocked: true,
        counts: { 1305011: 10, 1105022: 5 }
    });
    // 确保 override 对 1305011 有日消（若配置没有则合成）
    if (!npc.config.economyOverride) {
        npc.config.economyOverride = {};
    }
    if (!npc.config.economyOverride["1305011"]) {
        npc.config.economyOverride["1305011"] = { dailyConsume: 2, targetStock: 10 };
    }

    const selfTraded = sandbox.NpcEconomyService.getSelfTradedItemIds(npc);
    assert(selfTraded[1305011] === true || selfTraded["1305011"] === true,
        "1305011 should be detected as self-traded for npc 1");

    const before = npc.storage.getNumByItemId(1305011);
    const produceAmt = sandbox.NpcEconomyService._getEffectiveEntry(
        npc, 1305011, "trading"
    ).dailyProduce || 0;
    sandbox.NpcEconomyService.runDailyTick(npc, 1);
    const after = npc.storage.getNumByItemId(1305011);
    // 自产自销：可日产，不可日消 → 库存只增不减
    assert(Math.abs(after - (before + produceAmt)) < 1e-9,
        "self-traded must skip consume and keep produce, before="
            + before + " produce=" + produceAmt + " after=" + after);

    const fav = sandbox.RadioFeedService.getFeed().filter(function (e) {
        return e.economyKind === "favorite" && e.itemId === 1305011;
    });
    assert(fav.length === 0,
        "self-traded favorite must not appear in favorite broadcast");

    return {
        name: "npc-economy-self-traded-skip",
        ok: true,
        detail: "validated self-traded items skip consume and favorite broadcast"
    };
}

/**
 * daysElapsed clamp：>30 按 30 算；<=0/非法按 1。
 */
function runDaysElapsedClampSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 1 });
    const produceId = 1105011;
    const npc = makeSyntheticNpc(sandbox, {
        counts: {},
        config: {
            favorite: [[]],
            trading: [[{ itemId: produceId, num: 1 }]],
            economyOverride: {
                "1105011": { dailyProduce: 1, targetStock: 100 }
            }
        }
    });

    sandbox.NpcEconomyService.runDailyTick(npc, 100);
    assert(npc.storage.getNumByItemId(produceId) === 30,
        "daysElapsed 100 should clamp to 30 produce, got "
            + npc.storage.getNumByItemId(produceId));

    const npc2 = makeSyntheticNpc(sandbox, {
        counts: {},
        config: npc.config
    });
    sandbox.RadioFeedService.clear();
    sandbox.NpcEconomyService.runDailyTick(npc2, 0);
    assert(npc2.storage.getNumByItemId(produceId) === 1,
        "daysElapsed 0 should clamp to 1 produce, got "
            + npc2.storage.getNumByItemId(produceId));

    return {
        name: "npc-economy-days-elapsed-clamp",
        ok: true,
        detail: "validated daysElapsed clamp to [1, 30]"
    };
}

/**
 * 非保留库存日清：storage 里不在 trading/favorite/override/default 产消 的物品被清空。
 */
function runNonRetainedStockClearedSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 1 });
    const junkId = 9999991;
    const keepId = 1105022;
    const npc = makeSyntheticNpc(sandbox, {
        counts: { 1105022: 2, 9999991: 7 },
        config: {
            favorite: [[{ itemId: keepId, price: 1.2 }]],
            trading: [[]],
            economyOverride: {
                "1105022": { dailyConsume: 0.5, targetStock: 3 }
            }
        }
    });

    sandbox.NpcEconomyService.runDailyTick(npc, 1);
    assert(npc.storage.getNumByItemId(junkId) === 0,
        "non-retained junk stock must be cleared, got "
            + npc.storage.getNumByItemId(junkId));
    assert(npc.storage.getNumByItemId(keepId) > 0,
        "retained favorite stock must remain after tick");

    return {
        name: "npc-economy-non-retained-cleared",
        ok: true,
        detail: "validated daily tick clears non-retained storage items"
    };
}

/**
 * 谈判专家价格情报：基准点 → 当前点 + 百分比。
 * 酒 base price 1.2 * unit 3.75 = 4.5；very_low 时 *1.4 → 6.3 (+40%)
 */
function runNegotiationPriceIntelSmoke() {
    const sandbox = createEconomySandbox();
    // 最小 itemConfig 供 unit price
    sandbox.itemConfig = {
        "1105022": { id: "1105022", price: 3.75, weight: 1 }
    };
    sandbox.TalentService = {
        hasChosenTalent: function (id) {
            return Number(id) === 123;
        }
    };

    const npc = makeSyntheticNpc(sandbox, {
        counts: { 1105022: 0 },
        config: {
            favorite: [[{ itemId: 1105022, price: 1.2 }]],
            trading: [[]],
            economyOverride: {
                "1105022": { dailyConsume: 2, targetStock: 10 }
            }
        }
    });

    assert(sandbox.NpcEconomyService.canShowNegotiationPriceIntel() === true,
        "talent 123 should unlock price intel");

    const intel = sandbox.NpcEconomyService.getFavoritePriceIntel(npc, 1105022);
    assert(intel, "favorite price intel must exist");
    assert(Math.abs(intel.baseValue - 4.5) < 1e-9,
        "baseValue should be 3.75*1.2=4.5, got " + intel.baseValue);
    assert(Math.abs(intel.currentValue - 6.3) < 1e-9,
        "currentValue very_low should be 4.5*1.4=6.3, got " + intel.currentValue);
    assert(intel.deltaPercent === 40,
        "deltaPercent should be +40, got " + intel.deltaPercent);

    const currentOnly = sandbox.NpcEconomyService.formatPriceShiftText(intel, "favorite");
    assert(currentOnly.indexOf("6.3") >= 0 && currentOnly.indexOf("→") < 0,
        "default (same-tier) text should be current price only, got " + currentOnly);

    const shifted = sandbox.NpcEconomyService.formatPriceShiftText(intel, "favorite", {
        tierChanged: true
    });
    assert(shifted.indexOf("4.5") >= 0 && shifted.indexOf("6.3") >= 0,
        "tier-change text should contain from→to points, got " + shifted);
    assert(shifted.indexOf("+40%") >= 0,
        "tier-change text should contain +40%, got " + shifted);

    // 无天赋时隐藏
    sandbox.TalentService.hasChosenTalent = function () { return false; };
    assert(sandbox.NpcEconomyService.canShowNegotiationPriceIntel() === false,
        "without talent 123 price intel gate must be false");

    return {
        name: "npc-economy-negotiation-price-intel",
        ok: true,
        detail: "validated negotiation price intel base→current points and talent gate"
    };
}

/**
 * 广播点价：谈判专家有天赋才附 基准→当前；无天赋永不附数值。
 * tierChanged 仅作历史标记，不再门控点价显示。
 */
function runBroadcastPriceIntelOnlyOnTierChangeSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 1 });
    sandbox.itemConfig = {
        "1105022": { id: "1105022", price: 3.75, weight: 1 }
    };
    sandbox.TalentService = {
        hasChosenTalent: function (id) {
            return Number(id) === 123;
        }
    };

    const npc = makeSyntheticNpc(sandbox, {
        isUnlocked: true,
        counts: { 1105022: 0 },
        config: {
            favorite: [[{ itemId: 1105022, price: 1.2 }]],
            trading: [[]],
            economyOverride: {
                "1105022": { dailyConsume: 2, targetStock: 10 }
            }
        }
    });
    npc.economyLastTiers = { favorite: {}, trading: {} };

    const logs = [];
    sandbox.GameRuntime.getPlayer = function () {
        return {
            npcManager: {
                getNPC: function () { return npc; }
            },
            log: {
                addMsg: function (msg) { logs.push(msg); }
            }
        };
    };

    // 有天赋 + 首播（无历史=同档语义）：只写当前价，不写 → 变化
    sandbox.NpcEconomyService._emitDailyBroadcast(npc, { writePlayerLog: true });
    const feed1 = sandbox.RadioFeedService.getFeed();
    assert(feed1.length > 0, "first broadcast should produce feed entries");
    assert(logs.some(function (line) {
        return /收购价\s+\d/.test(String(line)) || /卖价\s+\d/.test(String(line));
    }), "with talent 123, first broadcast should include current price, got "
        + JSON.stringify(logs));
    assert(logs.every(function (line) {
        return String(line).indexOf("→") < 0;
    }), "first broadcast (no tier change) must not include from→to, got "
        + JSON.stringify(logs));

    // 同档再播：仍只写当前价
    logs.length = 0;
    sandbox.RadioFeedService.clear();
    sandbox.NpcEconomyService._emitDailyBroadcast(npc, { writePlayerLog: true });
    assert(logs.some(function (line) {
        return /收购价\s+\d/.test(String(line)) || /卖价\s+\d/.test(String(line));
    }), "same-tier rebroadcast with talent should include current price");
    assert(logs.every(function (line) {
        return String(line).indexOf("→") < 0;
    }), "same-tier rebroadcast must not include from→to, got " + JSON.stringify(logs));

    // 换挡：写 基准→当前
    logs.length = 0;
    sandbox.RadioFeedService.clear();
    npc.storage = createStorage({ 1105022: 20 }); // high/very_high vs prior very_low
    sandbox.NpcEconomyService._emitDailyBroadcast(npc, { writePlayerLog: true });
    assert(logs.some(function (line) {
        return String(line).indexOf("→") >= 0;
    }), "tier-change with talent should include from→to, got " + JSON.stringify(logs));

    // 无天赋：任何档都不写点价
    logs.length = 0;
    sandbox.RadioFeedService.clear();
    npc.storage = createStorage({ 1105022: 0 });
    npc.economyLastTiers.favorite["1105022"] = "high";
    sandbox.TalentService.hasChosenTalent = function () { return false; };
    sandbox.NpcEconomyService._emitDailyBroadcast(npc, { writePlayerLog: true });
    assert(logs.every(function (line) {
        return String(line).indexOf("→") < 0
            && !/收购价\s+\d/.test(String(line))
            && !/卖价\s+\d/.test(String(line));
    }), "without talent, broadcast must not append price numbers, got "
        + JSON.stringify(logs));

    return {
        name: "npc-economy-broadcast-price-on-tier-change",
        ok: true,
        detail: "validated talent-gated current price vs tier-change from→to"
    };
}

/**
 * 谈判面板文案：有 base/current value 时输出 名称 4.5→6.3 (+40%)
 */
function runNegotiationPanelPriceLineSmoke() {
    const sandbox = createEconomySandbox();
    loadPanelController(sandbox);

    const controller = Object.create(sandbox.NpcNegotiationPanelController.prototype);
    const line = controller.formatFavoriteItemLine({
        itemId: 1105022,
        price: 1.68,
        baseValue: 4.5,
        currentValue: 6.3,
        deltaPercent: 40
    });
    assert(line.indexOf("4.5") >= 0 && line.indexOf("6.3") >= 0 && line.indexOf("+40%") >= 0,
        "panel line should show points shift, got " + line);

    const stable = controller.formatFavoriteItemLine({
        itemId: 1105022,
        price: 1.2,
        baseValue: 4.5,
        currentValue: 4.5,
        deltaPercent: 0
    });
    assert(stable.indexOf("平稳") >= 0,
        "stable line should mark 平稳, got " + stable);

    return {
        name: "npc-economy-negotiation-panel-line",
        ok: true,
        detail: "validated negotiation panel formats base→current price lines"
    };
}

function loadPanelController(sandbox) {
    // NpcNegotiationPanelController 依赖 cc.Class / uiUtil / stringUtil，已在 harness 部分具备
    if (!sandbox.uiUtil) {
        sandbox.uiUtil = {
            fontFamily: { normal: "Arial" },
            fontSize: { COMMON_3: 14, COMMON_4: 12 }
        };
    }
    if (!sandbox.UITheme) {
        sandbox.UITheme = { colors: { TEXT_TITLE: "black" } };
    }
    if (!sandbox.cc.DrawNode) {
        sandbox.cc.DrawNode = function () {
            this.drawSegment = function () {};
        };
    }
    if (!sandbox.cc.TEXT_ALIGNMENT_LEFT) {
        sandbox.cc.TEXT_ALIGNMENT_LEFT = 0;
    }
    if (!sandbox.cc.Node) {
        sandbox.cc.Node = function () {
            this.children = [];
            this.addChild = function (c) { this.children.push(c); };
            this.setName = function () {};
            this.setPosition = function () {};
        };
    }
    const { loadIntoSandbox } = require("../../lib/core");
    loadIntoSandbox(sandbox, "assets/src/ui/NpcNegotiationPanelController.js");
}

/**
 * 设计稿 §16 全量契约（NPC 1–6）：高声望解锁全部 trading 后，
 * 一日 tick 的日产 / 独立日消 / 合并池日消必须与 economyOverride 一致。
 * 设计表见 fixtures/npc-economy-design.js。
 */
function runAllNpcDesignProduceConsumeSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 3 });
    const svc = sandbox.NpcEconomyService;
    const names = [];

    Object.keys(NPC_ECONOMY_DESIGN_TABLE).forEach(function (npcId) {
        const design = NPC_ECONOMY_DESIGN_TABLE[npcId];
        names.push(design.name);
        const seed = {};
        // 日消/池成员先灌满，避免 0 库存掩盖配置错误
        Object.keys(design.consume || {}).forEach(function (id) {
            seed[id] = 20;
        });
        if (design.consumePool) {
            design.consumePool.members.forEach(function (id, idx) {
                // 池优先扣库存多的：给第一个成员最多，便于断言总量
                seed[id] = idx === 0 ? 10 : 1;
            });
        }

        const npc = createNpc(sandbox, npcId, {
            isUnlocked: true,
            reputation: 10,
            counts: seed
        });

        // 死配置守卫：dailyConsume 必须挂在 favorite 或 consumePool 成员上，
        // 否则 _getConsumeMap 永远扫不到（烟草类曾踩过）。
        const favoriteIds = {};
        (npc.config.favorite || []).forEach(function (tier) {
            (tier || []).forEach(function (e) {
                if (e && e.itemId != null) {
                    favoriteIds[String(e.itemId)] = true;
                }
            });
        });
        const override = npc.config.economyOverride || {};
        Object.keys(override).forEach(function (itemId) {
            const entry = override[itemId] || {};
            if (!(Number(entry.dailyConsume) > 0)) {
                return;
            }
            if (entry.consumePool) {
                return;
            }
            assert(favoriteIds[String(itemId)],
                design.name + " dead dailyConsume " + itemId
                    + " not in any favorite tier");
        });

        // 配置层：effective dailyProduce 必须对齐设计表
        Object.keys(design.produce).forEach(function (itemId) {
            const got = svc._getEffectiveEntry(npc, itemId, "trading").dailyProduce;
            assert(Number(got) === Number(design.produce[itemId]),
                design.name + " produce cfg " + itemId
                    + " want " + design.produce[itemId] + " got " + got);
        });
        Object.keys(design.consume || {}).forEach(function (itemId) {
            const got = svc._getEffectiveEntry(npc, itemId, "favorite").dailyConsume;
            assert(Number(got) === Number(design.consume[itemId]),
                design.name + " consume cfg " + itemId
                    + " want " + design.consume[itemId] + " got " + got);
        });

        const before = {};
        const ids = [];
        Object.keys(design.produce).forEach(function (id) { ids.push(Number(id)); });
        Object.keys(design.consume || {}).forEach(function (id) { ids.push(Number(id)); });
        if (design.consumePool) {
            design.consumePool.members.forEach(function (id) { ids.push(Number(id)); });
        }
        ids.forEach(function (id) {
            before[id] = npc.storage.getNumByItemId(id);
        });

        sandbox.RadioFeedService.clear();
        svc.runDailyTick(npc, 1);

        Object.keys(design.produce).forEach(function (itemId) {
            const id = Number(itemId);
            const delta = npc.storage.getNumByItemId(id) - (before[id] || 0);
            // 自产自销：只产不消，delta 应等于日产
            assert(Math.abs(delta - design.produce[itemId]) < 1e-9,
                design.name + " day produce " + itemId
                    + " want +" + design.produce[itemId] + " got " + delta);
        });

        Object.keys(design.consume || {}).forEach(function (itemId) {
            const id = Number(itemId);
            // 自产自销物品不日消：若在 produce 表且 self-traded，库存应只增
            const selfTraded = svc.getSelfTradedItemIds(npc);
            if (selfTraded[id] || selfTraded[String(id)]) {
                return;
            }
            const delta = (before[id] || 0) - npc.storage.getNumByItemId(id);
            assert(Math.abs(delta - design.consume[itemId]) < 1e-9,
                design.name + " day consume " + itemId
                    + " want -" + design.consume[itemId] + " got -" + delta);
        });

        if (design.consumePool) {
            let poolBefore = 0;
            let poolAfter = 0;
            design.consumePool.members.forEach(function (id) {
                poolBefore += before[id] || 0;
                poolAfter += npc.storage.getNumByItemId(id);
            });
            const poolDelta = poolBefore - poolAfter;
            assert(Math.abs(poolDelta - design.consumePool.dailyConsume) < 1e-9,
                design.name + " pool " + design.consumePool.id
                    + " want -" + design.consumePool.dailyConsume
                    + " got -" + poolDelta);
        }

        // 有日产则 trading 广播应覆盖全部 produce 物
        const tradingFeed = sandbox.RadioFeedService.getFeed().filter(function (e) {
            return e.economyKind === "trading" && Number(e.npcId) === Number(npcId);
        });
        Object.keys(design.produce).forEach(function (itemId) {
            assert(tradingFeed.some(function (e) {
                return Number(e.itemId) === Number(itemId);
            }), design.name + " trading broadcast missing item " + itemId);
        });
    });

    return {
        name: "npc-economy-all-npc-design-produce-consume",
        ok: true,
        detail: "validated design produce/consume for " + names.join("/")
    };
}

/**
 * 未写 dailyProduce 时回退 trading.num；显式 0 关闭。
 */
function runTradingNumProduceFallbackSmoke() {
    const sandbox = createEconomySandbox({ gameDay: 1 });
    const produceId = 1101011;
    const offId = 1101031;
    const npc = makeSyntheticNpc(sandbox, {
        counts: {},
        config: {
            favorite: [[]],
            trading: [[{ itemId: produceId, num: 7 }, { itemId: offId, num: 3 }]],
            economyOverride: {
                "1101031": { dailyProduce: 0 }
            }
        }
    });

    const fallback = sandbox.NpcEconomyService._getEffectiveEntry(
        npc, produceId, "trading"
    ).dailyProduce;
    assert(fallback === 7,
        "missing dailyProduce should fallback to trading.num=7, got " + fallback);

    sandbox.NpcEconomyService.runDailyTick(npc, 1);
    assert(npc.storage.getNumByItemId(produceId) === 7,
        "fallback produce should add trading.num stock, got "
            + npc.storage.getNumByItemId(produceId));
    assert(npc.storage.getNumByItemId(offId) === 0,
        "explicit dailyProduce 0 must stay zero, got "
            + npc.storage.getNumByItemId(offId));

    return {
        name: "npc-economy-trading-num-produce-fallback",
        ok: true,
        detail: "validated trading.num fallback and explicit zero disable"
    };
}

/**
 * 广播涨跌文案：cc.formatStr 不转义 %%，模板只能写一个 %。
 */
function runBroadcastPercentLiteralSmoke() {
    const {
        createVmSandbox
    } = require("../../lib/fixtures/runtime-boundaries");
    const {
        loadIntoSandbox
    } = require("../../lib/core");
    const sandbox = createVmSandbox();
    loadIntoSandbox(sandbox, "assets/src/data/string/string_zh.js");
    loadIntoSandbox(sandbox, "assets/src/util/stringUtil.js");

    [1377, 1378, 1379, 1380].forEach(function (id) {
        const raw = sandbox.string[String(id)];
        assert(typeof raw === "string" && raw.indexOf("%%") < 0,
            "string " + id + " must not use %% (cc.formatStr leaves it as-is), got " + raw);
        assert(raw.indexOf("%s%") >= 0 || /%\d?s/.test(raw),
            "string " + id + " should keep a single percent after %s");
        assert(raw.indexOf("我") === 0,
            "string " + id + " body must be first-person 我…, got " + raw);
        // 两个 %s 是旧第三人称模板；现只剩 item + percent
        const placeholders = (raw.match(/%s/g) || []).length;
        assert(placeholders === 2,
            "string " + id + " should have 2 placeholders (item, percent), got " + placeholders);
    });

    const up = sandbox.stringUtil.getString(1377, "酒", 40);
    assert(up.indexOf("我") === 0, "formatted 1377 must start with 我, got " + up);
    assert(up.indexOf("+40%") >= 0, "formatted 1377 should show +40%, got " + up);
    assert(up.indexOf("老罗") < 0 && up.indexOf("%%") < 0,
        "formatted 1377 must not embed speaker or double percent, got " + up);

    const down = sandbox.stringUtil.getString(1380, "木质材料", 20);
    assert(down.indexOf("我") === 0, "formatted 1380 must start with 我, got " + down);
    assert(down.indexOf("-20%") >= 0, "formatted 1380 should show -20%, got " + down);
    assert(down.indexOf("杰夫") < 0 && down.indexOf("%%") < 0,
        "formatted 1380 must not embed speaker or double percent, got " + down);

    return {
        name: "npc-economy-broadcast-percent-literal",
        ok: true,
        detail: "validated first-person radio price templates render a single % not %%"
    };
}

module.exports = [
    runTierLabelBoundariesSmoke,
    runFavoritePriceMultiplierSmoke,
    runDailyProduceAndTradingBroadcastSmoke,
    runDailyConsumeIndependentSmoke,
    runConsumePoolPreferRichestSmoke,
    runSelfTradedSkipConsumeAndFavoriteBroadcastSmoke,
    runDaysElapsedClampSmoke,
    runNonRetainedStockClearedSmoke,
    runNegotiationPriceIntelSmoke,
    runBroadcastPriceIntelOnlyOnTierChangeSmoke,
    runNegotiationPanelPriceLineSmoke,
    runAllNpcDesignProduceConsumeSmoke,
    runTradingNumProduceFallbackSmoke,
    runBroadcastPercentLiteralSmoke
];
