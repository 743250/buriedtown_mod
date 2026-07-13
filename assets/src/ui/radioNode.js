/**
 * Created by lancelot on 15/4/22.
 */
var getRadioNodeRuntimePlayer = function () {
    return GameRuntime.getPlayer();
};

var getRadioNodeRuntimeRecord = function () {
    return GameRuntime.getRecord();
};

var RadioNode = BuildNode.extend({
    ctor: function (userData) {
        this._super(userData);
    },
    _init: function () {
        // 必须在 _super 之前初始化。BuildNode._init → createTableView → checkVisible
        // 会同步 _flushRadioFeedBuffer；若 this.data 仍是 undefined，addLocalSystemMsg
        // 读 this.data.length 会抛错，本地经济广播被 try/catch 静默丢掉，电台空白。
        this.data = [];
        this._super();
        this.setName(Navigation.nodeName.RADIO_NODE);
    },

    cleanBuildAction: function () {
    },

    afterUpgrade: function () {
        this.updateAllView();

        this.title.setString(getRadioNodeRuntimePlayer().room.getBuildCurrentName(this.build.id));

        this.checkVisible();
    },

    updateAllView: function () {
        this.updateUpgradeView();
    },

    updateData: function () {
        networkUtil.requestData("getMsg", {limit: 20}, this, function (response) {
            if (response.statusCode === 200) {
                var newDataList = response.data;
                newDataList.reverse();
                var self = this;
                newDataList.forEach(function (d) {
                    for (var i = self.data.length - 1; i >= 0; i--) {
                        if (self.data[i]._id == d._id || (self.data[i].uid == d.uid && self.data[i].time == d.time)) {
                            break;
                        }
                    }
                    if (i < 0) {
                        self.addMsg(d);
                    }
                });
            } else {
                cc.e(JSON.stringify(response));
            }

        });

    },

    addMsg: function (msg) {
        this.data.push(msg);
        this.msgView.addLog(msg);
    },

    _getLocalSystemDedupKey: function (entry) {
        if (!entry) {
            return null;
        }
        // 优先 gameDay：同一天同 NPC 同物同方向只一条；time 已是游戏内展示串
        return entry._dedupKey
            || ((entry.gameDay != null ? entry.gameDay : entry.time)
                + "|" + entry.npcId + "|" + entry.itemId + "|" + entry.economyKind);
    },

    /**
     * 本地系统消息（NPC 经济变动等）。绝不走 networkUtil.sendMsg。
     */
    addLocalSystemMsg: function (entry) {
        if (!entry) {
            return;
        }
        if (!Array.isArray(this.data)) {
            this.data = [];
        }
        // 与 RadioFeedService 同款去重：同一次广播内同一 NPC 同一物品同一 kind 只保留最新一条
        var key = this._getLocalSystemDedupKey(entry);
        for (var i = this.data.length - 1; i >= 0; i--) {
            if (this._getLocalSystemDedupKey(this.data[i]) === key) {
                return;     // 重复，跳过
            }
        }
        this.addMsg(entry);
    },

    _flushRadioFeedBuffer: function () {
        if (typeof RadioFeedService === "undefined" || !RadioFeedService) {
            return;
        }
        // 读档/冷启动后 buffer 为空：按当前 NPC 库存补一份“今日广播”
        if (typeof NpcEconomyService !== "undefined" && NpcEconomyService
            && typeof NpcEconomyService.ensureTodayRadioFeed === "function") {
            try {
                var player = getRadioNodeRuntimePlayer();
                if (player && player.npcManager) {
                    NpcEconomyService.ensureTodayRadioFeed(player.npcManager);
                }
            } catch (e0) {
                cc.error("RadioNode ensureTodayRadioFeed failed: " + e0);
            }
        }
        var feed = RadioFeedService.getFeed() || [];
        var self = this;
        feed.forEach(function (entry) {
            try {
                self.addLocalSystemMsg(entry);
            } catch (e) {
                cc.error("RadioNode._flushRadioFeedBuffer entry failed: " + e);
            }
        });
    },

    _bindEconomyListener: function () {
        if (this._economyListenerBound) {
            return;
        }
        if (typeof utils === "undefined" || !utils || !utils.emitter
            || typeof NpcEconomyService === "undefined" || !NpcEconomyService) {
            return;
        }
        var self = this;
        this._economyListener = function (payload) {
            if (!payload) {
                return;
            }
            // 节点已销毁时跳过；smoke 环境可能没有 cc.sys.isObjectValid
            if (typeof cc !== "undefined" && cc.sys && typeof cc.sys.isObjectValid === "function"
                && !cc.sys.isObjectValid(self)) {
                return;
            }
            // 立即把这一批新条目灌进 UI（电台正打开）
            var feed = (typeof RadioFeedService !== "undefined" && RadioFeedService)
                ? RadioFeedService.getFeed() : [];
            if (feed.length === 0) return;
            // 找出本次 payload 拆出的 entry。
            // 优先 gameDay（日更广播身份），其次匹配游戏内 time 串。
            var batchKeys = {};
            feed.forEach(function (e) {
                if (!e || e.npcId !== payload.npcId) {
                    return;
                }
                var sameDay = payload.gameDay != null && e.gameDay === payload.gameDay;
                var sameTime = payload.time != null && e.time === payload.time;
                if (sameDay || sameTime) {
                    batchKeys[e._dedupKey] = true;
                }
            });
            feed.forEach(function (e) {
                if (e && batchKeys[e._dedupKey]) {
                    self.addLocalSystemMsg(e);
                }
            });
        };
        this._economyEmitter = utils.emitter;
        this._economyEmitter.on(NpcEconomyService.EVENT_DAILY_BROADCAST, this._economyListener);
        this._economyListenerBound = true;
    },

    _unbindEconomyListener: function () {
        if (!this._economyListenerBound) {
            return;
        }
        var emitter = this._economyEmitter
            || (typeof utils !== "undefined" && utils ? utils.emitter : null);
        if (emitter && this._economyListener && typeof emitter.off === "function"
            && typeof NpcEconomyService !== "undefined" && NpcEconomyService) {
            try {
                emitter.off(NpcEconomyService.EVENT_DAILY_BROADCAST, this._economyListener);
            } catch (e) {
                cc.error("RadioNode._unbindEconomyListener failed: " + e);
            }
        }
        this._economyListener = null;
        this._economyEmitter = null;
        this._economyListenerBound = false;
    },

    onExit: function () {
        this._unbindEconomyListener();
        this._super();
    },

    createTableView: function () {
        this.msgView = new MessageView(cc.size(this.bg.width - 14, this.sectionView.y - this.sectionView.height - 60));
        this.msgView.setPosition(7, 60);
        this.bg.addChild(this.msgView, 1);
        this.msgView.setName("msgView");

        var self = this;
        var editText = new cc.EditBox(cc.size(this.bg.width - 30, 45), autoSpriteFrameController.getScale9Sprite("edit_text_bg.png", cc.rect(4, 4, 1, 1)));
        editText.setDelegate({
            editBoxReturn: function (editBox) {
                var str = editBox.getString();
                if (str) {
                    self.sendMsg(str);
                    editBox.setString("");
                }
            }
        });
        editText.x = this.bg.width / 2;
        editText.y = 35;
        this.bg.addChild(editText);
        editText.setName("editText");
        editText.setReturnType(cc.KEYBOARD_RETURNTYPE_SEND);
        editText.setPlaceHolder(stringUtil.getString(1148));

        var btnGetMsg = uiUtil.createSpriteBtn({normal: "icon_get_msg.png"}, this, function () {
            self.updateData();
        });
        btnGetMsg.setAnchorPoint(0.5, 0.5);
        btnGetMsg.x = this.bg.width - 60;
        btnGetMsg.y = this.sectionView.y - this.sectionView.height - 35;
        this.bg.addChild(btnGetMsg);
        btnGetMsg.setName("btnGetMsg");

        if (cc.RTL) {
            btnGetMsg.x = 60;
        }

        //var btnSendMsg = uiUtil.createCommonBtnWhite(stringUtil.getString(1148), this, function () {
        //});
        //btnSendMsg.setAnchorPoint(0.5, 0.5);
        //btnSendMsg.x = this.bg.width - 80;
        //btnSendMsg.y = 40;
        //this.bg.addChild(btnSendMsg);
        //btnSendMsg.setName("btnSendMsg");

        this.checkVisible();
    },
    checkVisible: function () {
        var visible = this.build.level >= 0;
        this.bg.getChildByName("msgView").setVisible(visible);
        this.bg.getChildByName("editText").setVisible(visible);
        this.bg.getChildByName("btnGetMsg").setVisible(visible);
        //this.bg.getChildByName("btnSendMsg").setVisible(visible);
        if (visible) {
            this.updateData();
            this._flushRadioFeedBuffer();
            this._bindEconomyListener();
        }
    },
    sendMsg: function (msg) {
        var runtimeRecord = getRadioNodeRuntimeRecord();
        var msgData = {
            uid: runtimeRecord.getUUID(),
            msg: msg,
            time: new Date().getTime()
        };
        networkUtil.requestData("sendMsg", msgData);

        this.addMsg(msgData)
    }

});
