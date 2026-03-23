/**
 * Created by lancelot on 15/6/11.
 */
var getIapRuntimeEmitter = function () {
    return GameRuntime.getEmitter();
};

var getIapRuntimeRecord = function () {
    return GameRuntime.getRecord();
};

var getIapRuntimePlayer = function () {
    return GameRuntime.getPlayer();
};

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
    },
    _emitShopStateChanged: function (purchaseId, reason, payload) {
        var runtimeEmitter = getIapRuntimeEmitter();
        if (!runtimeEmitter || typeof runtimeEmitter.emit !== "function") {
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

        runtimeEmitter.emit(this.SHOP_STATE_CHANGE_EVENT, {
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
    _getTalentLevel: function (purchaseId) {
        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getTalentLevel === "function") {
            return TalentService.getTalentLevel(purchaseId);
        }
        if (typeof Medal !== "undefined"
            && Medal
            && typeof Medal.getTalentLevel === "function") {
            return Medal.getTalentLevel(purchaseId);
        }
        return 0;
    },
    _isTalentUnlocked: function (purchaseId) {
        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.isTalentUnlocked === "function") {
            return !!TalentService.isTalentUnlocked(purchaseId);
        }
        return this._getTalentLevel(purchaseId) >= 1;
    },
    _isTalentFullyUnlocked: function (purchaseId) {
        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.isTalentFullyUnlocked === "function") {
            return !!TalentService.isTalentFullyUnlocked(purchaseId);
        }
        return this._getTalentLevel(purchaseId) >= this._getTalentMaxLevel(purchaseId);
    },
    _isTalentPurchaseId: function (purchaseId) {
        return !!(typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.isTalentPurchaseId === "function"
            && TalentService.isTalentPurchaseId(purchaseId));
    },
    _getPurchaseInfo: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)
            || typeof PurchaseList === "undefined"
            || !PurchaseList
            || !PurchaseList[purchaseId]) {
            return null;
        }
        return PurchaseList[purchaseId];
    },
    _getConsumablePurchaseIds: function () {
        if (typeof PurchaseList === "undefined" || !PurchaseList) {
            return [];
        }

        return Object.keys(PurchaseList).map(function (purchaseId) {
            return parseInt(purchaseId);
        }).filter(function (purchaseId) {
            return !isNaN(purchaseId) && purchaseId >= 200;
        }).sort(function (a, b) {
            return a - b;
        });
    },
    _getUnlockReward: function (purchaseId) {
        if (typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.getUnlockReward === "function") {
            return PurchaseService.getUnlockReward(purchaseId);
        }

        var purchaseInfo = this._getPurchaseInfo(purchaseId);
        var reward = purchaseInfo && purchaseInfo.unlockReward;
        if (!reward || typeof reward !== "object") {
            return null;
        }

        if (reward.type === "item") {
            var itemId = Number(reward.itemId);
            var num = Number(reward.num);
            if (!isFinite(itemId) || !isFinite(num) || num <= 0) {
                return null;
            }
            return {
                type: "item",
                itemId: parseInt(itemId),
                num: parseInt(num)
            };
        }

        if (reward.type === "build") {
            var bid = Number(reward.bid);
            var level = reward.level === undefined ? 0 : Number(reward.level);
            if (!isFinite(bid) || !isFinite(level)) {
                return null;
            }
            return {
                type: "build",
                bid: parseInt(bid),
                level: parseInt(level)
            };
        }

        return null;
    },
    _getConfiguredExchangeIdsByPurchaseId: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)
            || typeof ExchangeAchievementConfig === "undefined"
            || !ExchangeAchievementConfig) {
            return [];
        }

        var exchangeType = null;
        var targetId = purchaseId;

        if (this._isTalentPurchaseId(purchaseId)) {
            exchangeType = "talent";
        } else if (typeof role !== "undefined" && role && typeof role.getRoleTypeByPurchaseId === "function") {
            var roleType = role.getRoleTypeByPurchaseId(purchaseId);
            if (roleType !== null && roleType !== undefined) {
                exchangeType = "character";
                targetId = roleType;
            }
        }

        if (!exchangeType && purchaseId >= 100 && purchaseId < 200) {
            exchangeType = "item";
        }

        if (!exchangeType) {
            return [];
        }

        var exchangeIds = [];
        for (var exchangeId in ExchangeAchievementConfig) {
            var exchangeConfig = ExchangeAchievementConfig[exchangeId];
            if (!exchangeConfig || exchangeConfig.type !== exchangeType) {
                continue;
            }
            if (parseInt(exchangeConfig.targetId) !== targetId) {
                continue;
            }
            exchangeIds.push(parseInt(exchangeId));
        }

        exchangeIds.sort(function (a, b) {
            var configA = ExchangeAchievementConfig[a] || {};
            var configB = ExchangeAchievementConfig[b] || {};
            var levelA = isFinite(configA.level) ? parseInt(configA.level) : 1;
            var levelB = isFinite(configB.level) ? parseInt(configB.level) : 1;
            if (levelA !== levelB) {
                return levelA - levelB;
            }
            return a - b;
        });

        return exchangeIds;
    },
    getExchangeIdsByPurchaseId: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)) {
            return [];
        }
        return this._getConfiguredExchangeIdsByPurchaseId(purchaseId);
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
        if (this._isTalentPurchaseId(purchaseId)) {
            return this._isTalentFullyUnlocked(purchaseId);
        }
        return this.hasExchangeUnlock(purchaseId);
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
        var self = this;
        this._getConsumablePurchaseIds().forEach(function (purchaseId) {
            self._record[purchaseId] = 0;
        });
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
    _decreaseSavedItemCount: function (storageSaveObj, itemId, num) {
        num = Number(num);
        if (!storageSaveObj || !isFinite(num) || num <= 0) {
            return num;
        }

        var currentNum = Number(storageSaveObj[itemId] || 0);
        if (!isFinite(currentNum) || currentNum <= 0) {
            return num;
        }

        var nextNum = currentNum - num;
        if (nextNum > 0) {
            storageSaveObj[itemId] = nextNum;
            return 0;
        }

        delete storageSaveObj[itemId];
        return Math.abs(nextNum);
    },
    _removeSingleUnlockRewardFromSavedRecord: function (purchaseId, recordName) {
        var reward = this._getUnlockReward(purchaseId);
        if (!reward) {
            return false;
        }
        var runtimeRecord = getIapRuntimeRecord();
        if (!recordName) {
            recordName = "record";
            if (runtimeRecord && runtimeRecord.recordName) {
                recordName = runtimeRecord.recordName;
            }
        }

        var recordObj = null;
        var canUseRecordCache = runtimeRecord
            && runtimeRecord.recordObj
            && runtimeRecord.recordName === recordName;
        if (canUseRecordCache) {
            recordObj = runtimeRecord.recordObj;
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
        if (reward.type === "item") {
            var remainingNum = reward.num;
            remainingNum = this._decreaseSavedItemCount(playerSave.storage, reward.itemId, remainingNum);
            remainingNum = this._decreaseSavedItemCount(playerSave.bag, reward.itemId, remainingNum);
            changed = remainingNum !== reward.num;
        } else if (reward.type === "build") {
            if (playerSave.room && playerSave.room["" + reward.bid]) {
                playerSave.room["" + reward.bid].level = -1;
                changed = true;
            }
        }

        if (!changed) {
            return false;
        }

        if (canUseRecordCache) {
            runtimeRecord.recordObj.player = playerSave;
            if (typeof runtimeRecord.flush === "function") {
                runtimeRecord.flush();
            } else {
                cc.sys.localStorage.setItem(recordName, JSON.stringify(runtimeRecord.recordObj));
            }
        } else {
            recordObj.player = playerSave;
            cc.sys.localStorage.setItem(recordName, JSON.stringify(recordObj));
        }
        return true;
    },
    _removeSingleUnlockRewardFromAllSavedRecords: function (purchaseId) {
        var recordNameList = ["record", "record_2", "record_3"];
        var runtimeRecord = getIapRuntimeRecord();
        if (runtimeRecord && typeof runtimeRecord.getAllRecordNames === "function") {
            recordNameList = runtimeRecord.getAllRecordNames();
        }
        var changed = false;
        var self = this;
        recordNameList.forEach(function (recordName) {
            changed = self._removeSingleUnlockRewardFromSavedRecord(purchaseId, recordName) || changed;
        });
        return changed;
    },
    _decreaseItemCountFromStorageLike: function (storageObj, itemId, num) {
        num = Number(num);
        if (!storageObj
            || !isFinite(num)
            || num <= 0
            || typeof storageObj.getNumByItemId !== "function"
            || typeof storageObj.decreaseItem !== "function") {
            return num;
        }

        var currentNum = Number(storageObj.getNumByItemId(itemId) || 0);
        if (!isFinite(currentNum) || currentNum <= 0) {
            return num;
        }

        var removedNum = Math.min(currentNum, num);
        if (removedNum > 0) {
            storageObj.decreaseItem(itemId, removedNum);
        }
        return num - removedNum;
    },
    _removeSingleUnlockReward: function (purchaseId) {
        var reward = this._getUnlockReward(purchaseId);
        if (!reward) {
            return;
        }
        var runtimePlayer = getIapRuntimePlayer();
        if (!runtimePlayer) {
            this._removeSingleUnlockRewardFromAllSavedRecords(purchaseId);
            return;
        }

        if (reward.type === "item") {
            var remainingNum = reward.num;
            remainingNum = this._decreaseItemCountFromStorageLike(runtimePlayer.storage, reward.itemId, remainingNum);
            this._decreaseItemCountFromStorageLike(runtimePlayer.bag, reward.itemId, remainingNum);
            return;
        }

        if (reward.type === "build") {
            if (runtimePlayer.room && typeof runtimePlayer.room.createBuild === "function") {
                runtimePlayer.room.createBuild(reward.bid, -1);
            }
            return;
        }

        // 当前局之外的存档也同步处理，避免菜单商店重置后读取旧状态。
        this._removeSingleUnlockRewardFromSavedRecord(purchaseId);
    },
    payConsumeIAP: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (!PurchaseList[purchaseId]) {
            return false;
        }
        var runtimePlayer = getIapRuntimePlayer();
        var runtimeRecord = getIapRuntimeRecord();
        if (!runtimePlayer || !runtimePlayer.storage) {
            return false;
        }

        var purchaseInfo = PurchaseList[purchaseId];
        if (!purchaseInfo.multiPrice && this.isIAPUnlocked(purchaseId)) {
            return false;
        }

        // 消耗品成就点价格与现实货币价格 1:1（例如 3元=3点）
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
            runtimePlayer.storage.increaseItem(obj.itemId, obj.num);
        });
        if (runtimeRecord && typeof runtimeRecord.saveAll === "function") {
            runtimeRecord.saveAll();
        }
        this.onIAPPaied(purchaseId);
        return true;
    },
    isIAPUnlocked: function (purchaseId) {
        if (purchaseId == 0) {
            return true;
        }

        // 天赋通过成就点解锁
        if (this._isTalentPurchaseId(purchaseId)) {
            return this._isTalentUnlocked(purchaseId);
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
        if (!purchaseInfo || !purchaseInfo.priceList || !purchaseInfo.priceList.length) {
            return null;
        }
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
    }
};
