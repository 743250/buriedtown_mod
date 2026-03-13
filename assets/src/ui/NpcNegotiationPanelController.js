/**
 * Shared panel controller for showing Negotiation Master trade intel on NPC pages.
 */
var NpcNegotiationPanelController = cc.Class.extend({
    ctor: function (options) {
        options = options || {};
        this.hostNode = options.hostNode || null;
        this.leftEdge = options.leftEdge || 40;
        this.rightEdge = options.rightEdge || 0;
        this.topY = options.topY || 0;
        this.sectionName = options.sectionName || "npc_negotiation_section";
        this.bodyFontSize = options.bodyFontSize || uiUtil.fontSize.COMMON_4;
        this.getNpc = options.getNpc || function () {
            return null;
        };
        this.lastRenderedHeight = 0;
    },
    setTopY: function (topY) {
        this.topY = topY || 0;
        return this;
    },
    getRenderedHeight: function () {
        return this.lastRenderedHeight || 0;
    },
    getCurrentNpc: function () {
        return this.getNpc ? this.getNpc() : null;
    },
    shouldShowPanel: function () {
        var npc = this.getCurrentNpc();
        return !!(npc
            && typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.hasChosenTalent === "function"
            && TalentService.hasChosenTalent(123)
            && typeof npc.getCurrentFavoriteTradeInfo === "function"
            && npc.getCurrentFavoriteTradeInfo().length);
    },
    buildFavoriteText: function (favoriteInfoList) {
        return (favoriteInfoList || []).map(function (itemInfo) {
            var itemString = stringUtil.getString(itemInfo.itemId) || {};
            var itemName = itemString.title || ("ID " + itemInfo.itemId);
            return itemName + " x" + itemInfo.price.toFixed(1);
        }).join("，");
    },
    refresh: function () {
        this.lastRenderedHeight = 0;
        if (!this.hostNode) {
            return;
        }

        this.hostNode.removeChildByName(this.sectionName);
        if (!this.shouldShowPanel()) {
            return;
        }

        var npc = this.getCurrentNpc();
        var favoriteInfoList = npc.getCurrentFavoriteTradeInfo();
        var favoriteText = this.buildFavoriteText(favoriteInfoList);
        var panelWidth = this.rightEdge - this.leftEdge;
        var headerHeight = 30;
        var bodyTopPadding = 8;
        var bodyBottomPadding = 6;
        var dividerColor = cc.color(118, 102, 86, 140);
        var titleColor = UITheme.colors.TEXT_TITLE;
        var subTitleColor = cc.color(116, 102, 88, 255);
        var bodyColor = cc.color(78, 68, 58, 255);

        var bodyLabel = new cc.LabelTTF(
            favoriteText,
            uiUtil.fontFamily.normal,
            this.bodyFontSize,
            cc.size(panelWidth, 0),
            cc.TEXT_ALIGNMENT_LEFT
        );
        bodyLabel.setColor(bodyColor);
        bodyLabel.setAnchorPoint(0, 1);

        var panelHeight = headerHeight + bodyTopPadding + bodyLabel.height + bodyBottomPadding;
        this.lastRenderedHeight = panelHeight;

        var sectionNode = new cc.Node();
        sectionNode.setName(this.sectionName);
        sectionNode.setPosition(this.leftEdge, this.topY - panelHeight);
        this.hostNode.addChild(sectionNode);

        var divider = new cc.DrawNode();
        divider.drawSegment(
            cc.p(0, panelHeight - headerHeight + 2),
            cc.p(panelWidth, panelHeight - headerHeight + 2),
            1,
            dividerColor
        );
        sectionNode.addChild(divider);

        var title = new cc.LabelTTF(
            stringUtil.getString("npc_negotiation_panel_title") || "谈判情报",
            uiUtil.fontFamily.normal,
            uiUtil.fontSize.COMMON_3
        );
        title.setAnchorPoint(0, 1);
        title.setPosition(0, panelHeight - 2);
        title.setColor(titleColor);
        sectionNode.addChild(title);

        var subTitle = new cc.LabelTTF(
            stringUtil.getString("npc_negotiation_panel_subtitle") || "当前偏好物品",
            uiUtil.fontFamily.normal,
            uiUtil.fontSize.COMMON_4
        );
        subTitle.setAnchorPoint(1, 1);
        subTitle.setPosition(panelWidth, panelHeight - 4);
        subTitle.setColor(subTitleColor);
        sectionNode.addChild(subTitle);

        bodyLabel.setPosition(0, panelHeight - headerHeight - bodyTopPadding + 2);
        sectionNode.addChild(bodyLabel);
    }
});
