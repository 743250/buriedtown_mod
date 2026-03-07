/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */
var ShopLayer = cc.Layer.extend({
    ctor: function (opt) {
        this._super();
        this.opt = opt;
        this._shopStateListener = null;

        var keyboardListener = cc.EventListener.create({
            event: cc.EventListener.KEYBOARD,
            onKeyReleased: function (keyCode, event) {
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
        if (this._shopStateListener || typeof utils === "undefined" || !utils || !utils.emitter) {
            return;
        }

        var self = this;
        this._shopStateListener = function (changeInfo) {
            self._onShopStateChanged(changeInfo);
        };
        utils.emitter.on(PurchaseService.getShopStateChangeEventName(), this._shopStateListener);
    },
    _unbindShopStateListener: function () {
        if (!this._shopStateListener || typeof utils === "undefined" || !utils || !utils.emitter) {
            this._shopStateListener = null;
            return;
        }
        utils.emitter.off(PurchaseService.getShopStateChangeEventName(), this._shopStateListener);
        this._shopStateListener = null;
    },
    _onShopStateChanged: function (changeInfo) {
        var purchaseId = changeInfo && changeInfo.purchaseId;
        if (purchaseId !== null && purchaseId !== undefined && this.payData && this.payData.indexOf(parseInt(purchaseId)) === -1) {
            this._refreshPointsLabel();
            return;
        }
        this._refreshAllPayNodes();
        this._refreshAllPayNodesDeferred();
    },
    _refreshPointsLabel: function () {
        if (!this.pointsLabel) {
            return;
        }
        this.pointsLabel.setString("成就点: " + Medal.getAchievementPoints());
    },
    _updateNodePrice: function (purchaseId, payNode) {
        if (!payNode) {
            return;
        }
        var shopState = PurchaseService.getShopUiState(purchaseId);
        if (shopState && typeof payNode.applyShopState === "function") {
            payNode.applyShopState(shopState);
            return;
        }

        var isExchangePurchase = PurchaseService.isExchangePurchase(purchaseId);
        if (isExchangePurchase) {
            var achievementPrice = PurchaseService.getAchievementPriceByPurchaseId(purchaseId);
            if (achievementPrice !== null && achievementPrice !== undefined) {
                payNode.updatePrice(achievementPrice + " 成就点");
            } else if (PurchaseService.isTalentPurchase(purchaseId)) {
                payNode.updatePrice("已满级");
            } else {
                payNode.updatePrice("已购");
            }
            return;
        }

        var purchaseConfig = PurchaseService.getPurchaseConfig(purchaseId);
        if (!purchaseConfig) {
            return;
        }
        var priceStr = purchaseConfig.productPriceStr;
        if (priceStr) {
            payNode.updatePrice(priceStr);
        } else {
            payNode.updatePrice(stringUtil.getString(1191, purchaseConfig.price));
        }
    },
    _showExchangeFailedTip: function (payResult) {
        if (payResult == 3) {
            uiUtil.showTip("已购或已满级");
        } else {
            uiUtil.showTip("成就点不足!");
        }
    },
    _rebuildPayNodes: function () {
        if (!this.payContainer || !this.payData) {
            return;
        }
        this.payContainer.removeAllChildren(true);
        this.nodeMap = {};
        var columns = this._payColumns || 2;
        var nodeScale = this._payNodeScale || 1;

        var self = this;
        this.payData.forEach(function (purchaseId, index) {
            try {
                var payNode = uiUtil.createPayItemNode(purchaseId, self, self.onPayResult);
                if (!payNode) {
                    return;
                }
                payNode.anchorX = 0;
                payNode.anchorY = 1;
                payNode.setScale(nodeScale);
                payNode.x = (index % columns) * (self._payWidthPadding + self._payNodeWidth);
                payNode.y = self._payTotalHeight - Math.floor(index / columns) * (self._payHeightPadding + self._payNodeHeight);
                self.payContainer.addChild(payNode);
                self.nodeMap[purchaseId] = payNode;
                self._updateNodePrice(purchaseId, payNode);
            } catch (e) {
                cc.e("createPayItemNode failed. purchaseId=" + purchaseId + ", err=" + e);
            }
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

        this.pointsLabel = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        this.pointsLabel.setAnchorPoint(0.5, 1);
        this.pointsLabel.setPosition(cc.winSize.width / 2, cc.winSize.height - 12);
        this.pointsLabel.setColor(cc.color(255, 140, 0, 255));
        this.addChild(this.pointsLabel);
        this._refreshPointsLabel();

        this.nodeMap = {};
        var NODE_WIDTH = 246;
        var NODE_HEIGHT = 249;
        var minPadding = 8;
        var columns = 2;
        if (cc.winSize.width < (2 * NODE_WIDTH + minPadding * 3)) {
            columns = 1;
        }
        var nodeScale = 1;
        if (columns === 1 && cc.winSize.width < (NODE_WIDTH + minPadding * 2)) {
            nodeScale = Math.max(0.82, (cc.winSize.width - minPadding * 2) / NODE_WIDTH);
        }
        var scaledNodeWidth = Math.floor(NODE_WIDTH * nodeScale);
        var scaledNodeHeight = Math.floor(NODE_HEIGHT * nodeScale);
        var widthPadding;
        if (columns === 1) {
            widthPadding = 0;
        } else {
            widthPadding = Math.max(minPadding, Math.floor((cc.winSize.width - 2 * scaledNodeWidth) / 3));
        }
        var heightPadding = 10;

        var data = [108, 109, 110, 111, 112, 113, 114, 105, 106, 107, 101, 102, 103, 104, 120, 121, 122, 123, 124];
        data = data.filter(function (purchaseId) {
            return !!PurchaseList[purchaseId];
        });
        this.payData = data.slice();
        var row = Math.max(1, Math.ceil(data.length / columns));

        var totalHeight = scaledNodeHeight * row + (heightPadding * (row - 1));

        var buttonBaseY = 60;
        var scrollBottomY = buttonBaseY + 58;
        var headerBottomY = this.pointsLabel.y - this.pointsLabel.height - 18;
        var scrollTopY = headerBottomY - 8;
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
            ? Math.min(scaledNodeWidth, cc.winSize.width - minPadding * 2)
            : (scaledNodeWidth * columns + widthPadding * (columns - 1));
        var scrollView = new cc.ScrollView(cc.size(viewWidth, scrollHeight), mycontainer);
        scrollView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        scrollView.setBounceable(false);
        scrollView.setClippingToBounds(true);
        scrollView.x = Math.floor((cc.winSize.width - viewWidth) / 2);
        scrollView.y = scrollBottomY;
        this.addChild(scrollView);
        scrollView.setContentSize(scrollView.getViewSize().width, totalHeight);
        var offset = scrollView.getContentOffset();
        offset.y = scrollView.getViewSize().height - totalHeight;
        scrollView.setContentOffset(offset);

        var self = this;
        this._rebuildPayNodes();

        var btn1 = uiUtil.createCommonBtnWhite(stringUtil.getString(1193), this, function () {
            if (self.opt) {
                cc.director.popScene();
            } else {
                cc.director.runScene(new MenuScene());
            }
        });
        btn1.setPosition(cc.winSize.width / 4, buttonBaseY);
        this.addChild(btn1);
        btn1.setName("btn_1");

        var btnTest = uiUtil.createCommonBtnWhite("测试+100", this, function () {
            Medal.addAchievementPoints(100);
            self._refreshPointsLabel();
        });
        btnTest.setPosition(cc.winSize.width / 2, buttonBaseY);
        this.addChild(btnTest);

        var btn2 = uiUtil.createCommonBtnWhite(stringUtil.getString(1212), this, function () {
            uiUtil.showLoadingView();

            var productIdMap = utils.getProductIdMap();
            cc.purchase.restoreIAP(function (result) {
                uiUtil.dismissLoadingView();
                if (result.result == 1) {
                    var purchaseId;
                    if (result.productId == 'ipa_huozhe_nc6') {
                        purchaseId = 106;
                    } else {
                        purchaseId = productIdMap[result.productId].purchaseId;
                    }
                    PurchaseService.syncPurchasedUnlock(purchaseId);
                    //CommonUtil.showCommonDialog(stringUtil.getString(1218), stringUtil.getString(1030));
                } else {
                    CommonUtil.showCommonDialog(stringUtil.getString(1219), stringUtil.getString(1030));
                }
            });
        });
        btn2.setPosition(cc.winSize.width / 4 * 3, buttonBaseY);
        this.addChild(btn2);
        btn2.setName("btn_2");

        if (cc.sys.os == cc.sys.OS_ANDROID) {
            btn1.setPosition(cc.winSize.width / 3, buttonBaseY);
            btnTest.setPosition(cc.winSize.width / 3 * 2, buttonBaseY);
            btn2.setVisible(false);
        }

        var showPayDialogFromOuter = function () {
            if (!self.opt) {
                return;
            }
            cc.log(JSON.stringify(self.opt));
            uiUtil.showPayDialog(self.opt.purchaseId, function () {
                utils.pay(self.opt.purchaseId, self, self.onPayResult);
            }, self);
        };

        var nonExchangeData = data.filter(function (purchaseId) {
            return !PurchaseService.isExchangePurchase(purchaseId);
        });
        var hasSdkPurchases = nonExchangeData.length > 0;
        if (!hasSdkPurchases) {
            // 当前商品全部走成就点购买，隐藏“恢复购买”按钮。
            btn2.setVisible(false);
            btn1.setPosition(cc.winSize.width / 3, buttonBaseY);
            btnTest.setPosition(cc.winSize.width / 3 * 2, buttonBaseY);
        }

        if (hasSdkPurchases) {
            utils.updatePayInfo(this, function (err) {
                if (!err) {
                    nonExchangeData.forEach(function (purchaseId) {
                        var payNode = self.nodeMap[purchaseId];
                        if (!payNode) {
                            return;
                        }
                        self._updateNodePrice(purchaseId, payNode);
                    });
                }
                showPayDialogFromOuter();
            }, nonExchangeData);
        } else {
            showPayDialogFromOuter();
        }
    },
    onPayResult: function (purchaseId, payResult) {
        var result = PurchaseService.applyPurchaseResult(purchaseId, payResult);

        if (result.isSuccess) {
            return;
        }

        if (result.isExchangePurchase) {
            this._showExchangeFailedTip(payResult);
        } else if (result.failedReason === "INSUFFICIENT_POINTS") {
            uiUtil.showTip("成就点不足!");
        }
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
