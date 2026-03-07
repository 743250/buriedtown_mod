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
    getShopUiState: function (purchaseId) {
        purchaseId = this._normalizePurchaseId(purchaseId);
        if (purchaseId === null || !this._hasIAPMethod("getShopUiState")) {
            return null;
        }
        return IAPPackage.getShopUiState(purchaseId);
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
        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.isTalentPurchaseId === "function") {
            return !!TalentService.isTalentPurchaseId(purchaseId);
        }
        if (!this._hasIAPMethod("isTalentPurchaseId")) {
            return false;
        }
        return !!IAPPackage.isTalentPurchaseId(purchaseId);
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
            isExchangePurchase: outcome.isExchangePurchase,
            isSuccess: outcome.isSuccess,
            isFailure: outcome.isFailure,
            isAchievementPointFailure: outcome.isAchievementPointFailure,
            failedReason: outcome.isAchievementPointFailure ? "INSUFFICIENT_POINTS" : null,
            unlockRecorded: false,
            unlockRewardGranted: false,
            consumableGranted: false
        };

        if (!result.isSuccess || result.purchaseId === null) {
            return result;
        }

        if (outcome.needsManualUnlockRecord) {
            var syncResult = this.syncPurchasedUnlock(result.purchaseId);
            result.unlockRecorded = !!syncResult.recorded;
            result.unlockRewardGranted = !!syncResult.unlockRewardGranted;
        } else {
            result.unlockRewardGranted = this._grantUnlockReward(result.purchaseId);
        }

        if (outcome.needsManualConsumableGrant) {
            result.consumableGranted = this._hasIAPMethod("payConsumeIAP")
                ? !!IAPPackage.payConsumeIAP(result.purchaseId)
                : false;
            if (!result.consumableGranted) {
                result.isSuccess = false;
                result.isFailure = true;
                result.failedReason = "INSUFFICIENT_POINTS";
            }
        }

        return result;
    },
    getPurchaseOutcome: function (purchaseId, payResult) {
        purchaseId = this._normalizePurchaseId(purchaseId);

        var isExchangePurchase = purchaseId === null ? false : this.isExchangePurchase(purchaseId);
        var isSuccess = false;
        if (purchaseId !== null) {
            if (isExchangePurchase) {
                isSuccess = payResult == this.LEGACY_RESULT.SUCCESS;
            } else {
                isSuccess = payResult == this.LEGACY_RESULT.SUCCESS || payResult == this.LEGACY_RESULT.SDK_SUCCESS;
            }
        }

        return {
            purchaseId: purchaseId,
            rawResult: payResult,
            isExchangePurchase: isExchangePurchase,
            isSuccess: isSuccess,
            isFailure: !isSuccess,
            needsManualUnlockRecord: purchaseId !== null
                && !isExchangePurchase
                && payResult == this.LEGACY_RESULT.SUCCESS,
            needsManualConsumableGrant: purchaseId !== null
                && purchaseId >= 200
                && payResult == this.LEGACY_RESULT.SUCCESS,
            isAchievementPointFailure: purchaseId !== null
                && purchaseId >= 200
                && payResult == this.LEGACY_RESULT.FAILED
        };
    },
    isLegacySuccess: function (purchaseId, payResult) {
        return this.getPurchaseOutcome(purchaseId, payResult).isSuccess;
    },
    needsManualUnlockRecord: function (purchaseId, payResult) {
        return this.getPurchaseOutcome(purchaseId, payResult).needsManualUnlockRecord;
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
