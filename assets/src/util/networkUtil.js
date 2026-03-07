/**
 * Created by lancelot on 15/5/28.
 */
var networkUtil = {
    //apiUrl: "http://192.168.2.103:3000/btApi",
    apiUrl: "http://api.dice7.net:3000/btApi",
    //apiUrl: "http://42.62.98.133:3000/btApi",
    //apiUrl: "http://berrytown.serverlist.locojoy.com:3000/btApi",

    //logUrl: "http://192.168.2.103:3001/btLog",
    logUrl: "http://api.dice7.net:3001/btLog",
    //logUrl: "http://42.62.98.133:3001/btLog",
    //logUrl: "http://berrytown.serverlist.locojoy.com:3001/btLog",
    init: function () {
        if(PurchaseAndroid.payType === PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY){
            this.apiUrl =  "http://berrytown.googleplay.serverlist.locojoy.com:3000/btApi";
            this.logUrl =  "http://berrytown.googleplay.serverlist.locojoy.com:3001/btLog";
        } else {
            this.apiUrl =  "http://berrytown.android.serverlist.locojoy.com:3000/btApi";
            this.logUrl =  "http://berrytown.android.serverlist.locojoy.com:3001/btLog";
        }
    },
    requestData: function (method, data, target, cb) {
        var requestData = {};
        requestData.method = method;
        requestData.data = data;
        requestData.clientVersion = ClientData.CLIENT_VERSION;

        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("POST", this.apiUrl);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onreadystatechange = function () {
            var res;
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status <= 207)) {
                var response = xhr.responseText;
                cc.i("response:" + response);

                res = SafetyHelper.safeJSONParse(response, {statusCode: 300}, "networkUtil.requestData");
            } else {
                res = {statusCode: 300};
            }
            cc.i("request back readyState=" + xhr.readyState + " status=" + xhr.status);
            if (cb) {
                cb.call(target, res);
            }
        };
        xhr.onerror = function () {
            if (cb) {
                cb.call(target, {"statusCode": 301});
            }
        };
        xhr.timeout = 30000;
        xhr.ontimeout = function () {
            if (cb) {
                cb.call(target, {"statusCode": 302});
            }
        }
        xhr.send(JSON.stringify(requestData));
    },

    sendLog: function (method, data, target, cb) {
        var requestData = {};
        requestData.method = method;
        requestData.data = data;

        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("POST", this.logUrl);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onreadystatechange = function () {
            var res;
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status <= 207)) {
                var response = xhr.responseText;
                cc.i("response:" + response);

                res = SafetyHelper.safeJSONParse(response, {statusCode: 300}, "networkUtil.sendLog");
            } else {
                res = {statusCode: 300};
            }
            cc.i("request back readyState=" + xhr.readyState + " status=" + xhr.status);
            if (cb) {
                cb.call(target, res);
            }
        };
        xhr.send(JSON.stringify(requestData));
    }
};
