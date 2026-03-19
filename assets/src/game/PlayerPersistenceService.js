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
    _getSavedIdSet: function (sourceObj) {
        var idSet = {};
        if (!sourceObj || typeof sourceObj !== "object") {
            return idSet;
        }
        Object.keys(sourceObj).forEach(function (id) {
            var normalizedId = parseInt(id);
            if (!isNaN(normalizedId)) {
                idSet[normalizedId] = true;
            }
        });
        return idSet;
    },
    _getSavedRoomLevelMap: function (saveData) {
        var levelMap = {};
        var roomSave = saveData && saveData.room;
        if (!roomSave || typeof roomSave !== "object") {
            return levelMap;
        }
        Object.keys(roomSave).forEach(function (id) {
            var normalizedId = parseInt(id);
            var buildSave = roomSave[id];
            if (!isNaN(normalizedId) && buildSave && buildSave.level !== undefined) {
                levelMap[normalizedId] = Number(buildSave.level);
            }
        });
        return levelMap;
    },
    _getLegacyRoleInferenceCandidateList: function () {
        if (typeof role !== "undefined" && role && typeof role.getAllRoleTypes === "function") {
            return role.getAllRoleTypes();
        }
        if (typeof RoleConfigTable !== "undefined" && RoleConfigTable) {
            return Object.keys(RoleConfigTable).map(function (roleType) {
                return parseInt(roleType);
            }).filter(function (roleType) {
                return !isNaN(roleType);
            });
        }
        if (typeof RoleType !== "undefined" && RoleType) {
            return Object.keys(RoleType).map(function (key) {
                return parseInt(RoleType[key]);
            }).filter(function (roleType) {
                return !isNaN(roleType);
            });
        }
        return [];
    },
    _hasSavedChosenTalentIds: function (saveData) {
        return !!(saveData && Array.isArray(saveData.chosenTalentIds) && saveData.chosenTalentIds.length > 0);
    },
    _hasSavedZiplineLinks: function (saveData) {
        if (!saveData) {
            return false;
        }

        var ziplineSave = saveData.ziplineNetwork || saveData.ziplineManager;
        if (!ziplineSave || typeof ziplineSave !== "object") {
            return false;
        }

        if (Array.isArray(ziplineSave.links) && ziplineSave.links.length > 0) {
            return true;
        }

        if (ziplineSave.map && typeof ziplineSave.map === "object") {
            return Object.keys(ziplineSave.map).length > 0;
        }

        return false;
    },
    _inferRoleTypeFromSaveData: function (saveData) {
        if (!saveData
            || typeof RoleRuntimeService === "undefined"
            || !RoleRuntimeService
            || typeof RoleRuntimeService.getRoomBuildStates !== "function"
            || typeof RoleRuntimeService.getInitialUnlockSites !== "function"
            || typeof RoleRuntimeService.getInitialUnlockNpcs !== "function") {
            return null;
        }

        var roomLevelMap = this._getSavedRoomLevelMap(saveData);
        var siteIdSet = this._getSavedIdSet(saveData.map && saveData.map.siteMap);
        var hasSavedZiplineLinks = this._hasSavedZiplineLinks(saveData);
        var npcIdSet = {};
        var npcSave = saveData.map && saveData.map.npcMap;
        if (Array.isArray(npcSave)) {
            npcSave.forEach(function (id) {
                var normalizedId = parseInt(id);
                if (!isNaN(normalizedId)) {
                    npcIdSet[normalizedId] = true;
                }
            });
        }

        var defaultRoleType = (typeof RoleType !== "undefined" && RoleType && RoleType.STRANGER !== undefined)
            ? RoleType.STRANGER
            : 6;
        var defaultRoomBuildMap = {};
        RoleRuntimeService.getRoomBuildStates(defaultRoleType).forEach(function (buildState) {
            defaultRoomBuildMap[buildState.id] = Number(buildState.level);
        });

        var inferredRoleType = null;
        var inferredScore = 0;
        this._getLegacyRoleInferenceCandidateList().forEach(function (roleType) {
            var score = 0;
            RoleRuntimeService.getRoomBuildStates(roleType).forEach(function (buildState) {
                var defaultLevel = defaultRoomBuildMap.hasOwnProperty(buildState.id)
                    ? defaultRoomBuildMap[buildState.id]
                    : null;
                if (defaultLevel !== null && defaultLevel >= Number(buildState.level)) {
                    return;
                }
                if (roomLevelMap[buildState.id] !== undefined && roomLevelMap[buildState.id] >= Number(buildState.level)) {
                    score += 10;
                }
            });
            RoleRuntimeService.getInitialUnlockSites(roleType).forEach(function (siteId) {
                if (siteIdSet[siteId]) {
                    score += 3;
                }
            });
            RoleRuntimeService.getInitialUnlockNpcs(roleType).forEach(function (npcId) {
                if (npcIdSet[npcId]) {
                    score += 2;
                }
            });
            if (hasSavedZiplineLinks
                && typeof RoleRuntimeService.supportsZipline === "function"
                && RoleRuntimeService.supportsZipline(roleType)) {
                score += 12;
            }

            if (score > inferredScore) {
                inferredRoleType = roleType;
                inferredScore = score;
            } else if (score > 0 && score === inferredScore) {
                inferredRoleType = null;
            }
        });

        return inferredScore > 0 ? inferredRoleType : null;
    },
    _resolveRoleTypeFromSaveData: function (saveData, fallbackRoleType) {
        if (saveData && this._isValidRoleType(saveData.roleType)) {
            return parseInt(saveData.roleType);
        }
        var inferredRoleType = this._inferRoleTypeFromSaveData(saveData);
        if (this._isValidRoleType(inferredRoleType)) {
            return inferredRoleType;
        }
        return this._normalizeRoleType(fallbackRoleType);
    },
    _syncRoleSelectionState: function (playerInstance, saveData) {
        var fallbackRoleType = playerInstance && playerInstance.roleType !== undefined
            ? playerInstance.roleType
            : ((typeof RoleType !== "undefined" && RoleType && RoleType.STRANGER !== undefined) ? RoleType.STRANGER : 6);
        var resolvedRoleType = this._resolveRoleTypeFromSaveData(saveData, fallbackRoleType);
        playerInstance.roleType = resolvedRoleType;
        if (typeof role !== "undefined" && role && typeof role.chooseRoleType === "function") {
            role.chooseRoleType(resolvedRoleType);
        }

        var chosenTalentIds = this._hasSavedChosenTalentIds(saveData) ? saveData.chosenTalentIds : null;
        if (saveData
            && chosenTalentIds
            && typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.chooseTalents === "function") {
            TalentService.chooseTalents(chosenTalentIds);
            if (!this._isValidRoleType(saveData.roleType)
                || !this._hasSavedChosenTalentIds(saveData)) {
                playerInstance._selectionStateNeedsSave = true;
            }
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
            cured: playerInstance.cured,
            cureTime: playerInstance.cureTime,
            binded: playerInstance.binded,
            bindTime: playerInstance.bindTime,
            navigationState: playerInstance.navigationState.save(),
            deathCausedInfect: playerInstance.deathCausedInfect,
            setting: playerInstance.setting,
            isBombActive: playerInstance.isBombActive,
            roleType: playerInstance.roleType
        };

        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getChosenTalentPurchaseIds === "function") {
            saveData.chosenTalentIds = TalentService.getChosenTalentPurchaseIds();
        }

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
        this._syncRoleSelectionState(playerInstance, saveData);
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
        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.init === "function") {
            TalentService.init(playerInstance);
        }
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
        var hasPostRestoreMutation = !!(playerInstance && playerInstance._selectionStateNeedsSave);
        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.migrateLegacyElitePistol === "function") {
            var migratedLegacyElitePistol = TalentService.migrateLegacyElitePistol(playerInstance);
            if (migratedLegacyElitePistol) {
                hasPostRestoreMutation = true;
            }
        }

        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.reconcilePlayerHpByTalentSelection === "function") {
            TalentService.reconcilePlayerHpByTalentSelection(playerInstance);
        }

        if (typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.reconcileUnlockRewardsForPlayer === "function") {
            if (PurchaseService.reconcileUnlockRewardsForPlayer(playerInstance, [105, 106, 107])) {
                hasPostRestoreMutation = true;
            }
        }

        if (typeof RoleRuntimeService !== "undefined"
            && RoleRuntimeService
            && typeof RoleRuntimeService.ensureRoomBuildStates === "function"
            && RoleRuntimeService.ensureRoomBuildStates(playerInstance.room, playerInstance.roleType)) {
            hasPostRestoreMutation = true;
        }

        if (typeof RoleRuntimeService !== "undefined"
            && RoleRuntimeService
            && typeof RoleRuntimeService.ensureInitialUnlocks === "function"
            && RoleRuntimeService.ensureInitialUnlocks(playerInstance.map, playerInstance.roleType)) {
            hasPostRestoreMutation = true;
        }

        if (typeof RoleRuntimeService !== "undefined"
            && RoleRuntimeService
            && typeof RoleRuntimeService.ensureSpecialItems === "function") {
            RoleRuntimeService.ensureSpecialItems(playerInstance);
        }

        if (hasPostRestoreMutation
            && typeof Record !== "undefined"
            && Record
            && typeof Record.saveAll === "function") {
            Record.saveAll();
        }
        if (playerInstance) {
            delete playerInstance._selectionStateNeedsSave;
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = PlayerPersistenceService;
}
