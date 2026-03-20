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
                return { actionTags: ["jin"] };
            }
            if (Number(roleType) === 98) {
                return { actionTags: ["luo"] };
            }
            if (Number(roleType) === 97) {
                return { actionTags: ["stranger"] };
            }
            if (Number(roleType) === 96) {
                return { actionTags: ["king"] };
            }
            if (Number(roleType) === 95) {
                return { actionTags: ["jie"] };
            }
            if (Number(roleType) === 94) {
                return { actionTags: ["yazi"] };
            }
            if (Number(roleType) === 93) {
                return { actionTags: ["bier"] };
            }
            if (Number(roleType) === 92) {
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
        isIAPUnlocked: function (purchaseId) { return Number(purchaseId) === 105; },
        isBootUnlocked: function () { return false; },
        isBigBagUnlocked: function () { return true; }
    };
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/data/formulaConfig.js");
    loadIntoSandbox(sandbox, "assets/src/game/PurchaseService.js");
    loadIntoSandbox(sandbox, "assets/src/game/RoleRuntimeService.js");

    const jinOnlyAction = {
        id: 1203012,
        config: sandbox.formulaConfig["1203012"]
    };
    const nonJinAction = {
        id: 1203011,
        config: sandbox.formulaConfig["1203011"]
    };
    const luoBlockedAction = {
        id: 1205033,
        config: sandbox.formulaConfig["1205033"]
    };
    const strangerOnlyAction = {
        id: 1201071,
        config: sandbox.formulaConfig["1201071"]
    };
    const kingOnlyAction = {
        id: 1202053,
        config: sandbox.formulaConfig["1202053"]
    };
    const strangerKingAction = {
        id: 1205011,
        config: sandbox.formulaConfig["1205011"]
    };
    const jieOnlyAction = {
        id: 1201011,
        config: sandbox.formulaConfig["1201011"]
    };
    const yaziOnlyAction = {
        id: 1201022,
        config: sandbox.formulaConfig["1201022"]
    };
    const yaziKingAction = {
        id: 1401071,
        config: sandbox.formulaConfig["1401071"]
    };
    const yaziBlockedAction = {
        id: 1401011,
        config: sandbox.formulaConfig["1401011"]
    };
    const poweredOnlyAction = {
        id: 1203064,
        config: sandbox.formulaConfig["1203064"]
    };
    const poweredHiddenAction = {
        id: 1203063,
        config: sandbox.formulaConfig["1203063"]
    };
    const bierKingAction = {
        id: 1401052,
        config: sandbox.formulaConfig["1401052"]
    };
    const purchaseLockedAction = {
        id: 999001,
        runtimeRule: {
            purchaseLock: {
                purchaseId: 106,
                checkFn: "isBootUnlocked"
            }
        }
    };

    assert(sandbox.RoleRuntimeService._getBuildActionRules(jinOnlyAction).length === 1, "jin include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(nonJinAction).length === 1, "jin exclude rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(luoBlockedAction).length === 1, "luo exclude rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(strangerOnlyAction).length === 1, "stranger include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(kingOnlyAction).length === 1, "king/bier include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(strangerKingAction).length === 1, "stranger/bier/king include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(jieOnlyAction).length === 1, "jie include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(yaziOnlyAction).length === 1, "yazi include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(yaziKingAction).length === 1, "yazi/king include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(yaziBlockedAction).length === 1, "yazi/bier exclude rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(poweredOnlyAction).length === 1, "powered include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(poweredHiddenAction).length === 1, "powered hide rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService._getBuildActionRules(bierKingAction).length === 1, "bier/king include rule should now come from formulaConfig only");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(jinOnlyAction, 99, {}) === true, "jin-tagged role should see jin-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(jinOnlyAction, 6, {}) === false, "non-jin role should not see jin-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(nonJinAction, 99, {}) === false, "jin-tagged role should hide non-jin action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(nonJinAction, 6, {}) === true, "non-jin role should keep non-jin action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(luoBlockedAction, 98, {}) === false, "luo-tagged role should hide luo-blocked action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(luoBlockedAction, 6, {}) === true, "non-luo role should keep luo-blocked action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(strangerOnlyAction, 97, {}) === true, "stranger-tagged role should see stranger-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(strangerOnlyAction, 6, {}) === false, "non-stranger role should not see stranger-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(kingOnlyAction, 96, {}) === true, "king-tagged role should see king/bier action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(kingOnlyAction, 6, {}) === false, "non-king role should not see king/bier action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(strangerKingAction, 97, {}) === true, "stranger-tagged role should see stranger/bier/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(strangerKingAction, 6, {}) === false, "default role should not see stranger/bier/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(jieOnlyAction, 95, {}) === true, "jie-tagged role should see jie-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(jieOnlyAction, 6, {}) === false, "non-jie role should not see jie-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziOnlyAction, 94, {}) === true, "yazi-tagged role should see yazi-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziOnlyAction, 6, {}) === false, "default role should not see yazi-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziKingAction, 94, {}) === true, "yazi-tagged role should see yazi/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziKingAction, 96, {}) === true, "king-tagged role should see yazi/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziKingAction, 6, {}) === false, "default role should not see yazi/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziBlockedAction, 94, {}) === false, "yazi-tagged role should hide yazi/bier-blocked action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziBlockedAction, 93, {}) === false, "bier-tagged role should hide yazi/bier-blocked action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(yaziBlockedAction, 6, {}) === true, "default role should keep yazi/bier-blocked action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredOnlyAction, 92, { isWorkSitePowered: true }) === true, "powered-tagged role should see powered-only action when worksite is powered");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredOnlyAction, 92, { isWorkSitePowered: false }) === false, "powered-only action should stay hidden when worksite is not powered");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredOnlyAction, 6, { isWorkSitePowered: true }) === false, "default role should not see powered-only action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredHiddenAction, 92, { isWorkSitePowered: true }) === false, "powered-tagged role should hide powered-blocked action when worksite is powered");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredHiddenAction, 92, { isWorkSitePowered: false }) === true, "powered-blocked action should stay visible when worksite is not powered");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(poweredHiddenAction, 6, { isWorkSitePowered: true }) === true, "default role should keep powered-blocked action visible");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(bierKingAction, 93, {}) === true, "bier-tagged role should see bier/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(bierKingAction, 96, {}) === true, "king-tagged role should see bier/king action");
    assert(sandbox.RoleRuntimeService.isBuildActionVisible(bierKingAction, 6, {}) === false, "default role should not see bier/king action");
    assert(sandbox.PurchaseService.isPurchaseLockUnlocked(purchaseLockedAction.runtimeRule.purchaseLock) === false,
        "PurchaseService should interpret purchaseLock compatibility checks");
    assert(sandbox.PurchaseService.isPurchaseLockUnlocked({
        purchaseId: 105,
        checkFn: "isBigBagUnlocked"
    }) === true, "PurchaseService should resolve legacy purchaseLock checkFn through purchase ids");
    assert(sandbox.RoleRuntimeService.getBuildActionLockState(purchaseLockedAction).isLocked === true,
        "RoleRuntimeService should lock actions when PurchaseService reports purchaseLock unmet");
    sandbox.PurchaseService.isPurchaseLockUnlocked = function (purchaseLock) {
        return purchaseLock && purchaseLock.checkFn === "isBootUnlocked";
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
        detail: "validated config-driven jin, luo, stranger, jie, yazi, bier, king, powered and purchase-lock build action rules"
    };
}

module.exports = [
    runRoleRuntimeRuleSmoke
];
