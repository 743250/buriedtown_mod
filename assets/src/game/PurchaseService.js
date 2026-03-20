/**
 * PurchaseService centralizes purchase/cancel entry points and
 * legacy pay-result interpretation to reduce scattered shop logic.
 */
var PurchaseService = {
    LEGACY_RESULT: {
        SUCCESS: 0,
        SDK_SUCCESS: 1,
        FAILED: 2,
        ALREADY_UNLOCKED: 3
    },
    FAIL_REASON: {
        INVALID_PURCHASE: "INVALID_PURCHASE",
        INSUFFICIENT_POINTS: "INSUFFICIENT_POINTS",
        ALREADY_UNLOCKED: "ALREADY_UNLOCKED",
        MAX_LEVEL: "MAX_LEVEL",
        PURCHASE_FAILED: "PURCHASE_FAILED"
    },
    LEGACY_PURCHASE_LOCK_PURCHASE_IDS: {
        isBigBagUnlocked: 105,
        isBootUnlocked: 106,
        isDogHouseUnlocked: 107
    },
    _normalizePurchaseId: function (purchaseId) {
        var normalizedPurchaseId = parseInt(purchaseId);
        if (isNaN(normalizedPurchaseId)) {
            return null;
        }
        return normalizedPurchaseId;
    },
    _getLegacyPurchaseLockPurchaseId: function (checkFn) {
        if (typeof checkFn !== "string" || !this.LEGACY_PURCHASE_LOCK_PURCHASE_IDS.hasOwnProperty(checkFn)) {
            return null;
        }
        return this.LEGACY_PURCHASE_LOCK_PURCHASE_IDS[checkFn];
    },
    _resolvePurchaseLockPurchaseId: function (purchaseLock) {
        if (!purchaseLock || typeof purchaseLock !== "object") {
            return null;
        }

        var purchaseId = this._normalizePurchaseId(purchaseLock.purchaseId);
        if (purchaseId !== null) {
            return purchaseId;
        }

        return this._getLegacyPurchaseLockPurchaseId(purchaseLock.checkFn);
    },
    isExchangePurchase: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return false;
        }
        return this.getExchangeIdsByPurchaseId(purchaseId).length > 0;
    },
    _hasIAPMethod: function (methodName) {
        return typeof IAPPackage !== "undefined"
            && IAPPackage
            && typeof IAPPackage[methodName] === "function";
    },
    initPackage: function () {
        if (!this._hasIAPMethod("initPackage")) {
            return false;
        }
        IAPPackage.initPackage();
        return true;
    },
    resetConsumablePurchases: function () {
        if (!this._hasIAPMethod("resetConsumeIAP")) {
            return false;
        }
        IAPPackage.resetConsumeIAP();
        return true;
    },
    isPaySdkBypassedForTest: function () {
        if (!this._hasIAPMethod("isPaySdkBypassedForTest")) {
            return false;
        }
        return !!IAPPackage.isPaySdkBypassedForTest();
    },
    getShopStateChangeEventName: function () {
        if (typeof IAPPackage !== "undefined" && IAPPackage && IAPPackage.SHOP_STATE_CHANGE_EVENT) {
            return IAPPackage.SHOP_STATE_CHANGE_EVENT;
        }
        return "shop_state_change";
    },
    getPurchaseInfo: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null
            || typeof PurchaseList === "undefined"
            || !PurchaseList
            || !PurchaseList[purchaseId]) {
            return null;
        }
        return PurchaseList[purchaseId];
    },
    getPurchaseConfig: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this._hasIAPMethod("getPurchaseConfig")) {
            return null;
        }
        return IAPPackage.getPurchaseConfig(purchaseId);
    },
    getExchangeIdsByPurchaseId: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this._hasIAPMethod("getExchangeIdsByPurchaseId")) {
            return [];
        }
        return IAPPackage.getExchangeIdsByPurchaseId(purchaseId) || [];
    },
    getExchangeIdByPurchaseId: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this._hasIAPMethod("getExchangeIdByPurchaseId")) {
            return null;
        }
        return IAPPackage.getExchangeIdByPurchaseId(purchaseId);
    },
    _getConsumableAchievementPrice: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        var purchaseInfo = this.getPurchaseInfo(purchaseId);
        if (purchaseId === null
            || purchaseId < 200
            || !purchaseInfo) {
            return null;
        }

        var purchaseConfig = this.getPurchaseConfig(purchaseId);
        if (!purchaseConfig || purchaseConfig.price === undefined || purchaseConfig.price === null) {
            return null;
        }

        var price = Number(purchaseConfig.price);
        return isFinite(price) ? price : null;
    },
    getAchievementPoints: function () {
        if (typeof Medal === "undefined"
            || !Medal
            || typeof Medal.getAchievementPoints !== "function") {
            return 0;
        }

        var achievementPoints = Number(Medal.getAchievementPoints());
        if (!isFinite(achievementPoints) || achievementPoints < 0) {
            return 0;
        }
        return Math.max(0, parseInt(achievementPoints));
    },
    getTalentLevel: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this.isTalentPurchase(purchaseId)) {
            return 0;
        }

        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getTalentLevel === "function") {
            var serviceLevel = Number(TalentService.getTalentLevel(purchaseId));
            if (isFinite(serviceLevel) && serviceLevel > 0) {
                return parseInt(serviceLevel);
            }
            return 0;
        }

        if (typeof Medal !== "undefined"
            && Medal
            && typeof Medal.getTalentLevel === "function") {
            var medalLevel = Number(Medal.getTalentLevel(purchaseId));
            if (isFinite(medalLevel) && medalLevel > 0) {
                return parseInt(medalLevel);
            }
        }

        return 0;
    },
    getShopUiState: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return null;
        }

        var isExchangePurchase = this.isExchangePurchase(purchaseId);
        var isTalentPurchase = this.isTalentPurchase(purchaseId);
        var isUnlocked = this.isUnlocked(purchaseId);
        var nextAchievementPrice = null;
        var achievementPoints = this.getAchievementPoints();
        var priceText = "";
        var canBuy = false;
        var canCancel = false;
        var shouldHideBuyButton = false;
        var badgeText = "";
        var hideBadge = false;
        var disabledReason = "";

        if (isExchangePurchase) {
            nextAchievementPrice = this.getAchievementPriceByPurchaseId(purchaseId);
            shouldHideBuyButton = nextAchievementPrice === null || nextAchievementPrice === undefined;

            if (shouldHideBuyButton) {
                canBuy = false;
                if (isTalentPurchase) {
                    priceText = "已满级";
                    disabledReason = "MAX_LEVEL";
                } else {
                    priceText = "已购";
                    disabledReason = "ALREADY_UNLOCKED";
                }
            } else {
                priceText = nextAchievementPrice + " 成就点";
                canBuy = achievementPoints >= nextAchievementPrice;
                if (!canBuy) {
                    disabledReason = "INSUFFICIENT_POINTS";
                }
            }

            if (isTalentPurchase) {
                if (shouldHideBuyButton) {
                    badgeText = "已满级";
                    hideBadge = false;
                } else {
                    hideBadge = true;
                }
            } else if (isUnlocked) {
                badgeText = "已购";
            }
        } else if (purchaseId >= 200) {
            nextAchievementPrice = this._getConsumableAchievementPrice(purchaseId);
            shouldHideBuyButton = nextAchievementPrice === null || nextAchievementPrice === undefined;

            if (shouldHideBuyButton) {
                canBuy = false;
                disabledReason = "NO_PRICE";
            } else {
                priceText = nextAchievementPrice + " 成就点";
                if (isUnlocked) {
                    canBuy = false;
                    disabledReason = "ALREADY_UNLOCKED";
                } else {
                    canBuy = achievementPoints >= nextAchievementPrice;
                    if (!canBuy) {
                        disabledReason = "INSUFFICIENT_POINTS";
                    }
                }
            }

            if (isUnlocked) {
                badgeText = "已购";
            }
        } else {
            var purchaseConfig = this.getPurchaseConfig(purchaseId);
            if (purchaseConfig) {
                priceText = purchaseConfig.productPriceStr;
                if (!priceText) {
                    if (typeof stringUtil !== "undefined" && stringUtil && typeof stringUtil.getString === "function") {
                        priceText = stringUtil.getString(1191, purchaseConfig.price);
                    } else {
                        priceText = "" + purchaseConfig.price;
                    }
                }
            }

            canBuy = !isUnlocked;
            if (!canBuy) {
                disabledReason = "ALREADY_UNLOCKED";
            }
            if (isUnlocked) {
                badgeText = "已购";
            }
        }

        return {
            purchaseId: purchaseId,
            isExchangePurchase: isExchangePurchase,
            isTalentPurchase: isTalentPurchase,
            isUnlocked: isUnlocked,
            currentTalentLevel: isTalentPurchase ? this.getTalentLevel(purchaseId) : 0,
            nextAchievementPrice: nextAchievementPrice,
            achievementPoints: achievementPoints,
            priceText: priceText,
            canBuy: !!canBuy,
            canCancel: !!canCancel,
            shouldHideBuyButton: !!shouldHideBuyButton,
            badgeText: badgeText,
            hideBadge: !!hideBadge,
            disabledReason: disabledReason
        };
    },
    getAchievementPriceByPurchaseId: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null
            || typeof ExchangeAchievementConfig === "undefined"
            || !ExchangeAchievementConfig) {
            return null;
        }
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
    isTalentPurchase: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return false;
        }
        return !!(typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.isTalentPurchaseId === "function"
            && TalentService.isTalentPurchaseId(purchaseId));
    },
    isUnlocked: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this._hasIAPMethod("isIAPUnlocked")) {
            return false;
        }
        return !!IAPPackage.isIAPUnlocked(purchaseId);
    },
    getPriceOff: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        var purchaseInfo = this.getPurchaseInfo(purchaseId);
        if (purchaseId === null || !purchaseInfo) {
            return 0;
        }
        if (purchaseInfo.multiPrice) {
            var priceList = purchaseInfo.priceList || [];
            if (!priceList.length) {
                return 0;
            }
            var purchaseConfig = this.getPurchaseConfig(purchaseId);
            var priceInfoIndex = purchaseConfig && isFinite(purchaseConfig.priceIndex)
                ? Math.min(parseInt(purchaseConfig.priceIndex), priceList.length - 1)
                : 0;
            var originalPrice = Number(priceList[priceList.length - 1].price);
            var currentPrice = Number(priceList[priceInfoIndex].price);
            if (!(originalPrice > 0) || !isFinite(currentPrice)) {
                return 0;
            }
            return Math.floor((originalPrice - currentPrice) / originalPrice * 100);
        }
        var configuredDiscountPercent = Number(purchaseInfo.discountPercent);
        if (!isFinite(configuredDiscountPercent) || configuredDiscountPercent <= 0) {
            return 0;
        }
        return Math.max(0, parseInt(configuredDiscountPercent));
    },
    isPurchaseLockUnlocked: function (purchaseLock) {
        if (!purchaseLock || typeof purchaseLock !== "object") {
            return true;
        }
        var purchaseId = this._resolvePurchaseLockPurchaseId(purchaseLock);
        if (purchaseId === null) {
            return true;
        }
        return this.isUnlocked(purchaseId);
    },
    _getSortedPurchaseIds: function (filterFn) {
        if (typeof PurchaseList === "undefined" || !PurchaseList) {
            return [];
        }
        return Object.keys(PurchaseList).map(function (purchaseId) {
            return parseInt(purchaseId);
        }).filter(function (purchaseId) {
            if (isNaN(purchaseId)) {
                return false;
            }
            return !filterFn || filterFn(purchaseId);
        }).sort(function (a, b) {
            return a - b;
        });
    },
    _dedupePurchaseIds: function (purchaseIdList) {
        var uniqueMap = {};
        var result = [];
        if (!Array.isArray(purchaseIdList)) {
            return result;
        }

        purchaseIdList.forEach(function (purchaseId) {
            purchaseId = parseInt(purchaseId);
            if (isNaN(purchaseId) || uniqueMap[purchaseId]) {
                return;
            }
            uniqueMap[purchaseId] = true;
            result.push(purchaseId);
        });
        return result;
    },
    getRolePurchaseIds: function () {
        if (typeof role === "undefined"
            || !role
            || typeof role.getAllRoleTypes !== "function"
            || typeof role.getPurchaseIdByRoleType !== "function") {
            return [];
        }

        var rolePurchaseIds = role.getAllRoleTypes().map(function (roleType) {
            return role.getPurchaseIdByRoleType(roleType);
        }).filter(function (purchaseId) {
            return !!purchaseId && typeof PurchaseList !== "undefined" && PurchaseList && !!PurchaseList[purchaseId];
        }).sort(function (a, b) {
            return a - b;
        });

        return this._dedupePurchaseIds(rolePurchaseIds);
    },
    isRoleUnlocked: function (roleType) {
        if (typeof role === "undefined"
            || !role
            || typeof role.getPurchaseIdByRoleType !== "function"
            || typeof role.isRolePurchaseRequired !== "function") {
            return false;
        }

        roleType = parseInt(roleType);
        if (isNaN(roleType)) {
            return false;
        }
        if (!role.isRolePurchaseRequired(roleType)) {
            return true;
        }

        var purchaseId = role.getPurchaseIdByRoleType(roleType);
        if (purchaseId === null || purchaseId === undefined) {
            return false;
        }
        return this.isUnlocked(purchaseId);
    },
    getTalentPurchaseIds: function () {
        var talentPurchaseIds = [];
        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getTalentPurchaseIdList === "function") {
            talentPurchaseIds = TalentService.getTalentPurchaseIdList().filter(function (purchaseId) {
                return purchaseId > 0
                    && typeof PurchaseList !== "undefined"
                    && PurchaseList
                    && !!PurchaseList[purchaseId];
            });
        } else {
            var self = this;
            talentPurchaseIds = this._getSortedPurchaseIds(function (purchaseId) {
                return self.isTalentPurchase(purchaseId);
            });
        }
        return this._dedupePurchaseIds(talentPurchaseIds).sort(function (a, b) {
            return a - b;
        });
    },
    getExchangeItemPurchaseIds: function () {
        var itemPurchaseIds = [];
        if (typeof ExchangeAchievementConfig !== "undefined" && ExchangeAchievementConfig) {
            for (var exchangeId in ExchangeAchievementConfig) {
                var exchangeConfig = ExchangeAchievementConfig[exchangeId];
                if (!exchangeConfig || exchangeConfig.type !== "item") {
                    continue;
                }
                var purchaseId = parseInt(exchangeConfig.targetId);
                if (isNaN(purchaseId)
                    || typeof PurchaseList === "undefined"
                    || !PurchaseList
                    || !PurchaseList[purchaseId]) {
                    continue;
                }
                itemPurchaseIds.push(purchaseId);
            }
        }
        return this._dedupePurchaseIds(itemPurchaseIds).sort(function (a, b) {
            return a - b;
        });
    },
    getMainShopPurchaseIds: function () {
        return this._dedupePurchaseIds(
            this.getRolePurchaseIds()
                .concat(this.getExchangeItemPurchaseIds())
                .concat(this.getTalentPurchaseIds())
        );
    },
    getConsumablePurchaseIds: function () {
        return this._getSortedPurchaseIds(function (purchaseId) {
            return purchaseId >= 200;
        });
    },
    getUnlockRewardPurchaseIds: function () {
        var self = this;
        return this._getSortedPurchaseIds(function (purchaseId) {
            var purchaseInfo = self.getPurchaseInfo(purchaseId);
            return !!(purchaseInfo && purchaseInfo.unlockReward);
        });
    },
    getUnlockReward: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return null;
        }

        var purchaseInfo = this.getPurchaseInfo(purchaseId);
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
    _getPlayerOwnedItemCount: function (playerObj, itemId) {
        if (!playerObj) {
            return 0;
        }
        if (typeof playerObj.getItemNumInPlayer === "function") {
            var totalNum = Number(playerObj.getItemNumInPlayer(itemId));
            return isNaN(totalNum) ? 0 : totalNum;
        }

        var total = 0;
        ["storage", "bag"].forEach(function (key) {
            var storageLike = playerObj[key];
            if (storageLike && typeof storageLike.getNumByItemId === "function") {
                total += Number(storageLike.getNumByItemId(itemId) || 0);
            }
        });
        return total;
    },
    grantUnlockRewardToPlayer: function (playerObj, purchaseId) {
        var reward = this.getUnlockReward(purchaseId);
        if (!reward || !playerObj) {
            return false;
        }

        if (reward.type === "item") {
            if (!playerObj.storage || typeof playerObj.storage.increaseItem !== "function") {
                return false;
            }
            var ownedNum = this._getPlayerOwnedItemCount(playerObj, reward.itemId);
            if (ownedNum >= reward.num) {
                return false;
            }
            playerObj.storage.increaseItem(reward.itemId, reward.num - ownedNum);
            return true;
        }

        if (reward.type === "build") {
            if (!playerObj.room
                || typeof playerObj.room.isBuildExist !== "function"
                || typeof playerObj.room.createBuild !== "function") {
                return false;
            }
            if (playerObj.room.isBuildExist(reward.bid, reward.level)) {
                return false;
            }
            playerObj.room.createBuild(reward.bid, reward.level);
            return true;
        }

        return false;
    },
    reconcileUnlockRewardsForPlayer: function (playerObj, purchaseIds) {
        var changed = false;
        var targetPurchaseIds = Array.isArray(purchaseIds)
            ? purchaseIds.slice()
            : this.getUnlockRewardPurchaseIds();

        targetPurchaseIds.forEach(function (purchaseId) {
            purchaseId = this._normalizePurchaseId(purchaseId);
            if (purchaseId === null || !this.isUnlocked(purchaseId)) {
                return;
            }
            if (this.grantUnlockRewardToPlayer(playerObj, purchaseId)) {
                changed = true;
            }
        }, this);

        return changed;
    },
    _grantUnlockReward: function (purchaseId) {
        if (typeof player === "undefined" || !player) {
            return false;
        }
        return this.grantUnlockRewardToPlayer(player, purchaseId);
    },
    syncPurchasedUnlock: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return {
                purchaseId: null,
                recorded: false,
                unlockRewardGranted: false,
                changed: false
            };
        }

        if (this.isExchangePurchase(purchaseId)) {
            return {
                purchaseId: purchaseId,
                recorded: false,
                unlockRewardGranted: false,
                changed: false
            };
        }

        var recorded = false;
        if (this._hasIAPMethod("syncIAPPurchased")) {
            recorded = !!IAPPackage.syncIAPPurchased(purchaseId);
        } else if (!this._hasIAPMethod("isIAPUnlocked") || !IAPPackage.isIAPUnlocked(purchaseId)) {
            if (this._hasIAPMethod("onIAPPaied")) {
                IAPPackage.onIAPPaied(purchaseId);
                recorded = true;
            }
        }

        var unlockRewardGranted = this._grantUnlockReward(purchaseId);
        return {
            purchaseId: purchaseId,
            recorded: recorded,
            unlockRewardGranted: unlockRewardGranted,
            changed: recorded || unlockRewardGranted
        };
    },
    applyPurchaseResult: function (purchaseId, payResult) {
        var outcome = this.getPurchaseOutcome(purchaseId, payResult);
        var result = {
            purchaseId: outcome.purchaseId,
            rawResult: outcome.rawResult,
            legacyResultCode: outcome.rawResult,
            isExchangePurchase: outcome.isExchangePurchase,
            isSuccess: outcome.isSuccess,
            isFailure: outcome.isFailure,
            isAlreadyUnlocked: outcome.isAlreadyUnlocked,
            isAchievementPointFailure: outcome.isAchievementPointFailure,
            failedReason: outcome.failedReason,
            unlockRecorded: false,
            unlockRewardGranted: false,
            consumableGranted: false
        };

        if (!result.isSuccess || result.purchaseId === null) {
            return result;
        }

        if (outcome.isConsumablePurchase) {
            result.consumableGranted = true;
        }

        if (outcome.needsUnlockRecord) {
            var syncResult = this.syncPurchasedUnlock(result.purchaseId);
            result.unlockRecorded = !!syncResult.recorded;
            result.unlockRewardGranted = !!syncResult.unlockRewardGranted;
        } else if (outcome.needsUnlockReward) {
            result.unlockRewardGranted = this._grantUnlockReward(result.purchaseId);
        }

        return result;
    },
    purchase: function (purchaseId, target, cb) {
        var self = this;
        this.purchaseLegacy(purchaseId, target, function (paidPurchaseId, payResult) {
            var result = self.applyPurchaseResult(paidPurchaseId, payResult);
            if (cb) {
                cb.call(target, result);
            }
        });
    },
    getPurchaseOutcome: function (purchaseId, payResult) {
        purchaseId = this._normalizePurchaseId(purchaseId);

        var isExchangePurchase = purchaseId === null ? false : this.isExchangePurchase(purchaseId);
        var isConsumablePurchase = purchaseId !== null && purchaseId >= 200;
        var isTalentPurchase = purchaseId === null ? false : this.isTalentPurchase(purchaseId);
        var isBypassSuccess = purchaseId !== null
            && !isExchangePurchase
            && !isConsumablePurchase
            && payResult == this.LEGACY_RESULT.SUCCESS
            && this.isPaySdkBypassedForTest();
        var isSuccess = false;
        if (purchaseId !== null) {
            if (isExchangePurchase) {
                isSuccess = payResult == this.LEGACY_RESULT.SUCCESS;
            } else if (isConsumablePurchase) {
                isSuccess = payResult == this.LEGACY_RESULT.SDK_SUCCESS;
            } else {
                isSuccess = payResult == this.LEGACY_RESULT.SDK_SUCCESS || isBypassSuccess;
            }
        }

        var isAlreadyUnlocked = purchaseId !== null
            && isExchangePurchase
            && payResult == this.LEGACY_RESULT.ALREADY_UNLOCKED;
        var isAchievementPointFailure = purchaseId !== null
            && payResult == this.LEGACY_RESULT.FAILED
            && (isExchangePurchase || isConsumablePurchase);
        var failedReason = null;
        if (purchaseId === null) {
            failedReason = this.FAIL_REASON.INVALID_PURCHASE;
        } else if (!isSuccess) {
            if (isAlreadyUnlocked) {
                failedReason = isTalentPurchase
                    ? this.FAIL_REASON.MAX_LEVEL
                    : this.FAIL_REASON.ALREADY_UNLOCKED;
            } else if (isAchievementPointFailure) {
                failedReason = this.FAIL_REASON.INSUFFICIENT_POINTS;
            } else {
                failedReason = this.FAIL_REASON.PURCHASE_FAILED;
            }
        }

        return {
            purchaseId: purchaseId,
            rawResult: payResult,
            isExchangePurchase: isExchangePurchase,
            isConsumablePurchase: isConsumablePurchase,
            isSuccess: isSuccess,
            isFailure: !isSuccess,
            needsUnlockRecord: purchaseId !== null
                && isSuccess
                && !isExchangePurchase
                && !isConsumablePurchase,
            needsUnlockReward: purchaseId !== null
                && isSuccess
                && isExchangePurchase,
            needsManualUnlockRecord: purchaseId !== null
                && isSuccess
                && !isExchangePurchase
                && !isConsumablePurchase,
            needsManualConsumableGrant: false,
            isAlreadyUnlocked: isAlreadyUnlocked,
            isAchievementPointFailure: isAchievementPointFailure,
            failedReason: failedReason
        };
    },
    isLegacySuccess: function (purchaseId, payResult) {
        return this.getPurchaseOutcome(purchaseId, payResult).isSuccess;
    },
    needsManualUnlockRecord: function (purchaseId, payResult) {
        return this.getPurchaseOutcome(purchaseId, payResult).needsUnlockRecord;
    },
    needsManualConsumableGrant: function (purchaseId, payResult) {
        return this.getPurchaseOutcome(purchaseId, payResult).needsManualConsumableGrant;
    },
    purchaseLegacy: function (purchaseId, target, cb) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            if (cb) {
                cb.call(target, purchaseId, this.LEGACY_RESULT.FAILED);
            }
            return;
        }

        // Support-pack consumables (201-209) should be bought via achievement points directly.
        if (purchaseId >= 200) {
            var consumePurchased = IAPPackage.payConsumeIAP(purchaseId);
            if (cb) {
                cb.call(
                    target,
                    purchaseId,
                    consumePurchased ? this.LEGACY_RESULT.SDK_SUCCESS : this.LEGACY_RESULT.FAILED
                );
            }
            return;
        }

        var exchangeResult = IAPPackage.tryExchangePurchase(purchaseId);
        if (exchangeResult.handled) {
            if (cb) {
                cb.call(target, purchaseId, exchangeResult.code);
            }
            return;
        }

        if (this.isPaySdkBypassedForTest()) {
            if (cb) {
                // Keep historical bypass behavior for existing callback contracts.
                cb.call(target, purchaseId, this.LEGACY_RESULT.SUCCESS);
            }
            return;
        }

        var purchaseTask = PurchaseTaskManager.newTask(purchaseId);
        purchaseTask.beforePay = function () {
            if (cc.sys.isNative) {
                uiUtil.showLoadingView();
                if (cc.timer) {
                    cc.timer.pause();
                }
            }
        };
        purchaseTask.afterPay = function (paidPurchaseId, payResult) {
            if (cc.sys.isNative) {
                uiUtil.dismissLoadingView();
                if (cc.timer) {
                    cc.timer.resume();
                }
            }
            if (cb) {
                cb.call(target, paidPurchaseId, payResult);
            }
        };
        purchaseTask.pay();
    }
};

GameKernel.register("PurchaseService", PurchaseService);
