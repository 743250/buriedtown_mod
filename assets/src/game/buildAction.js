/**
 * Created by lancelot on 15/4/3.
 */

var BuildNodeUpdateEventName = (typeof GameEvents !== "undefined" && GameEvents && GameEvents.BUILD_NODE_UPDATE)
    ? GameEvents.BUILD_NODE_UPDATE
    : "build_node_update";

var BuildAction = cc.Class.extend({
    ctor: function (bid) {
        this.isActioning = false;
        this.bid = bid;
        this.id = this.bid;
    },
    getActionKey: function () {
        if (this.actionKey !== undefined && this.actionKey !== null) {
            return this.actionKey;
        }
        if (this.index !== undefined && this.index !== null) {
            return this.bid + ":" + this.index;
        }
        return this.id;
    },
    getCurrentBuildLevel: function () {
        return player.room.getBuildLevel(this.bid);
    },
    save: function () {
        return {};
    },
    restore: function (saveObj) {
        if (saveObj) {
        }
    },
    clickIcon: function () {
    },
    clickAction1: function () {
    },
    _sendUpdageSignal: function () {
        utils.emitter.emit(BuildNodeUpdateEventName);
    },
    _updateStatus: function () {
    },
    _getUpdateViewInfo: function () {
    },
    updateView: function (view, idx) {
        this.view = view;
        this.idx = idx;
        if (this.view) {
            this.build = player.room.getBuild(this.bid);
            this.view.updateView({btnIdx: idx});
            this._updateStatus();
            var viewInfo = this._getUpdateViewInfo();
            if (this.build.anyBtnActive() && !this.build.canUseAction(this.getActionKey())) {
                viewInfo.action1Disabled = true;
            }
            this.view.updateView(viewInfo);
        }
    },
    addTimer: function (time, totalTime, endCb, notAccelerate, startTime) {
        this.isActioning = true;
        this.totalTime = totalTime;
        var self = this;

        var onProgress = function (dt, percentage, pastTime) {
            self.pastTime = pastTime;
            if (self.view) {
                self.view.updatePercentage(percentage * 100);
                if (self.step && self.step === 1) {
                    self.view.updateHint(self.getPlacedTxt(self.totalTime - pastTime));
                }
            }
        };
        var onComplete = function () {
            self.isActioning = false;
            self.pastTime = 0;
            if (endCb) {
                endCb();
            }
            self._sendUpdageSignal();
        };

        if (typeof TimerHelper !== "undefined"
            && TimerHelper
            && typeof TimerHelper.createProgressTimer === "function") {
            TimerHelper.createProgressTimer(time, this, onProgress, onComplete, startTime, !notAccelerate);
            return;
        }

        var pastTime = startTime || 0;
        var timerStartTime = startTime ? cc.timer.time - startTime : undefined;
        cc.timer.addTimerCallback(new TimerCallback(time, this, {
            process: function (dt) {
                pastTime += dt;
                var percentage = pastTime / time;
                onProgress(dt, percentage, pastTime);
            },
            end: function () {
                onComplete();
            }
        }), timerStartTime);

        if (!notAccelerate) {
            cc.timer.accelerateWorkTime(time);
        }
    },
    _setLeftBtnEnabled: function (enabled) {
        utils.emitter.emit("left_btn_enabled", !!enabled);
    },
    _beginActioning: function () {
        this._setLeftBtnEnabled(false);
        if (this.build) {
            this.build.setActiveBtnIndex(this.getActionKey());
        }
    },
    _finishActioning: function (opt) {
        opt = opt || {};
        if (opt.resetBuildBtn !== false && this.build) {
            this.build.resetActiveBtnIndex(this.getActionKey());
        }
        if (opt.enableLeftBtn !== false) {
            this._setLeftBtnEnabled(true);
        }
        if (opt.saveRecord !== false) {
            Record.saveAll();
        }
    },
    _isNeedBuildLocked: function () {
        return this.needBuild && this.needBuild.level > player.room.getBuildLevel(this.needBuild.bid);
    },
    _getNeedBuildHint: function () {
        if (!this.needBuild) {
            return "";
        }
        return stringUtil.getString(1006, player.room.getBuildName(this.needBuild["bid"], this.needBuild["level"]));
    },
    _isCostEnough: function (cost) {
        return player.validateItems(cost);
    },
    _buildCostItems: function (cost) {
        if (!cost) {
            return null;
        }
        return cost.map(function (itemInfo) {
            return {
                itemId: itemInfo.itemId,
                num: itemInfo.num,
                color: itemInfo.haveNum >= itemInfo.num ? cc.color.WHITE : cc.color.RED
            };
        });
    },
    canMake: function () {
        return false;
    }
});

var Formula = BuildAction.extend({
    ctor: function (fid, bid) {
        this._super(bid);
        this.id = fid;
        this.config = utils.clone(formulaConfig[this.id]);
        this.needBuild = null;
        this.step = 0;
        this.maxStep = this.config["placedTime"] ? 2 : 1;
    },
    save: function () {
        return {step: this.step, pastTime: this.pastTime};
    },
    restore: function (saveObj) {
        if (saveObj) {
            this.step = saveObj.step;
            this.pastTime = saveObj.pastTime;
            if (this.step == 1) {
                this.place();
            }
        }
    },
    clickIcon: function () {
        uiUtil.showItemDialog(this.config.produce[0].itemId, true);
    },
    place: function () {
        var self = this;
        var itemInfo = this.config.produce[0];
        var itemName = stringUtil.getString(itemInfo.itemId).title;
        var time = this.config["placedTime"];
        time *= 60;
        this.addTimer(time, time, function () {
            self.step++;
            player.log.addMsg(1091, player.room.getBuildCurrentName(self.bid), itemName);
            utils.emitter.emit("placed_success", self.bid);
        }, true, this.pastTime);
    },
    clickAction1: function () {
        if (!uiUtil.checkVigour())
            return;
        var itemInfo = this.config.produce[0];
        var itemName = stringUtil.getString(itemInfo.itemId).title;
        if (this.step == 0) {
            if (this.build && !this.build.canUseAction(this.getActionKey())) {
                return;
            }
            this._beginActioning();


            //2. 制作
            var time = this.config["makeTime"];
            time *= 60;
            var self = this;
            this.addTimer(time, time, function () {
                self.step++;
                if (self.step == self.maxStep) {
                    self.step = 0;
                }
                if (self.step == 1) {
                    //1. cost成功
                    player.costItems(self.config.cost);
                    self.place();
                    self._finishActioning({resetBuildBtn: false});
                } else {

                    //1. cost成功
                    player.costItems(self.config.cost);

                    //非放置类的,第一次进度完成即获取物品
                    var produce = (typeof WeaponCraftService !== "undefined" && WeaponCraftService && WeaponCraftService.rollDurableProduce)
                        ? WeaponCraftService.rollDurableProduce(self.config.produce)
                        : utils.clone(self.config.produce);
                    player.gainItems(produce);
                    produce.forEach(function (item) {
                        Achievement.checkMake(item.itemId, item.num);
                    });
                    var producedItemInfo = produce[0] || itemInfo;
                    var producedItemName = stringUtil.getString(producedItemInfo.itemId).title;
                    player.log.addMsg(1090, producedItemInfo.num, producedItemName, player.storage.getNumByItemId(producedItemInfo.itemId));

                    if (self.build.id === 1 && userGuide.isStep(userGuide.stepName.TOOL_ALEX)) {
                        userGuide.step();
                        //解锁大门
                        player.room.createBuild(14, 0);
                    }
                    self._finishActioning();
                }
            });
        } else {
            //天气影响
            var produce = utils.clone(this.config.produce);
            //蒸馏水的影响
            produce.forEach(function (item) {
                if (item.itemId == 1101061) {
                    item.num += player.weather.getValue("item_1101061");
                }
            });
            //温棚影响
            if (this.bid == 2) {
                produce.forEach(function (item) {
                    item.num += player.weather.getValue("build_2");
                });
            }
            produce = TalentService.applyHomeProduceEffect(produce);
            if (typeof WeaponCraftService !== "undefined" && WeaponCraftService && WeaponCraftService.rollDurableProduce) {
                produce = WeaponCraftService.rollDurableProduce(produce);
            }

            //放置完毕收获
            player.gainItems(produce);
            produce.forEach(function (item) {
                Achievement.checkProduce(item.itemId, item.num);
            });
            this.step = 0;
            var producedItem = produce[0] || itemInfo;
            player.log.addMsg(1092, producedItem.num, stringUtil.getString(producedItem.itemId).title, player.storage.getNumByItemId(producedItem.itemId));
            this._finishActioning({enableLeftBtn: false});
        }
        this._sendUpdageSignal();
    },
    getPlacedTxt: function (time) {
        var itemName = stringUtil.getString(this.config.produce[0].itemId).title;
        //return stringUtil.getString(1008, itemName + Math.ceil(time / 60 / 60));
        return stringUtil.getString(1008, Math.ceil(time / 60 / 60));
    },
    _getUpdateViewInfo: function () {
        var iconName = uiUtil.getItemIconFrameName(this.config.produce[0].itemId, true);

        var action1Txt = (this.step == 1 || this.step == 2) ? stringUtil.getString(1003) : stringUtil.getString(1002, this.config["makeTime"]);
        var itemName = stringUtil.getString(this.config.produce[0].itemId).title;

        var hint, hintColor, items, action1Disabled;
        if (this._isNeedBuildLocked()) {
            hint = this._getNeedBuildHint();
            hintColor = cc.color.RED;
            action1Disabled = true;
        } else if (this.isActioning) {
            if (this.step == 1) {
                //hint = stringUtil.getString(1008, itemName + Math.ceil(this.config["placedTime"] / 60));
                hint = stringUtil.getString(1008, Math.ceil(this.config["placedTime"] / 60));
            } else {
                hint = stringUtil.getString(1007, itemName);
            }
            hintColor = cc.color.WHITE;
            action1Disabled = true;
        } else {
            if (this.step == 2) {
                hint = stringUtil.getString(1009, itemName);
            } else {
                hint = "";
                var cost = this.config.cost;
                if (!this._isCostEnough(cost)) {
                    action1Disabled = true;
                }
                items = this._buildCostItems(cost);
            }
        }

        var res = {
            iconName: iconName,
            iconFallbackName: uiUtil.getDefaultSpriteName("item", true),
            hint: hint,
            hintColor: hintColor,
            items: items,
            action1: action1Txt,
            action1Disabled: action1Disabled,
            percentage: 0
        };
        return res;
    },
    canMake: function () {
        var cost = this.config.cost;
        return this._isCostEnough(cost) && !this._isNeedBuildLocked();
    }
});

var TrapBuildAction = Formula.extend({
    ctor: function (bid) {
        this.isActioning = false;
        this.bid = bid;
        this.id = this.bid;
        this.config = utils.clone(buildActionConfig[this.id][0]);
        this.needBuild = {bid: this.id, level: 0};
        this.step = 0;
        this.maxStep = this.config["placedTime"] ? 2 : 1;
    },
    clickIcon: function () {
        uiUtil.showBuildActionDialog(this.bid, 0);
    },
    place: function () {
        var self = this;
        var itemInfo = this.config.produce[0];
        var itemName = stringUtil.getString(itemInfo.itemId).title;
        var placedTimes = self.config["placedTime"];
        var time = utils.getRandomInt(placedTimes[0], placedTimes[1]);
        time *= 60;
        var totalTime = placedTimes[1] * 60;
        self.addTimer(time, totalTime, function () {
            self.step++;
            player.log.addMsg(1091, player.room.getBuildCurrentName(self.bid), itemName);
            utils.emitter.emit("placed_success", self.id);
        }, true, this.pastTime);
    },
    clickAction1: function () {
        if (!uiUtil.checkVigour())
            return;

        var itemInfo = this.config.produce[0];
        var itemName = stringUtil.getString(itemInfo.itemId).title;

        if (this.step == 0) {
            this._beginActioning();

            //2. 制作
            var time = this.config["makeTime"];
            time *= 60;
            var self = this;
            this.addTimer(time, time, function () {
                self.step++;
                if (self.step == self.maxStep) {
                    self.step = 0;
                }
                if (self.step == 1) {
                    //1. cost成功
                    player.costItems(self.config.cost);
                    self.place();
                    self._finishActioning({resetBuildBtn: false});
                } else {
                    //1. cost成功
                    player.costItems(self.config.cost);

                    //非放置类的,第一次进度完成即获取物品
                    player.gainItems(self.config.produce);
                    self._finishActioning();
                }
            });
        } else {
            //天气影响
            var produce = utils.clone(this.config.produce);
            //肉的影响
            produce.forEach(function (item) {
                if (item.itemId == 1103041) {
                    item.num += player.weather.getValue("item_1103041");
                }
            });
            produce = TalentService.applyHomeProduceEffect(produce);

            //放置完毕收获
            player.gainItems(produce);
            produce.forEach(function (item) {
                Achievement.checkProduce(item.itemId, item.num);
            });
            this.step = 0;
            player.log.addMsg(1092, produce[0].num, itemName, player.storage.getNumByItemId(itemInfo.itemId));
            this._finishActioning({enableLeftBtn: false});
        }
        this._sendUpdageSignal();
    },
    getPlacedTxt: function (time) {
        return stringUtil.getString(1154);
    },
    _getUpdateViewInfo: function () {
        var iconName = "#build_action_" + this.id + "_0" + ".png";

        var action1Txt = (this.step == 1 || this.step == 2) ? stringUtil.getString(1003) : stringUtil.getString(1155, this.config["makeTime"]);
        var itemName = stringUtil.getString(this.config.produce[0].itemId).title;

        var hint, hintColor, items, action1Disabled;
        if (this._isNeedBuildLocked()) {
            hint = this._getNeedBuildHint();
            hintColor = cc.color.RED;
            action1Disabled = true;
        } else if (this.isActioning) {
            if (this.step == 1) {
                hint = stringUtil.getString(1154);
            } else {
                hint = stringUtil.getString(1153);
            }
            hintColor = cc.color.WHITE;
            action1Disabled = true;
        } else {
            if (this.step == 2) {
                hint = stringUtil.getString(1009, itemName);
            } else {
                hint = "";
                var cost = this.config.cost;
                if (!this._isCostEnough(cost)) {
                    action1Disabled = true;
                }
                items = this._buildCostItems(cost);
            }
        }

        var res = {
            iconName: iconName,
            hint: hint,
            hintColor: hintColor,
            items: items,
            action1: action1Txt,
            action1Disabled: action1Disabled,
            percentage: 0
        };
        return res;
    }
});

var DogBuildAction = BuildAction.extend({
    ctor: function (bid) {
        this._super(bid);
        this.config = utils.clone(buildActionConfig[this.id][0]);
        this.needBuild = {bid: this.id, level: 0};
    },
    clickIcon: function () {
        uiUtil.showBuildActionDialog(this.bid, 0);
    },
    clickAction1: function () {
        if (!uiUtil.checkVigour())
            return;
        if (!player.dog.canFeed()) {
            uiUtil.showTinyInfoDialog(1130);
            return;
        }
        this._beginActioning();

        //2. 制作
        var time = this.config["makeTime"];
        time *= 60;
        var self = this;
        this.addTimer(time, time, function () {
            //1. cost成功
            player.costItems(self.config.cost);

            player.dog.feed();
            self._finishActioning();
        });
        this._sendUpdageSignal();
    },
    _getUpdateViewInfo: function () {
        var iconName = "#build_action_" + this.id + "_0" + ".png";

        var action1Txt = stringUtil.getString(1020, this.config["makeTime"]);

        var hint, hintColor, items, action1Disabled;
        if (this._isNeedBuildLocked()) {
            hint = this._getNeedBuildHint();
            hintColor = cc.color.RED;
            action1Disabled = true;
        } else if (this.isActioning) {
            hint = stringUtil.getString(1023);
            hintColor = cc.color.WHITE;
            action1Disabled = true;
        } else {
            hint = player.dog.isActive() ? stringUtil.getString(1021) : stringUtil.getString(1022);
            var cost = this.config.cost;
            if (!this._isCostEnough(cost)) {
                action1Disabled = true;
            }
            items = this._buildCostItems(cost);
        }

        var res = {
            iconName: iconName,
            hint: hint,
            hintColor: hintColor,
            items: items,
            action1: action1Txt,
            action1Disabled: action1Disabled,
            percentage: 0
        };
        return res;
    }
});

var RestBuildAction = BuildAction.extend({
    ctor: function (bid, level) {
        this._super(bid);
        this.level = level >= 0 ? level : 0;
        cc.assert(this.level < buildActionConfig[this.id].length, "RestBuildAction buildActionConfig doesn't exist!");
        this.configs = utils.clone(buildActionConfig[this.id]);
        this.needBuild = {bid: this.id, level: 0};
        this.index = 0;
    },
    updateConfig: function () {
        return BuildActionEffectService.updateConfig(this);
        var level = this.getCurrentBuildLevel();
        level = level >= 0 ? level : 0;
        this.config = this.configs[level][this.index];
    },
    clickIcon: function () {
        return BuildActionEffectService.showBuildActionDialog(this);
        uiUtil.showBuildActionDialog(this.bid, this.index);
    },
    clickAction1: function () {
        return BuildActionEffectService.runTimedEffectAction(this, {logMessageId: 1096});
        if (!uiUtil.checkVigour())
            return;
        this.updateConfig();
        this._beginActioning();

        //2. 制作
        var time = this.config["makeTime"];
        time *= 60;
        var self = this;
        this.addTimer(time, time, function () {
            //1. cost成功
            player.costItems(self.config.cost);

            self.config.cost.forEach(function (item) {
                Achievement.checkCost(item.itemId, item.num);
            });

            player.applyEffect(self.config["effect"]);
            var itemInfo = self.config.cost[0];
            var itemName = stringUtil.getString(itemInfo.itemId).title;
            player.log.addMsg(1096, itemName, player.storage.getNumByItemId(itemInfo.itemId));
            self._finishActioning();
        });
        this._sendUpdageSignal();
    },
    _getUpdateViewInfo: function () {
        return BuildActionEffectService.buildTimedEffectViewInfo(this, {
            iconIndex: 0,
            actionTextId: 1014,
            progressHintIds: {
                1: 1016,
                2: 1017,
                default: 1015
            }
        });
        this.updateConfig();
        var iconName = "#build_action_" + this.id + "_0" + ".png";

        var action1Txt = stringUtil.getString(1014, this.config["makeTime"]);

        var hint, hintColor, items, action1Disabled;
        if (this._isNeedBuildLocked()) {
            hint = this._getNeedBuildHint();
            hintColor = cc.color.RED;
            action1Disabled = true;
        } else if (this.isActioning) {
            if (this.level === 1) {
                hint = stringUtil.getString(1016);
            } else if (this.level === 2) {
                hint = stringUtil.getString(1017);
            } else {
                hint = stringUtil.getString(1015);
            }
            hintColor = cc.color.WHITE;
            action1Disabled = true;
        } else {
            hint = "";
            var cost = this.config.cost;
            if (!this._isCostEnough(cost)) {
                action1Disabled = true;
            }
            items = this._buildCostItems(cost);
        }

        var res = {
            iconName: iconName,
            hint: hint,
            hintColor: hintColor,
            items: items,
            action1: action1Txt,
            action1Disabled: action1Disabled,
            percentage: 0
        };
        return res;
    }
});

var DrinkBuildAction = BuildAction.extend({
    ctor: function (bid, level) {
        this._super(bid);
        this.level = level >= 0 ? level : 0;
        cc.assert(this.level < buildActionConfig[this.id].length, "DrinkBuildAction buildActionConfig doesn't exist!");
        this.configs = utils.clone(buildActionConfig[this.id]);
        this.needBuild = {bid: this.id, level: 0};
        this.index = 1;
    },
    updateConfig: function () {
        return BuildActionEffectService.updateConfig(this);
        var level = this.getCurrentBuildLevel();
        level = level >= 0 ? level : 0;
        this.config = this.configs[level][this.index];
    },
    clickIcon: function () {
        return BuildActionEffectService.showBuildActionDialog(this);
        uiUtil.showBuildActionDialog(this.bid, this.index);
    },
    clickAction1: function () {
        return BuildActionEffectService.runTimedEffectAction(this, {logMessageId: 1309});
        if (!uiUtil.checkVigour())
            return;
        this.updateConfig();
        this._beginActioning();

        //2. 制作
        var time = this.config["makeTime"];
        time *= 60;
        var self = this;
        this.addTimer(time, time, function () {
            //1. cost成功
            player.costItems(self.config.cost);

            self.config.cost.forEach(function (item) {
                Achievement.checkCost(item.itemId, item.num);
            });

            player.applyEffect(self.config["effect"]);
            var itemInfo = self.config.cost[0];
            var itemName = stringUtil.getString(itemInfo.itemId).title;
            player.log.addMsg(1309, itemName, player.storage.getNumByItemId(itemInfo.itemId));
            self._finishActioning();
        });
        this._sendUpdageSignal();
    },
    _getUpdateViewInfo: function () {
        return BuildActionEffectService.buildTimedEffectViewInfo(this, {
            iconIndex: 1,
            actionTextId: 1308,
            progressHintIds: {
                1: 1306,
                2: 1307,
                default: 1305
            }
        });
        this.updateConfig();
        var iconName = "#build_action_" + this.id + "_1" + ".png";

        var action1Txt = stringUtil.getString(1308, this.config["makeTime"]);

        var hint, hintColor, items, action1Disabled;
        if (this._isNeedBuildLocked()) {
            hint = this._getNeedBuildHint();
            hintColor = cc.color.RED;
            action1Disabled = true;
        } else if (this.isActioning) {
            if (this.level === 1) {
                hint = stringUtil.getString(1306);
            } else if (this.level === 2) {
                hint = stringUtil.getString(1307);
            } else {
                hint = stringUtil.getString(1305);
            }
            hintColor = cc.color.WHITE;
            action1Disabled = true;
        } else {
            hint = "";
            var cost = this.config.cost;
            if (!this._isCostEnough(cost)) {
                action1Disabled = true;
            }
            items = this._buildCostItems(cost);
        }

        var res = {
            iconName: iconName,
            hint: hint,
            hintColor: hintColor,
            items: items,
            action1: action1Txt,
            action1Disabled: action1Disabled,
            percentage: 0
        };
        return res;
    }
});

var DrinkTeaBuildAction = BuildAction.extend({
    ctor: function (bid, level) {
        this._super(bid);
        this.level = level >= 0 ? level : 0;
        cc.assert(this.level < buildActionConfig[this.id].length, "DrinkTeaBuildAction buildActionConfig doesn't exist!");
        this.configs = utils.clone(buildActionConfig[this.id]);
        this.needBuild = {bid: this.id, level: 0};
        this.index = 2;
    },
    updateConfig: function () {
        return BuildActionEffectService.updateConfig(this);
        var level = this.getCurrentBuildLevel();
        level = level >= 0 ? level : 0;
        this.config = this.configs[level][this.index];
    },
    clickIcon: function () {
        return BuildActionEffectService.showBuildActionDialog(this);
        uiUtil.showBuildActionDialog(this.bid, this.index);
    },
    clickAction1: function () {
        return BuildActionEffectService.runTimedEffectAction(this, {logMessageId: 1336});
        if (!uiUtil.checkVigour())
            return;
        this.updateConfig();
        this._beginActioning();

        //2. 制作
        var time = this.config["makeTime"];
        time *= 60;
        var self = this;
        this.addTimer(time, time, function () {
            //1. cost成功
            player.costItems(self.config.cost);

            self.config.cost.forEach(function (item) {
                Achievement.checkCost(item.itemId, item.num);
            });

            player.applyEffect(self.config["effect"]);
            var itemInfo = self.config.cost[0];
            var itemName = stringUtil.getString(itemInfo.itemId).title;
            player.log.addMsg(1336, itemName, player.storage.getNumByItemId(itemInfo.itemId));
            self._finishActioning();
        });
        this._sendUpdageSignal();
    },
    _getUpdateViewInfo: function () {
        return BuildActionEffectService.buildTimedEffectViewInfo(this, {
            iconIndex: 0,
            actionTextId: 1335,
            progressHintIds: {
                1: 1337,
                2: 1338,
                default: 1339
            }
        });
        this.updateConfig();
        var iconName = "#build_action_" + this.id + "_0" + ".png";

        var action1Txt = stringUtil.getString(1335, this.config["makeTime"]);

        var hint, hintColor, items, action1Disabled;
        if (this._isNeedBuildLocked()) {
            hint = this._getNeedBuildHint();
            hintColor = cc.color.RED;
            action1Disabled = true;
        } else if (this.isActioning) {
            if (this.level === 1) {
                hint = stringUtil.getString(1337);
            } else if (this.level === 2) {
                hint = stringUtil.getString(1338);
            } else {
                hint = stringUtil.getString(1339);
            }
            hintColor = cc.color.WHITE;
            action1Disabled = true;
        } else {
            hint = "";
            var cost = this.config.cost;
            if (!this._isCostEnough(cost)) {
                action1Disabled = true;
            }
            items = this._buildCostItems(cost);
        }

        var res = {
            iconName: iconName,
            hint: hint,
            hintColor: hintColor,
            items: items,
            action1: action1Txt,
            action1Disabled: action1Disabled,
            percentage: 0
        };
        return res;
    }
});

var SmokeBuildAction = BuildAction.extend({
    ctor: function (bid, level, actionIndex) {
        this._super(bid);
        this.level = level >= 0 ? level : 0;
        cc.assert(this.level < buildActionConfig[this.id].length, "SmokeBuildAction buildActionConfig doesn't exist!");
        this.configs = utils.clone(buildActionConfig[this.id]);
        this.needBuild = {bid: this.id, level: 0};
        this.index = actionIndex;
    },
    updateConfig: function () {
        return BuildActionEffectService.updateConfig(this);
    },
    clickIcon: function () {
        return BuildActionEffectService.showBuildActionDialog(this);
    },
    clickAction1: function () {
        return BuildActionEffectService.runTimedEffectAction(this, {logMessageId: 1373});
    },
    _getUpdateViewInfo: function () {
        return BuildActionEffectService.buildTimedEffectViewInfo(this, {
            iconIndex: 1,
            actionTextId: 1370,
            progressHintIds: {
                1: 1371,
                2: 1371,
                default: 1371
            }
        });
    }
});

var BedBuildActionType = {
    SLEEP_1_HOUR: 1,
    SLEEP_4_HOUR: 2,
    SLEEP_ALL_NIGHT: 3,
    SLEEP_TO_NIGHT: 4
}
var BedBuildAction = BuildAction.extend({
    ctor: function (bid, level, bedBuildActionType) {
        this._super(bid);
        this.level = level >= 0 ? level : 0;
        cc.assert(this.level < buildActionConfig[this.id].length, "BedBuildAction buildActionConfig doesn't exist!");
        this.configs = utils.clone(buildActionConfig[this.id]);
        this.type = bedBuildActionType;
        this.actionKey = this.bid + ":" + this.type;
        this.needBuild = {bid: this.id, level: 0};
    },
    updateConfig: function () {
        var level = this.getCurrentBuildLevel();
        level = level >= 0 ? level : 0;
        this.config = this.configs[level];
    },
    clickIcon: function () {
        uiUtil.showBuildActionDialog(this.bid, this.type - 1);
    },
    clickAction1: function () {
        this.updateConfig();

        this._beginActioning();
        //2. 制作
        var time;
        switch (this.type) {
            case BedBuildActionType.SLEEP_1_HOUR:
                time = 1 * 60 * 60;
                break;
            case BedBuildActionType.SLEEP_4_HOUR:
                time = 4 * 60 * 60;
                break;
            case BedBuildActionType.SLEEP_ALL_NIGHT:
                time = cc.timer.getTimeFromNowToMorning();
                break;
            case BedBuildActionType.SLEEP_TO_NIGHT:
                time = cc.timer.getTimeFromNowToNight();
                break;
        }
        //单位小时的影响
        var effect = this.config["effect"];
        var hours = time / 60 / 60;
        var totalEffect = {};
        for (var key in effect) {
            if (key.indexOf("_chance") === -1) {
                totalEffect[key] = Math.ceil(effect[key] * hours);
            } else {
                totalEffect[key] = effect[key];
            }
        }
        player.sleep();
        var self = this;
        this.addTimer(time, time, function () {
            player.applyEffect(totalEffect);
            player.wakeUp();
            self._finishActioning();
        });
        this._sendUpdageSignal();
        player.log.addMsg(1098);
    },
    _getUpdateViewInfo: function () {
        this.updateConfig();

        var iconName = "#build_action_" + this.id + "_" + (this.type - 1) + ".png";

        var action1Txt = stringUtil.getString(1018);

        var hint, hintColor, items, action1Disabled;
        if (this._isNeedBuildLocked()) {
            hint = this._getNeedBuildHint();
            hintColor = cc.color.RED;
            action1Disabled = true;
        } else if (this.isActioning) {
            hint = stringUtil.getString(1019);
            hintColor = cc.color.WHITE;
            action1Disabled = true;
        } else {
            hint = "";
            switch (this.type) {
                case BedBuildActionType.SLEEP_1_HOUR:
                    hint = stringUtil.getString(1144, 1);
                    break;
                case BedBuildActionType.SLEEP_4_HOUR:
                    hint = stringUtil.getString(1144, 4);
                    break;
                case BedBuildActionType.SLEEP_ALL_NIGHT:
                    hint = stringUtil.getString(1145);
                    break;
                case BedBuildActionType.SLEEP_TO_NIGHT:
                    hint = stringUtil.getString(1341);
                    break;
            }
            hintColor = cc.color.WHITE;
        }

        var res = {
            iconName: iconName,
            hint: hint,
            hintColor: hintColor,
            items: items,
            action1: action1Txt,
            action1Disabled: action1Disabled,
            percentage: 0
        };
        cc.e(JSON.stringify(res));
        return res;
    }
});

var BonfireBuildAction = BuildAction.extend({
    ctor: function (bid) {
        this._super(bid);
        this.config = utils.clone(buildActionConfig[this.id][0]);
        this.fuel = 0;
        this.pastTime = 0;
        this.startTime = null;
        this.fuelMax = this.config.max;
        this.timePerFuel = this.config["makeTime"] * 60;
        this.needBuild = {bid: this.id, level: 0};
    },
    clickIcon: function () {
        uiUtil.showBuildActionDialog(this.bid, 0);
    },
    clickAction1: function () {
        if (!uiUtil.checkVigour())
            return;
        if (player.validateItems(this.config.cost)) {
            if (this.fuel >= this.fuelMax) {
                uiUtil.showTinyInfoDialog(1134);
            } else {
                player.costItems(this.config.cost);

                this.addFuel();
            }
        } else {
            uiUtil.showTinyInfoDialog(1146);
        }
    },
    addFuelTimer: function () {
        var self = this;
        this.addTimer(this.timePerFuel, function () {
            self.fuel--;
            if (self.fuel > 0) {
                self.addFuelTimer();
            } else {
                //中断回复后,并不需要build resetActiveBtnIndex
                if (self.build) {
                    self.build.resetActiveBtnIndex(self.getActionKey());
                }
                //燃料用尽刷新温度
                player.updateTemperature();
            }
            Record.saveAll();
        }, this.startTime);
    },
    addFuel: function () {
        //燃料空的时候,注册timer
        if (this.fuel == 0) {
            this.addFuelTimer();
            this.build.setActiveBtnIndex(this.getActionKey());
        }
        this.fuel++;

        player.updateTemperature();

        this._sendUpdageSignal();
        player.log.addMsg(1097);

        Record.saveAll();
    },
    save: function () {
        return {
            fuel: this.fuel,
            pastTime: this.pastTime,
            startTime: this.startTime
        };
    },
    restore: function (saveObj) {
        if (saveObj) {
            this.fuel = saveObj.fuel || 0;
            this.pastTime = saveObj.pastTime || 0;
            this.startTime = saveObj.startTime;
        }
        if (this.fuel > 0) {
            this.addFuelTimer();
        }
    },
    addTimer: function (time, endCb, startTime) {
        this.isActioning = true;
        var self = this;
        var tcb = cc.timer.addTimerCallback(new TimerCallback(time, this, {
            process: function (dt) {
                self.pastTime += dt;
                self.totalTime = self.fuel * self.timePerFuel;
                if (self.view) {
                    self.view.updatePercentage((self.totalTime - self.pastTime ) / self.totalTime * 100);
                }
            },
            end: function () {
                self.isActioning = false;
                self.pastTime = 0;
                self.startTime = null;

                if (endCb) {
                    endCb();
                }

                self._sendUpdageSignal();
            }
        }), startTime);
        this.startTime = tcb.startTime;
    },
    _getUpdateViewInfo: function () {
        var iconName = "#build_action_" + this.id + "_0" + ".png";

        var action1Txt = stringUtil.getString(1010);

        var hint, hintColor, items, action1Disabled;
        if (this._isNeedBuildLocked()) {
            hint = this._getNeedBuildHint();
            hintColor = cc.color.RED;
            action1Disabled = true;
        } else if (this.isActioning) {
            hint = stringUtil.getString(1012, this.fuel, Math.floor(this.fuel * this.config["makeTime"] / 60));
            hintColor = cc.color.WHITE;
        } else {
            hint = stringUtil.getString(1011);
            hintColor = cc.color.WHITE;
        }

        var res = {
            iconName: iconName,
            hint: hint,
            hintColor: hintColor,
            items: items,
            action1: action1Txt,
            action1Disabled: action1Disabled,
            percentage: 0
        };
        return res;
    }
});

var BombBuildAction = BuildAction.extend({
    ctor: function (bid) {
        this._super(bid);
        this.config = utils.clone(buildActionConfig[this.id][0]);
        this.needBuild = {bid: this.id, level: 0};
    },
    active: function () {
        player.isBombActive = true;
    },
    isActive: function () {
        return player.isBombActive;
    },
    clickIcon: function () {
        uiUtil.showBuildActionDialog(this.bid, 0);
    },
    clickAction1: function () {
        if (!uiUtil.checkVigour())
            return;
        if (this.isActive()) {
            uiUtil.showTinyInfoDialog(1304);
            return;
        }
        this._beginActioning();

        //2. 制作
        var time = this.config["makeTime"];
        time *= 60;
        var self = this;
        this.addTimer(time, time, function () {
            //1. cost成功
            player.costItems(self.config.cost);

            self.active();
            self._finishActioning();
        });
        this._sendUpdageSignal();
    },
    _getUpdateViewInfo: function () {
        var iconName = "#build_action_" + this.id + "_0" + ".png";

        var action1Txt = stringUtil.getString(1303, this.config["makeTime"]);

        var hint, hintColor, items, action1Disabled;
        if (this._isNeedBuildLocked()) {
            hint = this._getNeedBuildHint();
            hintColor = cc.color.RED;
            action1Disabled = true;
        } else if (this.isActioning) {
            hint = stringUtil.getString(1302);
            hintColor = cc.color.WHITE;
            action1Disabled = true;
        } else {
            hint = this.isActive() ? stringUtil.getString(1300) : stringUtil.getString(1301);
            var cost = this.config.cost;
            if (!this._isCostEnough(cost)) {
                action1Disabled = true;
            }
            items = this._buildCostItems(cost);
        }

        var res = {
            iconName: iconName,
            hint: hint,
            hintColor: hintColor,
            items: items,
            action1: action1Txt,
            action1Disabled: action1Disabled,
            percentage: 0
        };
        return res;
    },
    save: function () {
        return {
            isActive: this.isActive()
        };
    },
    restore: function (saveObj) {
        if (saveObj) {
            player.isBombActive = !!saveObj.isActive;
        }
    }
});
