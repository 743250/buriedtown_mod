/**
 * NpcEconomyService —— NPC 动态库存与价格服务
 *
 * 设计稿：docs/npc-economy-plan.md §3 / §5 / §16 / §17
 *
 * 本服务集中三件事：
 *   1. 库存↔价格曲线（getFavoritePriceMultiplier / getTradingSellMultiplier）
 *   2. 日产/日消结算（runDailyTick）
 *   3. 价格变动事件派发（utils.emitter "npcEconomy:priceShift"）
 *
 * 装配点：jsList.js，**排在 npc.js 之前**
 *
 * 兼容/兜底原则：
 *   - 拿不到 dailyConsume / dailyProduce → 退回 num 字段（旧行为等价）
 *   - 拿不到 targetStock → 用比例常量推算
 *   - 自产自销物品（trading ∩ favorite）只作收购意向，不进入日消
 *   - npc.isUnlocked === false → 不广播（避免剧透）
 */
var NpcEconomyService = {
    // —— 调参常量（集中在文件顶部，方便平衡） ——
    PRICE_SHIFT_BROADCAST_THRESHOLD: 0.15,   // 倍率变化绝对值 ≥15% 才广播
    TARGET_STOCK_PRODUCE_RATIO: 3,           // trading 默认目标库存 = num × 3
    TARGET_STOCK_CONSUME_RATIO: 7,           // favorite 默认目标库存 = consume × 7
    DAYS_ELAPSED_CLAMP: 30,                  // 跨天补算上限

    FAV_MUL_LOW: 0.5,
    FAV_MUL_HIGH: 1.8,
    TRD_MUL_LOW: 0.7,
    TRD_MUL_HIGH: 1.6,

    EVENT_PRICE_SHIFT: "npcEconomy:priceShift",

    // ===== 公共 API =====

    /**
     * 取 NPC 自产自销物品集合：trading.itemId ∩ favorite.itemId。
     */
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

    /**
     * 取 favorite 物品当前的实时收购倍率。
     * 返回 null 表示走调用方旧行为兜底（兼容老配置/合成物品）。
     */
    getFavoritePriceMultiplier: function (npc, itemId) {
        var entry = this._findFavoriteEntry(npc, itemId);
        if (!entry) {
            return null;
        }
        var basePrice = Number(entry.price) || 1;
        var dailyConsume = Number(entry.dailyConsume) || 0;
        if (dailyConsume <= 0) {
            // 没消耗 → 静态价格（兼容老配置 / 自产自销物品）
            return basePrice;
        }
        var targetStock = Number(entry.targetStock) || (dailyConsume * this.TARGET_STOCK_CONSUME_RATIO);
        var current = this._getStock(npc, itemId);
        var ratio = targetStock > 0 ? current / targetStock : 1;
        var k = this._clamp(2 - ratio, this.FAV_MUL_LOW, this.FAV_MUL_HIGH);
        return basePrice * k;
    },

    /**
     * 取 trading 物品当前的实时卖价倍率（NPC 卖给玩家）。
     * 返回 null 表示该物品不在 trading 列表里（调用方按 1.0 兜底）。
     */
    getTradingSellMultiplier: function (npc, itemId) {
        var entry = this._findTradingEntry(npc, itemId);
        if (!entry) {
            return null;
        }
        var baseMul = Number(entry.basePriceMultiplier) || 1;
        var num = Number(entry.num) || 0;
        if (num <= 0) {
            return baseMul;
        }
        var targetStock = Number(entry.targetStock) || (num * this.TARGET_STOCK_PRODUCE_RATIO);
        var current = this._getStock(npc, itemId);
        var ratio = targetStock > 0 ? current / targetStock : 1;
        var k = this._clamp(1.5 - 0.5 * ratio, this.TRD_MUL_LOW, this.TRD_MUL_HIGH);
        return baseMul * k;
    },

    /**
     * 每日结算：日产/日消 + 价格变动广播。
     * 由 NPC.updateTradingItem 调用，每个游戏日"白天"触发一次。
     *
     * @param {NPC} npc
     * @param {number} daysElapsed 已过去天数（跨天补算用，clamp 到 DAYS_ELAPSED_CLAMP）
     */
    runDailyTick: function (npc, daysElapsed) {
        if (!npc || !npc.config || !npc.storage) {
            return;
        }
        daysElapsed = Math.max(1, Math.min(this.DAYS_ELAPSED_CLAMP, Number(daysElapsed) || 1));

        var favIds = this._listFavoriteItemIds(npc);
        var trdIds = this._listTradingItemIds(npc);
        var selfTraded = this.getSelfTradedItemIds(npc);

        // 结算前快照（用于对比）
        var beforeFav = {};
        var self = this;
        favIds.forEach(function (id) {
            beforeFav[id] = self.getFavoritePriceMultiplier(npc, id);
        });
        var beforeTrd = {};
        trdIds.forEach(function (id) {
            beforeTrd[id] = self.getTradingSellMultiplier(npc, id);
        });

        // 日产
        var produceMap = this._getProduceMap(npc);
        Object.keys(produceMap).forEach(function (id) {
            var amt = produceMap[id] * daysElapsed;
            if (amt > 0) {
                npc.storage.increaseItem(parseInt(id, 10), amt);
            }
        });

        // 日消（自产自销跳过）
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

        // 结算后对比 + 广播
        this._broadcastShifts(npc, favIds, trdIds, selfTraded, beforeFav, beforeTrd);
    },

    /**
     * 取当前游戏日（来自 GameRuntime.getTimer().formatTime().d）。
     * 失败时返回 0。
     */
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

    _clamp: function (v, lo, hi) {
        if (typeof cc !== "undefined" && cc && typeof cc.clampf === "function") {
            return cc.clampf(v, lo, hi);
        }
        return Math.max(lo, Math.min(hi, v));
    },

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
                var amt = e.dailyProduce != null ? Number(e.dailyProduce) : Number(e.num) || 0;
                if (amt > 0) {
                    // 高声望 NPC 的同物品多 tier 配置：取最大值，不叠加，避免日产爆膨
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
        fav.forEach(function (e) {
            if (!e || e.itemId == null) {
                return;
            }
            var dc = Number(e.dailyConsume) || 0;
            if (dc > 0) {
                map[e.itemId] = dc;
            }
        });
        return map;
    },

    _broadcastShifts: function (npc, favIds, trdIds, selfTraded, beforeFav, beforeTrd) {
        if (!npc.isUnlocked) {
            // 未解锁不广播（避免剧透）
            return;
        }
        var emit = (typeof utils !== "undefined" && utils && utils.emitter) ? utils.emitter : null;
        if (!emit || typeof emit.emit !== "function") {
            return;
        }

        var threshold = this.PRICE_SHIFT_BROADCAST_THRESHOLD;
        var gameDay = this.getCurrentGameDay();
        var self = this;
        var tryEmit = function (kind, itemId, oldM, newM) {
            if (typeof oldM !== "number" || !isFinite(oldM) || oldM <= 0) return;
            if (typeof newM !== "number" || !isFinite(newM) || newM <= 0) return;
            var delta = (newM - oldM) / oldM;
            if (Math.abs(delta) < threshold) return;
            emit.emit(self.EVENT_PRICE_SHIFT, {
                npcId: npc.id,
                itemId: parseInt(itemId, 10),
                kind: kind,           // "favorite" | "trading"
                oldMul: oldM,
                newMul: newM,
                dir: delta > 0 ? "up" : "down",
                deltaPercent: Math.round(Math.abs(delta) * 100),
                gameDay: gameDay,
                time: Date.now()
            });
        };

        favIds.forEach(function (id) {
            if (selfTraded[id]) {
                return;     // 自产自销不广播 favorite 方向
            }
            tryEmit("favorite", id, beforeFav[id], self.getFavoritePriceMultiplier(npc, id));
        });
        trdIds.forEach(function (id) {
            tryEmit("trading", id, beforeTrd[id], self.getTradingSellMultiplier(npc, id));
        });
    }
};
