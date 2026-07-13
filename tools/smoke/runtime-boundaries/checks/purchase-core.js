"use strict";
const {
    assert,
    loadIntoSandbox,
    readRepoFile
} = require("../../lib/core");
const {
    createVmSandbox,
    createCountStorage,
    createPurchaseRewardPlayer
} = require("../../lib/fixtures/runtime-boundaries");
const {
    stripComments,
    bootstrapRuntimeSandbox,
    SYNTHETIC_PURCHASE_IDS,
    SYNTHETIC_ITEM_IDS,
    SYNTHETIC_BUILD_ID,
    SYNTHETIC_EXCHANGE_IDS,
    createSafetyHelper,
    createSyntheticPurchaseList,
    createSyntheticRoleConfigTable,
    createSyntheticTalentConfigTable,
    createSyntheticExchangeAchievementConfig,
    capturePurchaseResult,
    createPersistenceComponent,
    createPersistencePlayer
} = require("./purchase-helpers");


function runPurchaseUnlockRewardSmoke() {
    const sandbox = createVmSandbox();
    sandbox.IAPPackage = {
        getPurchaseRecordCount: function (purchaseId) {
            return purchaseId === SYNTHETIC_PURCHASE_IDS.ITEM_REWARD
                || purchaseId === SYNTHETIC_PURCHASE_IDS.ITEM_TOOL
                || purchaseId === SYNTHETIC_PURCHASE_IDS.BUILD_REWARD
                ? 1
                : 0;
        }
    };
    sandbox.PurchaseList = createSyntheticPurchaseList();
    const runtimeRewardPlayer = createPurchaseRewardPlayer({
        bag: {}
    });
    runtimeRewardPlayer.bag.increaseItem(SYNTHETIC_ITEM_IDS.BAG, 1);

    bootstrapRuntimeSandbox(sandbox, {
        player: runtimeRewardPlayer
    });
    sandbox.player = null;
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");

    assert(sandbox.PurchaseService._grantUnlockReward(SYNTHETIC_PURCHASE_IDS.ITEM_REWARD) === false,
        "PurchaseService should not duplicate unlock reward items already owned in bag");
    assert(runtimeRewardPlayer.storage.getNumByItemId(SYNTHETIC_ITEM_IDS.BAG) === 0,
        "PurchaseService should grant unlock rewards against GameRuntime player state");

    const reconcilePlayer = createPurchaseRewardPlayer({ bag: {} });
    reconcilePlayer.bag.increaseItem(SYNTHETIC_ITEM_IDS.BAG, 1);
    assert(sandbox.PurchaseService.reconcileUnlockRewardsForPlayer(reconcilePlayer, [
        SYNTHETIC_PURCHASE_IDS.ITEM_REWARD,
        SYNTHETIC_PURCHASE_IDS.ITEM_TOOL,
        SYNTHETIC_PURCHASE_IDS.BUILD_REWARD
    ]) === true,
        "PurchaseService should reconcile missing unlock rewards for unlocked purchases");
    assert(reconcilePlayer.storage.getNumByItemId(SYNTHETIC_ITEM_IDS.BAG) === 0,
        "PurchaseService should not duplicate big bag reward when it already exists in bag");
    assert(reconcilePlayer.storage.getNumByItemId(SYNTHETIC_ITEM_IDS.BOOTS) === 1,
        "PurchaseService should restore missing synthetic item unlock rewards");
    assert(reconcilePlayer.room.buildLevels[SYNTHETIC_BUILD_ID] === 0,
        "PurchaseService should restore dog house unlock reward at build level 0");
    assert(reconcilePlayer.room.createCalls.length === 1
        && reconcilePlayer.room.createCalls[0][0] === SYNTHETIC_BUILD_ID
        && reconcilePlayer.room.createCalls[0][1] === 0,
        "PurchaseService should create dog house using the unlocked build level");
    assert(sandbox.PurchaseService.reconcileUnlockRewardsForPlayer(reconcilePlayer, [
        SYNTHETIC_PURCHASE_IDS.ITEM_REWARD,
        SYNTHETIC_PURCHASE_IDS.ITEM_TOOL,
        SYNTHETIC_PURCHASE_IDS.BUILD_REWARD
    ]) === false,
        "PurchaseService unlock reward reconciliation should be idempotent once rewards exist");

    return {
        name: "purchase-unlock-rewards",
        ok: true,
        detail: "validated purchase unlock reward grant/reconcile flow avoids duplicate items and restores dog house at unlocked level"
    };
}

function runPurchaseRecordBoundarySmoke() {
    const sandbox = createVmSandbox();
    sandbox.SafetyHelper = createSafetyHelper();
    sandbox.PurchaseList = createSyntheticPurchaseList();

    bootstrapRuntimeSandbox(sandbox);
    loadIntoSandbox(sandbox, "assets/src/game/IAPPackage.js");

    sandbox.IAPPackage.initPackage();
    assert(sandbox.IAPPackage._record[SYNTHETIC_PURCHASE_IDS.ITEM_REWARD] === 0,
        "IAPPackage initPackage should no longer pre-mark synthetic exchange item purchases as purchased");
    assert(sandbox.IAPPackage._record[SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA] === 0,
        "IAPPackage initPackage should leave role exchange purchase records untouched");
    assert(sandbox.IAPPackage._record[SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA] === 0,
        "IAPPackage initPackage should leave talent exchange purchase records untouched");

    sandbox.IAPPackage._record[SYNTHETIC_PURCHASE_IDS.CONSUMABLE_LOW] = 1;
    sandbox.IAPPackage._record[SYNTHETIC_PURCHASE_IDS.CONSUMABLE_HIGH] = 2;
    sandbox.IAPPackage._record[SYNTHETIC_PURCHASE_IDS.ITEM_REWARD] = 3;
    sandbox.IAPPackage.resetConsumeIAP();

    assert(sandbox.IAPPackage._record[SYNTHETIC_PURCHASE_IDS.CONSUMABLE_LOW] === 0,
        "IAPPackage resetConsumeIAP should reset configured consumable purchase records");
    assert(sandbox.IAPPackage._record[SYNTHETIC_PURCHASE_IDS.CONSUMABLE_HIGH] === 0,
        "IAPPackage resetConsumeIAP should reset high-tier consumable purchase records");
    assert(sandbox.IAPPackage._record[SYNTHETIC_PURCHASE_IDS.ITEM_REWARD] === 3,
        "IAPPackage resetConsumeIAP should not reset non-consumable exchange purchase records");

    return {
        name: "purchase-record-boundaries",
        ok: true,
        detail: "validated purchase record init/reset only touches configured consumable records and stops pre-marking exchange purchases"
    };
}

function runPurchaseExchangeConfigSmoke() {
    const sandbox = createVmSandbox();
    sandbox.ExchangeAchievementConfig = createSyntheticExchangeAchievementConfig();
    sandbox.RoleConfigTable = createSyntheticRoleConfigTable();
    sandbox.PurchaseList = createSyntheticPurchaseList();
    sandbox.Medal = {
        _exchangeMap: {
            6001: { unlocked: true }
        },
        _achievementPoints: 0,
        isExchanged: function (exchangeId) {
            return !!this._exchangeMap[exchangeId];
        },
        getAchievementPoints: function () {
            return this._achievementPoints;
        }
    };
    sandbox.TalentService = {
        isTalentPurchaseId: function (purchaseId) {
            return Number(purchaseId) === SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA;
        },
        getTalentLevel: function () {
            return 2;
        },
        getTalentMaxLevel: function () {
            return 3;
        },
        isTalentUnlocked: function (purchaseId) {
            return Number(purchaseId) === SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA;
        },
        isTalentFullyUnlocked: function () {
            return false;
        }
    };
    bootstrapRuntimeSandbox(sandbox);
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/role.js");
    loadIntoSandbox(sandbox, "assets/src/game/IAPPackage.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");

    assert(JSON.stringify(sandbox.PurchaseService.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA)) === "[4001]",
        "PurchaseService should resolve synthetic paid role exchanges from ExchangeAchievementConfig via role config");
    assert(JSON.stringify(sandbox.PurchaseService.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.PAID_ROLE_BETA)) === "[4002]",
        "PurchaseService should resolve additional paid role exchanges from synthetic role config");
    assert(JSON.stringify(sandbox.PurchaseService.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.ITEM_REWARD)) === "[5001]",
        "PurchaseService should resolve exchange-only item purchases from ExchangeAchievementConfig");
    assert(JSON.stringify(sandbox.PurchaseService.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.BUILD_REWARD)) === "[5003]",
        "PurchaseService should resolve synthetic build unlock purchases from ExchangeAchievementConfig");
    assert(JSON.stringify(sandbox.PurchaseService.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA)) === "[6001,6101,6201]",
        "PurchaseService should resolve ordered talent exchange levels from ExchangeAchievementConfig");
    assert(sandbox.PurchaseService.getExchangeIdByPurchaseId(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === SYNTHETIC_EXCHANGE_IDS.TALENT_ALPHA_LV2,
        "PurchaseService should return the next unexchanged talent level after configured exchange sorting");
    assert(sandbox.PurchaseService.isExchangePurchase(SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA) === true,
        "PurchaseService should keep exchange-role purchases on config-driven exchange flow");
    assert(sandbox.PurchaseService.isExchangePurchase(SYNTHETIC_PURCHASE_IDS.CONSUMABLE_LOW) === false,
        "PurchaseService should not treat consumable support packs as exchange-config purchases");
    assert(sandbox.PurchaseService.isTalentPurchase(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === true,
        "PurchaseService should source talent purchase detection from TalentService");
    sandbox.Medal.getTalentLevel = function () {
        throw new Error("purchase chain should source talent level state from TalentService");
    };
    assert(sandbox.PurchaseService.isUnlocked(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === true,
        "PurchaseService should delegate talent unlock checks to TalentService");
    assert(sandbox.PurchaseService.isPurchaseFullyUnlocked(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === false,
        "PurchaseService should delegate talent max-level checks to TalentService");
    assert(sandbox.PurchaseService.getShopUiState(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA).currentTalentLevel === 2,
        "PurchaseService should source current talent level from TalentService when building shop state");
    assert(sandbox.PurchaseService.getPriceOff(SYNTHETIC_PURCHASE_IDS.DISCOUNT_PACK) === 50,
        "PurchaseService should source fixed support-pack discounts from purchase config");
    const paidRoleType = sandbox.role.getRoleTypeByPurchaseId(SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA);
    sandbox.PurchaseService.isUnlocked = function (purchaseId) {
        return Number(purchaseId) === SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA;
    };
    sandbox.Medal.isExchanged = function () {
        throw new Error("role.isRoleUnlocked should prefer PurchaseService purchase-state checks");
    };
    assert(sandbox.PurchaseService.isRoleUnlocked(paidRoleType) === true,
        "PurchaseService should resolve paid role unlock state through purchase ids");
    assert(sandbox.role.isRoleUnlocked(paidRoleType) === true,
        "role.isRoleUnlocked should delegate purchase-required role unlock state through PurchaseService");
    assert(typeof sandbox.IAPPackage.getPreciseEffect === "undefined",
        "IAPPackage should no longer mirror talent gameplay effect APIs");
    assert(typeof sandbox.IAPPackage.hasChosenTalent === "undefined",
        "IAPPackage should no longer mirror talent selection APIs");

    return {
        name: "purchase-exchange-config",
        ok: true,
        detail: "validated config-driven purchase mapping stays runtime-oriented without pinning live purchase ids"
    };
}

function runPurchaseUiStateProjectionSmoke() {
    const sandbox = createVmSandbox();
    sandbox.Medal = {
        getAchievementPoints: function () {
            throw new Error("PurchaseUiHelper should source achievement points from PurchaseService");
        },
        getTalentLevel: function () {
            throw new Error("PurchaseUiHelper should source talent level from PurchaseService shop state");
        }
    };
    sandbox.ExchangeAchievementConfig = {
        4002: {
            type: "character",
            targetId: 8,
            name: "Synthetic Role"
        },
        6001: {
            type: "talent",
            targetId: SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA
        }
    };
    sandbox.role = {
        getRoleTypeByPurchaseId: function () {
            return 8;
        }
    };
    sandbox.PurchaseService = {
        getPurchaseConfig: function (purchaseId) {
            return {
                id: Number(purchaseId),
                productPriceStr: "$9.99",
                price: 9.99
            };
        },
        getShopUiState: function (purchaseId) {
            purchaseId = Number(purchaseId);
            if (purchaseId === SYNTHETIC_PURCHASE_IDS.CONSUMABLE_LOW) {
                return {
                    purchaseId: purchaseId,
                    isExchangePurchase: false,
                    isTalentPurchase: false,
                    isUnlocked: false,
                    currentTalentLevel: 0,
                    priceOff: 0,
                    priceText: "$9.99",
                    canBuy: true,
                    canCancel: false,
                    shouldHideBuyButton: false,
                    badgeText: "",
                    hideBadge: false,
                    disabledReason: ""
                };
            }
            return {
                purchaseId: purchaseId,
                isExchangePurchase: true,
                isTalentPurchase: purchaseId === SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
                isUnlocked: true,
                currentTalentLevel: purchaseId === SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA ? 2 : 0,
                priceOff: 50,
                priceText: "15 成就点",
                canBuy: false,
                canCancel: false,
                shouldHideBuyButton: false,
                badgeText: "已购",
                hideBadge: false,
                disabledReason: "ALREADY_UNLOCKED"
            };
        },
        getAchievementPoints: function () {
            return 77;
        },
        getShopStateChangeEventName: function () {
            return "shop_state_change";
        },
        getExchangeIdsByPurchaseId: function (purchaseId) {
            purchaseId = Number(purchaseId);
            if (purchaseId === SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA) {
                return [SYNTHETIC_EXCHANGE_IDS.ROLE_ALPHA];
            }
            if (purchaseId === SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) {
                return [SYNTHETIC_EXCHANGE_IDS.TALENT_ALPHA_LV1];
            }
            return [];
        },
        getExchangeIdByPurchaseId: function (purchaseId) {
            const exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);
            return exchangeIds.length > 0 ? exchangeIds[0] : null;
        },
        isUnlocked: function () {
            throw new Error("PurchaseUiHelper should not recompute unlock state in UI");
        },
        isExchangePurchase: function () {
            throw new Error("PurchaseUiHelper should not recompute exchange state in UI");
        },
        isTalentPurchase: function () {
            throw new Error("PurchaseUiHelper should not recompute talent state in UI");
        },
        getAchievementPriceByPurchaseId: function () {
            throw new Error("PurchaseUiHelper should not rebuild price text in UI");
        },
        FAIL_REASON: {
            ALREADY_UNLOCKED: "ALREADY_UNLOCKED",
            MAX_LEVEL: "MAX_LEVEL",
            INSUFFICIENT_POINTS: "INSUFFICIENT_POINTS"
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    sandbox.GameKernel.register("PurchaseService", sandbox.PurchaseService);
    loadIntoSandbox(sandbox, "assets/src/ui/PurchaseUiHelper.js");

    const snapshot = sandbox.PurchaseUiHelper.getPurchaseUiSnapshot(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA);
    assert(snapshot.purchaseConfig && snapshot.purchaseConfig.id === SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
        "PurchaseUiHelper should resolve purchase config through PurchaseService");
    assert(snapshot.shopState && snapshot.shopState.purchaseId === SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
        "PurchaseUiHelper should resolve shop state through PurchaseService");
    assert(snapshot.isExchangePurchase === true
        && snapshot.isTalentPurchase === true
        && snapshot.isUnlocked === true
        && snapshot.currentTalentLevel === 2,
        "PurchaseUiHelper should project unlock and talent fields from PurchaseService shop state");
    assert(snapshot.priceOff === 50,
        "PurchaseUiHelper should project discount state from PurchaseService shop state");
    assert(snapshot.priceText === "15 成就点"
        && snapshot.canBuy === false
        && snapshot.canCancel === false
        && snapshot.badgeText === "已购",
        "PurchaseUiHelper should project button and badge state from PurchaseService shop state");

    const priceLabel = {
        value: "",
        setString: function (value) {
            this.value = value;
        }
    };
    const offIcon = {
        visible: false,
        off: 0,
        setVisible: function (value) {
            this.visible = !!value;
        },
        updateOff: function (value) {
            this.off = value;
        }
    };
    const buyButton = {
        enabled: true,
        setEnabled: function (value) {
            this.enabled = !!value;
        }
    };

    sandbox.PurchaseUiHelper.applyPayDialogState(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA, {
        titleNode: {
            getChildByName: function (name) {
                if (name === "price") {
                    return priceLabel;
                }
                if (name === "offIcon") {
                    return offIcon;
                }
                return null;
            }
        },
        actionNode: {
            getChildByName: function (name) {
                return name === "btn_2" ? buyButton : null;
            }
        }
    });

    assert(priceLabel.value === snapshot.priceText,
        "PurchaseUiHelper should apply projected price text onto pay dialogs");
    assert(buyButton.enabled === false,
        "PurchaseUiHelper should apply projected buy-button state onto pay dialogs");
    assert(offIcon.visible === true && offIcon.off === 50,
        "PurchaseUiHelper should apply projected discount state onto pay dialogs");
    assert(sandbox.PurchaseUiHelper.isPurchaseUnlocked(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === true,
        "PurchaseUiHelper unlock helper should read from PurchaseService shop state");
    assert(sandbox.PurchaseUiHelper.isExchangePurchase(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === true
        && sandbox.PurchaseUiHelper.isTalentPurchase(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === true,
        "PurchaseUiHelper should project exchange and talent flags through snapshot helpers");
    assert(sandbox.PurchaseUiHelper.shouldRequestRemotePayInfo(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === false
        && sandbox.PurchaseUiHelper.shouldRequestRemotePayInfo(SYNTHETIC_PURCHASE_IDS.CONSUMABLE_LOW) === true,
        "PurchaseUiHelper should expose whether a purchase still needs remote pay info");
    assert(JSON.stringify(sandbox.PurchaseUiHelper.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA)) === "[4001]"
        && sandbox.PurchaseUiHelper.getExchangeIdByPurchaseId(SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA) === SYNTHETIC_EXCHANGE_IDS.ROLE_ALPHA
        && sandbox.PurchaseUiHelper.getRoleTypeByPurchaseId(SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA) === 8,
        "PurchaseUiHelper should expose exchange metadata helpers through PurchaseService");
    assert(sandbox.PurchaseUiHelper.getAchievementPointsText() === "成就点 77",
        "PurchaseUiHelper should source achievement points label text from PurchaseService");

    return {
        name: "purchase-ui-state-projection",
        ok: true,
        detail: "validated PurchaseUiHelper consumes PurchaseService shop state instead of rebuilding purchase UI business state"
    };
}

function runSentinelPurchaseIdSnapshotSmoke() {
    const sandbox = createVmSandbox();
    sandbox.SafetyHelper = createSafetyHelper();
    sandbox.PurchaseList = createSyntheticPurchaseList();
    sandbox.Medal = {
        getAchievementPoints: function () {
            return 0;
        },
        getTalentLevel: function () {
            return 0;
        }
    };
    sandbox.stringUtil = {
        getString: function () {
            return {};
        }
    };
    sandbox.uiUtil = {
        getPurchaseStringConfig: function () {
            return {};
        },
        getTalentDisplayInfo: function () {
            return null;
        }
    };

    bootstrapRuntimeSandbox(sandbox);
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/IAPPackage.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");
    sandbox.GameKernel.register("PurchaseService", sandbox.PurchaseService);
    loadIntoSandbox(sandbox, "assets/src/ui/PurchaseUiHelper.js");

    assert(sandbox.PurchaseService.getPurchaseConfig(0) === null,
        "PurchaseService should return null config for sentinel purchase ids like the no-talent option");
    const snapshot = sandbox.PurchaseUiHelper.getPurchaseUiSnapshot(0);
    assert(snapshot && snapshot.purchaseId === 0,
        "PurchaseUiHelper should still build a snapshot for sentinel purchase ids");
    assert(snapshot.isUnlocked === true,
        "PurchaseUiHelper should keep the no-talent sentinel option selectable");
    assert(snapshot.purchaseConfig === null,
        "PurchaseUiHelper should not require a purchase config for sentinel purchase ids");

    return {
        name: "sentinel-purchase-id-snapshot",
        ok: true,
        detail: "validated sentinel purchase ids like the no-talent option avoid purchase-config crashes while remaining selectable"
    };
}


function runPurchaseUiBoundarySourceSmoke() {
    const shopSource = stripComments(readRepoFile("assets/src/ui/shopScene.js"));
    const deathSource = stripComments(readRepoFile("assets/src/ui/deathNode.js"));
    const uiUtilSource = stripComments(readRepoFile("assets/src/ui/uiUtil.js"));
    const buildSource = stripComments(readRepoFile("assets/src/ui/buildNode.js"));
    const homeSource = stripComments(readRepoFile("assets/src/ui/home.js"));

    assert(shopSource.indexOf("utils.updatePayInfo") === -1
        && deathSource.indexOf("utils.updatePayInfo") === -1
        && uiUtilSource.indexOf("utils.updatePayInfo") === -1,
        "UI purchase entrypoints should stop calling utils.updatePayInfo directly");
    assert(shopSource.indexOf("cc.purchase.restoreIAP") === -1,
        "shopScene restore flow should route through PurchaseService instead of calling cc.purchase.restoreIAP directly");
    assert(shopSource.indexOf("PurchaseService.restoreRemotePurchases") !== -1
        && shopSource.indexOf("PurchaseService.refreshRemotePayInfo") === -1
        && shopSource.indexOf("PurchaseUiHelper.refreshRemotePayInfoIfNeeded(") !== -1
        && shopSource.indexOf("PurchaseUiHelper.getRemotePayInfoRequestIds(") !== -1
        && shopSource.indexOf("PurchaseUiHelper.getRemotePayInfoPurchaseIds(") === -1
        && deathSource.indexOf("PurchaseUiHelper.showPayDialogWithRefresh(") !== -1
        && uiUtilSource.indexOf("PurchaseService.refreshRemotePayInfo") === -1
        && uiUtilSource.indexOf("PurchaseUiHelper.createLockNode(") !== -1,
        "PurchaseService should own remote catalog refresh while Shop/uiUtil route through PurchaseUiHelper orchestration");
    assert(buildSource.indexOf("PurchaseUiHelper.showPurchaseFailedTip") !== -1
        && homeSource.indexOf("PurchaseUiHelper.showPurchaseFailedTip") !== -1
        && deathSource.indexOf("PurchaseUiHelper.showPurchaseFailedTip") !== -1
        && buildSource.indexOf("failedReason") === -1
        && homeSource.indexOf("failedReason") === -1
        && deathSource.indexOf("failedReason") === -1,
        "Purchase failure UX should route through PurchaseUiHelper.showPurchaseFailedTip");

    return {
        name: "purchase-ui-boundaries",
        ok: true,
        detail: "validated purchase UI delegates remote sync/restore and failure UX to service/helper boundaries"
    };
}


function runPurchaseUiRemoteRefreshReuseSmoke() {
    const sandbox = createVmSandbox();
    let pendingRefresh = null;
    const refreshCalls = [];
    const dialogCalls = [];
    let batchRefreshInfo = null;
    let afterShowDialog = null;

    sandbox.GameKernel = {
        require: function (name) {
            return sandbox[name];
        }
    };
    sandbox.GameRuntime = {
        getEmitter: function () {
            return sandbox.utils.emitter;
        }
    };
    sandbox.PurchaseService = {
        getShopUiState: function (purchaseId) {
            return {
                purchaseId: Number(purchaseId),
                isExchangePurchase: false,
                canBuy: true
            };
        },
        getPurchaseConfig: function () {
            return {
                productPriceStr: "$1.99"
            };
        },
        refreshRemotePayInfo: function (target, cb, purchaseIdList) {
            refreshCalls.push(purchaseIdList.slice());
            pendingRefresh = {
                target: target,
                cb: cb,
                purchaseIdList: purchaseIdList.slice()
            };
        }
    };

    loadIntoSandbox(sandbox, "assets/src/ui/PurchaseUiHelper.js");

    sandbox.PurchaseUiHelper.showPayDialog = function (purchaseId) {
        dialogCalls.push(Number(purchaseId));
        return {
            purchaseId: Number(purchaseId)
        };
    };

    const refreshTarget = {};
    sandbox.PurchaseUiHelper.refreshRemotePayInfoIfNeeded(refreshTarget, [150, 151], function (err, info) {
        batchRefreshInfo = info;
    });
    sandbox.PurchaseUiHelper.showPayDialogWithRefresh(150, function () {}, refreshTarget, refreshTarget, function (err, dialog) {
        afterShowDialog = dialog;
    });

    assert(refreshCalls.length === 1
        && JSON.stringify(refreshCalls[0]) === "[150,151]"
        && dialogCalls.length === 0,
        "PurchaseUiHelper should reuse an in-flight batch refresh before opening a pay dialog");

    pendingRefresh.cb.call(pendingRefresh.target, null, {
        products: {
            150: "$1.99",
            151: "$2.99"
        }
    });

    assert(batchRefreshInfo
        && JSON.stringify(batchRefreshInfo.requestedIds) === "[150,151]"
        && dialogCalls.length === 1
        && dialogCalls[0] === 150
        && afterShowDialog
        && afterShowDialog.purchaseId === 150,
        "PurchaseUiHelper should open the dialog after the reused refresh completes without issuing a second refresh");

    return {
        name: "purchase-ui-remote-refresh-reuse",
        ok: true,
        detail: "validated PurchaseUiHelper reuses in-flight shop refreshes for deep-link pay dialogs"
    };
}


function runPurchaseStructuredResultSmoke() {
    const sandbox = createVmSandbox();
    let exchangeCost = 30;
    let achievementPoints = 100;
    let paidPurchaseIds = [];
    const runtimePlayer = createPurchaseRewardPlayer();
    sandbox.PurchaseList = createSyntheticPurchaseList();

    sandbox.TalentService = {
        isTalentPurchaseId: function () {
            return false;
        },
        getTalentLevel: function () {
            return 0;
        }
    };
    sandbox.Medal = {
        getAchievementPoints: function () {
            return achievementPoints;
        },
        exchangeAchievement: function () {
            achievementPoints -= exchangeCost;
            return true;
        }
    };
    sandbox.ExchangeAchievementConfig = {
        5001: {
            type: "item",
            targetId: SYNTHETIC_PURCHASE_IDS.ITEM_REWARD,
            cost: exchangeCost
        }
    };
    sandbox.IAPPackage = {
        getPurchaseRecordCount: function () {
            return 0;
        },
        syncPurchaseRecord: function () {
            return true;
        },
        recordPurchase: function (purchaseId) {
            paidPurchaseIds.push(Number(purchaseId));
            return true;
        },
        isPaySdkBypassedForTest: function () {
            return true;
        },
        isAutoUnlockEnabledForTest: function () {
            return false;
        },
        isPurchaseForceLockedForTest: function () {
            return false;
        },
        getPurchaseConfig: function (purchaseId) {
            return {
                price: Number(purchaseId) === SYNTHETIC_PURCHASE_IDS.CONSUMABLE_LOW ? 6 : 12,
                productPriceStr: "$9.99",
                priceIndex: 0
            };
        }
    };

    bootstrapRuntimeSandbox(sandbox, {
        player: runtimePlayer
    });
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");

    const exchangeResult = capturePurchaseResult(sandbox, SYNTHETIC_PURCHASE_IDS.ITEM_REWARD);
    assert(exchangeResult && exchangeResult.isSuccess === true
        && exchangeResult.success === true
        && exchangeResult.code === sandbox.PurchaseGatewayResultCode.SUCCESS
        && exchangeResult.isExchangePurchase === true
        && exchangeResult.unlockRewardGranted === true
        && exchangeResult.shopUiState
        && exchangeResult.failureReason === null,
        "PurchaseService should return a structured success result for exchange purchases");
    assert(runtimePlayer.storage.getNumByItemId(SYNTHETIC_ITEM_IDS.BAG) === 1,
        "PurchaseService exchange purchases should still grant unlock rewards through the runtime player");

    achievementPoints = 0;
    const consumableResult = capturePurchaseResult(sandbox, SYNTHETIC_PURCHASE_IDS.CONSUMABLE_LOW);
    assert(consumableResult && consumableResult.isFailure === true
        && consumableResult.code === sandbox.PurchaseGatewayResultCode.FAILED
        && consumableResult.success === false
        && consumableResult.failureReason === sandbox.PurchaseService.FAIL_REASON.INSUFFICIENT_POINTS,
        "PurchaseService should return a structured insufficient-points failure for consumable purchases");

    achievementPoints = 100;
    const bypassResult = capturePurchaseResult(sandbox, SYNTHETIC_PURCHASE_IDS.DIRECT_UNLOCK);
    assert(bypassResult && bypassResult.isSuccess === true
        && bypassResult.isExchangePurchase === false
        && bypassResult.unlockRecorded === true
        && bypassResult.shopUiState
        && bypassResult.failureReason === null,
        "PurchaseService should return a structured unlock result for bypassed direct purchases");
    assert(JSON.stringify(paidPurchaseIds) === "[151]",
        "PurchaseService should only invoke exchange payment side effects for the exchange path under this smoke");

    return {
        name: "purchase-structured-result",
        ok: true,
        detail: "validated PurchaseService purchase callbacks now return a structured result contract"
    };
}


module.exports = [
    runPurchaseUnlockRewardSmoke,
    runPurchaseRecordBoundarySmoke,
    runPurchaseExchangeConfigSmoke,
    runPurchaseUiStateProjectionSmoke,
    runSentinelPurchaseIdSnapshotSmoke,
    runPurchaseUiBoundarySourceSmoke,
    runPurchaseUiRemoteRefreshReuseSmoke,
    runPurchaseStructuredResultSmoke
];
