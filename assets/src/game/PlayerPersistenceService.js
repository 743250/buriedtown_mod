/**
 * Centralizes player save/restore so player.js can focus on gameplay flow.
 * Migration and reconciliation live in PlayerMigrationService.
 */
var getPlayerPersistenceTalentService = function () {
    return GameKernel.get("TalentService");
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
        // Migration (support check, field normalization, purge) lives in
        // PlayerMigrationService. Returns migrated saveData or null (unsupported).
        saveData = PlayerMigrationService.migrate(saveData, playerInstance, runtimeRecord);

        if (saveData) {
            this._restoreExistingSave(playerInstance, saveData, attrHelper);
        } else {
            this._restoreNewGame(playerInstance);
        }

        this._restoreDeferredComponents(playerInstance, saveData);

        var hasMutation = PlayerMigrationService.reconcile(playerInstance);
        if (hasMutation && runtimeRecord && typeof runtimeRecord.saveAll === "function") {
            runtimeRecord.saveAll();
        }
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
    _restoreSelectionState: function (playerInstance, saveData) {
        // saveData.roleType and saveData.chosenTalentIds are already normalized
        // by PlayerMigrationService.migrateSelectionState. Apply them to the
        // player and sync the global role/talent singletons — these syncs must
        // happen before map.restore (which reads role.getChoosenRoleType()) and
        // before hp reconcile (which reads the talent cache).
        playerInstance.roleType = parseInt(saveData.roleType);
        if (typeof role !== "undefined" && role && typeof role.chooseRoleType === "function") {
            role.chooseRoleType(playerInstance.roleType);
        }

        var talentService = getPlayerPersistenceTalentService();
        if (Array.isArray(saveData.chosenTalentIds)
            && talentService
            && typeof talentService.chooseTalents === "function") {
            talentService.chooseTalents(saveData.chosenTalentIds);
        }
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

        // syncMapEntityIdFromMap moved to PlayerMigrationService.reconcile
        // (runs after all deferred components are restored).
    }
};

GameKernel.register("PlayerPersistenceService", PlayerPersistenceService);

if (typeof module !== "undefined" && module.exports) {
    module.exports = PlayerPersistenceService;
}
