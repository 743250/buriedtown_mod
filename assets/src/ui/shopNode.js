/**
 * Created by lancelot on 15/4/23.
 */
/**
 * Created by lancelot on 15/4/22.
 */
var ShopNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);
        this._shopStateListener = null;
    },
    _init: function () {
        this.setName(Navigation.nodeName.SHOP_NODE);
        this.uiConfig = {
            title: stringUtil.getString(1216),
            leftBtn: true,
            rightBtn: false
        };
        this.pointsLabel = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        this.pointsLabel.setAnchorPoint(1, 0.5);
        this.pointsLabel.setPosition(this.bgRect.width - 14, this.actionBarBaseHeight);
        this.pointsLabel.setColor(cc.color(255, 140, 0, 255));
        this.bg.addChild(this.pointsLabel, 3);
        this._refreshPointsLabel();

        this.nodeMap = {};
        var NODE_WIDTH = 246;
        var NODE_HEIGHT = 249;
        var viewWidth = this.bgRect.width - 20;
        var viewHeight = this.contentTopLineHeight - 20;
        var widthPadding = (viewWidth - 2 * NODE_WIDTH) / 3;
        var heightPadding = 5;
        var data = PurchaseService.getConsumablePurchaseIds
            ? PurchaseService.getConsumablePurchaseIds()
            : [];
        if (!data || data.length === 0) {
            data = [201, 202, 203, 204, 205, 206, 207, 208, 209];
        }
        var row = Math.ceil(data.length / 2);
        var totalHeight = NODE_HEIGHT * row + (heightPadding * (row - 1));

        var mycontainer = new cc.Layer();
        var scrollView = new cc.ScrollView(cc.size(viewWidth, viewHeight), mycontainer);
        scrollView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        scrollView.setBounceable(false);
        scrollView.setClippingToBounds(true);
        scrollView.x = 10;
        scrollView.y = 10;
        this.bg.addChild(scrollView);
        scrollView.setContentSize(scrollView.getViewSize().width, totalHeight);
        var offset = scrollView.getContentOffset();
        offset.y = scrollView.getViewSize().height - totalHeight;
        scrollView.setContentOffset(offset);

        this.nodeMap = PurchaseUiHelper.rebuildPayNodeGrid(mycontainer, data, this, this.onPayResult, {
            columns: 2,
            nodeScale: 1,
            nodeWidth: NODE_WIDTH,
            nodeHeight: NODE_HEIGHT,
            widthPadding: widthPadding,
            heightPadding: heightPadding,
            totalHeight: totalHeight,
            offsetX: widthPadding
        });

        this._refreshAllNodes();
    },
    _refreshPointsLabel: function () {
        PurchaseUiHelper.refreshAchievementPointsLabel(this.pointsLabel);
    },
    _refreshAllNodes: function () {
        PurchaseUiHelper.refreshPayNodeMapWithPoints(this.nodeMap, this.pointsLabel);
    },
    _bindShopStateListener: function () {
        PurchaseUiHelper.bindShopStateListener(this, this._refreshAllNodes);
    },
    _unbindShopStateListener: function () {
        PurchaseUiHelper.unbindShopStateListener(this);
    },
    onPayResult: function (result) {
        PurchaseUiHelper.showPurchaseFailedTip(result);
    },
    onClickLeftBtn: function () {
        this.back();
    },
    onClickRightBtn: function () {
    },
    onEnter: function () {
        this._super();
        this._bindShopStateListener();
        cc.timer.pause();
    },
    onExit: function () {
        this._unbindShopStateListener();
        this._super();
        cc.timer.resume();
    }
});
