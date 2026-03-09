/**
 * Owns persisted zipline connections between eligible world-map entities.
 */
var ZiplineNetworkService = cc.Class.extend({
    CONFIG: {
        MAX_LINKS: 3,
        ENTITY_TYPE_SITE: "site",
        ENTITY_TYPE_NPC: "npc"
    },
    ctor: function () {
        this.reset();
    },
    reset: function () {
        this.links = [];
        this.nextLinkId = 1;
    },
    save: function () {
        var saveLinks = [];
        for (var i = 0; i < this.links.length; i++) {
            saveLinks.push(this._cloneLink(this.links[i]));
        }
        return {
            nextLinkId: this.nextLinkId,
            links: saveLinks
        };
    },
    restore: function (saveObj, map) {
        this.reset();

        var rawLinks = [];
        this._appendRawLinks(rawLinks, saveObj);

        for (var i = 0; i < rawLinks.length; i++) {
            var rawLink = rawLinks[i];
            var pair = this._normalizePair(
                rawLink.startEntityKey || rawLink.startSiteId,
                rawLink.endEntityKey || rawLink.endSiteId,
                map,
                rawLink.startEntityType,
                rawLink.endEntityType
            );
            if (!pair) {
                continue;
            }

            this.links.push({
                id: rawLink.id || (this.links.length + 1),
                startEntityKey: pair.startEntityKey,
                endEntityKey: pair.endEntityKey
            });
        }

        this.nextLinkId = this._normalizeLinkId(saveObj && (saveObj.nextLinkId || saveObj.nextId)) || (this.links.length + 1);
        this.sanitize(map);
    },
    sanitize: function (map) {
        var sanitizedLinks = [];
        var pairMap = {};

        for (var i = 0; i < this.links.length; i++) {
            var pair = this._normalizePair(this.links[i].startEntityKey, this.links[i].endEntityKey, map);
            if (!pair) {
                continue;
            }

            var startEntity = this.resolveEntity(pair.startEntityKey, map);
            var endEntity = this.resolveEntity(pair.endEntityKey, map);
            if (!this.isEligibleEntity(startEntity)
                || !this.isEligibleEntity(endEntity)
                || !this._isHomeOnlyPair(startEntity, endEntity)) {
                continue;
            }

            var pairKey = pair.startEntityKey + "|" + pair.endEntityKey;
            if (pairMap[pairKey]) {
                continue;
            }

            pairMap[pairKey] = true;
            sanitizedLinks.push({
                id: sanitizedLinks.length + 1,
                startEntityKey: pair.startEntityKey,
                endEntityKey: pair.endEntityKey
            });
        }

        this.links = sanitizedLinks;
        this.nextLinkId = this.links.length + 1;
    },
    _hasValidMapPosition: function (entity) {
        return !!(entity
            && entity.pos
            && isFinite(entity.pos.x)
            && isFinite(entity.pos.y));
    },
    _getRuntimeZiplineConfig: function () {
        if (typeof RoleRuntimeService !== "undefined"
            && RoleRuntimeService
            && typeof RoleRuntimeService.getZiplineConfig === "function"
            && typeof player !== "undefined"
            && player) {
            return RoleRuntimeService.getZiplineConfig(player.roleType) || {};
        }
        return {};
    },
    _isHomeEntity: function (entity) {
        return !!(entity instanceof Site && entity.id === HOME_SITE);
    },
    _isHomeOnlyPair: function (startEntity, endEntity) {
        var ziplineConfig = this._getRuntimeZiplineConfig();
        if (!ziplineConfig.homeOnly) {
            return true;
        }
        return this._isHomeEntity(startEntity) || this._isHomeEntity(endEntity);
    },
    isEligibleEntity: function (entity) {
        if (!entity || !this._hasValidMapPosition(entity)) {
            return false;
        }
        if (entity instanceof NPC) {
            return true;
        }
        return !!(entity instanceof Site
            && !entity.closed
            && entity.id !== AD_SITE
            && entity.id !== BOSS_SITE
            && entity.id !== WORK_SITE);
    },
    isEligibleSite: function (entity) {
        return this.isEligibleEntity(entity);
    },
    getEntityKey: function (entityRef, map, fallbackType) {
        var entityInfo = this._normalizeEntityRef(entityRef, map, fallbackType);
        return entityInfo ? entityInfo.key : "";
    },
    resolveEntity: function (entityRef, map, fallbackType) {
        var entityInfo = this._normalizeEntityRef(entityRef, map, fallbackType);
        if (!entityInfo) {
            return null;
        }
        return entityInfo.entity || null;
    },
    listLinks: function () {
        var result = [];
        for (var i = 0; i < this.links.length; i++) {
            result.push(this._cloneLink(this.links[i]));
        }
        return result;
    },
    getLinkCount: function (map) {
        if (!map) {
            return this.links.length;
        }
        this.sanitize(map);
        return this.listRenderableLinks(map).length;
    },
    getMaxLinks: function () {
        return this.CONFIG.MAX_LINKS;
    },
    listRenderableLinks: function (map) {
        if (map) {
            this.sanitize(map);
        }

        var result = [];
        for (var i = 0; i < this.links.length; i++) {
            var link = this.links[i];
            var startEntity = this.resolveEntity(link.startEntityKey, map);
            var endEntity = this.resolveEntity(link.endEntityKey, map);
            if (!this.isEligibleEntity(startEntity) || !this.isEligibleEntity(endEntity)) {
                continue;
            }
            if (!this._hasValidMapPosition(startEntity) || !this._hasValidMapPosition(endEntity)) {
                continue;
            }

            result.push({
                id: link.id,
                startEntityKey: link.startEntityKey,
                endEntityKey: link.endEntityKey,
                startSiteId: startEntity.id,
                endSiteId: endEntity.id,
                startPos: startEntity.pos,
                endPos: endEntity.pos
            });
        }
        return result;
    },
    getLinksForEntity: function (entityRef, map) {
        if (map) {
            this.sanitize(map);
        }

        var entityKey = this.getEntityKey(entityRef, map);
        if (!entityKey) {
            return [];
        }

        var result = [];
        for (var i = 0; i < this.links.length; i++) {
            var link = this.links[i];
            if (link.startEntityKey !== entityKey && link.endEntityKey !== entityKey) {
                continue;
            }

            if (map) {
                var startEntity = this.resolveEntity(link.startEntityKey, map);
                var endEntity = this.resolveEntity(link.endEntityKey, map);
                if (!this.isEligibleEntity(startEntity) || !this.isEligibleEntity(endEntity)) {
                    continue;
                }
            }

            result.push(this._cloneLink(link));
        }

        return result;
    },
    getLinksForSite: function (entityRef, map) {
        return this.getLinksForEntity(entityRef, map);
    },
    hasLinksForEntity: function (entityRef, map) {
        return this.getLinksForEntity(entityRef, map).length > 0;
    },
    hasLinksForSite: function (entityRef, map) {
        return this.hasLinksForEntity(entityRef, map);
    },
    hasLink: function (startEntityRef, endEntityRef, map) {
        if (map) {
            this.sanitize(map);
        }

        var pair = this._normalizePair(startEntityRef, endEntityRef, map);
        if (!pair) {
            return false;
        }

        for (var i = 0; i < this.links.length; i++) {
            var link = this.links[i];
            if (link.startEntityKey !== pair.startEntityKey || link.endEntityKey !== pair.endEntityKey) {
                continue;
            }

            if (!map) {
                return true;
            }

            var startEntity = this.resolveEntity(link.startEntityKey, map);
            var endEntity = this.resolveEntity(link.endEntityKey, map);
            return this.isEligibleEntity(startEntity) && this.isEligibleEntity(endEntity);
        }

        return false;
    },
    hasHomeLink: function (entityRef, map) {
        return this.hasLink(HOME_SITE, entityRef, map);
    },
    createLink: function (startEntityRef, endEntityRef, map) {
        this.sanitize(map);

        var pair = this._normalizePair(startEntityRef, endEntityRef, map);
        if (!pair) {
            return {ok: false, reason: "same-site"};
        }

        var startEntity = this.resolveEntity(pair.startEntityKey, map);
        var endEntity = this.resolveEntity(pair.endEntityKey, map);
        if (!this.isEligibleEntity(startEntity) || !this.isEligibleEntity(endEntity)) {
            return {ok: false, reason: "invalid-site"};
        }
        if (!this._isHomeOnlyPair(startEntity, endEntity)) {
            return {ok: false, reason: "home-only"};
        }

        if (this.hasLink(pair.startEntityKey, pair.endEntityKey, map)) {
            return {ok: false, reason: "duplicate"};
        }

        if (this.getLinkCount(map) >= this.getMaxLinks()) {
            return {ok: false, reason: "max-links"};
        }

        var link = {
            id: this.nextLinkId++,
            startEntityKey: pair.startEntityKey,
            endEntityKey: pair.endEntityKey
        };
        this.links.push(link);
        return {
            ok: true,
            link: this._cloneLink(link)
        };
    },
    createHomeLink: function (entityRef, map) {
        return this.createLink(HOME_SITE, entityRef, map);
    },
    removeLinkBetween: function (startEntityRef, endEntityRef, map) {
        if (map) {
            this.sanitize(map);
        }

        var pair = this._normalizePair(startEntityRef, endEntityRef, map);
        if (!pair) {
            return {ok: false, reason: "same-site"};
        }

        for (var i = 0; i < this.links.length; i++) {
            var link = this.links[i];
            if (link.startEntityKey !== pair.startEntityKey || link.endEntityKey !== pair.endEntityKey) {
                continue;
            }

            if (map) {
                var startEntity = this.resolveEntity(link.startEntityKey, map);
                var endEntity = this.resolveEntity(link.endEntityKey, map);
                if (!this.isEligibleEntity(startEntity) || !this.isEligibleEntity(endEntity)) {
                    return {ok: false, reason: "invalid-site"};
                }
            }

            var removedLink = this._cloneLink(link);
            this.links.splice(i, 1);
            return {
                ok: true,
                link: removedLink
            };
        }

        return {ok: false, reason: "not-found"};
    },
    removeHomeLink: function (entityRef, map) {
        return this.removeLinkBetween(HOME_SITE, entityRef, map);
    },
    removeLink: function (linkId) {
        var normalizedLinkId = this._normalizeLinkId(linkId);
        if (!normalizedLinkId) {
            return false;
        }

        for (var i = 0; i < this.links.length; i++) {
            if (this.links[i].id === normalizedLinkId) {
                this.links.splice(i, 1);
                return true;
            }
        }

        return false;
    },
    _appendRawLinks: function (rawLinks, saveObj) {
        if (!saveObj) {
            return;
        }

        var links = saveObj.links || saveObj.linkList;
        if (links instanceof Array) {
            for (var i = 0; i < links.length; i++) {
                this._appendRawLink(rawLinks, links[i]);
            }
        }

        if (saveObj.map && typeof saveObj.map === "object") {
            this._appendLegacyMapLinks(rawLinks, saveObj.map);
        }
    },
    _appendLegacyMapLinks: function (rawLinks, legacyMap) {
        for (var startSiteId in legacyMap) {
            if (!legacyMap.hasOwnProperty(startSiteId)) {
                continue;
            }

            var targets = legacyMap[startSiteId];
            if (targets instanceof Array) {
                for (var i = 0; i < targets.length; i++) {
                    this._appendRawLink(rawLinks, {
                        startSiteId: startSiteId,
                        endSiteId: targets[i]
                    });
                }
                continue;
            }

            if (!targets || typeof targets !== "object") {
                continue;
            }

            if (targets.endSiteId || targets.targetSiteId || targets.siteId) {
                this._appendRawLink(rawLinks, {
                    startSiteId: startSiteId,
                    endSiteId: targets.endSiteId || targets.targetSiteId || targets.siteId,
                    id: targets.id
                });
            }

            for (var endSiteId in targets) {
                if (!targets.hasOwnProperty(endSiteId)) {
                    continue;
                }
                this._appendRawLink(rawLinks, {
                    startSiteId: startSiteId,
                    endSiteId: endSiteId,
                    enabled: targets[endSiteId]
                });
            }
        }
    },
    _appendRawLink: function (rawLinks, rawLink) {
        if (!rawLink) {
            return;
        }

        if (rawLink.enabled === false || rawLink.active === false) {
            return;
        }

        rawLinks.push({
            id: this._normalizeLinkId(rawLink.id),
            startEntityKey: rawLink.startEntityKey || rawLink.fromEntityKey || rawLink.startKey,
            endEntityKey: rawLink.endEntityKey || rawLink.toEntityKey || rawLink.endKey,
            startEntityType: rawLink.startEntityType || rawLink.fromEntityType || rawLink.startType,
            endEntityType: rawLink.endEntityType || rawLink.toEntityType || rawLink.endType,
            startSiteId: rawLink.startSiteId || rawLink.fromSiteId || rawLink.from || rawLink.start,
            endSiteId: rawLink.endSiteId || rawLink.toSiteId || rawLink.to || rawLink.targetSiteId || rawLink.end
        });
    },
    _cloneLink: function (link) {
        var startEntityInfo = this._splitEntityKey(link.startEntityKey);
        var endEntityInfo = this._splitEntityKey(link.endEntityKey);
        return {
            id: link.id,
            startEntityKey: link.startEntityKey,
            endEntityKey: link.endEntityKey,
            startEntityType: startEntityInfo ? startEntityInfo.type : "",
            endEntityType: endEntityInfo ? endEntityInfo.type : "",
            startSiteId: startEntityInfo ? startEntityInfo.id : null,
            endSiteId: endEntityInfo ? endEntityInfo.id : null
        };
    },
    _resolveEntityByType: function (map, entityType, entityId) {
        var normalizedEntityId = this._normalizeEntityId(entityId);
        if (!normalizedEntityId) {
            return null;
        }
        if (entityType === this.CONFIG.ENTITY_TYPE_NPC) {
            var npcEntity = map && typeof map.getNpc === "function"
                ? map.getNpc(normalizedEntityId)
                : null;
            if (!npcEntity
                && typeof player !== "undefined"
                && player
                && player.npcManager
                && typeof player.npcManager.getNPC === "function") {
                npcEntity = player.npcManager.getNPC(normalizedEntityId) || null;
            }
            return npcEntity;
        }
        return map && typeof map.getSite === "function"
            ? map.getSite(normalizedEntityId) || null
            : null;
    },
    _normalizeEntityRef: function (entityRef, map, fallbackType) {
        if (!entityRef) {
            return null;
        }

        if (typeof entityRef === "string") {
            var entityKeyInfo = this._splitEntityKey(entityRef);
            if (entityKeyInfo) {
                return {
                    key: entityKeyInfo.key,
                    type: entityKeyInfo.type,
                    id: entityKeyInfo.id,
                    entity: this._resolveEntityByType(map, entityKeyInfo.type, entityKeyInfo.id)
                };
            }
        }

        if (typeof entityRef === "object" && entityRef.id) {
            var detectedType = this._detectEntityType(entityRef);
            var normalizedObjectId = this._normalizeEntityId(entityRef.id);
            if (!detectedType || !normalizedObjectId) {
                return null;
            }
            return {
                key: this._buildEntityKey(detectedType, normalizedObjectId),
                type: detectedType,
                id: normalizedObjectId,
                entity: entityRef
            };
        }

        var normalizedEntityId = this._normalizeEntityId(entityRef);
        if (!normalizedEntityId) {
            return null;
        }

        var normalizedType = fallbackType || this.CONFIG.ENTITY_TYPE_SITE;
        if (normalizedType !== this.CONFIG.ENTITY_TYPE_SITE && normalizedType !== this.CONFIG.ENTITY_TYPE_NPC) {
            normalizedType = this.CONFIG.ENTITY_TYPE_SITE;
        }

        return {
            key: this._buildEntityKey(normalizedType, normalizedEntityId),
            type: normalizedType,
            id: normalizedEntityId,
            entity: this._resolveEntityByType(map, normalizedType, normalizedEntityId)
        };
    },
    _buildEntityKey: function (entityType, entityId) {
        var normalizedEntityId = this._normalizeEntityId(entityId);
        if (!normalizedEntityId || !entityType) {
            return "";
        }
        return entityType + ":" + normalizedEntityId;
    },
    _splitEntityKey: function (entityKey) {
        if (typeof entityKey !== "string") {
            return null;
        }

        var keyParts = entityKey.split(":");
        if (keyParts.length !== 2) {
            return null;
        }

        var entityType = keyParts[0];
        if (entityType !== this.CONFIG.ENTITY_TYPE_SITE && entityType !== this.CONFIG.ENTITY_TYPE_NPC) {
            return null;
        }

        var normalizedEntityId = this._normalizeEntityId(keyParts[1]);
        if (!normalizedEntityId) {
            return null;
        }

        return {
            key: this._buildEntityKey(entityType, normalizedEntityId),
            type: entityType,
            id: normalizedEntityId
        };
    },
    _detectEntityType: function (entity) {
        if (entity instanceof NPC) {
            return this.CONFIG.ENTITY_TYPE_NPC;
        }
        if (entity instanceof Site) {
            return this.CONFIG.ENTITY_TYPE_SITE;
        }
        return "";
    },
    _normalizeLinkId: function (linkId) {
        var normalizedLinkId = Number(linkId);
        if (!normalizedLinkId || normalizedLinkId < 1) {
            return null;
        }
        return Math.floor(normalizedLinkId);
    },
    _normalizeEntityId: function (entityId) {
        var normalizedEntityId = Number(entityId);
        if (!normalizedEntityId || normalizedEntityId < 1) {
            return null;
        }
        return Math.floor(normalizedEntityId);
    },
    _normalizePair: function (startEntityRef, endEntityRef, map, startFallbackType, endFallbackType) {
        var normalizedStartEntity = this._normalizeEntityRef(startEntityRef, map, startFallbackType);
        var normalizedEndEntity = this._normalizeEntityRef(endEntityRef, map, endFallbackType);
        if (!normalizedStartEntity || !normalizedEndEntity || normalizedStartEntity.key === normalizedEndEntity.key) {
            return null;
        }

        if (normalizedStartEntity.key > normalizedEndEntity.key) {
            var temp = normalizedStartEntity;
            normalizedStartEntity = normalizedEndEntity;
            normalizedEndEntity = temp;
        }

        return {
            startEntityKey: normalizedStartEntity.key,
            endEntityKey: normalizedEndEntity.key
        };
    }
});
