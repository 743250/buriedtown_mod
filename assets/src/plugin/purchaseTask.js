/**
 * Created by lancelot on 15/8/17.
 */
var VALIDATE_ERROR = 70001;
var PurchaseTaskManager = {
    _activeTask: null,
    newTask: function (purchaseId) {
        if (cc.sys.isNative && cc.sys.os == cc.sys.OS_IOS) {
            this._activeTask = new PurchaseTask(purchaseId);
        } else {
            switch (PurchaseAndroid.payType) {
                case PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY:
                    this._activeTask = new PurchaseTaskAndroidGooglePlay(purchaseId);
                    break;
                case PurchaseAndroid.PAY_TYPE_UC:
                    this._activeTask = new PurchaseTaskAndroidUC(purchaseId);
                    break;
                case PurchaseAndroid.PAY_TYPE_QIHU:
                    this._activeTask = new PurchaseTaskAndroidQIHU(purchaseId);
                    break;
                case PurchaseAndroid.PAY_TYPE_XIAOMI:
                    this._activeTask = new PurchaseTaskAndroidXiaomi(purchaseId);
                    break;
                case PurchaseAndroid.PAY_TYPE_LITE:
                    this._activeTask = new PurchaseTaskAndroidLite(purchaseId);
                    break;
                case PurchaseAndroid.PAY_TYPE_TENCENT:
                    this._activeTask = new PurchaseTaskAndroidTencent(purchaseId);
                    break;
                case PurchaseAndroid.PAY_TYPE_BAIDU:
                    this._activeTask = new PurchaseTaskAndroidBaidu(purchaseId);
                    break;
                case PurchaseAndroid.PAY_TYPE_WDJ:
                    this._activeTask = new PurchaseTaskAndroidWdj(purchaseId);
                    break;
                default:
                    this._activeTask = new PurchaseTaskAndroid(purchaseId);
            }
        }
        return this._activeTask;
    },
    getActiveTask: function () {
        return this._activeTask;
    }
};

var PurchaseTaskState = {
    NONE: 0,
    SDK_PAY_SUCCESS: 1,
    NETWORK_VALIDATE: 2,
    NETWORK_VALIDATE_CALLBACK: 3
};

var PurchaseTask = cc.Class.extend({
    ctor: function (purchaseId, step) {
        this.purchaseId = purchaseId;
        this.step = step || PurchaseTaskState.NONE;
        this.purchaseConfig = PurchaseService.getPurchaseConfig(purchaseId);
        this.reConnectTimes = 0;
    },
    changeStep: function (step) {
        this.step = step;
    },
    onPurchaseResult: function (result) {
        // PurchaseService applies unlock/consumable side effects from the final callback.
        this.result = result;
    },
    pay: function () {
        if (this.beforePay) {
            this.beforePay();
        }

        cc.purchase.pay(this.purchaseConfig.productId);
    },
    onPayResult: function (result, msg, errorCode) {

        var productId = this.purchaseConfig.productId;
        if (result == 1) {
            //苹果支付成功,task完成第一步,此时才需要处理漏单
            this.changeStep(PurchaseTaskState.SDK_PAY_SUCCESS);
            //缓存凭证
            this.receiptdata = msg;
            this.paymentValidate(msg, productId, this.onPaymentValidateResult);
        } else {
            this.payLog(0, null, null, errorCode);
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 0);
            }
        }

    },
    payLog: function (result, order, productId, errorCode) {
        var productId = productId || this.purchaseConfig.productId;
        var currencyCode = this.purchaseConfig.currencyCode;
        var price = this.purchaseConfig.price;

        if (result == 1) {
            DataLog.genPayLog(result, price * 100, order, productId, currencyCode, errorCode);

            CommonUtil.tdOnChargeRequest(order, productId, price, currencyCode, 1, ClientData.CHANNEL);
            CommonUtil.tdOnChargeSuccess(order);

            CommonUtil.tdOnPurchase(productId, 1, 0);
            CommonUtil.tdOnUse(productId, 1);

            if (cc.sys.isNative && cc.sys.os == cc.sys.OS_IOS) {
                CommonUtil.afOnPurchase(productId, price, currencyCode);
            }
        } else {
            DataLog.genPayLog(result, price * 100, order || "", productId, currencyCode, errorCode);
        }
    },
    paymentValidate: function (receiptdata, productId, cb) {
        var currencyCode = this.purchaseConfig.currencyCode;
        var price = this.purchaseConfig.price;

        var requestData = {};
        requestData.userid = Record.getUUID();
        requestData.uin = cc.sys.localStorage.getItem("AccountId") || "";
        requestData.gameid = 149;
        requestData.gameserverid = "1101011001";
        requestData.productid = productId;
        requestData.receiptdata = receiptdata;
        requestData.channelid = "114900100";
        requestData.paymoney = price;
        requestData.currency = currencyCode;
        if (Number(CommonUtil.getOSVersion()) < 7) {
            requestData.mac = CommonUtil.macAddress();
        } else {
            requestData.idfa = CommonUtil.getIDFA();
        }
        var uuid = requestData.mac || requestData.idfa;
        var signStr = requestData.userid + requestData.uin + requestData.gameid + requestData.gameserverid + requestData.productid + uuid
            + requestData.receiptdata + requestData.channelid + requestData.paymoney + requestData.currency;
        requestData.sign = this.sign(signStr);
        requestData.receiptdata = this.UrlEncode(receiptdata);
        requestData.country = CommonUtil.getLocaleCountryCode();

        cc.log("requestData: " + JSON.stringify(requestData));
        var url = "http://berrytown.paycallback.locojoy.com/paymentvalidateappstore.api";
        this.request(url, requestData, cb);
    },
    onPaymentValidateResult: function (res) {
        var state;
        if (res.errorcode == 1) {
            state = 1;
            this.payLog(state, res.apporderid);
        } else {
            state = 0;
            this.payLog(state, res.apporderid, null, VALIDATE_ERROR);
        }

        this.onPurchaseResult(state);

        //完成验证
        this.changeStep(PurchaseTaskState.NETWORK_VALIDATE);

        //支付成功的回调
        if (this.afterPay) {
            this.afterPay(this.purchaseId, state);
        }

        this.apporderid = res.apporderid;
        this.validateState = state;
        this.paymentCallback(res.apporderid, state, this.onPaymentCallbackResult);
    },
    paymentCallback: function (apporderid, state, cb) {
        var requestData = {};
        requestData.apporderid = apporderid
        requestData.state = state;
        var signStr = requestData.apporderid + requestData.state;
        requestData.sign = this.sign(signStr);

        var url = "http://berrytown.paycallback.locojoy.com/paymentappstorecallback.api";
        this.request(url, requestData, cb);
    },
    onPaymentCallbackResult: function (res) {
        //完成支付通知
        this.changeStep(PurchaseTaskState.NETWORK_VALIDATE_CALLBACK);
    },
    //发生在网络异常时,比如没有网络连接,超时
    onNetworkException: function () {
        cc.log('onNetworkException');
        //网络异常,该任务加入缓存列表中
        if (this.reConnectTimes < 3) {
            cc.director.getScheduler().scheduleCallbackForTarget(this, function () {
                if (this.step == PurchaseTaskState.SDK_PAY_SUCCESS) {
                    this.paymentValidate(this.receiptdata, this.purchaseConfig.productId, this.onPaymentValidateResult);
                } else if (this.step == PurchaseTaskState.NETWORK_VALIDATE) {
                    this.paymentCallback(this.apporderid, this.validateState, this.onPaymentCallbackResult);
                }
                this.reConnectTimes++;
            }, 2, 0, 0);
            return true;
        } else {
            this.reConnectTimes = 0;
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 0);
            }
            return false;
        }
    },
    signKey: "d80bef6c68bd41938e93ec7aa20d8b8f",
    sign: function (str) {
        cc.v('sign ' + this.signKey);
        return this.md5(str + this.signKey);
    },
    md5: function (str) {
        return CommonUtil.md5HexDigest(str);
    },
    request: function (url, requestData, cb) {
        var self = this;
        var rd = "";
        for (var key in requestData) {
            rd += key;
            rd += '=';
            rd += requestData[key];
            rd += '&';
        }
        rd = rd.substr(0, rd.length - 1);
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
        xhr.onreadystatechange = function () {
            var res;
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status <= 207)) {
                var response = xhr.responseText;
                cc.i("response:" + response);

                res = SafetyHelper.safeJSONParse(response, {statusCode: 300}, "purchaseTask.requestData");
            } else {
                res = {statusCode: 300};
                CommonUtil.tdOnPayFailed(self.step, 1, xhr.status, requestData.apporderid, CommonUtil.getMetaDataInt("channelId"));
                if (self.onNetworkException()) {
                    return;
                }
            }
            if (cb) {
                cb.call(self, res);
            }
        };
        xhr.onerror = function () {
            CommonUtil.tdOnPayFailed(self.step, 2, "0", requestData.apporderid, CommonUtil.getMetaDataInt("channelId"));
            self.onNetworkException();
        };
        xhr.timeout = 30000;
        xhr.ontimeout = function () {
            self.onNetworkException();
            CommonUtil.tdOnPayFailed(self.step, 3, "0", requestData.apporderid, CommonUtil.getMetaDataInt("channelId"));
        };
        xhr.send(rd);
    },
    UrlEncode: function (str) {
        var ret = "";
        var strSpecial = "!\"#$%&'()*+,/:;<=>?[]^`{|}~%";
        var tt = "";

        for (var i = 0; i < str.length; i++) {
            var chr = str.charAt(i);
            var c = this.str2asc(chr);
            tt += chr + ":" + c + "n";
            if (parseInt("0x" + c) > 0x7f) {
                ret += "%" + c.slice(0, 2) + "%" + c.slice(-2);
            } else {
                if (chr == " ")
                    ret += "+";
                else if (strSpecial.indexOf(chr) != -1)
                    ret += "%" + c.toString(16);
                else
                    ret += chr;
            }
        }
        return ret;
    },
    str2asc: function (strstr) {
        return ("0" + strstr.charCodeAt(0).toString(16)).slice(-2);
    }

});

var PurchaseTaskAndroid = PurchaseTask.extend({
    ctor: function (purchaseId, step) {
        this._super(purchaseId, step);
    },
    pay: function () {
        if (this.beforePay) {
            this.beforePay();
        }
        cc.v("purchaseid is " + this.purchaseId);

        var purchaseConfig = PurchaseService.getPurchaseConfig(this.purchaseId);
        PurchaseAndroid.pay({
            purchaseId: this.purchaseId,
            priceIndex: purchaseConfig.priceIndex,
            price: purchaseConfig.price,
            title: stringUtil.getString('p_' + this.purchaseId).name,
            consumed: this.purchaseId > 200
        })
    },
    createAppOrderId: function () {
        var orderid = "" + new Date().getTime();
        for (var i = 0; i < 5; i++) {
            orderid += utils.getRandomInt(0, 9);
        }
        return orderid;
    },
    onPayResult: function (result, data) {
        cc.v("onPayResult " + result);
        cc.v("onPayResult " + JSON.stringify(data));
        if (result == 1) {
            cc.v("purchaseTask  success");
            this.onPurchaseResult(1)
            this.payLog(result, this.createAppOrderId(), data.productId);
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 1);
            }
        } else {
            cc.v("purchaseTask  failed");
            this.payLog(result, null, null, data.errorCode);
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 0);
            }
        }

    }
});

var PurchaseTaskAndroidLite = PurchaseTask.extend({
    ctor: function (purchaseId, step) {
        this._super(purchaseId, step);
    },
    pay: function () {
        if (this.beforePay) {
            this.beforePay();
        }
        cc.v("purchaseid is " + this.purchaseId);

        this.onPayResult(1);
    },
    onPayResult: function (result, msg) {
        cc.v("onPayResult " + result)
        if (result == 1) {
            this.onPurchaseResult(1)
            //this.payLog(1, "");
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 1);
            }
        } else {
            //this.payLog(0);
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 0);
            }
        }

    },
})

var PurchaseTaskAndroidGooglePlay = PurchaseTaskAndroid.extend({
    purchaseIdMap: {
        101: ["gp_huozhe_nc1"],
        102: ["gp_huozhe_nc2"],
        103: ["gp_huozhe_nc3"],
        104: ["gp_huozhe_nc4"],
        105: ["gp_huozhe_nc5"],
        106: ["gp_huozhe_nc8"],
        107: ["gp_huozhe_nc7"],
        108: ["gp_huozhe_nc9"],//TODO MrC
        109: ["gp_huozhe_nc10"],//TODO MrC
        201: ["gp_huozhe_c1", "gp_huozhe_c6", "gp_huozhe_c11"],
        202: ["gp_huozhe_c2", "gp_huozhe_c7", "gp_huozhe_c12"],
        203: ["gp_huozhe_c3", "gp_huozhe_c8", "gp_huozhe_c13"],
        204: ["gp_huozhe_c4", "gp_huozhe_c9", "gp_huozhe_c14"],
        205: ["gp_huozhe_c5", "gp_huozhe_c10", "gp_huozhe_c15"],
        206: ["gp_huozhe_c16"],
        207: ["gp_huozhe_c17"],
        208: ["gp_huozhe_c18", "gp_huozhe_c28"],
        209: ["gp_huozhe_c19", "gp_huozhe_c29"]
    },
    ctor: function (purchaseId, step) {
        this._super(purchaseId, step);
    },

    onPayResult: function (obj, msg) {
        var result = obj.payRes;
        cc.v("onPayResult google " + JSON.stringify(result))

        var purchaseConfig = PurchaseService.getPurchaseConfig(this.purchaseId);
        var productId = this.purchaseIdMap[this.purchaseId][purchaseConfig.priceIndex];
        if (result == 1) {
            //google支付成功,task完成第一步,此时才需要处理漏单
            this.changeStep(PurchaseTaskState.SDK_PAY_SUCCESS);
            //缓存凭证
            this.receiptdata = JSON.stringify(obj.signedData);
            this.signature = obj.signature;
            this.paymentValidate(this.receiptdata, this.signature, productId, this.onPaymentValidateResult);
        } else {
            this.payLog(result, "", productId, obj.errorCode);
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 0);
            }
        }

    },
    paymentValidate: function (receiptdata, signture, productId, cb) {
        var currencyCode = this.purchaseConfig.currencyCode;
        var price = this.purchaseConfig.price;

        var requestData = {};
        requestData.userid = Record.getUUID();
        requestData.uin = cc.sys.localStorage.getItem("AccountId") || "";
        requestData.gameid = 149;
        requestData.gameserverid = DataLog.getServerId();
        requestData.productid = productId;
        requestData.receiptdata = receiptdata;
        requestData.signture = signture;
        requestData.channelid = ClientData.CHANNEL;
        requestData.paymoney = price;
        requestData.currency = currencyCode;
        requestData.mac = CommonUtil.getUUID();

        var signStr = requestData.userid + requestData.uin + requestData.gameid + requestData.gameserverid + requestData.productid + requestData.mac
            + requestData.receiptdata + requestData.signture + requestData.channelid + requestData.paymoney + requestData.currency;
        requestData.sign = this.sign(signStr);
        requestData.receiptdata = this.UrlEncode(receiptdata);
        receiptdata.signture = this.UrlEncode(signture);
        requestData.country = CommonUtil.getLocaleCountryCode();

        cc.v("requestData1 " + JSON.stringify(requestData).substring(0, 900));
        cc.v("requestData2 " + JSON.stringify(requestData).substring(900));
//        var url = "http://42.62.75.247:8038/paymentvalidategoogleplay.api";
        var url = "http://berrytown.paycallback.locojoy.com/paymentvalidategoogleplay.api";
        this.request(url, requestData, cb);
        /*------------------------------
        this.onPurchaseResult(1); //TODO MrC 取消支付校验
        //完成验证
        this.changeStep(PurchaseTaskState.NETWORK_VALIDATE);//TODO MrC
        //支付成功的回调
        if (this.afterPay) {
            this.afterPay(this.purchaseId, 1);//TODO MrC
        }
        this.changeStep(PurchaseTaskState.NETWORK_VALIDATE_CALLBACK); //TODO MrC
        //------------------------------End*/
    },
    onPaymentValidateResult: function (res) {
        var state;
        var purchaseConfig = PurchaseService.getPurchaseConfig(this.purchaseId);
        var productId = this.purchaseIdMap[this.purchaseId][purchaseConfig.priceIndex];
        if (res.errorcode == 1) {
            state = 1;
            this.payLog(1, res.apporderid, productId);
        } else {
            state = 0;
            this.payLog(0, res.apporderid, productId, VALIDATE_ERROR);
        }

        this.onPurchaseResult(state);

        //完成验证
        this.changeStep(PurchaseTaskState.NETWORK_VALIDATE);

        //支付成功的回调
        if (this.afterPay) {
            this.afterPay(this.purchaseId, state);
        }

        this.apporderid = res.apporderid;
        this.validateState = state;
        this.paymentCallback(res.apporderid, state, this.onPaymentCallbackResult);
    },
    paymentCallback: function (apporderid, state, cb) {
        var requestData = {};
        requestData.apporderid = apporderid
        requestData.state = state;
        var signStr = requestData.apporderid + requestData.state;
        requestData.sign = this.sign(signStr);

//        var url = "http://42.62.75.247:8038/paymentgoogleplaycallback.api";
        var url = "http://berrytown.paycallback.locojoy.com/paymentgoogleplaycallback.api";
        this.request(url, requestData, cb);
    },
    onPaymentCallbackResult: function (res) {
        //完成支付通知
        this.changeStep(PurchaseTaskState.NETWORK_VALIDATE_CALLBACK);
    },
    signKey: "e464f50c3bcf463180689c285fe98f13",
    onNetworkException: function () {
        var purchaseConfig = PurchaseService.getPurchaseConfig(this.purchaseId);
        var productId = this.purchaseIdMap[this.purchaseId][purchaseConfig.priceIndex];
        cc.log('onNetworkException');
        //网络异常,该任务加入缓存列表中
        if (this.reConnectTimes < 3) {
            cc.director.getScheduler().scheduleCallbackForTarget(this, function () {
                if (this.step == PurchaseTaskState.SDK_PAY_SUCCESS) {
                    this.paymentValidate(this.receiptdata, this.signature, productId, this.onPaymentValidateResult);
                } else if (this.step == PurchaseTaskState.NETWORK_VALIDATE) {
                    this.paymentCallback(this.apporderid, this.validateState, this.onPaymentCallbackResult);
                }
                this.reConnectTimes++;
            }, 2, 0, 0);
            return true;
        } else {
            this.reConnectTimes = 0;
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 0);
            }
            return false;
        }
    }
});
var PurchaseTaskAndroidVerify = PurchaseTaskAndroid.extend({
    ctor: function (purchaseId, step) {
        this._super(purchaseId, step);
        this.searchWaitTime = 3;
        this.searchedTimes = 0;
    },
    request: function (url, requestData, cb) {
        var self = this;
        var rd = "";
        for (var key in requestData) {
            rd += key;
            rd += '=';
            rd += requestData[key];
            rd += '&';
        }
        rd = rd.substr(0, rd.length - 1);
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("POST", url);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
        xhr.onreadystatechange = function () {
            var res;
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status <= 207)) {
                var response = xhr.responseText;
                cc.i("response:" + response);

                res = SafetyHelper.safeJSONParse(response, {statusCode: 300}, "purchaseTask.sendLog");
            } else {
                res = {statusCode: 300};
                CommonUtil.tdOnPayFailed(self.step, 1, xhr.status, requestData.apporderid, CommonUtil.getMetaDataInt("channelId"));
                if (self.onNetworkException()) {
                    return;
                }
            }
            if (cb) {
                cb.call(self, res);
            }
        };
        xhr.onerror = function () {
            CommonUtil.tdOnPayFailed(self.step, 2, "0", requestData.apporderid, CommonUtil.getMetaDataInt("channelId"));
            self.onNetworkException();
        };
        xhr.timeout = 30000;
        xhr.ontimeout = function () {
            self.onNetworkException();
            CommonUtil.tdOnPayFailed(self.step, 3, "0", requestData.apporderid, CommonUtil.getMetaDataInt("channelId"));
        };
        xhr.send(rd);
    },

    //发生在网络异常时,比如没有网络连接,超时
    onNetworkException: function () {
        cc.log('onNetworkException');
        //网络异常,该任务加入缓存列表中
        if (this.reConnectTimes < 3) {
            cc.director.getScheduler().scheduleCallbackForTarget(this, function () {
                if (this.step == PurchaseTaskState.SDK_PAY_SUCCESS) {
                    this.paymentSearch(this.payObj, this.onPaymentValidateResult);
                } else if (this.step == PurchaseTaskState.NETWORK_VALIDATE) {
                    this.paymentCallback(this.apporderid, this.validateState, this.onPaymentCallbackResult);
                }
                this.reConnectTimes++;
            }, 2, 0, 0);
            return true;
        } else {
            this.reConnectTimes = 0;
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 0);
            }
            return false;
        }
    },

    searchApi: "http://berrytown.cn.paycallback.locojoy.com/paymentcpsearch.api",
    updateApi: "http://berrytown.cn.paycallback.locojoy.com/paymentstatuscpupdate.api",
    pay: function () {
        if (this.beforePay) {
            this.beforePay();
        }
        var purchaseConfig = PurchaseService.getPurchaseConfig(this.purchaseId);
        var userInfo = [];
        userInfo.push("149");
        userInfo.push(DataLog.getServerId());
        userInfo.push(ClientData.CHANNEL);
        userInfo.push(Record.getUUID());
        userInfo.push(purchaseConfig.productId);
        userInfo.push(CommonUtil.getUUID());
        userInfo.push("");
        userInfo.push("");
        userInfo.push(CommonUtil.getLocaleCountryCode());
        userInfo.push(CommonUtil.deviceIPAddress());
        cc.log("purchase id is " + this.purchaseId);
        PurchaseAndroid.pay({
            purchaseId: this.purchaseId,
            productId: purchaseConfig["productId"],
            apporderid: this.createAppOrderId(),
            price: purchaseConfig["price"],
            title: stringUtil.getString('p_' + this.purchaseId).name,
            payInfoString: userInfo.join("|"),
            consumed: this.purchaseId > 200,
            priceIndex: purchaseConfig.priceIndex
        })
    },
    createAppOrderId: function () {
        var orderid = "" + new Date().getTime();
        orderid = orderid.substr(7, orderid.length);
        for (var i = 0; i < 5; i++) {
            orderid += utils.getRandomInt(0, 9);
        }
        return orderid;
    },
    onPayResult: function (obj, msg) {
        var result = obj.payRes;
        this.payObj = obj;
        if (result == 1) {
            this.changeStep(PurchaseTaskState.SDK_PAY_SUCCESS);

            //缓存凭证
            this.apporderid = obj.apporderid;

            //todo 直接发放
            this.paymentSearch(obj);
        } else {
            this.payLog(result, null, null, obj.errorCode);
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 0);
            }
        }
    },
    paymentSearch: function (payData) {
        var self = this;
        if (this.searchedTimes < 5) {
            cc.director.getScheduler().scheduleCallbackForTarget(this, function () {
                self.searchedTimes++;
                self.searchWaitTime += 1.5;
                var requestData = {};
                requestData.apporderid = payData.apporderid;
                requestData.sign = self.sign(payData.apporderid);
                self.request(this.searchApi, requestData, self.onPaymentValidateResult);
                cc.v("request data is " + JSON.stringify(requestData));
                cc.v("request url is " + this.searchApi);
            }, this.searchWaitTime, 0, 0);
        }

    },
    //奖励发放
    onPaymentValidateResult: function (res) {
        //未发货
        if (res.result == 0) {
            var state = 1;
            this.onPurchaseResult(state);
            this.payLog(state, res.apporderid);
            //完成验证
            this.changeStep(PurchaseTaskState.NETWORK_VALIDATE);
            //支付成功的回调
            if (this.afterPay) {
                this.afterPay(this.purchaseId, state);
            }

            this.apporderid = res.apporderid;
            this.validateState = state;
            this.paymentCallback(res.apporderid, state, this.onPaymentCallbackResult);
        } else if (res.result == 2) {
            this.paymentSearch({apporderid: res.apporderid});
        }
    },
    //发送支付结果
    paymentCallback: function (apporderid, state, cb) {
        var requestData = {};
        requestData.apporderid = apporderid;
        requestData.state = state;
        var signStr = requestData.apporderid + requestData.state;
        requestData.sign = this.sign(signStr);
        this.request(this.updateApi, requestData, cb);
    },
    onPaymentCallbackResult: function (res) {
        //完成支付通知
        if (res.result == 1) {
            this.changeStep(PurchaseTaskState.NETWORK_VALIDATE_CALLBACK);
        }
    },
    signKey: "e464f50c3bcf463180689c285fe98f13"
})


var PurchaseTaskAndroidUC = PurchaseTaskAndroidVerify.extend({
    ctor: function (purchaseId, step) {
        this._super(purchaseId, step);
    },
    paymentSearch: function (payData) {
        var self = this;
        var userInfo = [];
        userInfo.push("149");
        userInfo.push(DataLog.getServerId());
        userInfo.push(ClientData.CHANNEL);
        userInfo.push(Record.getUUID());
        userInfo.push(this.purchaseConfig.productId);
        userInfo.push(CommonUtil.getUUID());
        userInfo.push("");
        userInfo.push("");
        userInfo.push(CommonUtil.getLocaleCountryCode());
        userInfo.push(CommonUtil.deviceIPAddress());
        var userInfoString = userInfo.join("|");

        if (this.searchedTimes < 5) {
            cc.director.getScheduler().scheduleCallbackForTarget(this, function () {
                self.searchedTimes++;
                self.searchWaitTime += 1.5;
                var requestData = {};
                requestData.apporderid = payData.apporderid;
                requestData.sign = self.sign(payData.apporderid);
                requestData.notes = userInfo.join("|");
                self.request(this.searchApi, requestData, self.onPaymentValidateResult);
            }, this.searchWaitTime, 0, 0);
        }
    }
})
//todo qihu
var PurchaseTaskAndroidQIHU = PurchaseTaskAndroidVerify.extend({
    ctor: function (purchaseId, step) {
        this._super(purchaseId, step);
    },
    paymentSearch: function (payData) {
        var self = this;
        var userInfo = [];
        userInfo.push("149");
        userInfo.push(DataLog.getServerId());
        userInfo.push(ClientData.CHANNEL);
        userInfo.push(Record.getUUID());
        userInfo.push(this.purchaseConfig.productId);
        userInfo.push(CommonUtil.getUUID());
        userInfo.push("");
        userInfo.push("");
        userInfo.push(CommonUtil.getLocaleCountryCode());
        userInfo.push(CommonUtil.deviceIPAddress());
        var userInfoString = userInfo.join("|");

        if (this.searchedTimes < 5) {
            cc.director.getScheduler().scheduleCallbackForTarget(this, function () {
                self.searchedTimes++;
                self.searchWaitTime += 1.5;
                var requestData = {};
                requestData.apporderid = payData.apporderid;
                requestData.sign = self.sign(payData.apporderid);
                requestData.notes = userInfo.join("|");
                cc.v("request data is " + JSON.stringify(requestData));
                cc.v("request url is " + this.searchApi);
                self.request(this.searchApi, requestData, self.onPaymentValidateResult);
            }, this.searchWaitTime, 0, 0);
        }

    }
})

//todo xiaomi
var PurchaseTaskAndroidXiaomi = PurchaseTaskAndroidVerify.extend({
    ctor: function (purchaseId, step) {
        this._super(purchaseId, step);
    },
    onPayResult: function (obj, msg) {
        var result = obj.payRes;
        this.payObj = obj;
        if (result == 1) {
            this.changeStep(PurchaseTaskState.SDK_PAY_SUCCESS);

            //缓存凭证
            this.apporderid = obj.apporderid;

            //todo 直接发放
            this.paymentSearch(obj);
        } else if (result == 5) {
            this.onPaymentValidateResult({result: 0});
        } else {
            this.payLog(result, null, null, obj.errorCode);
            if (this.afterPay) {
                this.afterPay(this.purchaseId, 0);
            }
        }
    }
})
var PurchaseTaskAndroidTencent = PurchaseTaskAndroidVerify.extend({
    ctor: function (purchaseId, step) {
        this._super(purchaseId, step);
    }
})

var PurchaseTaskAndroidBaidu = PurchaseTaskAndroidVerify.extend({
    ctor: function (purchaseId, step) {
        this._super(purchaseId, step);
    },
    paymentSearch: function (payData) {
        var self = this;
        var userInfo = [];
        userInfo.push("149");
        userInfo.push(DataLog.getServerId());
        userInfo.push(ClientData.CHANNEL);
        userInfo.push(Record.getUUID());
        userInfo.push(this.purchaseConfig.productId);
        userInfo.push(CommonUtil.getUUID());
        userInfo.push("");
        userInfo.push("");
        userInfo.push(CommonUtil.getLocaleCountryCode());
        userInfo.push(CommonUtil.deviceIPAddress());
        var userInfoString = userInfo.join("|");

        if (this.searchedTimes < 5) {
            cc.director.getScheduler().scheduleCallbackForTarget(this, function () {
                self.searchedTimes++;
                self.searchWaitTime += 1.5;
                var requestData = {};
                requestData.apporderid = payData.apporderid;
                requestData.sign = self.sign(payData.apporderid);
                requestData.notes = userInfo.join("|");
                cc.v("request data is " + JSON.stringify(requestData));
                cc.v("request url is " + this.searchApi);
                self.request(this.searchApi, requestData, self.onPaymentValidateResult);
            }, this.searchWaitTime, 0, 0);
        }

    }
})
var PurchaseTaskAndroidWdj = PurchaseTaskAndroidVerify.extend({
    ctor: function (purchaseId, step) {
        this._super(purchaseId, step);
    },
    paymentSearch: function (payData) {
        var self = this;
        var userInfo = [];
        userInfo.push("149");
        userInfo.push(DataLog.getServerId());
        userInfo.push(ClientData.CHANNEL);
        userInfo.push(Record.getUUID());
        userInfo.push(this.purchaseConfig.productId);
        userInfo.push(CommonUtil.getUUID());
        userInfo.push("");
        userInfo.push("");
        userInfo.push(CommonUtil.getLocaleCountryCode());
        userInfo.push(CommonUtil.deviceIPAddress());
        var userInfoString = userInfo.join("|");

        if (this.searchedTimes < 5) {
            cc.director.getScheduler().scheduleCallbackForTarget(this, function () {
                self.searchedTimes++;
                self.searchWaitTime += 1.5;
                var requestData = {};
                requestData.apporderid = payData.apporderid;
                requestData.sign = self.sign(payData.apporderid);
                requestData.notes = userInfo.join("|");
                cc.v("request data is " + JSON.stringify(requestData));
                cc.v("request url is " + this.searchApi);
                self.request(this.searchApi, requestData, self.onPaymentValidateResult);
            }, this.searchWaitTime, 0, 0);
        }

    }
})
