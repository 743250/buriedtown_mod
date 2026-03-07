/**
 * 滑索管理器 - 管理贝尔角色的滑索系统
 */

var ZiplineManager = cc.Class.extend({
    ctor: function () {
        this.map = {};
        this.nextId = 1;
    },

    isEnabled: function () {
        return false;
    },

    _normalizeSiteId: function (siteId) {
        var normalizedSiteId = parseInt(siteId);
        return isNaN(normalizedSiteId) ? siteId : normalizedSiteId;
    },

    _resolveSite: function (siteId) {
        var normalizedSiteId = this._normalizeSiteId(siteId);
        if (typeof player === "undefined" || !player || !player.map || !player.map.siteMap) {
            return null;
        }
        return player.map.siteMap[normalizedSiteId] || null;
    },

    _canValidateSites: function () {
        return !!(typeof player !== "undefined" &&
            player &&
            player.map &&
            player.map.siteMap &&
            Object.keys(player.map.siteMap).length > 0);
    },

    _isValidZiplineSite: function (siteId) {
        if (!this._canValidateSites()) {
            return true;
        }
        return !!this._resolveSite(siteId);
    },

    _isValidZipline: function (startSiteId, endSiteId) {
        startSiteId = this._normalizeSiteId(startSiteId);
        endSiteId = this._normalizeSiteId(endSiteId);
        if (startSiteId === endSiteId) {
            return false;
        }
        return this._isValidZiplineSite(startSiteId) && this._isValidZiplineSite(endSiteId);
    },

    save: function () {
        var saveObj = {};
        for (var id in this.map) {
            saveObj[id] = {
                id: this.map[id].id,
                startSiteId: this.map[id].startSiteId,
                endSiteId: this.map[id].endSiteId,
                createdDay: this.map[id].createdDay
            };
        }
        return {
            map: saveObj,
            nextId: this.nextId
        };
    },

    restore: function (saveObj) {
        if (saveObj && saveObj.map) {
            this.map = {};
            for (var id in saveObj.map) {
                var zipline = saveObj.map[id] || {};
                var startSiteId = this._normalizeSiteId(zipline.startSiteId);
                var endSiteId = this._normalizeSiteId(zipline.endSiteId);
                if (startSiteId === endSiteId || startSiteId === undefined || endSiteId === undefined) {
                    continue;
                }
                this.map[id] = {
                    id: zipline.id || id,
                    startSiteId: startSiteId,
                    endSiteId: endSiteId,
                    createdDay: zipline.createdDay
                };
            }
            this.nextId = saveObj.nextId || 1;
        } else {
            this.map = {};
            this.nextId = 1;
        }
    },

    sanitize: function () {
        if (!this._canValidateSites()) {
            return;
        }
        var sanitizedMap = {};
        for (var id in this.map) {
            var zipline = this.map[id];
            if (!zipline || !this._isValidZipline(zipline.startSiteId, zipline.endSiteId)) {
                continue;
            }
            sanitizedMap[id] = zipline;
        }
        this.map = sanitizedMap;
    },

    addZipline: function (startSiteId, endSiteId) {
        if (!this.isEnabled()) {
            return null;
        }
        if (typeof player !== "undefined" && player.roleType !== RoleType.BELL) {
            return null;
        }
        startSiteId = this._normalizeSiteId(startSiteId);
        endSiteId = this._normalizeSiteId(endSiteId);
        if (!this._isValidZipline(startSiteId, endSiteId)) {
            return null;
        }
        if (this.hasZipline(startSiteId, endSiteId)) {
            return null;
        }
        var id = "zipline_" + this.nextId++;
        this.map[id] = {
            id: id,
            startSiteId: startSiteId,
            endSiteId: endSiteId,
            createdDay: cc.timer.formatTime().d
        };
        Record.saveAll();
        return id;
    },

    removeZipline: function (ziplineId) {
        delete this.map[ziplineId];
        Record.saveAll();
    },

    hasZipline: function (startSiteId, endSiteId) {
        if (!this.isEnabled()) {
            return false;
        }
        startSiteId = this._normalizeSiteId(startSiteId);
        endSiteId = this._normalizeSiteId(endSiteId);
        if (!this._isValidZipline(startSiteId, endSiteId)) {
            return false;
        }
        for (var id in this.map) {
            var zipline = this.map[id];
            if (!zipline || !this._isValidZipline(zipline.startSiteId, zipline.endSiteId)) {
                continue;
            }
            var ziplineStartSiteId = this._normalizeSiteId(zipline.startSiteId);
            var ziplineEndSiteId = this._normalizeSiteId(zipline.endSiteId);
            if ((ziplineStartSiteId === startSiteId && ziplineEndSiteId === endSiteId) ||
                (ziplineStartSiteId === endSiteId && ziplineEndSiteId === startSiteId)) {
                return true;
            }
        }
        return false;
    },

    getZiplines: function () {
        if (!this.isEnabled()) {
            return [];
        }
        var list = [];
        for (var id in this.map) {
            var zipline = this.map[id];
            if (!zipline || !this._isValidZipline(zipline.startSiteId, zipline.endSiteId)) {
                continue;
            }
            list.push(zipline);
        }
        return list;
    },

    getZiplinesForSite: function (siteId) {
        if (!this.isEnabled()) {
            return [];
        }
        siteId = this._normalizeSiteId(siteId);
        if (!this._isValidZiplineSite(siteId)) {
            return [];
        }
        var list = [];
        for (var id in this.map) {
            var zipline = this.map[id];
            if (!zipline || !this._isValidZipline(zipline.startSiteId, zipline.endSiteId)) {
                continue;
            }
            var startId = this._normalizeSiteId(zipline.startSiteId);
            var endId = this._normalizeSiteId(zipline.endSiteId);
            if (startId === siteId || endId === siteId) {
                list.push(zipline);
            }
        }
        return list;
    }
});
