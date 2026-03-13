/**
 * Created by lancelot on 15/4/22.
 */
var NpcStorageNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);
    },
    _init: function () {
        this.npc = player.npcManager.getNPC(this.userData);
        this.setName(Navigation.nodeName.NPC_STORAGE_NODE);
        this.uiConfig = {
            title: this.npc.getName(),
            leftBtn: true,
            rightBtn: false
        };

        var equipNode = new EquipNode();
        equipNode.setAnchorPoint(0.5, 1);
        equipNode.setPosition(this.bgRect.width / 2, this.contentTopLineHeight);
        this.bg.addChild(equipNode, 1);

        var itemChangeNode = new ItemExchangeNode(this.npc, player.bag, stringUtil.getString(1034), this.npc.storage, this.npc.getName());
        itemChangeNode.setAnchorPoint(0.5, 0);
        itemChangeNode.setPosition(this.bgRect.width / 2, 0);
        this.bg.addChild(itemChangeNode);

        var favoriteDivider = new cc.DrawNode();
        favoriteDivider.drawSegment(
            cc.p(40, itemChangeNode.getContentSize().height + 28),
            cc.p(this.bgRect.width - 40, itemChangeNode.getContentSize().height + 28),
            1,
            cc.color(118, 102, 86, 120)
        );
        favoriteDivider.setName("favorite_hint_divider");
        this.bg.addChild(favoriteDivider);

        var favoriteTitle = new cc.LabelTTF(
            stringUtil.getString("npc_negotiation_panel_title") || "谈判情报",
            uiUtil.fontFamily.normal,
            uiUtil.fontSize.COMMON_4
        );
        favoriteTitle.setAnchorPoint(0, 0);
        favoriteTitle.setPosition(40, itemChangeNode.getContentSize().height + 34);
        favoriteTitle.setColor(UITheme.colors.TEXT_TITLE);
        favoriteTitle.setName("favorite_hint_title");
        this.bg.addChild(favoriteTitle);

        var favoriteHint = uiUtil.createLabel("", "caption", {
            width: this.bgRect.width - 190,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 0,
            color: cc.color(78, 68, 58, 255)
        });
        favoriteHint.setPosition(150, itemChangeNode.getContentSize().height + 8);
        favoriteHint.setName("favorite_hint");
        this.bg.addChild(favoriteHint);
        this.refreshFavoriteHint();

    },
    onEnter: function () {
        this._super();

        this.onExchangeEnd = this.onExchangeEndFunc();
        utils.emitter.on("exchange_end", this.onExchangeEnd);
        this.refreshFavoriteHint();
    },
    onExit: function () {
        this._super();

        utils.emitter.off("exchange_end", this.onExchangeEnd);
    },
    onExchangeEndFunc: function () {
        var self = this;
        return function () {
            self.back();
        }
    },

    onClickLeftBtn: function () {
        this.back();
    },
    refreshFavoriteHint: function () {
        var favoriteHint = this.bg.getChildByName("favorite_hint");
        var favoriteTitle = this.bg.getChildByName("favorite_hint_title");
        var favoriteDivider = this.bg.getChildByName("favorite_hint_divider");
        if (!favoriteHint || !favoriteTitle || !favoriteDivider) {
            return;
        }

        if (typeof TalentService === "undefined"
            || !TalentService
            || typeof TalentService.hasChosenTalent !== "function"
            || !TalentService.hasChosenTalent(123)
            || typeof this.npc.getCurrentFavoriteTradeInfo !== "function") {
            favoriteHint.setString("");
            favoriteHint.setVisible(false);
            favoriteTitle.setVisible(false);
            favoriteDivider.setVisible(false);
            return;
        }

        var favoriteInfoList = this.npc.getCurrentFavoriteTradeInfo();
        if (!favoriteInfoList.length) {
            favoriteHint.setString("");
            favoriteHint.setVisible(false);
            favoriteTitle.setVisible(false);
            favoriteDivider.setVisible(false);
            return;
        }

        var favoriteText = favoriteInfoList.map(function (itemInfo) {
            var itemString = stringUtil.getString(itemInfo.itemId) || {};
            var itemName = itemString.title || ("ID " + itemInfo.itemId);
            return itemName + " x" + itemInfo.price.toFixed(1);
        }).join("，");

        favoriteHint.setString(favoriteText);
        favoriteHint.setVisible(true);
        favoriteTitle.setVisible(true);
        favoriteDivider.setVisible(true);
    },
    onClickRightBtn: function () {
    },

});


var ItemExchangeNode = ItemChangeNode.extend({
    ctor: function (npc, topStorage, topStorageName, bottomStorage, bottomStorageName) {
        this._super(topStorage, topStorageName, bottomStorage, bottomStorageName);
        this.npc = npc;

        var sectionBar = this.getChildByName("bottom").getChildByName("section");
        var self = this;
        this.exchangeBtn = uiUtil.createCommonBtnBlack(stringUtil.getString(1040), this, function () {
            if (!self.exchangeBtn.isEnabled())
                return;
            self.topSrcData.map = self.topData.map;
            self.bottomSrcData.map = self.bottomData.map;
            utils.emitter.emit("exchange_end");
            audioManager.playEffect(audioManager.sound.LOOT);

            self.npc.tradingCount = self.npc.tradingCount || 0
            self.npc.tradingCount++;
        });
        this.exchangeBtn.setAnchorPoint(0.5, 0.5);
        this.exchangeBtn.setPosition(sectionBar.getContentSize().width - this.exchangeBtn.width / 2 - 20, sectionBar.getContentSize().height / 2);
        this.exchangeBtn.setEnabled(false);
        sectionBar.addChild(this.exchangeBtn);

        this.exchangeRage = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        this.exchangeRage.setAnchorPoint(1, 0.5);
        this.exchangeRage.setPosition(this.exchangeBtn.x - this.exchangeBtn.width / 2 - 10, sectionBar.getContentSize().height / 2);
        this.exchangeRage.setColor(UITheme.colors.TEXT_TITLE);
        sectionBar.addChild(this.exchangeRage);
    },
    initData: function (topStorage, bottomStorage) {
        this.topSrcData = topStorage;
        this.bottomSrcData = bottomStorage;
        this.topData = topStorage.clone();
        this.bottomData = bottomStorage.clone();
        player.tmpBag = this.topData;
    },
    onExit: function () {
        this._super();

        delete player.tmpBag;
    },
    exchange: function (id, itemId, num) {
        var res = this._super(id, itemId, num);
        if (res) {
            var delta = this.getTradeDelta();
            this.exchangeRage.setString(this.updateExchangeStr(delta));
            this.exchangeBtn.setEnabled(delta >= 0);
        }
        return res;
    },
    getTradeDelta: function () {
        var payValue = this.npc.getTradeRate1(this.bottomData);
        var requiredPayValue = this.npc.getTradeRate2(this.bottomData);
        return Number((payValue - requiredPayValue).toFixed(3));
    },
    updateExchangeStr: function (delta) {
        if (delta === undefined || delta === null) {
            delta = this.getTradeDelta();
        }

        var index = 0;
        if (delta >= 10) {
            index = 0;
        } else if (delta >= 3) {
            index = 1;
        } else if (delta >= 0) {
            index = 2;
        } else if (delta >= -3) {
            index = 3;
        } else if (delta >= -10) {
            index = 4;
        } else {
            index = 5;
        }

        var str = stringUtil.getString(3010)[index];
        if (TalentService.hasChosenTalent(123)) {
            var sign = delta >= 0 ? "+" : "-";
            var valueStr = Math.abs(delta).toFixed(1);
            str += " (" + sign + " " + valueStr + ")";
        }
        return str;
    },
    equipNeedGuide: function () {
        return false;
    },
    initGuideLayer: function () {

    }
});
