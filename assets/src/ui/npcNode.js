/**
 * Created by lancelot on 15/4/22.
 */
var NpcNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);
    },
    _init: function () {
        this.npc = player.npcManager.getNPC(this.userData);
        this.setName(Navigation.nodeName.NPC_NODE);
        this.uiConfig = {
            title: this.npc.getName(),
            leftBtn: true,
            rightBtn: false
        };

        var leftEdge = 40;
        var rightEdge = this.bgRect.width - leftEdge;

        var heartNode = uiUtil.createHeartNode();
        heartNode.setAnchorPoint(1, 0.5);
        heartNode.x = rightEdge;
        heartNode.y = this.actionBarBaseHeight;
        heartNode.setName("heart");
        this.bg.addChild(heartNode);
        heartNode.updateView(memoryUtil.decode(this.npc.reputation));

        var digDes = autoSpriteFrameController.getSpriteFromSpriteName("#npc_dig_bg.png");
        digDes.setAnchorPoint(0.5, 1)
        digDes.setPosition(this.bgRect.width / 2, this.contentTopLineHeight - 20);
        this.bg.addChild(digDes);
        digDes.setName("dig_des");

        var dig = uiUtil.getSpriteByNameSafe(
            uiUtil.getRolePortraitFrameName(this.npc.id, false),
            uiUtil.getDefaultSpriteName("character", false)
        );
        dig.x = digDes.width / 2;
        dig.y = digDes.height / 2;
        digDes.addChild(dig);

        var des = new cc.LabelTTF(this.npc.getDialog(), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(rightEdge - leftEdge, 0));
        des.setAnchorPoint(0.5, 1);
        des.setPosition(this.bgRect.width / 2, digDes.y - digDes.height - 20);
        this.bg.addChild(des);
        des.setName("des");
        des.setColor(UITheme.colors.WHITE);
        this.ziplineBaseY = des.y - des.height - 25;
        this.ziplinePanelController = new ZiplineEndpointPanelController({
            hostNode: this.bg,
            leftEdge: leftEdge,
            rightEdge: rightEdge,
            topY: this.ziplineBaseY,
            getEntity: function () {
                return this.npc;
            }.bind(this),
            getEntityRef: function () {
                return this.npc;
            }.bind(this),
            onRefreshHeader: this.refreshSiteHeaderStats.bind(this)
        });
        this.ziplinePanelController.refresh();

        var have = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(260, 0), cc.TEXT_ALIGNMENT_CENTER);
        have.setAnchorPoint(0.5, 0);
        have.setPosition(this.bgRect.width / 4, 130);
        have.setColor(UITheme.colors.TEXT_SUCCESS);
        this.bg.addChild(have);
        have.setName("have");

        var btn1 = uiUtil.createCommonBtnWhite("", this, this.onClickBtn1);
        btn1.setPosition(this.bgRect.width / 4, 100);
        this.bg.addChild(btn1);
        btn1.setName("btn_1");

        this.updateViewAfterNpcNeed();

        var tradeItems = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        tradeItems.setAnchorPoint(0.5, 0);
        tradeItems.setPosition(this.bgRect.width / 4 * 3, 130);
        tradeItems.setColor(UITheme.colors.TEXT_SUCCESS);
        this.bg.addChild(tradeItems);
        tradeItems.setName("trade");
        var self = this;
        tradeItems.updateView = function () {
            this.setString(stringUtil.getString(1137, self.npc.storage.getItemSortNum()));
        };
        tradeItems.updateView();

        var btn2 = uiUtil.createCommonBtnWhite(stringUtil.getString(1040), this, this.onClickBtn2);
        btn2.setPosition(this.bgRect.width / 4 * 3, 100);
        this.bg.addChild(btn2);
        btn2.setName("btn_2")

    },
    updateViewAfterNpcNeed: function () {
        var needItemInfo = this.npc.getNeedItem();
        var needStr = stringUtil.getString(needItemInfo.itemId).title + "x" + needItemInfo.num;

        var have = this.bg.getChildByName("have");
        have.setString(stringUtil.getString(1036, needStr) + ', ' + stringUtil.getString(1038, player.bag.getNumByItemId(needItemInfo.itemId)));

        var btn1 = this.bg.getChildByName("btn_1");
        btn1.setTitleForState(stringUtil.getString(1036, ""), cc.CONTROL_STATE_NORMAL);
        btn1.setEnabled(!this.npc.isReputationMax());

    },
    onClickBtn1: function () {
        this.npc.takeNeedItem();
        this.updateViewAfterNpcNeed();
        this.bg.getChildByName("trade").updateView();
        this.bg.getChildByName("heart").updateView(memoryUtil.decode(this.npc.reputation));
    },
    onClickBtn2: function () {
        this.forward(Navigation.nodeName.NPC_STORAGE_NODE, this.userData);
    },
    onEnter: function () {
        this._super();
    },
    onExit: function () {
        this._super();
    },
    refreshSiteHeaderStats: function () {
        var tradeLabel = this.bg.getChildByName("trade");
        if (tradeLabel && typeof tradeLabel.updateView === "function") {
            tradeLabel.updateView();
        }
    },

    onClickLeftBtn: function () {
        this.back();
    },
    onClickRightBtn: function () {
    },

});
