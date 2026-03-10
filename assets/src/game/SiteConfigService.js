/**
 * Centralized access to site config so runtime callers share
 * the same fallback and optional validation entry point.
 */
var SiteConfigService = {
    _normalizeSiteId: function (siteId) {
        var normalizedSiteId = parseInt(siteId);
        return isNaN(normalizedSiteId) ? null : normalizedSiteId;
    },
    _getSiteTable: function () {
        if (typeof siteConfig === "undefined" || !siteConfig) {
            return null;
        }
        return siteConfig;
    },
    _buildFallbackConfig: function (siteId) {
        return {
            id: siteId || 0,
            coordinate: {x: 0, y: 0},
            battleRoom: 0,
            difficulty: [1, 1],
            workRoom: 0,
            produceValue: 0,
            produceList: [],
            fixedProduceList: [],
            unlockValue: {},
            def: 0
        };
    },
    hasSite: function (siteId) {
        siteId = this._normalizeSiteId(siteId);
        var table = this._getSiteTable();
        return siteId !== null && !!(table && table[siteId]);
    },
    getAllSiteIds: function () {
        var table = this._getSiteTable();
        if (!table) {
            return [];
        }
        return Object.keys(table).map(function (siteId) {
            return parseInt(siteId);
        }).filter(function (siteId) {
            return !isNaN(siteId);
        }).sort(function (a, b) {
            return a - b;
        });
    },
    getSiteConfig: function (siteId, validationContext) {
        siteId = this._normalizeSiteId(siteId);
        if (siteId === null) {
            return this._buildFallbackConfig(0);
        }

        var table = this._getSiteTable();
        if (!table || !table[siteId]) {
            cc.error("[SiteConfigService] missing site config for id=" + siteId);
            return this._buildFallbackConfig(siteId);
        }

        return utils.clone(table[siteId]);
    },
    getCoordinate: function (siteId, validationContext) {
        var config = this.getSiteConfig(siteId, validationContext);
        return config && config.coordinate ? config.coordinate : {x: 0, y: 0};
    },
    getUnlockSiteIds: function (siteId) {
        var config = this.getSiteConfig(siteId);
        var unlockValue = config.unlockValue || {};
        if (!Array.isArray(unlockValue.site)) {
            return [];
        }
        return unlockValue.site.map(function (unlockSiteId) {
            return parseInt(unlockSiteId);
        }).filter(function (unlockSiteId) {
            return !isNaN(unlockSiteId);
        });
    },
    getUnlockNpcIds: function (siteId) {
        var config = this.getSiteConfig(siteId);
        var unlockValue = config.unlockValue || {};
        if (!Array.isArray(unlockValue.npc)) {
            return [];
        }
        return unlockValue.npc.map(function (npcId) {
            return parseInt(npcId);
        }).filter(function (npcId) {
            return !isNaN(npcId);
        });
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SiteConfigService;
}
