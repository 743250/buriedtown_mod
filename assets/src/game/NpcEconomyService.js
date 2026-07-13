/**
 * NpcEconomyService —— NPC 动态库存与价格服务
 *
 * 设计稿：docs/npc-trade-*.md（6 份角色设计文档）
 *
 * 三件事：
 *   1. 五档固定价格曲线（getFavoritePriceMultiplier / getTradingSellMultiplier）
 *   2. 日产/日消结算（runDailyTick），含 consumePool 合并池消耗
 *   3. 每日统一广播（emit EVENT_DAILY_BROADCAST），把当日各物品档位摘要派给电台
 *
 * 数据分层：基础表 itemEconomyConfig + NPC 覆盖 economyOverride → 合并视图 _getEffectiveEntry
 *
 * 五档倍率（基于 currentStock / targetStock 比值 r）：
 *   r < 0.2   极缺  +40%
 *   r < 0.6   偏少  +20%
 *   r < 1.4   平衡   0%
 *   r < 1.8   偏多  -20%
 *   r >= 1.8  过剩  -40%
 *
 * 装配点：jsList.js，排在 npc.js 之前
 *
 * 兼容兜底：
 *   - dailyConsume 缺失 → 默认 0；dailyProduce 缺失时 trading 回退 trading.num
 *   - 显式 dailyProduce: 0 关闭日产；targetStock 缺失且有日产时 = produce × TARGET_STOCK_PRODUCE_RATIO
 *   - 自产自销物品（trading ∩ favorite）不进日消、不广播
 *   - npc.isUnlocked === false → 不广播
 */
var NpcEconomyService = {
    // 五档倍率
    TIER_VERY_LOW: 1.4,
    TIER_LOW: 1.2,
    TIER_BALANCED: 1.0,
    TIER_HIGH: 0.8,
    TIER_VERY_HIGH: 0.6,

    // 档位阈值（基于 r = currentStock / targetStock）
    RATIO_VERY_LOW: 0.2,
    RATIO_LOW: 0.6,
    RATIO_BALANCED: 1.4,
    RATIO_HIGH: 1.8,

    // 调参常量
    TARGET_STOCK_PRODUCE_RATIO: 5,
    TARGET_STOCK_CONSUME_RATIO: 5,
    DAYS_ELAPSED_CLAMP: 30,

    EVENT_DAILY_BROADCAST: "npcEconomy:dailyBroadcast",
    EVENT_PRICE_SHIFT: "npcEconomy:priceShift",

    // ===== 合并视图 =====

    _getEffectiveEntry: function (npc, itemId, kind) {
        var base = (typeof itemEconomyConfig !== "undefined" && itemEconomyConfig)
            ? (itemEconomyConfig[itemId] || itemEconomyConfig[String(itemId)] || {}) : {};
        var override = (npc && npc.config && npc.config.economyOverride)
            ? (npc.config.economyOverride[String(itemId)] || npc.config.economyOverride[itemId] || {}) : {};
        var hasOverrideProduce = override.dailyProduce != null;
        var dailyProduce = hasOverrideProduce
            ? Number(override.dailyProduce)
            : (Number(base.defaultDailyProduce) || 0);
        // 设计稿默认：trading.num 即日产量；未显式配置时回退，避免贸易品静默不产。
        // 显式 dailyProduce: 0 表示关闭日产，不再回退 num。
        if (!hasOverrideProduce && !(dailyProduce > 0) && kind === "trading") {
            var tradingEntry = this._findTradingEntry(npc, itemId);
            if (tradingEntry && tradingEntry.num != null) {
                dailyProduce = Number(tradingEntry.num) || 0;
            }
        }
        var targetStock = override.targetStock != null
            ? Number(override.targetStock)
            : (Number(base.defaultTargetStock) || 0);
        if (!(targetStock > 0) && dailyProduce > 0) {
            targetStock = dailyProduce * this.TARGET_STOCK_PRODUCE_RATIO;
        }
        return {
            dailyConsume: override.dailyConsume != null ? Number(override.dailyConsume) : (Number(base.defaultDailyConsume) || 0),
            targetStock: targetStock,
            dailyProduce: dailyProduce,
            consumePool: override.consumePool || null,
            category: base.category || null
        };
    },

    // ===== 公共 API =====

    getSelfTradedItemIds: function (npc) {
        var result = {};
        if (!npc || !npc.config) {
            return result;
        }
        var tradingIds = {};
        (npc.config.trading || []).forEach(function (tier) {
            (tier || []).forEach(function (entry) {
                if (entry && entry.itemId != null) {
                    tradingIds[entry.itemId] = true;
                }
            });
        });
        (npc.config.favorite || []).forEach(function (tier) {
            (tier || []).forEach(function (entry) {
                if (entry && entry.itemId != null && tradingIds[entry.itemId]) {
                    result[entry.itemId] = true;
                }
            });
        });
        return result;
    },

    _getTierMultiplier: function (currentStock, targetStock) {
        if (targetStock <= 0) {
            return 1.0;
        }
        var r = currentStock / targetStock;
        if (r < this.RATIO_VERY_LOW) return this.TIER_VERY_LOW;
        if (r < this.RATIO_LOW) return this.TIER_LOW;
        if (r < this.RATIO_BALANCED) return this.TIER_BALANCED;
        if (r < this.RATIO_HIGH) return this.TIER_HIGH;
        return this.TIER_VERY_HIGH;
    },

    getFavoritePriceMultiplier: function (npc, itemId) {
        var entry = this._findFavoriteEntry(npc, itemId);
        if (!entry) {
            return null;
        }
        var basePrice = Number(entry.price) || 1;
        var effective = this._getEffectiveEntry(npc, itemId, "favorite");
        if (effective.consumePool) {
            var poolState = this._getPoolState(npc, effective.consumePool, "favorite");
            if (poolState.targetStock > 0) {
                var k = this._getTierMultiplier(poolState.currentStock, poolState.targetStock);
                return basePrice * k;
            }
            return basePrice;
        }
        if (effective.dailyConsume <= 0) {
            return basePrice;
        }
        var targetStock = effective.targetStock || (effective.dailyConsume * this.TARGET_STOCK_CONSUME_RATIO);
        var current = this._getStock(npc, itemId);
        var k = this._getTierMultiplier(current, targetStock);
        return basePrice * k;
    },

    getTradingSellMultiplier: function (npc, itemId) {
        var entry = this._findTradingEntry(npc, itemId);
        if (!entry) {
            return null;
        }
        var baseMul = this._getTradingBaseMultiplier(npc, itemId);
        var effective = this._getEffectiveEntry(npc, itemId, "trading");
        if (effective.dailyProduce <= 0) {
            return baseMul;
        }
        var targetStock = effective.targetStock || (effective.dailyProduce * this.TARGET_STOCK_PRODUCE_RATIO);
        var current = this._getStock(npc, itemId);
        var k = this._getTierMultiplier(current, targetStock);
        return baseMul * k;
    },

    /**
     * 谈判专家天赋：可查看库存驱动的具体点价涨跌（基准 → 当前）。
     */
    canShowNegotiationPriceIntel: function () {
        return typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.hasChosenTalent === "function"
            && TalentService.hasChosenTalent(123);
    },

    _getItemUnitPrice: function (itemId) {
        try {
            if (typeof Item !== "undefined") {
                return Number(new Item(itemId).getPrice()) || 0;
            }
        } catch (e) {}
        if (typeof itemConfig !== "undefined" && itemConfig) {
            var cfg = itemConfig[itemId] || itemConfig[String(itemId)];
            if (cfg && cfg.price != null) {
                return Number(cfg.price) || 0;
            }
        }
        return 0;
    },

    _getTradingBaseMultiplier: function (npc, itemId) {
        if (npc && npc.config && npc.config.economyOverride) {
            var ovr = npc.config.economyOverride[String(itemId)] || npc.config.economyOverride[itemId] || {};
            if (ovr.basePriceMultiplier != null) {
                return Number(ovr.basePriceMultiplier);
            }
        }
        if (typeof itemEconomyConfig !== "undefined" && itemEconomyConfig) {
            var base = itemEconomyConfig[itemId] || itemEconomyConfig[String(itemId)] || {};
            if (base.defaultBasePriceMultiplier != null) {
                return Number(base.defaultBasePriceMultiplier);
            }
        }
        return 1.0;
    },

    _buildPriceIntel: function (itemId, baseMultiplier, currentMultiplier, kind) {
        if (typeof currentMultiplier !== "number" || !isFinite(currentMultiplier) || currentMultiplier <= 0) {
            return null;
        }
        var baseMul = Number(baseMultiplier);
        if (!isFinite(baseMul) || baseMul <= 0) {
            baseMul = 1;
        }
        var unit = this._getItemUnitPrice(itemId);
        var deltaPercent = Math.round((currentMultiplier / baseMul - 1) * 100);
        return {
            kind: kind,
            itemId: parseInt(itemId, 10),
            baseMultiplier: baseMul,
            currentMultiplier: currentMultiplier,
            unitPrice: unit,
            baseValue: unit * baseMul,
            currentValue: unit * currentMultiplier,
            deltaPercent: deltaPercent
        };
    },

    getFavoritePriceIntel: function (npc, itemId) {
        var entry = this._findFavoriteEntry(npc, itemId);
        if (!entry) {
            return null;
        }
        var baseMul = Number(entry.price) || 1;
        var currentMul = this.getFavoritePriceMultiplier(npc, itemId);
        return this._buildPriceIntel(itemId, baseMul, currentMul, "favorite");
    },

    getTradingPriceIntel: function (npc, itemId) {
        if (!this._findTradingEntry(npc, itemId)) {
            return null;
        }
        var baseMul = this._getTradingBaseMultiplier(npc, itemId);
        var currentMul = this.getTradingSellMultiplier(npc, itemId);
        return this._buildPriceIntel(itemId, baseMul, currentMul, "trading");
    },

    getBroadcastPriceIntel: function (npc, itemId, economyKind) {
        if (economyKind === "trading") {
            return this.getTradingPriceIntel(npc, itemId);
        }
        return this.getFavoritePriceIntel(npc, itemId);
    },

    /**
     * 谈判专家点价文案。
     * options.tierChanged === true：收购价/卖价 4.5→6.3 (+40%)
     * 否则（同档连播/首播）：只写当前价 收购价/卖价 6.3
     */
    formatPriceShiftText: function (intel, economyKind, options) {
        if (!intel) {
            return "";
        }
        options = options || {};
        var label = (economyKind || intel.kind) === "trading" ? "卖价" : "收购价";
        var from = Number(intel.baseValue);
        var to = Number(intel.currentValue);
        if (!isFinite(to)) {
            return "";
        }
        var toStr = to.toFixed(1);
        // 同档连播/首播：只展示当前价
        if (!options.tierChanged) {
            return label + " " + toStr;
        }
        if (!isFinite(from)) {
            return label + " " + toStr;
        }
        var fromStr = from.toFixed(1);
        var d = Number(intel.deltaPercent) || 0;
        if (d === 0) {
            return label + " " + toStr;
        }
        var sign = d > 0 ? "+" : "";
        return label + " " + fromStr + "→" + toStr + " (" + sign + d + "%)";
    },

    runDailyTick: function (npc, daysElapsed) {
        if (!npc || !npc.config || !npc.storage) {
            return;
        }
        daysElapsed = Math.max(1, Math.min(this.DAYS_ELAPSED_CLAMP, Number(daysElapsed) || 1));

        var selfTraded = this.getSelfTradedItemIds(npc);

        // 日产（trading dailyProduce）
        var produceMap = this._getProduceMap(npc);
        Object.keys(produceMap).forEach(function (id) {
            var amt = produceMap[id] * daysElapsed;
            if (amt > 0) {
                npc.storage.increaseItem(parseInt(id, 10), amt);
            }
        });

        // 日消（独立 dailyConsume）
        var consumeMap = this._getConsumeMap(npc);
        Object.keys(consumeMap).forEach(function (id) {
            if (selfTraded[id]) {
                return;
            }
            var iid = parseInt(id, 10);
            var have = npc.storage.getNumByItemId(iid);
            var consumed = Math.min(have, consumeMap[id] * daysElapsed);
            if (consumed > 0) {
                npc.storage.decreaseItem(iid, consumed);
            }
        });

        // 日消（consumePool 合并池）
        this._consumePools(npc, daysElapsed, selfTraded);

        // 清理非保留物品：NPC storage 中不在保留集的物品每日清空。
        // 保留集 = trading ∪ favorite 数组里所有 itemId（NPC 的商品与收购品）
        //         ∪ economyOverride 所有 key（显式配了日产/日消/池/basePrice 的）
        //         ∪ itemEconomyConfig 默认日产/日消 > 0 的物品
        // 三者并集，确保"角色产出但不消耗"的 trading 物品（如陌生人产咖啡豆）不会被误清。
        var retainedIds = {};
        (npc.config.trading || []).forEach(function (tier) {
            (tier || []).forEach(function (entry) {
                if (entry && entry.itemId != null) {
                    retainedIds[String(entry.itemId)] = true;
                }
            });
        });
        (npc.config.favorite || []).forEach(function (tier) {
            (tier || []).forEach(function (entry) {
                if (entry && entry.itemId != null) {
                    retainedIds[String(entry.itemId)] = true;
                }
            });
        });
        if (npc.config.economyOverride) {
            Object.keys(npc.config.economyOverride).forEach(function (id) {
                retainedIds[id] = true;
            });
        }
        if (typeof itemEconomyConfig !== "undefined" && itemEconomyConfig) {
            Object.keys(itemEconomyConfig).forEach(function (id) {
                var entry = itemEconomyConfig[id];
                if ((Number(entry.defaultDailyConsume) || 0) > 0 || (Number(entry.defaultDailyProduce) || 0) > 0) {
                    retainedIds[id] = true;
                }
            });
        }
        Object.keys(npc.storage.map).forEach(function (id) {
            if (!retainedIds[id]) {
                var iid = parseInt(id, 10);
                var cur = npc.storage.getNumByItemId(iid);
                if (cur > 0) {
                    npc.storage.decreaseItem(iid, cur);
                }
            }
        });

        // 每日统一广播（早晨 tick 同时写入玩家主日志，便于 6 点可见）
        this._emitDailyBroadcast(npc, { writePlayerLog: true });
    },

    getCurrentGameDay: function () {
        try {
            if (typeof GameRuntime !== "undefined"
                && GameRuntime
                && typeof GameRuntime.getTimer === "function") {
                var timer = GameRuntime.getTimer();
                if (timer && typeof timer.formatTime === "function") {
                    var ft = timer.formatTime();
                    return Number(ft && ft.d) || 0;
                }
            }
        } catch (e) {
            cc.error("NpcEconomyService.getCurrentGameDay failed: " + e);
        }
        return 0;
    },

    /**
     * 游戏内时间展示串，与玩家主日志 / NPC 对话标题同口径：
     * getTimeDayStr() + " " + getTimeHourStr()，例如「第3天 06:00」。
     * 电台广播禁止用 Date.now() + 现实相对时间。
     */
    getCurrentGameTimeStr: function () {
        try {
            if (typeof GameRuntime !== "undefined"
                && GameRuntime
                && typeof GameRuntime.getTimer === "function") {
                var timer = GameRuntime.getTimer();
                if (timer
                    && typeof timer.getTimeDayStr === "function"
                    && typeof timer.getTimeHourStr === "function") {
                    return timer.getTimeDayStr() + " " + timer.getTimeHourStr();
                }
            }
        } catch (e) {
            cc.error("NpcEconomyService.getCurrentGameTimeStr failed: " + e);
        }
        // 中文回退，避免 timer 未就绪时露出英文 Day
        var dayNum = Number(this.getCurrentGameDay()) || 0;
        try {
            if (typeof stringUtil !== "undefined" && stringUtil
                && typeof stringUtil.getString === "function") {
                var dayStr = stringUtil.getString(1000, dayNum + 1);
                if (dayStr) {
                    return dayStr;
                }
            }
        } catch (e2) {}
        return "第" + (dayNum + 1) + "天";
    },

    /**
     * 把当前已解锁 NPC 的经济档位快照推到电台缓冲。
     * 用于：读档后缓冲为空、跨天 tick 丢失、打开电台时补齐“今日广播”。
     * 同一 gameDay 已有缓冲则跳过，避免反复打开电台刷屏。
     * 打开电台补发不写 player.log，避免重复刷主日志。
     */
    ensureTodayRadioFeed: function (npcManager) {
        if (typeof RadioFeedService === "undefined" || !RadioFeedService) {
            return false;
        }
        if (typeof RadioFeedService.bind === "function") {
            try { RadioFeedService.bind(); } catch (e) {}
        }
        this.syncUnlockedFlagsFromMap(npcManager);
        var gameDay = this.getCurrentGameDay();
        var feed = typeof RadioFeedService.getFeed === "function" ? (RadioFeedService.getFeed() || []) : [];
        for (var i = 0; i < feed.length; i++) {
            if (feed[i] && Number(feed[i].gameDay) === gameDay) {
                return false;
            }
        }
        this.publishCurrentBroadcasts(npcManager, { writePlayerLog: false });
        return true;
    },

    /**
     * map.npcMap 是“地图上可见 NPC”的权威；与 npc.isUnlocked 对齐。
     */
    syncUnlockedFlagsFromMap: function (npcManager) {
        var player = null;
        try {
            if (typeof GameRuntime !== "undefined" && GameRuntime
                && typeof GameRuntime.getPlayer === "function") {
                player = GameRuntime.getPlayer();
            }
        } catch (e) {
            player = null;
        }
        if (!player || !player.map || !player.map.npcMap || !npcManager || !npcManager.npcList) {
            return;
        }
        for (var npcId in player.map.npcMap) {
            if (!player.map.npcMap.hasOwnProperty(npcId)) {
                continue;
            }
            var npc = npcManager.getNPC
                ? npcManager.getNPC(npcId)
                : npcManager.npcList[npcId];
            if (npc) {
                npc.isUnlocked = true;
            }
        }
    },

    publishCurrentBroadcasts: function (npcManager, options) {
        if (!npcManager || !npcManager.npcList) {
            return;
        }
        options = options || {};
        this.syncUnlockedFlagsFromMap(npcManager);
        for (var npcId in npcManager.npcList) {
            if (!npcManager.npcList.hasOwnProperty(npcId)) {
                continue;
            }
            this._emitDailyBroadcast(npcManager.npcList[npcId], options);
        }
    },

    // ===== 内部辅助 =====

    _getReputationTier: function (npc) {
        if (typeof memoryUtil !== "undefined" && memoryUtil && typeof memoryUtil.decode === "function") {
            return memoryUtil.decode(npc.reputation) || 0;
        }
        return Number(npc.reputation) || 0;
    },

    _getStock: function (npc, itemId) {
        if (!npc || !npc.storage || typeof npc.storage.getNumByItemId !== "function") {
            return 0;
        }
        return Number(npc.storage.getNumByItemId(parseInt(itemId, 10))) || 0;
    },

    _findFavoriteEntry: function (npc, itemId) {
        if (!npc || !npc.config) {
            return null;
        }
        var rep = this._getReputationTier(npc);
        var tier = (npc.config.favorite || [])[rep] || [];
        for (var i = 0; i < tier.length; i++) {
            if (tier[i] && tier[i].itemId == itemId) {
                return tier[i];
            }
        }
        return null;
    },

    _findTradingEntry: function (npc, itemId) {
        if (!npc || !npc.config) {
            return null;
        }
        var rep = this._getReputationTier(npc);
        var trading = npc.config.trading || [];
        for (var t = rep; t >= 0; t--) {
            var tier = trading[t] || [];
            for (var i = 0; i < tier.length; i++) {
                if (tier[i] && tier[i].itemId == itemId) {
                    return tier[i];
                }
            }
        }
        return null;
    },

    _listFavoriteItemIds: function (npc) {
        var rep = this._getReputationTier(npc);
        var tier = (npc.config.favorite || [])[rep] || [];
        var seen = {};
        var result = [];
        tier.forEach(function (e) {
            if (e && e.itemId != null && !seen[e.itemId]) {
                seen[e.itemId] = true;
                result.push(e.itemId);
            }
        });
        return result;
    },

    _listTradingItemIds: function (npc) {
        var rep = this._getReputationTier(npc);
        var trading = npc.config.trading || [];
        var seen = {};
        var result = [];
        for (var t = 0; t <= rep; t++) {
            var tier = trading[t] || [];
            for (var i = 0; i < tier.length; i++) {
                var e = tier[i];
                if (e && e.itemId != null && !seen[e.itemId]) {
                    seen[e.itemId] = true;
                    result.push(e.itemId);
                }
            }
        }
        return result;
    },

    _getProduceMap: function (npc) {
        var rep = this._getReputationTier(npc);
        var trading = npc.config.trading || [];
        var map = {};
        for (var t = 0; t <= rep; t++) {
            var tier = trading[t] || [];
            for (var i = 0; i < tier.length; i++) {
                var e = tier[i];
                if (!e || e.itemId == null) {
                    continue;
                }
                var amt = this._getEffectiveEntry(npc, e.itemId, "trading").dailyProduce;
                if (amt > 0) {
                    map[e.itemId] = Math.max(map[e.itemId] || 0, amt);
                }
            }
        }
        return map;
    },

    _getConsumeMap: function (npc) {
        var rep = this._getReputationTier(npc);
        var fav = (npc.config.favorite || [])[rep] || [];
        var map = {};
        var self = this;
        fav.forEach(function (e) {
            if (!e || e.itemId == null) {
                return;
            }
            var eff = self._getEffectiveEntry(npc, e.itemId, "favorite");
            if (eff.consumePool) {
                return;
            }
            if (eff.dailyConsume > 0) {
                map[e.itemId] = eff.dailyConsume;
            }
        });
        return map;
    },

    /**
     * 合并池消耗：从 economyOverride 读池配置。
     * poolId → { dailyConsume, members[] }，按库存多的优先扣。
     */
    _consumePools: function (npc, daysElapsed, selfTraded) {
        var override = (npc && npc.config && npc.config.economyOverride) ? npc.config.economyOverride : {};
        var pools = {};
        var self = this;
        var keys = Object.keys(override);
        for (var i = 0; i < keys.length; i++) {
            var itemId = keys[i];
            var eff = self._getEffectiveEntry(npc, itemId, "favorite");
            if (!eff.consumePool) {
                continue;
            }
            var pid = eff.consumePool;
            if (!pools[pid]) {
                pools[pid] = { dailyConsume: 0, members: [] };
            }
            pools[pid].dailyConsume = Math.max(pools[pid].dailyConsume, eff.dailyConsume || 0);
            pools[pid].members.push(parseInt(itemId, 10));
        }
        keys = Object.keys(pools);
        for (var p = 0; p < keys.length; p++) {
            var pid = keys[p];
            var pool = pools[pid];
            var totalConsume = pool.dailyConsume * daysElapsed;
            if (totalConsume <= 0) {
                continue;
            }
            var members = pool.members.map(function (iid) {
                return { id: iid, stock: self._getStock(npc, iid) };
            }).filter(function (m) {
                return m.stock > 0 && !selfTraded[m.id];
            }).sort(function (a, b) {
                return b.stock - a.stock;
            });
            var remaining = totalConsume;
            for (var j = 0; j < members.length && remaining > 0; j++) {
                var take = Math.min(members[j].stock, remaining);
                npc.storage.decreaseItem(members[j].id, take);
                remaining -= take;
            }
        }
    },

    /**
     * 取池总库存和总 targetStock（用于价格曲线）。
     * targetStock = 池日消最大值 * TARGET_STOCK_CONSUME_RATIO。
     * 池配置从 economyOverride 读。
     */
    _getPoolState: function (npc, poolId, kind) {
        var override = (npc && npc.config && npc.config.economyOverride) ? npc.config.economyOverride : {};
        var totalStock = 0;
        var totalConsume = 0;
        var self = this;
        var keys = Object.keys(override);
        for (var i = 0; i < keys.length; i++) {
            var itemId = keys[i];
            var eff = self._getEffectiveEntry(npc, itemId, "favorite");
            if (eff.consumePool !== poolId) {
                continue;
            }
            totalConsume = Math.max(totalConsume, eff.dailyConsume || 0);
        }
        for (var j = 0; j < keys.length; j++) {
            var itemId2 = keys[j];
            var eff2 = self._getEffectiveEntry(npc, itemId2, "favorite");
            if (eff2.consumePool !== poolId) {
                continue;
            }
            totalStock += self._getStock(npc, itemId2);
        }
        return {
            currentStock: totalStock,
            targetStock: totalConsume * this.TARGET_STOCK_CONSUME_RATIO
        };
    },

    /**
     * 上次广播档位表（按 NPC 存档）。仅换挡时附带点价 基准→当前。
     */
    _ensureLastBroadcastTiers: function (npc) {
        if (!npc) {
            return { favorite: {}, trading: {} };
        }
        if (!npc.economyLastTiers || typeof npc.economyLastTiers !== "object") {
            npc.economyLastTiers = { favorite: {}, trading: {} };
        }
        if (!npc.economyLastTiers.favorite || typeof npc.economyLastTiers.favorite !== "object") {
            npc.economyLastTiers.favorite = {};
        }
        if (!npc.economyLastTiers.trading || typeof npc.economyLastTiers.trading !== "object") {
            npc.economyLastTiers.trading = {};
        }
        return npc.economyLastTiers;
    },

    _getLastBroadcastTier: function (npc, economyKind, itemId) {
        var store = this._ensureLastBroadcastTiers(npc);
        var bucket = economyKind === "trading" ? store.trading : store.favorite;
        var key = String(itemId);
        return bucket[key] || null;
    },

    _markBroadcastTiers: function (npc, favEntries, trdEntries) {
        var store = this._ensureLastBroadcastTiers(npc);
        (favEntries || []).forEach(function (entry) {
            if (entry && entry.itemId != null && entry.tier) {
                store.favorite[String(entry.itemId)] = entry.tier;
            }
        });
        (trdEntries || []).forEach(function (entry) {
            if (entry && entry.itemId != null && entry.tier) {
                store.trading[String(entry.itemId)] = entry.tier;
            }
        });
    },

    _annotateTierChange: function (npc, entry, economyKind) {
        if (!entry || entry.itemId == null || !entry.tier) {
            return entry;
        }
        var previousTier = this._getLastBroadcastTier(npc, economyKind, entry.itemId);
        entry.previousTier = previousTier || null;
        // 仅当有昨日档位且与今日不同时算换挡；首日/无历史不算换挡
        entry.tierChanged = !!(previousTier && previousTier !== entry.tier);
        return entry;
    },

    /**
     * 每日统一广播：把当日所有走五档物品的档位摘要 emit 给电台。
     * balanced 档也广播。自产自销 favorite 不广播。无日产 trading 不广播。
     * consumePool 合并为 1 条（代表 itemId = 池内首个 favorite 成员），避免金/杰夫刷屏。
     */
    _emitDailyBroadcast: function (npc, options) {
        if (!npc || !npc.isUnlocked) {
            return;
        }
        options = options || {};
        var emit = (typeof utils !== "undefined" && utils && utils.emitter) ? utils.emitter : null;
        if (!emit || typeof emit.emit !== "function") {
            return;
        }
        // emitter 被 GameRuntime.setEmitter 替换后，RadioFeedService 可能还挂在旧 emitter 上
        if (typeof RadioFeedService !== "undefined" && RadioFeedService
            && typeof RadioFeedService.bind === "function") {
            try { RadioFeedService.bind(); } catch (e) {}
        }
        var gameDay = this.getCurrentGameDay();
        var selfTraded = this.getSelfTradedItemIds(npc);
        var self = this;
        var seenPools = {};

        // favorite 方向
        var favIds = this._listFavoriteItemIds(npc);
        var favEntries = [];
        favIds.forEach(function (id) {
            if (selfTraded[id]) {
                return;
            }
            var eff = self._getEffectiveEntry(npc, id, "favorite");
            var current, target, itemId;
            if (eff.consumePool) {
                if (seenPools[eff.consumePool]) {
                    return;
                }
                seenPools[eff.consumePool] = true;
                var ps = self._getPoolState(npc, eff.consumePool, "favorite");
                current = ps.currentStock;
                target = ps.targetStock;
                itemId = self._getPoolRepresentativeItemId(npc, eff.consumePool, id);
            } else if (eff.dailyConsume > 0) {
                current = self._getStock(npc, id);
                target = eff.targetStock || (eff.dailyConsume * self.TARGET_STOCK_CONSUME_RATIO);
                itemId = parseInt(id, 10);
            } else {
                return;
            }
            var tier = self._getTierLabel(current, target);
            favEntries.push(self._annotateTierChange(npc, {
                itemId: itemId,
                tier: tier,
                currentStock: current,
                targetStock: target,
                consumePool: eff.consumePool || null
            }, "favorite"));
        });

        // trading 方向
        var trdIds = this._listTradingItemIds(npc);
        var trdEntries = [];
        trdIds.forEach(function (id) {
            var eff = self._getEffectiveEntry(npc, id, "trading");
            if (eff.dailyProduce <= 0) {
                return;
            }
            var current = self._getStock(npc, id);
            var target = eff.targetStock || (eff.dailyProduce * self.TARGET_STOCK_PRODUCE_RATIO);
            var tier = self._getTierLabel(current, target);
            trdEntries.push(self._annotateTierChange(npc, {
                itemId: parseInt(id, 10),
                tier: tier,
                currentStock: current,
                targetStock: target
            }, "trading"));
        });

        if (favEntries.length === 0 && trdEntries.length === 0) {
            return;
        }
        var payload = {
            npcId: npc.id,
            gameDay: gameDay,
            // 游戏内时刻，供电台标题直接展示（禁止 Date.now 现实相对时间）
            time: this.getCurrentGameTimeStr(),
            favorite: favEntries,
            trading: trdEntries
        };
        emit.emit(self.EVENT_DAILY_BROADCAST, payload);
        if (options.writePlayerLog) {
            self._writePlayerLogForBroadcast(payload);
        }
        // 记住今日档位，供次日判断是否换挡
        self._markBroadcastTiers(npc, favEntries, trdEntries);
    },

    _resolveBroadcastText: function (npcId, itemId, tier, economyKind) {
        var npcName = "NPC " + npcId;
        var itemName = "#" + itemId;
        try {
            if (typeof stringUtil !== "undefined" && stringUtil) {
                var npcStr = stringUtil.getString("npc_" + npcId);
                if (npcStr && npcStr.name) {
                    npcName = npcStr.name;
                }
                var itemStr = stringUtil.getString(parseInt(itemId, 10));
                if (itemStr && itemStr.title) {
                    itemName = itemStr.title;
                }
            }
        } catch (e) {}

        try {
            if (typeof npcBroadcastConfig !== "undefined" && npcBroadcastConfig) {
                var npcTexts = npcBroadcastConfig[npcId] || npcBroadcastConfig[String(npcId)];
                if (npcTexts) {
                    var dir = economyKind === "trading" ? npcTexts.trading : npcTexts.favorite;
                    if (dir) {
                        var itemTexts = dir[String(itemId)] || dir[itemId];
                        if (itemTexts && itemTexts[tier]) {
                            // 自定义文案多为第一人称，主日志也要带说话人
                            return npcName + "：" + itemTexts[tier];
                        }
                    }
                }
            }
        } catch (e2) {}

        // 正文统一第一人称；说话人只作前缀（电台标题/主日志「名字：」）
        var tierToDelta = {
            very_low: 40, low: 20, balanced: 0, high: -20, very_high: -40
        };
        var deltaPercent = tierToDelta.hasOwnProperty(tier) ? tierToDelta[tier] : 0;
        var body = "";
        if (tier === "balanced") {
            body = economyKind === "trading"
                ? ("我的 " + itemName + " 库存稳定，卖价未变")
                : ("我对 " + itemName + " 的收购价保持稳定");
        } else {
            var isUp = deltaPercent > 0;
            var stringId = economyKind === "trading"
                ? (isUp ? 1379 : 1380)
                : (isUp ? 1377 : 1378);
            try {
                if (typeof stringUtil !== "undefined" && stringUtil) {
                    var formatted = stringUtil.getString(stringId, itemName, Math.abs(deltaPercent));
                    if (typeof formatted === "string" && formatted) {
                        body = formatted;
                    }
                }
            } catch (e3) {}
            if (!body) {
                body = "我的 " + itemName + " " + (isUp ? "+" : "-") + Math.abs(deltaPercent) + "%";
            }
        }
        return npcName + "：" + body;
    },

    _writePlayerLogForBroadcast: function (payload) {
        var player = null;
        try {
            if (typeof GameRuntime !== "undefined" && GameRuntime
                && typeof GameRuntime.getPlayer === "function") {
                player = GameRuntime.getPlayer();
            }
        } catch (e) {
            player = null;
        }
        if (!player || !player.log || typeof player.log.addMsg !== "function") {
            return;
        }
        var self = this;
        var npc = null;
        if (player.npcManager && typeof player.npcManager.getNPC === "function") {
            npc = player.npcManager.getNPC(payload.npcId);
        }
        var writeList = function (list, kind) {
            if (!list || !list.length) {
                return;
            }
            list.forEach(function (item) {
                if (!item || item.itemId == null || !item.tier) {
                    return;
                }
                try {
                    var text = self._resolveBroadcastText(payload.npcId, item.itemId, item.tier, kind);
                    // 谈判专家：有天赋才加点价；换挡写 基准→当前，同档只写当前价
                    if (self.canShowNegotiationPriceIntel() && npc) {
                        var intel = self.getBroadcastPriceIntel(npc, item.itemId, kind);
                        var shift = self.formatPriceShiftText(intel, kind, {
                            tierChanged: !!item.tierChanged
                        });
                        if (shift) {
                            text = text + "（" + shift + "）";
                        }
                    }
                    player.log.addMsg(text);
                } catch (e2) {
                    if (typeof cc !== "undefined" && cc && typeof cc.error === "function") {
                        cc.error("NpcEconomyService player log failed: " + e2);
                    }
                }
            });
        };
        writeList(payload.favorite, "favorite");
        writeList(payload.trading, "trading");
    },

    _getPoolRepresentativeItemId: function (npc, poolId, fallbackId) {
        var override = (npc && npc.config && npc.config.economyOverride) ? npc.config.economyOverride : {};
        var keys = Object.keys(override);
        for (var i = 0; i < keys.length; i++) {
            var itemId = keys[i];
            var eff = this._getEffectiveEntry(npc, itemId, "favorite");
            if (eff.consumePool === poolId) {
                return parseInt(itemId, 10);
            }
        }
        return parseInt(fallbackId, 10);
    },

    _getTierLabel: function (currentStock, targetStock) {
        if (targetStock <= 0) {
            return "balanced";
        }
        var r = currentStock / targetStock;
        if (r < this.RATIO_VERY_LOW) return "very_low";
        if (r < this.RATIO_LOW) return "low";
        if (r < this.RATIO_BALANCED) return "balanced";
        if (r < this.RATIO_HIGH) return "high";
        return "very_high";
    }
};
