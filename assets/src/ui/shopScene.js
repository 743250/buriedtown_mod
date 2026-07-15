/**
 * User: Alex
 * Date: 15/1/5
 * Time: 4:07 PM
 */
var ShopLayer = cc.Layer.extend({
    ctor: function (opt) {
        this._super();
        this.opt = opt;
        this._shopStateListener = null;

        var keyboardListener = cc.EventListener.create({
            event: cc.EventListener.KEYBOARD,
            onKeyReleased: function (keyCode) {
                if (keyCode == cc.KEY.back) {
                    cc.director.runScene(new MenuScene());
                }
            }
        });
        cc.eventManager.addListener(keyboardListener, this);

        return true;
    },
    onExit: function () {
        this._unbindShopStateListener();
        this._super();
    },
    _bindShopStateListener: function () {
        PurchaseUiHelper.bindShopStateListener(this, this._onShopStateChanged);
    },
    _unbindShopStateListener: function () {
        PurchaseUiHelper.unbindShopStateListener(this);
    },
    _onShopStateChanged: function (changeInfo) {
        if (!PurchaseUiHelper.isPurchaseChangeRelevant(changeInfo, this.payData)) {
            this._refreshPointsLabel();
            return;
        }
        this._refreshAllPayNodes();
        this._refreshAllPayNodesDeferred();
    },
    _getShopTitleText: function () {
        var isEnglish = cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_ENGLISH;
        return isEnglish ? "Exchange" : "兑换商店";
    },
    _refreshPointsLabel: function () {
        PurchaseUiHelper.refreshAchievementPointsLabel(this.pointsLabel);
        if (this.pointsLabel && typeof this.pointsLabel.setColor === "function") {
            var theme = uiUtil.getPreGameTheme() || {};
            this.pointsLabel.setColor(theme.points || cc.color(236, 200, 74, 255));
        }
    },
    _updateNodePrice: function (purchaseId, payNode) {
        PurchaseUiHelper.applyPayNodeState(purchaseId, payNode);
    },
    _showExchangeFailedTip: function (result) {
        PurchaseUiHelper.showPurchaseFailedTip(result);
    },
    _rebuildPayNodes: function () {
        if (!this.payContainer || !this.payData) {
            return;
        }
        this.nodeMap = PurchaseUiHelper.rebuildPayNodeGrid(this.payContainer, this.payData, this, this.onPayResult, {
            columns: this._payColumns || 2,
            nodeScale: this._payNodeScale || 1,
            nodeWidth: this._payNodeWidth,
            nodeHeight: this._payNodeHeight,
            widthPadding: this._payWidthPadding,
            heightPadding: this._payHeightPadding,
            totalHeight: this._payTotalHeight
        });

        var self = this;
        Object.keys(this.nodeMap).forEach(function (purchaseId) {
            self._updateNodePrice(parseInt(purchaseId), self.nodeMap[purchaseId]);
        });
    },
    _refreshAllPayNodes: function () {
        this._rebuildPayNodes();
        this._refreshPointsLabel();
    },
    _refreshAllPayNodesDeferred: function () {
        var self = this;
        if (typeof this.scheduleOnce === "function") {
            this.scheduleOnce(function () {
                self._refreshAllPayNodes();
            }, 0.02);
        } else {
            self._refreshAllPayNodes();
        }
    },
    onEnter: function () {
        this._super();
        this._bindShopStateListener();

        var fullWidth = cc.winSize.width;
        var fullHeight = cc.winSize.height;
        var theme = uiUtil.getPreGameTheme() || {};

        var background = uiUtil.createPreGameBackground(cc.size(fullWidth, fullHeight));
        this.addChild(background, 0);

        var header = uiUtil.createPreGameHeader({
            parent: this,
            width: fullWidth,
            height: fullHeight,
            titleText: this._getShopTitleText(),
            showPoints: true,
            pointsAlignRight: true,
            zOrder: 2
        });
        this.pointsLabel = header.points;
        this._refreshPointsLabel();

        this.nodeMap = {};
        var NODE_WIDTH = 246;
        var NODE_HEIGHT = 249;
        var minPadding = 8;
        var columns = 2;
        if (fullWidth < (2 * NODE_WIDTH + minPadding * 3)) {
            columns = 1;
        }
        var nodeScale = 1;
        if (columns === 1 && fullWidth < (NODE_WIDTH + minPadding * 2)) {
            nodeScale = Math.max(0.82, (fullWidth - minPadding * 2) / NODE_WIDTH);
        }
        var scaledNodeWidth = Math.floor(NODE_WIDTH * nodeScale);
        var scaledNodeHeight = Math.floor(NODE_HEIGHT * nodeScale);
        var widthPadding;
        if (columns === 1) {
            widthPadding = 0;
        } else {
            widthPadding = Math.max(minPadding, Math.floor((fullWidth - 2 * scaledNodeWidth) / 3));
        }
        var heightPadding = 10;

        var data = PurchaseService.getMainShopPurchaseIds().filter(function (purchaseId) {
            return !!PurchaseService.getPurchaseInfo(purchaseId);
        });
        this.payData = data.slice();
        var row = Math.max(1, Math.ceil(data.length / columns));

        var totalHeight = scaledNodeHeight * row + (heightPadding * (row - 1));

        var buttonBaseY = theme.footerY || 62;
        var scrollBottomY = buttonBaseY + 58;
        var scrollTopY = (header.headerBottomY || (fullHeight - 112)) - 16;
        var scrollHeight = Math.max(NODE_HEIGHT + 20, scrollTopY - scrollBottomY);

        var mycontainer = new cc.Layer();
        this.payContainer = mycontainer;
        this._payNodeWidth = scaledNodeWidth;
        this._payNodeHeight = scaledNodeHeight;
        this._payNodeScale = nodeScale;
        this._payColumns = columns;
        this._payWidthPadding = widthPadding;
        this._payHeightPadding = heightPadding;
        this._payTotalHeight = totalHeight;
        var viewWidth = columns === 1
            ? Math.min(scaledNodeWidth, fullWidth - minPadding * 2)
            : (scaledNodeWidth * columns + widthPadding * (columns - 1));
        var scrollView = new cc.ScrollView(cc.size(viewWidth, scrollHeight), mycontainer);
        scrollView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        scrollView.setBounceable(false);
        scrollView.setClippingToBounds(true);
        scrollView.x = Math.floor((fullWidth - viewWidth) / 2);
        scrollView.y = scrollBottomY;
        this.addChild(scrollView, 1);
        scrollView.setContentSize(scrollView.getViewSize().width, totalHeight);
        var offset = scrollView.getContentOffset();
        offset.y = scrollView.getViewSize().height - totalHeight;
        scrollView.setContentOffset(offset);

        var self = this;
        this._rebuildPayNodes();

        var btn1 = uiUtil.createPreGameOutlineButton(stringUtil.getString(1193), this, function () {
            if (self.opt) {
                cc.director.popScene();
            } else {
                cc.director.runScene(new MenuScene());
            }
        });
        this.addChild(btn1, 3);
        btn1.setName("btn_1");
        this.btnBack = btn1;

        var btnTest = uiUtil.createPreGameOutlineButton("\u6d4b\u8bd5+100", this, function () {
            Medal.addAchievementPoints(100);
            self._refreshPointsLabel();
        });
        btnTest.setVisible(false);
        this.addChild(btnTest, 3);
        this.btnTest = btnTest;

        var btn2 = uiUtil.createPreGameOutlineButton(stringUtil.getString(1212), this, function () {
            PurchaseService.restoreRemotePurchases(this, function (err, restoreResult) {
                if (err || !restoreResult || !restoreResult.isSuccess) {
                    CommonUtil.showCommonDialog(stringUtil.getString(1219), stringUtil.getString(1030));
                    return;
                }
                self._refreshAllPayNodes();
            });
        });
        this.addChild(btn2, 3);
        btn2.setName("btn_2");
        this.btnRestore = btn2;

        if (cc.sys.os == cc.sys.OS_ANDROID) {
            btn2.setVisible(false);
        }

        this._buttonBaseY = buttonBaseY;
        this._layoutBottomButtons();
        this._bindAchievementPointsSecretTap();

        var showPayDialogFromOuter = function () {
            if (!self.opt) {
                return;
            }
            cc.log(JSON.stringify(self.opt));
            PurchaseUiHelper.showPayDialogWithRefresh(self.opt.purchaseId, function () {
                utils.pay(self.opt.purchaseId, self, self.onPayResult);
            }, self);
        };

        var remoteRefreshInfo = {
            hasRemotePurchases: PurchaseUiHelper.getRemotePayInfoRequestIds(data).length > 0
        };
        if (!remoteRefreshInfo.hasRemotePurchases) {
            btn2.setVisible(false);
            this._layoutBottomButtons();
        }

        if (remoteRefreshInfo.hasRemotePurchases) {
            PurchaseUiHelper.refreshRemotePayInfoIfNeeded(this, data, function (err, refreshInfo) {
                if (!err) {
                    var refreshedIds = refreshInfo && refreshInfo.purchaseIds ? refreshInfo.purchaseIds : [];
                    refreshedIds.forEach(function (purchaseId) {
                        var payNode = self.nodeMap[purchaseId];
                        if (!payNode) {
                            return;
                        }
                        self._updateNodePrice(purchaseId, payNode);
                    });
                }
            });
        }
        showPayDialogFromOuter();
    },
    _layoutBottomButtons: function () {
        uiUtil.layoutPreGameFooter([this.btnBack, this.btnTest, this.btnRestore], {
            width: cc.winSize.width,
            y: this._buttonBaseY
        });
    },
    _bindAchievementPointsSecretTap: function () {
        if (!this.pointsLabel || this._pointsSecretListener) {
            return;
        }
        var self = this;
        this._pointsSecretTapCount = 0;
        this._pointsSecretTapResetSec = 2;
        this.pointsLabel.setLocalZOrder(20);

        var listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                var target = event.getCurrentTarget();
                if (!target || !target.isVisible()) {
                    return false;
                }
                var location = target.convertToNodeSpace(touch.getLocation());
                var size = target.getContentSize();
                var rect = cc.rect(0, 0, size.width, size.height);
                if (!cc.rectContainsPoint(rect, location)) {
                    return false;
                }
                self._pointsSecretTapCount = (self._pointsSecretTapCount || 0) + 1;
                if (self._pointsSecretTapCount >= 5) {
                    self._pointsSecretTapCount = 0;
                    if (self.btnTest && !self.btnTest.isVisible()) {
                        self.btnTest.setVisible(true);
                        self._layoutBottomButtons();
                    }
                }
                if (typeof self.unschedule === "function" && typeof self.scheduleOnce === "function") {
                    self.unschedule(self._resetPointsSecretTapCount);
                    self.scheduleOnce(self._resetPointsSecretTapCount, self._pointsSecretTapResetSec);
                }
                return true;
            }
        });
        this._pointsSecretListener = listener;
        cc.eventManager.addListener(listener, this.pointsLabel);
    },
    _resetPointsSecretTapCount: function () {
        this._pointsSecretTapCount = 0;
    },
    onPayResult: function (result) {
        if (result.isSuccess) {
            return;
        }
        this._showExchangeFailedTip(result);
    }
});

var ShopScene = BaseScene.extend({
    ctor: function (opt) {
        this.opt = opt;
        this._super(APP_NAVIGATION.MENU_SUB);
    },
    onEnter: function () {
        this._super();
        this.removeAllChildren();
        var layer = new ShopLayer(this.opt);
        layer.setName("keyEventLayer");
        this.addChild(layer);
    },
    onExit: function () {
        this._super();
    }
});
