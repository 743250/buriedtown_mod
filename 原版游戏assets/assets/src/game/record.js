/**
 * Created by lancelot on 15/5/15.
 */

var Record = {
    recordObj: null,
    recordName: null,
    init: function (recordName) {
        this.recordName = recordName;
        this.recordObj = JSON.parse(cc.sys.localStorage.getItem(recordName) || "{}");
    },
    saveAll: function () {
        this.save("player", player.save());
        this.save("time", cc.timer.save());
        //cc.e("save all " + JSON.stringify(this.recordObj));
        cc.e("save all ");
    },
    save: function (key, obj) {
        this.recordObj[key] = obj;
        this.flush();
    },
    deleteRecord: function (recordName) {
        if (this.recordObj) {
            delete this.recordObj;
        }
        cc.sys.localStorage.removeItem(recordName);
    },
    restore: function (key) {
        return this.recordObj[key];
    },
    flush: function () {
        cc.sys.localStorage.setItem(this.recordName, JSON.stringify(this.recordObj));
    },
    uuid: null,
    getUUID: function () {
        this.uuid = this.uuid || cc.sys.localStorage.getItem("uuid");
        if (!this.uuid) {
            this.uuid = "" + new Date().getTime();
            for (var i = 0; i < 5; i++) {
                this.uuid += utils.getRandomInt(0, 9);
            }
            cc.sys.localStorage.setItem("uuid", this.uuid);
            cc.log("getUUID: " + this.uuid);
        }
        return this.uuid;
    },
    getUsername: function () {
        var username = cc.sys.localStorage.getItem("username");
        return username;
    },
    setUsername: function (username) {
        cc.sys.localStorage.setItem("username", username);
    },
    isFirstTime: function () {
        var record = cc.sys.localStorage.getItem("record");
        return !record;
    },
    getLastScore: function () {
        var lastScore = cc.sys.localStorage.getItem("lastScore");
        if (lastScore) {
            lastScore = JSON.parse(lastScore);
        }
        return lastScore;
    },
    setLastScore: function (data) {
        cc.sys.localStorage.setItem("lastScore", JSON.stringify(data));
    },
    getAgreement: function () {
        var agreeValue = cc.sys.localStorage.getItem("agreement");
        if (agreeValue === undefined || agreeValue === null || agreeValue === "") {
            return true;
        } else {
            return agreeValue == 1 ? true : false;
        }
    },
    setAgreement: function (agree) {
        var agreeValue;
        if (agree) {
            agreeValue = 1;
        } else {
            agreeValue = 2;
        }
        cc.sys.localStorage.setItem("agreement", agreeValue);
    },
    getType: function () {
        var type = cc.sys.localStorage.getItem("type");
        if (type === undefined || type === null || type === "") {
            return -1;
        } else {
            return Number(type);
        }
    },
    setType: function (type) {
        cc.sys.localStorage.setItem("type", type);
    },
    getShareFlag: function () {
        var flagValue = cc.sys.localStorage.getItem("shareFlag");
        if (flagValue === undefined || flagValue === null || flagValue === "") {
            return ShareType.NO_SHARED;
        } else {
            return Number.parseInt(flagValue);
        }
    },
    setShareFlag: function (flag) {
        cc.sys.localStorage.setItem("shareFlag", flag);
    },
    needUserGuide: function () {
        var need = cc.sys.localStorage.getItem("needUserGuide");
        return need != 1;
    },
    closeUserGuide: function () {
        cc.sys.localStorage.setItem("needUserGuide", 1);
    },

    validateRecord: function () {
        var res = false;
        var flagName = "recordFlag";
        var deviceId = CommonUtil.macAddress();
        var recordFlag = cc.sys.localStorage.getItem(flagName);
        if (!recordFlag) {
            cc.sys.localStorage.setItem(flagName, deviceId);
            res = true;
        } else if (!deviceId) {
            res = true;
        } else {
            if (recordFlag == deviceId) {
                res = true;
            } else {
                res = false;
                cc.sys.localStorage.removeItem('record');
                cc.sys.localStorage.removeItem('uuid');
                cc.sys.localStorage.removeItem('IAPRecord');
                cc.sys.localStorage.removeItem('medal');
                cc.sys.localStorage.removeItem('chosenTalent');

                cc.sys.localStorage.setItem(flagName, deviceId);
            }
        }
        cc.e("validateRecord " + res);
        return res;
    }
};

var ShareType = {
    NO_SHARED: 1,
    SHARED_CAN_REWARD: 2,
    SHARED_AND_REWARD: 3
};
