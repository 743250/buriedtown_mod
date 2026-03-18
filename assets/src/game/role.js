/**
 * Created by lancelot on 16/3/1.
 */

var RoleType = {
    //根据NPC ID
    STRANGER: 6,
    LUO: 1,
    YAZI: 4,
    JIN: 2,
    BIER: 5,
    JIE: 3,
    KING: 7,
    BELL: 8

};

var _defaultRoleInfo = {
    nameStringId: 1340,
    infoDescriptionStringId: 1320,
    infoEffectStringId: null,
    avatarFallback: "npc_dig_6.png"
};

var role = {
    LEGACY_STORAGE_KEY: "roleType",
    SLOT_STORAGE_KEY_PREFIX: "roleType_slot_",
    _getRoleConfigTable: function () {
        if (typeof RoleConfigTable !== "undefined" && RoleConfigTable) {
            return RoleConfigTable;
        }
        return {};
    },
    _getCurrentSlot: function () {
        if (typeof Record !== "undefined" && Record && typeof Record.getCurrentSlot === "function") {
            return Record.getCurrentSlot();
        }
        return 1;
    },
    _getScopedStorageKey: function () {
        return this.SLOT_STORAGE_KEY_PREFIX + this._getCurrentSlot();
    },
    _readStorageValue: function (key) {
        if (!cc || !cc.sys || !cc.sys.localStorage || !key) {
            return null;
        }
        return cc.sys.localStorage.getItem(key);
    },
    _writeStorageValue: function (key, value) {
        if (!cc || !cc.sys || !cc.sys.localStorage || !key) {
            return;
        }
        cc.sys.localStorage.setItem(key, value);
    },
    _removeStorageValue: function (key) {
        if (!cc || !cc.sys || !cc.sys.localStorage || !key) {
            return;
        }
        cc.sys.localStorage.removeItem(key);
    },
    _currentSlotHasRecord: function () {
        if (typeof Record !== "undefined"
            && Record
            && typeof Record.hasRecord === "function"
            && typeof Record.getCurrentSlot === "function") {
            return !!Record.hasRecord(Record.getCurrentSlot());
        }
        return false;
    },
    _canUseLegacySelectionFallback: function () {
        if (!this._currentSlotHasRecord()) {
            return false;
        }
        if (typeof Record === "undefined"
            || !Record
            || typeof Record.getAllRecordNames !== "function"
            || typeof Record.hasRecord !== "function") {
            return true;
        }

        var recordCount = 0;
        Record.getAllRecordNames().forEach(function (_, index) {
            if (Record.hasRecord(index + 1)) {
                recordCount++;
            }
        });
        return recordCount <= 1;
    },
    _normalizeStoredRoleType: function (roleType, fallbackRoleType) {
        roleType = Number(roleType);
        fallbackRoleType = fallbackRoleType === undefined ? RoleType.STRANGER : fallbackRoleType;
        return this.getRoleConfig(roleType) ? roleType : fallbackRoleType;
    },
    _getLegacyStoredRoleType: function () {
        if (!this._canUseLegacySelectionFallback()) {
            return null;
        }
        return this._readStorageValue(this.LEGACY_STORAGE_KEY);
    },
    _migrateLegacyStoredRoleType: function () {
        var legacyRoleType = this._getLegacyStoredRoleType();
        if (SafetyHelper.isEmpty(legacyRoleType)) {
            return null;
        }

        var normalizedRoleType = this._normalizeStoredRoleType(legacyRoleType);
        this._writeStorageValue(this._getScopedStorageKey(), normalizedRoleType);
        this._removeStorageValue(this.LEGACY_STORAGE_KEY);
        return normalizedRoleType;
    },
    _getRoleStringValue: function (stringId) {
        if (stringId === undefined || stringId === null || typeof stringUtil === "undefined" || !stringUtil) {
            return "";
        }
        var str = stringUtil.getString(stringId);
        return typeof str === "string" ? str : "";
    },
    _getRoleTextFromSource: function (source, fallbackStringId) {
        if (source && typeof source === "object" && source.type === "purchase") {
            var purchaseId = parseInt(source.purchaseId);
            var fieldName = source.field || "des";
            if (!isNaN(purchaseId) && typeof stringUtil !== "undefined" && stringUtil) {
                var purchaseStringConfig = stringUtil.getString("p_" + purchaseId);
                if (purchaseStringConfig
                    && typeof purchaseStringConfig === "object"
                    && typeof purchaseStringConfig[fieldName] === "string") {
                    return purchaseStringConfig[fieldName];
                }
            }
        }
        return this._getRoleStringValue(fallbackStringId);
    },
    getRoleConfig: function (roleType) {
        roleType = parseInt(roleType);
        if (isNaN(roleType)) {
            return null;
        }
        return this._getRoleConfigTable()[roleType] || null;
    },
    getAllRoleTypes: function () {
        var table = this._getRoleConfigTable();
        return Object.keys(table).map(function (key) {
            return parseInt(key);
        }).filter(function (roleType) {
            return !isNaN(roleType);
        }).sort(function (a, b) {
            var configA = table[a] || {};
            var configB = table[b] || {};
            var orderA = isFinite(configA.selectionOrder) ? configA.selectionOrder : 999999;
            var orderB = isFinite(configB.selectionOrder) ? configB.selectionOrder : 999999;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return a - b;
        });
    },
    getRoleSelectionList: function () {
        var self = this;
        return this.getAllRoleTypes().map(function (roleType) {
            if (typeof ConfigValidator !== "undefined" && ConfigValidator && typeof ConfigValidator.warnIfInvalid === "function") {
                ConfigValidator.warnIfInvalid("role", roleType, "role.getRoleSelectionList");
            }
            var config = self.getRoleConfig(roleType) || {};
            return {
                id: roleType,
                name: self._getRoleStringValue(config.nameStringId),
                des: self._getRoleStringValue(config.selectionDescriptionStringId),
                selectionOrder: isFinite(config.selectionOrder) ? config.selectionOrder : roleType
            };
        });
    },
    getRoleSelectionConfig: function () {
        var selectionList = this.getRoleSelectionList();
        var positionToRoleType = {};
        var roleTypeToPosition = {};
        var randomRoleTypeList = [];

        selectionList.forEach(function (item, index) {
            positionToRoleType[index] = item.id;
            roleTypeToPosition[item.id] = index;
            randomRoleTypeList.push(item.id);
        });

        return {
            positionToRoleType: positionToRoleType,
            randomRoleTypeList: randomRoleTypeList,
            roleTypeToPosition: roleTypeToPosition,
            roleList: selectionList
        };
    },
    getExchangeIdByRoleType: function (roleType) {
        var config = this.getRoleConfig(roleType);
        return config ? config.exchangeId : null;
    },
    getPurchaseIdByRoleType: function (roleType) {
        var config = this.getRoleConfig(roleType);
        return config ? config.purchaseId : null;
    },
    getRoleTypeByPurchaseId: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)) {
            return null;
        }

        var roleTypeList = this.getAllRoleTypes();
        for (var i = 0; i < roleTypeList.length; i++) {
            var roleType = roleTypeList[i];
            if (this.getPurchaseIdByRoleType(roleType) === purchaseId) {
                return roleType;
            }
        }
        return null;
    },
    getMapRoleTypeByRoleType: function (roleType) {
        var config = this.getRoleConfig(roleType);
        if (config && isFinite(config.mapRoleType)) {
            return config.mapRoleType;
        }
        roleType = parseInt(roleType);
        return isNaN(roleType) ? null : roleType;
    },
    getAvatarFallbackByRoleType: function (roleType) {
        var config = this.getRoleConfig(roleType);
        return config && config.avatarFallback ? config.avatarFallback : _defaultRoleInfo.avatarFallback;
    },
    isRolePurchaseRequired: function (roleType) {
        if (roleType === RoleType.STRANGER) {
            return false;
        }
        return !!this.getPurchaseIdByRoleType(roleType);
    },
    chooseRoleType: function (roleType) {
        roleType = this._normalizeStoredRoleType(roleType);
        this._writeStorageValue(this._getScopedStorageKey(), roleType);
        return roleType;
    },
    getChoosenRoleType: function () {
        var roleType = this._readStorageValue(this._getScopedStorageKey());
        if (SafetyHelper.isEmpty(roleType)) {
            roleType = this._migrateLegacyStoredRoleType();
        }
        return this._normalizeStoredRoleType(roleType);
    },
    isRoleUnlocked: function (roleType) {
        if (roleType === RoleType.STRANGER) {
            return true;
        }

        var exchangeId = this.getExchangeIdByRoleType(roleType);
        if (!exchangeId) {
            return !this.isRolePurchaseRequired(roleType);
        }
        return Medal.isExchanged(exchangeId);
    },
    getRoleInfo: function (roleType) {
        var config = this.getRoleConfig(roleType);
        if (!config) {
            return {
                name: this._getRoleStringValue(_defaultRoleInfo.nameStringId),
                des: this._getRoleStringValue(_defaultRoleInfo.infoDescriptionStringId),
                effect: this._getRoleStringValue(_defaultRoleInfo.infoEffectStringId)
            };
        }

        return {
            name: this._getRoleStringValue(config.nameStringId),
            des: this._getRoleTextFromSource(config.infoDescriptionSource, config.infoDescriptionStringId),
            effect: this._getRoleTextFromSource(config.infoEffectSource, config.infoEffectStringId)
        };
    }
};
