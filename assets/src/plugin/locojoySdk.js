/**
 * Created by lancelot on 15/7/1.
 */

var locojoySdk = {
    pay: function (purchaseId, payCb) {
        var productId = PurchaseList[purchaseId].productId;
        var currencyCode = PurchaseList[purchaseId].currencyCode;
        var self = this;
        cc.async.waterfall([
            function (cb) {
                CommonUtil.initLocojoySdk(self, function (initState) {
                    if (initState == 1) {
                        cb(null);
                    } else {
                        cb("init failed");
                    }
                });
            },
            function (cb) {
                CommonUtil.locojoySdkLogin(self, function (loginState, accountID) {
                    if (loginState == 3) {
                        if (accountID) {
                            cc.sys.localStorage.setItem("AccountId", accountID);
                            CommonUtil.ljOnLogin(accountID, Record.getUUID(), Record.getUsername() || Record.getUUID(), "1101011001");
                        }
                        cb(null);
                    } else {
                        cb("login failed");
                    }
                });
            },
            function (cb) {
                CommonUtil.locojoySdkPay(productId, null, self, function (payState, money, order, productId) {
                    if (payState == 100) {
                        DataLog.genPayLog(true, money, order, productId, currencyCode);

                        CommonUtil.tdOnChargeRequest(order, productId, money / 100, currencyCode, 1, 'locojoySDK');
                        CommonUtil.tdOnChargeSuccess(order);

                        CommonUtil.tdOnPurchase(productId, 1, 0);
                        CommonUtil.tdOnUse(productId, 1);

                        var accountId = "" + DataLog.getChannelUserId();
                        CommonUtil.ljOnPay(accountId, Record.getUUID(), Record.getUsername() || Record.getUUID(), "1101011001", order, "1", productId, money / 100);

                        cb(null);
                    } else {
                        DataLog.genPayLog(false, money || "", order || "", productId || "", currencyCode);
                        cb("pay failed");
                    }
                });
            }
        ], payCb);
    }
};
