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
        if (!this._hasIAPMethod("resetConsumablePurchaseRecords")) {
            return false;
        }
        IAPPackage.resetConsumablePurchaseRecords();
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
    _getTalentMaxLevel: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this.isTalentPurchase(purchaseId)) {
            return 0;
        }

        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getTalentMaxLevel === "function") {
            var serviceMaxLevel = Number(TalentService.getTalentMaxLevel(purchaseId));
            if (isFinite(serviceMaxLevel) && serviceMaxLevel > 0) {
                return parseInt(serviceMaxLevel);
            }
        }

        return 3;
    },
    _isTalentUnlocked: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this.isTalentPurchase(purchaseId)) {
            return false;
        }

        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.isTalentUnlocked === "function") {
            return !!TalentService.isTalentUnlocked(purchaseId);
        }
        return this.getTalentLevel(purchaseId) >= 1;
    },
    _isTalentFullyUnlocked: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this.isTalentPurchase(purchaseId)) {
            return false;
        }

        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.isTalentFullyUnlocked === "function") {
            return !!TalentService.isTalentFullyUnlocked(purchaseId);
        }
        return this.getTalentLevel(purchaseId) >= this._getTalentMaxLevel(purchaseId);
    },
    _getConfiguredExchangeIdsByPurchaseId: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null
            || typeof ExchangeAchievementConfig === "undefined"
            || !ExchangeAchievementConfig) {
            return [];
        }

        var exchangeType = null;
        var targetId = purchaseId;

        if (this.isTalentPurchase(purchaseId)) {
            exchangeType = "talent";
        } else if (typeof role !== "undefined"
            && role
            && typeof role.getRoleTypeByPurchaseId === "function") {
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
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return [];
        }
        return this._getConfiguredExchangeIdsByPurchaseId(purchaseId);
    },
    hasExchangeUnlock: function (purchaseId) {
        var exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);
        if (!exchangeIds.length
            || typeof Medal === "undefined"
            || !Medal
            || typeof Medal.isExchanged !== "function") {
            return false;
        }

        for (var i = 0; i < exchangeIds.length; i++) {
            if (Medal.isExchanged(exchangeIds[i])) {
                return true;
            }
        }
        return false;
    },
    getExchangeIdByPurchaseId: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return null;
        }
        var exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);
        if (!exchangeIds.length) {
            return null;
        }
        if (typeof Medal === "undefined"
            || !Medal
            || typeof Medal.isExchanged !== "function") {
            return exchangeIds[0];
        }
        for (var i = 0; i < exchangeIds.length; i++) {
            if (!Medal.isExchanged(exchangeIds[i])) {
                return exchangeIds[i];
            }
        }
        return null;
    },
    getLastUnlockedExchangeIdByPurchaseId: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return null;
        }

        var exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);
        if (!exchangeIds.length
            || typeof Medal === "undefined"
            || !Medal
            || typeof Medal.isExchanged !== "function") {
            return null;
        }

        for (var i = exchangeIds.length - 1; i >= 0; i--) {
            if (Medal.isExchanged(exchangeIds[i])) {
                return exchangeIds[i];
            }
        }
        return null;
    },
    isPurchaseFullyUnlocked: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return false;
        }
        if (this.isTalentPurchase(purchaseId)) {
            return this._isTalentFullyUnlocked(purchaseId);
        }
        if (this.isExchangePurchase(purchaseId)) {
            return this.hasExchangeUnlock(purchaseId);
        }
        return this.isUnlocked(purchaseId);
    },
    getConsumableAchievementPrice: function (purchaseId) {
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
    _getConsumableAchievementPrice: function (purchaseId) {
        return this.getConsumableAchievementPrice(purchaseId);
    },
    _getPurchaseRecordCount: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this._hasIAPMethod("getPurchaseRecordCount")) {
            return 0;
        }

        var recordCount = Number(IAPPackage.getPurchaseRecordCount(purchaseId));
        if (!isFinite(recordCount) || recordCount <= 0) {
            return 0;
        }
        return parseInt(recordCount);
    },
    _isAutoUnlockEnabledForTest: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this._hasIAPMethod("isAutoUnlockEnabledForTest")) {
            return false;
        }
        return !!IAPPackage.isAutoUnlockEnabledForTest(purchaseId);
    },
    _isPurchaseForceLockedForTest: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this._hasIAPMethod("isPurchaseForceLockedForTest")) {
            return false;
        }
        return !!IAPPackage.isPurchaseForceLockedForTest(purchaseId);
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
    _isOperatorPromoPurchase: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId !== 106
            || typeof PurchaseAndroid === "undefined"
            || !PurchaseAndroid) {
            return false;
        }

        return PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_OPERATOR
            || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_UNI
            || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_AIYOUXI
            || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_HEYOUXI;
    },
    _getDisplayNameOverride: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return "";
        }

        var purchaseInfo = this.getPurchaseInfo(purchaseId);
        if (purchaseInfo
            && typeof purchaseInfo.displayName === "string"
            && purchaseInfo.displayName.length > 0) {
            return purchaseInfo.displayName;
        }

        if (this._isOperatorPromoPurchase(purchaseId)) {
            return "靴子特惠";
        }

        return "";
    },
    _shouldShowSaleIcon: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return false;
        }

        var purchaseInfo = this.getPurchaseInfo(purchaseId);
        if (purchaseInfo && purchaseInfo.showSaleIcon !== undefined) {
            return !!purchaseInfo.showSaleIcon;
        }

        return purchaseId === 106;
    },
    _buildShopStateVersion: function (purchaseId, state) {
        var purchaseConfig = this.getPurchaseConfig(purchaseId);
        var priceIndex = purchaseConfig && isFinite(purchaseConfig.priceIndex)
            ? parseInt(purchaseConfig.priceIndex)
            : 0;
        return [
            purchaseId,
            this._getPurchaseRecordCount(purchaseId),
            state && state.achievementPoints !== undefined ? state.achievementPoints : 0,
            state && state.currentTalentLevel !== undefined ? state.currentTalentLevel : 0,
            state && state.isUnlocked ? 1 : 0,
            state && state.isFullyUnlocked ? 1 : 0,
            priceIndex,
            state && state.nextAchievementPrice !== undefined && state.nextAchievementPrice !== null
                ? state.nextAchievementPrice
                : "none"
        ].join("|");
    },
    getShopUiState: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return null;
        }

        var isExchangePurchase = this.isExchangePurchase(purchaseId);
        var isTalentPurchase = this.isTalentPurchase(purchaseId);
        var isConsumablePurchase = purchaseId >= 200;
        var isUnlocked = this.isUnlocked(purchaseId);
        var isFullyUnlocked = this.isPurchaseFullyUnlocked(purchaseId);
        var exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);
        var maxTalentLevel = isTalentPurchase ? this._getTalentMaxLevel(purchaseId) : 0;
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
        var isOperatorPromoPurchase = this._isOperatorPromoPurchase(purchaseId);
        var displayNameOverride = this._getDisplayNameOverride(purchaseId);
        var showSaleIcon = this._shouldShowSaleIcon(purchaseId);
        var unlockReward = this.getUnlockReward(purchaseId);

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
        } else if (isConsumablePurchase) {
            nextAchievementPrice = this._getConsumableAchievementPrice(purchaseId);
            shouldHideBuyButton = nextAchievementPrice === null || nextAchievementPrice === undefined;

            if (shouldHideBuyButton) {
                canBuy = false;
                disabledReason = this.FAIL_REASON.PURCHASE_FAILED;
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

        var shopUiState = {
            purchaseId: purchaseId,
            isExchangePurchase: isExchangePurchase,
            isTalentPurchase: isTalentPurchase,
            isConsumablePurchase: isConsumablePurchase,
            exchangeIds: exchangeIds,
            isUnlocked: isUnlocked,
            isFullyUnlocked: isFullyUnlocked,
            isOperatorPromoPurchase: isOperatorPromoPurchase,
            currentTalentLevel: isTalentPurchase ? this.getTalentLevel(purchaseId) : 0,
            maxTalentLevel: maxTalentLevel,
            nextAchievementPrice: nextAchievementPrice,
            achievementPrice: nextAchievementPrice,
            achievementPoints: achievementPoints,
            displayNameOverride: displayNameOverride,
            showSaleIcon: !!showSaleIcon,
            priceText: priceText,
            priceOff: priceOff,
            canBuy: !!canBuy,
            canCancel: !!canCancel,
            shouldHideBuyButton: !!shouldHideBuyButton,
            badgeText: badgeText,
            hideBadge: !!hideBadge,
            disabledReason: disabledReason,
            failureReason: disabledReason,
            unlockReward: unlockReward
        };
        shopUiState.shopStateVersion = this._buildShopStateVersion(purchaseId, shopUiState);
        return shopUiState;
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
        if (purchaseId === null) {
            return false;
        }
        if (purchaseId === 0) {
            return true;
        }
        if (this.isTalentPurchase(purchaseId)) {
            return this._isTalentUnlocked(purchaseId);
        }
        if (this.isExchangePurchase(purchaseId)) {
            return this.hasExchangeUnlock(purchaseId);
        }

        var purchaseInfo = this.getPurchaseInfo(purchaseId);
        if (!purchaseInfo) {
            return false;
        }
        if (this._isPurchaseForceLockedForTest(purchaseId)) {
            return false;
        }
        if (this._isAutoUnlockEnabledForTest(purchaseId)) {
            return true;
        }

        var recordCount = this._getPurchaseRecordCount(purchaseId);
        if (purchaseId >= 200 && purchaseInfo.multiPrice) {
            return false;
        }
        if (purchaseInfo.multiPrice) {
            var maxPurchaseCount = Array.isArray(purchaseInfo.priceList) && purchaseInfo.priceList.length
                ? purchaseInfo.priceList.length
                : 3;
            return recordCount >= maxPurchaseCount;
        }
        return recordCount > 0;
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
        if (this.isUnlocked(purchaseId)) {
            return true;
        }
        if (purchaseLock.checkFn
            && this._hasIAPMethod(purchaseLock.checkFn)) {
            return !!IAPPackage[purchaseLock.checkFn]();
        }
        return false;
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
    _getRuntimeRecord: function () {
        if (typeof GameRuntime === "undefined"
            || !GameRuntime
            || typeof GameRuntime.getRecord !== "function") {
            return null;
        }
        return GameRuntime.getRecord();
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
    _getConsumableRewardSummary: function (purchaseId) {
        var purchaseInfo = this.getPurchaseInfo(purchaseId);
        var effectList = purchaseInfo && Array.isArray(purchaseInfo.effect)
            ? purchaseInfo.effect
            : null;
        if (!effectList) {
            return null;
        }

        return effectList.map(function (effect) {
            if (!effect) {
                return null;
            }
            return {
                itemId: parseInt(effect.itemId),
                num: parseInt(effect.num)
            };
        }).filter(function (effect) {
            return !!effect && isFinite(effect.itemId) && isFinite(effect.num) && effect.num > 0;
        });
    },
    _grantConsumableReward: function (purchaseId) {
        var runtimePlayer = this._getRuntimePlayer();
        var rewardSummary = this._getConsumableRewardSummary(purchaseId);
        if (!runtimePlayer
            || !runtimePlayer.storage
            || typeof runtimePlayer.storage.increaseItem !== "function"
            || !rewardSummary
            || !rewardSummary.length) {
            return false;
        }

        rewardSummary.forEach(function (reward) {
            runtimePlayer.storage.increaseItem(reward.itemId, reward.num);
        });

        var runtimeRecord = this._getRuntimeRecord();
        if (runtimeRecord && typeof runtimeRecord.saveAll === "function") {
            runtimeRecord.saveAll();
        }
        return true;
    },
    _syncPurchaseRecord: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this._hasIAPMethod("syncPurchaseRecord")) {
            return false;
        }
        return !!IAPPackage.syncPurchaseRecord(purchaseId);
    },
    _recordPurchase: function (purchaseId, reason, payload) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this._hasIAPMethod("recordPurchase")) {
            return false;
        }
        return !!IAPPackage.recordPurchase(purchaseId, reason, payload);
    },
    applyExternalReward: function (purchaseId, count) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return false;
        }
        if (typeof PurchaseList === "undefined" || !PurchaseList || !PurchaseList[purchaseId]) {
            return false;
        }
        var effect = Array.isArray(PurchaseList[purchaseId].effect) ? PurchaseList[purchaseId].effect : [];
        var multiplier = Math.max(0, parseInt(count, 10) || 0);
        effect.forEach(function (obj) {
            if (obj && obj.itemId && obj.num) {
                player.storage.increaseItem(obj.itemId, obj.num * multiplier);
            }
        });
        if (typeof Record !== "undefined" && Record && typeof Record.saveAll === "function") {
            Record.saveAll();
        }
        return true;
    },
    _getProductIdMap: function () {
        var productIdMap = {};
        if (typeof PurchaseList === "undefined" || !PurchaseList) {
            return productIdMap;
        }

        Object.keys(PurchaseList).forEach(function (purchaseId) {
            var purchaseInfo = PurchaseList[purchaseId] || {};
            var priceList = Array.isArray(purchaseInfo.priceList) ? purchaseInfo.priceList : [];
            priceList.forEach(function (priceInfo, index) {
                if (!priceInfo || !priceInfo.productId) {
                    return;
                }
                productIdMap[priceInfo.productId] = {
                    purchaseId: parseInt(purchaseId),
                    priceIndex: index,
                    priceInfo: priceInfo
                };
            });
        });

        return productIdMap;
    },
    refreshRemotePayInfo: function (target, cb, purchaseIdList) {
        var self = this;
        var complete = function (err, payload) {
            if (cb) {
                cb.call(target, err, payload);
            }
        };

        if (this.isPaySdkBypassedForTest()) {
            complete(null, {});
            return;
        }

        if (!cc.sys.isNative) {
            complete(null, {});
            return;
        }

        if (cc.sys.os == cc.sys.OS_IOS) {
            var productIdMap = this._getProductIdMap();
            var productIdList = Object.keys(productIdMap);
            if (!productIdList.length) {
                complete(null, []);
                return;
            }

            uiUtil.showLoadingView();
            cc.purchase.getPurchaseList(productIdList, function (err, products) {
                uiUtil.dismissLoadingView();
                if (err) {
                    CommonUtil.showCommonDialog(stringUtil.getString(1220), stringUtil.getString(1030));
                    complete(err, null);
                    return;
                }

                cc.log(JSON.stringify(products));
                for (var i = 0; i < products.length; i++) {
                    var product = products[i];
                    var mappedProduct = productIdMap[product.productId];
                    if (!mappedProduct || !mappedProduct.priceInfo) {
                        continue;
                    }
                    mappedProduct.priceInfo.currencyCode = product.currencyCode;
                    mappedProduct.priceInfo.price = product.productPrice;
                    mappedProduct.priceInfo.productPriceStr = product.productPriceStr;
                }
                complete(null, products);
            });
            return;
        }

        if (cc.sys.os == cc.sys.OS_ANDROID) {
            uiUtil.showLoadingView();
            PurchaseAndroid.getPurchaseList(purchaseIdList, function (err, queryResult) {
                uiUtil.dismissLoadingView();
                if (err) {
                    complete(err, null);
                    return;
                }

                cc.log("queryResult: " + JSON.stringify(queryResult));

                var products = queryResult && queryResult.productInfo ? queryResult.productInfo : {};
                for (var purchaseId in products) {
                    if (!PurchaseList[purchaseId] || !PurchaseList[purchaseId].priceList) {
                        continue;
                    }
                    var purchasePriceList = PurchaseList[purchaseId].priceList;
                    var productInfoList = products[purchaseId] || [];
                    for (var i = 0; i < productInfoList.length; i++) {
                        var product = productInfoList[i];
                        var purchaseInfo = purchasePriceList[i];
                        if (!purchaseInfo || !product) {
                            continue;
                        }

                        if (product.currencyCode !== undefined && product.currencyCode !== null) {
                            purchaseInfo.currencyCode = product.currencyCode;
                        }
                        if (product.productPrice !== undefined && product.productPrice !== null) {
                            purchaseInfo.price = product.productPrice;
                        }
                        var productPriceStr = "";
                        if (product.productPriceStr !== undefined && product.productPriceStr !== null) {
                            productPriceStr = "" + product.productPriceStr;
                        }
                        purchaseInfo.productPriceStr = productPriceStr.replace('脗', '');
                    }
                }

                var purchasedIds = queryResult && queryResult.purchasedIds ? queryResult.purchasedIds : {};
                for (var purchasedId in purchasedIds) {
                    if (purchasedIds[purchasedId] && PurchaseList[purchasedId]) {
                        self.syncPurchasedUnlock(purchasedId);
                    }
                }

                complete(null, products);
            });
            return;
        }

        complete(null, {});
    },
    restoreRemotePurchases: function (target, cb) {
        var complete = function (err, result) {
            if (cb) {
                cb.call(target, err, result);
            }
        };

        if (!cc.sys.isNative
            || cc.sys.os != cc.sys.OS_IOS
            || !cc.purchase
            || typeof cc.purchase.restoreIAP !== "function") {
            complete(new Error("restore_iap_unavailable"), null);
            return;
        }

        var productIdMap = this._getProductIdMap();
        uiUtil.showLoadingView();
        cc.purchase.restoreIAP(function (result) {
            uiUtil.dismissLoadingView();
            var purchaseId = null;
            if (result && result.result == 1) {
                if (result.productId == "ipa_huozhe_nc6") {
                    purchaseId = 106;
                } else if (productIdMap[result.productId]) {
                    purchaseId = productIdMap[result.productId].purchaseId;
                }
            }

            var syncResult = purchaseId === null ? null : PurchaseService.syncPurchasedUnlock(purchaseId);
            complete(null, {
                rawResult: result,
                purchaseId: purchaseId,
                syncResult: syncResult,
                isSuccess: !!(result && result.result == 1 && purchaseId !== null)
            });
        });
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
        recorded = this._syncPurchaseRecord(purchaseId);

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
        var defaultRewardSummary = {
            unlockReward: purchaseId === null ? null : this.getUnlockReward(purchaseId),
            consumableReward: purchaseId === null ? null : this._getConsumableRewardSummary(purchaseId),
            unlockRecorded: false,
            unlockRewardGranted: false,
            consumableGranted: false
        };
        var result = {
            code: PurchaseGatewayResultCode.FAILED,
            purchaseId: purchaseId,
            isExchangePurchase: purchaseId === null ? false : this.isExchangePurchase(purchaseId),
            isConsumablePurchase: purchaseId !== null && purchaseId >= 200,
            isSuccess: false,
            success: false,
            isFailure: true,
            failedReason: this.FAIL_REASON.PURCHASE_FAILED,
            failureReason: this.FAIL_REASON.PURCHASE_FAILED,
            unlockRecorded: false,
            unlockRewardGranted: false,
            consumableGranted: false,
            rewardSummary: defaultRewardSummary,
            shopUiState: purchaseId === null ? null : this.getShopUiState(purchaseId)
        };
        if (overrides) {
            Object.keys(overrides).forEach(function (key) {
                result[key] = overrides[key];
            });
        }
        result.isSuccess = !!result.isSuccess;
        result.success = result.isSuccess;
        result.isFailure = !result.isSuccess;
        result.failedReason = result.isSuccess ? null : (result.failedReason || this.FAIL_REASON.PURCHASE_FAILED);
        result.failureReason = result.isSuccess ? null : (result.failureReason || result.failedReason || this.FAIL_REASON.PURCHASE_FAILED);
        if (result.code === undefined || result.code === null) {
            if (result.isSuccess) {
                result.code = PurchaseGatewayResultCode.SUCCESS;
            } else if (result.failedReason === this.FAIL_REASON.ALREADY_UNLOCKED
                || result.failedReason === this.FAIL_REASON.MAX_LEVEL) {
                result.code = PurchaseGatewayResultCode.ALREADY_UNLOCKED;
            } else {
                result.code = PurchaseGatewayResultCode.FAILED;
            }
        }
        if (Array.isArray(result.rewardSummary)) {
            result.rewardSummary = {
                unlockReward: null,
                consumableReward: result.rewardSummary.slice(),
                unlockRecorded: false,
                unlockRewardGranted: false,
                consumableGranted: false
            };
        } else if (result.rewardSummary
            && typeof result.rewardSummary === "object"
            && (result.rewardSummary.type || result.rewardSummary.itemId !== undefined || result.rewardSummary.bid !== undefined)) {
            result.rewardSummary = {
                unlockReward: result.rewardSummary,
                consumableReward: null,
                unlockRecorded: false,
                unlockRewardGranted: false,
                consumableGranted: false
            };
        } else if (!result.rewardSummary || typeof result.rewardSummary !== "object") {
            result.rewardSummary = defaultRewardSummary;
        }
        result.rewardSummary.unlockRecorded = !!result.unlockRecorded;
        result.rewardSummary.unlockRewardGranted = !!result.unlockRewardGranted;
        result.rewardSummary.consumableGranted = !!result.consumableGranted;
        result.shopUiState = purchaseId === null ? null : this.getShopUiState(purchaseId);
        return result;
    },
    _buildPurchaseFailureResult: function (purchaseId, failedReason, overrides) {
        overrides = overrides || {};
        overrides.failedReason = failedReason || this.FAIL_REASON.PURCHASE_FAILED;
        overrides.failureReason = overrides.failedReason;
        overrides.isSuccess = false;
        return this._createPurchaseResult(purchaseId, overrides);
    },
    _buildPurchaseSuccessResult: function (purchaseId, overrides) {
        overrides = overrides || {};
        overrides.isSuccess = true;
        overrides.failedReason = null;
        overrides.failureReason = null;
        return this._createPurchaseResult(purchaseId, overrides);
    },
    _completeUnlockPurchase: function (purchaseId, resultCode) {
        var syncResult = this.syncPurchasedUnlock(purchaseId);
        return this._buildPurchaseSuccessResult(purchaseId, {
            code: resultCode === undefined || resultCode === null ? PurchaseGatewayResultCode.SUCCESS : resultCode,
            unlockRecorded: !!syncResult.recorded,
            unlockRewardGranted: !!syncResult.unlockRewardGranted,
            rewardSummary: this.getUnlockReward(purchaseId)
        });
    },
    _completeExchangePurchase: function (purchaseId, recorded) {
        return this._buildPurchaseSuccessResult(purchaseId, {
            code: PurchaseGatewayResultCode.SUCCESS,
            unlockRecorded: !!recorded,
            unlockRewardGranted: this._grantUnlockReward(purchaseId),
            rewardSummary: this.getUnlockReward(purchaseId)
        });
    },
    _getExchangePurchaseFailureReason: function (purchaseId) {
        if (this.isTalentPurchase(purchaseId)
            && this.isPurchaseFullyUnlocked(purchaseId)) {
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
        var recorded = this._recordPurchase(purchaseId, "exchange_purchase", {
            exchangeId: exchangeId
        });
        return this._completeExchangePurchase(purchaseId, recorded);
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
        if (typeof Medal === "undefined"
            || !Medal
            || typeof Medal.spendAchievementPoints !== "function"
            || !Medal.spendAchievementPoints(achievementPrice)) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.PURCHASE_FAILED);
        }
        if (!this._grantConsumableReward(purchaseId)) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.PURCHASE_FAILED);
        }
        var recorded = this._recordPurchase(purchaseId, "achievement_purchase", {
            price: achievementPrice
        });
        return this._buildPurchaseSuccessResult(purchaseId, {
            code: PurchaseGatewayResultCode.SUCCESS,
            unlockRecorded: !!recorded,
            consumableGranted: true,
            rewardSummary: this._getConsumableRewardSummary(purchaseId)
        });
    },
    _resolveGatewayPurchaseResult: function (purchaseId, payResult) {
        if (payResult === PurchaseGatewayResultCode.ALREADY_UNLOCKED) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.ALREADY_UNLOCKED, {
                code: PurchaseGatewayResultCode.ALREADY_UNLOCKED
            });
        }
        if (payResult !== PurchaseGatewayResultCode.SDK_SUCCESS) {
            return this._buildPurchaseFailureResult(purchaseId, this.FAIL_REASON.PURCHASE_FAILED, {
                code: PurchaseGatewayResultCode.FAILED
            });
        }
        return this._completeUnlockPurchase(purchaseId, payResult);
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
