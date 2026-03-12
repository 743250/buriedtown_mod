/**
 * Created by lancelot on 15/9/21.
 */
var PurchaseAndroid = {

    PAY_TYPE_TEST: "test",
    PAY_TYPE_AIYOUXI: "aiyouxi",
    PAY_TYPE_GOOGLE_PLAY: "googleplay",
    PAY_TYPE_UNI: "uni",
    PAY_TYPE_HEYOUXI: "heyouxi",
    PAY_TYPE_OPERATOR: "operator",
    PAY_TYPE_BAIDU: "baidu",
    PAY_TYPE_UC: "uc",
    PAY_TYPE_QIHU: "qihu",
    PAY_TYPE_XIAOMI: "xiaomi",
    PAY_TYPE_M4399: "m4399",
    PAY_TYPE_LITE: "lite",
    PAY_TYPE_WDJ: "wdj",
    PAY_TYPE_TENCENT: "tencent",

    init: function (payType, obj) {
        this.payType = payType;
        if (typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.isPaySdkBypassedForTest === "function"
            && PurchaseService.isPaySdkBypassedForTest()) {
            return;
        }
        jsb.reflection.callStaticMethod("net/dice7/pay/PayHelper", "init", "(Ljava/lang/String;)V", JSON.stringify(obj));
    },

    pay: function (obj) {
        jsb.reflection.callStaticMethod("net/dice7/pay/PayHelper", "pay", "(Ljava/lang/String;)V", JSON.stringify(obj));
    },

    onPayResult: function (result) {
        cc.e(JSON.stringify(result));
        var obj = SafetyHelper.safeJSONParse(result, null, "PurchaseAndroid.onPayResult");
        if (!obj) {
            return;
        }

        switch (PurchaseAndroid.payType) {
            case PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY :
                PurchaseTaskManager.getActiveTask().onPayResult(obj, obj.errorCode);
                break;
            case PurchaseAndroid.PAY_TYPE_UC:
            case PurchaseAndroid.PAY_TYPE_QIHU:
            case PurchaseAndroid.PAY_TYPE_XIAOMI:
            case PurchaseAndroid.PAY_TYPE_BAIDU:
            case PurchaseAndroid.PAY_TYPE_WDJ:
            case PurchaseAndroid.PAY_TYPE_TENCENT:
                PurchaseTaskManager.getActiveTask().onPayResult(obj);
                break
            default:
                PurchaseTaskManager.getActiveTask().onPayResult(obj.payRes, obj);
        }
    },

    exitGame: function (obj) {
        jsb.reflection.callStaticMethod("net/dice7/pay/PayHelper", "exitGame", "()V");
    },

    onGameExit: function (result) {
        cc.e(JSON.stringify(result));
        var obj = SafetyHelper.safeJSONParse(result, {}, "PurchaseAndroid.onGameExit");
        switch (this.payType) {
            case this.PAY_TYPE_UNI:
            case this.PAY_TYPE_GOOGLE_PLAY:
            case this.PAY_TYPE_LITE:
            case this.PAY_TYPE_TENCENT:
            case this.PAY_TYPE_M4399:
            case this.PAY_TYPE_WDJ:
            case this.PAY_TYPE_XIAOMI:
            case this.PAY_TYPE_QIHU:
            case this.PAY_TYPE_OPERATOR:
                this.showExitDialog(function () {
                    cc.director.end();

                });
                break;
            default:
                cc.director.end();
        }
    },

    moreGame: function (obj) {
        jsb.reflection.callStaticMethod("net/dice7/pay/PayHelper", "moreGame", "()V");
    },

    getPurchaseList: function (purchaseIdList, cb) {
        this.getPurchaseListCb = cb;
        if (this.payType && this.payType === this.PAY_TYPE_GOOGLE_PLAY) {
            jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/GooglePlayPlugin", "queryPurchaseInfo", "(Ljava/lang/String;)V", JSON.stringify(purchaseIdList));
        } else {
            this.onPurchaseInfo(null)
        }
    },
    onPurchaseInfo: function (result) {
        if (result) {
            cc.e(JSON.stringify(result));
            var obj = SafetyHelper.safeJSONParse(result, null, "PurchaseAndroid.onPurchaseInfo");
            if (!obj) {
                this.getPurchaseListCb({errorCode: 1, msg: 'parse purchase info failed'});
                return;
            }
            if (obj.statusCode == 1) {
                this.getPurchaseListCb(null, obj);
            } else {
                this.getPurchaseListCb(obj);
            }
        } else {
            this.getPurchaseListCb({errorCode: 1, msg: 'not google play'});
        }
    },

    showAboutDialog: function () {
        var config = {
            title: {title: "关于"},
            content: {},
            action: {btn_1: {txt: "确定"}}
        };
        var dialog = new DialogBig(config);
        var content = dialog.contentNode;

        var nameLabel = new cc.LabelTTF("名称:", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        nameLabel.anchorX = 0;
        nameLabel.anchorY = 1;
        nameLabel.x = dialog.leftEdge;
        nameLabel.y = content.height - 10;
        nameLabel.setColor(cc.color.BLACK);
        content.addChild(nameLabel);
        var name = new cc.LabelTTF("死亡日记L版", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        name.anchorX = 0;
        name.anchorY = 1;
        name.x = nameLabel.x + nameLabel.width + 10;
        name.y = nameLabel.y;
        name.setColor(cc.color.BLACK);
        content.addChild(name);

        var typeLabel = new cc.LabelTTF("类型:", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        typeLabel.anchorX = 0;
        typeLabel.anchorY = 1;
        typeLabel.x = dialog.leftEdge;
        typeLabel.y = nameLabel.y - nameLabel.height - 10;
        typeLabel.setColor(cc.color.BLACK);
        content.addChild(typeLabel);
        var type = new cc.LabelTTF("策略 探险", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        type.anchorX = 0;
        type.anchorY = 1;
        type.x = typeLabel.x + typeLabel.width + 10;
        type.y = typeLabel.y;
        type.setColor(cc.color.BLACK);
        content.addChild(type);

        var companyLabel = new cc.LabelTTF("公司:", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        companyLabel.anchorX = 0;
        companyLabel.anchorY = 1;
        companyLabel.x = dialog.leftEdge;
        companyLabel.y = typeLabel.y - typeLabel.height - 10;
        companyLabel.setColor(cc.color.BLACK);
        content.addChild(companyLabel);
        var company = new cc.LabelTTF("乐动卓越", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        company.anchorX = 0;
        company.anchorY = 1;
        company.x = companyLabel.x + companyLabel.width + 10;
        company.y = companyLabel.y;
        company.setColor(cc.color.BLACK);
        content.addChild(company);

        var customerLabel = new cc.LabelTTF("客服电话:", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        customerLabel.anchorX = 0;
        customerLabel.anchorY = 1;
        customerLabel.x = dialog.leftEdge;
        customerLabel.y = companyLabel.y - companyLabel.height - 10;
        customerLabel.setColor(cc.color.BLACK);
        content.addChild(customerLabel);
        var customer = new cc.LabelTTF("0535-3941000", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        customer.anchorX = 0;
        customer.anchorY = 1;
        customer.x = customerLabel.x + customerLabel.width + 10;
        customer.y = customerLabel.y;
        customer.setColor(cc.color.BLACK);
        content.addChild(customer);

        var declareLabel = new cc.LabelTTF("免责声明:", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        declareLabel.anchorX = 0;
        declareLabel.anchorY = 1;
        declareLabel.x = dialog.leftEdge;
        declareLabel.y = customerLabel.y - customerLabel.height - 10;
        declareLabel.setColor(cc.color.BLACK);
        content.addChild(declareLabel);
        var declare = new cc.LabelTTF("本游戏版权归乐动卓越所有，游戏中的文字、图片等内容均为游戏版权所有者的个人态度或立场，炫彩互动（中国电信）对此不承担任何法律责任。", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(dialog.rightEdge - dialog.leftEdge - declareLabel.width - 10));
        declare.anchorX = 0;
        declare.anchorY = 1;
        declare.x = declareLabel.x + declareLabel.width + 10;
        declare.y = declareLabel.y;
        declare.setColor(cc.color.BLACK);
        content.addChild(declare);

        var versionLabel = new cc.LabelTTF("版本号:", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        versionLabel.anchorX = 0;
        versionLabel.anchorY = 1;
        versionLabel.x = dialog.leftEdge;
        versionLabel.y = declare.y - declare.height - 10;
        versionLabel.setColor(cc.color.BLACK);
        content.addChild(versionLabel);
        var version = new cc.LabelTTF(ClientData.CLIENT_VERSION, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        version.anchorX = 0;
        version.anchorY = 1;
        version.x = versionLabel.x + versionLabel.width + 10;
        version.y = versionLabel.y;
        version.setColor(cc.color.BLACK);
        content.addChild(version);

        dialog.show();
    },

    showExitDialog: function (cb) {
        var config = {
            title: {},
            content: {},
            action: {btn_1: {}, btn_2: {}}
        };
        config.content.des = stringUtil.getString(1259);
        config.action.btn_2.txt = stringUtil.getString(1030);
        config.action.btn_2.target = null;
        config.action.btn_2.cb = cb;

        config.action.btn_1.txt = stringUtil.getString(1031);
        config.action.btn_1.cb = null;

        var dialog = new DialogTiny(config);
        dialog.show();
    }
};
