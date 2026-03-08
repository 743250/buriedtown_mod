/**
 * Shared helpers for config-driven build actions that spend items,
 * apply an effect, and update the build node with the same UI contract.
 */
var BuildActionEffectService = {
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

        var time = action.config.makeTime * 60;
        action.addTimer(time, time, function () {
            player.costItems(action.config.cost);

            if (options.trackCostAchievements !== false) {
                action.config.cost.forEach(function (item) {
                    Achievement.checkCost(item.itemId, item.num);
                });
            }

            if (options.applyEffect !== false) {
                player.applyEffect(action.config.effect);
            }

            if (options.afterComplete) {
                options.afterComplete(action);
            }

            if (options.logMessageId) {
                var itemInfo = action.config.cost[0];
                var itemName = stringUtil.getString(itemInfo.itemId).title;
                player.log.addMsg(options.logMessageId, itemName, player.storage.getNumByItemId(itemInfo.itemId));
            }

            action._finishActioning();
        });
        action._sendUpdageSignal();
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
