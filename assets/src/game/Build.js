/**
 * Created by lancelot on 15/4/3.
 */
var BuildUpgradeType = {
    UPGRADABLE: 1,
    MAX_LEVEL: 2,
    CONDITION: 3,
    COST: 4
}

if (typeof GameEvents === "undefined" || !GameEvents) {
    var GameEvents = {
        BUILD_NODE_UPDATE: "build_node_update"
    };
}

var Build = cc.Class.extend({
    ctor: function (bid, level, saveObj) {
        this.id = bid;
        this.level = level || 0;
        this.configs = utils.clone(buildConfig[this.id]);
        this.currentConfig = this.configs[this.level];
        this.isUpgrading = false;
        this.actions = [];
        this.initBuildActions();
        this.activeBtnKeys = [];
        this.activeBtnIndex = -2;

        this.restore(saveObj);
    },
    initBuildActions: function () {
        var produceList = [];
        var l = 0;
        var self = this;
        for (var i = 0; i < this.configs.length; i++) {
            produceList = produceList.concat(this.configs[i].produceList.map(function (fid) {
                var formula = new Formula(fid, self.id);
                formula.needBuild = {bid: self.id, level: l};
                return formula;
            }));
            l++;
        }
        this.actions = produceList;
    },
    save: function () {
        var saveActions = {};
        this.actions.forEach(function (action) {
            var actionKey = this._getActionStateKey(action);
            saveActions[actionKey] = action.save();
        }, this);
        return {
            id: this.id,
            level: this.level,
            saveActions: saveActions,
            activeBtnKeys: this.activeBtnKeys.slice(),
            activeBtnIndex: this.activeBtnIndex
        };
    },
    _getActionStateKey: function (action) {
        if (action && typeof action.getActionKey === "function") {
            return action.getActionKey();
        }
        return action ? action.id : null;
    },
    _normalizeActionKey: function (key) {
        if (key === undefined || key === null || key === -2 || key === "-2") {
            return null;
        }
        if (key === -1 || key === "-1") {
            return -1;
        }
        return String(key);
    },
    _normalizeActiveBtnKeys: function (keys) {
        var normalized = [];
        var seen = {};
        if (!Array.isArray(keys)) {
            keys = [keys];
        }
        keys.forEach(function (key) {
            key = this._normalizeActionKey(key);
            if (key === null || seen[key]) {
                return;
            }
            seen[key] = true;
            normalized.push(key);
        }, this);
        if (normalized.indexOf(-1) !== -1) {
            return [-1];
        }
        return normalized.slice(0, this.getConcurrentActionLimit());
    },
    _applyActiveBtnKeys: function (keys) {
        this.activeBtnKeys = this._normalizeActiveBtnKeys(keys);
        this.activeBtnIndex = this.activeBtnKeys.length > 0 ? this.activeBtnKeys[0] : -2;
    },
    _restoreActiveBtnKeys: function (opt) {
        var restoredKeys = opt.activeBtnKeys;
        if (!Array.isArray(restoredKeys) && Array.isArray(opt.activeBtnIndices)) {
            restoredKeys = opt.activeBtnIndices;
        }
        if (Array.isArray(restoredKeys)) {
            this._applyActiveBtnKeys(restoredKeys);
            return;
        }

        var derivedKeys = this.actions.filter(function (action) {
            if (!action) {
                return false;
            }
            if (action.step !== undefined && action.step !== 0) {
                return true;
            }
            return action.fuel > 0;
        }, this).map(function (action) {
            return this._getActionStateKey(action);
        }, this);
        derivedKeys = derivedKeys.filter(function (key) {
            return key !== null;
        });
        if (derivedKeys.length > 0) {
            this._applyActiveBtnKeys(derivedKeys);
            return;
        }

        this._applyActiveBtnKeys(opt.activeBtnIndex);
    },
    restore: function (opt) {
        if (opt) {
            var saveActions = opt.saveActions || {};
            this.actions.forEach(function (action) {
                var actionKey = this._getActionStateKey(action);
                var saveObj = Object.prototype.hasOwnProperty.call(saveActions, actionKey)
                    ? saveActions[actionKey]
                    : saveActions[action.id];
                action.restore(saveObj);
            }, this);
            this._restoreActiveBtnKeys(opt);
        }
    },
    getConcurrentActionLimit: function () {
        return RoleRuntimeService.getBuildConcurrentActionLimit(this._getRoleType(), this.id, this.level, 1);
    },
    needBuild: function () {
        return this.level < 0;
    },
    _getRoleType: function () {
        if (player && player.roleType !== undefined && player.roleType !== null) {
            return player.roleType;
        }
        return role.getChoosenRoleType();
    },
    _hasStorageItem: function (itemId) {
        return player.storage.validateItem(itemId, 1);
    },
    _isWorkSitePowered: function () {
        var workSite = player.map.getSite(WORK_SITE);
        return !!(workSite && workSite.isActive);
    },
    _buildActionFilterContext: function () {
        var self = this;
        return {
            roleType: this._getRoleType(),
            isWorkSitePowered: this._isWorkSitePowered(),
            hasStorageItem: function (itemId) {
                return self._hasStorageItem(itemId);
            }
        };
    },
    _getMaxLevel: function () {
        var defaultMaxLevel = this.configs.length - 1;
        return RoleRuntimeService.getBuildMaxLevel(this._getRoleType(), this.id, defaultMaxLevel);
    },
    isMax: function () {
        return this.level >= this._getMaxLevel();
    },
    canUpgrade: function () {
        var res = {buildUpgradeType: BuildUpgradeType.UPGRADABLE};
        //1. 是否有下一级可升级
        if (this.level >= this._getMaxLevel()) {
            res.buildUpgradeType = BuildUpgradeType.MAX_LEVEL;
            return res;
        }
        //2. 前置条件是否满足
        var nextLevel = this.level + 1;
        var condition = this.configs[nextLevel]["condition"];
        if (!player.room.isBuildExist(condition["bid"], condition["level"])) {
            res.buildUpgradeType = BuildUpgradeType.CONDITION;
            res.condition = condition;
            return res;
        }
        //3. cost是否满足
        var cost = this.configs[nextLevel]["cost"];
        if (!player.validateItems(cost)) {
            res.buildUpgradeType = BuildUpgradeType.COST;
            res.cost = cost;
            return res;
        }
        return res;
    },
    upgrade: function (processCb, endCb) {
        //1. cost成功
        var nextLevel = this.level + 1;
        var cost = this.configs[nextLevel]["cost"];
        player.costItems(cost);

        //2. 升级
        this.isUpgrading = true;
        var createTime = this.configs[nextLevel]["createTime"] || 0;
        createTime *= 60;
        var pastTime = 0;
        var self = this;
        cc.timer.addTimerCallback(new TimerCallback(createTime, this, {
            process: function (dt) {
                pastTime += dt;
                processCb(pastTime / createTime * 100);
            },
            end: function () {
                self.isUpgrading = false;
                self.afterUpgrade();
                endCb();
                player.log.addMsg(1089, player.room.getBuildCurrentName(self.id));
            }
        }));
        cc.timer.accelerateWorkTime(createTime);
        this.setActiveBtnIndex(-1);
        utils.emitter.emit(GameEvents.BUILD_NODE_UPDATE);

        audioManager.playEffect(audioManager.sound.BUILD_UPGRADE);
    },
    afterUpgrade: function () {
        this.level++;
        this.currentConfig = this.configs[this.level];
        this.resetActiveBtnIndex();
        Record.saveAll();
    },
    getUpgradeConfig: function () {
        var nextLevel = this.level + 1;
        var config = this.configs[nextLevel];
        if (config) {
            var upgradeTime = config["createTime"];
            var upgradeCost = config["cost"];
            return {
                level: nextLevel,
                upgradeTime: upgradeTime,
                upgradeCost: upgradeCost
            };
        } else {
            return null;
        }
    },
    getBuildActions: function () {
        var context = this._buildActionFilterContext();
        return this.actions.filter(function (action) {
            return RoleRuntimeService.applyBuildActionRuntimeState(action, context.roleType, context);
        });
    },
    isActionActive: function (actionId) {
        actionId = this._normalizeActionKey(actionId);
        if (actionId === null) {
            return false;
        }
        return this.activeBtnKeys.indexOf(actionId) !== -1;
    },
    canUseAction: function (actionId) {
        actionId = this._normalizeActionKey(actionId);
        if (actionId === null) {
            return false;
        }
        if (actionId === -1) {
            return !this.anyBtnActive();
        }
        if (this.activeBtnKeys.indexOf(-1) !== -1) {
            return false;
        }
        if (this.isActionActive(actionId)) {
            return true;
        }
        return this.activeBtnKeys.length < this.getConcurrentActionLimit();
    },
    setActiveBtnIndex: function (index) {
        index = this._normalizeActionKey(index);
        if (index === null) {
            return false;
        }
        if (!this.canUseAction(index)) {
            return false;
        }
        if (!this.isActionActive(index)) {
            this._applyActiveBtnKeys(this.activeBtnKeys.concat(index));
        }
        return true;
    },
    resetActiveBtnIndex: function (index) {
        if (index === undefined || index === null) {
            this._applyActiveBtnKeys([]);
            return;
        }
        index = this._normalizeActionKey(index);
        if (index === null) {
            this._applyActiveBtnKeys([]);
            return;
        }
        this._applyActiveBtnKeys(this.activeBtnKeys.filter(function (key) {
            return key !== index;
        }));
    },
    anyBtnActive: function () {
        return this.activeBtnKeys.length > 0;
    },
    needWarn: function () {
        var self = this;
        var res = this.canUpgrade();
        var canUpgrade = res.buildUpgradeType === BuildUpgradeType.UPGRADABLE;
        var replacedSuccess = this.actions.some(function (action) {
            return action.step === 2 && !action.isActioning;
        });
        var canMake = this.actions.some(function (action) {
            return self.canUseAction(self._getActionStateKey(action)) && action.step === 0 && !action.isActioning && action.canMake();
        });
        var isActioning = this.actions.some(function (action) {
            return action.isActioning;
        });

        var obj = {
            upgrade: canUpgrade,
            make: canMake,
            take: replacedSuccess
        };
        if (isActioning) {
            obj.upgrade = false;
            obj.make = false;
            obj.take = false;
        }
        return obj;
    }
});

var TrapBuild = Build.extend({
    ctor: function (bid, level, saveObj) {
        this._super(bid, level, saveObj);
    },
    initBuildActions: function () {
        var action = new TrapBuildAction(this.id);
        this.actions.push(action);
    }
});

var DogBuild = Build.extend({
    ctor: function (bid, level) {
        this._super(bid, level);
    },
    initBuildActions: function () {
        var action = new DogBuildAction(this.id);
        this.actions.push(action);
    },
    restore: function (opt) {
    }
});

var RestBuild = Build.extend({
    ctor: function (bid, level) {
        this._super(bid, level);
    },
    initBuildActions: function () {
        var roleType = player ? player.roleType : null;
        this.actions = BuildActionFactory.createRestActions(this.id, this.level, roleType);
    },
    restore: function (opt) {
    }
});

var BedBuild = Build.extend({
    ctor: function (bid, level) {
        this._super(bid, level);
    },
    initBuildActions: function () {
        for (var type in BedBuildActionType) {
            var action = new BedBuildAction(this.id, this.level, BedBuildActionType[type]);
            this.actions.push(action);
        }
    },
    restore: function (opt) {
    }
});

var BonfireBuild = Build.extend({
    ctor: function (bid, level, saveObj) {
        this._super(bid, level, saveObj);
    },
    initBuildActions: function () {
        var action = new BonfireBuildAction(this.id);
        this.actions.push(action);
    },
    isActive: function () {
        if (this.level >= 0) {
            return this.actions[0].fuel > 0;
        }
        return false;
    }
});

var BombBuild = Build.extend({
    ctor: function (bid, level) {
        this._super(bid, level);
    },
    initBuildActions: function () {
        var action = new BombBuildAction(this.id);
        this.actions.push(action);
    },
    restore: function (opt) {
    }
});

var ElectricStoveBuild = Build.extend({
    ctor: function (bid, level, saveObj) {
        this._super(bid, level, saveObj);
    },
    initBuildActions: function () {
    },
    isActive: function () {
        return player.map.getSite(WORK_SITE).isActive;
    }
});

var ElectricFenceBuild = Build.extend({
    ctor: function (bid, level, saveObj) {
        this._super(bid, level, saveObj);
    },
    initBuildActions: function () {
    },
    isActive: function () {
        return player.map.getSite(WORK_SITE).isActive;
    }
});

var BuildFactory = {
    SPECIAL_BUILD_CTORS: {
        5: BonfireBuild,
        8: TrapBuild,
        9: BedBuild,
        10: RestBuild,
        12: DogBuild,
        17: BombBuild,
        18: ElectricStoveBuild,
        19: ElectricFenceBuild
    },
    getBuildCtor: function (bid) {
        bid = Number(bid);
        return this.SPECIAL_BUILD_CTORS[bid] || Build;
    },
    createBuild: function (bid, level, saveObj) {
        var BuildCtor = this.getBuildCtor(bid);
        return new BuildCtor(Number(bid), Number(level), saveObj);
    }
};

var RoomBuildLayout = {
    BASE_BUILD_STATES: [
        {id: 2, level: -1},
        {id: 3, level: -1},
        {id: 4, level: -1},
        {id: 6, level: -1},
        {id: 8, level: -1},
        {id: 10, level: -1},
        {id: 12, level: -1}
    ],
    ALWAYS_UNLOCKED_BUILD_STATES: [
        {id: 13, level: 0},
        {id: 15, level: -1},
        {id: 1, level: 0},
        {id: 14, level: 0},
        {id: 9, level: -1}
    ]
};

var Room = cc.Class.extend({
    ctor: function () {
        this.map = {};
    },
    _applyBuildStates: function (buildStates) {
        if (!Array.isArray(buildStates)) {
            return;
        }
        buildStates.forEach(function (buildState) {
            if (!buildState) {
                return;
            }
            this.createBuild(buildState.id, buildState.level);
        }, this);
    },
    _createBaseBuilds: function () {
        this._applyBuildStates(RoomBuildLayout.BASE_BUILD_STATES);
    },
    _createRoleBuilds: function (roleType) {
        this._applyBuildStates(RoleRuntimeService.getRoomBuildStates(roleType));
    },
    _createAlwaysUnlockedBuilds: function () {
        this._applyBuildStates(RoomBuildLayout.ALWAYS_UNLOCKED_BUILD_STATES);
    },
    initData: function () {
        this._createBaseBuilds();
        this._createRoleBuilds(player.roleType);
        this._createAlwaysUnlockedBuilds();
    },
    save: function () {
        var saveObj = {};
        for (var bid in this.map) {
            saveObj[bid] = this.map[bid].save();
        }
        return saveObj;
    },
    restore: function (saveObj) {
        if (saveObj) {
            for (var bid in saveObj) {
                var obj = saveObj[bid];
                this.createBuild(bid, obj.level, obj);
            }
        } else {
            this.initData();
        }
    },
    isBuildExist: function (bid, level) {
        var build = this.map[bid];
        if (arguments.length == 1) {
            if (build) {
                return true;
            }
        } else {
            if (build && build.level >= level) {
                return true;
            }
        }
        return false;
    },
    createBuild: function (bid, level, obj) {
        bid = Number(bid);
        level = Number(level);
        this.map[bid] = BuildFactory.createBuild(bid, level, obj);
    },
    getBuild: function (bid) {
        return this.map[bid];
    },
    getBuildName: function (bid, level) {
        return stringUtil.getString(bid + "_" + level).title;
    },
    getBuildLevel: function (bid) {
        return this.getBuild(bid).level;
    },
    getBuildCurrentName: function (bid) {
        var level = this.getBuildLevel(bid);
        if (level < 0)
            level = 0;
        return this.getBuildName(bid, level);
    },
    forEach: function (action) {
        for (var bid in this.map) {
            action(this.map[bid]);
        }
    }
});
