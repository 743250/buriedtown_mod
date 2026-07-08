/**
 * Created by lancelot on 15/4/23.
 */
/**
 * Created by lancelot on 15/4/22.
 */
var ShopNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);

        //var subTitle = new cc.LabelTTF(cc.formatStr('(%s)', stringUtil.getString(1245)), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(330, 0));
        //subTitle.anchorX = 1;
        //subTitle.x = this.bgRect.width; //this.title.x + this.title.width / 2 + 10;
        //subTitle.y = this.actionBarBaseHeight;
        //subTitle.setColor(cc.color.RED);
        //this.bg.addChild(subTitle);

        //this.title.setPositionX(this.title.width / 2 + this.leftBtn.x + this.leftBtn.width / 2 + 10);

    },
    _init: function () {
        this.setName(Navigation.nodeName.SHOP_NODE);
        this.uiConfig = {
            title: stringUtil.getString(1216),
            leftBtn: true,
            rightBtn: false
        };

        this.nodeMap = {};
        var NODE_WIDTH = 246;
        var NODE_HEIGHT = 249;
        var widthPadding = (this.bgRect.width - 20 - 2 * NODE_WIDTH ) / 3;
        var heightPadding = 5;
        //var data = [201, 202, 203, 204, 205];
        var data = [201, 202, 204, 205];
        var randomPack = Record.restore('randomPack');
        if (randomPack === 1) {
            data.push(206);
        } else {
            data.push(207);
        }
        var self = this;
        data.forEach(function (purchaseId, index) {
            var payNode = uiUtil.createPayItemNode(purchaseId, self, self.onPayResult);
            payNode.anchorX = 0;
            payNode.anchorY = 1;
            payNode.x = widthPadding + (index % 2) * (widthPadding + NODE_WIDTH) + 10;
            payNode.y = self.contentTopLineHeight - ( Math.floor(index / 2) * (heightPadding + NODE_HEIGHT) + 5);
            self.bg.addChild(payNode);
            self.nodeMap[purchaseId] = payNode;
        });

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
        }, [201, 202, 204, 205, 206, 207]);
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
    },

    onClickLeftBtn: function () {
        this.back();
    },
    onClickRightBtn: function () {
    },
    onEnter: function () {
        this._super();
        cc.timer.pause();
    },
    onExit: function () {
        this._super();
        cc.timer.resume();
    }
});