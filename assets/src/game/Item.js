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
    rollCraftProduce: function (produceList) {
        if (!Array.isArray(produceList)) {
            return [];
        }

        return produceList.reduce(function (result, itemInfo) {
            if (!itemInfo) {
                return result;
            }

            var rolledItem = utils.clone(itemInfo);
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
    }
};
