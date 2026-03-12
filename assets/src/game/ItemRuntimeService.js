if (typeof module !== "undefined"
    && module.exports
    && (typeof utils === "undefined" || !utils)) {
    var utils = require("../util/utils");
}

var ItemRuntimeService = {
    SPECIAL_EQUIPMENT_KIND: {
        1303022: "trap",
        1303012: "bomb",
        1303033: "bomb",
        1303044: "bomb",
        1301071: "electric_gun",
        1301082: "electric_gun"
    },
    SPECIAL_STORAGE_WEIGHT_BONUS: {
        1305023: 10,
        1305024: 25,
        1305044: 15
    },
    SPECIAL_WEATHER_PRODUCE_BONUS: {
        1101061: "item_1101061",
        1103041: "item_1103041"
    },
    SPECIAL_ELECTRIC_GUN_SOUND: {
        1301071: "ATTACK_7",
        1301082: "ATTACK_8"
    },

    _normalizeItemId: function (itemId) {
        itemId = parseInt(itemId);
        return isNaN(itemId) ? 0 : itemId;
    },

    _buildUseFailedResult: function (type, msg) {
        return {result: false, type: type, msg: msg};
    },

    _consumeOneAndLog: function (playerObj, storage, itemId, messageId, itemName) {
        storage.decreaseItem(itemId, 1);
        playerObj.log.addMsg(messageId, itemName, storage.getNumByItemId(itemId));
    },

    _useFoodItem: function (playerObj, storage, itemId, item, itemName) {
        if (!uiUtil.checkStarve()) {
            return {result: false};
        }
        this._consumeOneAndLog(playerObj, storage, itemId, 1093, itemName);
        playerObj.itemEffect(item, item.getFoodEffect());
        return {result: true};
    },

    _useMedicineItem: function (playerObj, storage, itemId, item, itemName) {
        if (itemId === 1104011) {
            this._consumeOneAndLog(playerObj, storage, itemId, 1094, itemName);
            playerObj.itemEffect(item, item.getMedicineEffect());
            playerObj.bindUp();
            return {result: true};
        }

        this._consumeOneAndLog(playerObj, storage, itemId, 1095, itemName);
        if (itemId === 1104032) {
            var result = playerObj.item1104032Effect(item, item.getMedicineEffect());
            if (result) {
                playerObj.cure();
            }
            return {result: true};
        }

        playerObj.itemEffect(item, item.getMedicineEffect());
        playerObj.cure();
        return {result: true};
    },

    _useBuffItem: function (playerObj, storage, itemId, itemName) {
        this._consumeOneAndLog(playerObj, storage, itemId, 1095, itemName);
        playerObj.buffManager.applyBuff(itemId);
        return {result: true};
    },

    _useSpecialConsumableItem: function (playerObj, storage, itemId, item, itemName) {
        if (itemId !== 1105061) {
            return null;
        }
        this._consumeOneAndLog(playerObj, storage, itemId, 1374, itemName);
        playerObj.itemEffect(item, {
            spirit: 6,
            spirit_chance: 1,
            infect: 4,
            infect_chance: 1
        });
        return {result: true};
    },

    useItem: function (playerObj, storage, itemId) {
        itemId = this._normalizeItemId(itemId);
        if (!storage || !storage.validateItem(itemId, 1)) {
            return this._buildUseFailedResult(1, "not enough");
        }

        var item = storage.getItem(itemId);
        var itemName = stringUtil.getString(itemId).title;

        if (item.isType(ItemType.TOOL, ItemType.FOOD)) {
            return this._useFoodItem(playerObj, storage, itemId, item, itemName);
        }
        if (item.isType(ItemType.TOOL, ItemType.MEDICINE)) {
            return this._useMedicineItem(playerObj, storage, itemId, item, itemName);
        }
        if (item.isType(ItemType.TOOL, ItemType.BUFF)) {
            return this._useBuffItem(playerObj, storage, itemId, itemName);
        }

        var specialConsumeResult = this._useSpecialConsumableItem(playerObj, storage, itemId, item, itemName);
        if (specialConsumeResult) {
            return specialConsumeResult;
        }
        return this._buildUseFailedResult(2, "this type can't use");
    },

    testWeaponBroken: function (storageObj, itemId) {
        itemId = this._normalizeItemId(itemId);
        if (cc.timer.formatTime().d < 3) {
            return false;
        }
        if (typeof TalentService !== "undefined"
            && TalentService
            && TalentService.isElitePistolItem
            && TalentService.isElitePistolItem(itemId)) {
            return false;
        }
        if (!itemConfig[itemId] || !itemConfig[itemId].effect_weapon) {
            return false;
        }

        var weaponBrokenProbability = itemConfig[itemId].effect_weapon.brokenProbability;
        weaponBrokenProbability = TalentService.getWeaponBrokenProbability(weaponBrokenProbability);
        var rand = Math.random();
        cc.log("testWeaponBroken " + itemId + " " + weaponBrokenProbability + ":" + rand);
        var isBroken = (rand <= weaponBrokenProbability);
        if (isBroken) {
            player.equip.unequipByItemId(itemId);
            storageObj.decreaseItem(itemId, 1);
            cc.log("itemId=" + itemId + " is broken");
            player.log.addMsg(1205, stringUtil.getString(itemId).title);
            Record.saveAll();
        }
        return isBroken;
    },

    getSpecialEquipmentKind: function (itemId) {
        itemId = this._normalizeItemId(itemId);
        return this.SPECIAL_EQUIPMENT_KIND[itemId] || null;
    },

    getSpecialElectricGunSoundKey: function (itemId) {
        itemId = this._normalizeItemId(itemId);
        return this.SPECIAL_ELECTRIC_GUN_SOUND[itemId] || null;
    },

    getStorageWeightBonus: function (getOwnedNum) {
        var bonus = 0;
        if (typeof getOwnedNum !== "function") {
            return bonus;
        }
        for (var itemId in this.SPECIAL_STORAGE_WEIGHT_BONUS) {
            if (!this.SPECIAL_STORAGE_WEIGHT_BONUS.hasOwnProperty(itemId)) {
                continue;
            }
            if (getOwnedNum(Number(itemId)) > 0) {
                bonus += Number(this.SPECIAL_STORAGE_WEIGHT_BONUS[itemId]) || 0;
            }
        }
        return bonus;
    },

    applyProduceWeatherBonuses: function (produce, weatherObj) {
        if (!Array.isArray(produce)) {
            return produce;
        }
        if (!weatherObj || typeof weatherObj.getValue !== "function") {
            return produce;
        }
        produce.forEach(function (item) {
            if (!item) {
                return;
            }
            var weatherKey = this.SPECIAL_WEATHER_PRODUCE_BONUS[this._normalizeItemId(item.itemId)];
            if (!weatherKey) {
                return;
            }
            item.num += weatherObj.getValue(weatherKey);
        }, this);
        return produce;
    },

    rollCraftProduce: function (produceList) {
        if (typeof WeaponCraftService !== "undefined"
            && WeaponCraftService
            && typeof WeaponCraftService.rollDurableProduce === "function") {
            return WeaponCraftService.rollDurableProduce(produceList);
        }
        return utils.clone(produceList);
    },

    ensureSpecialItems: function (playerObj, specialItems) {
        if (!playerObj || !playerObj.storage || !Array.isArray(specialItems)) {
            return;
        }
        specialItems.forEach(function (itemInfo) {
            if (!itemInfo) {
                return;
            }
            var itemId = this._normalizeItemId(itemInfo.itemId);
            var targetNum = parseInt(itemInfo.num, 10);
            if (!itemId || !(targetNum > 0)) {
                return;
            }
            var currentNum = playerObj.storage.getNumByItemId(itemId) || 0;
            if (currentNum < targetNum) {
                playerObj.storage.increaseItem(itemId, targetNum - currentNum);
            }
        }, this);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = ItemRuntimeService;
}
