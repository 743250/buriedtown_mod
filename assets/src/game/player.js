var AttrChangeDirection = {
    hp: 1,
    spirit: 1,
    starve: 1,
    vigour: 1,
    injury: -1,
    infect: -1,
    temperature: 1
};

var AttrNegativeTypeMap = {
    infect: true,
    injury: true
};

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

        this.setting = {};
        this._attrRangeCache = {};

        this.roleType = role.getChoosenRoleType();
        this.isBombActive = false;
    },

    save: function () {
        var attrData = AttrHelperRuntime.saveAttrs(this, ['hp', 'spirit', 'starve', 'vigour', 'injury', 'infect', 'temperature']);
        var opt = {
            hp: attrData.hp,
            hpMaxOrigin: AttrHelperRuntime.get(this, 'hpMaxOrigin'),
            hpMax: attrData.hpMax,
            spirit: attrData.spirit,
            starve: attrData.starve,
            vigour: attrData.vigour,
            injury: attrData.injury,
            infect: attrData.infect,
            temperature: attrData.temperature,

            //fix bug: 睡觉中强退后一直处于睡眠状态
            //isInSleep: this.isInSleep,
            cured: this.cured,
            cureTime: this.cureTime,
            binded: this.binded,
            bindTime: this.bindTime,
            navigationState: this.navigationState.save(),
            deathCausedInfect: this.deathCausedInfect,

            setting: this.setting,

            bag: ErrorHandler.safeExecute(function() { return this.bag.save(); }.bind(this), "Player.save.bag", {}),
            storage: ErrorHandler.safeExecute(function() { return this.storage.save(); }.bind(this), "Player.save.storage", {}),
            dog: ErrorHandler.safeExecute(function() { return this.dog.save(); }.bind(this), "Player.save.dog", {}),
            room: ErrorHandler.safeExecute(function() { return this.room.save(); }.bind(this), "Player.save.room", {}),
            equip: ErrorHandler.safeExecute(function() { return this.equip.save(); }.bind(this), "Player.save.equip", {}),
            map: ErrorHandler.safeExecute(function() { return this.map.save(); }.bind(this), "Player.save.map", {}),
            ziplineNetwork: ErrorHandler.safeExecute(function() { return this.ziplineNetwork.save(); }.bind(this), "Player.save.ziplineNetwork", {}),
            npcManager: ErrorHandler.safeExecute(function() { return this.npcManager.save(); }.bind(this), "Player.save.npcManager", {}),
            weather: ErrorHandler.safeExecute(function() { return this.weather.save(); }.bind(this), "Player.save.weather", {}),
            buffManager: ErrorHandler.safeExecute(function() { return this.buffManager.save(); }.bind(this), "Player.save.buffManager", {}),

            isBombActive: this.isBombActive
        };

        return opt;
    },

    restore: function () {
        var opt = Record.restore("player");
        if (opt) {
            AttrHelperRuntime.restoreAttrs(this, opt, ['hp', 'hpMaxOrigin', 'hpMax', 'spirit', 'starve', 'vigour', 'injury', 'infect', 'temperature']);
            //fix bug: 睡觉中强退后一直处于睡眠状态
            //this.isInSleep = opt.isInSleep;
            this.cured = opt.cured;
            this.cureTime = opt.cureTime;
            this.binded = opt.binded;
            this.bindTime = opt.bindTime;
            this.navigationState.restore(opt.navigationState || opt);
            this.deathCausedInfect = opt.deathCausedInfect;
            this.setting = opt.setting;
            ErrorHandler.safeExecute(function() { this.bag.restore(opt.bag); }.bind(this), "Player.restore.bag");
            ErrorHandler.safeExecute(function() { this.storage.restore(opt.storage); }.bind(this), "Player.restore.storage");
            ErrorHandler.safeExecute(function() { this.dog.restore(opt.dog); }.bind(this), "Player.restore.dog");
            ErrorHandler.safeExecute(function() { this.equip.restore(opt.equip); }.bind(this), "Player.restore.equip");
            ErrorHandler.safeExecute(function() { this.weather.restore(opt.weather); }.bind(this), "Player.restore.weather");
            ErrorHandler.safeExecute(function() { this.buffManager.restore(opt.buffManager); }.bind(this), "Player.restore.buffManager");
            this.isBombActive = opt.isBombActive;
        } else {
            // for test ---------begin------------
            //var itemList = [1305023, 1305024, 1304024, 1305034, 1305044, 1305034, 1305044, 1305053, 1305064];
            //for (var itemId in itemConfig) {
            //    itemId = Number(itemId);
            //    if (itemList.indexOf(itemId) == -1) {
            //        this.storage.increaseItem(itemId, 100);
            //    }
            //}
            //this.storage.increaseItem(1305064, 1);
            // for test ---------end------------

            IAPPackage.init(this);
            Medal.improve(this);
            //分享奖励
            if (Record.getShareFlag() === ShareType.SHARED_CAN_REWARD) {
                Record.setShareFlag(ShareType.SHARED_AND_REWARD);
                this.storage.increaseItem(1106054, 1);
            }
        }

        ErrorHandler.safeExecute(function() { this.room.restore(opt ? opt.room : null); }.bind(this), "Player.restore.room");
        ErrorHandler.safeExecute(function() { this.npcManager.restore(opt ? opt.npcManager : null); }.bind(this), "Player.restore.npcManager");
        ErrorHandler.safeExecute(function() { this.map.restore(opt ? opt.map : null); }.bind(this), "Player.restore.map");
        ErrorHandler.safeExecute(function() {
            var ziplineSaveObj = opt ? (opt.ziplineNetwork || opt.ziplineManager) : null;
            this.ziplineNetwork.restore(ziplineSaveObj, this.map);
        }.bind(this), "Player.restore.ziplineNetwork");
        this.navigationState.syncMapEntityIdFromMap(this.map);

        if (typeof IAPPackage !== "undefined"
            && IAPPackage
            && typeof IAPPackage.migrateLegacyElitePistol === "function") {
            var migratedLegacyElitePistol = IAPPackage.migrateLegacyElitePistol(this);
            if (migratedLegacyElitePistol && typeof Record !== "undefined" && Record && typeof Record.saveAll === "function") {
                Record.saveAll();
            }
        }

        if (typeof IAPPackage !== "undefined"
            && IAPPackage
            && typeof IAPPackage.reconcilePlayerHpByTalentSelection === "function") {
            IAPPackage.reconcilePlayerHpByTalentSelection(this);
        }

        if (IAPPackage.isBigBagUnlocked() && !this.storage.validateItem(1305024, 1)) {
            this.storage.increaseItem(1305024, 1);
        }

        if (IAPPackage.isBootUnlocked() && !this.storage.validateItem(1304024, 1)) {
            this.storage.increaseItem(1304024, 1);
        }

        if (IAPPackage.isDogHouseUnlocked() && !player.room.isBuildExist(12, 0)) {
            this.room.createBuild(12, -1);
        }

        if (typeof RoleRuntimeService !== "undefined"
            && RoleRuntimeService
            && typeof RoleRuntimeService.ensureSpecialItems === "function") {
            RoleRuntimeService.ensureSpecialItems(this);
        }

    },

    //包扎
    bindUp: function () {
        this.binded = true;
        this.bindTime = cc.timer.now();
    },
    //包扎状态不可以再包扎
    isInBind: function () {
        return this.binded;
    },

    //服药
    cure: function () {
        this.cured = true;
        this.cureTime = cc.timer.now();
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
        var direction = AttrChangeDirection[key];
        if (direction === 1) {
            return value >= 0;
        }
        if (direction === -1) {
            return value < 0;
        }
    },

    _getBlockedBuffInfoByAttr: function (key) {
        switch (key) {
            case "infect":
                return {
                    buffType: BuffItemEffectType.ITEM_1107022,
                    logMsg: "ITEM_1107022 effect infect"
                };
            case "starve":
                return {
                    buffType: BuffItemEffectType.ITEM_1107042,
                    logMsg: "ITEM_1107042 effect starve"
                };
            case "vigour":
                return {
                    buffType: BuffItemEffectType.ITEM_1107032,
                    logMsg: "ITEM_1107032 effect vigour"
                };
            default:
                return null;
        }
    },

    _isAttrChangeBlockedByBuff: function (key, value) {
        if (this.isAttrChangeGood(key, value)) {
            return false;
        }
        var blockedBuffInfo = this._getBlockedBuffInfoByAttr(key);
        if (!blockedBuffInfo) {
            return false;
        }
        if (!this.buffManager.isBuffEffect(blockedBuffInfo.buffType)) {
            return false;
        }
        cc.d(blockedBuffInfo.logMsg);
        return true;
    },

    _normalizeAttrChangeValue: function (key, value) {
        if (key === "infect" && value > 0) {
            return SafetyHelper.safeCall(IAPPackage.getInfectIncreaseEffect, value, value);
        }
        return value;
    },

    _applyAttrChangeValue: function (key, value) {
        var beforeRangeInfo = this.getAttrRangeInfo(key, this[key]);
        this[key] += memoryUtil.changeEncode(value);
        var currentVal = AttrHelperRuntime.get(this, key);
        var maxVal = AttrHelperRuntime.get(this, key + "Max");
        this[key] = memoryUtil.encode(cc.clampf(currentVal, 0, maxVal));
        var afterRangeInfo = this.getAttrRangeInfo(key, this[key]);

        return {
            beforeRangeInfo: beforeRangeInfo,
            afterRangeInfo: afterRangeInfo,
            currentVal: AttrHelperRuntime.get(this, key)
        };
    },

    _playAttrRangeTransitionEffect: function (key, isLevelUp) {
        if (AttrNegativeTypeMap[key]) {
            audioManager.playEffect(isLevelUp ? audioManager.sound.BAD_EFFECT : audioManager.sound.GOOD_EFFECT);
        } else {
            audioManager.playEffect(isLevelUp ? audioManager.sound.GOOD_EFFECT : audioManager.sound.BAD_EFFECT);
        }
    },

    _emitAttrRangeTransition: function (key, beforeRangeInfo, afterRangeInfo) {
        if (!beforeRangeInfo || !afterRangeInfo) {
            cc.e(key + " is not in range " + this[key]);
            return;
        }

        var transition = afterRangeInfo.id - beforeRangeInfo.id;
        if (transition === 0) {
            return;
        }

        var suffix = transition > 0 ? "_up" : "_down";
        cc.e(key + suffix + " " + (afterRangeInfo.id - 1));
        this.log.addMsg(stringUtil.getString(key + suffix)[afterRangeInfo.id - 1]);
        this._playAttrRangeTransitionEffect(key, transition > 0);
    },

    _onAttrChanged: function (key) {
        if (key === "injury") {
            this.updateHpMax();
        }
        if (key === "hp" && memoryUtil.decode(this.hp) == 0 && this === player) {
            //die
            this.die();
        }
    },

    isAttrMax: function (key) {
        return AttrHelperRuntime.isMax(this, key);
    },

    getAttrPercentage: function (key) {
        return AttrHelperRuntime.getPercentage(this, key);
    },

    changeAttr: function (key, value) {
        if (this._isAttrChangeBlockedByBuff(key, value)) {
            return;
        }

        value = this._normalizeAttrChangeValue(key, value);
        var changeInfo = this._applyAttrChangeValue(key, value);

        cc.i("changeAttr " + key + " value:" + value + " after:" + changeInfo.currentVal);
        if (this === player) {
            utils.emitter.emit(key + "_change", value);
        }
        this._emitAttrRangeTransition(key, changeInfo.beforeRangeInfo, changeInfo.afterRangeInfo);
        this._onAttrChanged(key);
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
        var hpBuffEffect = 0;
        if (this.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107012)) {
            hpBuffEffect = this.buffManager.getBuffValue();
        }
        var newHpMax = AttrHelperRuntime.get(this, 'hpMaxOrigin') + hpBuffEffect - AttrHelperRuntime.get(this, 'injury');
        this.hpMax = memoryUtil.encode(newHpMax);
        this.hp = memoryUtil.encode(Math.min(AttrHelperRuntime.get(this, 'hp'), newHpMax));
    },

    _getHourlyStarveChange: function (changeConfig) {
        return RoleRuntimeService.getHourlyStarveChange(this.roleType, changeConfig);
    },

    _getHourlyVigourChange: function (changeConfig) {
        if (cc.timer.getStage() === "day") {
            return this.isAtHome() ? changeConfig[2][0] : changeConfig[3][0];
        }
        return this.isAtHome() ? changeConfig[4][0] : changeConfig[5][0];
    },

    _applySleepRecoveryByHour: function () {
        var bedLevel = player.room.getBuildLevel(9);
        var bedRate = buildActionConfig[9][bedLevel].rate;

        //睡眠等级=床等级值*0.5+饱食度/100*0.2+心情值/100*0.3
        bedRate = bedRate * 0.5 + memoryUtil.decode(this.starve) / memoryUtil.decode(this.starveMax) * 0.2 + memoryUtil.decode(this.spirit) / memoryUtil.decode(this.spiritMax) * 0.3;

        //精力值
        //每小时回复精力值=睡眠等级*10
        var vigour = Math.ceil(bedRate * 15);
        this.changeVigour(vigour);

        //生命值
        //每小时回血=睡眠等级*20
        var hp = Math.ceil(bedRate * 20);
        this.changeHp(hp)
    },

    _applyHourlyWeatherAttrChange: function () {
        this.changeVigour(this.weather.getValue("vigour"));
        this.changeSpirit(this.weather.getValue("spirit"));
    },

    updateByTime: function () {

        var c = this.config["changeByTime"];

        //扣减饥饿度
        this.changeStarve(this._getHourlyStarveChange(c));
        //扣减狗的饥饿度
        this.dog.changeStarve(c[1][0]);

        this.changeVigour(this._getHourlyVigourChange(c));

        //在睡眠状态下的影响
        if (this.isInSleep) {
            this._applySleepRecoveryByHour();
        }

        this._applyHourlyWeatherAttrChange();
    },

    _getRangeEffect: function (attr, value) {
        var attrRangeInfo = this.getAttrRangeInfo(attr, value);
        if (!attrRangeInfo) {
            return null;
        }
        return attrRangeInfo.effect || null;
    },

    _applyEffectMap: function (effectMap, opt) {
        if (!effectMap) {
            return;
        }
        opt = opt || {};
        var mapValue = opt.mapValue;
        var canApply = opt.canApply;

        for (var attr in effectMap) {
            if (!this.hasOwnProperty(attr)) {
                continue;
            }

            var value = effectMap[attr];
            if (mapValue) {
                value = mapValue.call(this, attr, value);
            }
            if (value === undefined || value === null) {
                continue;
            }

            if (!canApply || canApply.call(this, attr, value)) {
                this.changeAttr(attr, value);
            }
        }
    },

    updateStarve: function () {
        if (this.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107042)) {
            cc.d('ITEM_1107042 updateStarve');
            return;
        }

        this._applyEffectMap(this._getRangeEffect("starve", this.starve));

    },

    updateInfect: function () {

        if (this.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107022)) {
            cc.d('ITEM_1107022 updateInfect');
            return;
        }

        this._applyEffectMap(this._getRangeEffect("infect", this.infect), {
            mapValue: function (attr, value) {
                //感染属性影响中有公式；对血的影响按当前感染值比例计算
                if (attr === 'hp') {
                    value *= memoryUtil.decode(this.infect) / 100;
                    value = Math.ceil(value);
                    this.deathCausedInfect = true;
                }
                return value;
            },
            canApply: function (attr) {
                //非服药状态才能影响感染与心情
                if (attr === 'infect' || attr === 'spirit') {
                    return !this.isInCure();
                }
                return true;
            }
        });

        if (memoryUtil.decode(this.hp) === 0) {
            this.log.addMsg(1108);
        } else {
            this.deathCausedInfect = false;
        }
    },

    updateVigour: function () {
        if (this.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107032)) {
            cc.d('ITEM_1107032 updateVigour ');
            return;
        }

        this._applyEffectMap(this._getRangeEffect("vigour", this.vigour));

    },

    updateInjure: function () {

        this._applyEffectMap(this._getRangeEffect("injury", this.injury), {
            canApply: function (attr) {
                //非包扎状态才能影响感染与心情
                if (attr === 'infect' || attr === 'spirit') {
                    return !this.isInBind();
                }
                return true;
            }
        });

    },

    updateTemperature: function () {

        var c = this.config["temperature"];

        var temperature = this.initTemperature();
        temperature += RoleRuntimeService.getTemperatureBonus(this, c[4][0]);

        //天气
        temperature += this.weather.getValue("temperature");


        this.changeTemperature(temperature - memoryUtil.decode(this.temperature));
    },

    updateTemperatureEffect: function () {

        this._applyEffectMap(this._getRangeEffect("temperature", this.temperature));

    },

    initTemperature: function () {
        var c = this.config["temperature"];
        //季节因素
        var configBySeason = c[cc.timer.getSeason()];
        var temperature = configBySeason[0];
        //日夜因素
        if (cc.timer.getStage() === "day") {
            temperature += configBySeason[1];
        } else {
            temperature += configBySeason[2];
        }
        return temperature;
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
        var timeObj = cc.timer.formatTime();
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
        var homeRes = {};
        var rand = Math.random();
        if (cc.timer.formatTime().d < 2) {
            rand = 1;
        } else {
            rand = Math.random();
        }
        cc.i("moonlighting..." + rand);
        if (rand <= MoonlightingConfig.probability) {

            player.log.addMsg(1099);

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

        Record.saveAll();

        cc.timer.pause();
        new DayLayer(homeRes).show();
    },

    randomAttack: function (cb) {
        var stage = cc.timer.getStage();
        var config = RandomBattleConfig[stage];
        var rand = Math.random();
        cc.d(rand);
        if (rand <= config.probability) {

            player.log.addMsg(1113);

            var diff = utils.getRandomInt(config.difficulty[0], config.difficulty[1]);
            var list = utils.getMonsterListByDifficulty(diff)
            cc.e("action")
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
        var now = cc.timer.now();
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
        cc.timer.addTimerCallbackDayAndNight(null, function (flag) {
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
        cc.timer.addTimerCallbackDayByDay(this, function () {
            self.underAttackInNight();
            self.room.getBuild(9).sleeped = false;
            cc.timer.checkSeason();

            DataLog.genDayLog();

            adHelper.activeAd();
        });
        cc.timer.addTimerCallbackHourByHour(this, function () {
            self._runHourlyUpdatePipeline();
        });
        cc.timer.addTimerCallbackByMinute(this.buffManager);
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

        if (player.isAtSite()) {
            DataLog.genSiteLog(player.getCurrentSiteId(), 2);
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
        Record.saveAll();
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
        Record.saveAll();
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
    },

    changeAttr: function (key, value) {
        this[key] += value;
        this[key] = cc.clampf(this[key], 0, this[key + "Max"]);
        cc.i("dog changeAttr " + key + " value:" + value + " after:" + this[key]);
    },

    changeStarve: function (value) {
        this.changeAttr("starve", value);
    },
    canFeed: function () {
        return this.starve < this.starveMax;
    },
    feed: function () {
        this.changeStarve(this.starveMax - this.starve);
    },
    isActive: function () {
        return this.starve > 0;
    },
    save: function () {
        var opt = {
            starve: this.starve
        };
        return opt;
    },

    restore: function (opt) {
        if (opt) {
            this.starve = opt.starve;
        }
    }
});
