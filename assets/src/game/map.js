/**
 * Created by lancelot on 15/4/10.
 */
var Map = cc.Class.extend({
    ctor: function () {
        this.npcMap = {};
        this.siteMap = {};
        this.needDeleteSiteList = [];
    },
    save: function () {
        var npcSaveObj = [];
        for (var npcId in this.npcMap) {
            npcSaveObj.push(npcId);
        }
        var siteSaveObj = {};
        for (var siteId in this.siteMap) {
            siteSaveObj[siteId] = this.siteMap[siteId].save();
        }
        return {
            npcMap: npcSaveObj,
            siteMap: siteSaveObj,
            pos: this.pos,
            needDeleteSiteList: this.needDeleteSiteList
        };
    },
    restore: function (saveObj) {
        if (saveObj) {
            var self = this;
            var npcSaveObj = saveObj.npcMap;
            npcSaveObj.forEach(function (npcId) {
                self.npcMap[npcId] = true;
            });

            var siteSaveObj = saveObj.siteMap;
            for (var siteId in siteSaveObj) {
                var site;
                if (siteId == AD_SITE) {
                    site = new AdSite(siteId);
                } else if (siteId == BOSS_SITE) {
                    site = new BossSite(siteId);
                } else if (siteId == WORK_SITE) {
                    site = new WorkSite(siteId);
                } else {
                    site = new Site(siteId);
                }
                site.restore(siteSaveObj[siteId]);
                this.siteMap[siteId] = site;
            }

            this.pos = saveObj.pos;
            this.needDeleteSiteList = saveObj.needDeleteSiteList;

        } else {
            this.init();
        }
    },
    init: function () {
        this.unlockSite(100);
        this.unlockSite(201);

        this.unlockSiteByRole(player.roleType);

        //根据角色决定家的位置
        var homePos = player.npcManager.getNPC(player.roleType).pos;
        this.getSite(100).pos = homePos;
        // 家的初始化位置
        this.pos = this.getSite(100).pos;
    },

    /**
     * 根据选用的角色解锁副本,例如,选择老罗,那么老罗作为NPC通过送礼物解锁的副本应当直接解锁
     */
    unlockSiteByRole: function (roleType) {
        roleType = roleType || role.getChoosenRoleType();
        RoleRuntimeService.applyInitialUnlocks(this, roleType);
    },

    forEach: function (func) {
        for (var npcId in this.npcMap) {
            func(player.npcManager.getNPC(npcId));
        }
        for (var siteId in this.siteMap) {
            if (!this.siteMap[siteId].closed && siteId < 300) {
                func(this.siteMap[siteId]);
            }
        }
    },
    unlockNpc: function (npcId) {
        if (!this.npcMap.hasOwnProperty(npcId)) {
            this.npcMap[npcId] = true;

            var npc = player.npcManager.getNPC(npcId);
            utils.emitter.emit("unlock_site", npc);
            player.log.addMsg(1125, npc.getName());
        }
    },
    unlockSite: function (siteId) {
        //只在gp版可以解锁广告副本
        if (PurchaseAndroid.payType !== PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY && siteId == AD_SITE)
            return;

        if (!this.siteMap.hasOwnProperty(siteId)) {
            var site;
            if (siteId == AD_SITE) {
                if (!adHelper.enable)
                    return;
                site = new AdSite(siteId);
            } else if (siteId == BOSS_SITE) {
                site = new BossSite(siteId);
            } else if (siteId == WORK_SITE) {
                site = new WorkSite(siteId);
            } else {
                site = new Site(siteId);
            }
            site.init();
            this.siteMap[siteId] = site;
            utils.emitter.emit("unlock_site", site);
            player.log.addMsg(1104, site.getName());
            DataLog.genSiteLog(siteId, 0);
        }
    },
    closeSite: function (siteId) {
        if (this.siteMap.hasOwnProperty(siteId)) {
            this.needDeleteSiteList.push(siteId);
            // 不需要处理on,暂时没有在大地图关闭site的需求
            utils.emitter.emit("close_site", siteId);
        }
    },
    deleteUnusableSite: function () {
        while (this.needDeleteSiteList.length !== 0) {
            var siteId = this.needDeleteSiteList.pop();
            var site = this.getSite(siteId);
            if (site.canClose()) {
                site.closed = true;
                DataLog.genSiteLog(siteId, 1);
            }
        }
    },
    updatePos: function (pos) {
        this.pos = pos;
    },
    getNpc: function (npcId) {
        var normalizedNpcId = parseInt(npcId);
        if (isNaN(normalizedNpcId) || !this.npcMap.hasOwnProperty(normalizedNpcId)) {
            return null;
        }
        return player.npcManager.getNPC(normalizedNpcId) || null;
    },
    getSite: function (siteId) {
        return this.siteMap[siteId];
    },
    getEntity: function (entityId, entityType) {
        var normalizedEntityId = parseInt(entityId);
        if (isNaN(normalizedEntityId) || normalizedEntityId <= 0) {
            return null;
        }

        if (entityType === "npc") {
            return this.getNpc(normalizedEntityId);
        }
        if (entityType === "site") {
            return this.getSite(normalizedEntityId) || null;
        }

        return this.getSite(normalizedEntityId) || this.getNpc(normalizedEntityId);
    },
    getEntityByKey: function (entityKey) {
        if (typeof entityKey !== "string") {
            return this.getEntity(entityKey);
        }

        var keyParts = entityKey.split(":");
        if (keyParts.length !== 2) {
            return this.getEntity(entityKey);
        }

        return this.getEntity(keyParts[1], keyParts[0]);
    },
    resetPos: function () {
        this.pos = this.getSite(100).pos;
    }
});
