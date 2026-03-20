const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox,
    createCountStorage,
    createPurchaseRewardPlayer
} = require("../../lib/fixtures/runtime-boundaries");

function runPurchaseUnlockRewardSmoke() {
    const sandbox = createVmSandbox();
    sandbox.IAPPackage = {
        isIAPUnlocked: function (purchaseId) {
            return purchaseId === 105 || purchaseId === 106 || purchaseId === 107;
        }
    };
    sandbox.player = createPurchaseRewardPlayer({ bag: { 1305024: 1 } });

    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/plugin/purchaseList.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");

    assert(sandbox.PurchaseService._grantUnlockReward(105) === false,
        "PurchaseService should not duplicate unlock reward items already owned in bag");
    assert(sandbox.player.storage.getNumByItemId(1305024) === 0,
        "PurchaseService should not backfill storage when bag already owns the unlock reward item");

    const reconcilePlayer = createPurchaseRewardPlayer({ bag: { 1305024: 1 } });
    assert(sandbox.PurchaseService.reconcileUnlockRewardsForPlayer(reconcilePlayer, [105, 106, 107]) === true,
        "PurchaseService should reconcile missing unlock rewards for unlocked purchases");
    assert(reconcilePlayer.storage.getNumByItemId(1305024) === 0,
        "PurchaseService should not duplicate big bag reward when it already exists in bag");
    assert(reconcilePlayer.storage.getNumByItemId(1304024) === 1,
        "PurchaseService should restore the boots unlock reward when it is missing");
    assert(reconcilePlayer.room.buildLevels[12] === 0,
        "PurchaseService should restore dog house unlock reward at build level 0");
    assert(reconcilePlayer.room.createCalls.length === 1 && reconcilePlayer.room.createCalls[0][1] === 0,
        "PurchaseService should create dog house using the unlocked build level");
    assert(sandbox.PurchaseService.reconcileUnlockRewardsForPlayer(reconcilePlayer, [105, 106, 107]) === false,
        "PurchaseService unlock reward reconciliation should be idempotent once rewards exist");

    return {
        name: "purchase-unlock-rewards",
        ok: true,
        detail: "validated purchase unlock reward grant/reconcile flow avoids duplicate items and restores dog house at unlocked level"
    };
}

function runPurchaseRecordBoundarySmoke() {
    const sandbox = createVmSandbox();
    sandbox.SafetyHelper = {
        isEmpty: function (value) {
            return value === undefined || value === null || value === "";
        },
        safeJSONParse: function (value) {
            return JSON.parse(value);
        }
    };

    loadIntoSandbox(sandbox, "assets/src/plugin/purchaseList.js");
    loadIntoSandbox(sandbox, "assets/src/game/IAPPackage.js");

    sandbox.IAPPackage.initPackage();
    assert(sandbox.IAPPackage._record[101] === 0,
        "IAPPackage initPackage should no longer pre-mark exchange purchases as purchased");
    assert(sandbox.IAPPackage._record[108] === 0,
        "IAPPackage initPackage should leave role exchange purchase records untouched");
    assert(sandbox.IAPPackage._record[120] === 0,
        "IAPPackage initPackage should leave talent exchange purchase records untouched");

    sandbox.IAPPackage._record[201] = 1;
    sandbox.IAPPackage._record[207] = 2;
    sandbox.IAPPackage._record[105] = 3;
    sandbox.IAPPackage.resetConsumeIAP();

    assert(sandbox.IAPPackage._record[201] === 0,
        "IAPPackage resetConsumeIAP should reset configured consumable purchase records");
    assert(sandbox.IAPPackage._record[207] === 0,
        "IAPPackage resetConsumeIAP should reset high-tier consumable purchase records");
    assert(sandbox.IAPPackage._record[105] === 3,
        "IAPPackage resetConsumeIAP should not reset non-consumable exchange purchase records");

    return {
        name: "purchase-record-boundaries",
        ok: true,
        detail: "validated purchase record init/reset only touches configured consumable records and stops pre-marking exchange purchases"
    };
}

function runPurchaseExchangeConfigSmoke() {
    const sandbox = createVmSandbox();
    sandbox.TalentService = {
        isTalentPurchaseId: function (purchaseId) {
            return Number(purchaseId) === 120;
        },
        getTalentLevel: function () {
            return 2;
        },
        getTalentMaxLevel: function () {
            return 3;
        },
        isTalentUnlocked: function (purchaseId) {
            return Number(purchaseId) === 120;
        },
        isTalentFullyUnlocked: function () {
            return false;
        }
    };
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/data/roleConfigTable.js");
    loadIntoSandbox(sandbox, "assets/src/game/role.js");
    loadIntoSandbox(sandbox, "assets/src/game/medal.js");
    loadIntoSandbox(sandbox, "assets/src/plugin/purchaseList.js");
    loadIntoSandbox(sandbox, "assets/src/game/IAPPackage.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");
    sandbox.Medal._exchangeMap = {
        2005: { unlocked: true }
    };
    sandbox.Medal._achievementPoints = 0;

    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(108)) === "[1001]",
        "IAPPackage should resolve legacy paid role exchanges from ExchangeAchievementConfig via role config");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(114)) === "[1007]",
        "IAPPackage should resolve new role exchanges from ExchangeAchievementConfig via role config");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(105)) === "[3001]",
        "IAPPackage should resolve exchange-only item purchases from ExchangeAchievementConfig");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(107)) === "[3003]",
        "IAPPackage should resolve dog house exchange purchase from ExchangeAchievementConfig");
    assert(JSON.stringify(sandbox.IAPPackage.getExchangeIdsByPurchaseId(120)) === "[2005,2105,2205]",
        "IAPPackage should resolve ordered talent exchange levels from ExchangeAchievementConfig");
    assert(sandbox.IAPPackage.getExchangeIdByPurchaseId(120) === 2105,
        "IAPPackage should return the next unexchanged talent level after configured exchange sorting");
    assert(sandbox.IAPPackage.isExchangePurchase(110) === true,
        "IAPPackage should keep exchange-role purchases on config-driven exchange flow");
    assert(sandbox.IAPPackage.isExchangePurchase(203) === false,
        "IAPPackage should not treat consumable support packs as exchange-config purchases");
    assert(sandbox.PurchaseService.isTalentPurchase(120) === true,
        "PurchaseService should source talent purchase detection from TalentService");
    sandbox.Medal.getTalentLevel = function () {
        throw new Error("purchase chain should source talent level state from TalentService");
    };
    assert(sandbox.IAPPackage.isIAPUnlocked(120) === true,
        "IAPPackage should delegate talent unlock checks to TalentService");
    assert(sandbox.IAPPackage.isPurchaseFullyUnlocked(120) === false,
        "IAPPackage should delegate talent max-level checks to TalentService");
    assert(sandbox.PurchaseService.getShopUiState(120).currentTalentLevel === 2,
        "PurchaseService should source current talent level from TalentService when building shop state");
    assert(sandbox.PurchaseService.getPriceOff(206) === 50,
        "PurchaseService should source fixed support-pack discounts from purchase config");
    const paidRoleType = sandbox.role.getRoleTypeByPurchaseId(108);
    sandbox.PurchaseService.isUnlocked = function (purchaseId) {
        return Number(purchaseId) === 108;
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
        detail: "validated IAPPackage derives exchange mappings from config while talent gameplay ownership stays outside the purchase chain"
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
    sandbox.PurchaseService = {
        getPurchaseConfig: function (purchaseId) {
            return {
                id: Number(purchaseId),
                productPriceStr: "$9.99",
                price: 9.99
            };
        },
        getShopUiState: function (purchaseId) {
            return {
                purchaseId: Number(purchaseId),
                isExchangePurchase: true,
                isTalentPurchase: true,
                isUnlocked: true,
                currentTalentLevel: 2,
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

    const snapshot = sandbox.PurchaseUiHelper.getPurchaseUiSnapshot(120);
    assert(snapshot.purchaseConfig && snapshot.purchaseConfig.id === 120,
        "PurchaseUiHelper should resolve purchase config through PurchaseService");
    assert(snapshot.shopState && snapshot.shopState.purchaseId === 120,
        "PurchaseUiHelper should resolve shop state through PurchaseService");
    assert(snapshot.isExchangePurchase === true
        && snapshot.isTalentPurchase === true
        && snapshot.isUnlocked === true
        && snapshot.currentTalentLevel === 2,
        "PurchaseUiHelper should project unlock and talent fields from PurchaseService shop state");
    assert(snapshot.priceText === "15 成就点"
        && snapshot.canBuy === false
        && snapshot.canCancel === false
        && snapshot.badgeText === "已购",
        "PurchaseUiHelper should project button and badge state from PurchaseService shop state");
    assert(sandbox.PurchaseUiHelper.isPurchaseUnlocked(120) === true,
        "PurchaseUiHelper unlock helper should read from PurchaseService shop state");
    assert(sandbox.PurchaseUiHelper.getAchievementPointsText() === "成就点 77",
        "PurchaseUiHelper should source achievement points label text from PurchaseService");

    return {
        name: "purchase-ui-state-projection",
        ok: true,
        detail: "validated PurchaseUiHelper consumes PurchaseService shop state instead of rebuilding purchase UI business state"
    };
}

function runTalentSelectionMigrationSmoke() {
    const sandbox = createVmSandbox();
    sandbox.Record = {
        getCurrentSlot: function () {
            return 2;
        },
        hasRecord: function (slot) {
            return Number(slot) === 2;
        },
        getAllRecordNames: function () {
            return ["record", "record_2", "record_3"];
        }
    };
    sandbox.Medal = {
        getTalentLevel: function (purchaseId) {
            purchaseId = Number(purchaseId);
            return (purchaseId === 120 || purchaseId === 121 || purchaseId === 122) ? 1 : 0;
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/data/talentConfigTable.js");
    loadIntoSandbox(sandbox, "assets/src/game/TalentService.js");

    sandbox.cc.sys.localStorage.setItem("chosenTalent_slot_2", "120");
    assert(JSON.stringify(sandbox.TalentService.getChosenTalentPurchaseIds()) === "[120]",
        "TalentService should migrate legacy slot single-choice keys into chosenTalents_slot storage");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents_slot_2") === "[120]",
        "TalentService should persist migrated slot talent selection in chosenTalents_slot storage");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalent_slot_2") === null,
        "TalentService should remove legacy chosenTalent_slot storage after migration");

    sandbox.TalentService.resetChosenTalentCache();
    sandbox.Record.getCurrentSlot = function () {
        return 1;
    };
    sandbox.Record.hasRecord = function (slot) {
        return Number(slot) === 1;
    };
    sandbox.cc.sys.localStorage.setItem("chosenTalents", "[121,122]");
    assert(JSON.stringify(sandbox.TalentService.getChosenTalentPurchaseIds()) === "[121,122]",
        "TalentService should migrate legacy global chosenTalents storage for single-record saves");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents_slot_1") === "[121,122]",
        "TalentService should rewrite migrated global talent selections into slot-scoped storage");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents") === null,
        "TalentService should remove legacy global chosenTalents storage after migration");

    sandbox.TalentService.chooseTalents([120, 121]);
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents_slot_1") === "[120,121]",
        "TalentService should keep chosenTalents_slot as the only live talent selection storage");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalent_slot_1") === null,
        "TalentService should stop writing legacy chosenTalent_slot mirror keys");

    return {
        name: "talent-selection-migration",
        ok: true,
        detail: "validated TalentService migrates legacy talent selection keys into chosenTalents_slot storage and stops writing mirror keys"
    };
}

function runPlayerPersistencePurchaseDelegationSmoke() {
    const sandbox = createVmSandbox();
    let purchaseReconcileCount = 0;
    let recordSaveCount = 0;
    let talentMigrationCount = 0;
    let talentHpReconcileCount = 0;

    sandbox.IAPPackage = {
        isBigBagUnlocked: function () {
            throw new Error("PlayerPersistenceService should prefer PurchaseService unlock reconciliation");
        },
        isBootUnlocked: function () {
            throw new Error("PlayerPersistenceService should prefer PurchaseService unlock reconciliation");
        },
        isDogHouseUnlocked: function () {
            throw new Error("PlayerPersistenceService should prefer PurchaseService unlock reconciliation");
        }
    };
    sandbox.TalentService = {
        migrateLegacyElitePistol: function () {
            talentMigrationCount++;
            return false;
        },
        reconcilePlayerHpByTalentSelection: function () {
            talentHpReconcileCount++;
        }
    };
    sandbox.PurchaseService = {
        reconcileUnlockRewardsForPlayer: function () {
            purchaseReconcileCount++;
            return true;
        }
    };
    sandbox.RoleRuntimeService = {
        ensureRoomBuildStates: function () { return false; },
        ensureInitialUnlocks: function () { return false; },
        ensureSpecialItems: function () {}
    };
    sandbox.Record = {
        saveAll: function () {
            recordSaveCount++;
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    sandbox.GameKernel.register("TalentService", sandbox.TalentService);
    sandbox.GameKernel.register("PurchaseService", sandbox.PurchaseService);
    sandbox.GameKernel.register("RoleRuntimeService", sandbox.RoleRuntimeService);
    loadIntoSandbox(sandbox, "assets/src/game/PlayerPersistenceService.js");

    sandbox.PlayerPersistenceService._applyPostRestoreFixups({
        storage: createCountStorage(),
        bag: createCountStorage(),
        room: {},
        map: {},
        roleType: 6
    });

    assert(purchaseReconcileCount === 1,
        "PlayerPersistenceService should delegate unlock reward reconciliation to PurchaseService when available");
    assert(talentMigrationCount === 1,
        "PlayerPersistenceService should delegate legacy elite pistol migration to TalentService");
    assert(talentHpReconcileCount === 1,
        "PlayerPersistenceService should delegate talent hp reconciliation to TalentService");
    assert(recordSaveCount === 1,
        "PlayerPersistenceService should persist post-restore mutations after PurchaseService reconciliation");

    return {
        name: "player-persistence-purchase-delegation",
        ok: true,
        detail: "validated PlayerPersistenceService delegates talent restore fixups to TalentService and unlock reward reconciliation to PurchaseService"
    };
}

module.exports = [
    runPurchaseUnlockRewardSmoke,
    runPurchaseRecordBoundarySmoke,
    runPurchaseExchangeConfigSmoke,
    runPurchaseUiStateProjectionSmoke,
    runTalentSelectionMigrationSmoke,
    runPlayerPersistencePurchaseDelegationSmoke
];
