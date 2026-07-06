/**
 * Separates save migration and post-restore reconciliation from
 * PlayerPersistenceService.restore. restore() only does pure field
 * assignment; all version compat, field normalization, and post-restore
 * cross-module reconciliation live here.
 *
 * Flow:
 *   game.bootstrapRun
 *     -> player.restore() -> PlayerPersistenceService.restore
 *          -> PlayerMigrationService.migrate (here, before field restore)
 *          -> field restore (existing save or new game)
 *          -> deferred components (room/npcManager/map/zipline)
 *     -> PlayerMigrationService.reconcile (here, after restore completes)
 *     -> saveAll if reconcile produced mutations
 */
var getPlayerMigrationRoleRuntimeService = function () {
    return GameKernel.require("RoleRuntimeService", "PlayerMigrationService");
};
var getPlayerMigrationTalentService = function () {
    return GameKernel.get("TalentService");
};
var getPlayerMigrationPurchaseService = function () {
    return GameKernel.get("PurchaseService");
};
var getPlayerMigrationRecord = function () {
    return GameRuntime.requireRecord();
};

var PlayerMigrationService = {
    SAVE_SCHEMA_VERSION: 3,
    MIN_SUPPORTED_SCHEMA_VERSION: 2,

    /**
     * Entry: judge support, migrate data, or purge unsupported slot.
     * Returns migrated saveData (truthy) or null (caller falls back to new game).
     */
    migrate: function (saveData, playerInstance, runtimeRecord) {
        if (!saveData) {
            return null;
        }
        if (!this.isSaveDataSupported(saveData)) {
            this.purgeUnsupportedSlot(playerInstance, runtimeRecord);
            return null;
        }
        saveData = this.migrateSelectionState(saveData, playerInstance);
        saveData = this.migrateNavigationState(saveData);
        return saveData;
    },

    isSaveDataSupported: function (saveData) {
        var schemaVersion = this._getSaveSchemaVersion(saveData);
        return !!(saveData
            && schemaVersion >= this.MIN_SUPPORTED_SCHEMA_VERSION
            && schemaVersion <= this.SAVE_SCHEMA_VERSION
            && saveData.navigationState
            && typeof saveData.navigationState === "object");
    },

    purgeUnsupportedSlot: function (playerInstance, runtimeRecord) {
        if (runtimeRecord && typeof runtimeRecord.deleteRecord === "function") {
            runtimeRecord.deleteRecord();
        } else if (runtimeRecord) {
            runtimeRecord.recordObj = {};
        }
        if (runtimeRecord && typeof runtimeRecord.clearCurrentSlotCompatibilityState === "function") {
            runtimeRecord.clearCurrentSlotCompatibilityState();
        }

        var talentService = getPlayerMigrationTalentService();
        if (talentService
            && typeof talentService.resetChosenTalentCache === "function") {
            talentService.resetChosenTalentCache();
        }

        var nextRoleType = this._normalizeRoleType(this._getFallbackRoleType(playerInstance));
        playerInstance.roleType = nextRoleType;
        if (typeof role !== "undefined" && role && typeof role.chooseRoleType === "function") {
            role.chooseRoleType(nextRoleType);
        }
    },

    migrateSelectionState: function (saveData, playerInstance) {
        saveData = saveData || {};
        var restoredRoleType = this._isValidRoleType(saveData.roleType)
            ? parseInt(saveData.roleType)
            : this._normalizeRoleType(this._getFallbackRoleType(playerInstance));
        saveData.roleType = restoredRoleType;
        if (!Array.isArray(saveData.chosenTalentIds)) {
            saveData.chosenTalentIds = [];
        }
        return saveData;
    },

    migrateNavigationState: function (saveData) {
        // PlayerNavigationState.restore already normalizes entityKey + needsMapSync.
        // This hook is reserved for future cross-version navigation migrations.
        return saveData;
    },

    /**
     * Post-restore reconciliation: cross-module consistency fixes that must run
     * after the player is fully restored (including deferred components) but
     * before game.start. Called from game.bootstrapRun after player.restore().
     * Returns whether mutations occurred (caller may saveAll).
     */
    reconcile: function (playerInstance) {
        var hasMutation = false;
        if (this._reconcileHpByTalent(playerInstance)) hasMutation = true;
        if (this._reconcileUnlockRewards(playerInstance)) hasMutation = true;
        if (this._ensureRoomBuildStates(playerInstance)) hasMutation = true;
        if (this._ensureInitialUnlocks(playerInstance)) hasMutation = true;
        if (this._ensureSpecialItems(playerInstance)) hasMutation = true;
        // S6: sync map entity id after late components (map) are restored.
        if (playerInstance && playerInstance.navigationState
            && typeof playerInstance.navigationState.syncMapEntityIdFromMap === "function"
            && playerInstance.map) {
            playerInstance.navigationState.syncMapEntityIdFromMap(playerInstance.map);
        }
        return hasMutation;
    },

    _reconcileHpByTalent: function (playerInstance) {
        var talentService = getPlayerMigrationTalentService();
        return !!(talentService
            && typeof talentService.reconcilePlayerHpByTalentSelection === "function"
            && talentService.reconcilePlayerHpByTalentSelection(playerInstance));
    },

    _reconcileUnlockRewards: function (playerInstance) {
        var purchaseService = getPlayerMigrationPurchaseService();
        return !!(purchaseService
            && typeof purchaseService.reconcileUnlockRewardsForPlayer === "function"
            && purchaseService.reconcileUnlockRewardsForPlayer(playerInstance));
    },

    _ensureRoomBuildStates: function (playerInstance) {
        var roleRuntimeService = getPlayerMigrationRoleRuntimeService();
        return !!(typeof roleRuntimeService.ensureRoomBuildStates === "function"
            && roleRuntimeService.ensureRoomBuildStates(playerInstance.room, playerInstance.roleType));
    },

    _ensureInitialUnlocks: function (playerInstance) {
        var roleRuntimeService = getPlayerMigrationRoleRuntimeService();
        return !!(typeof roleRuntimeService.ensureInitialUnlocks === "function"
            && roleRuntimeService.ensureInitialUnlocks(playerInstance.map, playerInstance.roleType));
    },

    _ensureSpecialItems: function (playerInstance) {
        var roleRuntimeService = getPlayerMigrationRoleRuntimeService();
        return !!(typeof roleRuntimeService.ensureSpecialItems === "function"
            && roleRuntimeService.ensureSpecialItems(playerInstance));
    },

    _isValidRoleType: function (roleType) {
        roleType = parseInt(roleType);
        return !(isNaN(roleType)
            || typeof role === "undefined"
            || !role
            || typeof role.getRoleConfig !== "function"
            || !role.getRoleConfig(roleType));
    },

    _normalizeRoleType: function (roleType, fallbackRoleType) {
        fallbackRoleType = fallbackRoleType === undefined ? 6 : fallbackRoleType;
        roleType = parseInt(roleType);
        return this._isValidRoleType(roleType) ? roleType : fallbackRoleType;
    },

    _getFallbackRoleType: function (playerInstance) {
        if (playerInstance && this._isValidRoleType(playerInstance.roleType)) {
            return parseInt(playerInstance.roleType);
        }
        if (typeof Record !== "undefined"
            && Record
            && typeof Record.getSelectedRoleType === "function") {
            var selectedRoleType = Record.getSelectedRoleType();
            if (this._isValidRoleType(selectedRoleType)) {
                return parseInt(selectedRoleType);
            }
        }
        if (typeof RoleType !== "undefined" && RoleType && RoleType.STRANGER !== undefined) {
            return RoleType.STRANGER;
        }
        return 6;
    },

    _getSaveSchemaVersion: function (saveData) {
        var schemaVersion = saveData && saveData.schemaVersion !== undefined
            ? Number(saveData.schemaVersion)
            : 0;
        if (!isFinite(schemaVersion) || schemaVersion < 0) {
            return 0;
        }
        return parseInt(schemaVersion);
    }
};

GameKernel.register("PlayerMigrationService", PlayerMigrationService);

if (typeof module !== "undefined" && module.exports) {
    module.exports = PlayerMigrationService;
}
