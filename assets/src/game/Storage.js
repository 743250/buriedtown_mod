/**
 * Created by lancelot on 15/4/7.
 */

var getStorageRuntimePlayer = function () {
    return GameRuntime.getPlayer();
};

var getStorageRuntimeTimer = function () {
    return GameRuntime.getTimer();
};

var getStorageRuntimeEmitter = function () {
    return GameRuntime.getEmitter();
};

var getStorageRuntimeRecord = function () {
    return GameRuntime.getRecord();
};

var StorageCell = cc.Class.extend({
    ctor: function (item, num) {
        this.item = item;
        this.num = memoryUtil.encode(num);
    }
});
var Storage = cc.Class.extend({
    ctor: function (name) {
        this.map = {};
        this.name = name;
    },
    save: function () {
        var saveObj = {};
        for (var itemId in this.map) {
            saveObj[itemId] = memoryUtil.decode(this.map[itemId].num);
        }
        return saveObj;
    },
    restore: function (saveObj) {
        for (var itemId in saveObj) {
            this.map[itemId] = new StorageCell(new Item(itemId), saveObj[itemId]);
        }
    },
    increaseItem: function (itemId, num) {
        num = Number(num);
        cc.i("increaseItem: " + itemId + " " + num)
        if (num === 0) {
            return;
        }
        var cell = this.map[itemId];
        if (cell) {
            cell.num += memoryUtil.changeEncode(num);
        } else {
            this.map[itemId] = new StorageCell(new Item(itemId), num);
        }

        if (this.name === 'player') {
            Achievement.checkGetItem(itemId);
        }

        if (this.listener) {
            this.listener.call(this, itemId);
        }
    },
    decreaseItem: function (itemId, num) {
        num = Number(num);
        cc.i("decreaseItem: " + itemId + " " + num)
        var cell = this.map[itemId];
        cell.num -= memoryUtil.changeEncode(num);
        if (memoryUtil.decode(cell.num) === 0) {
            delete this.map[itemId];
        }

        if (this.listener) {
            this.listener.call(this, itemId);
        }
    },
    validateItem: function (itemId, num) {
        num = Number(num);
        var cell = this.map[itemId];
        if (cell) {
            return cell.num >= memoryUtil.encode(num);
        } else {
            return false;
        }
    },

    getItemsByType: function (type) {
        type = "" + type;
        var items = Object.keys(this.map);
        var self = this;
        var len = type.length;
        items = items.filter(function (itemId) {
            if (blackList.storageDisplay.indexOf(Number(itemId)) !== -1)
                return false;
            var itemIdStr = "" + itemId;
            return type == itemIdStr.substr(0, len);
        });

        var min = 1300000;
        var max = 1400000;
        items.sort(function (itemIdA, itemIdB) {
            itemIdA = Number(itemIdA);
            itemIdB = Number(itemIdB);

            if ((itemIdA >= min && itemIdA < max) && (itemIdB < min || itemIdB >= max)) {
                return -1;
            } else if ((itemIdA < min || itemIdA >= max) && (itemIdB >= min && itemIdB < max)) {
                return 1;
            } else if ((itemIdA >= min && itemIdA < max) && (itemIdB >= min && itemIdB < max)) {
                if (itemIdA === BattleConfig.BULLET_ID || itemIdB === BattleConfig.BULLET_ID) {
                    return 1;
                }
                return itemIdA - itemIdB;
            } else {
                return itemIdA - itemIdB;
            }

        });
        items = items.map(function (itemId) {
            return self.map[itemId];
        });
        return items;
    },

    getItemsByTypeGroup: function (typeArray) {
        var res = {};
        typeArray.forEach(function (key) {
            res[key] = [];
        });
        for (var itemId in this.map) {
            if (blackList.storageDisplay.indexOf(Number(itemId)) === -1) {
                var itemIdStr = "" + itemId;
                for (var i = 0; i < typeArray.length - 1; i++) {
                    var type = typeArray[i];
                    var len = type.length;
                    if (itemIdStr.substr(0, len) == type) {
                        res[type].push(this.map[itemId]);
                        break;
                    }
                }
                if (i >= typeArray.length - 1) {
                    res["other"].push(this.map[itemId]);
                }
            }
        }
        return res;
    },

    forEach: function (func) {
        for (var itemId in this.map) {
            var cell = this.map[itemId];
            func(cell.item, memoryUtil.decode(cell.num));
        }
    },
    getNumByItemId: function (itemId) {
        if (this.map[itemId]) {
            return memoryUtil.decode(this.map[itemId].num);
        } else {
            return 0;
        }
    },
    getItem: function (itemId) {
        if (this.map[itemId]) {
            return this.map[itemId].item;
        } else {
            return null;
        }
    },
    clone: function () {
        var newStorage = new Storage();
        for (var itemId in this.map) {
            newStorage.increaseItem(itemId, this.getNumByItemId(itemId));
        }
        return newStorage;
    },
    setItem: function (itemId, num) {
        num = Number(num);
        if (num === 0) {
            delete this.map[itemId];
        } else {
            var cell = this.map[itemId];
            if (cell) {
                cell.num = memoryUtil.encode(num);
            } else {
                this.map[itemId] = new StorageCell(new Item(itemId), num);
            }
        }
    },
    isEmpty: function () {
        return Object.keys(this.map).length === 0;
    },
    getAllItemNum: function () {
        var totalNum = 0;
        this.forEach(function (item, num) {
            if (blackList.storageDisplay.indexOf(Number(item.id)) === -1) {
                totalNum += num;
            }
        });
        return totalNum;
    },
    validateItemWeight: function (itemId, num) {
        return true;
    },

    getItemSortNum: function () {
        return Object.keys(this.map).length;
    },

    setOnItemChangeListener: function (listener) {
        this.listener = listener;
    },

    removeOnItemChangeListener: function () {
        this.listener = null;
    }
});

var Bag = Storage.extend({
    ctor: function (name) {
        this._super(name);
    },
    validateItemWeight: function (itemId, num) {
        var unitWeight = utils.truncateWeight(itemConfig[itemId].weight);
        var weight = utils.truncateWeight(unitWeight * num);
        return utils.truncateWeight(weight + this.getCurrentWeight()) <= this.getTotalWeight();
    },
    getCurrentWeight: function () {
        var weight = 0;
        this.forEach(function (item, num) {
            weight += utils.truncateWeight(item.getWeight()) * num;
        });
        return utils.truncateWeight(weight);
    },
    getTotalWeight: function () {
        var weight = 35;
        if (typeof ItemRuntimeService !== "undefined"
            && ItemRuntimeService
            && typeof ItemRuntimeService.getBagWeightBonus === "function") {
            weight += ItemRuntimeService.getBagWeightBonus(getStorageRuntimePlayer());
        }
        if (typeof TalentService !== "undefined" && TalentService && TalentService.getBagWeightBonus)  {
            weight += TalentService.getBagWeightBonus();
        }
        return utils.truncateWeight(weight);
    },
    decreaseItem: function (itemId, num) {
        this._super(itemId, num);
        var runtimePlayer = getStorageRuntimePlayer();
        if (this.getNumByItemId(itemId) == 0
            && runtimePlayer
            && runtimePlayer.equip
            && runtimePlayer.equip.isEquiped(itemId)) {
            runtimePlayer.equip.unequipByItemId(itemId);
            getStorageRuntimeEmitter().emit("equiped_item_decrease_in_bag");
        }
    },
    clone: function () {
        var newBag = new Bag();
        for (var itemId in this.map) {
            newBag.increaseItem(itemId, this.getNumByItemId(itemId));
        }
        return newBag;
    },
    testWeaponBroken: function (itemId) {
        var runtimeTimer = getStorageRuntimeTimer();
        var runtimePlayer = getStorageRuntimePlayer();
        if (!runtimeTimer
            || typeof runtimeTimer.formatTime !== "function"
            || !runtimePlayer) {
            return false;
        }
        //新手保护, 3天内不会损坏武器
        if (runtimeTimer.formatTime().d < 3) {
            return false;
        }
        if (typeof TalentService !== "undefined" && TalentService && TalentService.isElitePistolItem && TalentService.isElitePistolItem(itemId)) {
            return false;
        }
        if (itemConfig[itemId]) {
            var weaponBrokenProbability = itemConfig[itemId].effect_weapon.brokenProbability;
            var brokenResultItemId = (typeof ItemRuntimeService !== "undefined"
                && ItemRuntimeService
                && typeof ItemRuntimeService.getBrokenResultItemId === "function")
                ? ItemRuntimeService.getBrokenResultItemId(itemId)
                : 0;
            weaponBrokenProbability = TalentService.getWeaponBrokenProbability(weaponBrokenProbability);
            var rand = Math.random();
            cc.log("testWeaponBroken " + itemId + " " + weaponBrokenProbability + ":" + rand);
            var isBroken = (rand <= weaponBrokenProbability);
            if (isBroken) {
                runtimePlayer.equip.unequipByItemId(itemId);
                this.decreaseItem(itemId, 1);
                if (brokenResultItemId) {
                    this.increaseItem(brokenResultItemId, 1);
                }
                cc.log("itemId=" + itemId + " is broken");
                runtimePlayer.log.addMsg(1205, stringUtil.getString(itemId).title);
                if (typeof Medal !== "undefined"
                    && Medal
                    && typeof Medal.trackWeaponBroken === "function") {
                    Medal.trackWeaponBroken(itemId, 1);
                }

                getStorageRuntimeRecord().saveAll();
            }
            return isBroken ? {
                itemId: itemId,
                brokenResultItemId: brokenResultItemId
            } : false;
        }
        return false;
    }
});
