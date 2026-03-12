/**
 * Created by lancelot on 15/6/11.
 */
var IAPPackage = {
    _map: {},
    _record: {},
    _testForceLocked: {},
    // Explicit dev flags come from EnvironmentConfig/localStorage, not hardcoded defaults.
    _unlockAllRoleAndTalentForTest: false,
    _bypassPaySdkForTest: false,
    SHOP_STATE_CHANGE_EVENT: "shop_state_change",
    _applyEnvironmentFlags: function () {
        if (typeof EnvironmentConfig === "undefined"
            || !EnvironmentConfig
            || typeof EnvironmentConfig.getPurchaseDebugFlags !== "function") {
            return;
        }

        var debugFlags = EnvironmentConfig.getPurchaseDebugFlags() || {};
        this._unlockAllRoleAndTalentForTest = !!debugFlags.unlockAllRoleAndTalentForTest;
        this._bypassPaySdkForTest = !!debugFlags.bypassPaySdkForTest;

        if (this._unlockAllRoleAndTalentForTest || this._bypassPaySdkForTest) {
            cc.w("IAP debug flags enabled. unlock="
                + this._unlockAllRoleAndTalentForTest
                + ", bypass="
                + this._bypassPaySdkForTest);
        }
    },
    initPackage: function () {
        this._applyEnvironmentFlags();
        this.initIAPRecord();
        if (!this._unlockAllRoleAndTalentForTest) {
            this.onIAPPaied(0);
            this.onIAPPaied(101);
            this.onIAPPaied(102);
            this.onIAPPaied(103);
            this.onIAPPaied(104);
            this.onIAPPaied(105);
            this.onIAPPaied(106);
            this.onIAPPaied(107);
            this.onIAPPaied(108);
            this.onIAPPaied(109);
            this.onIAPPaied(120);
            this.onIAPPaied(121);
            this.onIAPPaied(122);
            this.onIAPPaied(123);
            this.onIAPPaied(124);
        }
    },
    _emitShopStateChanged: function (purchaseId, reason, payload) {
        if (typeof utils === "undefined" || !utils || !utils.emitter || typeof utils.emitter.emit !== "function") {
            return;
        }

        var normalizedPurchaseId = parseInt(purchaseId);
        if (isNaN(normalizedPurchaseId)) {
            normalizedPurchaseId = null;
        }

        var achievementPoints = 0;
        if (typeof Medal !== "undefined" && Medal && typeof Medal.getAchievementPoints === "function") {
            achievementPoints = Medal.getAchievementPoints();
        }

        utils.emitter.emit(this.SHOP_STATE_CHANGE_EVENT, {
            purchaseId: normalizedPurchaseId,
            reason: reason || "",
            payload: payload || null,
            achievementPoints: achievementPoints
        });
    },
    _getTalentMaxLevel: function (purchaseId) {
        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getTalentMaxLevel === "function") {
            return TalentService.getTalentMaxLevel(purchaseId);
        }
        return 3;
    },
    _getConfiguredExchangeIdsByPurchaseId: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)
            || typeof ExchangeAchievementConfig === "undefined"
            || !ExchangeAchievementConfig) {
            return [];
        }

        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getExchangeIdsByPurchaseId === "function") {
            var talentExchangeIds = TalentService.getExchangeIdsByPurchaseId(purchaseId);
            if (talentExchangeIds.length > 0) {
                return talentExchangeIds;
            }
        }

        if (typeof role !== "undefined"
            && role
            && typeof role.getExchangeIdsByPurchaseId === "function") {
            var roleExchangeIds = role.getExchangeIdsByPurchaseId(purchaseId);
            if (roleExchangeIds.length > 0) {
                return roleExchangeIds;
            }
        }

        if (!(purchaseId >= 100 && purchaseId < 200)) {
            return [];
        }

        var exchangeIds = [];
        for (var exchangeId in ExchangeAchievementConfig) {
            var exchangeConfig = ExchangeAchievementConfig[exchangeId];
            if (!exchangeConfig || exchangeConfig.type !== "item") {
                continue;
            }
            if (parseInt(exchangeConfig.targetId) !== purchaseId) {
                continue;
            }
            exchangeIds.push(parseInt(exchangeId));
        }

        exchangeIds.sort(function (a, b) {
            return a - b;
        });
        return exchangeIds;
    },
    getExchangeIdsByPurchaseId: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)) {
            return [];
        }

        var configuredExchangeIds = this._getConfiguredExchangeIdsByPurchaseId(purchaseId);
        if (configuredExchangeIds.length > 0) {
            return configuredExchangeIds;
        }

        var mapping = {
            108: 1001,
            109: 1002,
            110: 1003,
            111: 1004,
            112: 1005,
            113: 1006,
            114: 1007,
            105: 3001,
            106: 3002,
            107: 3003
        };
        if (mapping[purchaseId]) {
            return [mapping[purchaseId]];
        }
        return [];
    },
    isExchangePurchase: function (purchaseId) {
        return this.getExchangeIdsByPurchaseId(purchaseId).length > 0;
    },
    getExchangeIdByPurchaseId: function (purchaseId) {
        var exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);
        if (exchangeIds.length === 0) {
            return null;
        }
        for (var i = 0; i < exchangeIds.length; i++) {
            if (!Medal.isExchanged(exchangeIds[i])) {
                return exchangeIds[i];
            }
        }
        return null;
    },
    getLastUnlockedExchangeIdByPurchaseId: function (purchaseId) {
        var exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);
        if (exchangeIds.length === 0) {
            return null;
        }
        for (var i = exchangeIds.length - 1; i >= 0; i--) {
            if (Medal.isExchanged(exchangeIds[i])) {
                return exchangeIds[i];
            }
        }
        return null;
    },
    hasExchangeUnlock: function (purchaseId) {
        var exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);
        for (var i = 0; i < exchangeIds.length; i++) {
            if (Medal.isExchanged(exchangeIds[i])) {
                return true;
            }
        }
        return false;
    },
    isPurchaseFullyUnlocked: function (purchaseId) {
        if (!this.isExchangePurchase(purchaseId)) {
            return this.isIAPUnlocked(purchaseId);
        }
        purchaseId = parseInt(purchaseId);
        if (this.isTalentPurchaseId(purchaseId)) {
            return Medal.getTalentLevel(purchaseId) >= this._getTalentMaxLevel(purchaseId);
        }
        return this.hasExchangeUnlock(purchaseId);
    },
    getAchievementPriceByPurchaseId: function (purchaseId) {
        var exchangeId = this.getExchangeIdByPurchaseId(purchaseId);
        if (!exchangeId) {
            return null;
        }
        var config = ExchangeAchievementConfig[exchangeId];
        if (!config) {
            return null;
        }
        return config.cost;
    },
    getConsumableAchievementPrice: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId) || purchaseId < 200 || !PurchaseList[purchaseId]) {
            return null;
        }

        var purchaseConfig = this.getPurchaseConfig(purchaseId);
        if (!purchaseConfig || purchaseConfig.price === undefined || purchaseConfig.price === null) {
            return null;
        }

        var price = Number(purchaseConfig.price);
        if (!isFinite(price)) {
            return null;
        }
        return price;
    },
    getShopUiState: function (purchaseId) {
        if (typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.getShopUiState === "function") {
            return PurchaseService.getShopUiState(purchaseId);
        }
        return null;
    },
    tryExchangePurchase: function (purchaseId) {
        if (!this.isExchangePurchase(purchaseId)) {
            return {handled: false, code: 2};
        }

        var exchangeId = this.getExchangeIdByPurchaseId(purchaseId);
        if (!exchangeId) {
            return {handled: true, code: 3};
        }

        var config = ExchangeAchievementConfig[exchangeId];
        if (!config) {
            return {handled: true, code: 2};
        }

        if (Medal.getAchievementPoints() < config.cost) {
            return {handled: true, code: 2};
        }

        if (!Medal.exchangeAchievement(exchangeId)) {
            return {handled: true, code: 2};
        }

        this.onIAPPaied(purchaseId);
        return {handled: true, code: 0};
    },
    isPaySdkBypassedForTest: function () {
        return !!this._bypassPaySdkForTest;
    },

    isBigBagUnlocked: function () {
        return this.isIAPUnlocked(105);
    },

    isBootUnlocked: function () {
        return this.isIAPUnlocked(106);
    },

    isDogHouseUnlocked: function () {
        return this.isIAPUnlocked(107);
    },

    initIAPRecord: function () {
        var record = cc.sys.localStorage.getItem("IAPRecord");
        var forceLockedRecord = cc.sys.localStorage.getItem("IAPForceLockedRecord");
        this._testForceLocked = {};
        if (forceLockedRecord !== undefined && forceLockedRecord !== null && forceLockedRecord !== "") {
            try {
                this._testForceLocked = JSON.parse(forceLockedRecord) || {};
            } catch (e) {
                this._testForceLocked = {};
            }
        }
        if (SafetyHelper.isEmpty(record)) {
            for (var IAPId in PurchaseList) {
                this._record[IAPId] = 0;
            }
        } else {
            this._record = SafetyHelper.safeJSONParse(record, null, "IAPPackage.initIAPRecord");
            if (!this._record) {
                this._record = {};
            }
            for (var IAPId in PurchaseList) {
                if (this._record[IAPId] === true) {
                    this._record[IAPId] = 1;
                } else if (this._record[IAPId] === false) {
                    this._record[IAPId] = 0;
                } else if (this._record[IAPId] === undefined || this._record[IAPId] === null) {
                    this._record[IAPId] = 0;
                }
            }
        }
    },
    saveIAPRecord: function () {
        cc.sys.localStorage.setItem("IAPRecord", JSON.stringify(this._record));
    },
    saveIAPForceLockedRecord: function () {
        cc.sys.localStorage.setItem("IAPForceLockedRecord", JSON.stringify(this._testForceLocked || {}));
    },

    resetConsumeIAP: function () {
        this._record[201] = 0;
        this._record[202] = 0;
        this._record[203] = 0;
        this._record[204] = 0;
        this._record[205] = 0;
        this._record[206] = 0;
        this._record[207] = 0;
        this._record[208] = 0;
        this._record[209] = 0;
        this.saveIAPRecord();
        this._emitShopStateChanged(null, "consume_reset", null);
    },
    syncIAPPurchased: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (!PurchaseList[purchaseId]) {
            return false;
        }
        if (this.isExchangePurchase(purchaseId)) {
            // Exchange-based purchases are driven by Medal state, not SDK restore/query.
            return false;
        }

        var prevCount = this._record[purchaseId] || 0;
        if (prevCount > 0 && !this._testForceLocked[purchaseId]) {
            return false;
        }

        this._record[purchaseId] = Math.max(1, prevCount);
        if (this._testForceLocked[purchaseId]) {
            delete this._testForceLocked[purchaseId];
            this.saveIAPForceLockedRecord();
        }
        this.saveIAPRecord();
        this._emitShopStateChanged(purchaseId, "purchase_sync", {
            recordCount: this._record[purchaseId]
        });
        return true;
    },
    onIAPPaied: function (purchaseId) {
        this._record[purchaseId]++;
        if (this._testForceLocked[purchaseId]) {
            delete this._testForceLocked[purchaseId];
            this.saveIAPForceLockedRecord();
        }
        this.saveIAPRecord();
        this._emitShopStateChanged(purchaseId, "purchase", {
            recordCount: this._record[purchaseId]
        });
    },
    _removeSingleUnlockRewardFromSavedRecord: function (purchaseId, recordName) {
        if (!recordName) {
            recordName = "record";
            if (typeof Record !== "undefined" && Record && Record.recordName) {
                recordName = Record.recordName;
            }
        }

        var recordObj = null;
        var canUseRecordCache = typeof Record !== "undefined"
            && Record
            && Record.recordObj
            && Record.recordName === recordName;
        if (canUseRecordCache) {
            recordObj = Record.recordObj;
        } else {
            var recordStr = cc.sys.localStorage.getItem(recordName);
            if (!recordStr) {
                return false;
            }
            try {
                recordObj = JSON.parse(recordStr);
            } catch (e) {
                return false;
            }
        }

        if (!recordObj || !recordObj.player) {
            return false;
        }

        var playerSave = recordObj.player;
        var changed = false;
        var removeItemFromSaveStorage = function (storageSaveObj, itemId) {
            if (!storageSaveObj) {
                return false;
            }
            if (storageSaveObj[itemId] === undefined || storageSaveObj[itemId] === null) {
                return false;
            }
            delete storageSaveObj[itemId];
            return true;
        };

        if (purchaseId === 105) {
            changed = removeItemFromSaveStorage(playerSave.storage, "1305024") || changed;
            changed = removeItemFromSaveStorage(playerSave.bag, "1305024") || changed;
        } else if (purchaseId === 106) {
            changed = removeItemFromSaveStorage(playerSave.storage, "1304024") || changed;
            changed = removeItemFromSaveStorage(playerSave.bag, "1304024") || changed;
        } else if (purchaseId === 107) {
            if (playerSave.room && playerSave.room["12"]) {
                playerSave.room["12"].level = -1;
                changed = true;
            }
        }

        if (!changed) {
            return false;
        }

        if (canUseRecordCache) {
            Record.recordObj.player = playerSave;
            if (typeof Record.flush === "function") {
                Record.flush();
            } else {
                cc.sys.localStorage.setItem(recordName, JSON.stringify(Record.recordObj));
            }
        } else {
            recordObj.player = playerSave;
            cc.sys.localStorage.setItem(recordName, JSON.stringify(recordObj));
        }
        return true;
    },
    _removeSingleUnlockRewardFromAllSavedRecords: function (purchaseId) {
        var recordNameList = ["record", "record_2", "record_3"];
        if (typeof Record !== "undefined" && Record && typeof Record.getAllRecordNames === "function") {
            recordNameList = Record.getAllRecordNames();
        }
        var changed = false;
        var self = this;
        recordNameList.forEach(function (recordName) {
            changed = self._removeSingleUnlockRewardFromSavedRecord(purchaseId, recordName) || changed;
        });
        return changed;
    },
    _syncChosenRoleAfterReset: function () {
        if (typeof role === "undefined" || !role || typeof role.getChoosenRoleType !== "function" || typeof role.isRoleUnlocked !== "function") {
            return;
        }
        if (typeof RoleType === "undefined" || !RoleType) {
            return;
        }
        var chosenRoleType = role.getChoosenRoleType();
        if (chosenRoleType !== RoleType.STRANGER && !role.isRoleUnlocked(chosenRoleType)) {
            role.chooseRoleType(RoleType.STRANGER);
        }
    },
    _removeSingleUnlockReward: function (purchaseId) {
        if (typeof player === "undefined" || !player) {
            this._removeSingleUnlockRewardFromAllSavedRecords(purchaseId);
            return;
        }

        var removeOneItemFromStorageLike = function (storageObj, itemId) {
            if (!storageObj || typeof storageObj.validateItem !== "function" || typeof storageObj.decreaseItem !== "function") {
                return false;
            }
            if (!storageObj.validateItem(itemId, 1)) {
                return false;
            }
            storageObj.decreaseItem(itemId, 1);
            return true;
        };

        if (purchaseId === 105) {
            if (!removeOneItemFromStorageLike(player.storage, 1305024)) {
                removeOneItemFromStorageLike(player.bag, 1305024);
            }
            return;
        }

        if (purchaseId === 106) {
            if (!removeOneItemFromStorageLike(player.storage, 1304024)) {
                removeOneItemFromStorageLike(player.bag, 1304024);
            }
            return;
        }

        if (purchaseId === 107) {
            if (player.room && typeof player.room.createBuild === "function") {
                // 恢复到未解锁状态，避免保留狗舍购买收益�?
                player.room.createBuild(12, -1);
            }
            return;
        }

        // 当前局之外的存档也同步处理，避免菜单商店重置后读取旧状态�?
        this._removeSingleUnlockRewardFromSavedRecord(purchaseId);
    },
    resetIAPPaid: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (!PurchaseList[purchaseId]) {
            return {refundedPoints: 0, resetCount: 0};
        }

        var refundedPoints = 0;
        var resetCount = 0;
        var exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);

        if (exchangeIds.length > 0) {
            var exchangeIdToCancel = this.getLastUnlockedExchangeIdByPurchaseId(purchaseId);
            if (exchangeIdToCancel) {
                var exchangeConfig = ExchangeAchievementConfig[exchangeIdToCancel];
                if (Medal.cancelExchange(exchangeIdToCancel)) {
                    refundedPoints += (exchangeConfig && exchangeConfig.cost) ? exchangeConfig.cost : 0;
                    resetCount = 1;
                }
            }
        } else {
            resetCount = this._record[purchaseId] || 0;
        }

        this._record[purchaseId] = Math.max(0, (this._record[purchaseId] || 0) - resetCount);
        if (this._unlockAllRoleAndTalentForTest && purchaseId < 200 && exchangeIds.length === 0) {
            this._testForceLocked[purchaseId] = 1;
            this.saveIAPForceLockedRecord();
        }

        var isSingleExchangeUnlock = exchangeIds.length === 1 && !this.isTalentPurchaseId(purchaseId);
        if (resetCount > 0 && isSingleExchangeUnlock && !this.isIAPUnlocked(purchaseId)) {
            this._removeSingleUnlockReward(purchaseId);
            this._syncChosenRoleAfterReset();
            if (typeof Record !== "undefined" && Record) {
                try {
                    // 菜单商店场景通常没有 player 对象，直接调�?saveAll 会抛错并中断后续UI刷新事件�?
                    if (typeof player !== "undefined" && player && typeof Record.saveAll === "function") {
                        Record.saveAll();
                    } else if (typeof Record.flush === "function" && Record.recordObj) {
                        Record.flush();
                    }
                } catch (e) {
                    cc.e("resetIAPPaid save record failed: " + e);
                }
            }
        }

        this.saveIAPRecord();
        this._emitShopStateChanged(purchaseId, "reset", {
            refundedPoints: refundedPoints,
            resetCount: resetCount
        });
        return {refundedPoints: refundedPoints, resetCount: resetCount};
    },
    payConsumeIAP: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (!PurchaseList[purchaseId]) {
            return false;
        }

        var purchaseInfo = PurchaseList[purchaseId];
        if (!purchaseInfo.multiPrice && this.isIAPUnlocked(purchaseId)) {
            return false;
        }

        // 消耗品成就点价格与现实货币价格 1:1（例�?3�?3点）
        var cost = this.getConsumableAchievementPrice(purchaseId);
        if (cost === null || cost === undefined) {
            return false;
        }

        if (!Medal.spendAchievementPoints(cost)) {
            return false;
        }

        var effect = purchaseInfo.effect;
        if (!effect || !effect.forEach) {
            return false;
        }
        effect.forEach(function (obj) {
            player.storage.increaseItem(obj.itemId, obj.num);
        });
        Record.saveAll();
        this.onIAPPaied(purchaseId);
        return true;
    },
    isIAPUnlocked: function (purchaseId) {
        if (purchaseId == 0) {
            return true;
        }

        // 天赋通过成就点解�?
        if (this.isTalentPurchaseId(purchaseId)) {
            return Medal.getTalentLevel(purchaseId) >= 1;
        }

        if (this.isExchangePurchase(purchaseId)) {
            return this.hasExchangeUnlock(purchaseId);
        }

        // 其他付费内容保持原逻辑
        if (this._unlockAllRoleAndTalentForTest && purchaseId < 200) {
            if (this._testForceLocked[purchaseId]) {
                return false;
            }
            return true;
        }

        if (purchaseId >= 200 && PurchaseList[purchaseId] && PurchaseList[purchaseId].multiPrice) {
            return false;
        }
        if (PurchaseList[purchaseId] && PurchaseList[purchaseId].multiPrice) {
            return this._record[purchaseId] >= 3;
        } else {
            return this._record[purchaseId] > 0;
        }
    },
    getPurchaseConfig: function (purchaseId) {
        var purchaseInfo = PurchaseList[purchaseId];
        var priceInfoIndex = 0;
        if (purchaseInfo.multiPrice) {
            priceInfoIndex = this._record[purchaseId];
            priceInfoIndex = Math.min(priceInfoIndex, purchaseInfo.priceList.length - 1);
        }
        var config = utils.clone(purchaseInfo.priceList[priceInfoIndex]);
        config.multiPrice = purchaseInfo.multiPrice;
        if (purchaseInfo.effect) {
            config.effect = purchaseInfo.effect;
        }
        config.priceIndex = priceInfoIndex;
        return config;
    },
    getPriceOff: function (purchaseId) {
        var purchaseInfo = PurchaseList[purchaseId];
        if (purchaseInfo.multiPrice) {
            var priceList = purchaseInfo.priceList;
            var priceInfoIndex = this._record[purchaseId];
            priceInfoIndex = Math.min(priceInfoIndex, priceList.length - 1);
            var off = Math.floor((priceList[priceList.length - 1].price - priceList[priceInfoIndex].price) / priceList[priceList.length - 1].price * 100);
            return off;
        } else {
            if (purchaseId == 206 || purchaseId == 207) {
                return 50;
            } else {
                return 0;
            }
        }
    }
};

TalentService.bindIAPCompatApi(IAPPackage);

