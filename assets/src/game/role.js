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
    _getRoleConfigTable: function () {
        if (typeof RoleConfigTable !== "undefined" && RoleConfigTable) {
            return RoleConfigTable;
        }
        return {};
    },
    _getRecordService: function () {
        if (typeof Record !== "undefined" && Record) {
            return Record;
        }
        return null;
    },
    _currentSlotHasRecord: function () {
        var recordService = this._getRecordService();
        if (recordService
            && typeof recordService.hasRecord === "function"
            && typeof recordService.getCurrentSlot === "function") {
            return !!recordService.hasRecord(recordService.getCurrentSlot());
        }
        return false;
    },
    _normalizeStoredRoleType: function (roleType, fallbackRoleType) {
        roleType = Number(roleType);
        fallbackRoleType = fallbackRoleType === undefined ? RoleType.STRANGER : fallbackRoleType;
        return this.getRoleConfig(roleType) ? roleType : fallbackRoleType;
    },
    _resolveRoleTypeForCurrentSlot: function (roleType) {
        roleType = this._normalizeStoredRoleType(roleType);
        if (this._currentSlotHasRecord() || this.isRoleUnlocked(roleType)) {
            return roleType;
        }

        // Starting a fresh run should not inherit a stale locked role from a deleted save slot.
        roleType = this._normalizeStoredRoleType(RoleType.STRANGER);
        var recordService = this._getRecordService();
        if (recordService && typeof recordService.setSelectedRoleType === "function") {
            recordService.setSelectedRoleType(roleType);
        }
        return roleType;
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
        var recordService = this._getRecordService();
        if (recordService && typeof recordService.setSelectedRoleType === "function") {
            recordService.setSelectedRoleType(roleType);
        }
        return roleType;
    },
    getChoosenRoleType: function () {
        var roleType = null;
        var recordService = this._getRecordService();
        if (recordService && typeof recordService.getSelectedRoleType === "function") {
            roleType = recordService.getSelectedRoleType();
        }
        return this._resolveRoleTypeForCurrentSlot(roleType);
    },
    isRoleUnlocked: function (roleType) {
        if (roleType === RoleType.STRANGER) {
            return true;
        }

        if (typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.isRoleUnlocked === "function") {
            return PurchaseService.isRoleUnlocked(roleType);
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
