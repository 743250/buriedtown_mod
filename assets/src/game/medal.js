/**
 * Created by lancelot on 15/8/12.
 */
/**
 * Created by lancelot on 15/5/15.
 */

var MedalTriggerType = {
    DAY: "day",
    MONSTER_KILLED: "monsterKilled",
    SECRET_ROOM_END: "secretRoomEnd"
};

var MedalConfig = {
    103: {
        categoryId: 1,
        seriesId: 1,
        seriesOrder: 1,
        stageLevel: 3,
        iconId: 1,
        triggerType: MedalTriggerType.DAY,
        resetOnNewGame: true,
        aim: 10,
        aimCompleted: 0,
        completed: 0,
        claimed: 0,
        points: 100,
        effect: {items: [{itemId: 1103083, num: 6}]}
    },
    102: {
        categoryId: 1,
        seriesId: 1,
        seriesOrder: 1,
        stageLevel: 2,
        iconId: 1,
        triggerType: MedalTriggerType.DAY,
        resetOnNewGame: true,
        aim: 20,
        aimCompleted: 0,
        completed: 0,
        claimed: 0,
        points: 200,
        effect: {items: [{itemId: 1104011, num: 2}]}
    },
    101: {
        categoryId: 1,
        seriesId: 1,
        seriesOrder: 1,
        stageLevel: 1,
        iconId: 1,
        triggerType: MedalTriggerType.DAY,
        resetOnNewGame: true,
        aim: 30,
        aimCompleted: 0,
        completed: 0,
        claimed: 0,
        points: 300,
        effect: {items: [{itemId: 1104043, num: 1}]}
    },
    203: {
        categoryId: 2,
        seriesId: 2,
        seriesOrder: 1,
        stageLevel: 3,
        iconId: 2,
        triggerType: MedalTriggerType.MONSTER_KILLED,
        resetOnNewGame: false,
        aim: 50,
        aimCompleted: 0,
        completed: 0,
        claimed: 0,
        points: 100,
        effect: {attr: {hp: 10}}
    },
    202: {
        categoryId: 2,
        seriesId: 2,
        seriesOrder: 1,
        stageLevel: 2,
        iconId: 2,
        triggerType: MedalTriggerType.MONSTER_KILLED,
        resetOnNewGame: false,
        aim: 100,
        aimCompleted: 0,
        completed: 0,
        claimed: 0,
        points: 200,
        effect: {attr: {hp: 20}}
    },
    201: {
        categoryId: 2,
        seriesId: 2,
        seriesOrder: 1,
        stageLevel: 1,
        iconId: 2,
        triggerType: MedalTriggerType.MONSTER_KILLED,
        resetOnNewGame: false,
        aim: 200,
        aimCompleted: 0,
        completed: 0,
        claimed: 0,
        points: 300,
        effect: {attr: {hp: 50}}
    },
    303: {
        categoryId: 3,
        seriesId: 3,
        seriesOrder: 1,
        stageLevel: 3,
        iconId: 3,
        triggerType: MedalTriggerType.SECRET_ROOM_END,
        resetOnNewGame: true,
        aim: 4,
        aimCompleted: 0,
        completed: 0,
        claimed: 0,
        points: 100,
        effect: {items: [{itemId: 1305011, num: 30}]}
    },
    302: {
        categoryId: 3,
        seriesId: 3,
        seriesOrder: 1,
        stageLevel: 2,
        iconId: 3,
        triggerType: MedalTriggerType.SECRET_ROOM_END,
        resetOnNewGame: true,
        aim: 8,
        aimCompleted: 0,
        completed: 0,
        claimed: 0,
        points: 200,
        effect: {items: [{itemId: 1301011, num: 1}, {itemId: 1302011, num: 30}]}
    },
    301: {
        categoryId: 3,
        seriesId: 3,
        seriesOrder: 1,
        stageLevel: 1,
        iconId: 3,
        triggerType: MedalTriggerType.SECRET_ROOM_END,
        resetOnNewGame: true,
        aim: 16,
        aimCompleted: 0,
        completed: 0,
        claimed: 0,
        points: 300,
        effect: {items: [{itemId: 1301052, num: 1}, {itemId: 1305011, num: 50}]}
    }
};

// 兑换成就配置
var ExchangeAchievementConfig = {
    // 角色解锁
    1001: {type: "character", targetId: 1, cost: 50, name: "解锁老罗"},
    1002: {type: "character", targetId: 4, cost: 50, name: "解锁雅子"},
    1003: {type: "character", targetId: 2, cost: 50, name: "解锁金医生"},
    1004: {type: "character", targetId: 5, cost: 50, name: "解锁比尔"},
    1005: {type: "character", targetId: 3, cost: 50, name: "解锁杰夫"},
    1006: {type: "character", targetId: 7, cost: 50, name: "解锁King"},
    1007: {type: "character", targetId: 8, cost: 50, name: "解锁贝尔·格里尔斯"},

    // 天赋解锁
    2001: {type: "talent", targetId: 101, level: 1, cost: 30, name: "解锁武器大师"},
    2002: {type: "talent", targetId: 102, level: 1, cost: 30, name: "解锁石肤者"},
    2003: {type: "talent", targetId: 103, level: 1, cost: 30, name: "解锁家里蹲"},
    2004: {type: "talent", targetId: 104, level: 1, cost: 30, name: "解锁万人迷"},
    2005: {type: "talent", targetId: 120, level: 1, cost: 30, name: "解锁神枪手"},
    2006: {type: "talent", targetId: 121, level: 1, cost: 30, name: "解锁大块头"},
    2007: {type: "talent", targetId: 122, level: 1, cost: 30, name: "解锁拾荒者"},
    2008: {type: "talent", targetId: 123, level: 1, cost: 30, name: "解锁谈判专家"},
    2009: {type: "talent", targetId: 124, level: 1, cost: 30, name: "解锁金刚狼"},

    // 天赋升级到2级
    2101: {type: "talent", targetId: 101, level: 2, cost: 50, name: "武器大师升2级"},
    2102: {type: "talent", targetId: 102, level: 2, cost: 50, name: "石肤者升2级"},
    2103: {type: "talent", targetId: 103, level: 2, cost: 50, name: "家里蹲升2级"},
    2104: {type: "talent", targetId: 104, level: 2, cost: 50, name: "万人迷升2级"},
    2105: {type: "talent", targetId: 120, level: 2, cost: 50, name: "神枪手升2级"},
    2106: {type: "talent", targetId: 121, level: 2, cost: 50, name: "大块头升2级"},
    2107: {type: "talent", targetId: 122, level: 2, cost: 50, name: "拾荒者升2级"},
    2108: {type: "talent", targetId: 123, level: 2, cost: 50, name: "谈判专家升2级"},
    2109: {type: "talent", targetId: 124, level: 2, cost: 50, name: "金刚狼升2级"},

    // 天赋升级到3级
    2201: {type: "talent", targetId: 101, level: 3, cost: 70, name: "武器大师升3级"},
    2202: {type: "talent", targetId: 102, level: 3, cost: 70, name: "石肤者升3级"},
    2203: {type: "talent", targetId: 103, level: 3, cost: 70, name: "家里蹲升3级"},
    2204: {type: "talent", targetId: 104, level: 3, cost: 70, name: "万人迷升3级"},
    2205: {type: "talent", targetId: 120, level: 3, cost: 70, name: "神枪手升3级", effect: {items: [{itemId: 1301091, num: 1}, {itemId: 1305011, num: 30}]}},
    2206: {type: "talent", targetId: 121, level: 3, cost: 70, name: "大块头升3级"},
    2207: {type: "talent", targetId: 122, level: 3, cost: 70, name: "拾荒者升3级"},
    2208: {type: "talent", targetId: 123, level: 3, cost: 70, name: "谈判专家升3级"},
    2209: {type: "talent", targetId: 124, level: 3, cost: 70, name: "金刚狼升3级"},

    // 道具
    3001: {type: "item", targetId: 105, cost: 30, name: "军用背包"},
    3002: {type: "item", targetId: 106, cost: 20, name: "靴子"},
    3003: {type: "item", targetId: 107, cost: 25, name: "狗舍"},

    // 消耗品
    4001: {type: "consumable", targetId: 201, cost: 3, name: "食品袋"},
    4002: {type: "consumable", targetId: 202, cost: 3, name: "购物袋"},
    4003: {type: "consumable", targetId: 203, cost: 6, name: "急救包"},
    4004: {type: "consumable", targetId: 204, cost: 6, name: "医疗包"},
    4005: {type: "consumable", targetId: 205, cost: 6, name: "军火包"},
    4006: {type: "consumable", targetId: 206, cost: 18, name: "战火大礼包"},
    4007: {type: "consumable", targetId: 207, cost: 18, name: "生命大礼包"},
    4008: {type: "consumable", targetId: 208, cost: 6, name: "初级物资包"},
    4009: {type: "consumable", targetId: 209, cost: 12, name: "高级物资包"}
};

var Medal = {
    _map: null,
    _achievementPoints: 0,
    _exchangeMap: null,

    init: function () {
        if (!this._map) {
            var savedMap = null;
            var medalStr = cc.sys.localStorage.getItem("medal");
            if (medalStr) {
                savedMap = SafetyHelper.safeJSONParse(medalStr, null, "Medal.init.medal");
            }
            if (!savedMap) {
                savedMap = {};
            }
            this._map = {};

            for (var medalId in MedalConfig) {
                var config = MedalConfig[medalId];
                var savedInfo = savedMap[medalId] || {};
                this._map[medalId] = {
                    aim: config.aim,
                    aimCompleted: Math.max(0, Number(savedInfo.aimCompleted) || 0),
                    completed: savedInfo.completed === 1 ? 1 : 0,
                    claimed: savedInfo.claimed === 1 ? 1 : 0,
                    points: config.points,
                    effect: config.effect,
                    categoryId: config.categoryId,
                    seriesId: config.seriesId,
                    seriesOrder: config.seriesOrder,
                    stageLevel: config.stageLevel,
                    iconId: config.iconId || config.categoryId,
                    triggerType: config.triggerType,
                    resetOnNewGame: !!config.resetOnNewGame
                };
            }
        }

        // 初始化成就点
        var pointsStr = cc.sys.localStorage.getItem("achievementPoints");
        this._achievementPoints = pointsStr ? Number(pointsStr) : 0;

        // 初始化兑换成就
        var exchangeStr = cc.sys.localStorage.getItem("exchangeAchievements");
        if (exchangeStr) {
            this._exchangeMap = SafetyHelper.safeJSONParse(exchangeStr, null, "Medal.init.exchange");
        } else {
            this._exchangeMap = {};
        }
        if (!this._exchangeMap) {
            this._exchangeMap = {};
        }

        this.save();
        cc.log(JSON.stringify(this._map));
    },
    save: function () {
        cc.sys.localStorage.setItem("medal", JSON.stringify(this._map));
        cc.sys.localStorage.setItem("achievementPoints", this._achievementPoints.toString());
        cc.sys.localStorage.setItem("exchangeAchievements", JSON.stringify(this._exchangeMap));
    },

    // 获取成就点
    getAchievementPoints: function () {
        return this._achievementPoints;
    },

    // 添加成就点
    addAchievementPoints: function (points) {
        this._achievementPoints += points;
        this.save();
    },

    // 消耗成就点
    spendAchievementPoints: function (points) {
        if (this._achievementPoints >= points) {
            this._achievementPoints -= points;
            this.save();
            return true;
        }
        return false;
    },

    // 兑换成就
    exchangeAchievement: function (exchangeId) {
        var config = ExchangeAchievementConfig[exchangeId];
        if (!config) return false;

        if (this._exchangeMap[exchangeId]) {
            return false; // 已兑换
        }

        if (this.spendAchievementPoints(config.cost)) {
            this._exchangeMap[exchangeId] = {unlocked: true, time: Date.now()};
            this.save();
            return true;
        }
        return false;
    },

    // 检查是否已兑换
    isExchanged: function (exchangeId) {
        return !!this._exchangeMap[exchangeId];
    },

    // 取消兑换
    cancelExchange: function (exchangeId) {
        var config = ExchangeAchievementConfig[exchangeId];
        if (!config) return false;

        if (!this._exchangeMap[exchangeId]) {
            return false; // 未兑换过
        }

        delete this._exchangeMap[exchangeId];
        this.addAchievementPoints(config.cost);
        this.save();
        return true;
    },

    // 获取天赋等级
    getTalentLevel: function (talentId) {
        var level = 0;
        for (var exchangeId in this._exchangeMap) {
            var config = ExchangeAchievementConfig[exchangeId];
            if (config && config.type === "talent" && config.targetId === talentId) {
                level = Math.max(level, config.level);
            }
        }
        return level;
    },
    getMedalConfig: function (medalId) {
        return MedalConfig[medalId] || null;
    },
    _compareMedalIds: function (a, b) {
        var configA = MedalConfig[a] || {};
        var configB = MedalConfig[b] || {};
        if ((configA.categoryId || 0) !== (configB.categoryId || 0)) {
            return (configA.categoryId || 0) - (configB.categoryId || 0);
        }
        if ((configA.seriesOrder || 0) !== (configB.seriesOrder || 0)) {
            return (configA.seriesOrder || 0) - (configB.seriesOrder || 0);
        }
        var seriesA = configA.seriesId;
        var seriesB = configB.seriesId;
        var numericSeriesA = Number(seriesA);
        var numericSeriesB = Number(seriesB);
        if (!isNaN(numericSeriesA) && !isNaN(numericSeriesB) && numericSeriesA !== numericSeriesB) {
            return numericSeriesA - numericSeriesB;
        }
        if (String(seriesA) !== String(seriesB)) {
            return String(seriesA) > String(seriesB) ? 1 : -1;
        }
        return (configB.stageLevel || 0) - (configA.stageLevel || 0);
    },
    getMedalIds: function () {
        var self = this;
        return Object.keys(MedalConfig).map(function (medalId) {
            return Number(medalId);
        }).sort(function (a, b) {
            return self._compareMedalIds(a, b);
        });
    },
    getCategoryIds: function () {
        var categoryIds = [];
        this.getMedalIds().forEach(function (medalId) {
            var config = MedalConfig[medalId];
            if (!config) {
                return;
            }
            if (categoryIds.indexOf(config.categoryId) === -1) {
                categoryIds.push(config.categoryId);
            }
        });
        return categoryIds;
    },
    getCategoryIdByMedalId: function (medalId) {
        var config = MedalConfig[medalId];
        return config ? config.categoryId : null;
    },
    getIconIdByMedalId: function (medalId) {
        var config = MedalConfig[medalId];
        return config ? (config.iconId || config.categoryId) : 1;
    },
    getSeriesIdsByCategory: function (categoryId) {
        var seriesIds = [];
        this.getMedalIds().forEach(function (medalId) {
            var config = MedalConfig[medalId];
            if (!config || config.categoryId !== categoryId) {
                return;
            }
            if (seriesIds.indexOf(config.seriesId) === -1) {
                seriesIds.push(config.seriesId);
            }
        });
        return seriesIds;
    },
    getStageIdsBySeries: function (seriesId) {
        var stageIds = [];
        this.getMedalIds().forEach(function (medalId) {
            var config = MedalConfig[medalId];
            if (config && String(config.seriesId) === String(seriesId)) {
                stageIds.push(medalId);
            }
        });
        return stageIds;
    },
    getSeriesCurrentMedalId: function (seriesId) {
        var stageIds = this.getStageIdsBySeries(seriesId);
        if (!stageIds.length) {
            return null;
        }

        for (var i = 0; i < stageIds.length; i++) {
            var stageId = stageIds[i];
            var info = this._map[stageId];
            if (info && info.claimed !== 1) {
                return stageId;
            }
        }

        return stageIds[stageIds.length - 1];
    },
    getSeriesState: function (seriesId) {
        var stageIds = this.getStageIdsBySeries(seriesId);
        var claimedCount = 0;
        var claimableCount = 0;
        var completedCount = 0;
        var activeStageId = null;

        for (var i = 0; i < stageIds.length; i++) {
            var stageId = stageIds[i];
            var info = this._map[stageId];
            if (!info) {
                continue;
            }
            if (info.completed === 1) {
                completedCount++;
            }
            if (info.claimed === 1) {
                claimedCount++;
            }
            if (info.completed === 1 && info.claimed !== 1) {
                claimableCount++;
            }
            if (activeStageId === null && info.claimed !== 1) {
                activeStageId = stageId;
            }
        }

        if (activeStageId === null && stageIds.length > 0) {
            activeStageId = stageIds[stageIds.length - 1];
        }

        return {
            categoryId: stageIds.length ? this.getCategoryIdByMedalId(stageIds[0]) : null,
            iconId: stageIds.length ? this.getIconIdByMedalId(stageIds[0]) : 1,
            stageIds: stageIds,
            activeStageId: activeStageId,
            activeInfo: activeStageId ? this._map[activeStageId] : null,
            claimedCount: claimedCount,
            claimableCount: claimableCount,
            completedCount: completedCount,
            totalCount: stageIds.length,
            allClaimed: stageIds.length > 0 && claimedCount === stageIds.length
        };
    },
    getTotalStageCount: function () {
        return this.getMedalIds().length;
    },
    getClaimedStageCount: function () {
        var total = 0;
        var self = this;
        this.getMedalIds().forEach(function (medalId) {
            var info = self._map[medalId];
            if (info && info.claimed === 1) {
                total++;
            }
        });
        return total;
    },
    getClaimableCountByCategory: function (categoryId) {
        var total = 0;
        var self = this;
        this.getSeriesIdsByCategory(categoryId).forEach(function (seriesId) {
            total += self.getSeriesState(seriesId).claimableCount;
        });
        return total;
    },
    newGameReset: function () {
        var self = this;
        this.getMedalIds().forEach(function (id) {
            var info = self._map[id];
            var config = MedalConfig[id];
            if (info && config && config.resetOnNewGame && !info.completed) {
                info.aimCompleted = 0;
            }
        });
        this.save();
    },
    improve: function (player) {
        this.improveAttr(player);
        this.improveItems(player);
    },
    improveAttr: function (player) {
        var self = this;
        this.getMedalIds().forEach(function (id) {
            var info = self._map[id];
            if (info && info.completed === 1 && info.effect && info.effect.attr && info.effect.attr.hp) {
                cc.log('improveAttr: ' + id);
                player.hp += memoryUtil.changeEncode(info.effect.attr.hp);
                player.hpMaxOrigin += memoryUtil.changeEncode(info.effect.attr.hp);
                player.hpMax = player.hpMaxOrigin;
            }
        });
    },
    getNowMedalIndex: function (index) {
        return this.getSeriesCurrentMedalId(index);
    },
    getCompletedMedalIndex: function (index) {
        if (this._map[index]) {
            return Number(index);
        }

        var completedMedalId = null;
        var stageIds = this.getStageIdsBySeries(index);
        for (var i = 0; i < stageIds.length; i++) {
            var stageId = stageIds[i];
            if (this._map[stageId] && this._map[stageId].completed === 1) {
                completedMedalId = stageId;
            }
        }
        return completedMedalId;
    },
    improveItems: function (player) {
        var self = this;
        this.getMedalIds().forEach(function (id) {
            var info = self._map[id];
            if (info && info.completed === 1 && info.effect && info.effect.items) {
                cc.log('improveItems: ' + id);
                info.effect.items.forEach(function (item) {
                    player.storage.increaseItem(item.itemId, item.num);
                });
            }
        });
    },
    improveTalentItems: function (player) {
        for (var exchangeId in this._exchangeMap) {
            var config = ExchangeAchievementConfig[exchangeId];
            if (config && config.effect && config.effect.items) {
                if (config.type === "talent") {
                    var talentPurchaseId = parseInt(config.targetId);
                    var isActiveTalent = (typeof IAPPackage !== "undefined"
                        && IAPPackage
                        && typeof IAPPackage.hasChosenTalent === "function"
                        && IAPPackage.hasChosenTalent(talentPurchaseId));
                    if (!isActiveTalent) {
                        continue;
                    }
                }
                config.effect.items.forEach(function (item) {
                    var hasInStorage = player.storage.getNumByItemId(item.itemId);
                    var hasInBag = player.bag.getNumByItemId(item.itemId);
                    if (hasInStorage + hasInBag === 0) {
                        cc.log('improveTalentItems: ' + exchangeId + ', itemId: ' + item.itemId);
                        player.storage.increaseItem(item.itemId, item.num);
                    }
                });
            }
        }
    },
    checkCompleted: function (medalInfo, medalId) {
        if (medalInfo && medalInfo.aimCompleted >= medalInfo.aim && medalInfo.completed === 0) {
            medalInfo.completed = 1;
            this.addCompletedForOneGame(Number(medalId));
        }
    },

    // 领取成就奖励
    claimAchievement: function (medalId) {
        var medalInfo = this._map[medalId];
        if (!medalInfo || medalInfo.completed !== 1 || medalInfo.claimed === 1) {
            return false;
        }

        if (medalInfo.points) {
            this._achievementPoints += medalInfo.points;
        }

        medalInfo.claimed = 1;
        this.save();
        return true;
    },
    initCompletedForOneGame: function (isNewGame) {
        var completeOneGame = cc.sys.localStorage.getItem("medalForOneGame");
        if (isNewGame || !completeOneGame) {
            this._completeForOneGame = [];
        } else {
            this._completeForOneGame = SafetyHelper.safeJSONParse(completeOneGame, [], "Medal.initCompletedForOneGame");
        }
        cc.sys.localStorage.setItem("medalForOneGame", JSON.stringify(this._completeForOneGame));
    },
    addCompletedForOneGame: function (medalInfo) {
        if (!this._completeForOneGame) {
            this._completeForOneGame = [];
        }
        this._completeForOneGame.push(medalInfo);
        cc.sys.localStorage.setItem("medalForOneGame", JSON.stringify(this._completeForOneGame));
    },
    getCompletedForOneGame: function () {
        return this._completeForOneGame;
    },
    _increaseTriggerProgress: function (triggerType, value) {
        var amount = Number(value) || 0;
        if (amount <= 0) {
            return;
        }

        var self = this;
        this.getMedalIds().forEach(function (medalId) {
            var config = MedalConfig[medalId];
            var info = self._map[medalId];
            if (!config || !info || config.triggerType !== triggerType || info.completed === 1) {
                return;
            }
            info.aimCompleted += amount;
            self.checkCompleted(info, medalId);
        });
        this.save();
    },
    checkDay: function (day) {
        this._increaseTriggerProgress(MedalTriggerType.DAY, day);
    },
    checkMonsterKilled: function (num) {
        this._increaseTriggerProgress(MedalTriggerType.MONSTER_KILLED, num);
    },
    checkSecretRoomEnd: function (num) {
        this._increaseTriggerProgress(MedalTriggerType.SECRET_ROOM_END, num);
    }

};
