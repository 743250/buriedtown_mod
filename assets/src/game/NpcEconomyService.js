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
 *   - dailyConsume / dailyProduce / targetStock 缺失 → 退回默认 0（不自产不自消）
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
            ? (itemEconomyConfig[itemId] || {}) : {};
        var override = (npc && npc.config && npc.config.economyOverride)
            ? (npc.config.economyOverride[String(itemId)] || npc.config.economyOverride[itemId] || {}) : {};
        return {
            dailyConsume: override.dailyConsume != null ? Number(override.dailyConsume) : (Number(base.defaultDailyConsume) || 0),
            targetStock: override.targetStock != null ? Number(override.targetStock) : (Number(base.defaultTargetStock) || 0),
            dailyProduce: override.dailyProduce != null ? Number(override.dailyProduce) : (Number(base.defaultDailyProduce) || 0),
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
        var effective = this._getEffectiveEntry(npc, itemId, "trading");
        var baseMul;
        if (npc && npc.config && npc.config.economyOverride) {
            var ovr = npc.config.economyOverride[String(itemId)] || npc.config.economyOverride[itemId] || {};
            if (ovr.basePriceMultiplier != null) {
                baseMul = Number(ovr.basePriceMultiplier);
            }
        }
        if (baseMul == null) {
            var base = (typeof itemEconomyConfig !== "undefined" && itemEconomyConfig)
                ? (itemEconomyConfig[itemId] || {}) : {};
            baseMul = base.defaultBasePriceMultiplier != null ? Number(base.defaultBasePriceMultiplier) : 1.0;
        }
        if (effective.dailyProduce <= 0) {
            return baseMul;
        }
        var targetStock = effective.targetStock || (effective.dailyProduce * this.TARGET_STOCK_PRODUCE_RATIO);
        var current = this._getStock(npc, itemId);
        var k = this._getTierMultiplier(current, targetStock);
        return baseMul * k;
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

        // 每日统一广播
        this._emitDailyBroadcast(npc);
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
     * 每日统一广播：把当日所有走五档物品的档位摘要 emit 给电台。
     * balanced 档也广播，用于电台说明价格/库存不变。自产自销物品 favorite 方向不广播。无日产 trading 不广播。
     */
    _emitDailyBroadcast: function (npc) {
        if (!npc.isUnlocked) {
            return;
        }
        var emit = (typeof utils !== "undefined" && utils && utils.emitter) ? utils.emitter : null;
        if (!emit || typeof emit.emit !== "function") {
            return;
        }
        // emitter 被 GameRuntime.setEmitter 替换后，RadioFeedService 可能还挂在旧 emitter 上；
        // 广播前确保它已绑到当前 emitter，否则电台缓冲收不到消息
        if (typeof RadioFeedService !== "undefined" && RadioFeedService
            && typeof RadioFeedService.bind === "function") {
            try { RadioFeedService.bind(); } catch (e) {}
        }
        var gameDay = this.getCurrentGameDay();
        var selfTraded = this.getSelfTradedItemIds(npc);
        var self = this;

        // favorite 方向
        var favIds = this._listFavoriteItemIds(npc);
        var favEntries = [];
        favIds.forEach(function (id) {
            if (selfTraded[id]) {
                return;
            }
            var eff = self._getEffectiveEntry(npc, id, "favorite");
            var current, target;
            if (eff.consumePool) {
                var ps = self._getPoolState(npc, eff.consumePool, "favorite");
                current = ps.currentStock;
                target = ps.targetStock;
            } else if (eff.dailyConsume > 0) {
                current = self._getStock(npc, id);
                target = eff.targetStock || (eff.dailyConsume * self.TARGET_STOCK_CONSUME_RATIO);
            } else {
                return;
            }
            var tier = self._getTierLabel(current, target);
            favEntries.push({
                itemId: parseInt(id, 10),
                tier: tier,
                currentStock: current,
                targetStock: target
            });
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
            trdEntries.push({
                itemId: parseInt(id, 10),
                tier: tier,
                currentStock: current,
                targetStock: target
            });
        });

        if (favEntries.length === 0 && trdEntries.length === 0) {
            return;
        }
        emit.emit(self.EVENT_DAILY_BROADCAST, {
            npcId: npc.id,
            gameDay: gameDay,
            time: Date.now(),
            favorite: favEntries,
            trading: trdEntries
        });
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
