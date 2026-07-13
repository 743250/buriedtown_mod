/**
 * Shared helpers for config-driven build actions that spend items,
 * apply an effect, and update the build node with the same UI contract.
 */
var BuildActionEffectService = {
    _getPlayer: function () {
        return GameRuntime.getPlayer();
    },
    _getEmitter: function () {
        return GameRuntime.getEmitter();
    },
    _formatProducedItemSummary: function (runtimePlayer, produce, useStorageCount) {
        if (!Array.isArray(produce) || produce.length === 0) {
            return "";
        }
        return produce.map(function (itemInfo) {
            if (!itemInfo) {
                return "";
            }
            var itemId = itemInfo.itemId;
            var itemTitleInfo = stringUtil.getString(itemId) || {};
            var itemTitle = itemTitleInfo.title || ("" + itemId);
            var itemNum = useStorageCount
                ? runtimePlayer.storage.getNumByItemId(itemId)
                : (parseInt(itemInfo.num, 10) || 0);
            return itemTitle + "x" + itemNum;
        }).filter(function (itemText) {
            return !!itemText;
        }).join("、");
    },
    _buildProducedLogMessage: function (runtimePlayer, produce, options) {
        if (!options.logMessageId || !Array.isArray(produce) || produce.length === 0) {
            return null;
        }

        if (produce.length === 1) {
            var producedItemInfo = produce[0];
            return stringUtil.getString(
                options.logMessageId,
                producedItemInfo.num,
                stringUtil.getString(producedItemInfo.itemId).title,
                runtimePlayer.storage.getNumByItemId(producedItemInfo.itemId)
            );
        }

        var produceSummary = this._formatProducedItemSummary(runtimePlayer, produce, false);
        var storageSummary = this._formatProducedItemSummary(runtimePlayer, produce, true);
        if (!produceSummary) {
            return null;
        }

        if (options.logMessageId == 1090) {
            return stringUtil.getString("build_action_make_multi_log", produceSummary, storageSummary);
        }
        if (options.logMessageId == 1092) {
            return stringUtil.getString("build_action_collect_multi_log", produceSummary, storageSummary);
        }
        return produceSummary;
    },
    updateConfig: function (action) {
        var level = action.getCurrentBuildLevel();
        level = level >= 0 ? level : 0;
        // 抽烟等动作可按库存动态选配置下标（烟草 / 手卷香烟）
        if (action && typeof action.resolveConfigIndex === "function") {
            var resolved = action.resolveConfigIndex(level);
            if (resolved !== undefined && resolved !== null && !isNaN(Number(resolved))) {
                action.index = Number(resolved);
            }
        }
        action.config = action.configs[level][action.index];
        return action.config;
    },
    _getFormulaModifier: function (action) {
        if (!action || typeof buildConfig === "undefined" || !buildConfig) {
            return null;
        }

        var bid = Number(action.bid);
        var level = typeof action.getCurrentBuildLevel === "function" ? action.getCurrentBuildLevel() : 0;
        if (isNaN(bid) || isNaN(level) || !Array.isArray(buildConfig[bid]) || !buildConfig[bid][level]) {
            return null;
        }

        return buildConfig[bid][level].formulaModifier || null;
    },
    _applyFormulaCostModifier: function (costList, costDeltaMap, costMinMap) {
        if (!Array.isArray(costList)) {
            return [];
        }
        if ((!costDeltaMap || typeof costDeltaMap !== "object")
            && (!costMinMap || typeof costMinMap !== "object")) {
            return utils.clone(costList);
        }

        return costList.map(function (itemInfo) {
            var adjustedItem = utils.clone(itemInfo);
            var itemId = adjustedItem.itemId !== undefined && adjustedItem.itemId !== null
                ? "" + adjustedItem.itemId
                : null;
            if (itemId !== null && costDeltaMap.hasOwnProperty(itemId)) {
                adjustedItem.num = Math.max(0, (parseInt(adjustedItem.num, 10) || 0) + (parseInt(costDeltaMap[itemId], 10) || 0));
            }
            if (itemId !== null && costMinMap && costMinMap.hasOwnProperty(itemId) && adjustedItem.num > 0) {
                adjustedItem.num = Math.max(parseInt(costMinMap[itemId], 10) || 0, parseInt(adjustedItem.num, 10) || 0);
            }
            return adjustedItem;
        }).filter(function (itemInfo) {
            return (parseInt(itemInfo.num, 10) || 0) > 0;
        });
    },
    updateFormulaConfig: function (action) {
        var config = utils.clone(action.baseConfig || formulaConfig[action.id] || action.config || {});
        var modifier = this._getFormulaModifier(action);

        if (modifier) {
            var makeTime = parseInt(config.makeTime, 10);
            var makeTimeDelta = parseInt(modifier.makeTimeDelta, 10);
            if (isFinite(makeTime) && isFinite(makeTimeDelta)) {
                config.makeTime = Math.max(1, makeTime + makeTimeDelta);
            }
            config.cost = this._applyFormulaCostModifier(config.cost, modifier.costDeltaMap, modifier.costMinMap);
        }

        action.config = config;
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
                options.afterComplete(action, runtimePlayer);
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

        if (typeof Medal !== "undefined"
            && Medal
            && typeof Medal.trackProducedItems === "function") {
            Medal.trackProducedItems(produce);
        }

        var achievementMethod = options.achievementMethod;
        if (achievementMethod && typeof Achievement[achievementMethod] === "function") {
            produce.forEach(function (item) {
                Achievement[achievementMethod](item.itemId, item.num);
            });
        }

        var fallbackItemInfo = options.fallbackItemInfo || (action.config && action.config.produce ? action.config.produce[0] : null);
        var producedItemInfo = produce[0] || fallbackItemInfo;
        if (options.logMessageId && producedItemInfo) {
            var producedLogMessage = this._buildProducedLogMessage(runtimePlayer, produce, options);
            if (producedLogMessage) {
                runtimePlayer.log.addMsg(producedLogMessage);
            }
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

        if (options.rollCraftProduce
            && typeof ItemRuntimeService !== "undefined"
            && ItemRuntimeService
            && ItemRuntimeService.rollCraftProduce) {
            produce = ItemRuntimeService.rollCraftProduce(produce);
        }
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

GameKernel.register("BuildActionEffectService", BuildActionEffectService);

if (typeof module !== "undefined" && module.exports) {
    module.exports = BuildActionEffectService;
}
