/**
 * Extracts player attribute mutation and hourly status updates out of player.js
 * so future balance/content work does not need to keep growing the Player class.
 */
var PlayerAttrService = {
    CHANGE_DIRECTION: {
        hp: 1,
        spirit: 1,
        starve: 1,
        vigour: 1,
        injury: -1,
        infect: -1,
        temperature: 1
    },
    NEGATIVE_ATTR_MAP: {
        infect: true,
        injury: true
    },
    isAttrChangeGood: function (key, value) {
        var direction = this.CHANGE_DIRECTION[key];
        if (direction === 1) {
            return value >= 0;
        }
        if (direction === -1) {
            return value < 0;
        }
        return false;
    },
    getBlockedBuffInfoByAttr: function (key) {
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
    isAttrChangeBlockedByBuff: function (playerInstance, key, value) {
        if (this.isAttrChangeGood(key, value)) {
            return false;
        }
        var blockedBuffInfo = this.getBlockedBuffInfoByAttr(key);
        if (!blockedBuffInfo) {
            return false;
        }
        if (!playerInstance.buffManager.isBuffEffect(blockedBuffInfo.buffType)) {
            return false;
        }
        cc.d(blockedBuffInfo.logMsg);
        return true;
    },
    normalizeAttrChangeValue: function (key, value) {
        if (key === "infect" && value > 0) {
            if (typeof TalentService !== "undefined"
                && TalentService
                && typeof TalentService.getInfectIncreaseEffect === "function") {
                return SafetyHelper.safeCall(function (infectValue) {
                    return TalentService.getInfectIncreaseEffect(infectValue);
                }, value, value);
            }
        }
        return value;
    },
    applyAttrChangeValue: function (playerInstance, key, value) {
        var beforeRangeInfo = playerInstance.getAttrRangeInfo(key, playerInstance[key]);
        playerInstance[key] += memoryUtil.changeEncode(value);
        var currentVal = memoryUtil.decode(playerInstance[key]);
        var maxVal = memoryUtil.decode(playerInstance[key + "Max"]);
        playerInstance[key] = memoryUtil.encode(cc.clampf(currentVal, 0, maxVal));
        var afterRangeInfo = playerInstance.getAttrRangeInfo(key, playerInstance[key]);

        return {
            beforeRangeInfo: beforeRangeInfo,
            afterRangeInfo: afterRangeInfo,
            currentVal: memoryUtil.decode(playerInstance[key])
        };
    },
    playAttrRangeTransitionEffect: function (key, isLevelUp) {
        if (this.NEGATIVE_ATTR_MAP[key]) {
            audioManager.playEffect(isLevelUp ? audioManager.sound.BAD_EFFECT : audioManager.sound.GOOD_EFFECT);
        } else {
            audioManager.playEffect(isLevelUp ? audioManager.sound.GOOD_EFFECT : audioManager.sound.BAD_EFFECT);
        }
    },
    emitAttrRangeTransition: function (playerInstance, key, beforeRangeInfo, afterRangeInfo) {
        if (!beforeRangeInfo || !afterRangeInfo) {
            cc.e(key + " is not in range " + playerInstance[key]);
            return;
        }

        var transition = afterRangeInfo.id - beforeRangeInfo.id;
        if (transition === 0) {
            return;
        }

        var suffix = transition > 0 ? "_up" : "_down";
        cc.e(key + suffix + " " + (afterRangeInfo.id - 1));
        playerInstance.log.addMsg(stringUtil.getString(key + suffix)[afterRangeInfo.id - 1]);
        this.playAttrRangeTransitionEffect(key, transition > 0);
    },
    onAttrChanged: function (playerInstance, key) {
        if (key === "injury") {
            playerInstance.updateHpMax();
        }
        if (key === "hp"
            && memoryUtil.decode(playerInstance.hp) === 0
            && typeof player !== "undefined"
            && playerInstance === player) {
            playerInstance.die();
        }
    },
    changeAttr: function (playerInstance, key, value) {
        if (this.isAttrChangeBlockedByBuff(playerInstance, key, value)) {
            return;
        }

        value = this.normalizeAttrChangeValue(key, value);
        var changeInfo = this.applyAttrChangeValue(playerInstance, key, value);

        cc.i("changeAttr " + key + " value:" + value + " after:" + changeInfo.currentVal);
        if (typeof player !== "undefined" && playerInstance === player) {
            utils.emitter.emit(key + "_change", value);
        }
        this.emitAttrRangeTransition(playerInstance, key, changeInfo.beforeRangeInfo, changeInfo.afterRangeInfo);
        this.onAttrChanged(playerInstance, key);
    },
    updateHpMax: function (playerInstance) {
        var hpBuffEffect = 0;
        if (playerInstance.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107012)) {
            hpBuffEffect = playerInstance.buffManager.getBuffValue();
        }
        var newHpMax = memoryUtil.decode(playerInstance.hpMaxOrigin) + hpBuffEffect - memoryUtil.decode(playerInstance.injury);
        playerInstance.hpMax = memoryUtil.encode(newHpMax);
        playerInstance.hp = memoryUtil.encode(Math.min(memoryUtil.decode(playerInstance.hp), newHpMax));
    },
    getHourlyStarveChange: function (playerInstance, changeConfig) {
        return RoleRuntimeService.getHourlyStarveChange(playerInstance.roleType, changeConfig);
    },
    getHourlyVigourChange: function (playerInstance, changeConfig) {
        if (cc.timer.getStage() === "day") {
            return playerInstance.isAtHome() ? changeConfig[2][0] : changeConfig[3][0];
        }
        return playerInstance.isAtHome() ? changeConfig[4][0] : changeConfig[5][0];
    },
    applySleepRecoveryByHour: function (playerInstance) {
        var bedLevel = playerInstance.room.getBuildLevel(9);
        var bedRate = buildActionConfig[9][bedLevel].rate;

        bedRate = bedRate * 0.5
            + memoryUtil.decode(playerInstance.starve) / memoryUtil.decode(playerInstance.starveMax) * 0.2
            + memoryUtil.decode(playerInstance.spirit) / memoryUtil.decode(playerInstance.spiritMax) * 0.3;

        playerInstance.changeVigour(Math.ceil(bedRate * 15));
        playerInstance.changeHp(Math.ceil(bedRate * 20));
    },
    applyHourlyWeatherAttrChange: function (playerInstance) {
        playerInstance.changeVigour(playerInstance.weather.getValue("vigour"));
        playerInstance.changeSpirit(playerInstance.weather.getValue("spirit"));
    },
    updateByTime: function (playerInstance) {
        var changeConfig = playerInstance.config.changeByTime;

        playerInstance.changeStarve(this.getHourlyStarveChange(playerInstance, changeConfig));
        playerInstance.dog.changeStarve(changeConfig[1][0]);
        playerInstance.dog.tryAutoFeed(playerInstance);
        playerInstance.changeVigour(this.getHourlyVigourChange(playerInstance, changeConfig));

        if (playerInstance.isInSleep) {
            this.applySleepRecoveryByHour(playerInstance);
        }

        this.applyHourlyWeatherAttrChange(playerInstance);
    },
    getRangeEffect: function (playerInstance, attr, value) {
        var attrRangeInfo = playerInstance.getAttrRangeInfo(attr, value);
        if (!attrRangeInfo) {
            return null;
        }
        return attrRangeInfo.effect || null;
    },
    applyEffectMap: function (playerInstance, effectMap, opt) {
        if (!effectMap) {
            return;
        }
        opt = opt || {};
        var mapValue = opt.mapValue;
        var canApply = opt.canApply;

        for (var attr in effectMap) {
            if (!playerInstance.hasOwnProperty(attr)) {
                continue;
            }

            var value = effectMap[attr];
            if (mapValue) {
                value = mapValue.call(playerInstance, attr, value);
            }
            if (value === undefined || value === null) {
                continue;
            }

            if (!canApply || canApply.call(playerInstance, attr, value)) {
                playerInstance.changeAttr(attr, value);
            }
        }
    },
    updateStarve: function (playerInstance) {
        if (playerInstance.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107042)) {
            cc.d("ITEM_1107042 updateStarve");
            return;
        }

        this.applyEffectMap(playerInstance, this.getRangeEffect(playerInstance, "starve", playerInstance.starve));
    },
    updateInfect: function (playerInstance) {
        if (playerInstance.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107022)) {
            cc.d("ITEM_1107022 updateInfect");
            return;
        }

        this.applyEffectMap(playerInstance, this.getRangeEffect(playerInstance, "infect", playerInstance.infect), {
            mapValue: function (attr, value) {
                if (attr === "hp") {
                    value *= memoryUtil.decode(this.infect) / 100;
                    value = Math.ceil(value);
                    this.deathCausedInfect = true;
                }
                return value;
            },
            canApply: function (attr) {
                if (attr === "infect" || attr === "spirit") {
                    return !this.isInCure();
                }
                return true;
            }
        });

        if (memoryUtil.decode(playerInstance.hp) === 0) {
            playerInstance.log.addMsg(1108);
        } else {
            playerInstance.deathCausedInfect = false;
        }
    },
    updateVigour: function (playerInstance) {
        if (playerInstance.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107032)) {
            cc.d("ITEM_1107032 updateVigour ");
            return;
        }

        this.applyEffectMap(playerInstance, this.getRangeEffect(playerInstance, "vigour", playerInstance.vigour));
    },
    updateInjure: function (playerInstance) {
        this.applyEffectMap(playerInstance, this.getRangeEffect(playerInstance, "injury", playerInstance.injury), {
            canApply: function (attr) {
                if (attr === "infect" || attr === "spirit") {
                    return !this.isInBind();
                }
                return true;
            }
        });
    },
    TEMPERATURE_SEASON_LENGTH_DAYS: 30,
    TEMPERATURE_SEASON_AVERAGE_DAY_INDEX: 14,
    TEMPERATURE_EQUIPMENT_BONUS_MAP: {
        1304012: 3,
        1304023: 5
    },
    getTemperatureSeasonConfigList: function (playerInstance) {
        var temperatureConfig = playerInstance && playerInstance.config ? playerInstance.config.temperature : null;
        if (!Array.isArray(temperatureConfig)) {
            return [];
        }
        return temperatureConfig.slice(0, 4).map(function (seasonConfig) {
            return Array.isArray(seasonConfig) ? seasonConfig : [0, 0, 0];
        });
    },
    getTemperatureCycleDay: function (playerInstance) {
        var seasonCount = this.getTemperatureSeasonConfigList(playerInstance).length;
        if (seasonCount === 0) {
            return 0;
        }
        var cycleLength = seasonCount * this.TEMPERATURE_SEASON_LENGTH_DAYS;
        var timeObj = cc.timer && typeof cc.timer.formatTime === "function"
            ? (cc.timer.formatTime() || {})
            : {};
        var cycleDay = Number(timeObj.d) || 0;
        return ((cycleDay % cycleLength) + cycleLength) % cycleLength;
    },
    interpolateTemperatureValue: function (fromValue, toValue, progress) {
        fromValue = Number(fromValue) || 0;
        toValue = Number(toValue) || 0;
        progress = Math.max(0, Math.min(1, Number(progress) || 0));
        return fromValue + (toValue - fromValue) * progress;
    },
    truncateTemperatureValue: function (value) {
        value = Number(value) || 0;
        return value < 0 ? Math.ceil(value) : Math.floor(value);
    },
    getInterpolatedSeasonTemperatureValue: function (playerInstance, valueIndex) {
        var seasonConfigList = this.getTemperatureSeasonConfigList(playerInstance);
        if (seasonConfigList.length === 0) {
            return 0;
        }

        var seasonLength = this.TEMPERATURE_SEASON_LENGTH_DAYS;
        var cycleLength = seasonConfigList.length * seasonLength;
        var anchorOffset = this.TEMPERATURE_SEASON_AVERAGE_DAY_INDEX;
        var anchorList = seasonConfigList.map(function (seasonConfig, index) {
            return {
                day: index * seasonLength + anchorOffset,
                value: Number(seasonConfig[valueIndex]) || 0
            };
        });
        anchorList.push({
            day: anchorList[0].day + cycleLength,
            value: anchorList[0].value
        });

        var cycleDay = this.getTemperatureCycleDay(playerInstance);
        if (cycleDay < anchorList[0].day) {
            cycleDay += cycleLength;
        }

        for (var i = 0; i < anchorList.length - 1; i++) {
            var leftAnchor = anchorList[i];
            var rightAnchor = anchorList[i + 1];
            if (cycleDay >= leftAnchor.day && cycleDay <= rightAnchor.day) {
                var span = rightAnchor.day - leftAnchor.day;
                var progress = span > 0 ? (cycleDay - leftAnchor.day) / span : 0;
                return this.interpolateTemperatureValue(leftAnchor.value, rightAnchor.value, progress);
            }
        }

        return anchorList[anchorList.length - 1].value;
    },
    getInterpolatedTemperatureConfig: function (playerInstance) {
        return {
            average: this.getInterpolatedSeasonTemperatureValue(playerInstance, 0),
            day: this.getInterpolatedSeasonTemperatureValue(playerInstance, 1),
            night: this.getInterpolatedSeasonTemperatureValue(playerInstance, 2)
        };
    },
    getTemperatureBonusConfig: function (playerInstance) {
        var temperatureConfig = playerInstance && playerInstance.config ? playerInstance.config.temperature : null;
        var bonusConfig = temperatureConfig && temperatureConfig[4];
        return {
            home: bonusConfig && bonusConfig[0] !== undefined ? Number(bonusConfig[0]) || 0 : 6,
            heating: bonusConfig && bonusConfig[1] !== undefined ? Number(bonusConfig[1]) || 0 : 7
        };
    },
    getTemperatureHomeBonus: function (playerInstance) {
        if (!playerInstance
            || !playerInstance.navigationState
            || typeof playerInstance.isAtHome !== "function"
            || !playerInstance.isAtHome()) {
            return 0;
        }
        return this.getTemperatureBonusConfig(playerInstance).home;
    },
    getTemperatureEffectConfig: function (playerInstance) {
        var effectConfig = playerInstance && playerInstance.config ? playerInstance.config.temperatureEffect : null;
        return {
            mildThreshold: effectConfig && !isNaN(Number(effectConfig.mildThreshold))
                ? Number(effectConfig.mildThreshold)
                : 10,
            severeThreshold: effectConfig && !isNaN(Number(effectConfig.severeThreshold))
                ? Number(effectConfig.severeThreshold)
                : -10,
            mildInfect: effectConfig && !isNaN(Number(effectConfig.mildInfect))
                ? Number(effectConfig.mildInfect)
                : 1,
            severeInfect: effectConfig && !isNaN(Number(effectConfig.severeInfect))
                ? Number(effectConfig.severeInfect)
                : 2
        };
    },
    getWeatherTemperatureBonus: function (playerInstance) {
        if (!playerInstance
            || !playerInstance.weather
            || typeof playerInstance.weather.getValue !== "function") {
            return 0;
        }
        return Number(playerInstance.weather.getValue("temperature")) || 0;
    },
    getWorldTemperature: function (playerInstance) {
        var interpolatedConfig = this.getInterpolatedTemperatureConfig(playerInstance);
        var worldTemperature = interpolatedConfig.average;
        if (cc.timer.getStage() === "day") {
            worldTemperature += interpolatedConfig.day;
        } else {
            worldTemperature += interpolatedConfig.night;
        }
        worldTemperature += this.getWeatherTemperatureBonus(playerInstance);
        return this.truncateTemperatureValue(worldTemperature);
    },
    getTemperatureBuildBonus: function (playerInstance) {
        return RoleRuntimeService.getTemperatureBonus(
            playerInstance,
            this.getTemperatureBonusConfig(playerInstance).heating
        );
    },
    getTemperatureEquipSlot: function () {
        if (typeof EquipmentPos !== "undefined"
            && EquipmentPos
            && EquipmentPos.EQUIP !== undefined) {
            return EquipmentPos.EQUIP;
        }
        return 2;
    },
    getTemperatureEquipmentBonus: function (playerInstance) {
        if (!playerInstance
            || !playerInstance.equip
            || typeof playerInstance.equip.getEquip !== "function") {
            return 0;
        }
        var equipItemId = playerInstance.equip.getEquip(this.getTemperatureEquipSlot());
        return this.TEMPERATURE_EQUIPMENT_BONUS_MAP[equipItemId] || 0;
    },
    getTemperatureRoleBonus: function (playerInstance) {
        return this.getTemperatureHomeBonus(playerInstance)
            + this.getTemperatureBuildBonus(playerInstance)
            + this.getTemperatureEquipmentBonus(playerInstance);
    },
    getLowTemperatureResistance: function (playerInstance) {
        if (typeof RoleRuntimeService === "undefined"
            || !RoleRuntimeService
            || typeof RoleRuntimeService.getLowTemperatureResistance !== "function") {
            return 0;
        }
        return RoleRuntimeService.getLowTemperatureResistance(playerInstance);
    },
    getLowTemperatureThresholdInfo: function (playerInstance) {
        var effectConfig = this.getTemperatureEffectConfig(playerInstance);
        var resistance = this.getLowTemperatureResistance(playerInstance);
        return {
            mildThreshold: effectConfig.mildThreshold - resistance,
            severeThreshold: effectConfig.severeThreshold - resistance,
            resistance: resistance,
            mildInfect: effectConfig.mildInfect,
            severeInfect: effectConfig.severeInfect
        };
    },
    getTemperatureInfectIncrease: function (playerInstance) {
        var thresholdInfo = this.getLowTemperatureThresholdInfo(playerInstance);
        var temperature = playerInstance && playerInstance.temperature !== undefined
            ? memoryUtil.decode(playerInstance.temperature)
            : this.initTemperature(playerInstance);

        if (temperature < thresholdInfo.severeThreshold) {
            return thresholdInfo.severeInfect;
        }
        if (temperature < thresholdInfo.mildThreshold) {
            return thresholdInfo.mildInfect;
        }
        return 0;
    },
    updateTemperature: function (playerInstance) {
        var temperature = this.initTemperature(playerInstance);
        playerInstance.changeTemperature(temperature - memoryUtil.decode(playerInstance.temperature));
    },
    updateTemperatureEffect: function (playerInstance) {
        var infectIncrease = this.getTemperatureInfectIncrease(playerInstance);
        if (infectIncrease > 0) {
            playerInstance.changeInfect(infectIncrease);
        }
    },
    initTemperature: function (playerInstance) {
        return this.truncateTemperatureValue(
            this.getWorldTemperature(playerInstance) + this.getTemperatureRoleBonus(playerInstance)
        );
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = PlayerAttrService;
}
