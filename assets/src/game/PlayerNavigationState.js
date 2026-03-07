/**
 * Centralized navigation state for the player.
 * It separates current map anchor from active site scene state so map travel
 * and scene transitions do not need to duplicate booleans in multiple places.
 */
var PlayerNavigationStateType = {
    HOME: "home",
    MAP: "map",
    SITE: "site"
};

var PlayerNavigationState = cc.Class.extend({
    ctor: function () {
        this.reset();
    },
    reset: function () {
        this.locationType = PlayerNavigationStateType.HOME;
        this.mapEntityId = HOME_SITE;
        this.mapEntityKey = this._buildEntityKey("site", HOME_SITE);
        this.activeSiteId = 0;
        this.needsMapSync = false;
    },
    _normalizeId: function (value, fallbackValue) {
        var normalizedValue = parseInt(value);
        if (isNaN(normalizedValue)) {
            return fallbackValue || 0;
        }
        return normalizedValue;
    },
    save: function () {
        return {
            locationType: this.locationType,
            mapEntityId: this.mapEntityId,
            mapEntityKey: this.mapEntityKey,
            activeSiteId: this.activeSiteId
        };
    },
    restore: function (saveObj) {
        if (saveObj && saveObj.locationType) {
            this.locationType = saveObj.locationType;
            this.mapEntityId = this._normalizeId(saveObj.mapEntityId, HOME_SITE);
            this.mapEntityKey = this._normalizeEntityKey(
                saveObj.mapEntityKey,
                this._buildEntityKey("site", this.mapEntityId)
            );
            this.activeSiteId = this._normalizeId(saveObj.activeSiteId, 0);
            this.needsMapSync = !saveObj.mapEntityKey && this.locationType === PlayerNavigationStateType.MAP;
            return;
        }
        this.restoreLegacy(saveObj);
    },
    restoreLegacy: function (saveObj) {
        this.reset();
        if (!saveObj) {
            return;
        }

        var legacyActiveSiteId = this._normalizeId(saveObj.nowSiteId, 0);
        if (saveObj.isAtHome) {
            this.goHome();
            return;
        }
        if (saveObj.isAtSite && legacyActiveSiteId > 0) {
            this.enterSite(legacyActiveSiteId);
            return;
        }

        this.locationType = PlayerNavigationStateType.MAP;
        this.activeSiteId = 0;
        this.mapEntityId = legacyActiveSiteId;
        this.mapEntityKey = this._buildEntityKey("site", this.mapEntityId || HOME_SITE);
        this.needsMapSync = true;
    },
    _buildEntityKey: function (entityType, entityId) {
        var normalizedEntityId = this._normalizeId(entityId, 0);
        if (!entityType || normalizedEntityId <= 0) {
            return "";
        }
        return entityType + ":" + normalizedEntityId;
    },
    _normalizeEntityKey: function (entityKey, fallbackValue) {
        if (typeof entityKey !== "string") {
            return fallbackValue || "";
        }

        var keyParts = entityKey.split(":");
        if (keyParts.length !== 2) {
            return fallbackValue || "";
        }

        var entityType = keyParts[0];
        if (entityType !== "site" && entityType !== "npc") {
            return fallbackValue || "";
        }

        var entityId = this._normalizeId(keyParts[1], 0);
        if (entityId <= 0) {
            return fallbackValue || "";
        }

        return this._buildEntityKey(entityType, entityId);
    },
    _extractEntityIdFromKey: function (entityKey, fallbackValue) {
        var normalizedEntityKey = this._normalizeEntityKey(entityKey, "");
        if (!normalizedEntityKey) {
            return fallbackValue || 0;
        }
        return this._normalizeId(normalizedEntityKey.split(":")[1], fallbackValue || 0);
    },
    _detectEntityType: function (baseSite) {
        if (!baseSite) {
            return "";
        }
        if (baseSite instanceof NPC) {
            return "npc";
        }
        if (baseSite instanceof Site) {
            return "site";
        }
        return "";
    },
    _findNearestMapEntityState: function (map) {
        if (!map || !map.pos || typeof map.forEach !== "function") {
            return null;
        }

        var nearestEntity = null;
        var nearestDistanceSq = Number.MAX_VALUE;
        map.forEach(function (baseSite) {
            if (!baseSite || !baseSite.pos) {
                return;
            }
            var distanceSq = cc.pDistanceSQ(map.pos, baseSite.pos);
            if (distanceSq < nearestDistanceSq) {
                nearestDistanceSq = distanceSq;
                nearestEntity = baseSite;
            }
        });
        if (!nearestEntity) {
            return null;
        }

        var nearestEntityId = this._normalizeId(nearestEntity.id, 0);
        return {
            id: nearestEntityId,
            key: this._buildEntityKey(this._detectEntityType(nearestEntity), nearestEntityId)
        };
    },
    syncMapEntityIdFromMap: function (map) {
        if (!this.needsMapSync) {
            return;
        }
        var nearestEntityState = this._findNearestMapEntityState(map);
        this.mapEntityId = nearestEntityState ? nearestEntityState.id : HOME_SITE;
        this.mapEntityKey = nearestEntityState
            ? nearestEntityState.key
            : this._buildEntityKey("site", HOME_SITE);
        this.needsMapSync = false;
    },
    arriveAtMapEntity: function (entityRef) {
        var entityId = this.mapEntityId || HOME_SITE;
        var entityKey = this.mapEntityKey || this._buildEntityKey("site", entityId);
        if (entityRef && typeof entityRef === "object") {
            entityId = this._normalizeId(entityRef.id, entityId);
            entityKey = this._buildEntityKey(this._detectEntityType(entityRef), entityId) || entityKey;
        } else if (typeof entityRef === "string") {
            entityKey = this._normalizeEntityKey(entityRef, entityKey);
            entityId = this._extractEntityIdFromKey(entityKey, entityId);
        } else {
            entityId = this._normalizeId(entityRef, entityId);
            entityKey = this._buildEntityKey("site", entityId);
        }

        this.mapEntityId = entityId;
        this.mapEntityKey = entityKey;
        this.activeSiteId = 0;
        this.locationType = this.mapEntityId === HOME_SITE
            ? PlayerNavigationStateType.HOME
            : PlayerNavigationStateType.MAP;
        this.needsMapSync = false;
    },
    goHome: function () {
        this.locationType = PlayerNavigationStateType.HOME;
        this.mapEntityId = HOME_SITE;
        this.mapEntityKey = this._buildEntityKey("site", HOME_SITE);
        this.activeSiteId = 0;
        this.needsMapSync = false;
    },
    enterWorldMap: function () {
        if (!this.mapEntityId) {
            this.mapEntityId = HOME_SITE;
        }
        if (!this.mapEntityKey) {
            this.mapEntityKey = this._buildEntityKey("site", this.mapEntityId);
        }
        this.locationType = PlayerNavigationStateType.MAP;
        this.activeSiteId = 0;
        this.needsMapSync = false;
    },
    enterSite: function (siteId) {
        var normalizedSiteId = this._normalizeId(siteId, HOME_SITE);
        this.locationType = PlayerNavigationStateType.SITE;
        this.mapEntityId = normalizedSiteId;
        this.mapEntityKey = this._buildEntityKey("site", normalizedSiteId);
        this.activeSiteId = normalizedSiteId;
        this.needsMapSync = false;
    },
    leaveSite: function () {
        if (this.activeSiteId > 0) {
            this.mapEntityId = this.activeSiteId;
            this.mapEntityKey = this._buildEntityKey("site", this.activeSiteId);
        }
        this.activeSiteId = 0;
        this.locationType = this.mapEntityId === HOME_SITE
            ? PlayerNavigationStateType.HOME
            : PlayerNavigationStateType.MAP;
        this.needsMapSync = false;
    },
    isAtHome: function () {
        return this.locationType === PlayerNavigationStateType.HOME;
    },
    isAtSite: function () {
        return this.locationType === PlayerNavigationStateType.SITE && this.activeSiteId > 0;
    },
    getActiveSiteId: function () {
        return this.activeSiteId || 0;
    },
    getMapEntityId: function () {
        return this.mapEntityId || HOME_SITE;
    },
    getMapEntityKey: function () {
        return this.mapEntityKey || this._buildEntityKey("site", this.getMapEntityId());
    }
});
