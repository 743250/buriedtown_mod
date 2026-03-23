/**
 * Created by lancelot on 15/5/15.
 */

var Record = {
    recordObj: null,
    recordName: null,
    SLOT_COUNT: 3,
    SLOT_STORAGE_KEY: "recordSlot",
    DEFAULT_SLOT: 1,
    LEGACY_RECORD_NAME: "record",
    _normalizeSlot: function (slot) {
        slot = parseInt(slot);
        if (isNaN(slot) || slot < 1) {
            slot = this.DEFAULT_SLOT;
        }
        if (slot > this.SLOT_COUNT) {
            slot = this.SLOT_COUNT;
        }
        return slot;
    },
    getRecordNameBySlot: function (slot) {
        slot = this._normalizeSlot(slot);
        if (slot === 1) {
            return this.LEGACY_RECORD_NAME;
        }
        return this.LEGACY_RECORD_NAME + "_" + slot;
    },
    getAllRecordNames: function () {
        var list = [];
        for (var i = 1; i <= this.SLOT_COUNT; i++) {
            list.push(this.getRecordNameBySlot(i));
        }
        return list;
    },
    getCurrentSlot: function () {
        var slot = cc.sys.localStorage.getItem(this.SLOT_STORAGE_KEY);
        return this._normalizeSlot(slot);
    },
    setCurrentSlot: function (slot) {
        slot = this._normalizeSlot(slot);
        cc.sys.localStorage.setItem(this.SLOT_STORAGE_KEY, slot);
        return slot;
    },
    getCurrentRecordName: function () {
        return this.getRecordNameBySlot(this.getCurrentSlot());
    },
    getRecordInfo: function (slot) {
        slot = this._normalizeSlot(slot);
        var recordName = this.getRecordNameBySlot(slot);
        var recordStr = cc.sys.localStorage.getItem(recordName);
        var info = {
            slot: slot,
            recordName: recordName,
            hasRecord: false,
            day: null
        };
        if (!recordStr) {
            return info;
        }
        try {
            var recordObj = JSON.parse(recordStr);
            if (recordObj && recordObj.player) {
                info.hasRecord = true;
            }
            if (recordObj && recordObj.time && recordObj.time.time !== undefined && recordObj.time.time !== null) {
                info.day = Math.floor(recordObj.time.time / (24 * 60 * 60));
            }
        } catch (e) {
            info.hasRecord = false;
            info.day = null;
        }
        return info;
    },
    hasRecord: function (slot) {
        return this.getRecordInfo(slot).hasRecord;
    },
    hasAnyRecord: function () {
        for (var i = 1; i <= this.SLOT_COUNT; i++) {
            if (this.hasRecord(i)) {
                return true;
            }
        }
        return false;
    },
    init: function (recordName) {
        this.recordName = recordName || this.getCurrentRecordName();
        this.recordObj = SafetyHelper.safeJSONParse(cc.sys.localStorage.getItem(this.recordName), {}, "Record.init");
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
        if (recordName === undefined || recordName === null) {
            recordName = this.getCurrentRecordName();
        } else if (typeof recordName !== "string") {
            recordName = this.getRecordNameBySlot(recordName);
        }
        if (this.recordObj && this.recordName === recordName) {
            this.recordObj = {};
        }
        cc.sys.localStorage.removeItem(recordName);
    },
    _removeStorageKeys: function (keyList) {
        if (!Array.isArray(keyList)) {
            return;
        }
        keyList.forEach(function (key) {
            if (key) {
                cc.sys.localStorage.removeItem(key);
            }
        });
    },
    _getSlotScopedStorageKeys: function (slot) {
        slot = this._normalizeSlot(slot);
        return [
            "roleType_slot_" + slot,
            "chosenTalents_slot_" + slot,
            "chosenTalent_slot_" + slot,
            "medalProgress_slot_" + slot,
            "medalProgressRun_slot_" + slot + "_v3",
            "medalCompleteRun_slot_" + slot + "_v3"
        ];
    },
    clearSlotScopedState: function (slot) {
        this._removeStorageKeys(this._getSlotScopedStorageKeys(slot));
    },
    clearDeprecatedSelectionState: function () {
        this._removeStorageKeys([
            "roleType",
            "chosenTalent",
            "chosenTalents"
        ]);
    },
    clearDeprecatedMedalState: function () {
        this._removeStorageKeys([
            "medalProgress",
            "medalProgressLegacy",
            "medalProgressMode",
            "medalProgressLegacyAccountSeedSlot",
            "medalForOneGame"
        ]);
    },
    clearCurrentSlotCompatibilityState: function () {
        this.clearSlotScopedState(this.getCurrentSlot());
        this.clearDeprecatedSelectionState();
    },
    clearAllPersistentState: function () {
        var self = this;
        this.getAllRecordNames().forEach(function (name) {
            cc.sys.localStorage.removeItem(name);
        });
        this._removeStorageKeys([
            this.SLOT_STORAGE_KEY,
            "uuid",
            "IAPRecord",
            "medal",
            "medalProgressAccount_v3",
            "achievementPoints",
            "exchangeAchievements"
        ]);
        this.clearDeprecatedSelectionState();
        this.clearDeprecatedMedalState();
        for (var slot = 1; slot <= this.SLOT_COUNT; slot++) {
            self.clearSlotScopedState(slot);
        }
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
    isFirstTime: function (slot) {
        return !this.hasRecord(slot);
    },
    getLastScore: function () {
        var lastScore = cc.sys.localStorage.getItem("lastScore");
        if (lastScore) {
            lastScore = SafetyHelper.safeJSONParse(lastScore, null, "Record.getLastScore");
        }
        return lastScore;
    },
    setLastScore: function (data) {
        cc.sys.localStorage.setItem("lastScore", JSON.stringify(data));
    },
    getAgreement: function () {
        var agreeValue = cc.sys.localStorage.getItem("agreement");
        if (SafetyHelper.isEmpty(agreeValue)) {
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
        if (SafetyHelper.isEmpty(type)) {
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
        if (SafetyHelper.isEmpty(flagValue)) {
            return ShareType.NO_SHARED;
        } else {
            return parseInt(flagValue);
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
                this.clearAllPersistentState();
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
