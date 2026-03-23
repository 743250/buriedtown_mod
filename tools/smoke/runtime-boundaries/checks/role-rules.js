const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox
} = require("../../lib/fixtures/runtime-boundaries");

function runRoleRuntimeRuleSmoke() {
    const sandbox = createVmSandbox();
    sandbox.role = {
        getRoleConfig: function (roleType) {
            if (Number(roleType) === 99) {
                return { actionTags: ["alpha"] };
            }
            if (Number(roleType) === 98) {
                return { actionTags: ["beta"] };
            }
            if (Number(roleType) === 97) {
                return { actionTags: ["gamma"] };
            }
            if (Number(roleType) === 96) {
                return { actionTags: ["powered"] };
            }
            return { actionTags: [] };
        },
        getChoosenRoleType: function () {
            return 6;
        }
    };
    sandbox.RoleType = { STRANGER: 6 };
    sandbox.npcConfig = {};
    sandbox.IAPPackage = {
        isIAPUnlocked: function (purchaseId) { return Number(purchaseId) === 901; },
        isAlphaUnlocked: function () { return false; },
        isBetaUnlocked: function () { return true; }
    };
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");
    loadIntoSandbox(sandbox, "assets/src/game/RoleRuntimeService.js");

    const alphaOnlyAction = {
        id: 900001,
        runtimeRule: {
            includeAnyTags: ["alpha"]
        }
    };
    const alphaBlockedAction = {
        id: 900002,
        runtimeRule: {
            excludeAnyTags: ["alpha"]
        }
    };
    const betaGammaAction = {
        id: 900003,
        runtimeRule: {
            includeAnyTags: ["beta", "gamma"]
        }
    };
    const poweredOnlyAction = {
        id: 900004,
        runtimeRule: {
            includeAnyTags: ["powered"],
            requirePoweredWorksite: true
        }
    };
    const poweredHiddenAction = {
        id: 900005,
        runtimeRule: {
            hideWhenPoweredWorksiteForTags: ["powered"]
        }
    };
    const hideWhenOwnedAction = {
        id: 900006,
        runtimeRule: {
            hideWhenOwnedItems: [501]
        }
    };
    const requireOwnedAction = {
        id: 900007,
        runtimeRule: {
            requireOwnedItems: [501, 502]
        }
    };
    const purchaseLockedAction = {
        id: 999001,
        runtimeRule: {
            purchaseLock: {
                purchaseId: 902,
                checkFn: "isAlphaUnlocked"
            }
        }
    };

    assert(sandbox.RoleRuntimeService._getBuildActionRules(alphaOnlyAction).length === 1, "includeAnyTags action should keep a single configured rule");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(alphaBlockedAction).length === 1, "excludeAnyTags action should keep a single configured rule");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(poweredOnlyAction).length === 1, "powered action should keep a single configured rule");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(requireOwnedAction).length === 1, "owned-item action should keep a single configured rule");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(alphaOnlyAction, 99, {}) === true, "matching includeAnyTags should keep the action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(alphaOnlyAction, 6, {}) === false, "missing includeAnyTags should hide the action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(alphaBlockedAction, 99, {}) === false, "matching excludeAnyTags should hide the action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(alphaBlockedAction, 6, {}) === true, "non-matching excludeAnyTags should keep the action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(betaGammaAction, 98, {}) === true, "any matching includeAnyTags entry should keep the action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(betaGammaAction, 97, {}) === true, "includeAnyTags should accept any matching role tag");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(betaGammaAction, 6, {}) === false, "includeAnyTags should hide the action when no tags match");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredOnlyAction, 96, { isWorkSitePowered: true }) === true, "requirePoweredWorksite should keep matching powered actions visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredOnlyAction, 96, { isWorkSitePowered: false }) === false, "requirePoweredWorksite should hide the action when the worksite is offline");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredOnlyAction, 6, { isWorkSitePowered: true }) === false, "powered-only actions should stay hidden for roles without the tag");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredHiddenAction, 96, { isWorkSitePowered: true }) === false, "hideWhenPoweredWorksiteForTags should hide the action for matching powered roles");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredHiddenAction, 96, { isWorkSitePowered: false }) === true, "hideWhenPoweredWorksiteForTags should not hide the action while the worksite is offline");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredHiddenAction, 6, { isWorkSitePowered: true }) === true, "hideWhenPoweredWorksiteForTags should not affect roles without the tag");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(hideWhenOwnedAction, 6, {}) === true, "hideWhenOwnedItems should keep the action visible before the item is owned");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(hideWhenOwnedAction, 6, {
        inventoryState: {
            501: true
        }
    }) === false, "hideWhenOwnedItems should hide the action after the item is owned");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(requireOwnedAction, 6, {
        inventoryState: {
            501: true
        }
    }) === false, "requireOwnedItems should hide the action until all required items exist");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(requireOwnedAction, 6, {
        inventoryState: {
            501: true,
            502: true
        }
    }) === true, "requireOwnedItems should keep the action visible when every required item exists");
    assert(sandbox.PurchaseService.isPurchaseLockUnlocked(purchaseLockedAction.runtimeRule.purchaseLock) === false,
        "PurchaseService should interpret purchaseLock compatibility checks");
    assert(sandbox.PurchaseService.isPurchaseLockUnlocked({
        purchaseId: 901,
        checkFn: "isBetaUnlocked"
    }) === true, "PurchaseService should resolve legacy purchaseLock checkFn through purchase ids");
    assert(sandbox.RoleRuntimeService.getBuildActionLockState(purchaseLockedAction).isLocked === true,
        "RoleRuntimeService should lock actions when PurchaseService reports purchaseLock unmet");
    sandbox.PurchaseService.isPurchaseLockUnlocked = function (purchaseLock) {
        return purchaseLock && purchaseLock.checkFn === "isAlphaUnlocked";
    };
    sandbox.IAPPackage.isIAPUnlocked = function () {
        throw new Error("RoleRuntimeService should not read purchase state directly from IAPPackage");
    };
    assert(sandbox.RoleRuntimeService.getBuildActionLockState(purchaseLockedAction).isLocked === false,
        "RoleRuntimeService should delegate purchaseLock checks through PurchaseService when available");
    assert(sandbox.RoleRuntimeService._buildActionVisibilityGroups.length === 0, "RoleRuntimeService legacy visibility groups should now be empty");

    return {
        name: "role-runtime-rules",
        ok: true,
        detail: "validated runtime build-action rule evaluation for tag, power, owned-item and purchase-lock contracts without pinning live content ids"
    };
}

module.exports = [
    runRoleRuntimeRuleSmoke
];
