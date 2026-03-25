/**
 * Centralizes player save/restore so player.js can focus on gameplay flow.
 */
var getPlayerPersistenceRoleRuntimeService = function () {
    return GameKernel.require("RoleRuntimeService", "PlayerPersistenceService");
};
var getPlayerPersistenceTalentService = function () {
    return GameKernel.get("TalentService");
};
var getPlayerPersistencePurchaseService = function () {
    return GameKernel.get("PurchaseService");
};
var getPlayerPersistenceRecord = function () {
    return GameRuntime.requireRecord();
};

var PlayerPersistenceService = {
    SAVE_SCHEMA_VERSION: 3,
    MIN_SUPPORTED_SCHEMA_VERSION: 2,
    ATTR_KEYS: ["hp", "spirit", "starve", "vigour", "injury", "infect", "temperature"],
    RESTORE_ATTR_KEYS: ["hp", "hpMaxOrigin", "hpMax", "spirit", "starve", "vigour", "injury", "infect", "temperature"],
    SAVE_COMPONENTS: [
        {key: "bag", context: "Player.save.bag"},
        {key: "storage", context: "Player.save.storage"},
        {key: "dog", context: "Player.save.dog"},
        {key: "room", context: "Player.save.room"},
        {key: "equip", context: "Player.save.equip"},
        {key: "map", context: "Player.save.map"},
        {key: "ziplineNetwork", context: "Player.save.ziplineNetwork"},
        {key: "npcManager", context: "Player.save.npcManager"},
        {key: "weather", context: "Player.save.weather"},
        {key: "buffManager", context: "Player.save.buffManager"}
    ],
    EARLY_RESTORE_COMPONENTS: [
        {key: "bag", context: "Player.restore.bag"},
        {key: "storage", context: "Player.restore.storage"},
        {key: "dog", context: "Player.restore.dog"},
        {key: "equip", context: "Player.restore.equip"},
        {key: "weather", context: "Player.restore.weather"},
        {key: "buffManager", context: "Player.restore.buffManager"}
    ],
    LATE_RESTORE_COMPONENTS: [
        {key: "room", context: "Player.restore.room"},
        {key: "npcManager", context: "Player.restore.npcManager"},
        {key: "map", context: "Player.restore.map"}
    ],
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
    },
    _isSupportedSaveData: function (saveData) {
        var schemaVersion = this._getSaveSchemaVersion(saveData);
        return !!(saveData
            && schemaVersion >= this.MIN_SUPPORTED_SCHEMA_VERSION
            && schemaVersion <= this.SAVE_SCHEMA_VERSION
            && saveData.navigationState
            && typeof saveData.navigationState === "object");
    },
    _restoreSelectionState: function (playerInstance, saveData) {
        var restoredRoleType = saveData && this._isValidRoleType(saveData.roleType)
            ? parseInt(saveData.roleType)
            : this._normalizeRoleType(this._getFallbackRoleType(playerInstance));
        playerInstance.roleType = restoredRoleType;
        if (typeof role !== "undefined" && role && typeof role.chooseRoleType === "function") {
            role.chooseRoleType(restoredRoleType);
        }

        var talentService = getPlayerPersistenceTalentService();
        if (saveData
            && Array.isArray(saveData.chosenTalentIds)
            && talentService
            && typeof talentService.chooseTalents === "function") {
            talentService.chooseTalents(saveData.chosenTalentIds);
        }
    },
    _clearUnsupportedSaveState: function (playerInstance, runtimeRecord) {
        if (runtimeRecord && typeof runtimeRecord.deleteRecord === "function") {
            runtimeRecord.deleteRecord();
        } else if (runtimeRecord) {
            runtimeRecord.recordObj = {};
        }
        if (runtimeRecord && typeof runtimeRecord.clearCurrentSlotCompatibilityState === "function") {
            runtimeRecord.clearCurrentSlotCompatibilityState();
        }

        var talentService = getPlayerPersistenceTalentService();
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
    buildSaveData: function (playerInstance, attrHelper) {
        var attrData = attrHelper.saveAttrs(playerInstance, this.ATTR_KEYS);
        var saveData = {
            hp: attrData.hp,
            hpMaxOrigin: attrHelper.get(playerInstance, "hpMaxOrigin"),
            hpMax: attrData.hpMax,
            spirit: attrData.spirit,
            starve: attrData.starve,
            vigour: attrData.vigour,
            injury: attrData.injury,
            infect: attrData.infect,
            temperature: attrData.temperature,
            navigationState: playerInstance.navigationState.save(),
            deathCausedInfect: playerInstance.deathCausedInfect,
            setting: playerInstance.setting,
            isBombActive: playerInstance.isBombActive,
            roleType: playerInstance.roleType,
            schemaVersion: this.SAVE_SCHEMA_VERSION
        };

        var talentService = getPlayerPersistenceTalentService();
        if (talentService
            && typeof talentService.getChosenTalentPurchaseIds === "function") {
            saveData.chosenTalentIds = talentService.getChosenTalentPurchaseIds();
        }

        this.SAVE_COMPONENTS.forEach(function (component) {
            saveData[component.key] = PlayerPersistenceService._safeSaveComponent(playerInstance, component);
        });

        return saveData;
    },
    restore: function (playerInstance, attrHelper) {
        var runtimeRecord = getPlayerPersistenceRecord();
        var saveData = runtimeRecord && typeof runtimeRecord.restore === "function"
            ? runtimeRecord.restore("player")
            : null;
        if (saveData && !this._isSupportedSaveData(saveData)) {
            this._clearUnsupportedSaveState(playerInstance, runtimeRecord);
            saveData = null;
        }

        if (saveData) {
            this._restoreExistingSave(playerInstance, saveData, attrHelper);
        } else {
            this._restoreNewGame(playerInstance);
        }

        this._restoreDeferredComponents(playerInstance, saveData);
        var hasRestoreMutation = this._applyRestoreReconciliations(playerInstance);
        this._persistPostRestoreChanges(hasRestoreMutation);
    },
    _safeSaveComponent: function (playerInstance, component) {
        return ErrorHandler.safeExecute(function () {
            return playerInstance[component.key].save();
        }, component.context, {});
    },
    _safeRestoreComponent: function (playerInstance, component, saveData) {
        ErrorHandler.safeExecute(function () {
            playerInstance[component.key].restore(saveData ? saveData[component.key] : null);
        }, component.context);
    },
    _restoreExistingSave: function (playerInstance, saveData, attrHelper) {
        this._restoreSelectionState(playerInstance, saveData);
        attrHelper.restoreAttrs(playerInstance, saveData, this.RESTORE_ATTR_KEYS);
        playerInstance.navigationState.restore(saveData.navigationState);
        playerInstance.deathCausedInfect = !!saveData.deathCausedInfect;
        playerInstance.setting = saveData.setting || {};
        playerInstance.isBombActive = !!saveData.isBombActive;

        this.EARLY_RESTORE_COMPONENTS.forEach(function (component) {
            PlayerPersistenceService._safeRestoreComponent(playerInstance, component, saveData);
        });
    },
    _restoreNewGame: function (playerInstance) {
        var runtimeRecord = getPlayerPersistenceRecord();
        var talentService = getPlayerPersistenceTalentService();
        if (talentService
            && typeof talentService.init === "function") {
            talentService.init(playerInstance);
        }
        Medal.improve(playerInstance);
        if (runtimeRecord
            && typeof runtimeRecord.getShareFlag === "function"
            && typeof runtimeRecord.setShareFlag === "function"
            && runtimeRecord.getShareFlag() === ShareType.SHARED_CAN_REWARD) {
            runtimeRecord.setShareFlag(ShareType.SHARED_AND_REWARD);
            playerInstance.storage.increaseItem(1106054, 1);
        }
    },
    _restoreDeferredComponents: function (playerInstance, saveData) {
        this.LATE_RESTORE_COMPONENTS.forEach(function (component) {
            PlayerPersistenceService._safeRestoreComponent(playerInstance, component, saveData);
        });

        ErrorHandler.safeExecute(function () {
            playerInstance.ziplineNetwork.restore(saveData ? saveData.ziplineNetwork : null, playerInstance.map);
        }, "Player.restore.ziplineNetwork");

        playerInstance.navigationState.syncMapEntityIdFromMap(playerInstance.map);
    },
    _applyRestoreReconciliations: function (playerInstance) {
        var hasRestoreMutation = false;
        var talentService = getPlayerPersistenceTalentService();
        if (talentService
            && typeof talentService.reconcilePlayerHpByTalentSelection === "function"
            && talentService.reconcilePlayerHpByTalentSelection(playerInstance)) {
            hasRestoreMutation = true;
        }

        var purchaseService = getPlayerPersistencePurchaseService();
        if (purchaseService
            && typeof purchaseService.reconcileUnlockRewardsForPlayer === "function"
            && purchaseService.reconcileUnlockRewardsForPlayer(playerInstance)) {
            hasRestoreMutation = true;
        }

        var roleRuntimeService = getPlayerPersistenceRoleRuntimeService();
        if (typeof roleRuntimeService.ensureRoomBuildStates === "function"
            && roleRuntimeService.ensureRoomBuildStates(playerInstance.room, playerInstance.roleType)) {
            hasRestoreMutation = true;
        }

        if (typeof roleRuntimeService.ensureInitialUnlocks === "function"
            && roleRuntimeService.ensureInitialUnlocks(playerInstance.map, playerInstance.roleType)) {
            hasRestoreMutation = true;
        }

        if (typeof roleRuntimeService.ensureSpecialItems === "function"
            && roleRuntimeService.ensureSpecialItems(playerInstance)) {
            hasRestoreMutation = true;
        }

        return hasRestoreMutation;
    },
    _persistPostRestoreChanges: function (shouldSave) {
        var runtimeRecord = getPlayerPersistenceRecord();
        if (shouldSave
            && runtimeRecord
            && typeof runtimeRecord.saveAll === "function") {
            runtimeRecord.saveAll();
        }
    }
};

GameKernel.register("PlayerPersistenceService", PlayerPersistenceService);

if (typeof module !== "undefined" && module.exports) {
    module.exports = PlayerPersistenceService;
}
