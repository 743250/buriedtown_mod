/**
 *
 * Created by lancelot on 15/7/7.
 */

if (typeof cc === "undefined" || !cc) {
    var cc = require("../test/testBattle");
    var SiteRewardService = require("./SiteRewardService");
    var SiteRoomGenerator = require("./SiteRoomGenerator");
    var SiteConfigService = require("./SiteConfigService");
}

var BaseSite = cc.Class.extend({
    ctor: function () {
        this.pos = cc.p(utils.getRandomInt(5, 25), utils.getRandomInt(5, 50));
    }
});

var WorkRoomTypeLen = 3;
var SecretWorkRoomTypeLen = 3;
var HOME_SITE = 100;
var AD_SITE = 202;
var BOSS_SITE = 61;
var WORK_SITE = 204;

var Site = BaseSite.extend({
    ctor: function (siteId) {
        this._super();

        this.id = siteId;
        this.config = SiteConfigService.getSiteConfig(this.id, "site.Site");
        this.pos = this.config.coordinate;
        this.storage = new Storage();
        this.step = 0;
        this.rooms = [];

        if (this.config.secretRoomsId) {
            this.secretRoomsConfig = utils.clone(secretRooms[this.config.secretRoomsId]);
            this.secretRoomType = utils.getRandomInt(0, SecretWorkRoomTypeLen - 1);
        }
        this.secretRoomsShowedCount = 0;
        this.isSecretRoomsEntryShowed = false;
        this.isInSecretRooms = false;
        this.secretRooms = [];
        this.secretRoomsStep = 0;

        this.isUnderAttacked = false;
        this.haveNewItems = false;
    },
    testSecretRoomsBegin: function () {
        if (this.secretRoomsConfig) {

            //高能探测器
            var ITEM_EXPLORER = 1305064;
            //强光手电
            var ITEM_FLASHLIGHT = 1305053;

            //密室收到道具影响
            var maxCount = parseInt(this.secretRoomsConfig.maxCount);
            if (player.storage.getNumByItemId(ITEM_EXPLORER) > 0) {
                maxCount += specialItemConfig[ITEM_EXPLORER].maxCount;
            }
            if (this.secretRoomsShowedCount < maxCount) {
                var probability = parseFloat(this.secretRoomsConfig.probability);

                if (player.storage.getNumByItemId(ITEM_EXPLORER) > 0) {
                    probability += specialItemConfig[ITEM_EXPLORER].probability;
                } else if (player.storage.getNumByItemId(ITEM_FLASHLIGHT) > 0) {
                    probability += specialItemConfig[ITEM_FLASHLIGHT].probability;
                }

                var rand = Math.random();
                if (probability >= rand) {
                    this.isSecretRoomsEntryShowed = true;
                    this.secretRoomsShowedCount++;

                    this.secretRooms = [];
                    this.secretRoomsStep = 0;
                    this.genSecretRooms();
                }
            }
        }
    },
    enterSecretRooms: function () {
        this.isInSecretRooms = true;
        this.isSecretRoomsEntryShowed = false;
    },
    secretRoomBegin: function () {
        return this.secretRooms[this.secretRoomsStep];
    },
    secretRoomEnd: function () {
        this.secretRoomsStep++;
        if (this.isSecretRoomsEnd()) {
            this.secretRoomsEnd();
        }
    },
    secretRoomsEnd: function () {
        this.isInSecretRooms = false;
        Medal.checkSecretRoomEnd(1);
    },
    isSecretRoomsEnd: function () {
        return this.secretRoomsStep >= this.secretRooms.length;
    },
    genSecretRooms: function () {
        this.secretRooms = SiteRoomGenerator.buildSecretRooms(this.config, this.secretRoomsConfig, {
            workRoomTypeLen: WorkRoomTypeLen
        });
    },
    save: function () {
        return {
            pos: this.pos,
            step: this.step,
            rooms: this.rooms,
            storage: this.storage.save(),

            secretRoomsShowedCount: this.secretRoomsShowedCount,
            isSecretRoomsEntryShowed: this.isSecretRoomsEntryShowed,
            isInSecretRooms: this.isInSecretRooms,
            secretRooms: this.secretRooms,
            secretRoomsStep: this.secretRoomsStep,
            secretRoomType: this.secretRoomType,
            closed: this.closed,
            isUnderAttacked: this.isUnderAttacked,
            haveNewItems: this.haveNewItems
        };
    },
    restore: function (saveObj) {
        if (saveObj) {
            this.pos = saveObj.pos;
            this.step = saveObj.step;
            this.rooms = saveObj.rooms;
            this.storage.restore(saveObj.storage);

            this.secretRoomsShowedCount = saveObj.secretRoomsShowedCount;
            this.isSecretRoomsEntryShowed = saveObj.isSecretRoomsEntryShowed;
            this.isInSecretRooms = saveObj.isInSecretRooms;
            this.secretRooms = saveObj.secretRooms;
            this.secretRoomsStep = saveObj.secretRoomsStep;
            this.secretRoomType = saveObj.secretRoomType;
            this.closed = saveObj.closed;
            this.isUnderAttacked = saveObj.isUnderAttacked;
            this.haveNewItems = saveObj.haveNewItems;
        } else {
            this.init();
        }
    },
    init: function () {
        //家不生成副本
        if (this.id !== HOME_SITE) {
            this.genRooms();
        }
    },
    getName: function () {
        return stringUtil.getString("site_" + this.id).name;
    },
    getDes: function () {
        return stringUtil.getString("site_" + this.id).des;
    },
    genRooms: function () {
        this.rooms = SiteRoomGenerator.buildRooms(this.config, {
            workRoomTypeLen: WorkRoomTypeLen
        });
    },

    roomBegin: function () {
        return this.rooms[this.step];
    },
    roomEnd: function (isWin) {
        if (isWin) {
            var doneRoom = this.roomBegin();
            if (doneRoom.type === "battle") {
            } else {
                player.log.addMsg(1117, stringUtil.getString(3007)[doneRoom.workType]);
            }
            this.step++;
            cc.i("roomEnd " + isWin + " " + this.step + "/" + this.rooms.length);
            if (this.step >= this.rooms.length) {
                this.siteEnd();
            }
        }
    },
    siteEnd: function () {
        player.log.addMsg(1119, this.getName());
        var unlockValue = this.config.unlockValue;
        if (unlockValue.site) {
            unlockValue.site.forEach(function (siteId) {
                player.map.unlockSite(siteId);
            });
        }
        if (unlockValue.npc && RoleRuntimeService.canUnlockNpcsFromSite(player.roleType)) {
            unlockValue.npc.forEach(function (npcId) {
                player.npcManager.unlockNpc(npcId);
            });
        }
    },
    isSiteEnd: function () {
        return this.step >= this.rooms.length;
    },
    //进度
    getProgressStr: function () {
        return this.step + "/" + this.rooms.length;
    },
    //当前room的指示
    getCurrentProgressStr: function () {
        return (this.step + 1) + "/" + this.rooms.length;
    },
    canClose: function () {
        if (!this.isSiteEnd() || !this.storage.isEmpty()) {
            return false;
        }
        return true;
    },
    increaseItem: function (itemId, num) {
        this.storage.increaseItem(itemId, num);
        this.haveNewItems = true;
    },
    getAllItemNum: function () {
        return this.storage.getAllItemNum();
    }

});

var AdSite = Site.extend({
    ctor: function (siteId) {
        this.id = siteId;
        cc.log(this.id);
        this.config = SiteConfigService.getSiteConfig(this.id, "site.AdSite");
        this.pos = this.config.coordinate;
        this.storage = new Storage();
        this.isActive = false;
    },
    save: function () {
        return {
            pos: this.pos,
            step: this.step,
            storage: this.storage.save(),
            isActive: this.isActive,
            haveNewItems: this.haveNewItems
        };
    },
    restore: function (saveObj) {
        if (saveObj) {
            this.pos = saveObj.pos;
            this.step = saveObj.step;
            this.storage.restore(saveObj.storage);
            this.isActive = saveObj.isActive;
            this.haveNewItems = saveObj.haveNewItems;
        } else {
            this.init();
        }
    },
    init: function () {
    },
    isSiteEnd: function () {
        return false;
    },
    //进度
    getProgressStr: function () {
        return "???";
    },
    //当前room的指示
    getCurrentProgressStr: function () {
        return "";
    }

});

var WorkSite = Site.extend({
    ctor: function (siteId) {
        this.id = siteId;
        cc.log(this.id);
        this.config = SiteConfigService.getSiteConfig(this.id, "site.WorkSite");
        this.pos = this.config.coordinate;
        this.storage = new Storage();
        this.isActive = false;
        this.fixedTime = 0;
    },
    save: function () {
        return {
            pos: this.pos,
            step: this.step,
            storage: this.storage.save(),
            isActive: this.isActive,
            fixedTime: this.fixedTime
        };
    },
    restore: function (saveObj) {
        if (saveObj) {
            this.pos = saveObj.pos;
            this.step = saveObj.step;
            this.storage.restore(saveObj.storage);
            this.isActive = saveObj.isActive;
            this.fixedTime = saveObj.fixedTime;
        } else {
            this.init();
        }
    },
    init: function () {
    },
    isSiteEnd: function () {
        return false;
    },
    //进度
    getProgressStr: function () {
        return "???";
    },
    //当前room的指示
    getCurrentProgressStr: function () {
        return "";
    },
    fix: function () {
        this.isActive = true;
        this.fixedTime = cc.timer.time;
        utils.emitter.emit('onWorkSiteChange', this.isActive);
    },
    checkActive: function () {
        cc.log('checkActive ' + this.isActive);
        if (this.isActive) {
            var intervalTime = cc.timer.time - this.fixedTime;
            cc.log('intervalTime ' + intervalTime);
            if (intervalTime > workSiteConfig.lastTime * 60) {
                var rand = Math.random();
                if (rand < workSiteConfig.brokenProbability) {
                    cc.log('workSite broken');
                    this.isActive = false;
                    utils.emitter.emit('onWorkSiteChange', this.isActive);
                }
            }
        }
    }

});

var BossSite = Site.extend({
    ctor: function (siteId) {
        this.id = siteId;
        cc.log(this.id);
        this.config = SiteConfigService.getSiteConfig(this.id, "site.BossSite");
        this.pos = this.config.coordinate;
        this.storage = new Storage();
        this.bossSubSiteIds = [301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312];
    },
    save: function () {
        return {
            pos: this.pos,
            step: this.step,
            storage: this.storage.save(),
        };
    },
    restore: function (saveObj) {
        if (saveObj) {
            this.pos = saveObj.pos;
            this.step = saveObj.step;
            this.storage.restore(saveObj.storage);
        } else {
            this.init();
        }
    },
    init: function () {
    },
    isSiteEnd: function () {
        return false;
    },
    //进度
    getProgressStr: function () {
        var doneNum = 0;
        this.bossSubSiteIds.forEach(function (siteId) {
            var site = player.map.getSite(siteId);
            if (site) {
                doneNum++;
            }
        });
        return doneNum + "/" + this.bossSubSiteIds.length;
    },
    //当前room的指示
    getCurrentProgressStr: function () {
        return "";
    },
    getAllItemNum: function () {
        var num = 0;
        this.bossSubSiteIds.forEach(function (siteId) {
            var site = player.map.getSite(siteId);
            if (site) {
                num += site.getAllItemNum();
            }
        });
        return num;
    }

});
