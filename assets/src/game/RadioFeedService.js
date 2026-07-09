/**
 * RadioFeedService —— 电台本地系统消息缓冲与派发
 *
 * 职责：
 *   1. 监听 utils.emitter "npcEconomy:dailyBroadcast" 事件
 *   2. 把当日各物品档位（含 balanced/不变）合成为电台条目（kind="npc_economy"）放进环形缓冲
 *   3. RadioNode 打开时一次性吃掉缓冲并继续监听实时事件
 *
 * 协议：
 *   入参 payload（NpcEconomyService._emitDailyBroadcast 发出）：
 *     {npcId, gameDay, time, favorite:[{itemId,tier,...}], trading:[{itemId,tier,...}]}
 *   出参 entry（buffer 里、给 LogView 渲染）：
 *     {kind:"npc_economy", _dedupKey, npcId, itemId, tier, economyKind, gameDay, time}
 *
 * 不做：
 *   - 不发服务器
 *   - 不持久化（buffer 留在内存；重启后清空）
 *   - 不广播未解锁 NPC（已由 NpcEconomyService 在 emit 前过滤）
 *
 * 装配点：jsList.js，排在 NpcEconomyService.js 之后
 */
var RadioFeedService = {
    MAX_BUFFER: 30,

    _buffer: [],
    _bound: false,
    _boundEmitter: null,
    _boundListener: null,

    bind: function () {
        if (typeof utils === "undefined" || !utils || !utils.emitter) {
            return;
        }
        if (typeof NpcEconomyService === "undefined" || !NpcEconomyService) {
            return;
        }
        // emitter 被 GameRuntime.setEmitter 替换后，旧监听失效；检测到替换就解绑旧的、绑新的
        if (this._bound && this._boundEmitter === utils.emitter) {
            return;
        }
        // 解绑旧 emitter 上的 listener
        if (this._boundEmitter && this._boundListener
            && typeof this._boundEmitter.off === "function") {
            try { this._boundEmitter.off(NpcEconomyService.EVENT_DAILY_BROADCAST, this._boundListener); } catch (e) {}
        }
        var self = this;
        this._boundListener = function (payload) {
            self.onDailyBroadcast(payload);
        };
        utils.emitter.on(NpcEconomyService.EVENT_DAILY_BROADCAST, this._boundListener);
        this._boundEmitter = utils.emitter;
        this._bound = true;
    },

    /**
     * 拆条：把 batch payload 拆成单条 entry 存进 buffer。
     * 同一次广播内同一 NPC 同一物品同一 kind 只保留最新一条。
     */
    onDailyBroadcast: function (payload) {
        if (!payload || payload.npcId == null) {
            return;
        }
        var npcId = payload.npcId;
        var gameDay = payload.gameDay;
        var time = payload.time || Date.now();
        var self = this;

        var collect = function (list, kind) {
            if (!list || !list.length) {
                return;
            }
            list.forEach(function (item) {
                if (!item || item.itemId == null || !item.tier) {
                    return;
                }
                var key = time + "|" + npcId + "|" + item.itemId + "|" + kind;
                // 去重：同 key 旧条删掉
                for (var i = self._buffer.length - 1; i >= 0; i--) {
                    if (self._buffer[i]._dedupKey === key) {
                        self._buffer.splice(i, 1);
                    }
                }
                self._buffer.push({
                    kind: "npc_economy",
                    _dedupKey: key,
                    npcId: npcId,
                    itemId: parseInt(item.itemId, 10),
                    tier: item.tier,
                    economyKind: kind,
                    gameDay: gameDay,
                    time: time
                });
            });
        };

        collect(payload.favorite, "favorite");
        collect(payload.trading, "trading");

        while (this._buffer.length > this.MAX_BUFFER) {
            this._buffer.shift();
        }
    },

    getFeed: function () {
        this.bind();
        return this._buffer.slice();
    },

    clear: function () {
        this._buffer = [];
    }
};

RadioFeedService.bind();
