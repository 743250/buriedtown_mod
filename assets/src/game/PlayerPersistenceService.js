/**
 * Centralizes player save/restore so player.js can focus on gameplay flow.
 */
var PlayerPersistenceService = {
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
            cured: playerInstance.cured,
            cureTime: playerInstance.cureTime,
            binded: playerInstance.binded,
            bindTime: playerInstance.bindTime,
            navigationState: playerInstance.navigationState.save(),
            deathCausedInfect: playerInstance.deathCausedInfect,
            setting: playerInstance.setting,
            isBombActive: playerInstance.isBombActive
        };

        this.SAVE_COMPONENTS.forEach(function (component) {
            saveData[component.key] = PlayerPersistenceService._safeSaveComponent(playerInstance, component);
        });

        return saveData;
    },
    restore: function (playerInstance, attrHelper) {
        var saveData = Record.restore("player");
        if (saveData) {
            this._restoreExistingSave(playerInstance, saveData, attrHelper);
        } else {
            this._restoreNewGame(playerInstance);
        }

        this._restoreDeferredComponents(playerInstance, saveData);
        this._applyPostRestoreFixups(playerInstance);
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
        attrHelper.restoreAttrs(playerInstance, saveData, this.RESTORE_ATTR_KEYS);
        playerInstance.cured = !!saveData.cured;
        playerInstance.cureTime = saveData.cureTime;
        playerInstance.binded = !!saveData.binded;
        playerInstance.bindTime = saveData.bindTime;
        playerInstance.navigationState.restore(saveData.navigationState || saveData);
        playerInstance.deathCausedInfect = !!saveData.deathCausedInfect;
        playerInstance.setting = saveData.setting || {};
        playerInstance.isBombActive = !!saveData.isBombActive;

        this.EARLY_RESTORE_COMPONENTS.forEach(function (component) {
            PlayerPersistenceService._safeRestoreComponent(playerInstance, component, saveData);
        });
    },
    _restoreNewGame: function (playerInstance) {
        IAPPackage.init(playerInstance);
        Medal.improve(playerInstance);
        if (Record.getShareFlag() === ShareType.SHARED_CAN_REWARD) {
            Record.setShareFlag(ShareType.SHARED_AND_REWARD);
            playerInstance.storage.increaseItem(1106054, 1);
        }
    },
    _restoreDeferredComponents: function (playerInstance, saveData) {
        this.LATE_RESTORE_COMPONENTS.forEach(function (component) {
            PlayerPersistenceService._safeRestoreComponent(playerInstance, component, saveData);
        });

        ErrorHandler.safeExecute(function () {
            var ziplineSaveObj = saveData ? (saveData.ziplineNetwork || saveData.ziplineManager) : null;
            playerInstance.ziplineNetwork.restore(ziplineSaveObj, playerInstance.map);
        }, "Player.restore.ziplineNetwork");

        playerInstance.navigationState.syncMapEntityIdFromMap(playerInstance.map);
    },
    _applyPostRestoreFixups: function (playerInstance) {
        if (typeof IAPPackage !== "undefined"
            && IAPPackage
            && typeof IAPPackage.migrateLegacyElitePistol === "function") {
            var migratedLegacyElitePistol = IAPPackage.migrateLegacyElitePistol(playerInstance);
            if (migratedLegacyElitePistol && typeof Record !== "undefined" && Record && typeof Record.saveAll === "function") {
                Record.saveAll();
            }
        }

        if (typeof IAPPackage !== "undefined"
            && IAPPackage
            && typeof IAPPackage.reconcilePlayerHpByTalentSelection === "function") {
            IAPPackage.reconcilePlayerHpByTalentSelection(playerInstance);
        }

        if (IAPPackage.isBigBagUnlocked() && !playerInstance.storage.validateItem(1305024, 1)) {
            playerInstance.storage.increaseItem(1305024, 1);
        }

        if (IAPPackage.isBootUnlocked() && !playerInstance.storage.validateItem(1304024, 1)) {
            playerInstance.storage.increaseItem(1304024, 1);
        }

        if (IAPPackage.isDogHouseUnlocked() && !playerInstance.room.isBuildExist(12, 0)) {
            playerInstance.room.createBuild(12, -1);
        }

        if (typeof RoleRuntimeService !== "undefined"
            && RoleRuntimeService
            && typeof RoleRuntimeService.ensureSpecialItems === "function") {
            RoleRuntimeService.ensureSpecialItems(playerInstance);
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = PlayerPersistenceService;
}
