/**
 * Created by lancelot on 15/4/7.
 */

var ItemType = {
    TOOL: "11",
    EQUIP: "13",

    MATERIAL: "01",
    MODEL: "02",
    FOOD: "03",
    MEDICINE: "04",
    ECONOMY: "05",
    SPECIFIC: "06",
    BUFF: "07",

    GUN: "01",
    WEAPON: "02",
    WEAPON_TOOL: "03",
    DEFEND: "04",
    OTHER: "05"
}

var Item = cc.Class.extend({
    ctor: function (id) {
        this.id = id;
        if (typeof ConfigValidator !== "undefined" && ConfigValidator && typeof ConfigValidator.warnIfInvalid === "function") {
            ConfigValidator.warnIfInvalid("item", this.id, "new Item");
        }

        var itemDefinition = itemConfig[this.id];
        if (!itemDefinition) {
            cc.e("Item config missing. itemId=" + this.id);
            throw {msg: "item config missing: " + this.id};
        }
        this.config = utils.clone(itemDefinition);
    },
    getPrice: function () {
        return this.config["price"];
    },
    getType: function (level) {
        var itemIdStr = "" + this.id;
        var typeId = itemIdStr.substr(level * 2, 2);
        return typeId;
    },
    getWeight: function () {
        return this.config["weight"];
    },
    isType: function (type1, type2) {
        return (this.getType(0) == type1 && this.getType(1) == type2);
    },
    getFoodEffect: function () {
        return this.config["effect_food"];
    },
    getMedicineEffect: function () {
        return this.config["effect_medicine"];
    }


});

var ItemRuntimeService = {
    _bagWeightBonusCache: null,
    _normalizeRandomItemIdList: function (itemIds) {
        if (!Array.isArray(itemIds)) {
            return [];
        }
        return itemIds.map(function (itemId) {
            var normalizedItemId = Number(itemId);
            if (isNaN(normalizedItemId)) {
                return null;
            }
            return itemConfig[normalizedItemId] ? normalizedItemId : null;
        }).filter(function (itemId) {
            return itemId !== null;
        });
    },
    resolveCraftItemId: function (itemInfo) {
        if (!itemInfo) {
            return 0;
        }

        var randomItemIds = this._normalizeRandomItemIdList(itemInfo.randomItemIds);
        if (randomItemIds.length > 0) {
            return randomItemIds[utils.getRandomInt(0, randomItemIds.length - 1)];
        }

        if (itemInfo.itemId === undefined || itemInfo.itemId === null) {
            return 0;
        }
        return Number(utils.getRandomItemId(String(itemInfo.itemId))) || 0;
    },
    getBrokenResultItemId: function (itemId) {
        itemId = parseInt(itemId, 10);
        if (isNaN(itemId) || typeof itemConfig === "undefined" || !itemConfig || !itemConfig[itemId]) {
            return 0;
        }

        var brokenResultItemId = Number(itemConfig[itemId].brokenResultItemId);
        if (isNaN(brokenResultItemId) || !itemConfig[brokenResultItemId]) {
            return 0;
        }
        return brokenResultItemId;
    },
    rollCraftProduce: function (produceList) {
        if (!Array.isArray(produceList)) {
            return [];
        }

        var rolledProduce = produceList.reduce(function (result, itemInfo) {
            if (!itemInfo) {
                return result;
            }

            var rolledItem = utils.clone(itemInfo);
            rolledItem.itemId = ItemRuntimeService.resolveCraftItemId(rolledItem);
            if (!rolledItem.itemId) {
                return result;
            }
            var minNum = parseInt(rolledItem.minNum, 10);
            var maxNum = parseInt(rolledItem.maxNum, 10);
            if (!isNaN(minNum) && !isNaN(maxNum) && maxNum >= minNum) {
                rolledItem.num = utils.getRandomInt(minNum, maxNum);
            }

            rolledItem.num = parseInt(rolledItem.num, 10) || 0;
            if (rolledItem.num > 0) {
                result.push(rolledItem);
            }
            return result;
        }, []);

        if (typeof WeaponCraftService !== "undefined"
            && WeaponCraftService
            && typeof WeaponCraftService.rollDurableProduce === "function") {
            rolledProduce = WeaponCraftService.rollDurableProduce(rolledProduce);
        }
        return rolledProduce;
    },
    _getBagWeightBonusList: function () {
        if (this._bagWeightBonusCache) {
            return this._bagWeightBonusCache;
        }
        var result = [];
        if (typeof itemConfig !== "undefined" && itemConfig) {
            Object.keys(itemConfig).forEach(function (itemId) {
                var config = itemConfig[itemId];
                if (!config || config.bagWeightBonus === undefined || config.bagWeightBonus === null) {
                    return;
                }
                var bonus = Number(config.bagWeightBonus);
                if (!isFinite(bonus) || bonus === 0) {
                    return;
                }
                var normalizedId = parseInt(config.id !== undefined ? config.id : itemId);
                if (isNaN(normalizedId)) {
                    return;
                }
                result.push({
                    itemId: normalizedId,
                    bonus: bonus
                });
            });
        }
        this._bagWeightBonusCache = result;
        return result;
    },
    _getOwnedItemCount: function (playerObj, itemId) {
        if (!playerObj) {
            return 0;
        }
        if (typeof playerObj.getItemNumInPlayer === "function") {
            var totalNum = Number(playerObj.getItemNumInPlayer(itemId));
            return isNaN(totalNum) ? 0 : totalNum;
        }
        var total = 0;
        if (playerObj.storage && typeof playerObj.storage.getNumByItemId === "function") {
            total += Number(playerObj.storage.getNumByItemId(itemId) || 0);
        }
        if (playerObj.bag && typeof playerObj.bag.getNumByItemId === "function") {
            total += Number(playerObj.bag.getNumByItemId(itemId) || 0);
        }
        return total;
    },
    getBagWeightBonus: function (playerObj) {
        var bonusList = this._getBagWeightBonusList();
        if (!bonusList.length) {
            return 0;
        }
        var totalBonus = 0;
        for (var i = 0; i < bonusList.length; i++) {
            var entry = bonusList[i];
            if (this._getOwnedItemCount(playerObj, entry.itemId) > 0) {
                totalBonus += entry.bonus;
            }
        }
        return totalBonus;
    }
};
