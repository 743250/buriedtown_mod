// Runtime fallback: some script packs may miss constants.js in load order.
var PlayerAttrRuntime = (typeof PlayerAttr !== "undefined" && PlayerAttr) ? PlayerAttr : {
    HP_INIT: 240,
    HP_MAX: 240,
    SPIRIT_INIT: 100,
    SPIRIT_MAX: 100,
    STARVE_INIT: 50,
    STARVE_MAX: 100,
    VIGOUR_INIT: 100,
    VIGOUR_MAX: 100,
    INJURY_INIT: 0,
    INJURY_MAX: 100,
    INFECT_INIT: 0,
    INFECT_MAX: 100,
    TEMPERATURE_MAX: 100
};

var PlayerAttrEffectRuntime = (typeof playerAttrEffect !== "undefined" && playerAttrEffect) ? playerAttrEffect : {};

var AttrHelperRuntime = (typeof AttrHelper !== "undefined" && AttrHelper) ? AttrHelper : {
    get: function (obj, key) {
        return memoryUtil.decode(obj[key]);
    },
    set: function (obj, key, value) {
        var max = memoryUtil.decode(obj[key + "Max"]);
        obj[key] = memoryUtil.encode(Math.max(0, Math.min(value, max)));
    },
    change: function (obj, key, delta) {
        var current = this.get(obj, key);
        this.set(obj, key, current + delta);
    },
    getPercentage: function (obj, key) {
        return this.get(obj, key) / this.get(obj, key + "Max");
    },
    isMax: function (obj, key) {
        return this.get(obj, key) === this.get(obj, key + "Max");
    },
    saveAttrs: function (obj, keys) {
        var result = {};
        keys.forEach(function (key) {
            result[key] = memoryUtil.decode(obj[key]);
            if (obj[key + "Max"] !== undefined) {
                result[key + "Max"] = memoryUtil.decode(obj[key + "Max"]);
            }
        });
        return result;
    },
    restoreAttrs: function (obj, data, keys) {
        keys.forEach(function (key) {
            if (data[key] !== undefined) {
                obj[key] = memoryUtil.encode(data[key]);
            }
            if (data[key + "Max"] !== undefined) {
                obj[key + "Max"] = memoryUtil.encode(data[key + "Max"]);
            }
        });
    }
};

var Player = cc.Class.extend({
    ctor: function () {
        this.config = utils.clone(playerConfig);

        this.hp = memoryUtil.encode(PlayerAttrRuntime.HP_INIT);
        this.hpMaxOrigin = memoryUtil.encode(PlayerAttrRuntime.HP_MAX);
        this.hpMax = this.hpMaxOrigin;
        this.spirit = memoryUtil.encode(PlayerAttrRuntime.SPIRIT_INIT);
        this.spiritMax = memoryUtil.encode(PlayerAttrRuntime.SPIRIT_MAX);
        this.starve = memoryUtil.encode(PlayerAttrRuntime.STARVE_INIT);
        this.starveMax = memoryUtil.encode(PlayerAttrRuntime.STARVE_MAX);
        this.vigour = memoryUtil.encode(PlayerAttrRuntime.VIGOUR_INIT);
        this.vigourMax = memoryUtil.encode(PlayerAttrRuntime.VIGOUR_MAX);
        this.injury = memoryUtil.encode(PlayerAttrRuntime.INJURY_INIT);
        this.injuryMax = memoryUtil.encode(PlayerAttrRuntime.INJURY_MAX);
        this.infect = memoryUtil.encode(PlayerAttrRuntime.INFECT_INIT);
        this.infectMax = memoryUtil.encode(PlayerAttrRuntime.INFECT_MAX);
        this.temperature = memoryUtil.encode(this.initTemperature());
        this.temperatureMax = memoryUtil.encode(PlayerAttrRuntime.TEMPERATURE_MAX);


        //睡眠状态
        this.isInSleep = false;
        //服药状态
        this.cured = false;
        //包扎状态
        this.binded = false;

        //是否因为感染死亡
        this.deathCausedInfect = false;

        //战斗前状态记录
        this.battleRecord = null;

        this.bag = new Bag('player');
        this.storage = new Storage('player');

        this.dog = new Dog();
        this.room = new Room();
        this.equip = new Equipment();
        this.npcManager = new NPCManager();
        this.map = new Map();
        this.ziplineNetwork = new ZiplineNetworkService();
        this.log = new Log();
        this.weather = new WeatherSystem();
        this.buffManager = new BuffManager();
        this.navigationState = new PlayerNavigationState();
        this.runtime = GameRuntime;

        this.setting = {};
        this._attrRangeCache = {};

        this.roleType = role.getChoosenRoleType();
        this.isBombActive = false;
    },

    save: function () {
        return PlayerPersistenceService.buildSaveData(this, AttrHelperRuntime);
    },

    restore: function () {
        return PlayerPersistenceService.restore(this, AttrHelperRuntime);
    },

    getRuntime: function () {
        return this.runtime || GameRuntime;
    },

    getTimer: function () {
        var runtime = this.getRuntime();
        if (runtime && typeof runtime.getTimer === "function") {
            return runtime.getTimer();
        }
        return cc.timer;
    },

    getRecord: function () {
        var runtime = this.getRuntime();
        if (runtime && typeof runtime.getRecord === "function") {
            return runtime.getRecord();
        }
        return Record;
    },

    getEmitter: function () {
        var runtime = this.getRuntime();
        if (runtime && typeof runtime.getEmitter === "function") {
            return runtime.getEmitter();
        }
        return utils.emitter;
    },

    //包扎
    bindUp: function () {
        this.binded = true;
        this.bindTime = this.getTimer().now();
    },
    //包扎状态不可以再包扎
    isInBind: function () {
        return this.binded;
    },

    //服药
    cure: function () {
        this.cured = true;
        this.cureTime = this.getTimer().now();
    },

    //服药状态可以再服药
    isInCure: function () {
        return this.cured;
    },

    goHome: function () {
        this.navigationState.goHome();
    },

    enterWorldMap: function () {
        this.navigationState.enterWorldMap();
    },
    out: function () {
        this.enterWorldMap();
    },

    enterSite: function (siteId) {
        this.navigationState.enterSite(siteId);
    },
    leaveSite: function () {
        this.navigationState.leaveSite();
    },
    outSite: function () {
        this.leaveSite();
    },
    arriveAtMapEntity: function (entityId) {
        this.navigationState.arriveAtMapEntity(entityId);
    },
    isAtHome: function () {
        return this.navigationState.isAtHome();
    },
    isAtSite: function () {
        return this.navigationState.isAtSite();
    },
    getCurrentSiteId: function () {
        return this.navigationState.getActiveSiteId();
    },
    getCurrentMapEntityId: function () {
        return this.navigationState.getMapEntityId();
    },
    getCurrentMapEntityKey: function () {
        return this.navigationState.getMapEntityKey();
    },

    sleep: function () {
        this.isInSleep = true;
    },
    wakeUp: function () {
        this.isInSleep = false;
    },

    isAttrChangeGood: function (key, value) {
        return PlayerAttrService.isAttrChangeGood(key, value);
    },

    _getBlockedBuffInfoByAttr: function (key) {
        return PlayerAttrService.getBlockedBuffInfoByAttr(key);
    },

    _isAttrChangeBlockedByBuff: function (key, value) {
        return PlayerAttrService.isAttrChangeBlockedByBuff(this, key, value);
    },

    _normalizeAttrChangeValue: function (key, value) {
        return PlayerAttrService.normalizeAttrChangeValue(key, value);
    },

    _applyAttrChangeValue: function (key, value) {
        return PlayerAttrService.applyAttrChangeValue(this, key, value);
    },

    _playAttrRangeTransitionEffect: function (key, isLevelUp) {
        PlayerAttrService.playAttrRangeTransitionEffect(key, isLevelUp);
    },

    _emitAttrRangeTransition: function (key, beforeRangeInfo, afterRangeInfo) {
        PlayerAttrService.emitAttrRangeTransition(this, key, beforeRangeInfo, afterRangeInfo);
    },

    _onAttrChanged: function (key) {
        PlayerAttrService.onAttrChanged(this, key);
    },

    isAttrMax: function (key) {
        return AttrHelperRuntime.isMax(this, key);
    },

    getAttrPercentage: function (key) {
        return AttrHelperRuntime.getPercentage(this, key);
    },

    changeAttr: function (key, value) {
        PlayerAttrService.changeAttr(this, key, value);
    },
    changeHp: function (value) {
        this.changeAttr("hp", value);
    },

    changeStarve: function (value) {
        this.changeAttr("starve", value);
    },

    changeSpirit: function (value) {
        this.changeAttr("spirit", value);
    },

    changeVigour: function (value) {
        this.changeAttr("vigour", value);
    },

    changeInjury: function (value) {
        this.changeAttr("injury", value);
    },

    changeInfect: function (value) {
        this.changeAttr("infect", value);
    },

    changeTemperature: function (value) {
        this.changeAttr("temperature", value);
    },

    updateHpMax: function () {
        PlayerAttrService.updateHpMax(this);
    },

    _getHourlyStarveChange: function (changeConfig) {
        return PlayerAttrService.getHourlyStarveChange(this, changeConfig);
    },

    _getHourlyVigourChange: function (changeConfig) {
        return PlayerAttrService.getHourlyVigourChange(this, changeConfig);
    },

    _applySleepRecoveryByHour: function () {
        return PlayerAttrService.applySleepRecoveryByHour(this);
    },

    _applyHourlyWeatherAttrChange: function () {
        return PlayerAttrService.applyHourlyWeatherAttrChange(this);
    },

    updateByTime: function () {
        return PlayerAttrService.updateByTime(this);
    },

    _getRangeEffect: function (attr, value) {
        return PlayerAttrService.getRangeEffect(this, attr, value);
    },

    _applyEffectMap: function (effectMap, opt) {
        return PlayerAttrService.applyEffectMap(this, effectMap, opt);
    },

    updateStarve: function () {
        return PlayerAttrService.updateStarve(this);
    },

    updateInfect: function () {
        return PlayerAttrService.updateInfect(this);
    },

    updateVigour: function () {
        return PlayerAttrService.updateVigour(this);
    },

    updateInjure: function () {
        return PlayerAttrService.updateInjure(this);
    },

    updateTemperature: function () {
        return PlayerAttrService.updateTemperature(this);
    },

    updateTemperatureEffect: function () {
        return PlayerAttrService.updateTemperatureEffect(this);
    },

    initTemperature: function () {
        return PlayerAttrService.initTemperature(this);
    },

    cost: function (list) {
        var self = this;
        list.forEach(function (itemInfo) {
            self.storage.decreaseItem(itemInfo.itemId, itemInfo.num);
        });
    },

    getAttrRangeInfo: function (attr, value) {
        var res;
        var config = PlayerAttrEffectRuntime[attr];
        if (config) {
            value = memoryUtil.decode(value);
            var attrRangeCache = this._attrRangeCache[attr];
            if (!attrRangeCache) {
                attrRangeCache = {};
                this._attrRangeCache[attr] = attrRangeCache;
            }
            for (var rangeId in config) {
                var range = attrRangeCache[rangeId];
                if (!range) {
                    range = new Range(config[rangeId].range);
                    attrRangeCache[rangeId] = range;
                }
                if (range.isInRange(value)) {
                    res = config[rangeId];
                    break;
                }
            }
        }
        return res;
    },

    getAttrStr: function (attr, value) {
        var value = value === undefined ? this[attr] : value;
        var attrRangeInfo = this.getAttrRangeInfo(attr, value);
        if (attrRangeInfo) {
            var res = stringUtil.getString(attr + "_name")[Number(attrRangeInfo.id) - 1];
            return res ? res : "";
        } else {
            return "";
        }
    },

    gainItems: function (items) {
        var self = this;
        items.forEach(function (item) {
            self.storage.increaseItem(item.itemId, item.num);
        });
    },

    gainItemsInBag: function (items) {
        var self = this;
        items.forEach(function (item) {
            self.bag.increaseItem(item.itemId, item.num);
        });
    },

    costItems: function (items) {
        var self = this;
        items.forEach(function (item) {
            self.storage.decreaseItem(item.itemId, item.num);
        });
    },

    validateItems: function (items) {
        var self = this;
        var res = true;
        items.forEach(function (item) {
            item.haveNum = self.storage.getNumByItemId(item.itemId);
            if (!self.storage.validateItem(item.itemId, item.num)) {
                res = false;
            }
        });
        return res;
    },

    costItemsInBag: function (items) {
        var self = this;
        items.forEach(function (item) {
            self.bag.decreaseItem(item.itemId, item.num);
        });
    },

    validateItemsInBag: function (items) {
        var self = this;
        var res = true;
        items.forEach(function (item) {
            item.haveNum = self.bag.getNumByItemId(item.itemId);
            if (!self.bag.validateItem(item.itemId, item.num)) {
                res = false;
            }
        });
        return res;
    },

    useItem: function (storage, itemId) {
        cc.e("useItem " + itemId);
        if (storage.validateItem(itemId, 1)) {
            var item = storage.getItem(itemId);
            var itemName = stringUtil.getString(itemId).title;
            if (item.isType(ItemType.TOOL, ItemType.FOOD)) {
                if (!uiUtil.checkStarve())
                    return {result: false};
                storage.decreaseItem(itemId, 1);
                this.log.addMsg(1093, itemName, storage.getNumByItemId(itemId));
                this.itemEffect(item, item.getFoodEffect());
                return {result: true};
            } else if (item.isType(ItemType.TOOL, ItemType.MEDICINE)) {
                if (itemId == 1104011) {
                    storage.decreaseItem(itemId, 1);
                    this.log.addMsg(1094, itemName, storage.getNumByItemId(itemId));
                    this.itemEffect(item, item.getMedicineEffect());
                    this.bindUp();
                } else {
                    storage.decreaseItem(itemId, 1);
                    this.log.addMsg(1095, itemName, storage.getNumByItemId(itemId));
                    if (itemId == 1104032) {
                        var res = this.item1104032Effect(item, item.getMedicineEffect());
                        if (res) {
                            this.cure();
                        }
                    } else {
                        this.itemEffect(item, item.getMedicineEffect());
                        this.cure();
                    }
                }
                return {result: true};
            } else if (item.isType(ItemType.TOOL, ItemType.BUFF)) {
                storage.decreaseItem(itemId, 1);
                this.log.addMsg(1095, itemName, storage.getNumByItemId(itemId));
                this.buffManager.applyBuff(itemId);
                return {result: true};
            } else {
                return {result: false, type: 2, msg: "this type can't use"};
            }
        } else {
            return {result: false, type: 1, msg: "not enough"};
        }
    },
    //自制青霉素的使用,如果扣血成功,则不发生治疗效果
    item1104032Effect: function (item, obj) {
        var hpChance = obj.hp_chance;
        var rand = Math.random();
        cc.log(" hpChance=" + hpChance + " rand=" + rand)
        if (rand <= hpChance) {
            cc.log("1104032 worked");
            this.changeHp(obj.hp);
            return false;
        } else {
            var newObj = {};
            for (var key in obj) {
                if (key.indexOf("hp") == -1) {
                    newObj[key] = obj[key];
                }
            }
            this.itemEffect(item, newObj);
            return true;
        }
    },
    applyEffect: function (obj) {
        var badEffect = [];
        for (var key in obj) {
            if (this.hasOwnProperty(key)) {
                var chance = obj[key + "_chance"];
                var rand = Math.random();
                cc.log(key + " chance=" + chance + " rand=" + rand)
                if (rand <= chance) {
                    cc.log("worked");
                    var funName = cc.formatStr("change%s%s", key.substr(0, 1).toUpperCase(), key.substr(1));
                    cc.log(funName);
                    var changeValue = obj[key];
                    this[funName](changeValue);
                    if (!this.isAttrChangeGood(key, changeValue)) {
                        badEffect.push({
                            attrName: key,
                            changeValue: changeValue
                        });
                    }
                }
            }
        }
        return badEffect;
    },

    itemEffect: function (item, obj) {
        var badEffect = this.applyEffect(obj);

        if (badEffect.length > 0) {
            var str = "";
            badEffect.forEach(function (obj) {
                str += stringUtil.getString(obj.attrName) + ":" + obj.changeValue + " ";
            });
            this.log.addMsg(1107, stringUtil.getString(item.id).title, str);
        }
    },

    _getAttackInNightStrength: function () {
        var timeObj = this.getTimer().formatTime();
        var strength = 0;
        for (var i = 0; i < MoonlightingConfig.strength.length; i++) {
            var strengthObj = MoonlightingConfig.strength[i];
            if (timeObj.d >= strengthObj.day[0] && timeObj.d <= (strengthObj.day[1] ? strengthObj.day[1] : Number.MAX_VALUE)) {
                strength = utils.getRandomInt(strengthObj.strength[0], strengthObj.strength[1]);
                break;
            }
        }
        return strength;
    },
    _getHomeDef: function () {
        //家的防御 = 栅栏等级*n + 狗(活跃+15)
        var homeDef = 0;
        var level = this.room.getBuildLevel(11);
        if (level >= 0) {
            homeDef += (level + 1) * 10;
        }
        if (this.dog.isActive()) {
            homeDef += 15;
        }
        return homeDef;
    },
    _getAttackResult: function (attackStrength, def, causeStorage) {
        var res = {};
        cc.d("monster strength=" + attackStrength + " def=" + def);
        if (attackStrength > def) {
            var produceValue = attackStrength / 5 - 1 + 3;
            cc.i("moonlighting defeat value=" + produceValue);
            var tmpStorage = new Storage();
            var tmpBlackList = blackList.storageLost.concat();
            while (produceValue > 0 && !causeStorage.isEmpty()) {

                var ids = Object.keys(causeStorage.map);
                var haveIds = Object.keys(tmpStorage.map);

                haveIds.forEach(function (id) {
                    var num = tmpStorage.getNumByItemId(id);
                    if (num >= 5 && tmpBlackList.indexOf(Number(id)) === -1) {
                        tmpBlackList.push(Number(id));
                    }
                });

                ids = ids.filter(function (id) {
                    return tmpBlackList.indexOf(Number(id)) === -1
                });

                if (haveIds.length >= 6) {
                    ids = ids.filter(function (id) {
                        return haveIds.indexOf(Number(id)) !== -1
                    });
                }

                if (ids.length > 0) {
                    var itemId = ids[utils.getRandomInt(0, ids.length - 1)];
                    if (causeStorage.validateItem(itemId, 1)) {
                        causeStorage.decreaseItem(itemId, 1);
                        tmpStorage.increaseItem(itemId, 1);
                        var value = itemConfig[itemId].value;
                        produceValue -= value;
                    }
                } else {
                    break;
                }
            }
            res.win = false;
            res.items = [];
            tmpStorage.forEach(function (item, num) {
                res.items.push({itemId: item.id, num: num});
            });
        } else {
            res.win = true;
        }
        return res;
    },
    underAttackInNight: function () {
        var timer = this.getTimer();
        var record = this.getRecord();
        var homeRes = {};
        var rand = Math.random();
        if (timer.formatTime().d < 2) {
            rand = 1;
        } else {
            rand = Math.random();
        }
        cc.i("moonlighting..." + rand);
        if (rand <= MoonlightingConfig.probability) {
            this.log.addMsg(1099);

            var electricFenceBuild = this.room.getBuild(19);

            //雷区抵御僵尸夜袭
            if (this.isBombActive) {

                this.isBombActive = false;
                homeRes.happened = true;
                homeRes.defend = true;

            } else if ((electricFenceBuild && electricFenceBuild.level ==0) &&electricFenceBuild.isActive()) {  //电网抵御僵尸
                homeRes.happened = true;
                homeRes.defend = true;
            } else {
                var attackStrength = this._getAttackInNightStrength();
                var homeDef = RoleRuntimeService.getHomeDefense(this);
                homeRes = this._getAttackResult(attackStrength, homeDef, this.storage);
                homeRes.happened = true;

                for (var siteId in this.map.siteMap) {
                    var site = this.map.siteMap[siteId];
                    if (!site.closed && !site.storage.isEmpty()) {
                        this._getAttackResult(attackStrength, site.config.def, site.storage);
                        site.isUnderAttacked = true;
                    }
                }
            }


        } else {
            homeRes.happened = false;
        }

        record.saveAll();
        timer.pause();
        new DayLayer(homeRes).show();
    },

    _getEncounterDayNumber: function () {
        var timeObj = this.getTimer().formatTime();
        return (timeObj && typeof timeObj.d === "number") ? (timeObj.d + 1) : 1;
    },
    _clampEncounterDifficulty: function (value) {
        value = Math.round(Number(value) || 1);
        return Math.max(1, Math.min(value, 12));
    },
    _getRandomEncounterDifficultyRange: function (stage) {
        var config = RandomBattleConfig[stage] || {};
        var defaultRange = Array.isArray(config.difficulty) ? config.difficulty.slice() : [1, 1];
        var progression = RandomBattleConfig.progression || {};
        var stageProgression = progression[stage];
        var currentDay = this._getEncounterDayNumber();
        var startDay = Number(progression.startDay) || 0;
        var endDay = Number(progression.endDay) || startDay;

        if (!stageProgression || currentDay < startDay) {
            return defaultRange;
        }

        var startDifficulty = Array.isArray(stageProgression.startDifficulty)
            ? stageProgression.startDifficulty.slice()
            : defaultRange;
        var endDifficulty = Array.isArray(stageProgression.endDifficulty)
            ? stageProgression.endDifficulty.slice()
            : startDifficulty;

        if (currentDay >= endDay) {
            return endDifficulty;
        }

        var progress = 0;
        if (endDay > startDay) {
            progress = (currentDay - startDay) / (endDay - startDay);
        }

        var minDifficulty = this._clampEncounterDifficulty(
            startDifficulty[0] + (endDifficulty[0] - startDifficulty[0]) * progress
        );
        var maxDifficulty = this._clampEncounterDifficulty(
            startDifficulty[1] + (endDifficulty[1] - startDifficulty[1]) * progress
        );

        return [Math.min(minDifficulty, maxDifficulty), Math.max(minDifficulty, maxDifficulty)];
    },
    _getRandomEncounterProbability: function (stage) {
        var config = RandomBattleConfig[stage] || {};
        var probability = Number(config.probability) || 0;
        var flashlightItemId = RandomBattleConfig.flashlightItemId;

        if (stage === "night" && flashlightItemId && this.getItemNumInPlayer(flashlightItemId) > 0) {
            probability -= Number(RandomBattleConfig.flashlightNightProbabilityReduction) || 0;
        }

        return Math.max(0, Math.min(probability, 1));
    },
    randomAttack: function (cb) {
        var stage = this.getTimer().getStage();
        var rand = Math.random();
        var difficultyRange = this._getRandomEncounterDifficultyRange(stage);
        var probability = this._getRandomEncounterProbability(stage);
        cc.d(rand);
        if (rand <= probability) {

            this.log.addMsg(1113);

            var diff = utils.getRandomInt(difficultyRange[0], difficultyRange[1]);
            var list = utils.getMonsterListByDifficulty(diff);
            cc.e("action");
            uiUtil.showRandomBattleDialog({
                difficulty: diff,
                list: list
            }, cb);
            return true;
        }
        return false;
    },

    _refreshWorkSiteStateByHour: function () {
        var workSite = this.map.getSite(WORK_SITE);
        if (workSite) {
            workSite.checkActive();
        }
    },

    _updateTimedTreatmentState: function () {
        var now = this.getTimer().now();
        var oneDaySeconds = 24 * 60 * 60;
        if (this.bindTime && (now - this.bindTime >= oneDaySeconds)) {
            this.binded = false;
            cc.i("binded false");
        }
        if (this.cureTime && (now - this.cureTime >= oneDaySeconds)) {
            this.cured = false;
            cc.i("cured false");
        }
    },

    _runHourlyUpdatePipeline: function () {
        this.updateByTime();
        this.updateTemperature();
        this.updateTemperatureEffect();
        this.updateStarve();
        this.updateInjure();
        this.updateInfect();
        this.updateVigour();
        this._refreshWorkSiteStateByHour();
        this._updateTimedTreatmentState();
    },

    start: function () {
        cc.i("player start...");
        var self = this;
        var timer = this.getTimer();
        timer.addTimerCallbackDayAndNight(null, function (flag) {
            if (flag === 'day') {
                self.npcManager.visitPlayer();
                self.npcManager.updateTradingItem();
                self.log.addMsg(1122);
                self.weather.checkWeather();
                Medal.checkDay(1);
            } else {
                self.log.addMsg(1121);
            }
        });
        timer.addTimerCallbackDayByDay(this, function () {
            self.underAttackInNight();
            self.room.getBuild(9).sleeped = false;
            timer.checkSeason();

            DataLog.genDayLog();

            adHelper.activeAd();
        });
        timer.addTimerCallbackHourByHour(this, function () {
            self._runHourlyUpdatePipeline();
        });
        timer.addTimerCallbackByMinute(this.buffManager);
        //this.map.unlockNpc(1);
    },
    //背包+仓库的物品数量
    getItemNumInPlayer: function (itemId) {
        var num = 0;
        num += this.bag.getNumByItemId(itemId);
        num += this.storage.getNumByItemId(itemId);
        return num;
    },
    die: function () {
        this.buffManager.abortBuff();

        game.stop();

        this.map.resetPos();
        this.map.deleteUnusableSite();

        Navigation.gotoDeathNode();

        if (this.isAtSite()) {
            DataLog.genSiteLog(this.getCurrentSiteId(), 2);
        }

        DataLog.genDeathLog();
    },
    //重生
    relive: function () {
        this.changeSpirit(AttrHelperRuntime.get(this, 'spiritMax') - AttrHelperRuntime.get(this, 'spirit'));
        this.changeStarve(AttrHelperRuntime.get(this, 'starveMax') - AttrHelperRuntime.get(this, 'starve'));
        this.changeVigour(AttrHelperRuntime.get(this, 'vigourMax') - AttrHelperRuntime.get(this, 'vigour'));
        this.changeInjury(0 - AttrHelperRuntime.get(this, 'injury'));
        this.changeInfect(0 - AttrHelperRuntime.get(this, 'infect'));
        this.changeAttr("hp", AttrHelperRuntime.get(this, 'hpMax'));
        this.isInSleep = false;
        this.cured = false;
        this.binded = false;
        //所有建筑需要复原
        this.room.forEach(function (build) {
            build.resetActiveBtnIndex();
        });
        this.getRecord().saveAll();
    },

    isLowVigour: function () {
        if (this.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107032)) {
            return false;
        } else {
            var attrRangeInfo = this.getAttrRangeInfo("vigour", this.vigour);
            if (attrRangeInfo) {
                return attrRangeInfo.id === 1;
            } else {
                return false;
            }
        }
    },
    vigourEffect: function () {
        return this.isLowVigour() ? 2 : 1;
    },

    setSetting: function (key, value) {
        this.setting[key] = value;
        this.getRecord().saveAll();
    },
    getSetting: function (key, defaultValue) {
        if (this.setting.hasOwnProperty(key)) {
            return this.setting[key];
        } else {
            return defaultValue;
        }
    },
    getStep: function () {
        return this.getSetting("step", 0);
    },
    step: function () {
        var step = this.getStep();
        step++;
        this.setSetting("step", step);
    }
});

var Dog = cc.Class.extend({
    ctor: function () {
        //饥饿
        this.starve = 0;
        this.starveMax = 72;
        this.autoFeedEnabled = false;
    },

    changeAttr: function (key, value) {
        this[key] += value;
        this[key] = cc.clampf(this[key], 0, this[key + "Max"]);
        cc.i("dog changeAttr " + key + " value:" + value + " after:" + this[key]);
    },

    changeStarve: function (value) {
        this.changeAttr("starve", value);
    },
    getFeedCost: function () {
        if (typeof buildActionConfig === "undefined"
            || !buildActionConfig
            || !buildActionConfig[12]
            || !buildActionConfig[12][0]
            || !buildActionConfig[12][0].cost) {
            return [];
        }
        return utils.clone(buildActionConfig[12][0].cost);
    },
    canFeed: function () {
        return this.starve < this.starveMax;
    },
    feed: function () {
        this.changeStarve(this.starveMax - this.starve);
    },
    isHungry: function () {
        return this.starve <= 0;
    },
    isActive: function () {
        return this.starve > 0;
    },
    isAutoFeedEnabled: function () {
        return !!this.autoFeedEnabled;
    },
    setAutoFeedEnabled: function (enabled) {
        this.autoFeedEnabled = !!enabled;
    },
    tryAutoFeed: function (playerInstance) {
        if (!playerInstance
            || !this.isAutoFeedEnabled()
            || !this.isHungry()
            || !playerInstance.room
            || playerInstance.room.getBuildLevel(12) < 0) {
            return false;
        }

        var cost = this.getFeedCost();
        if (!cost.length || !playerInstance.validateItems(cost)) {
            return false;
        }

        playerInstance.costItems(cost);
        this.feed();

        var primaryCost = cost[0];
        var costLabel = stringUtil.getString(primaryCost.itemId).title + "x" + primaryCost.num;
        playerInstance.log.addMsg(stringUtil.getString(
            "dog_auto_feed_log",
            costLabel,
            playerInstance.storage.getNumByItemId(primaryCost.itemId)
        ));

        var buildNodeUpdateEvent = (typeof GameEvents !== "undefined" && GameEvents && GameEvents.BUILD_NODE_UPDATE)
            ? GameEvents.BUILD_NODE_UPDATE
            : "build_node_update";
        var emitter = playerInstance.getEmitter();
        if (emitter && typeof emitter.emit === "function") {
            emitter.emit(buildNodeUpdateEvent);
        }
        playerInstance.getRecord().saveAll();
        return true;
    },
    save: function () {
        var opt = {
            starve: this.starve,
            autoFeedEnabled: !!this.autoFeedEnabled
        };
        return opt;
    },

    restore: function (opt) {
        if (opt) {
            this.starve = opt.starve;
            this.autoFeedEnabled = !!opt.autoFeedEnabled;
        }
    }
});
