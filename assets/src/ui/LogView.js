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
        // 本地系统消息（NPC 经济变动）走单独渲染分支：左侧头像 + 右侧带颜色文本
        if (log && log.kind === "npc_economy") {
            return this._createNpcEconomyItem(log);
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
    _createNpcEconomyItem: function (log) {
        var node = new cc.Node();
        var width = this.getViewSize().width;

        // —— 文案合成 —— //
        var npcName = "NPC " + log.npcId;
        var itemName = "#" + log.itemId;
        try {
            if (typeof npcConfig !== "undefined" && npcConfig && typeof stringUtil !== "undefined") {
                var npcStr = stringUtil.getString("npc_" + log.npcId);
                if (npcStr && npcStr.name) {
                    npcName = npcStr.name;
                }
                var itemStr = stringUtil.getString(parseInt(log.itemId, 10));
                if (itemStr && itemStr.title) {
                    itemName = itemStr.title;
                }
            }
        } catch (e) {
            cc.error("MessageView._createNpcEconomyItem name lookup failed: " + e);
        }

        // 1377 favorite up / 1378 favorite down / 1379 trading up / 1380 trading down
        var stringId;
        if (log.economyKind === "trading") {
            stringId = log.dir === "up" ? 1379 : 1380;
        } else {
            stringId = log.dir === "up" ? 1377 : 1378;
        }
        var msgText;
        try {
            msgText = stringUtil.getString(stringId, npcName, itemName, log.deltaPercent);
        } catch (e2) {
            msgText = npcName + " · " + itemName + " " + (log.dir === "up" ? "+" : "-") + log.deltaPercent + "%";
        }

        // —— 头像 sprite（小图，地图头像） —— //
        var avatarSize = 36;
        var avatar = null;
        try {
            var frameName = (typeof IconHelper !== "undefined" && IconHelper)
                ? IconHelper.getRoleMapFrameName(log.npcId, false, "npc_1.png")
                : ("npc_" + log.npcId + ".png");
            avatar = (typeof SafetyHelper !== "undefined" && SafetyHelper)
                ? SafetyHelper.safeLoadSprite(frameName, "npc_1.png")
                : null;
        } catch (e3) {
            avatar = null;
        }
        if (avatar) {
            avatar.setAnchorPoint(0, 0.5);
            // 缩放到 avatarSize
            var origSize = avatar.getContentSize();
            var maxSide = Math.max(origSize.width, origSize.height) || avatarSize;
            avatar.setScale(avatarSize / maxSide);
            node.addChild(avatar);
        }

        // —— 时间 + 文本（右侧） —— //
        var textX = avatar ? (avatarSize + 8) : 0;
        var textWidth = Math.max(60, width - textX);

        var time = new cc.LabelTTF(utils.timeToStr(Number(log.time)),
            uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(textWidth, 0));
        time.setAnchorPoint(0, 1);
        time.tag = 1;
        node.addChild(time);

        var msg = new cc.LabelTTF(msgText, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(textWidth, 0));
        msg.setAnchorPoint(0, 0);
        msg.tag = 2;
        msg.setColor(log.dir === "up" ? UITheme.colors.TEXT_ERROR : UITheme.colors.TEXT_SUCCESS);
        node.addChild(msg);

        var contentH = Math.max(avatarSize, time.height + msg.height + 10);
        node.setContentSize(width, contentH);

        time.setPosition(textX, contentH - 5);
        msg.setPosition(textX, 5);
        if (avatar) {
            avatar.setPosition(0, contentH / 2);
        }

        node.log = log;
        return node;
    },
    addLog: function (log) {
        this._super(log);
        this.updateTime();
    },
    updateTime: function () {
        this.mycontainer.getChildren().forEach(function (child) {
            var time = child.getChildByTag(1);
            if (!time || !child.log) {
                return;
            }
            // npc_economy 消息显示绝对游戏时间，不走"自己/别人"两套模板
            if (child.log.kind === "npc_economy") {
                time.setString(utils.timeToStr(Number(child.log.time)));
                return;
            }
            time.setString(stringUtil.getString(child.log.uid == Record.getUUID() ? 1150 : 1149, utils.timeToStr(Number(child.log.time))));
        });
    }
});



