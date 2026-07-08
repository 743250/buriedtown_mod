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
        this._super();
        this.setName(Navigation.nodeName.RADIO_NODE);
        this.data = [];
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

    /**
     * 本地系统消息（NPC 经济变动等）。绝不走 networkUtil.sendMsg。
     */
    addLocalSystemMsg: function (entry) {
        if (!entry) {
            return;
        }
        // 与 RadioFeedService 同款去重：同一天同一 NPC 同一物品同一 kind 只保留最新一条
        var key = entry._dedupKey
            || (entry.gameDay + "|" + entry.npcId + "|" + entry.itemId + "|" + entry.economyKind);
        for (var i = this.data.length - 1; i >= 0; i--) {
            if (this.data[i] && this.data[i]._dedupKey === key) {
                return;     // 重复，跳过
            }
        }
        this.addMsg(entry);
    },

    _flushRadioFeedBuffer: function () {
        if (typeof RadioFeedService === "undefined" || !RadioFeedService) {
            return;
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
            if (!payload) return;
            // 立即把这一批新条目灌进 UI（电台正打开）
            var feed = (typeof RadioFeedService !== "undefined" && RadioFeedService)
                ? RadioFeedService.getFeed() : [];
            if (feed.length === 0) return;
            // 找出本次 payload 拆出的 entry（_dedupKey 含 gameDay+npcId）
            var batchKeys = {};
            feed.forEach(function (e) {
                if (e && e.npcId === payload.npcId && e.gameDay === payload.gameDay) {
                    batchKeys[e._dedupKey] = true;
                }
            });
            feed.forEach(function (e) {
                if (e && batchKeys[e._dedupKey]) {
                    self.addLocalSystemMsg(e);
                }
            });
        };
        utils.emitter.on(NpcEconomyService.EVENT_DAILY_BROADCAST, this._economyListener);
        this._economyListenerBound = true;
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
