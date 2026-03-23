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

function runPurchaseUnlockRewardSmoke() {
    const sandbox = createVmSandbox();
    sandbox.IAPPackage = {
        isIAPUnlocked: function (purchaseId) {
            return purchaseId === 105 || purchaseId === 106 || purchaseId === 107;
        }
    };
    const runtimeRewardPlayer = createPurchaseRewardPlayer({ bag: { 1305024: 1 } });

    bootstrapRuntimeSandbox(sandbox, {
        player: runtimeRewardPlayer
    });
    sandbox.player = null;
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/plugin/purchaseList.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");

    assert(sandbox.PurchaseService._grantUnlockReward(105) === false,
        "PurchaseService should not duplicate unlock reward items already owned in bag");
    assert(runtimeRewardPlayer.storage.getNumByItemId(1305024) === 0,
        "PurchaseService should grant unlock rewards against GameRuntime player state");

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

    bootstrapRuntimeSandbox(sandbox);
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
    bootstrapRuntimeSandbox(sandbox);
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
    sandbox.ExchangeAchievementConfig = {
        1001: {
            type: "character",
            targetId: 8,
            name: "Bell"
        },
        2005: {
            type: "talent",
            targetId: 120
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
            if (purchaseId === 203) {
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
                isTalentPurchase: purchaseId === 120,
                isUnlocked: true,
                currentTalentLevel: purchaseId === 120 ? 2 : 0,
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
            if (purchaseId === 108) {
                return [1001];
            }
            if (purchaseId === 120) {
                return [2005];
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

    sandbox.PurchaseUiHelper.applyPayDialogState(120, {
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
    assert(sandbox.PurchaseUiHelper.isPurchaseUnlocked(120) === true,
        "PurchaseUiHelper unlock helper should read from PurchaseService shop state");
    assert(sandbox.PurchaseUiHelper.isExchangePurchase(120) === true
        && sandbox.PurchaseUiHelper.isTalentPurchase(120) === true,
        "PurchaseUiHelper should project exchange and talent flags through snapshot helpers");
    assert(sandbox.PurchaseUiHelper.shouldRequestRemotePayInfo(120) === false
        && sandbox.PurchaseUiHelper.shouldRequestRemotePayInfo(203) === true,
        "PurchaseUiHelper should expose whether a purchase still needs remote pay info");
    assert(JSON.stringify(sandbox.PurchaseUiHelper.getExchangeIdsByPurchaseId(108)) === "[1001]"
        && sandbox.PurchaseUiHelper.getExchangeIdByPurchaseId(108) === 1001
        && sandbox.PurchaseUiHelper.getRoleTypeByPurchaseId(108) === 8,
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
    sandbox.SafetyHelper = {
        isEmpty: function (value) {
            return value === undefined || value === null || value === "";
        },
        safeJSONParse: function (value) {
            return JSON.parse(value);
        }
    };
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
    loadIntoSandbox(sandbox, "assets/src/plugin/purchaseList.js");
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
    sandbox.Medal = {
        getTalentLevel: function (purchaseId) {
            purchaseId = Number(purchaseId);
            return (purchaseId === 120 || purchaseId === 121 || purchaseId === 122) ? 1 : 0;
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/data/talentConfigTable.js");
    loadIntoSandbox(sandbox, "assets/src/game/TalentService.js");

    sandbox.cc.sys.localStorage.setItem("chosenTalents_slot_2", "[120]");
    sandbox.cc.sys.localStorage.setItem("chosenTalent_slot_2", "121");
    sandbox.cc.sys.localStorage.setItem("chosenTalents", "[122]");

    assert(JSON.stringify(sandbox.TalentService.getChosenTalentPurchaseIds()) === "[120]",
        "TalentService should only restore current slot talent selections from chosenTalents_slot storage");
    sandbox.TalentService.chooseTalents([120, 121]);
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents_slot_2") === "[120,121]",
        "TalentService should write the normalized slot-scoped talent selection only to chosenTalents_slot");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalent_slot_2") === "121"
        && sandbox.cc.sys.localStorage.getItem("chosenTalents") === "[122]",
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

    loadIntoSandbox(sandbox, "assets/src/data/roleConfigTable.js");
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
        3001: {
            type: "item",
            targetId: 105,
            cost: exchangeCost
        }
    };
    sandbox.IAPPackage = {
        getExchangeIdsByPurchaseId: function (purchaseId) {
            return Number(purchaseId) === 105 ? [3001] : [];
        },
        getExchangeIdByPurchaseId: function (purchaseId) {
            return Number(purchaseId) === 105 ? 3001 : null;
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
                price: Number(purchaseId) === 203 ? 6 : 12,
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
    loadIntoSandbox(sandbox, "assets/src/plugin/purchaseList.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");

    const exchangeResult = capturePurchaseResult(sandbox, 105);
    assert(exchangeResult && exchangeResult.isSuccess === true
        && exchangeResult.isExchangePurchase === true
        && exchangeResult.unlockRewardGranted === true,
        "PurchaseService should return a structured success result for exchange purchases");
    assert(runtimePlayer.storage.getNumByItemId(1305024) === 1,
        "PurchaseService exchange purchases should still grant unlock rewards through the runtime player");

    achievementPoints = 0;
    const consumableResult = capturePurchaseResult(sandbox, 203);
    assert(consumableResult && consumableResult.isFailure === true
        && consumableResult.failedReason === sandbox.PurchaseService.FAIL_REASON.INSUFFICIENT_POINTS,
        "PurchaseService should return a structured insufficient-points failure for consumable purchases");

    achievementPoints = 100;
    const bypassResult = capturePurchaseResult(sandbox, 101);
    assert(bypassResult && bypassResult.isSuccess === true
        && bypassResult.isExchangePurchase === false
        && bypassResult.unlockRecorded === true
        && bypassResult.failedReason === null,
        "PurchaseService should return a structured unlock result for bypassed direct purchases");
    assert(JSON.stringify(paidPurchaseIds) === "[105]",
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
        reconcileUnlockRewardsForPlayer: function () {
            purchaseReconcileCount++;
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
            return !!(playerObj && JSON.stringify(purchaseIds) === "[105,106,107]");
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
    assert(roomEnsureCount === 1 && initialUnlockEnsureCount === 1 && specialItemsEnsureCount === 1,
        "PlayerPersistenceService should run role-derived reconciliation on the new-game path");
    assert(recordSaveCount === 1,
        "PlayerPersistenceService should persist fresh-run reconciliation mutations when unlock rewards are granted");
    assert(calls.indexOf("zipline.restore") !== -1 && calls.indexOf("navigation.sync") !== -1,
        "PlayerPersistenceService should keep deferred component restore on the new-game path");

    return {
        name: "player-persistence-new-game-unlock-reward",
        ok: true,
        detail: "validated fresh new games also reconcile purchased unlock rewards such as backpack and boots"
    };
}

function runPlayerPersistenceSupportedRestoreSmoke() {
    const sandbox = createVmSandbox();
    const calls = [];
    let chooseTalentsArgs = null;
    let chosenRoleType = null;
    let recordSaveCount = 0;
    let restoreAttrsKeys = null;

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
        reconcileUnlockRewardsForPlayer: function () {
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
                chosenTalentIds: [120],
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
    assert(JSON.stringify(chooseTalentsArgs) === "[120]",
        "PlayerPersistenceService should restore supported save talent selections through TalentService");
    assert(JSON.stringify(restoreAttrsKeys) === JSON.stringify(sandbox.PlayerPersistenceService.RESTORE_ATTR_KEYS),
        "PlayerPersistenceService should restore the supported attribute set through the attr helper");
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
