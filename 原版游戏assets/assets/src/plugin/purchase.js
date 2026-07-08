var Purchase = cc.Class.extend({
    ctor: function () {
        var pluginManager = plugin.PluginManager.getInstance();
        this.PluginIAP = pluginManager.loadPlugin("IOSIAP");
        this.PluginIAP.setListener(this);

        this.PluginIAP.callFuncWithParam("setServerMode");
    },
    getPurchaseList: function (pidList, cb) {
        this.getPurchaseListCb = cb;
        if (this.product) {
            this.getPurchaseListCb(null, this.product);
            return;
        }
        this.PluginIAP.callFuncWithParam("requestProducts", plugin.PluginParam(plugin.PluginParam.ParamType.TypeString, pidList.toString()));
    },
    onRequestProductResult: function (ret, productInfo) {
        if (ret == plugin.ProtocolIAP.RequestProductCode.RequestFail) {
            this.getPurchaseListCb({msg: "request error"});
        } else if (ret == plugin.ProtocolIAP.RequestProductCode.RequestSuccess) {
            this.product = productInfo
            if (this.getPurchaseListCb) {
                this.getPurchaseListCb(null, this.product);
            }
        }
    },
    pay: function (productId) {
        this.PluginIAP.payForProduct({productId: productId});
    },
    onPayResult: function (ret, msg, productInfo) {
        var result = 0;
        if (ret == plugin.ProtocolIAP.IAPResult.PaymentTransactionStatePurchased || ret == plugin.ProtocolIAP.PayResultCode.PaySuccess) {
            result = 1;
        } else if (ret == plugin.ProtocolIAP.IAPResult.PaymentTransactionStateRestored) {
            if (this.restoreCb) {
                this.restoreCb({result: 1, productId: msg});
            }
            return;
        }
        PurchaseTaskManager.getActiveTask().onPayResult(result, msg, ret);
    },
    restoreIAP: function (restoreCb) {
        this.PluginIAP.callFuncWithParam("restoreCompletedTransactions")
        this.restoreCb = restoreCb;
    }
});

if (cc.sys.isNative && cc.sys.os == cc.sys.OS_IOS) {
    cc.purchase = new Purchase();
}
