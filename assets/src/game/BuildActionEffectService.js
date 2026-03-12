/**
 * Shared helpers for config-driven build actions that spend items,
 * apply an effect, and update the build node with the same UI contract.
 */
var BuildActionEffectService = {
    _getPlayer: function () {
        if (typeof GameRuntime !== "undefined" && GameRuntime && typeof GameRuntime.getPlayer === "function") {
            return GameRuntime.getPlayer();
        }
        return player;
    },
    _getEmitter: function () {
        if (typeof GameRuntime !== "undefined" && GameRuntime && typeof GameRuntime.getEmitter === "function") {
            return GameRuntime.getEmitter();
        }
        return utils.emitter;
    },
    updateConfig: function (action) {
        var level = action.getCurrentBuildLevel();
        level = level >= 0 ? level : 0;
        action.config = action.configs[level][action.index];
        return action.config;
    },
    showBuildActionDialog: function (action) {
        uiUtil.showBuildActionDialog(action.bid, action.index);
    },
    runTimedEffectAction: function (action, options) {
        options = options || {};
        if (options.requireVigour !== false && !uiUtil.checkVigour()) {
            return;
        }

        this.updateConfig(action);
        action._beginActioning();
        var runtimePlayer = this._getPlayer();

        var time = action.config.makeTime * 60;
        action.addTimer(time, time, function () {
            runtimePlayer.costItems(action.config.cost);

            if (options.trackCostAchievements !== false) {
                action.config.cost.forEach(function (item) {
                    Achievement.checkCost(item.itemId, item.num);
                });
            }

            if (options.applyEffect !== false) {
                runtimePlayer.applyEffect(action.config.effect);
            }

            if (options.afterComplete) {
                options.afterComplete(action);
            }

            if (options.logMessageId) {
                var itemInfo = action.config.cost[0];
                var itemName = stringUtil.getString(itemInfo.itemId).title;
                runtimePlayer.log.addMsg(options.logMessageId, itemName, runtimePlayer.storage.getNumByItemId(itemInfo.itemId));
            }

            action._finishActioning();
        });
        action._sendUpdageSignal();
    },
    notifyPlacedSuccess: function (action, options) {
        options = options || {};
        var runtimePlayer = this._getPlayer();
        var itemInfo = options.itemInfo || (action.config && action.config.produce ? action.config.produce[0] : null);
        if (itemInfo) {
            runtimePlayer.log.addMsg(1091, runtimePlayer.room.getBuildCurrentName(action.bid), stringUtil.getString(itemInfo.itemId).title);
        }
        this._getEmitter().emit("placed_success", options.eventId !== undefined ? options.eventId : action.bid);
    },
    startPlacedTimer: function (action, options) {
        options = options || {};
        var placedTime = options.placedTime;
        var totalTime = options.totalTime !== undefined ? options.totalTime : placedTime;
        action.addTimer(placedTime, totalTime, function () {
            action.step++;
            BuildActionEffectService.notifyPlacedSuccess(action, options);
        }, true, options.startTime !== undefined ? options.startTime : action.pastTime);
    },
    grantProducedItems: function (action, produce, options) {
        options = options || {};
        var runtimePlayer = this._getPlayer();
        runtimePlayer.gainItems(produce);

        var achievementMethod = options.achievementMethod;
        if (achievementMethod && typeof Achievement[achievementMethod] === "function") {
            produce.forEach(function (item) {
                Achievement[achievementMethod](item.itemId, item.num);
            });
        }

        var fallbackItemInfo = options.fallbackItemInfo || (action.config && action.config.produce ? action.config.produce[0] : null);
        var producedItemInfo = produce[0] || fallbackItemInfo;
        if (options.logMessageId && producedItemInfo) {
            runtimePlayer.log.addMsg(
                options.logMessageId,
                producedItemInfo.num,
                stringUtil.getString(producedItemInfo.itemId).title,
                runtimePlayer.storage.getNumByItemId(producedItemInfo.itemId)
            );
        }

        if (typeof options.afterGrant === "function") {
            options.afterGrant(runtimePlayer, produce, producedItemInfo);
        }
        if (options.resetStep !== undefined) {
            action.step = options.resetStep;
        }
        if (options.finishAction !== false) {
            action._finishActioning(options.finishOptions);
        }
        return produce;
    },
    buildPlacedProduce: function (action, options) {
        options = options || {};
        var runtimePlayer = this._getPlayer();
        var produce = utils.clone(options.produce || action.config.produce || []);

        if (options.applyWeather !== false
            && typeof ItemRuntimeService !== "undefined"
            && ItemRuntimeService
            && ItemRuntimeService.applyProduceWeatherBonuses) {
            produce = ItemRuntimeService.applyProduceWeatherBonuses(produce, runtimePlayer.weather);
        }
        if (options.applyGreenhouseBonus) {
            produce.forEach(function (item) {
                item.num += runtimePlayer.weather.getValue("build_2");
            });
        }
        if (options.applyHomeTalent !== false) {
            produce = TalentService.applyHomeProduceEffect(produce);
        }
        if (options.rollCraftProduce
            && typeof ItemRuntimeService !== "undefined"
            && ItemRuntimeService
            && ItemRuntimeService.rollCraftProduce) {
            produce = ItemRuntimeService.rollCraftProduce(produce);
        }
        return produce;
    },
    _resolveLevelStringId: function (action, stringIdMap) {
        if (!stringIdMap) {
            return null;
        }
        if (stringIdMap.hasOwnProperty(action.level)) {
            return stringIdMap[action.level];
        }
        return stringIdMap.default || null;
    },
    buildTimedEffectViewInfo: function (action, options) {
        options = options || {};
        this.updateConfig(action);

        var iconIndex = options.iconIndex !== undefined ? options.iconIndex : action.index;
        var iconName = "#build_action_" + action.id + "_" + iconIndex + ".png";
        var action1Txt = stringUtil.getString(options.actionTextId, action.config.makeTime);

        var hint, hintColor, items, action1Disabled;
        if (action._isNeedBuildLocked()) {
            hint = action._getNeedBuildHint();
            hintColor = cc.color.RED;
            action1Disabled = true;
        } else if (action.isActioning) {
            var progressHintId = this._resolveLevelStringId(action, options.progressHintIds);
            hint = progressHintId ? stringUtil.getString(progressHintId) : "";
            hintColor = cc.color.WHITE;
            action1Disabled = true;
        } else {
            hint = options.idleHintText || "";
            var cost = action.config.cost;
            if (!action._isCostEnough(cost)) {
                action1Disabled = true;
            }
            items = action._buildCostItems(cost);
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
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = BuildActionEffectService;
}
