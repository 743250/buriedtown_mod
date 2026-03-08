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

// Action锁定配置表
var _actionLockConfig = {
    1405024: { purchaseId: 105, checkFn: 'isBigBagUnlocked' },
    1404024: { purchaseId: 106, checkFn: 'isBootUnlocked' }
};

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
        if (this.id === 2 && this.level >= 1) {
            return 2;
        }
        return 1;
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

    _markActionLockState: function (action) {
        action.isLocked = false;
        action.purchaseId = null;

        var config = _actionLockConfig[action.id];
        if (config) {
            action.purchaseId = config.purchaseId;
            var checkFn = IAPPackage[config.checkFn];
            action.isLocked = checkFn ? !checkFn.call(IAPPackage) : false;
        }
    },

    _isActionVisibleByInventory: function (actionId, inventoryState) {
        if (actionId === 1405023 && inventoryState.hasSmallBag) {
            return false;
        }
        if (actionId === 1405024 && (inventoryState.hasBigBag || !inventoryState.hasSmallBag)) {
            return false;
        }
        if (actionId === 1404024 && inventoryState.hasBoot) {
            return false;
        }
        if (inventoryState.hasFalcon && (actionId === 1405044 || actionId === 1202053)) {
            return false;
        }
        if (inventoryState.hasFlashlight && actionId === 1405053) {
            return false;
        }
        return true;
    },

    _isActionVisibleByRoleAndState: function (actionId, roleType, isWorkSitePowered) {
        return RoleRuntimeService.isBuildActionVisible(actionId, roleType, {
            isWorkSitePowered: isWorkSitePowered
        });
    },
    _buildActionFilterContext: function () {
        return {
            roleType: this._getRoleType(),
            isWorkSitePowered: this._isWorkSitePowered(),
            inventoryState: {
                hasSmallBag: this._hasStorageItem(1305023),
                hasBigBag: this._hasStorageItem(1305024),
                hasBoot: this._hasStorageItem(1304024),
                hasFalcon: this._hasStorageItem(1305044),
                hasFlashlight: this._hasStorageItem(1305053)
            }
        };
    },
    _isActionVisible: function (action, context) {
        return this._isActionVisibleByInventory(action.id, context.inventoryState)
            && this._isActionVisibleByRoleAndState(action.id, context.roleType, context.isWorkSitePowered);
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
        var self = this;
        var context = this._buildActionFilterContext();
        this.actions.forEach(function (action) {
            self._markActionLockState(action);
        });
        return this.actions.filter(function (action) {
            return self._isActionVisible(action, context);
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
        var action1 = new RestBuildAction(this.id, this.level);
        this.actions.push(action1);
        this.actions.push(new SmokeBuildAction(this.id, this.level, 3));
        this.actions.push(new SmokeBuildAction(this.id, this.level, 4));
        this.actions.push(new SmokeBuildAction(this.id, this.level, 5));
        var roleType = player ? player.roleType : null;
        var restActionTypes = RoleRuntimeService.getRestActionTypes(roleType);
        restActionTypes.forEach(function (actionType) {
            if (actionType === "drink") {
                this.actions.push(new DrinkBuildAction(this.id, this.level));
            } else if (actionType === "drink_tea") {
                this.actions.push(new DrinkTeaBuildAction(this.id, this.level));
            }
        }, this);
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

var Room = cc.Class.extend({
    ctor: function () {
        this.map = {};
    },
    initData: function () {
        //温棚
        this.createBuild(2, -1);
        //药盒
        this.createBuild(3, -1);
        //灶台
        this.createBuild(4, -1);
        //蒸馏器
        this.createBuild(6, -1);
        //野兔陷阱
        this.createBuild(8, -1);
        //椅子
        this.createBuild(10, -1);
        //狗舍
        this.createBuild(12, -1);

        RoleRuntimeService.applyRoomBuildStates(this, player.roleType);

        //仓库
        this.createBuild(13, 0);
        //老式电台
        this.createBuild(15, -1);

        //新手引导解锁
        //工具箱
        this.createBuild(1, 0);
        //大门
        this.createBuild(14, 0);
        //睡袋
        this.createBuild(9, -1);
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
        var b;
        bid = Number(bid);
        level = Number(level);
        switch (bid) {
            case 5:
                b = new BonfireBuild(bid, level, obj);
                break;
            case 8:
                b = new TrapBuild(bid, level, obj);
                break;
            case 9:
                b = new BedBuild(bid, level, obj);
                break;
            case 10:
                b = new RestBuild(bid, level, obj);
                break;
            case 12:
                b = new DogBuild(bid, level, obj);
                break;
            case 17:
                b = new BombBuild(bid, level, obj);
                break;
            case 18:
                b = new ElectricStoveBuild(bid, level, obj);
                break;
            case 19:
                b = new ElectricFenceBuild(bid, level, obj);
                break;
            default :
                b = new Build(bid, level, obj);
                break;
        }
        this.map[bid] = b;
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
