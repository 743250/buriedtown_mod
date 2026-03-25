/**
 * Created by lancelot on 15/5/15.
 */

var Record = {
    recordObj: null,
    recordName: null,
    _runtime: null,
    SLOT_COUNT: 3,
    SLOT_STORAGE_KEY: "recordSlot",
    SLOT_META_STORAGE_KEY_PREFIX: "recordMeta_slot_",
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
    _normalizeMetaSlot: function (slot) {
        if (slot === undefined || slot === null || slot === "") {
            return this.getCurrentSlot();
        }
        return this._normalizeSlot(slot);
    },
    _getSlotMetaStorageKey: function (slot) {
        slot = this._normalizeMetaSlot(slot);
        return this.SLOT_META_STORAGE_KEY_PREFIX + slot;
    },
    _normalizeSlotMeta: function (meta) {
        if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
            return {};
        }
        return meta;
    },
    _readSlotMetaObject: function (slot) {
        slot = this._normalizeMetaSlot(slot);
        var storageKey = this._getSlotMetaStorageKey(slot);
        var rawMeta = cc.sys.localStorage.getItem(storageKey);
        if (!rawMeta) {
            return {};
        }
        return this._normalizeSlotMeta(
            SafetyHelper.safeJSONParse(rawMeta, {}, "Record._readSlotMetaObject")
        );
    },
    _writeSlotMetaObject: function (slot, meta) {
        slot = this._normalizeMetaSlot(slot);
        meta = this._normalizeSlotMeta(meta);
        var storageKey = this._getSlotMetaStorageKey(slot);
        if (Object.keys(meta).length === 0) {
            cc.sys.localStorage.removeItem(storageKey);
            return {};
        }
        cc.sys.localStorage.setItem(storageKey, JSON.stringify(meta));
        return meta;
    },
    _parseLegacyChosenTalentIds: function (rawValue) {
        var parsed;
        var result = [];
        var uniqueMap = {};
        if (rawValue === undefined || rawValue === null || rawValue === "") {
            return result;
        }
        try {
            parsed = JSON.parse(rawValue);
        } catch (e) {
            parsed = typeof rawValue === "string" ? rawValue.split(",") : [rawValue];
        }
        if (!Array.isArray(parsed)) {
            parsed = [parsed];
        }
        parsed.forEach(function (value) {
            var purchaseId = parseInt(value);
            if (isNaN(purchaseId) || uniqueMap[purchaseId]) {
                return;
            }
            uniqueMap[purchaseId] = true;
            result.push(purchaseId);
        });
        return result;
    },
    _buildLegacySlotMeta: function (slot) {
        slot = this._normalizeMetaSlot(slot);
        var meta = {};
        var roleType = parseInt(cc.sys.localStorage.getItem("roleType_slot_" + slot));
        if (!isNaN(roleType)) {
            meta.selectedRoleType = roleType;
        }

        var chosenTalentIds = this._parseLegacyChosenTalentIds(
            cc.sys.localStorage.getItem("chosenTalents_slot_" + slot)
        );
        if (chosenTalentIds.length === 0) {
            chosenTalentIds = this._parseLegacyChosenTalentIds(
                cc.sys.localStorage.getItem("chosenTalent_slot_" + slot)
            );
        }
        if (chosenTalentIds.length > 0) {
            meta.chosenTalentIds = chosenTalentIds;
        }
        return meta;
    },
    getSlotMeta: function (slot) {
        slot = this._normalizeMetaSlot(slot);
        var meta = this._readSlotMetaObject(slot);
        if (Object.keys(meta).length > 0) {
            return meta;
        }

        var legacyMeta = this._buildLegacySlotMeta(slot);
        if (Object.keys(legacyMeta).length > 0) {
            this._writeSlotMetaObject(slot, legacyMeta);
            return legacyMeta;
        }
        return {};
    },
    getCurrentSlotMeta: function () {
        return this.getSlotMeta(this.getCurrentSlot());
    },
    getSlotMetaValue: function (slot, key, defaultValue) {
        if (key === undefined || key === null || key === "") {
            return defaultValue;
        }
        var meta = this.getSlotMeta(slot);
        return meta.hasOwnProperty(key) ? meta[key] : defaultValue;
    },
    setSlotMetaValue: function (slot, key, value) {
        if (value === undefined) {
            value = key;
            key = slot;
            slot = null;
        }
        if (key === undefined || key === null || key === "") {
            return null;
        }
        slot = this._normalizeMetaSlot(slot);
        var meta = this.getSlotMeta(slot);
        meta[key] = value;
        this._writeSlotMetaObject(slot, meta);
        return value;
    },
    removeSlotMetaValue: function (slot, key) {
        if (key === undefined) {
            key = slot;
            slot = null;
        }
        if (key === undefined || key === null || key === "") {
            return false;
        }
        slot = this._normalizeMetaSlot(slot);
        var meta = this.getSlotMeta(slot);
        if (!meta.hasOwnProperty(key)) {
            return false;
        }
        delete meta[key];
        this._writeSlotMetaObject(slot, meta);
        return true;
    },
    getSelectedRoleType: function (slot) {
        var roleType = this.getSlotMetaValue(slot, "selectedRoleType", null);
        if (roleType === null || roleType === undefined) {
            return null;
        }
        roleType = parseInt(roleType);
        return isNaN(roleType) ? null : roleType;
    },
    setSelectedRoleType: function (slot, roleType) {
        if (roleType === undefined) {
            roleType = slot;
            slot = null;
        }
        roleType = parseInt(roleType);
        if (isNaN(roleType)) {
            this.removeSelectedRoleType(slot);
            return null;
        }
        return this.setSlotMetaValue(slot, "selectedRoleType", roleType);
    },
    removeSelectedRoleType: function (slot) {
        return this.removeSlotMetaValue(slot, "selectedRoleType");
    },
    getChosenTalentIds: function (slot) {
        var chosenTalentIds = this.getSlotMetaValue(slot, "chosenTalentIds", []);
        if (!Array.isArray(chosenTalentIds)) {
            chosenTalentIds = [chosenTalentIds];
        }
        return this._parseLegacyChosenTalentIds(JSON.stringify(chosenTalentIds));
    },
    setChosenTalentIds: function (slot, chosenTalentIds) {
        if (chosenTalentIds === undefined) {
            chosenTalentIds = slot;
            slot = null;
        }
        if (!Array.isArray(chosenTalentIds)) {
            chosenTalentIds = [chosenTalentIds];
        }
        chosenTalentIds = this._parseLegacyChosenTalentIds(JSON.stringify(chosenTalentIds));
        return this.setSlotMetaValue(slot, "chosenTalentIds", chosenTalentIds);
    },
    removeChosenTalentIds: function (slot) {
        return this.removeSlotMetaValue(slot, "chosenTalentIds");
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
        this._runtime = null;
        this.recordObj = SafetyHelper.safeJSONParse(cc.sys.localStorage.getItem(this.recordName), {}, "Record.init");
    },
    bindRuntime: function (runtime) {
        this._runtime = runtime || null;
        return this._runtime;
    },
    saveAll: function () {
        if (!this._runtime
            || typeof this._runtime.requirePlayer !== "function"
            || typeof this._runtime.requireTimer !== "function") {
            throw new Error("Record.saveAll requires a bound GameRuntime with player/timer access");
        }
        this.save("player", this._runtime.requirePlayer().save());
        this.save("time", this._runtime.requireTimer().save());
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
            this._getSlotMetaStorageKey(slot),
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
