const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox,
    createCountStorage,
    createPurchaseRewardPlayer
} = require("../../lib/fixtures/runtime-boundaries");

function bootstrapRuntimeSandbox(sandbox, runtimeOptions) {
    runtimeOptions = runtimeOptions || {};
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    sandbox.GameRuntime.bootstrap({
        player: runtimeOptions.player || null,
        timer: runtimeOptions.timer || {
            pause: function () {},
            resume: function () {},
            formatTime: function () {
                return { d: 0 };
            }
        },
        emitter: runtimeOptions.emitter || sandbox.utils.emitter,
        record: runtimeOptions.record || sandbox.Record
    });
}

const SYNTHETIC_PURCHASE_IDS = {
    DIRECT_UNLOCK: 150,
    ITEM_REWARD: 151,
    ITEM_TOOL: 152,
    BUILD_REWARD: 153,
    PAID_ROLE_ALPHA: 158,
    PAID_ROLE_BETA: 159,
    TALENT_ALPHA: 160,
    TALENT_BETA: 161,
    TALENT_GAMMA: 162,
    CONSUMABLE_LOW: 230,
    CONSUMABLE_HIGH: 231,
    DISCOUNT_PACK: 260
};

const SYNTHETIC_ITEM_IDS = {
    BAG: 930001,
    BOOTS: 930002
};

const SYNTHETIC_BUILD_ID = 77;

const SYNTHETIC_EXCHANGE_IDS = {
    ROLE_ALPHA: 4001,
    ROLE_BETA: 4002,
    ITEM_REWARD: 5001,
    BUILD_REWARD: 5003,
    TALENT_ALPHA_LV1: 6001,
    TALENT_ALPHA_LV2: 6101,
    TALENT_ALPHA_LV3: 6201
};

function createSafetyHelper() {
    return {
        isEmpty: function (value) {
            return value === undefined || value === null || value === "";
        },
        safeJSONParse: function (value) {
            return JSON.parse(value);
        }
    };
}

function createSyntheticPurchaseList() {
    return {
        150: {
            priceList: [
                {
                    productId: "synthetic_direct_unlock",
                    price: 12,
                    currencyCode: "USD",
                    productPriceStr: "$9.99"
                }
            ],
            multiPrice: false
        },
        151: {
            priceList: [
                {
                    productId: "synthetic_item_reward",
                    price: 6,
                    currencyCode: "USD",
                    productPriceStr: "$4.99"
                }
            ],
            unlockReward: {
                type: "item",
                itemId: SYNTHETIC_ITEM_IDS.BAG,
                num: 1
            },
            multiPrice: false
        },
        152: {
            priceList: [
                {
                    productId: "synthetic_item_tool",
                    price: 3,
                    currencyCode: "USD",
                    productPriceStr: "$2.99"
                }
            ],
            unlockReward: {
                type: "item",
                itemId: SYNTHETIC_ITEM_IDS.BOOTS,
                num: 1
            },
            multiPrice: false
        },
        153: {
            priceList: [
                {
                    productId: "synthetic_build_reward",
                    price: 5,
                    currencyCode: "USD",
                    productPriceStr: "$3.99"
                }
            ],
            unlockReward: {
                type: "build",
                bid: SYNTHETIC_BUILD_ID,
                level: 0
            },
            multiPrice: false
        },
        158: {
            priceList: [
                {
                    productId: "synthetic_role_alpha",
                    price: 12,
                    currencyCode: "USD",
                    productPriceStr: "$9.99"
                }
            ],
            multiPrice: false
        },
        159: {
            priceList: [
                {
                    productId: "synthetic_role_beta",
                    price: 12,
                    currencyCode: "USD",
                    productPriceStr: "$9.99"
                }
            ],
            multiPrice: false
        },
        160: {
            priceList: [
                {
                    productId: "synthetic_talent_alpha",
                    price: 12,
                    currencyCode: "USD",
                    productPriceStr: "$9.99"
                }
            ],
            multiPrice: false
        },
        230: {
            priceList: [
                {
                    productId: "synthetic_consumable_low",
                    price: 6,
                    currencyCode: "USD",
                    productPriceStr: "$5.99"
                }
            ],
            multiPrice: false
        },
        231: {
            priceList: [
                {
                    productId: "synthetic_consumable_high",
                    price: 18,
                    currencyCode: "USD",
                    productPriceStr: "$17.99"
                }
            ],
            multiPrice: false
        },
        260: {
            priceList: [
                {
                    productId: "synthetic_discount_pack",
                    price: 18,
                    currencyCode: "USD",
                    productPriceStr: "$17.99"
                }
            ],
            discountPercent: 50,
            multiPrice: false
        }
    };
}

function createSyntheticRoleConfigTable() {
    return {
        6: {
            roleType: 6,
            purchaseId: null,
            exchangeId: null,
            selectionOrder: 0
        },
        7: {
            roleType: 7,
            purchaseId: SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA,
            exchangeId: SYNTHETIC_EXCHANGE_IDS.ROLE_ALPHA,
            selectionOrder: 1
        },
        8: {
            roleType: 8,
            purchaseId: SYNTHETIC_PURCHASE_IDS.PAID_ROLE_BETA,
            exchangeId: SYNTHETIC_EXCHANGE_IDS.ROLE_BETA,
            selectionOrder: 2
        }
    };
}

function createSyntheticTalentConfigTable() {
    return {
        160: {
            talentId: 160,
            purchaseId: SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
            displayOrder: 1,
            maxLevel: 3
        },
        161: {
            talentId: 161,
            purchaseId: SYNTHETIC_PURCHASE_IDS.TALENT_BETA,
            displayOrder: 2,
            maxLevel: 3
        },
        162: {
            talentId: 162,
            purchaseId: SYNTHETIC_PURCHASE_IDS.TALENT_GAMMA,
            displayOrder: 3,
            maxLevel: 3
        }
    };
}

function createSyntheticExchangeAchievementConfig() {
    return {
        4001: {
            type: "character",
            targetId: 7,
            cost: 50
        },
        4002: {
            type: "character",
            targetId: 8,
            cost: 50
        },
        5001: {
            type: "item",
            targetId: SYNTHETIC_PURCHASE_IDS.ITEM_REWARD,
            cost: 30
        },
        5003: {
            type: "item",
            targetId: SYNTHETIC_PURCHASE_IDS.BUILD_REWARD,
            cost: 25
        },
        6001: {
            type: "talent",
            targetId: SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
            level: 1,
            cost: 30
        },
        6101: {
            type: "talent",
            targetId: SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
            level: 2,
            cost: 50
        },
        6201: {
            type: "talent",
            targetId: SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
            level: 3,
            cost: 70
        }
    };
}

function runPurchaseUnlockRewardSmoke() {
    const sandbox = createVmSandbox();
    sandbox.IAPPackage = {
        isIAPUnlocked: function (purchaseId) {
            return purchaseId === SYNTHETIC_PURCHASE_IDS.ITEM_REWARD
                || purchaseId === SYNTHETIC_PURCHASE_IDS.ITEM_TOOL
                || purchaseId === SYNTHETIC_PURCHASE_IDS.BUILD_REWARD;
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

    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA)) === "[4001]",
        "IAPPackage should resolve synthetic paid role exchanges from ExchangeAchievementConfig via role config");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.PAID_ROLE_BETA)) === "[4002]",
        "IAPPackage should resolve additional paid role exchanges from synthetic role config");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.ITEM_REWARD)) === "[5001]",
        "IAPPackage should resolve exchange-only item purchases from ExchangeAchievementConfig");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.BUILD_REWARD)) === "[5003]",
        "IAPPackage should resolve synthetic build unlock purchases from ExchangeAchievementConfig");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA)) === "[6001,6101,6201]",
        "IAPPackage should resolve ordered talent exchange levels from ExchangeAchievementConfig");
    assert(sandbox.IAPPackage.getExchangeIdByPurchaseId(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === SYNTHETIC_EXCHANGE_IDS.TALENT_ALPHA_LV2,
        "IAPPackage should return the next unexchanged talent level after configured exchange sorting");
    assert(sandbox.IAPPackage.isExchangePurchase(SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA) === true,
        "IAPPackage should keep exchange-role purchases on config-driven exchange flow");
    assert(sandbox.IAPPackage.isExchangePurchase(SYNTHETIC_PURCHASE_IDS.CONSUMABLE_LOW) === false,
        "IAPPackage should not treat consumable support packs as exchange-config purchases");
    assert(sandbox.PurchaseService.isTalentPurchase(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === true,
        "PurchaseService should source talent purchase detection from TalentService");
    sandbox.Medal.getTalentLevel = function () {
        throw new Error("purchase chain should source talent level state from TalentService");
    };
    assert(sandbox.IAPPackage.isIAPUnlocked(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === true,
        "IAPPackage should delegate talent unlock checks to TalentService");
    assert(sandbox.IAPPackage.isPurchaseFullyUnlocked(SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA) === false,
        "IAPPackage should delegate talent max-level checks to TalentService");
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

function runTalentSelectionScopedStorageSmoke() {
    const sandbox = createVmSandbox();
    sandbox.Record = {
        getCurrentSlot: function () {
            return 2;
        }
    };
    sandbox.TalentConfigTable = createSyntheticTalentConfigTable();
    sandbox.Medal = {
        getTalentLevel: function (purchaseId) {
            purchaseId = Number(purchaseId);
            return purchaseId === SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA
                || purchaseId === SYNTHETIC_PURCHASE_IDS.TALENT_BETA
                || purchaseId === SYNTHETIC_PURCHASE_IDS.TALENT_GAMMA
                ? 1
                : 0;
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/TalentService.js");

    sandbox.cc.sys.localStorage.setItem("chosenTalents_slot_2", "[160]");
    sandbox.cc.sys.localStorage.setItem("chosenTalent_slot_2", "161");
    sandbox.cc.sys.localStorage.setItem("chosenTalents", "[162]");

    assert(JSON.stringify(sandbox.TalentService.getChosenTalentPurchaseIds()) === "[160]",
        "TalentService should only restore current slot talent selections from chosenTalents_slot storage");
    sandbox.TalentService.chooseTalents([
        SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
        SYNTHETIC_PURCHASE_IDS.TALENT_BETA
    ]);
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents_slot_2") === "[160,161]",
        "TalentService should write the normalized slot-scoped talent selection only to chosenTalents_slot");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalent_slot_2") === "161"
        && sandbox.cc.sys.localStorage.getItem("chosenTalents") === "[162]",
        "TalentService should ignore legacy talent-selection keys instead of migrating them");

    return {
        name: "talent-selection-scoped-storage",
        ok: true,
        detail: "validated TalentService only reads and writes slot-scoped chosenTalents storage"
    };
}

function runRoleSelectionScopedStorageSmoke() {
    const sandbox = createVmSandbox();
    let roleUnlocked = false;

    sandbox.Record = {
        getCurrentSlot: function () {
            return 2;
        },
        hasRecord: function () {
            return false;
        }
    };
    sandbox.PurchaseService = {
        isRoleUnlocked: function (roleType) {
            return roleUnlocked && Number(roleType) === 8;
        }
    };
    sandbox.RoleConfigTable = createSyntheticRoleConfigTable();

    loadIntoSandbox(sandbox, "assets/src/game/role.js");

    sandbox.cc.sys.localStorage.setItem("roleType", String(sandbox.RoleType.BELL));
    assert(sandbox.role.getChoosenRoleType() === sandbox.RoleType.STRANGER,
        "role.getChoosenRoleType should ignore legacy global roleType storage for the current slot");
    sandbox.cc.sys.localStorage.setItem("roleType_slot_2", String(sandbox.RoleType.BELL));
    assert(sandbox.role.getChoosenRoleType() === sandbox.RoleType.STRANGER,
        "role.getChoosenRoleType should fall back to stranger when the slot-scoped role is locked on a fresh run");
    assert(sandbox.cc.sys.localStorage.getItem("roleType_slot_2") === String(sandbox.RoleType.STRANGER),
        "role.getChoosenRoleType should rewrite fresh-run slot selection to stranger when the stored role is locked");

    roleUnlocked = true;
    sandbox.cc.sys.localStorage.setItem("roleType_slot_2", String(sandbox.RoleType.BELL));
    assert(sandbox.role.getChoosenRoleType() === sandbox.RoleType.BELL,
        "role.getChoosenRoleType should keep unlocked slot-scoped role selections");

    return {
        name: "role-selection-scoped-storage",
        ok: true,
        detail: "validated role selection only uses slot-scoped storage and ignores legacy global role keys"
    };
}

function capturePurchaseResult(sandbox, purchaseId) {
    let captured = null;
    sandbox.PurchaseService.purchase(purchaseId, null, function (result) {
        captured = result;
    });
    return captured;
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
        getExchangeIdsByPurchaseId: function (purchaseId) {
            return Number(purchaseId) === SYNTHETIC_PURCHASE_IDS.ITEM_REWARD ? [5001] : [];
        },
        getExchangeIdByPurchaseId: function (purchaseId) {
            return Number(purchaseId) === SYNTHETIC_PURCHASE_IDS.ITEM_REWARD ? 5001 : null;
        },
        isIAPUnlocked: function () {
            return false;
        },
        syncIAPPurchased: function () {
            return true;
        },
        onIAPPaied: function (purchaseId) {
            paidPurchaseIds.push(Number(purchaseId));
        },
        isPaySdkBypassedForTest: function () {
            return true;
        },
        getPurchaseConfig: function (purchaseId) {
            return {
                price: Number(purchaseId) === SYNTHETIC_PURCHASE_IDS.CONSUMABLE_LOW ? 6 : 12,
                productPriceStr: "$9.99",
                priceIndex: 0
            };
        },
        payConsumeIAP: function (purchaseId) {
            paidPurchaseIds.push(Number(purchaseId));
            return true;
        }
    };

    bootstrapRuntimeSandbox(sandbox, {
        player: runtimePlayer
    });
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");

    const exchangeResult = capturePurchaseResult(sandbox, SYNTHETIC_PURCHASE_IDS.ITEM_REWARD);
    assert(exchangeResult && exchangeResult.isSuccess === true
        && exchangeResult.isExchangePurchase === true
        && exchangeResult.unlockRewardGranted === true,
        "PurchaseService should return a structured success result for exchange purchases");
    assert(runtimePlayer.storage.getNumByItemId(SYNTHETIC_ITEM_IDS.BAG) === 1,
        "PurchaseService exchange purchases should still grant unlock rewards through the runtime player");

    achievementPoints = 0;
    const consumableResult = capturePurchaseResult(sandbox, SYNTHETIC_PURCHASE_IDS.CONSUMABLE_LOW);
    assert(consumableResult && consumableResult.isFailure === true
        && consumableResult.failedReason === sandbox.PurchaseService.FAIL_REASON.INSUFFICIENT_POINTS,
        "PurchaseService should return a structured insufficient-points failure for consumable purchases");

    achievementPoints = 100;
    const bypassResult = capturePurchaseResult(sandbox, SYNTHETIC_PURCHASE_IDS.DIRECT_UNLOCK);
    assert(bypassResult && bypassResult.isSuccess === true
        && bypassResult.isExchangePurchase === false
        && bypassResult.unlockRecorded === true
        && bypassResult.failedReason === null,
        "PurchaseService should return a structured unlock result for bypassed direct purchases");
    assert(JSON.stringify(paidPurchaseIds) === "[151]",
        "PurchaseService should only invoke exchange payment side effects for the exchange path under this smoke");

    return {
        name: "purchase-structured-result",
        ok: true,
        detail: "validated PurchaseService purchase callbacks now return a structured result contract"
    };
}

function createPersistenceComponent(name, calls) {
    return {
        save: function () {
            calls.push(name + ".save");
            return { id: name };
        },
        restore: function (saveObj) {
            calls.push(name + ".restore");
            this.lastRestore = saveObj;
        }
    };
}

function createPersistencePlayer(calls) {
    const player = {
        hp: 0,
        hpMaxOrigin: 0,
        hpMax: 0,
        spirit: 0,
        starve: 0,
        vigour: 0,
        injury: 0,
        infect: 0,
        temperature: 0,
        roleType: 6,
        deathCausedInfect: false,
        setting: {},
        isBombActive: false,
        bag: createPersistenceComponent("bag", calls),
        storage: Object.assign(createPersistenceComponent("storage", calls), {
            increaseItem: function () {}
        }),
        dog: createPersistenceComponent("dog", calls),
        room: createPersistenceComponent("room", calls),
        equip: createPersistenceComponent("equip", calls),
        map: createPersistenceComponent("map", calls),
        npcManager: createPersistenceComponent("npcManager", calls),
        weather: createPersistenceComponent("weather", calls),
        buffManager: createPersistenceComponent("buffManager", calls),
        ziplineNetwork: {
            save: function () {
                calls.push("zipline.save");
                return { links: [] };
            },
            restore: function (saveObj, mapObj) {
                calls.push("zipline.restore");
                this.lastRestore = saveObj;
                this.lastMap = mapObj;
            }
        },
        navigationState: {
            save: function () {
                calls.push("navigation.save");
                return {
                    locationType: "home",
                    mapEntityId: 1,
                    mapEntityKey: "site:1",
                    activeSiteId: 0
                };
            },
            restore: function (saveObj) {
                calls.push("navigation.restore");
                this.lastRestore = saveObj;
            },
            syncMapEntityIdFromMap: function (mapObj) {
                calls.push("navigation.sync");
                this.lastMap = mapObj;
            }
        }
    };
    return player;
}

function runPlayerPersistenceContractSmoke() {
    const sandbox = createVmSandbox();
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/PlayerPersistenceService.js");

    assert(sandbox.PlayerPersistenceService.SAVE_SCHEMA_VERSION === 3,
        "PlayerPersistenceService should expose the v3 save schema version");
    assert(sandbox.PlayerPersistenceService.MIN_SUPPORTED_SCHEMA_VERSION === 2,
        "PlayerPersistenceService should declare the minimum supported save schema");
    assert(typeof sandbox.PlayerPersistenceService._applyRestoreMigrations === "undefined"
        && typeof sandbox.PlayerPersistenceService._applyLegacyRestoreMigrations === "undefined"
        && typeof sandbox.PlayerPersistenceService._applySelectionStateMigration === "undefined"
        && typeof sandbox.PlayerPersistenceService._applyRestoreStateSyncs === "undefined"
        && typeof sandbox.PlayerPersistenceService._persistPostRestoreMutations === "undefined",
        "PlayerPersistenceService should no longer expose legacy restore layering helpers");

    return {
        name: "player-persistence-contract",
        ok: true,
        detail: "validated PlayerPersistenceService only exposes the current save schema contract and restore pipeline"
    };
}

function runPlayerPersistenceUnsupportedSaveSmoke() {
    const sandbox = createVmSandbox();
    const calls = [];
    let deleteRecordCount = 0;
    let clearCompatibilityCount = 0;
    let resetChosenTalentCount = 0;
    let talentInitCount = 0;
    let improveCount = 0;
    let purchaseReconcileCount = 0;
    let recordSaveCount = 0;
    let chosenRoleType = null;
    let reconcilePurchaseIds = null;

    sandbox.ErrorHandler = {
        safeExecute: function (fn, context, fallbackValue) {
            try {
                return fn();
            } catch (error) {
                return fallbackValue;
            }
        }
    };
    sandbox.ShareType = {
        NO_SHARED: 0,
        SHARED_CAN_REWARD: 1,
        SHARED_AND_REWARD: 2
    };
    sandbox.role = {
        getRoleConfig: function (roleType) {
            roleType = Number(roleType);
            return roleType === 6 ? { id: 6 } : null;
        },
        getChoosenRoleType: function () {
            return 6;
        },
        chooseRoleType: function (roleType) {
            chosenRoleType = Number(roleType);
        }
    };
    sandbox.TalentService = {
        init: function () {
            talentInitCount++;
        },
        resetChosenTalentCache: function () {
            resetChosenTalentCount++;
        }
    };
    sandbox.Medal = {
        improve: function () {
            improveCount++;
        }
    };
    sandbox.PurchaseService = {
        reconcileUnlockRewardsForPlayer: function (playerObj, purchaseIds) {
            purchaseReconcileCount++;
            reconcilePurchaseIds = purchaseIds;
            return true;
        }
    };
    sandbox.RoleRuntimeService = {
        ensureRoomBuildStates: function () {
            return false;
        },
        ensureInitialUnlocks: function () {
            return false;
        },
        ensureSpecialItems: function () {
            return false;
        }
    };
    sandbox.Record = {
        restore: function () {
            return { schemaVersion: 1 };
        },
        deleteRecord: function () {
            deleteRecordCount++;
        },
        clearCurrentSlotCompatibilityState: function () {
            clearCompatibilityCount++;
        },
        getShareFlag: function () {
            return sandbox.ShareType.NO_SHARED;
        },
        setShareFlag: function () {},
        saveAll: function () {
            recordSaveCount++;
        }
    };

    bootstrapRuntimeSandbox(sandbox, {
        record: sandbox.Record
    });
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    sandbox.GameKernel.register("TalentService", sandbox.TalentService);
    sandbox.GameKernel.register("PurchaseService", sandbox.PurchaseService);
    sandbox.GameKernel.register("RoleRuntimeService", sandbox.RoleRuntimeService);
    loadIntoSandbox(sandbox, "assets/src/game/PlayerPersistenceService.js");

    const playerObj = createPersistencePlayer(calls);
    sandbox.PlayerPersistenceService.restore(playerObj, {
        restoreAttrs: function () {
            throw new Error("unsupported saves should not enter supported restore attr flow");
        }
    });

    assert(deleteRecordCount === 1 && clearCompatibilityCount === 1,
        "PlayerPersistenceService should auto-delete unsupported saves and clear current-slot compatibility keys");
    assert(resetChosenTalentCount === 1 && talentInitCount === 1 && improveCount === 1,
        "PlayerPersistenceService should rebuild new-game derived state after clearing an unsupported save");
    assert(playerObj.roleType === 6 && chosenRoleType === 6,
        "PlayerPersistenceService should reset role selection through the current slot role flow after unsupported saves");
    assert(calls.indexOf("zipline.restore") !== -1 && calls.indexOf("navigation.sync") !== -1,
        "PlayerPersistenceService should still restore deferred runtime components on the new-game path");
    assert(reconcilePurchaseIds === undefined,
        "PlayerPersistenceService should let PurchaseService decide unlock-reward purchase ids");
    assert(purchaseReconcileCount === 1 && recordSaveCount === 1,
        "PlayerPersistenceService should still run unlock reward reconciliation and persist rebuilt state after unsupported saves");

    return {
        name: "player-persistence-unsupported-save",
        ok: true,
        detail: "validated unsupported saves are auto-cleared and restarted without legacy migration branches"
    };
}

function runPlayerPersistenceNewGameUnlockRewardSmoke() {
    const sandbox = createVmSandbox();
    const calls = [];
    let talentInitCount = 0;
    let improveCount = 0;
    let purchaseReconcileCount = 0;
    let roomEnsureCount = 0;
    let initialUnlockEnsureCount = 0;
    let specialItemsEnsureCount = 0;
    let recordSaveCount = 0;
    let reconcilePurchaseIds = null;

    sandbox.ErrorHandler = {
        safeExecute: function (fn, context, fallbackValue) {
            try {
                return fn();
            } catch (error) {
                return fallbackValue;
            }
        }
    };
    sandbox.ShareType = {
        NO_SHARED: 0,
        SHARED_CAN_REWARD: 1,
        SHARED_AND_REWARD: 2
    };
    sandbox.role = {
        getRoleConfig: function (roleType) {
            roleType = Number(roleType);
            return roleType === 6 ? { id: 6 } : null;
        },
        getChoosenRoleType: function () {
            return 6;
        },
        chooseRoleType: function () {}
    };
    sandbox.TalentService = {
        init: function () {
            talentInitCount++;
        },
        reconcilePlayerHpByTalentSelection: function () {
            return false;
        }
    };
    sandbox.Medal = {
        improve: function () {
            improveCount++;
        }
    };
    sandbox.PurchaseService = {
        reconcileUnlockRewardsForPlayer: function (playerObj, purchaseIds) {
            purchaseReconcileCount++;
            reconcilePurchaseIds = purchaseIds;
            return !!playerObj;
        }
    };
    sandbox.RoleRuntimeService = {
        ensureRoomBuildStates: function () {
            roomEnsureCount++;
            return false;
        },
        ensureInitialUnlocks: function () {
            initialUnlockEnsureCount++;
            return false;
        },
        ensureSpecialItems: function () {
            specialItemsEnsureCount++;
            return false;
        }
    };
    sandbox.Record = {
        restore: function () {
            return null;
        },
        getShareFlag: function () {
            return sandbox.ShareType.NO_SHARED;
        },
        setShareFlag: function () {},
        saveAll: function () {
            recordSaveCount++;
        }
    };

    bootstrapRuntimeSandbox(sandbox, {
        record: sandbox.Record
    });
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    sandbox.GameKernel.register("TalentService", sandbox.TalentService);
    sandbox.GameKernel.register("PurchaseService", sandbox.PurchaseService);
    sandbox.GameKernel.register("RoleRuntimeService", sandbox.RoleRuntimeService);
    loadIntoSandbox(sandbox, "assets/src/game/PlayerPersistenceService.js");

    const playerObj = createPersistencePlayer(calls);
    sandbox.PlayerPersistenceService.restore(playerObj, {
        restoreAttrs: function () {
            throw new Error("new game path should not call restoreAttrs");
        }
    });

    assert(talentInitCount === 1 && improveCount === 1,
        "PlayerPersistenceService should initialize new-game talent and medal effects before reconciliation");
    assert(purchaseReconcileCount === 1,
        "PlayerPersistenceService should validate unlock reward entitlements even on a fresh new game");
    assert(reconcilePurchaseIds === undefined,
        "PlayerPersistenceService should not hardcode unlock reward purchase ids");
    assert(roomEnsureCount === 1 && initialUnlockEnsureCount === 1 && specialItemsEnsureCount === 1,
        "PlayerPersistenceService should run role-derived reconciliation on the new-game path");
    assert(recordSaveCount === 1,
        "PlayerPersistenceService should persist fresh-run reconciliation mutations when unlock rewards are granted");
    assert(calls.indexOf("zipline.restore") !== -1 && calls.indexOf("navigation.sync") !== -1,
        "PlayerPersistenceService should keep deferred component restore on the new-game path");

    return {
        name: "player-persistence-new-game-unlock-reward",
        ok: true,
        detail: "validated fresh new games also reconcile purchased unlock rewards on the new-game path"
    };
}

function runPlayerPersistenceSupportedRestoreSmoke() {
    const sandbox = createVmSandbox();
    const calls = [];
    let chooseTalentsArgs = null;
    let chosenRoleType = null;
    let recordSaveCount = 0;
    let restoreAttrsKeys = null;
    let reconcilePurchaseIds = null;

    sandbox.ErrorHandler = {
        safeExecute: function (fn, context, fallbackValue) {
            try {
                return fn();
            } catch (error) {
                return fallbackValue;
            }
        }
    };
    sandbox.RoleType = {
        STRANGER: 6
    };
    sandbox.role = {
        getRoleConfig: function (roleType) {
            roleType = Number(roleType);
            return (roleType === 6 || roleType === 8) ? { id: roleType } : null;
        },
        getChoosenRoleType: function () {
            return 6;
        },
        chooseRoleType: function (roleType) {
            chosenRoleType = Number(roleType);
        }
    };
    sandbox.TalentService = {
        chooseTalents: function (purchaseIds) {
            chooseTalentsArgs = purchaseIds.slice();
        },
        reconcilePlayerHpByTalentSelection: function () {
            return true;
        }
    };
    sandbox.PurchaseService = {
        reconcileUnlockRewardsForPlayer: function (playerObj, purchaseIds) {
            reconcilePurchaseIds = purchaseIds;
            return false;
        }
    };
    sandbox.RoleRuntimeService = {
        ensureRoomBuildStates: function () {
            return false;
        },
        ensureInitialUnlocks: function () {
            return true;
        },
        ensureSpecialItems: function () {
            return false;
        }
    };
    sandbox.Record = {
        restore: function () {
            return {
                schemaVersion: 3,
                hp: 200,
                hpMaxOrigin: 240,
                hpMax: 240,
                spirit: 90,
                starve: 60,
                vigour: 80,
                injury: 5,
                infect: 10,
                temperature: 30,
                navigationState: {
                    locationType: "map",
                    mapEntityId: 3,
                    mapEntityKey: "site:3",
                    activeSiteId: 0
                },
                deathCausedInfect: true,
                setting: {
                    activeTalentStartGiftsApplied: true
                },
                isBombActive: true,
                roleType: 8,
                chosenTalentIds: [160],
                bag: { id: "bag" },
                storage: { id: "storage" },
                dog: { id: "dog" },
                room: { id: "room" },
                equip: { id: "equip" },
                map: { id: "map" },
                npcManager: { id: "npc" },
                weather: { id: "weather" },
                buffManager: { id: "buff" },
                ziplineNetwork: {
                    links: [{ startEntityKey: "site:1", endEntityKey: "site:3" }]
                }
            };
        },
        saveAll: function () {
            recordSaveCount++;
        }
    };

    bootstrapRuntimeSandbox(sandbox, {
        record: sandbox.Record
    });
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    sandbox.GameKernel.register("TalentService", sandbox.TalentService);
    sandbox.GameKernel.register("PurchaseService", sandbox.PurchaseService);
    sandbox.GameKernel.register("RoleRuntimeService", sandbox.RoleRuntimeService);
    loadIntoSandbox(sandbox, "assets/src/game/PlayerPersistenceService.js");

    const playerObj = createPersistencePlayer(calls);
    sandbox.PlayerPersistenceService.restore(playerObj, {
        restoreAttrs: function (playerInstance, data, keys) {
            restoreAttrsKeys = keys.slice();
            playerInstance.hp = data.hp;
        }
    });

    assert(playerObj.roleType === 8 && chosenRoleType === 8,
        "PlayerPersistenceService should restore and persist the supported save role selection");
    assert(JSON.stringify(chooseTalentsArgs) === "[160]",
        "PlayerPersistenceService should restore supported save talent selections through TalentService");
    assert(JSON.stringify(restoreAttrsKeys) === JSON.stringify(sandbox.PlayerPersistenceService.RESTORE_ATTR_KEYS),
        "PlayerPersistenceService should restore the supported attribute set through the attr helper");
    assert(reconcilePurchaseIds === undefined,
        "PlayerPersistenceService should keep unlock reward reconciliation routed through PurchaseService ownership");
    assert(playerObj.navigationState.lastRestore
        && playerObj.navigationState.lastRestore.locationType === "map",
        "PlayerPersistenceService should restore navigation only from the normalized navigationState object");
    assert(playerObj.ziplineNetwork.lastRestore
        && Array.isArray(playerObj.ziplineNetwork.lastRestore.links)
        && calls.indexOf("zipline.restore") > calls.indexOf("map.restore"),
        "PlayerPersistenceService should restore ziplineNetwork in the deferred restore stage");
    assert(recordSaveCount === 1,
        "PlayerPersistenceService should persist restore reconciliations when they mutate supported saves");

    return {
        name: "player-persistence-supported-restore",
        ok: true,
        detail: "validated supported saves restore through the current navigation, zipline, and reconciliation pipeline"
    };
}

module.exports = [
    runPurchaseUnlockRewardSmoke,
    runPurchaseRecordBoundarySmoke,
    runPurchaseExchangeConfigSmoke,
    runPurchaseUiStateProjectionSmoke,
    runSentinelPurchaseIdSnapshotSmoke,
    runTalentSelectionScopedStorageSmoke,
    runRoleSelectionScopedStorageSmoke,
    runPurchaseStructuredResultSmoke,
    runPlayerPersistenceContractSmoke,
    runPlayerPersistenceUnsupportedSaveSmoke,
    runPlayerPersistenceNewGameUnlockRewardSmoke,
    runPlayerPersistenceSupportedRestoreSmoke
];
