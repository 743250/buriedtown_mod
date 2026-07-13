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


function runPlayerPersistenceContractSmoke() {
    const sandbox = createVmSandbox();
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/PlayerMigrationService.js");
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
    loadIntoSandbox(sandbox, "assets/src/game/PlayerMigrationService.js");
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
    loadIntoSandbox(sandbox, "assets/src/game/PlayerMigrationService.js");
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
    loadIntoSandbox(sandbox, "assets/src/game/PlayerMigrationService.js");
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
    runPlayerPersistenceContractSmoke,
    runPlayerPersistenceUnsupportedSaveSmoke,
    runPlayerPersistenceNewGameUnlockRewardSmoke,
    runPlayerPersistenceSupportedRestoreSmoke
];
