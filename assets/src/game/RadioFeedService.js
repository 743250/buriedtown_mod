/**
 * RadioFeedService —— 电台本地系统消息缓冲与派发
 *
 * 设计稿：docs/npc-economy-plan.md §17
 *
 * 职责：
 *   1. 监听 utils.emitter "npcEconomy:priceShift" 事件
 *   2. 把价格变动事件合成为电台条目（kind="npc_economy"）放进环形缓冲
 *   3. RadioNode 打开时一次性吃掉缓冲并继续监听实时事件
 *
 * 不做：
 *   - 不发服务器（绝不调 networkUtil.requestData("sendMsg")）
 *   - 不持久化（buffer 留在内存；重启后清空，可接受）
 *   - 不广播未解锁 NPC（已由 NpcEconomyService 在 emit 前过滤）
 *
 * 装配点：jsList.js，**排在 NpcEconomyService.js 之后、npc.js 之后均可**
 *         （初始化只依赖 utils.emitter）
 */
var RadioFeedService = {
    MAX_BUFFER: 30,

    _buffer: [],
    _bound: false,

    /**
     * 绑定事件源（幂等）。模块加载时自动调用一次。
     */
    bind: function () {
        if (this._bound) {
            return;
        }
        if (typeof utils === "undefined" || !utils || !utils.emitter) {
            return;     // 暂时拿不到 emitter，等下次 getFeed/onPriceShift 再尝试
        }
        if (typeof NpcEconomyService === "undefined" || !NpcEconomyService) {
            return;
        }
        var self = this;
        utils.emitter.on(NpcEconomyService.EVENT_PRICE_SHIFT, function (payload) {
            self.onPriceShift(payload);
        });
        this._bound = true;
    },

    onPriceShift: function (payload) {
        if (!payload || payload.npcId == null || payload.itemId == null) {
            return;
        }
        // 同一天同一 NPC 同一物品同一方向只保留最新一条
        var key = payload.gameDay + "|" + payload.npcId + "|" + payload.itemId + "|" + payload.kind;
        for (var i = this._buffer.length - 1; i >= 0; i--) {
            if (this._buffer[i]._dedupKey === key) {
                this._buffer.splice(i, 1);
            }
        }
        var entry = {
            kind: "npc_economy",
            _dedupKey: key,
            npcId: payload.npcId,
            itemId: payload.itemId,
            economyKind: payload.kind,                  // "favorite" | "trading"
            dir: payload.dir,                           // "up" | "down"
            deltaPercent: payload.deltaPercent || 0,
            oldMul: payload.oldMul,
            newMul: payload.newMul,
            gameDay: payload.gameDay,
            time: payload.time || Date.now()
        };
        this._buffer.push(entry);
        if (this._buffer.length > this.MAX_BUFFER) {
            this._buffer.splice(0, this._buffer.length - this.MAX_BUFFER);
        }
    },

    /**
     * 取所有缓冲条目（按时间顺序）。RadioNode 打开时一次性消费。
     */
    getFeed: function () {
        this.bind();    // 懒绑定兜底
        return this._buffer.slice();
    },

    /**
     * 清空缓冲。开发期/测试用。
     */
    clear: function () {
        this._buffer = [];
    }
};

// 模块加载即尝试绑定（utils.emitter 在 utils.js 已构造）
RadioFeedService.bind();
