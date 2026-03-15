/**
 * Created by lancelot on 15/4/3.
 */

var BuildNodeUpdateEventName = (typeof GameEvents !== "undefined" && GameEvents && GameEvents.BUILD_NODE_UPDATE)
    ? GameEvents.BUILD_NODE_UPDATE
    : "build_node_update";

var getBuildActionRuntimePlayer = function () {
    return (typeof GameRuntime !== "undefined" && GameRuntime && typeof GameRuntime.getPlayer === "function")
        ? GameRuntime.getPlayer()
        : player;
};

var getBuildActionRuntimeTimer = function () {
    return (typeof GameRuntime !== "undefined" && GameRuntime && typeof GameRuntime.getTimer === "function")
        ? GameRuntime.getTimer()
        : cc.timer;
};

var getBuildActionRuntimeEmitter = function () {
    return (typeof GameRuntime !== "undefined" && GameRuntime && typeof GameRuntime.getEmitter === "function")
        ? GameRuntime.getEmitter()
        : utils.emitter;
};

var getBuildActionRuntimeRecord = function () {
    return (typeof GameRuntime !== "undefined" && GameRuntime && typeof GameRuntime.getRecord === "function")
        ? GameRuntime.getRecord()
        : Record;
};

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
        return getBuildActionRuntimePlayer().room.getBuildLevel(this.bid);
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
    clickAction2: function () {
    },
    _sendUpdageSignal: function () {
        getBuildActionRuntimeEmitter().emit(BuildNodeUpdateEventName);
    },
    _updateStatus: function () {
    },
    _getUpdateViewInfo: function () {
    },
    updateView: function (view, idx) {
        this.view = view;
        this.idx = idx;
        if (this.view) {
            this.build = getBuildActionRuntimePlayer().room.getBuild(this.bid);
            this.view.updateView({btnIdx: idx});
            this._updateStatus();
            var viewInfo = this._getUpdateViewInfo();
            if (this.build.anyBtnActive() && !this.build.canUseAction(this.getActionKey())) {
                viewInfo.action1Disabled = true;
                if (viewInfo.action2) {
                    viewInfo.action2Disabled = true;
                }
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
        var timer = getBuildActionRuntimeTimer();
        var timerStartTime = startTime ? timer.time - startTime : undefined;
        timer.addTimerCallback(new TimerCallback(time, this, {
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
            timer.accelerateWorkTime(time);
        }
    },
    _setLeftBtnEnabled: function (enabled) {
        getBuildActionRuntimeEmitter().emit("left_btn_enabled", !!enabled);
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
            getBuildActionRuntimeRecord().saveAll();
        }
    },
    _isNeedBuildLocked: function () {
        return this.needBuild && this.needBuild.level > getBuildActionRuntimePlayer().room.getBuildLevel(this.needBuild.bid);
    },
    _getNeedBuildHint: function () {
        if (!this.needBuild) {
            return "";
        }
        return stringUtil.getString(1006, getBuildActionRuntimePlayer().room.getBuildName(this.needBuild["bid"], this.needBuild["level"]));
    },
    _isCostEnough: function (cost) {
        return getBuildActionRuntimePlayer().validateItems(cost);
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

var BuildActionTypeRegistry = {
    _types: {},
    register: function (type, definition) {
        if (!type || !definition || typeof definition.create !== "function") {
            return;
        }
        this._types[type] = definition;
    },
    create: function (type, options) {
        var definition = this._types[type];
        if (!definition || typeof definition.create !== "function") {
            return null;
        }
        return definition.create(options || {});
    }
};

var createTimedEffectBuildAction = function (options) {
    return BuildAction.extend({
        ctor: function (bid, level, actionIndex) {
            this._super(bid);
            this.level = level >= 0 ? level : 0;
            cc.assert(this.level < buildActionConfig[this.id].length, options.className + " buildActionConfig doesn't exist!");
            this.configs = utils.clone(buildActionConfig[this.id]);
            this.needBuild = {bid: this.id, level: 0};
            this.index = options.useCtorActionIndex ? actionIndex : options.index;
        },
        updateConfig: function () {
            return BuildActionEffectService.updateConfig(this);
        },
        clickIcon: function () {
            return BuildActionEffectService.showBuildActionDialog(this);
        },
        clickAction1: function () {
            return BuildActionEffectService.runTimedEffectAction(this, {logMessageId: options.logMessageId});
        },
        _getUpdateViewInfo: function () {
            return BuildActionEffectService.buildTimedEffectViewInfo(this, {
                iconIndex: options.iconIndex,
                actionTextId: options.actionTextId,
                progressHintIds: options.progressHintIds,
                idleHintText: options.idleHintText
            });
        }
    });
};

var createTimedStateBuildAction = function (options) {
    return BuildAction.extend({
        ctor: function (bid) {
            this._super(bid);
            this.config = utils.clone(buildActionConfig[this.id][0]);
            this.needBuild = {bid: this.id, level: 0};
        },
        clickIcon: function () {
            uiUtil.showBuildActionDialog(this.bid, options.dialogIndex || 0);
        },
        isActive: function () {
            if (typeof options.isActive !== "function") {
                return false;
            }
            return !!options.isActive(this, getBuildActionRuntimePlayer());
        },
        clickAction1: function () {
            if (!uiUtil.checkVigour()) {
                return;
            }

            var runtimePlayer = getBuildActionRuntimePlayer();
            if (typeof options.beforeStart === "function"
                && options.beforeStart(this, runtimePlayer) === false) {
                return;
            }

            this._beginActioning();

            var time = this.config["makeTime"] * 60;
            var self = this;
            this.addTimer(time, time, function () {
                runtimePlayer.costItems(self.config.cost);

                if (typeof options.afterComplete === "function") {
                    options.afterComplete(self, runtimePlayer);
                }

                self._finishActioning(options.finishOptions);
            });
            this._sendUpdageSignal();
        },
        _getUpdateViewInfo: function () {
            var iconName = "#build_action_" + this.id + "_0" + ".png";
            var action1Txt = stringUtil.getString(options.actionTextId, this.config["makeTime"]);

            var hint, hintColor, items, action1Disabled;
            if (this._isNeedBuildLocked()) {
                hint = this._getNeedBuildHint();
                hintColor = cc.color.RED;
                action1Disabled = true;
            } else if (this.isActioning) {
                hint = stringUtil.getString(options.actioningHintId);
                hintColor = cc.color.WHITE;
                action1Disabled = true;
            } else {
                hint = typeof options.getIdleHint === "function"
                    ? options.getIdleHint(this, getBuildActionRuntimePlayer())
                    : "";
                var cost = this.config.cost;
                if (!this._isCostEnough(cost)) {
                    action1Disabled = true;
                }
                items = this._buildCostItems(cost);
            }

            return {
                iconName: iconName,
                hint: hint,
                hintColor: hintColor,
                items: items,
                action1: action1Txt,
                action1Disabled: action1Disabled,
                percentage: 0
            };
        },
        save: function () {
            if (typeof options.save !== "function") {
                return {};
            }
            return options.save(this, getBuildActionRuntimePlayer()) || {};
        },
        restore: function (saveObj) {
            if (typeof options.restore === "function") {
                options.restore(this, saveObj, getBuildActionRuntimePlayer());
            }
        }
    });
};

var registerTimedStateBuildActionType = function (type, options) {
    var ActionClass = createTimedStateBuildAction(options);
    BuildActionTypeRegistry.register(type, {
        create: function (createOptions) {
            return new ActionClass(createOptions.bid);
        }
    });
};

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
    getBatchCount: function () {
        var configuredBatchCount = this.config && parseInt(this.config.batchCount, 10);
        return configuredBatchCount >= 2 ? configuredBatchCount : 5;
    },
    supportsBatchCraft: function () {
        return !this.config["placedTime"];
    },
    getMaxBatchCraftCount: function () {
        if (!this.supportsBatchCraft()) {
            return 0;
        }
        var cost = this.config.cost || [];
        if (cost.length === 0) {
            return this.getBatchCount();
        }
        var maxCount = Number.MAX_SAFE_INTEGER;
        cost.forEach(function (itemInfo) {
            var needNum = parseInt(itemInfo.num, 10) || 0;
            if (needNum <= 0) {
                return;
            }
            var haveNum = getBuildActionRuntimePlayer().getItemNumInPlayer(itemInfo.itemId);
            maxCount = Math.min(maxCount, Math.floor(haveNum / needNum));
        });
        if (!isFinite(maxCount) || maxCount < 0) {
            return 0;
        }
        return Math.min(this.getBatchCount(), maxCount);
    },
    _scaleItemList: function (itemList, count) {
        count = Math.max(1, parseInt(count, 10) || 1);
        if (!Array.isArray(itemList)) {
            return [];
        }
        return itemList.map(function (itemInfo) {
            var scaledItem = utils.clone(itemInfo);
            scaledItem.num = (parseInt(scaledItem.num, 10) || 0) * count;
            return scaledItem;
        });
    },
    _mergeItemList: function (itemList) {
        var mergedMap = {};
        var mergedList = [];
        if (!Array.isArray(itemList)) {
            return mergedList;
        }
        itemList.forEach(function (itemInfo) {
            if (!itemInfo) {
                return;
            }
            var itemId = parseInt(itemInfo.itemId, 10);
            var itemNum = parseInt(itemInfo.num, 10) || 0;
            if (!mergedMap[itemId]) {
                mergedMap[itemId] = {
                    itemId: itemId,
                    num: 0
                };
                mergedList.push(mergedMap[itemId]);
            }
            mergedMap[itemId].num += itemNum;
        });
        return mergedList;
    },
    _buildMakeProduce: function (count) {
        var produceList = [];
        count = Math.max(1, parseInt(count, 10) || 1);
        for (var i = 0; i < count; i++) {
            var rolledProduce = (typeof ItemRuntimeService !== "undefined"
                && ItemRuntimeService
                && ItemRuntimeService.rollCraftProduce)
                ? ItemRuntimeService.rollCraftProduce(this.config.produce)
                : utils.clone(this.config.produce);
            produceList = produceList.concat(rolledProduce);
        }
        return this._mergeItemList(produceList);
    },
    _grantImmediateMakeProduce: function (makeCount, itemInfo) {
        var self = this;
        var produce = self._buildMakeProduce(makeCount);
        return BuildActionEffectService.grantProducedItems(self, produce, {
            achievementMethod: "checkMake",
            logMessageId: 1090,
            fallbackItemInfo: itemInfo,
            afterGrant: function (runtimePlayer) {
                if (self.build.id === 1 && userGuide.isStep(userGuide.stepName.TOOL_ALEX)) {
                    userGuide.step();
                    runtimePlayer.room.createBuild(14, 0);
                }
            }
        });
    },
    _runMakeAction: function (makeCount) {
        makeCount = Math.max(1, parseInt(makeCount, 10) || 1);
        if (makeCount > 1 && !this.supportsBatchCraft()) {
            return false;
        }
        if (this.build && !this.build.canUseAction(this.getActionKey())) {
            return false;
        }

        var scaledCost = this._scaleItemList(this.config.cost, makeCount);
        if (!this._isCostEnough(scaledCost)) {
            return false;
        }

        this._beginActioning();

        var time = this.config["makeTime"] * 60 * makeCount;
        var self = this;
        var itemInfo = this.config.produce[0];
        this.addTimer(time, time, function () {
            self.step++;
            if (self.step == self.maxStep) {
                self.step = 0;
            }
            if (self.step == 1) {
                player.costItems(scaledCost);
                self.place();
                self._finishActioning({resetBuildBtn: false});
            } else {
                player.costItems(scaledCost);
                self._grantImmediateMakeProduce(makeCount, itemInfo);
            }
        });
        return true;
    },
    _buildPlacedTimerOptions: function () {
        return {
            itemInfo: this.config.produce[0],
            placedTime: this.config["placedTime"] * 60
        };
    },
    place: function () {
        BuildActionEffectService.startPlacedTimer(this, this._buildPlacedTimerOptions());
    },
    _buildPlacedProduce: function () {
        return BuildActionEffectService.buildPlacedProduce(this, {
            applyGreenhouseBonus: this.bid == 2,
            rollCraftProduce: true
        });
    },
    clickAction1: function () {
        if (!uiUtil.checkVigour())
            return;
        var itemInfo = this.config.produce[0];
        if (this.step == 0) {
            if (this._runMakeAction(1)) {
                this._sendUpdageSignal();
            }
            return;
        } else {
            var produce = this._buildPlacedProduce();
            BuildActionEffectService.grantProducedItems(this, produce, {
                achievementMethod: "checkProduce",
                logMessageId: 1092,
                fallbackItemInfo: itemInfo,
                resetStep: 0,
                finishOptions: {enableLeftBtn: false}
            });
        }
        this._sendUpdageSignal();
    },
    clickAction2: function () {
        if (!uiUtil.checkVigour())
            return;
        if (this.step !== 0 || !this.supportsBatchCraft()) {
            return;
        }

        var maxCount = this.getMaxBatchCraftCount();
        if (maxCount <= 1) {
            return;
        }

        var self = this;
        uiUtil.showCraftCountSliderDialog(this.config.produce[0].itemId, maxCount, this.config["makeTime"], function (count) {
            count = Math.max(1, parseInt(count, 10) || 1);
            if (self._runMakeAction(count)) {
                self._sendUpdageSignal();
            }
        });
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

        var hint, hintColor, items, action1Disabled, action2, action2Disabled;
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
                if (this.supportsBatchCraft() && this.getMaxBatchCraftCount() > 1) {
                    action2 = stringUtil.getString(1376) || "批量";
                    action2Disabled = false;
                }
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
            action2: action2,
            action2Disabled: action2Disabled,
            actionLayout: action2 ? "stacked" : "horizontal",
            percentage: 0
        };
        return res;
    },
    canMake: function () {
        var cost = this.config.cost;
        return this._isCostEnough(cost) && !this._isNeedBuildLocked();
    }
});

BuildActionTypeRegistry.register("formula", {
    create: function (options) {
        var action = new Formula(options.actionId, options.bid);
        if (options.needBuild) {
            action.needBuild = options.needBuild;
        }
        return action;
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
        this.autoSetEnabled = false;
    },
    save: function () {
        var saveObj = Formula.prototype.save.call(this);
        saveObj.autoSetEnabled = !!this.autoSetEnabled;
        return saveObj;
    },
    restore: function (saveObj) {
        this.autoSetEnabled = !!(saveObj && saveObj.autoSetEnabled);
        Formula.prototype.restore.call(this, saveObj);
    },
    clickIcon: function () {
        uiUtil.showBuildActionDialog(this.bid, 0);
    },
    getAutoSetCost: function () {
        return utils.clone(this.config.cost || []);
    },
    isAutoSetEnabled: function () {
        return !!this.autoSetEnabled;
    },
    setAutoSetEnabled: function (enabled) {
        this.autoSetEnabled = !!enabled;
    },
    tryAutoSet: function () {
        if (!this.isAutoSetEnabled() || this.step !== 0 || this.isActioning || this._isNeedBuildLocked()) {
            return false;
        }

        var cost = this.getAutoSetCost();
        if (!cost.length || !this._isCostEnough(cost)) {
            return false;
        }

        player.costItems(cost);
        this.step = 1;
        var trapBuild = this.build || getBuildActionRuntimePlayer().room.getBuild(this.bid);
        if (trapBuild && typeof trapBuild.setActiveBtnIndex === "function") {
            trapBuild.setActiveBtnIndex(this.getActionKey());
        }
        this.place();
        player.log.addMsg(stringUtil.getString("trap_auto_set_log", getBuildActionCostText(cost)));
        this._sendUpdageSignal();
        getBuildActionRuntimeRecord().saveAll();
        return true;
    },
    _buildPlacedTimerOptions: function () {
        var placedTimes = this.config["placedTime"];
        var time = utils.getRandomInt(placedTimes[0], placedTimes[1]);
        return {
            itemInfo: this.config.produce[0],
            eventId: this.id,
            placedTime: time * 60,
            totalTime: placedTimes[1] * 60
        };
    },
    clickAction1: function () {
        if (!uiUtil.checkVigour())
            return;
        var itemInfo = this.config.produce[0];
        if (this.step == 0) {
            if (this._runMakeAction(1)) {
                this._sendUpdageSignal();
            }
            return;
        } else {
            var produce = this._buildPlacedProduce();
            BuildActionEffectService.grantProducedItems(this, produce, {
                achievementMethod: "checkProduce",
                logMessageId: 1092,
                fallbackItemInfo: itemInfo,
                resetStep: 0,
                finishOptions: {enableLeftBtn: false}
            });
            this.tryAutoSet();
        }
        this._sendUpdageSignal();
    },
    getPlacedTxt: function (time) {
        return stringUtil.getString(1154);
    },
    _buildPlacedProduce: function () {
        return BuildActionEffectService.buildPlacedProduce(this);
    },
    _grantImmediateMakeProduce: function (makeCount, itemInfo) {
        return BuildActionEffectService.grantProducedItems(this, this.config.produce, {
            finishOptions: undefined
        });
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

registerTimedStateBuildActionType("dog", {
    actionTextId: 1020,
    actioningHintId: 1023,
    beforeStart: function (action, runtimePlayer) {
        if (!runtimePlayer.dog.canFeed()) {
            uiUtil.showTinyInfoDialog(1130);
            return false;
        }
        return true;
    },
    afterComplete: function (action, runtimePlayer) {
        runtimePlayer.dog.feed();
    },
    getIdleHint: function (action, runtimePlayer) {
        return runtimePlayer.dog.isActive() ? stringUtil.getString(1021) : stringUtil.getString(1022);
    }
});

var getBuildActionCostText = function (cost) {
    if (!Array.isArray(cost) || cost.length === 0) {
        return "";
    }
    return cost.map(function (itemInfo) {
        return stringUtil.getString(itemInfo.itemId).title + "x" + itemInfo.num;
    }).join("、");
};

var DogAutoFeedBuildAction = BuildAction.extend({
    ctor: function (bid) {
        this._super(bid);
        this.actionKey = this.bid + ":auto_feed";
        this.needBuild = {bid: this.id, level: 0};
    },
    clickIcon: function () {
        uiUtil.showBuildActionDialog(this.bid, 1, 0);
    },
    clickAction1: function () {
        var runtimePlayer = getBuildActionRuntimePlayer();
        var enabled = !runtimePlayer.dog.isAutoFeedEnabled();
        runtimePlayer.dog.setAutoFeedEnabled(enabled);
        if (!(enabled && runtimePlayer.dog.tryAutoFeed(runtimePlayer))) {
            getBuildActionRuntimeRecord().saveAll();
        }
        this._sendUpdageSignal();
    },
    _getUpdateViewInfo: function () {
        var runtimePlayer = getBuildActionRuntimePlayer();
        var iconName = "#build_action_" + this.id + "_0" + ".png";
        var cost = runtimePlayer.dog.getFeedCost();
        var isEnabled = runtimePlayer.dog.isAutoFeedEnabled();
        var hint = isEnabled
            ? stringUtil.getString("dog_auto_feed_enabled_hint", getBuildActionCostText(cost))
            : stringUtil.getString("dog_auto_feed_disabled_hint", getBuildActionCostText(cost));

        return {
            iconName: iconName,
            hint: hint,
            hintColor: cc.color.WHITE,
            items: this._buildCostItems(cost),
            action1: stringUtil.getString(isEnabled ? 1250 : 1249),
            percentage: 0
        };
    }
});

var TrapAutoSetBuildAction = BuildAction.extend({
    ctor: function (bid, trapAction) {
        this._super(bid);
        this.actionKey = this.bid + ":auto_set";
        this.needBuild = {bid: this.id, level: 0};
        this.trapAction = trapAction;
    },
    clickIcon: function () {
        uiUtil.showBuildActionDialog(this.bid, 1, 0);
    },
    clickAction1: function () {
        var enabled = !this.trapAction.isAutoSetEnabled();
        this.trapAction.setAutoSetEnabled(enabled);
        getBuildActionRuntimeRecord().saveAll();
        this._sendUpdageSignal();
    },
    _getUpdateViewInfo: function () {
        var iconName = "#build_action_" + this.id + "_0" + ".png";
        var cost = this.trapAction.getAutoSetCost();
        var hint = this.trapAction.isAutoSetEnabled()
            ? stringUtil.getString("trap_auto_set_enabled_hint", getBuildActionCostText(cost))
            : stringUtil.getString("trap_auto_set_disabled_hint", getBuildActionCostText(cost));

        return {
            iconName: iconName,
            hint: hint,
            hintColor: cc.color.WHITE,
            items: this._buildCostItems(cost),
            action1: stringUtil.getString(this.trapAction.isAutoSetEnabled() ? 1250 : 1249),
            percentage: 0
        };
    }
});

var RestBuildAction = createTimedEffectBuildAction({
    className: "RestBuildAction",
    index: 0,
    iconIndex: 0,
    actionTextId: 1014,
    logMessageId: 1096,
    progressHintIds: {
        1: 1016,
        2: 1017,
        default: 1015
    }
});

var DrinkBuildAction = createTimedEffectBuildAction({
    className: "DrinkBuildAction",
    index: 1,
    iconIndex: 1,
    actionTextId: 1308,
    logMessageId: 1309,
    progressHintIds: {
        1: 1306,
        2: 1307,
        default: 1305
    }
});

var DrinkTeaBuildAction = createTimedEffectBuildAction({
    className: "DrinkTeaBuildAction",
    index: 2,
    iconIndex: 0,
    actionTextId: 1335,
    logMessageId: 1336,
    progressHintIds: {
        1: 1337,
        2: 1338,
        default: 1339
    }
});

var SmokeBuildAction = createTimedEffectBuildAction({
    className: "SmokeBuildAction",
    useCtorActionIndex: true,
    iconIndex: 1,
    actionTextId: 1370,
    logMessageId: 1373,
    progressHintIds: {
        1: 1371,
        2: 1371,
        default: 1371
    }
});

BuildActionTypeRegistry.register("rest", {
    create: function (options) {
        return new RestBuildAction(options.bid, options.level);
    }
});
BuildActionTypeRegistry.register("drink", {
    create: function (options) {
        return new DrinkBuildAction(options.bid, options.level);
    }
});
BuildActionTypeRegistry.register("drink_tea", {
    create: function (options) {
        return new DrinkTeaBuildAction(options.bid, options.level);
    }
});
BuildActionTypeRegistry.register("smoke", {
    create: function (options) {
        return new SmokeBuildAction(options.bid, options.level, options.actionIndex);
    }
});

var BuildActionFactory = {
    createActionByType: function (actionType, options) {
        return BuildActionTypeRegistry.create(actionType, options);
    },
    createRestActionByType: function (actionType, bid, level) {
        return this.createActionByType(actionType, {
            bid: bid,
            level: level
        });
    },
    createRestActions: function (bid, level, roleType) {
        var actions = [
            this.createActionByType("rest", { bid: bid, level: level }),
            this.createActionByType("smoke", { bid: bid, level: level, actionIndex: 3 }),
            this.createActionByType("smoke", { bid: bid, level: level, actionIndex: 4 }),
            this.createActionByType("smoke", { bid: bid, level: level, actionIndex: 5 })
        ];
        RoleRuntimeService.getRestActionTypes(roleType).forEach(function (actionType) {
            var action = this.createRestActionByType(actionType, bid, level);
            if (action) {
                actions.push(action);
            }
        }, this);
        return actions.filter(function (action) {
            return !!action;
        });
    }
};

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

registerTimedStateBuildActionType("bomb", {
    actionTextId: 1303,
    actioningHintId: 1302,
    isActive: function (action, runtimePlayer) {
        return runtimePlayer.isBombActive;
    },
    beforeStart: function (action) {
        if (action.isActive()) {
            uiUtil.showTinyInfoDialog(1304);
            return false;
        }
        return true;
    },
    afterComplete: function (action, runtimePlayer) {
        runtimePlayer.isBombActive = true;
    },
    getIdleHint: function (action) {
        return action.isActive() ? stringUtil.getString(1300) : stringUtil.getString(1301);
    },
    save: function (action) {
        return {
            isActive: action.isActive()
        };
    },
    restore: function (action, saveObj, runtimePlayer) {
        if (saveObj) {
            runtimePlayer.isBombActive = !!saveObj.isActive;
        }
    }
});
