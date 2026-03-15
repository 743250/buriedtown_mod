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
            return SafetyHelper.safeCall(IAPPackage.getInfectIncreaseEffect, value, value);
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
    updateTemperature: function (playerInstance) {
        var temperatureConfig = playerInstance.config.temperature;
        var temperature = this.initTemperature(playerInstance);
        temperature += RoleRuntimeService.getTemperatureBonus(playerInstance, temperatureConfig[4][0]);
        temperature += playerInstance.weather.getValue("temperature");

        playerInstance.changeTemperature(temperature - memoryUtil.decode(playerInstance.temperature));
    },
    updateTemperatureEffect: function (playerInstance) {
        this.applyEffectMap(playerInstance, this.getRangeEffect(playerInstance, "temperature", playerInstance.temperature));
    },
    initTemperature: function (playerInstance) {
        var temperatureConfig = playerInstance.config.temperature;
        var configBySeason = temperatureConfig[cc.timer.getSeason()];
        var temperature = configBySeason[0];
        if (cc.timer.getStage() === "day") {
            temperature += configBySeason[1];
        } else {
            temperature += configBySeason[2];
        }
        return temperature;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = PlayerAttrService;
}
