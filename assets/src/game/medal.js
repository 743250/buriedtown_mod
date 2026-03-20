/**
 * Created by lancelot on 15/8/12.
 */
/**
 * Created by lancelot on 15/5/15.
 */

var MedalProgressScope = {
    ACCOUNT: "account",
    RUN: "run"
};

var MedalProgressKey = {
    SURVIVAL_DAYS: "survival_days_run",
    ZOMBIE_KILLS: "zombie_kills_total",
    SECRET_ROOM_END: "secret_room_end_run",
    WEAPON_BROKEN: "weapon_broken_total",
    EXPLOSIVE_KILLS: "explosive_kills_total",
    KATANA_KILLS: "katana_kills_total",
    CANNED_EATEN: "canned_eaten_total",
    MEDICINE_CRAFTED: "medicine_crafted_total",
    MELEE_CRAFTED: "melee_crafted_total",
    EXPLOSIVE_CRAFTED: "explosive_crafted_total",
    DOG_SURVIVAL_DAYS: "dog_survival_days_run"
};

var MedalTrackedItemSet = {
    explosiveBattle: {
        1303012: true,
        1303033: true,
        1303044: true
    },
    medicineCraft: {
        1104011: true,
        1104021: true,
        1104032: true,
        1104043: true
    },
    meleeCraft: {
        1302011: true,
        1302021: true,
        1302032: true,
        1302043: true
    },
    explosiveCraft: {
        1303012: true
    }
};

function createMedalStage(opt) {
    opt = opt || {};
    return {
        categoryId: opt.categoryId,
        seriesId: opt.seriesId,
        seriesOrder: opt.seriesOrder,
        stageLevel: opt.stageLevel,
        iconId: opt.iconId || opt.categoryId,
        progressKey: opt.progressKey || null,
        progressScope: opt.progressScope || MedalProgressScope.ACCOUNT,
        resetOnNewGame: opt.progressScope === MedalProgressScope.RUN,
        aim: opt.aim,
        aimCompleted: 0,
        completed: 0,
        claimed: 0,
        points: opt.points,
        effect: opt.effect || null
    };
}

var MedalConfig = {
    103: createMedalStage({
        categoryId: 1,
        seriesId: 1,
        seriesOrder: 1,
        stageLevel: 3,
        iconId: 1,
        progressKey: MedalProgressKey.SURVIVAL_DAYS,
        progressScope: MedalProgressScope.RUN,
        aim: 40,
        points: 20,
        effect: {items: [{itemId: 1103083, num: 1}]}
    }),
    102: createMedalStage({
        categoryId: 1,
        seriesId: 1,
        seriesOrder: 1,
        stageLevel: 2,
        iconId: 1,
        progressKey: MedalProgressKey.SURVIVAL_DAYS,
        progressScope: MedalProgressScope.RUN,
        aim: 60,
        points: 40,
        effect: {items: [{itemId: 1103083, num: 1}]}
    }),
    101: createMedalStage({
        categoryId: 1,
        seriesId: 1,
        seriesOrder: 1,
        stageLevel: 1,
        iconId: 1,
        progressKey: MedalProgressKey.SURVIVAL_DAYS,
        progressScope: MedalProgressScope.RUN,
        aim: 120,
        points: 60,
        effect: {items: [{itemId: 1103083, num: 2}]}
    }),
    203: createMedalStage({
        categoryId: 2,
        seriesId: 2,
        seriesOrder: 1,
        stageLevel: 3,
        iconId: 2,
        progressKey: MedalProgressKey.ZOMBIE_KILLS,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 100,
        points: 20,
        effect: {attr: {hp: 10}}
    }),
    202: createMedalStage({
        categoryId: 2,
        seriesId: 2,
        seriesOrder: 1,
        stageLevel: 2,
        iconId: 2,
        progressKey: MedalProgressKey.ZOMBIE_KILLS,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 200,
        points: 40,
        effect: {attr: {hp: 10}}
    }),
    201: createMedalStage({
        categoryId: 2,
        seriesId: 2,
        seriesOrder: 1,
        stageLevel: 1,
        iconId: 2,
        progressKey: MedalProgressKey.ZOMBIE_KILLS,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 400,
        points: 60,
        effect: {attr: {hp: 20}}
    }),
    303: createMedalStage({
        categoryId: 3,
        seriesId: 3,
        seriesOrder: 1,
        stageLevel: 3,
        iconId: 3,
        progressKey: MedalProgressKey.SECRET_ROOM_END,
        progressScope: MedalProgressScope.RUN,
        aim: 4,
        points: 100,
        effect: {items: [{itemId: 1305011, num: 30}]}
    }),
    302: createMedalStage({
        categoryId: 3,
        seriesId: 3,
        seriesOrder: 1,
        stageLevel: 2,
        iconId: 3,
        progressKey: MedalProgressKey.SECRET_ROOM_END,
        progressScope: MedalProgressScope.RUN,
        aim: 8,
        points: 200,
        effect: {items: [{itemId: 1301011, num: 1}]}
    }),
    301: createMedalStage({
        categoryId: 3,
        seriesId: 3,
        seriesOrder: 1,
        stageLevel: 1,
        iconId: 3,
        progressKey: MedalProgressKey.SECRET_ROOM_END,
        progressScope: MedalProgressScope.RUN,
        aim: 16,
        points: 300,
        effect: {items: [{itemId: 1301052, num: 1}, {itemId: 1305011, num: 50}]}
    }),
    403: createMedalStage({
        categoryId: 2,
        seriesId: 4,
        seriesOrder: 2,
        stageLevel: 3,
        iconId: 2,
        progressKey: MedalProgressKey.WEAPON_BROKEN,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 30,
        points: 20
    }),
    402: createMedalStage({
        categoryId: 2,
        seriesId: 4,
        seriesOrder: 2,
        stageLevel: 2,
        iconId: 2,
        progressKey: MedalProgressKey.WEAPON_BROKEN,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 50,
        points: 40
    }),
    401: createMedalStage({
        categoryId: 2,
        seriesId: 4,
        seriesOrder: 2,
        stageLevel: 1,
        iconId: 2,
        progressKey: MedalProgressKey.WEAPON_BROKEN,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 70,
        points: 60
    }),
    503: createMedalStage({
        categoryId: 2,
        seriesId: 5,
        seriesOrder: 3,
        stageLevel: 3,
        iconId: 2,
        progressKey: MedalProgressKey.EXPLOSIVE_KILLS,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 20,
        points: 20
    }),
    502: createMedalStage({
        categoryId: 2,
        seriesId: 5,
        seriesOrder: 3,
        stageLevel: 2,
        iconId: 2,
        progressKey: MedalProgressKey.EXPLOSIVE_KILLS,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 40,
        points: 40
    }),
    501: createMedalStage({
        categoryId: 2,
        seriesId: 5,
        seriesOrder: 3,
        stageLevel: 1,
        iconId: 2,
        progressKey: MedalProgressKey.EXPLOSIVE_KILLS,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 60,
        points: 60
    }),
    603: createMedalStage({
        categoryId: 2,
        seriesId: 6,
        seriesOrder: 4,
        stageLevel: 3,
        iconId: 2,
        progressKey: MedalProgressKey.KATANA_KILLS,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 20,
        points: 20
    }),
    602: createMedalStage({
        categoryId: 2,
        seriesId: 6,
        seriesOrder: 4,
        stageLevel: 2,
        iconId: 2,
        progressKey: MedalProgressKey.KATANA_KILLS,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 40,
        points: 40
    }),
    601: createMedalStage({
        categoryId: 2,
        seriesId: 6,
        seriesOrder: 4,
        stageLevel: 1,
        iconId: 2,
        progressKey: MedalProgressKey.KATANA_KILLS,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 60,
        points: 60
    }),
    703: createMedalStage({
        categoryId: 1,
        seriesId: 7,
        seriesOrder: 2,
        stageLevel: 3,
        iconId: 1,
        progressKey: MedalProgressKey.CANNED_EATEN,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 10,
        points: 20
    }),
    702: createMedalStage({
        categoryId: 1,
        seriesId: 7,
        seriesOrder: 2,
        stageLevel: 2,
        iconId: 1,
        progressKey: MedalProgressKey.CANNED_EATEN,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 40,
        points: 40
    }),
    701: createMedalStage({
        categoryId: 1,
        seriesId: 7,
        seriesOrder: 2,
        stageLevel: 1,
        iconId: 1,
        progressKey: MedalProgressKey.CANNED_EATEN,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 80,
        points: 60
    }),
    803: createMedalStage({
        categoryId: 1,
        seriesId: 8,
        seriesOrder: 3,
        stageLevel: 3,
        iconId: 1,
        progressKey: MedalProgressKey.MEDICINE_CRAFTED,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 100,
        points: 20
    }),
    802: createMedalStage({
        categoryId: 1,
        seriesId: 8,
        seriesOrder: 3,
        stageLevel: 2,
        iconId: 1,
        progressKey: MedalProgressKey.MEDICINE_CRAFTED,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 200,
        points: 40
    }),
    801: createMedalStage({
        categoryId: 1,
        seriesId: 8,
        seriesOrder: 3,
        stageLevel: 1,
        iconId: 1,
        progressKey: MedalProgressKey.MEDICINE_CRAFTED,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 300,
        points: 60
    }),
    903: createMedalStage({
        categoryId: 1,
        seriesId: 9,
        seriesOrder: 4,
        stageLevel: 3,
        iconId: 1,
        progressKey: MedalProgressKey.MELEE_CRAFTED,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 40,
        points: 20,
        effect: {durableCraftChanceBonus: 0.02}
    }),
    902: createMedalStage({
        categoryId: 1,
        seriesId: 9,
        seriesOrder: 4,
        stageLevel: 2,
        iconId: 1,
        progressKey: MedalProgressKey.MELEE_CRAFTED,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 60,
        points: 40,
        effect: {durableCraftChanceBonus: 0.02}
    }),
    901: createMedalStage({
        categoryId: 1,
        seriesId: 9,
        seriesOrder: 4,
        stageLevel: 1,
        iconId: 1,
        progressKey: MedalProgressKey.MELEE_CRAFTED,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 80,
        points: 60,
        effect: {durableCraftChanceBonus: 0.02}
    }),
    1203: createMedalStage({
        categoryId: 1,
        seriesId: 12,
        seriesOrder: 5,
        stageLevel: 3,
        iconId: 1,
        progressKey: MedalProgressKey.EXPLOSIVE_CRAFTED,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 10,
        points: 20
    }),
    1202: createMedalStage({
        categoryId: 1,
        seriesId: 12,
        seriesOrder: 5,
        stageLevel: 2,
        iconId: 1,
        progressKey: MedalProgressKey.EXPLOSIVE_CRAFTED,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 20,
        points: 40
    }),
    1201: createMedalStage({
        categoryId: 1,
        seriesId: 12,
        seriesOrder: 5,
        stageLevel: 1,
        iconId: 1,
        progressKey: MedalProgressKey.EXPLOSIVE_CRAFTED,
        progressScope: MedalProgressScope.ACCOUNT,
        aim: 30,
        points: 60
    }),
    1303: createMedalStage({
        categoryId: 1,
        seriesId: 13,
        seriesOrder: 6,
        stageLevel: 3,
        iconId: 1,
        progressKey: MedalProgressKey.DOG_SURVIVAL_DAYS,
        progressScope: MedalProgressScope.RUN,
        aim: 20,
        points: 20
    }),
    1302: createMedalStage({
        categoryId: 1,
        seriesId: 13,
        seriesOrder: 6,
        stageLevel: 2,
        iconId: 1,
        progressKey: MedalProgressKey.DOG_SURVIVAL_DAYS,
        progressScope: MedalProgressScope.RUN,
        aim: 40,
        points: 40
    }),
    1301: createMedalStage({
        categoryId: 1,
        seriesId: 13,
        seriesOrder: 6,
        stageLevel: 1,
        iconId: 1,
        progressKey: MedalProgressKey.DOG_SURVIVAL_DAYS,
        progressScope: MedalProgressScope.RUN,
        aim: 60,
        points: 60
    })
};

var MedalLegacyProgressMap = [
    {
        progressKey: MedalProgressKey.SURVIVAL_DAYS,
        progressScope: MedalProgressScope.RUN,
        stageIds: [103, 102, 101]
    },
    {
        progressKey: MedalProgressKey.ZOMBIE_KILLS,
        progressScope: MedalProgressScope.ACCOUNT,
        stageIds: [203, 202, 201]
    },
    {
        progressKey: MedalProgressKey.SECRET_ROOM_END,
        progressScope: MedalProgressScope.RUN,
        stageIds: [303, 302, 301]
    }
];

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

function normalizeMedalTrackedItemId(itemId) {
    itemId = parseInt(itemId);
    if (typeof WeaponCraftService !== "undefined"
        && WeaponCraftService
        && typeof WeaponCraftService.getBaseItemId === "function") {
        itemId = WeaponCraftService.getBaseItemId(itemId);
    }
    return itemId;
}

function medalDebugLog(msg) {
    if (typeof cc !== "undefined" && cc && typeof cc.log === "function") {
        cc.log(msg);
    }
}

var Medal = {
    _map: null,
    _progress: null,
    _achievementPoints: 0,
    _exchangeMap: null,

    init: function () {
        var savedMap = null;
        var savedProgress = null;
        if (!this._map) {
            var medalStr = cc.sys.localStorage.getItem("medal");
            if (medalStr) {
                savedMap = SafetyHelper.safeJSONParse(medalStr, null, "Medal.init.medal");
            }
            if (!savedMap) {
                savedMap = {};
            }

            var progressStr = cc.sys.localStorage.getItem("medalProgress");
            if (progressStr) {
                savedProgress = SafetyHelper.safeJSONParse(progressStr, null, "Medal.init.progress");
            }
            this._progress = this._normalizeProgressMap(savedProgress);
            this._migrateLegacyProgress(savedMap);

            this._map = {};
            for (var medalId in MedalConfig) {
                if (!MedalConfig.hasOwnProperty(medalId)) {
                    continue;
                }
                var config = MedalConfig[medalId];
                var savedInfo = savedMap[medalId] || {};
                var completed = (savedInfo.completed === 1 || savedInfo.claimed === 1) ? 1 : 0;
                var claimed = savedInfo.claimed === 1 ? 1 : 0;
                var aimCompleted = this._resolveAimCompleted(config, savedInfo, completed);

                this._map[medalId] = {
                    aim: config.aim,
                    aimCompleted: aimCompleted,
                    completed: completed,
                    claimed: claimed,
                    points: config.points,
                    effect: config.effect,
                    categoryId: config.categoryId,
                    seriesId: config.seriesId,
                    seriesOrder: config.seriesOrder,
                    stageLevel: config.stageLevel,
                    iconId: config.iconId || config.categoryId,
                    progressKey: config.progressKey || null,
                    progressScope: config.progressScope || MedalProgressScope.ACCOUNT,
                    resetOnNewGame: !!config.resetOnNewGame
                };

                if (!completed) {
                    this.checkCompleted(this._map[medalId], medalId, {silent: true});
                }
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
        medalDebugLog(JSON.stringify(this._map));
    },
    _ensureState: function () {
        if (!this._map) {
            this.init();
        }
    },
    _ensureExchangeState: function () {
        if (this._exchangeMap === undefined || this._exchangeMap === null) {
            var exchangeStr = cc.sys.localStorage.getItem("exchangeAchievements");
            this._exchangeMap = exchangeStr
                ? SafetyHelper.safeJSONParse(exchangeStr, {}, "Medal.ensureExchangeState.exchange")
                : {};
            if (!this._exchangeMap) {
                this._exchangeMap = {};
            }
        }

        var points = Number(this._achievementPoints);
        if (!isFinite(points) || points < 0) {
            var pointsStr = cc.sys.localStorage.getItem("achievementPoints");
            this._achievementPoints = pointsStr ? Number(pointsStr) : 0;
            if (!isFinite(this._achievementPoints) || this._achievementPoints < 0) {
                this._achievementPoints = 0;
            }
        }
    },
    _normalizeProgressMap: function (savedProgress) {
        savedProgress = savedProgress || {};
        return {
            account: savedProgress.account || {},
            run: savedProgress.run || {}
        };
    },
    _getProgressBucket: function (scope) {
        this._progress = this._progress || {account: {}, run: {}};
        if (scope === MedalProgressScope.RUN) {
            this._progress.run = this._progress.run || {};
            return this._progress.run;
        }
        this._progress.account = this._progress.account || {};
        return this._progress.account;
    },
    _getProgressValue: function (progressKey, scope) {
        if (!progressKey) {
            return 0;
        }
        var bucket = this._getProgressBucket(scope);
        return Math.max(0, Number(bucket[progressKey]) || 0);
    },
    _setProgressValue: function (progressKey, scope, value) {
        if (!progressKey) {
            return;
        }
        var bucket = this._getProgressBucket(scope);
        bucket[progressKey] = Math.max(0, Number(value) || 0);
    },
    _hasStoredProgressValue: function (progressKey, scope) {
        if (!progressKey) {
            return false;
        }
        var bucket = this._getProgressBucket(scope);
        return bucket.hasOwnProperty(progressKey);
    },
    _migrateLegacyProgress: function (savedMap) {
        var self = this;
        MedalLegacyProgressMap.forEach(function (migration) {
            if (!migration || !migration.progressKey || self._hasStoredProgressValue(migration.progressKey, migration.progressScope)) {
                return;
            }

            var migratedValue = 0;
            migration.stageIds.forEach(function (stageId) {
                var savedInfo = savedMap[stageId] || {};
                var config = MedalConfig[stageId] || {};
                var stageValue = Math.max(0, Number(savedInfo.aimCompleted) || 0);
                if (savedInfo.completed === 1 || savedInfo.claimed === 1) {
                    stageValue = Math.max(stageValue, Number(config.aim) || 0);
                }
                migratedValue = Math.max(migratedValue, stageValue);
            });

            if (migratedValue > 0) {
                self._setProgressValue(migration.progressKey, migration.progressScope, migratedValue);
            }
        });
    },
    _resolveAimCompleted: function (config, savedInfo, completed) {
        var aimCompleted = 0;
        if (config && config.progressKey) {
            aimCompleted = this._getProgressValue(config.progressKey, config.progressScope);
        } else {
            aimCompleted = Math.max(0, Number(savedInfo.aimCompleted) || 0);
        }

        if (completed) {
            aimCompleted = Math.max(aimCompleted, Number(config.aim) || 0);
        }
        return aimCompleted;
    },
    _syncProgressForMedal: function (medalId, options) {
        options = options || {};
        var config = MedalConfig[medalId];
        var info = this._map[medalId];
        if (!config || !info || !config.progressKey) {
            return;
        }

        var currentValue = this._getProgressValue(config.progressKey, config.progressScope);
        info.aimCompleted = info.completed === 1 ? Math.max(currentValue, info.aim) : currentValue;
        this.checkCompleted(info, medalId, options);
    },
    _applyProgressDeltas: function (deltaList, options) {
        options = options || {};
        this._ensureState();

        if (!Array.isArray(deltaList) || deltaList.length === 0) {
            return;
        }

        var touchedKeys = {};
        var hasChange = false;
        var self = this;
        deltaList.forEach(function (delta) {
            if (!delta || !delta.progressKey) {
                return;
            }

            var amount = Number(delta.amount) || 0;
            if (amount <= 0) {
                return;
            }

            var scope = delta.progressScope || MedalProgressScope.ACCOUNT;
            var bucket = self._getProgressBucket(scope);
            bucket[delta.progressKey] = Math.max(0, (Number(bucket[delta.progressKey]) || 0) + amount);
            touchedKeys[scope + ":" + delta.progressKey] = true;
            hasChange = true;
        });

        if (!hasChange) {
            return;
        }

        this.getMedalIds().forEach(function (medalId) {
            var config = MedalConfig[medalId];
            if (!config || !config.progressKey) {
                return;
            }
            if (touchedKeys[config.progressScope + ":" + config.progressKey]) {
                self._syncProgressForMedal(medalId, options);
            }
        });
        this.save();
    },
    save: function () {
        if (this._map) {
            cc.sys.localStorage.setItem("medal", JSON.stringify(this._map));
        }
        if (this._progress) {
            cc.sys.localStorage.setItem("medalProgress", JSON.stringify(this._progress));
        }
        cc.sys.localStorage.setItem("achievementPoints", this._achievementPoints.toString());
        cc.sys.localStorage.setItem("exchangeAchievements", JSON.stringify(this._exchangeMap));
    },

    // 获取成就点
    getAchievementPoints: function () {
        this._ensureExchangeState();
        return this._achievementPoints;
    },

    // 添加成就点
    addAchievementPoints: function (points) {
        this._ensureExchangeState();
        this._achievementPoints += points;
        this.save();
    },

    // 消耗成就点
    spendAchievementPoints: function (points) {
        this._ensureExchangeState();
        if (this._achievementPoints >= points) {
            this._achievementPoints -= points;
            this.save();
            return true;
        }
        return false;
    },

    // 兑换成就
    exchangeAchievement: function (exchangeId) {
        this._ensureExchangeState();
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
        this._ensureExchangeState();
        return !!this._exchangeMap[exchangeId];
    },

    // 获取天赋等级
    getTalentLevel: function (talentId) {
        this._ensureExchangeState();
        var level = 0;
        for (var exchangeId in this._exchangeMap) {
            if (!this._exchangeMap.hasOwnProperty(exchangeId)) {
                continue;
            }
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
    getTotalClaimableCount: function () {
        var self = this;
        return this.getCategoryIds().reduce(function (sum, categoryId) {
            return sum + self.getClaimableCountByCategory(categoryId);
        }, 0);
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
        this._ensureState();
        var resetProgressKeys = {};
        var self = this;
        this.getMedalIds().forEach(function (id) {
            var config = MedalConfig[id];
            if (config && config.progressScope === MedalProgressScope.RUN && config.progressKey) {
                resetProgressKeys[config.progressKey] = true;
            }
        });

        Object.keys(resetProgressKeys).forEach(function (progressKey) {
            self._setProgressValue(progressKey, MedalProgressScope.RUN, 0);
        });

        this.getMedalIds().forEach(function (id) {
            var config = MedalConfig[id];
            var info = self._map[id];
            if (!config || !info || config.progressScope !== MedalProgressScope.RUN) {
                return;
            }
            self._syncProgressForMedal(id, {silent: true});
        });
        this.save();
    },
    improve: function (player) {
        this._ensureState();
        this.improveAttr(player);
        this.improveItems(player);
    },
    improveAttr: function (player) {
        var self = this;
        this.getMedalIds().forEach(function (id) {
            var info = self._map[id];
            if (info && info.completed === 1 && info.effect && info.effect.attr && info.effect.attr.hp) {
                medalDebugLog("improveAttr: " + id);
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
                medalDebugLog("improveItems: " + id);
                info.effect.items.forEach(function (item) {
                    player.storage.increaseItem(item.itemId, item.num);
                });
            }
        });
    },
    improveTalentItems: function (player) {
        this._ensureState();
        for (var exchangeId in this._exchangeMap) {
            if (!this._exchangeMap.hasOwnProperty(exchangeId)) {
                continue;
            }
            var config = ExchangeAchievementConfig[exchangeId];
            if (config && config.effect && config.effect.items) {
                if (config.type === "talent") {
                    var talentPurchaseId = parseInt(config.targetId);
                    var isActiveTalent = (typeof TalentService !== "undefined"
                        && TalentService
                        && typeof TalentService.hasChosenTalent === "function"
                        && TalentService.hasChosenTalent(talentPurchaseId));
                    if (!isActiveTalent) {
                        continue;
                    }
                }
                config.effect.items.forEach(function (item) {
                    var hasInStorage = player.storage.getNumByItemId(item.itemId);
                    var hasInBag = player.bag.getNumByItemId(item.itemId);
                    if (hasInStorage + hasInBag === 0) {
                        medalDebugLog("improveTalentItems: " + exchangeId + ", itemId: " + item.itemId);
                        player.storage.increaseItem(item.itemId, item.num);
                    }
                });
            }
        }
    },
    getDurableCraftChanceBonus: function () {
        this._ensureState();
        var totalBonus = 0;
        var self = this;
        this.getMedalIds().forEach(function (medalId) {
            var info = self._map[medalId];
            if (!info || info.completed !== 1 || !info.effect) {
                return;
            }
            totalBonus += Number(info.effect.durableCraftChanceBonus) || 0;
        });
        return totalBonus;
    },
    checkCompleted: function (medalInfo, medalId, options) {
        options = options || {};
        if (medalInfo && medalInfo.aimCompleted >= medalInfo.aim && medalInfo.completed === 0) {
            medalInfo.completed = 1;
            medalInfo.aimCompleted = Math.max(medalInfo.aimCompleted, medalInfo.aim);
            if (!options.silent) {
                this.addCompletedForOneGame(Number(medalId));
            }
        }
    },

    // 领取成就奖励
    claimAchievement: function (medalId) {
        this._ensureState();
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
    trackProgress: function (progressKey, value, progressScope) {
        this._applyProgressDeltas([{
            progressKey: progressKey,
            progressScope: progressScope,
            amount: value
        }]);
    },
    trackBattleResult: function (summary) {
        summary = summary || {};
        this._applyProgressDeltas([
            {
                progressKey: MedalProgressKey.ZOMBIE_KILLS,
                progressScope: MedalProgressScope.ACCOUNT,
                amount: summary.monsterKilledNum
            },
            {
                progressKey: MedalProgressKey.EXPLOSIVE_KILLS,
                progressScope: MedalProgressScope.ACCOUNT,
                amount: summary.explosiveKilledNum
            },
            {
                progressKey: MedalProgressKey.KATANA_KILLS,
                progressScope: MedalProgressScope.ACCOUNT,
                amount: summary.katanaKilledNum
            }
        ]);
    },
    trackWeaponBroken: function (itemId, num) {
        if (!itemId) {
            return;
        }
        this.trackProgress(MedalProgressKey.WEAPON_BROKEN, num || 1, MedalProgressScope.ACCOUNT);
    },
    trackConsumedItem: function (itemId, num) {
        itemId = normalizeMedalTrackedItemId(itemId);
        if (itemId !== 1103083) {
            return;
        }
        this.trackProgress(MedalProgressKey.CANNED_EATEN, num || 1, MedalProgressScope.ACCOUNT);
    },
    trackProducedItems: function (produceList) {
        if (!Array.isArray(produceList) || produceList.length === 0) {
            return;
        }

        var medicineCount = 0;
        var meleeCount = 0;
        var explosiveCount = 0;
        produceList.forEach(function (itemInfo) {
            if (!itemInfo) {
                return;
            }
            var itemId = normalizeMedalTrackedItemId(itemInfo.itemId);
            var amount = Math.max(0, parseInt(itemInfo.num, 10) || 0);
            if (amount <= 0) {
                return;
            }

            if (MedalTrackedItemSet.medicineCraft[itemId]) {
                medicineCount += amount;
            }
            if (MedalTrackedItemSet.meleeCraft[itemId]) {
                meleeCount += amount;
            }
            if (MedalTrackedItemSet.explosiveCraft[itemId]) {
                explosiveCount += amount;
            }
        });

        this._applyProgressDeltas([
            {
                progressKey: MedalProgressKey.MEDICINE_CRAFTED,
                progressScope: MedalProgressScope.ACCOUNT,
                amount: medicineCount
            },
            {
                progressKey: MedalProgressKey.MELEE_CRAFTED,
                progressScope: MedalProgressScope.ACCOUNT,
                amount: meleeCount
            },
            {
                progressKey: MedalProgressKey.EXPLOSIVE_CRAFTED,
                progressScope: MedalProgressScope.ACCOUNT,
                amount: explosiveCount
            }
        ]);
    },
    checkDay: function (day) {
        this.trackProgress(MedalProgressKey.SURVIVAL_DAYS, day, MedalProgressScope.RUN);
    },
    checkDogSurvivalDay: function (day) {
        this.trackProgress(MedalProgressKey.DOG_SURVIVAL_DAYS, day, MedalProgressScope.RUN);
    },
    checkMonsterKilled: function (num) {
        this.trackProgress(MedalProgressKey.ZOMBIE_KILLS, num, MedalProgressScope.ACCOUNT);
    },
    checkSecretRoomEnd: function (num) {
        this.trackProgress(MedalProgressKey.SECRET_ROOM_END, num, MedalProgressScope.RUN);
    }

};
