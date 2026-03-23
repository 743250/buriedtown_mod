/**
 * PurchaseService centralizes purchase/cancel entry points and exposes a
 * structured purchase result contract to UI callers.
 */
var PurchaseGatewayResultCode = {
    SUCCESS: 0,
    SDK_SUCCESS: 1,
    FAILED: 2,
    ALREADY_UNLOCKED: 3
};

var PurchaseService = {
    FAIL_REASON: {
        INVALID_PURCHASE: "INVALID_PURCHASE",
        INSUFFICIENT_POINTS: "INSUFFICIENT_POINTS",
        ALREADY_UNLOCKED: "ALREADY_UNLOCKED",
        MAX_LEVEL: "MAX_LEVEL",
        PURCHASE_FAILED: "PURCHASE_FAILED"
    },
    _normalizePurchaseId: function (purchaseId) {
        var normalizedPurchaseId = parseInt(purchaseId);
        if (isNaN(normalizedPurchaseId)) {
            return null;
        }
        return normalizedPurchaseId;
    },
    _resolvePurchaseLockPurchaseId: function (purchaseLock) {
        if (!purchaseLock || typeof purchaseLock !== "object") {
            return null;
        }
        return this._normalizePurchaseId(purchaseLock.purchaseId);
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
        if (purchaseId === null
            || !this.getPurchaseInfo(purchaseId)
            || !this._hasIAPMethod("getPurchaseConfig")) {
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
        var priceOff = 0;

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

        if (!isExchangePurchase) {
            priceOff = this.getPriceOff(purchaseId);
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
            priceOff: priceOff,
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
    _getRuntimePlayer: function () {
        if (typeof GameRuntime === "undefined"
            || !GameRuntime
            || typeof GameRuntime.getPlayer !== "function") {
            return null;
        }
        return GameRuntime.getPlayer();
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
        return this.grantUnlockRewardToPlayer(this._getRuntimePlayer(), purchaseId);
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
    _createPurchaseResult: function (purchaseId, overrides) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        var result = {
            purchaseId: purchaseId,
            isExchangePurchase: purchaseId === null ? false : this.isExchangePurchase(purchaseId),
            isConsumablePurchase: purchaseId !== null && purchaseId >= 200,
            isSuccess: false,
            isFailure: true,
            failedReason: this.FAIL_REASON.PURCHASE_FAILED,
            unlockRecorded: false,
            unlockRewardGranted: false,
            consumableGranted: false
        };
        if (overrides) {
            Object.keys(overrides).forEach(function (key) {
                result[key] = overrides[key];
            });
        }
        result.isSuccess = !!result.isSuccess;
        result.isFailure = !result.isSuccess;
        result.failedReason = result.isSuccess ? null : (result.failedReason || this.FAIL_REASON.PURCHASE_FAILED);
        return result;
    },
    _buildPurchaseFailureResult: function (purchaseId, failedReason, overrides) {
        overrides = overrides || {};
        overrides.failedReason = failedReason || this.FAIL_REASON.PURCHASE_FAILED;
        overrides.isSuccess = false;
        return this._createPurchaseResult(purchaseId, overrides);
    },
    _buildPurchaseSuccessResult: function (purchaseId, overrides) {
        overrides = overrides || {};
        overrides.isSuccess = true;
        overrides.failedReason = null;
        return this._createPurchaseResult(purchaseId, overrides);
    },
    _completeUnlockPurchase: function (purchaseId) {
        var syncResult = this.syncPurchasedUnlock(purchaseId);
        return this._buildPurchaseSuccessResult(purchaseId, {
            unlockRecorded: !!syncResult.recorded,
            unlockRewardGranted: !!syncResult.unlockRewardGranted
        });
    },
    _completeExchangePurchase: function (purchaseId) {
        return this._buildPurchaseSuccessResult(purchaseId, {
            unlockRewardGranted: this._grantUnlockReward(purchaseId)
        });
    },
    _getExchangePurchaseFailureReason: function (purchaseId) {
        if (this.isTalentPurchase(purchaseId)
            && this._hasIAPMethod("isPurchaseFullyUnlocked")
            && IAPPackage.isPurchaseFullyUnlocked(purchaseId)) {
            return this.FAIL_REASON.MAX_LEVEL;
        }
        return this.FAIL_REASON.ALREADY_UNLOCKED;
    },
    _purchaseExchange: function (purchaseId) {
        var exchangeId = this.getExchangeIdByPurchaseId(purchaseId);
        if (!exchangeId) {
            return this._buildPurchaseFailureResult(purchaseId, this._getExchangePurchaseFailureReason(purchaseId));
        }

        var exchangeConfig = typeof ExchangeAchievementConfig !== "undefined"
            ? ExchangeAchievementConfig[exchangeId]
            : null;
        if (!exchangeConfig) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.PURCHASE_FAILED);
        }
        if (this.getAchievementPoints() < exchangeConfig.cost) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.INSUFFICIENT_POINTS);
        }
        if (typeof Medal === "undefined"
            || !Medal
            || typeof Medal.exchangeAchievement !== "function"
            || !Medal.exchangeAchievement(exchangeId)) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.PURCHASE_FAILED);
        }
        if (this._hasIAPMethod("onIAPPaied")) {
            IAPPackage.onIAPPaied(purchaseId);
        }
        return this._completeExchangePurchase(purchaseId);
    },
    _purchaseConsumableWithAchievementPoints: function (purchaseId) {
        var purchaseInfo = this.getPurchaseInfo(purchaseId);
        var achievementPrice = this._getConsumableAchievementPrice(purchaseId);
        if (!purchaseInfo || achievementPrice === null || achievementPrice === undefined) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.PURCHASE_FAILED);
        }
        if (!purchaseInfo.multiPrice && this.isUnlocked(purchaseId)) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.ALREADY_UNLOCKED);
        }
        if (this.getAchievementPoints() < achievementPrice) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.INSUFFICIENT_POINTS);
        }
        if (!this._hasIAPMethod("payConsumeIAP") || !IAPPackage.payConsumeIAP(purchaseId)) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.PURCHASE_FAILED);
        }
        return this._buildPurchaseSuccessResult(purchaseId, {
            consumableGranted: true
        });
    },
    _resolveGatewayPurchaseResult: function (purchaseId, payResult) {
        if (payResult === PurchaseGatewayResultCode.ALREADY_UNLOCKED) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.ALREADY_UNLOCKED);
        }
        if (payResult !== PurchaseGatewayResultCode.SDK_SUCCESS) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.PURCHASE_FAILED);
        }
        return this._completeUnlockPurchase(purchaseId);
    },
    purchase: function (purchaseId, target, cb) {
        var self = this;
        var normalizedPurchaseId = this._normalizePurchaseId(purchaseId);
        var complete = function (result) {
            if (cb) {
                cb.call(target, result);
            }
        };

        if (normalizedPurchaseId === null) {
            complete(this._buildPurchaseFailureResult(null, this.FAIL_REASON.INVALID_PURCHASE));
            return;
        }

        if (normalizedPurchaseId >= 200) {
            complete(this._purchaseConsumableWithAchievementPoints(normalizedPurchaseId));
            return;
        }

        if (this.isExchangePurchase(normalizedPurchaseId)) {
            complete(this._purchaseExchange(normalizedPurchaseId));
            return;
        }

        if (this.isPaySdkBypassedForTest()) {
            complete(this._completeUnlockPurchase(normalizedPurchaseId));
            return;
        }

        var purchaseTask = PurchaseTaskManager.newTask(normalizedPurchaseId);
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
            complete(self._resolveGatewayPurchaseResult(paidPurchaseId, payResult));
        };
        purchaseTask.pay();
    }
};

GameKernel.register("PurchaseService", PurchaseService);
