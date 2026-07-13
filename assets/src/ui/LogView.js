/**
 * Created by lancelot on 15/4/21.
 */
var LogView = cc.ScrollView.extend({
    ctor: function (size) {
        this.mycontainer = new cc.Layer();
        this._super(size, this.mycontainer);

        this.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        this.setBounceable(false);
        this.setClippingToBounds(true);

        this.setDelegate(this);

        this.data = [];
        this.updateContentSize();
        return true;
    },

    addLog: function (msg) {
        var newItem = this.createOneItem(msg);
        newItem.setAnchorPoint(0, 0);
        newItem.setPosition(0, 0);
        this.mycontainer.addChild(newItem);

        this.data.forEach(function (oldItem) {
            oldItem.y += newItem.height;
        });

        this.data.push(newItem);
        this.updateContentSize();
        // 新消息在容器底部（y=0）；把视口钉在底部，避免内容增高后仍停在空白区
        this.setContentOffset(cc.p(0, 0));
    },
    updateContentSize: function () {
        var height = 0;
        this.data.forEach(function (oldItem) {
            height += oldItem.height;
        });
        height = Math.max(height, this.getViewSize().height);
        this.setContentSize(this.getContentSize().width, height);
    },

    createOneItem: function (msg) {
        var node = new cc.Node();

        var time = new cc.LabelTTF(msg.time, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(this.getViewSize().width - 20, 0));
        time.setAnchorPoint(0, 1);
        time.tag = 1;
        node.addChild(time);

        var msg = new cc.LabelTTF(msg.txt, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(this.getViewSize().width - 20, 0));
        msg.setAnchorPoint(0, 0);
        msg.tag = 2;
        node.addChild(msg);

        node.setContentSize(this.getViewSize().width, time.height + msg.height + 10);

        time.setPosition(0, node.height - 5);
        msg.setPosition(0, 5);

        return node;
    },


    scrollViewDidScroll: function (view) {
        //cc.e("onscroll " + JSON.stringify(view.getContentOffset()));
    },
    scrollViewDidZoom: function (view) {
        //cc.e("onzoom " + JSON.stringify(view.getContentOffset()));
    }
});

var MessageView = LogView.extend({
    ctor: function (size) {
        this._super(size);
    },
    createOneItem: function (log) {
        // 本地系统消息（NPC 经济变动）走纯文字渲染分支
        if (log && log.kind === "npc_economy") {
            try {
                return this._createNpcEconomyItem(log);
            } catch (e) {
                cc.error("MessageView._createNpcEconomyItem failed: " + e);
                // 回退到普通渲染，避免一条坏消息让整个电台 UI 崩掉
                var node = new cc.Node();
                var fallbackMsg = new cc.LabelTTF("[" + (log.npcId || "?") + " item " + (log.itemId || "?") + " " + (log.tier || "?") + "]",
                    uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(this.getViewSize().width, 0));
                fallbackMsg.setAnchorPoint(0, 0);
                node.addChild(fallbackMsg);
                node.setContentSize(this.getViewSize().width, fallbackMsg.height + 10);
                node.log = log;
                return node;
            }
        }
        var node = new cc.Node();

        var time = new cc.LabelTTF(utils.timeToStr(Number(log.time)), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(this.getViewSize().width, 0));
        time.setAnchorPoint(0, 1);
        time.tag = 1;
        node.addChild(time);

        var msg = new cc.LabelTTF(log.msg, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(this.getViewSize().width, 0));
        msg.setAnchorPoint(0, 0);
        msg.tag = 2;
        node.addChild(msg);
        if (log.uid == Record.getUUID()) {
            msg.setColor(UITheme.colors.TEXT_ERROR);
        }

        node.setContentSize(this.getViewSize().width, time.height + msg.height + 10);

        time.setPosition(0, node.height - 5);
        msg.setPosition(0, 5);

        node.log = log;

        return node;
    },
    _resolveNpcEconomySpeakerName: function (log) {
        if (!log) {
            return "未知";
        }
        if (log._npcName) {
            return log._npcName;
        }
        var npcName = "NPC " + log.npcId;
        try {
            if (typeof stringUtil !== "undefined" && stringUtil) {
                var npcStr = stringUtil.getString("npc_" + log.npcId);
                if (npcStr && npcStr.name) {
                    npcName = npcStr.name;
                }
            }
        } catch (e) {
            // keep fallback
        }
        log._npcName = npcName;
        return npcName;
    },
    _resolveNpcEconomyTimeStr: function (log) {
        // 广播存的是游戏内时间串（与玩家主日志一致），禁止 utils.timeToStr 现实相对时间
        if (log && typeof log.time === "string" && log.time) {
            return log.time;
        }
        try {
            if (typeof NpcEconomyService !== "undefined" && NpcEconomyService
                && typeof NpcEconomyService.getCurrentGameTimeStr === "function") {
                return NpcEconomyService.getCurrentGameTimeStr();
            }
        } catch (e) {}
        try {
            if (typeof GameRuntime !== "undefined" && GameRuntime
                && typeof GameRuntime.getTimer === "function") {
                var timer = GameRuntime.getTimer();
                if (timer
                    && typeof timer.getTimeDayStr === "function"
                    && typeof timer.getTimeHourStr === "function") {
                    return timer.getTimeDayStr() + " " + timer.getTimeHourStr();
                }
            }
        } catch (e2) {}
        if (log && log.gameDay != null) {
            var dayNum = Number(log.gameDay) || 0;
            try {
                if (typeof stringUtil !== "undefined" && stringUtil
                    && typeof stringUtil.getString === "function") {
                    var dayStr = stringUtil.getString(1000, dayNum + 1);
                    if (dayStr) {
                        return dayStr;
                    }
                }
            } catch (e3) {}
            return "第" + (dayNum + 1) + "天";
        }
        return "";
    },
    _formatNpcEconomyHeader: function (log) {
        var npcName = this._resolveNpcEconomySpeakerName(log);
        var timeStr = this._resolveNpcEconomyTimeStr(log);
        // 自定义广播多为第一人称，标题行必须标明说话人
        return npcName + " · " + timeStr;
    },
    _resolveNpcEconomyPriceIntelText: function (log) {
        if (!log) {
            return "";
        }
        // 谈判专家：有天赋才加点价；换挡 基准→当前，同档只写当前价
        if (typeof NpcEconomyService === "undefined" || !NpcEconomyService
            || typeof NpcEconomyService.canShowNegotiationPriceIntel !== "function"
            || !NpcEconomyService.canShowNegotiationPriceIntel()) {
            return "";
        }
        if (log._priceIntelText) {
            return log._priceIntelText;
        }
        try {
            var npc = null;
            if (typeof GameRuntime !== "undefined" && GameRuntime
                && typeof GameRuntime.getPlayer === "function") {
                var player = GameRuntime.getPlayer();
                if (player && player.npcManager && typeof player.npcManager.getNPC === "function") {
                    npc = player.npcManager.getNPC(log.npcId);
                }
            }
            if (!npc) {
                return "";
            }
            var intel = typeof NpcEconomyService.getBroadcastPriceIntel === "function"
                ? NpcEconomyService.getBroadcastPriceIntel(npc, log.itemId, log.economyKind)
                : null;
            if (!intel || typeof NpcEconomyService.formatPriceShiftText !== "function") {
                return "";
            }
            log._priceIntelText = NpcEconomyService.formatPriceShiftText(intel, log.economyKind, {
                tierChanged: !!log.tierChanged
            }) || "";
            return log._priceIntelText;
        } catch (e) {
            return "";
        }
    },
    _createNpcEconomyItem: function (log) {
        var node = new cc.Node();
        var width = this.getViewSize().width;

        // —— 文案合成 —— //
        var npcName = this._resolveNpcEconomySpeakerName(log);
        var itemName = "#" + log.itemId;
        try {
            if (typeof stringUtil !== "undefined" && stringUtil) {
                var itemStr = stringUtil.getString(parseInt(log.itemId, 10));
                if (itemStr && itemStr.title) {
                    itemName = itemStr.title;
                }
            }
        } catch (e) {
            cc.error("MessageView._createNpcEconomyItem name lookup failed: " + e);
        }

        // 优先查 npcBroadcastConfig[npcId][itemId][tier]，命中用 NPC 自己的文案
        var msgText = null;
        try {
            if (typeof npcBroadcastConfig !== "undefined" && npcBroadcastConfig) {
                var npcTexts = npcBroadcastConfig[log.npcId]
                    || npcBroadcastConfig[String(log.npcId)];
                if (npcTexts) {
                    var dir = (log.economyKind === "trading") ? npcTexts.trading : npcTexts.favorite;
                    if (dir) {
                        var key = String(log.itemId);
                        var itemTexts = dir[key] || dir[parseInt(log.itemId, 10)];
                        if (itemTexts && itemTexts[log.tier]) {
                            msgText = itemTexts[log.tier];
                        }
                    }
                }
            }
        } catch (e2) {
            msgText = null;
        }

        // 回退通用模板：正文第一人称；说话人只在标题行。balanced 不能落到涨跌 0%。
        if (!msgText) {
            var tierToDelta = {
                very_low: 40, low: 20, balanced: 0, high: -20, very_high: -40
            };
            var deltaPercent = tierToDelta.hasOwnProperty(log.tier) ? tierToDelta[log.tier] : 0;
            if (log.tier === "balanced") {
                if (log.economyKind === "trading") {
                    msgText = "我的 " + itemName + " 库存稳定，卖价未变";
                } else {
                    msgText = "我对 " + itemName + " 的收购价保持稳定";
                }
                log._dir = "stable";
            } else {
                var isUp = deltaPercent > 0;
                var stringId = log.economyKind === "trading"
                    ? (isUp ? 1379 : 1380)
                    : (isUp ? 1377 : 1378);
                try {
                    msgText = stringUtil.getString(stringId, itemName, Math.abs(deltaPercent));
                } catch (e3) {
                    msgText = "";
                }
                if (!msgText) {
                    msgText = "我的 " + itemName + " " + (isUp ? "+" : "-") + Math.abs(deltaPercent) + "%";
                }
                log._dir = isUp ? "up" : "down";
            }
            log._deltaPercent = deltaPercent;
        }

        // 谈判专家：正文追加具体点价 基准→当前
        var priceIntelText = this._resolveNpcEconomyPriceIntelText(log);
        if (priceIntelText) {
            msgText = msgText + "\n" + priceIntelText;
        }

        // 纯文字版电台广播：不加载角色头像，避免资源依赖影响消息列表。
        var textX = 0;
        var textWidth = Math.max(60, width);

        var time = new cc.LabelTTF(this._formatNpcEconomyHeader(log),
            uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(textWidth, 0));
        time.setAnchorPoint(0, 1);
        time.tag = 1;
        node.addChild(time);

        var msg = new cc.LabelTTF(msgText, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(textWidth, 0));
        msg.setAnchorPoint(0, 0);
        msg.tag = 2;
        // 颜色：缺货涨价红，过剩降价绿，其它默认
        var tierDirMap = { very_low: "up", low: "up", high: "down", very_high: "down" };
        var tierDir = tierDirMap[log.tier];
        if (tierDir === "up") {
            msg.setColor(UITheme.colors.TEXT_ERROR);
        } else if (tierDir === "down") {
            msg.setColor(UITheme.colors.TEXT_SUCCESS);
        }
        node.addChild(msg);

        var contentH = time.height + msg.height + 10;
        node.setContentSize(width, contentH);

        time.setPosition(textX, contentH - 5);
        msg.setPosition(textX, 5);
        node.log = log;
        return node;
    },
    addLog: function (log) {
        this._super(log);
        this.updateTime();
    },
    updateTime: function () {
        var self = this;
        this.mycontainer.getChildren().forEach(function (child) {
            var time = child.getChildByTag(1);
            if (!time || !child.log) {
                return;
            }
            // npc_economy：标题行固定带说话人（自定义文案是第一人称）
            if (child.log.kind === "npc_economy") {
                time.setString(self._formatNpcEconomyHeader(child.log));
                return;
            }
            time.setString(stringUtil.getString(child.log.uid == Record.getUUID() ? 1150 : 1149, utils.timeToStr(Number(child.log.time))));
        });
    }
});



