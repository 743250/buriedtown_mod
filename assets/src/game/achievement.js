/**
 * Created by lancelot on 15/8/12.
 */
/**
 * Created by lancelot on 15/5/15.
 */

var AchievementConfig = {
    bt_season_1: {aim: 1, aimCompleted: 0, seasonId: 1},
    bt_season_2: {aim: 1, aimCompleted: 0, seasonId: 2},
    bt_season_3: {aim: 1, aimCompleted: 0, seasonId: 3},
    bt_season_4: {aim: 1, aimCompleted: 0, seasonId: 0},
    bt_produce_1: {aim: 50, aimCompleted: 0, itemId: 1103011},
    bt_produce_2: {aim: 25, aimCompleted: 0, itemId: 1103041},
    bt_produce_3: {aim: 100, aimCompleted: 0, itemId: 1101061},
    bt_produce_4: {aim: 15, aimCompleted: 0, itemId: 1105022},
    bt_make_1: {aim: 1, aimCompleted: 0, itemId: 1301033},
    bt_make_2: {aim: 1, aimCompleted: 0, itemId: 1304023},
    bt_make_3: {aim: 1, aimCompleted: 0, itemId: 1305024},
    bt_make_4: {aim: 1, aimCompleted: 0, itemId: 1302032},
    bt_npc_1: {aim: 1, aimCompleted: 0, npcId: 1},
    bt_npc_2: {aim: 1, aimCompleted: 0, npcId: 1},
    bt_npc_3: {aim: 1, aimCompleted: 0, npcId: 3},
    bt_npc_4: {aim: 1, aimCompleted: 0, npcId: 3},
    bt_npc_5: {aim: 1, aimCompleted: 0, npcId: 2},
    bt_npc_6: {aim: 1, aimCompleted: 0, npcId: 2},
    bt_npc_7: {aim: 1, aimCompleted: 0, npcId: 4},
    bt_npc_8: {aim: 1, aimCompleted: 0, npcId: 4},
    bt_item_1: {aim: 1, aimCompleted: 0, itemId: 1301041},
    bt_item_2: {aim: 1, aimCompleted: 0, itemId: 1301052},
    bt_item_3: {aim: 1, aimCompleted: 0, itemId: 1301063},
    bt_item_4: {aim: 1, aimCompleted: 0, itemId: 1302043},
    bt_item_5: {aim: 1, aimCompleted: 0, itemId: 1303022},
    bt_item_6: {aim: 1, aimCompleted: 0, itemId: 1303012},
    bt_cost_1: {aim: 50, aimCompleted: 0, itemId: 1105011},
    bt_cost_2: {aim: 100, aimCompleted: 0, itemId: 1105011},
    bt_cost_3: {aim: 150, aimCompleted: 0, itemId: 1105011}
};
var Achievement = {
    _map: null,
    _enable: false,
    init: function () {
        if (!this._map) {
            var achievementStr = cc.sys.localStorage.getItem("achievement");
            if (achievementStr) {
                this._map = SafetyHelper.safeJSONParse(achievementStr, null, "Achievement.init");
            } else {
                this._map = utils.clone(AchievementConfig);
            }
            if (!this._map) {
                this._map = utils.clone(AchievementConfig);
            }
        }
        if (cc.sys.os == cc.sys.OS_IOS) {
            this._enable = true;
        } else if (cc.sys.os == cc.sys.OS_ANDROID) {
            if (PurchaseAndroid.payType === PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY) {
                this._enable = true;
            }
        }
    },
    save: function () {
        cc.sys.localStorage.setItem("achievement", JSON.stringify(this._map));
    },
    report: function (gcId) {
        if (this._enable && this.needReport(gcId)) {
            gameCenter.reportAchievement(gcId, this.getAimPercent(gcId));
        }
    },
    needReport: function (gcId) {
        var res = false;
        var achievementRecord = gameCenter.achievements[gcId];
        cc.log('needReport');
        cc.log(JSON.stringify(achievementRecord));
        cc.log(this.getAimPercent(gcId));
        if (achievementRecord.completed != 1 && this.getAimPercent(gcId) > Number(achievementRecord.percent)) {
            res = true;
        }
        return res;
    },
    getAimPercent: function (gcId) {
        return this._map[gcId].aimCompleted / this._map[gcId].aim * 100;
    },
    findIdFromArray: function (ids, key, value) {
        var gcId = "";
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            if (this._map[id][key] == value) {
                gcId = id;
                break;
            }
        }
        return gcId;
    },
    checkSeason: function (seasonId) {
        var ids = ["bt_season_1", "bt_season_2", "bt_season_3", "bt_season_4"];
        var gcId = this.findIdFromArray(ids, "seasonId", seasonId);
        if (gcId) {
            this._map[gcId].aimCompleted = 1;
            this.save();
            this.report(gcId);
        }
    },
    checkProduce: function (itemId, num) {
        var ids = ["bt_produce_1", "bt_produce_2", "bt_produce_3", "bt_produce_4"];
        var gcId = this.findIdFromArray(ids, "itemId", itemId);
        if (gcId) {
            this._map[gcId].aimCompleted += num;
            this.save();
            this.report(gcId);
        }
    },
    checkMake: function (itemId, num) {
        if (typeof WeaponCraftService !== "undefined" && WeaponCraftService && WeaponCraftService.getBaseItemId) {
            itemId = WeaponCraftService.getBaseItemId(itemId);
        }
        var ids = ["bt_make_1", "bt_make_2", "bt_make_3", "bt_make_4"];
        var gcId = this.findIdFromArray(ids, "itemId", itemId);
        if (gcId) {
            this._map[gcId].aimCompleted += num;
            this.save();
            this.report(gcId);
        }
    },
    checkNpcUnlock: function (npcId) {
        var ids = ["bt_npc_1", "bt_npc_3", "bt_npc_5", "bt_npc_7"];
        var gcId = this.findIdFromArray(ids, "npcId", npcId);
        if (gcId) {
            this._map[gcId].aimCompleted = 1;
            this.save();
            this.report(gcId);
        }
    },
    checkNpcReputation: function (npcId) {
        var ids = ["bt_npc_2", "bt_npc_4", "bt_npc_6", "bt_npc_8"];
        var gcId = this.findIdFromArray(ids, "npcId", npcId);
        if (gcId) {
            this._map[gcId].aimCompleted = 1;
            this.save();
            this.report(gcId);
        }
    },
    checkGetItem: function (itemId) {
        if (typeof WeaponCraftService !== "undefined" && WeaponCraftService && WeaponCraftService.getBaseItemId) {
            itemId = WeaponCraftService.getBaseItemId(itemId);
        }
        var ids = ["bt_item_1", "bt_item_2", "bt_item_3", "bt_item_4"];
        var gcId = this.findIdFromArray(ids, "itemId", itemId);
        if (gcId) {
            this._map[gcId].aimCompleted = 1;
            this.save();
            this.report(gcId);
        }
    },
    checkCost: function (itemId, num) {
        var ids = ["bt_cost_1", "bt_cost_2", "bt_cost_3"];
        var self = this;
        ids.forEach(function (gcId) {
            if (itemId == self._map[gcId].itemId) {
                self._map[gcId].aimCompleted += num;
                self.save();
                self.report(gcId);
            }
        })
    }

};
