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
    _normalizePurchaseId: function (purchaseId) {
        var normalizedPurchaseId = parseInt(purchaseId);
        if (isNaN(normalizedPurchaseId)) {
            return null;
        }
        return normalizedPurchaseId;
    },
    isExchangePurchase: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || typeof IAPPackage === "undefined" || !IAPPackage) {
            return false;
        }
        if (typeof IAPPackage.isExchangePurchase !== "function") {
            return false;
        }
        return !!IAPPackage.isExchangePurchase(purchaseId);
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
    _getAchievementPoints: function () {
        return typeof Medal !== "undefined"
            && Medal
            && typeof Medal.getAchievementPoints === "function"
            ? Medal.getAchievementPoints()
            : 0;
    },
    _getCurrentTalentLevel: function (purchaseId, isTalentPurchase) {
        if (!isTalentPurchase
            || typeof Medal === "undefined"
            || !Medal
            || typeof Medal.getTalentLevel !== "function") {
            return 0;
        }
        return Medal.getTalentLevel(purchaseId);
    },
    _buildDefaultShopUiState: function (purchaseId) {
        return {
            purchaseId: purchaseId,
            isExchangePurchase: false,
            isTalentPurchase: false,
            isUnlocked: false,
            currentTalentLevel: 0,
            nextAchievementPrice: null,
            achievementPoints: this._getAchievementPoints(),
            priceText: "",
            canBuy: false,
            canCancel: false,
            shouldHideBuyButton: false,
            badgeText: "",
            hideBadge: false,
            disabledReason: "INVALID_PURCHASE"
        };
    },
    getShopUiState: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return this._buildDefaultShopUiState(null);
        }

        var isExchangePurchase = this.isExchangePurchase(purchaseId);
        var isTalentPurchase = this.isTalentPurchase(purchaseId);
        var isUnlocked = this.isUnlocked(purchaseId);
        var nextAchievementPrice = null;
        var achievementPoints = this._getAchievementPoints();
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

            canCancel = purchaseId < 200 && purchaseId !== 0 && isUnlocked;
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
            nextAchievementPrice = this._hasIAPMethod("getConsumableAchievementPrice")
                ? IAPPackage.getConsumableAchievementPrice(purchaseId)
                : null;
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
                    } else if (purchaseConfig.price !== undefined && purchaseConfig.price !== null) {
                        priceText = "" + purchaseConfig.price;
                    }
                }
            }

            canBuy = !isUnlocked;
            if (!canBuy) {
                disabledReason = "ALREADY_UNLOCKED";
            }
            canCancel = this.isPaySdkBypassedForTest()
                && purchaseId < 200
                && purchaseId !== 0
                && isUnlocked;
            if (isUnlocked) {
                badgeText = "已购";
            }
        }

        return {
            purchaseId: purchaseId,
            isExchangePurchase: isExchangePurchase,
            isTalentPurchase: isTalentPurchase,
            isUnlocked: isUnlocked,
            currentTalentLevel: this._getCurrentTalentLevel(purchaseId, isTalentPurchase),
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
        if (purchaseId === null || !this._hasIAPMethod("getAchievementPriceByPurchaseId")) {
            return null;
        }
        return IAPPackage.getAchievementPriceByPurchaseId(purchaseId);
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
        if (purchaseId === null || !this._hasIAPMethod("getPriceOff")) {
            return 0;
        }
        return IAPPackage.getPriceOff(purchaseId);
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
    _grantUnlockReward: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null
            || typeof player === "undefined"
            || !player
            || !player.storage
            || !player.room) {
            return false;
        }

        if (purchaseId === 105) {
            if (!player.storage.validateItem(1305024, 1)) {
                player.storage.increaseItem(1305024, 1);
                return true;
            }
            return false;
        }

        if (purchaseId === 106) {
            if (!player.storage.validateItem(1304024, 1)) {
                player.storage.increaseItem(1304024, 1);
                return true;
            }
            return false;
        }

        if (purchaseId === 107) {
            if (!player.room.isBuildExist(12, 0)) {
                player.room.createBuild(12, 0);
                return true;
            }
        }

        return false;
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
    },
    cancelPurchase: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null) {
            return {
                purchaseId: null,
                refundedPoints: 0,
                resetCount: 0,
                changed: false
            };
        }

        var beforePoints = Medal.getAchievementPoints ? Medal.getAchievementPoints() : 0;
        var resetResult = IAPPackage.resetIAPPaid(purchaseId) || {};
        var afterPoints = Medal.getAchievementPoints ? Medal.getAchievementPoints() : beforePoints;

        var refundedPoints = 0;
        if (resetResult.refundedPoints) {
            refundedPoints = resetResult.refundedPoints;
        } else {
            refundedPoints = Math.max(0, afterPoints - beforePoints);
        }
        var resetCount = resetResult.resetCount || 0;

        return {
            purchaseId: purchaseId,
            refundedPoints: refundedPoints,
            resetCount: resetCount,
            changed: refundedPoints > 0 || resetCount > 0
        };
    }
};
