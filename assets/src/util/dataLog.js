/**
 * Created by lancelot on 15/7/1.
 */

var DataLog = {
    _logList: [],
    isUploading: false,
    sendLog: function (logObj) {
        cc.v("sendLog: " + JSON.stringify(logObj));
        this._logList.push(logObj);

        this.saveToLocal();
        this.uploadLog();
    },
    uploadLog: function () {
        if (this.isUploading)
            return;

        this.isUploading = true;
        var uploadData = this._logList;
        var self = this;
        this._logList = [];

        networkUtil.sendLog("sendLog", uploadData, this, function (response) {
            if (response.statusCode === 200) {
                self.saveToLocal();
            } else {
                cc.e(JSON.stringify(response));
                self._logList = uploadData.concat(self._logList);
                self.saveToLocal();
            }
            self.isUploading = false;
        });

        cc.director.getScheduler().scheduleCallbackForTarget(this, function () {
            if (self.isUploading) {
                self._logList = uploadData.concat(self._logList);
                self.saveToLocal();
                self.isUploading = false;
            }
        }, 30, 0);
    },

    saveToLocal: function () {
        cc.sys.localStorage.setItem("dataLog", JSON.stringify(this._logList));
    },

    loadFromLocal: function () {
        var data = cc.sys.localStorage.getItem("dataLog") || "[]";
        this._logList = SafetyHelper.safeJSONParse(data, [], "DataLog.loadFromLocal");
    },

    genPayLog: function (payRes, money, order, productId, currencyType, errorCode) {
        if (this.isNeedCollectData()) {
            var payState = 0;
            if (payRes == 1) {
                payState = 1;
            }
            if (errorCode) {
                payState += ";" + errorCode;
            }
            var log = [];
            log.push("pay");
            log = log.concat(this.commonDataBefore());
            log.push(this.getNotifyChannelId());
            log.push(order);
            log.push("");
            log.push(currencyType);
            log.push(Number(money).toFixed());
            log.push(payState);
            log.push(productId);
            log.push(1);
            log.push(this.getNowTime());
            log = log.concat(this.commonDataAfter());
            this.sendLog(log);
        }
    },

    /**
     * @param siteId 副本Id
     * @param opType 开启或关闭副本，0 开启，1正常结束，2 异常结束
     * @returns {Array}
     */
    genSiteLog: function (siteId, opType) {
        if (this.isNeedCollectData()) {
            var log = [];
            log.push("site");
            log = log.concat(this.commonDataBefore());
            log.push(parseInt(siteId));
            log.push(opType);
            log = log.concat(this.commonDataAfter());
            this.sendLog(log);
        }
    },
    genDeathLog: function () {
        if (this.isNeedCollectData()) {
            var log = [];
            log.push("death");
            log = log.concat(this.commonDataBefore());
            log.push(this.getTemperatureValue());
            log.push(this.getInjuryValue());
            log.push(this.getInjuryMaxValue());
            log.push(this.getInfectValue());
            log.push(this.getInfectMaxValue());
            log.push(this.getStarveValue());
            log.push(this.getStarveMaxValue());
            log.push(this.getVigourValue());
            log.push(this.getVigourMaxValue());
            log.push(this.getSpiritValue());
            log.push(this.getSpiritMaxValue());
            log.push(this.getLifeValue());
            log.push(this.getLifeMaxValue());
            log.push(this.getEquipmentBarItemDetail());
            log.push(this.getBagItemDetail());
            log.push(this.getWarehouseItemDetail());
            log.push(this.getMapDetail());
            log.push(this.getOccupation());
            log.push(this.getBuffDetail());
            log.push(this.getNpcDetail());
            log.push(this.getDeathReason());
            log.push(this.getDeathMap());
            log.push(this.getFirstAidKitUseFlag());
            log = log.concat(this.commonDataAfter());
            this.sendLog(log);
        }
    },
    genDayLog: function () {
        if (this.isNeedCollectData()) {
            var log = [];
            log.push("day");
            log = log.concat(this.commonDataBefore());
            log.push(this.getTemperatureValue());
            log.push(this.getInjuryValue());
            log.push(this.getInjuryMaxValue());
            log.push(this.getInfectValue());
            log.push(this.getInfectMaxValue());
            log.push(this.getStarveValue());
            log.push(this.getStarveMaxValue());
            log.push(this.getVigourValue());
            log.push(this.getVigourMaxValue());
            log.push(this.getSpiritValue());
            log.push(this.getSpiritMaxValue());
            log.push(this.getLifeValue());
            log.push(this.getLifeMaxValue());
            log.push(this.getEquipmentBarItemDetail());
            log.push(this.getBagItemDetail());
            log.push(this.getWarehouseItemDetail());
            log.push(this.getMapDetail());
            log.push(this.getOccupation());
            log.push(this.getBuffDetail());
            log.push(this.getNpcDetail());
            log = log.concat(this.commonDataAfter());
            this.sendLog(log);
        }
    },

    genShareLog: function (shareWay) {
        if (this.isNeedCollectData()) {
            var log = [];
            log.push("share");
            log = log.concat(this.commonDataBefore());
            log.push(shareWay);
            log.push(this.getRewardFlag());
            log.push(this.getRewardItemDetail());
            log = log.concat(this.commonDataAfter());
            this.sendLog(log);
        }
    },

    commonDataBefore: function () {
        var log = [];
        log.push(this.getNowTime());
        log.push(149);
        log.push(this.getServerId());
        log.push(this.getChannelId());
        log.push(this.getChannelUserId());
        log.push(this.getAppUserId());
        log.push(this.getAppUserName());
        log.push('');
        log.push('');
        log.push(1);
        log.push(this.getVersion());
        log.push(this.getPlatType());
        log.push(this.getDeviceId());
        return log;
    },

    commonDataAfter: function () {
        var log = [];
        log.push(this.getRound());
        log.push(this.getStartTime());
        log.push(this.getGameVirtualDay());
        log.push(this.getGameVirtualTime());
        log.push(CommonUtil.deviceIPAddress());
        log.push(CommonUtil.getLocaleCountryCode());
        log.push(CommonUtil.getLocaleLanguage());

        return log;
    },

    //客户端版本号
    getVersion: function () {
        return ClientData.CLIENT_VERSION;
    },

    //游戏服务器的id，如15201
    getServerId: function () {
        if (cc.sys.os == cc.sys.OS_IOS) {
            return 1101011001;
        } else if (cc.sys.os == cc.sys.OS_ANDROID) {
            if (PurchaseAndroid.payType === PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY) {
                return 1205191001;
            } else {
                return 1201021001;
            }
        }
    },

    //IOS 0 ， ANDROID 1
    getPlatType: function () {
        return cc.sys.os == cc.sys.OS_ANDROID ? 1 : 0;
    },

    //设备唯一id，如idfa或者mac
    getDeviceId: function () {
        if (cc.sys.os == cc.sys.OS_IOS) {
            return CommonUtil.getUUID();
        } else if (cc.sys.os == cc.sys.OS_ANDROID) {
            return CommonUtil.macAddress();
        }
    },

    //角色id，如547807789
    getAppUserId: function () {
        return Record.getUUID();
    },

    getAppUserName: function () {
        return Record.getUsername();
    },

    //账号数字id，如544312561
    getChannelUserId: function () {
        return cc.sys.localStorage.getItem("AccountId") || "";
    },

    //注册渠道id，如300200000
    getChannelId: function () {
        return ClientData.CHANNEL;
    },

    //总第多少局
    getRound: function () {
        var round = 0;
        var str = cc.sys.localStorage.getItem("round");
        if (str) {
            round = parseInt(str);
        }
        return round;
    },
    increaseRound: function () {
        var round = this.getRound();
        round++;
        cc.sys.localStorage.setItem("round", round);
        cc.sys.localStorage.setItem("startTime", this.getNowTime());
    },

    getNowTime: function () {
        var now = utils.getDateByTimezone(8);
        return now.format("YYYY-MM-dd hh:mm:ss.S");
    },

    getStartTime: function () {
        return cc.sys.localStorage.getItem("startTime");
    },

    getGameVirtualDay: function () {
        if (cc.timer) {
            return cc.timer.formatTime().d;
        } else {
            return 0;
        }
    },

    getGameVirtualTime: function () {
        if (cc.timer) {
            var timeObj = cc.timer.formatTime();
            var hourStr = "";
            if (timeObj.h < 10) {
                hourStr += "0" + timeObj.h;
            } else {
                hourStr += timeObj.h;
            }
            var minuteStr = "";
            if (timeObj.m < 10) {
                minuteStr += "0" + timeObj.m;
            } else {
                minuteStr += timeObj.m;
            }
            var secondStr = "";
            if (timeObj.s < 10) {
                secondStr += "0" + timeObj.s;
            } else {
                secondStr += timeObj.s;
            }

            return hourStr + ":" + minuteStr + ":" + secondStr;
        } else {
            return "00:00:00";
        }
    },

    getTemperatureValue: function () {
        return "" + memoryUtil.decode(player.temperature);
    },

    getInjuryValue: function () {
        return memoryUtil.decode(player.injury);
    },
    getInjuryMaxValue: function () {
        return memoryUtil.decode(player.injuryMax);
    },

    getInfectValue: function () {
        return memoryUtil.decode(player.infect);
    },
    getInfectMaxValue: function () {
        return memoryUtil.decode(player.infectMax);
    },

    getStarveValue: function () {
        return memoryUtil.decode(player.starve);
    },
    getStarveMaxValue: function () {
        return memoryUtil.decode(player.starveMax);
    },

    getVigourValue: function () {
        return memoryUtil.decode(player.vigour);
    },
    getVigourMaxValue: function () {
        return memoryUtil.decode(player.vigourMax);
    },

    getSpiritValue: function () {
        return memoryUtil.decode(player.spirit);
    },
    getSpiritMaxValue: function () {
        return memoryUtil.decode(player.spiritMax);
    },

    getLifeValue: function () {
        return memoryUtil.decode(player.hp);
    },
    getLifeMaxValue: function () {
        return Math.floor(memoryUtil.decode(player.hpMax));
    },

    getEquipmentBarItemDetail: function () {
        var log = "";
        for (var key in EquipmentPos) {
            var itemId = player.equip.getEquip(EquipmentPos[key]);
            if (itemId) {
                log += (EquipmentPos[key] + 1) + "-" + itemId + ";";
            }
        }
        return log;
    },

    getBagItemDetail: function () {
        var log = "";
        player.bag.forEach(function (item, num) {
            log += item.id + "-" + num + ";";
        });
        return log;
    },

    getWarehouseItemDetail: function () {
        var log = "";
        player.storage.forEach(function (item, num) {
            log += item.id + "-" + num + ";";
        });
        return log;
    },

    getMapDetail: function () {
        var log = "";
        var siteMap = player.map.siteMap;
        for (var siteId in siteMap) {
            var site = siteMap[siteId];
            log += siteId + "-" + (site.closed ? 1 : 0) + ";";
        }
        return log;
    },

    getOccupation: function () {
        return TalentService.getChosenTalentPurchaseId();
    },

    getBuffDetail: function () {
        return Number(player.weather.weatherId);
    },

    getNpcDetail: function () {
        var log = "";
        var npcMap = player.map.npcMap;
        for (var npcId in npcMap) {
            var npc = player.npcManager.getNPC(npcId);
            log += npcId + "-" + memoryUtil.decode(npc.reputation) + "-" + npc.tradingCount + ";";
            npc.tradingCount = 0;
        }
        return log;
    },

    getDeathReason: function () {
        return player.deathCausedInfect ? 2 : 1
    },

    getDeathMap: function () {
        if (player.isAtHome()) {
            return 10000;
        } else if (player.isAtSite()) {
            return player.getCurrentSiteId();
        } else {
            return 10001;
        }
    },

    getFirstAidKitUseFlag: function () {
        if (player.bag.validateItem(RELIVE_ITEMID, 1) || player.storage.validateItem(RELIVE_ITEMID, 1)) {
            return 1;
        } else {
            return 0;
        }
    },

    getNotifyChannelId: function () {
        return this.getChannelId();
    },

    isNeedCollectData: function () {
        return true;
    },

    getRewardFlag: function () {
        return Record.getShareFlag() === ShareType.SHARED_CAN_REWARD ? 1 : 0;
    },

    getRewardItemDetail: function () {
        return '1106054-1;'
    }

};
