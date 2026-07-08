/**
 * Created by lancelot on 15/3/12.
 */
var CommonUtil = {
    _callbackList: {},
    _dialog: null,

    share: function (msg, url, title) {
        if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("CommonUtil", "share:withUrl:withTitle:", msg, url, title);
        } else if (cc.sys.os == cc.sys.OS_ANDROID) {
            //todo 安卓分享地址
            if (PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY)
                url = "https://play.google.com/store/apps/details?id=com.locojoy.buriedtown";
            jsb.reflection.callStaticMethod("org/cocos2dx/javascript/AppActivity", "openShare", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V", msg, url, title);
        }
    },
    shareCallback: function (type, result) {
        cc.log(type + " : " + result);
        if (result == 1) {
            //if (cc.sys.isNative && cc.sys.os == cc.sys.OS_IOS) {
            if (cc.sys.isNative) {
                cc.director.runScene(new EndScene());
                uiUtil.showLoadingView();
                networkUtil.requestData("canGetItemByShare", {userId: CommonUtil.getUUID()}, this, function (res) {
                    uiUtil.dismissLoadingView();
                    if (res.statusCode == 200) {
                        if (res.data["canGetItem"]) {
                            networkUtil.requestData("getItemByShare", {userId: CommonUtil.getUUID()}, null, null);
                            Record.setShareFlag(ShareType.SHARED_CAN_REWARD);
                            var config = {
                                title: {title: ""},
                                content: {des: stringUtil.getString(1243)},
                                action: {btn_1: {txt: stringUtil.getString(1193)}}
                            };
                            var toast = new DialogSmall(config);
                            toast.show();
                        }
                    } else {
                        var config = {
                            title: {title: ""},
                            content: {des: stringUtil.getString(1244)},
                            action: {btn_1: {txt: stringUtil.getString(1193)}}
                        };
                        var toast = new DialogTiny(config);
                        toast.contentNode.getChildByName("des").setHorizontalAlignment(cc.TEXT_ALIGNMENT_CENTER);
                        toast.show();
                    }
                    //todo ShareType.SHARED_CAN_REWARD
                    DataLog.genShareLog(type);
                });
            }
        }
    },

    getLocaleCountryCode: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "getLocaleCountryCode", "()Ljava/lang/String;");
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            return jsb.reflection.callStaticMethod("CommonUtil", "getLocaleCountryCode");
        }
    },
    getLocaleLanguage: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "getLocaleLanguage", "()Ljava/lang/String;");
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            var lan = jsb.reflection.callStaticMethod("CommonUtil", "getLocaleLanguage");
            if (jsb.reflection.callStaticMethod("CommonUtil", "getOSVersion") >= 9) {
                if (lan.indexOf("-") != -1) {
                    var lanArray = lan.split("-");
                    lanArray.pop();
                    lan = lanArray.join("-");
                }
            }
            return lan;
        }
    },

    gotoAppstore: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "gotoMarketDetail", "()V");
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("CommonUtil", "gotoAppstore");
        }
    },
    gotoUrl: function (url) {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "gotoUrl", "(Ljava/lang/String;)V", url);
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("CommonUtil", "gotoUrl:", url)
        }
    },
    showDialog: function (msg) {
        return jsb.reflection.callStaticMethod("CommonUtil", "showDialog:", msg);
    },

    dismissDialog: function () {
        return jsb.reflection.callStaticMethod("CommonUtil", "dismissDialog");
    },

    showUIActivityIndicatorView: function () {
        if (this._dialog && cc.sys.isObjectValid(this._dialog)) {
            this._dialog.dismiss();
        }
        this._dialog = new LoadingDialog();
        this._dialog.show();
        return jsb.reflection.callStaticMethod("CommonUtil", "showUIActivityIndicatorView");
    },

    dismissUIActivityIndicatorView: function () {
        if (this._dialog && cc.sys.isObjectValid(this._dialog)) {
            this._dialog.dismiss();
        }
        return jsb.reflection.callStaticMethod("CommonUtil", "dismissUIActivityIndicatorView");
    },

    showCommonDialog: function (msg, btnTitle) {
        return jsb.reflection.callStaticMethod("CommonUtil", "showCommonDialog:cancelButtonTitle:", msg, btnTitle);
    },

    getUUID: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            var uuid = this.macAddress();
            if (!uuid) {
                uuid = this.getIMEI();
            }
            return uuid;
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            return jsb.reflection.callStaticMethod("CommonUtil", "getUUID");
        }
    },

    getIMEI: function () {
        return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "getIMEI", "()Ljava/lang/String;");
    },

    getOSVersion: function () {
        return jsb.reflection.callStaticMethod("CommonUtil", "getOSVersion");
    },

    getIDFA: function () {
        return jsb.reflection.callStaticMethod("CommonUtil", "getIDFA");
    },

    macAddress: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "getMacAddress", "()Ljava/lang/String;");
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            return jsb.reflection.callStaticMethod("CommonUtil", "macAddress");
        }
    },

    deviceIPAddress: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "deviceIPAddress", "()Ljava/lang/String;");
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            return jsb.reflection.callStaticMethod("CommonUtil", "deviceIPAddress");
        }
    },

    md5HexDigest: function (srcStr) {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "md5", "(Ljava/lang/String;)Ljava/lang/String;", srcStr);
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            return jsb.reflection.callStaticMethod("CommonUtil", "md5HexDigest:", srcStr);
        }
    },

    callback: function (method) {
        var cbobj = this._callbackList[method];
        if (cbobj) {
            var args = [];
            if (arguments.length > 1) {
                for (var i = 1; i < arguments.length; i++) {
                    args.push(arguments[i]);
                }
            }
            cbobj.cb.apply(cbobj.target, args);
        }
    },
    tdCPA: function () {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
//            jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "tdCPA", "()V");
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("CommonUtil", "tdCPA");
        }
    },
    tdOnPayFailed: function (step,stateCode,errorCode,orderid,channelId) {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
//            jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "tdOnPayFailed", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V",step,stateCode, errorCode, orderid,channelId);
        }
    },

    tdOnChargeRequest: function (orderId, iapId, currencyAmount, currencyType, virtualCurrencyAmount, paymentType) {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
//            jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "tdOnChargeRequest", "(Ljava/lang/String;Ljava/lang/String;FLjava/lang/String;FLjava/lang/String;)V", orderId, iapId, currencyAmount, currencyType, virtualCurrencyAmount, paymentType)
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("CommonUtil", "tdOnChargeRequest:iapId:currencyAmount:currencyType:virtualCurrencyAmount:paymentType:", orderId, iapId, currencyAmount, currencyType, virtualCurrencyAmount, paymentType);
        }
    },

    tdOnChargeSuccess: function (orderId) {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
//            jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "tdOnChargeSuccess", "(Ljava/lang/String;)V", orderId)
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("CommonUtil", "tdOnChargeSuccess:", orderId);
        }
    },

    tdOnPurchase: function (item, itemNumber, priceInVirtualCurrency) {
        cc.e("is running in onpurchase");
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            cc.e("is running in onpurchase 1");
//            jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "tdOnPurchase", "(Ljava/lang/String;IF)V", item, itemNumber, priceInVirtualCurrency);
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("CommonUtil", "tdOnPurchase:itemNumber:priceInVirtualCurrency:", item, itemNumber, priceInVirtualCurrency);
        }
    },

    tdOnUse: function (item, itemNumber) {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
//            jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "tdOnUse", "(Ljava/lang/String;I)V", item, itemNumber);
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("CommonUtil", "tdOnUse:itemNumber:", item, itemNumber);
        }
    },

    //appflyer
    afOnRegister: function () {
        if (cc.sys.localStorage.getItem("afRegisted") !== 1) {
            jsb.reflection.callStaticMethod("CommonUtil", "afOnRegister");
            cc.sys.localStorage.setItem("afRegisted", 1)
        }
    },
    afOnPurchase: function (itemId, revenue, priceInVirtualCurrency) {
        jsb.reflection.callStaticMethod("CommonUtil", "afOnPurchase:revenue:priceInVirtualCurrency:", itemId, revenue, priceInVirtualCurrency);
    },
    afOnFinishFirstGuide: function () {
        if (cc.sys.localStorage.getItem("afOnFinishedFirstGuide") !== 1) {
            jsb.reflection.callStaticMethod("CommonUtil", "afOnFinishFirstGuide");
            cc.sys.localStorage.setItem("afOnFinishedFirstGuide", 1)
        }

    },

    getMetaData: function (key) {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "getMetaData", "(Ljava/lang/String;)Ljava/lang/String;", key);
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            return "";
        }
    },

    getMetaDataInt: function (key) {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            return jsb.reflection.callStaticMethod("org/cocos2dx/javascript/CommonUtil", "getMetaDataInt", "(Ljava/lang/String;)I", key);
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            return "";
        }
    },

    sendEmail: function (email) {
        CommonUtil.gotoUrl("mailto:" + email);
    },
    adStatus: true,
    showLocojoyAd: function () {
        jsb.reflection.callStaticMethod("CommonUtil", "showLocojoyAd");
    },
    getRated: function () {
        var ratedVersion = cc.sys.localStorage.getItem("rated");
        if(ratedVersion != ClientData.CLIENT_VERSION)
            return false;
        return true;
    },
    setRated: function () {
        cc.sys.localStorage.setItem("rated",ClientData.CLIENT_VERSION);
    }
};
