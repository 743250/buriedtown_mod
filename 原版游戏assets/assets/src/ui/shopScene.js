/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */
var ShopLayer = cc.Layer.extend({
    ctor: function (opt) {
        this._super();
        this.opt = opt;

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
        this._super();
    },

    onEnter: function () {
        this._super();

        this.nodeMap = {};
        var NODE_WIDTH = 246;
        var NODE_HEIGHT = 249;
        var widthPadding = (cc.winSize.width - 2 * NODE_WIDTH ) / 3;
        var heightPadding = 10;

        var data = [108, 109, 101, 102, 103, 104, 105, 106, 107];
        var row = Math.ceil(data.length / 2);

        var totalHeight = NODE_HEIGHT * row + ( heightPadding * (row - 1));

        var mycontainer = new cc.Layer();
        var scrollView = new cc.ScrollView(cc.size(cc.winSize.width - 2 * widthPadding, (NODE_HEIGHT + heightPadding) * 4 - 30), mycontainer);
        scrollView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        scrollView.setBounceable(false);
        scrollView.setClippingToBounds(true);
        scrollView.x = widthPadding;
        scrollView.y = 100;
        this.addChild(scrollView);
        scrollView.setContentSize(scrollView.getViewSize().width, totalHeight);
        var offset = scrollView.getContentOffset();
        offset.y = scrollView.getViewSize().height - totalHeight;
        scrollView.setContentOffset(offset);

        var self = this;
        data.forEach(function (purchaseId, index) {
            var payNode = uiUtil.createPayItemNode(purchaseId, self, self.onPayResult);
            payNode.anchorX = 0;
            payNode.anchorY = 1;
            payNode.x = (index % 2) * (widthPadding + NODE_WIDTH);
            payNode.y = totalHeight - Math.floor(index / 2) * (heightPadding + NODE_HEIGHT);
            mycontainer.addChild(payNode);
            self.nodeMap[purchaseId] = payNode;
        });

        var btn1 = uiUtil.createCommonBtnWhite(stringUtil.getString(1193), this, function () {
            if (self.opt) {
                cc.director.popScene();
            } else {
                cc.director.runScene(new MenuScene());
            }
        });
        btn1.setPosition(cc.winSize.width / 4, 60);
        this.addChild(btn1);
        btn1.setName("btn_1");

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
                    IAPPackage.onIAPPaied(purchaseId);
                    self.nodeMap[purchaseId].updateStatus();
                    //CommonUtil.showCommonDialog(stringUtil.getString(1218), stringUtil.getString(1030));
                } else {
                    CommonUtil.showCommonDialog(stringUtil.getString(1219), stringUtil.getString(1030));
                }
            });
        });
        btn2.setPosition(cc.winSize.width / 4 * 3, 60);
        this.addChild(btn2);
        btn2.setName("btn_2");

        if (cc.sys.os == cc.sys.OS_ANDROID) {
            btn1.setPosition(cc.winSize.width / 2, 60);
            btn2.setVisible(false);
        }

        utils.updatePayInfo(this, function (err) {
            if (!err) {
                for (var purchaseId in self.nodeMap) {
                    var payNode = self.nodeMap[purchaseId];
                    var purchaseConfig = IAPPackage.getPurchaseConfig(purchaseId);
                    var priceStr = purchaseConfig.productPriceStr;
                    if (priceStr) {
                        payNode.updatePrice(priceStr);
                    } else {
                        payNode.updatePrice(stringUtil.getString(1191, purchaseConfig.price));
                    }
                    payNode.updateStatus();
                }
            }

            //从外部来
            if (self.opt) {
                cc.log(JSON.stringify(self.opt))
                uiUtil.showPayDialog(self.opt.purchaseId, function () {
                    utils.pay(self.opt.purchaseId, self, self.onPayResult);
                });
            }
        }, [101, 102, 103, 104, 105, 106, 107, 108, 109]);

    },
    onPayResult: function (purchaseId, payResult) {
        if (payResult == 1) {
            var payNode = this.nodeMap[purchaseId];
            payNode.updateStatus();

            var purchaseConfig = IAPPackage.getPurchaseConfig(purchaseId);
            var priceStr = purchaseConfig.productPriceStr;
            if (priceStr) {
                payNode.updatePrice(priceStr);
            } else {
                payNode.updatePrice(stringUtil.getString(1191, purchaseConfig.price));
            }
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
