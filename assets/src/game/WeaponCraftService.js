var WeaponCraftService = {
    DURABLE_CRAFT_CHANCE: 0.25,
    DURABLE_BROKEN_MULTIPLIER: 0.5,
    BASE_TO_DURABLE_ITEM_ID: null,
    DURABLE_TO_BASE_ITEM_ID: null,
    _initialized: false,

    init: function () {
        if (this._initialized) {
            return;
        }
        if (typeof itemConfig === "undefined" || !itemConfig || typeof string === "undefined" || !string) {
            return;
        }
        this.BASE_TO_DURABLE_ITEM_ID = this._getConfiguredDurableMap();
        this._buildReverseMap();
        this._registerDurableItemConfigs();
        this._registerDurableStrings();
        this._initialized = true;
    },

    _getConfiguredDurableMap: function () {
        var durableMap = {};
        if (typeof itemConfig === "undefined" || !itemConfig) {
            return durableMap;
        }

        Object.keys(itemConfig).forEach(function (itemId) {
            var baseItemId = parseInt(itemId);
            var config = itemConfig[itemId];
            var durableItemId = Number(config && config.durableItemId);
            if (isNaN(baseItemId)
                || !config
                || !config.effect_weapon
                || !isFinite(durableItemId)
                || durableItemId <= 0) {
                return;
            }
            durableMap[baseItemId] = parseInt(durableItemId);
        });

        return durableMap;
    },

    _forEachDurablePair: function (callback, scope) {
        var durableMap = this.BASE_TO_DURABLE_ITEM_ID || {};
        for (var baseItemId in durableMap) {
            if (!durableMap.hasOwnProperty(baseItemId)) {
                continue;
            }
            callback.call(scope || this, parseInt(baseItemId), parseInt(durableMap[baseItemId]));
        }
    },

    _buildReverseMap: function () {
        var reverseMap = {};
        this._forEachDurablePair(function (baseItemId, durableItemId) {
            reverseMap[durableItemId] = baseItemId;
        });
        this.DURABLE_TO_BASE_ITEM_ID = reverseMap;
    },

    _isLikelyEnglishText: function (text) {
        return /[A-Za-z]/.test(text || "") && !/[\u4e00-\u9fa5]/.test(text || "");
    },

    _buildDurableTitle: function (baseTitle, baseDes) {
        if (this._isLikelyEnglishText(baseDes || baseTitle)) {
            return "Reinforced " + baseTitle;
        }
        return "耐久" + baseTitle;
    },

    _buildDurableDes: function (baseDes) {
        if (this._isLikelyEnglishText(baseDes)) {
            return baseDes + " Reinforced craftsmanship makes it less likely to break.";
        }
        return baseDes + " 经过加固处理，更不容易损坏。";
    },

    _registerDurableItemConfigs: function () {
        if (typeof itemConfig === "undefined" || !itemConfig) {
            return;
        }

        this._forEachDurablePair(function (baseItemId, durableItemId) {
            if (itemConfig[durableItemId]) {
                return;
            }

            var baseConfig = itemConfig[baseItemId];
            if (!baseConfig || !baseConfig.effect_weapon) {
                return;
            }

            var durableConfig = utils.clone(baseConfig);
            durableConfig.id = String(durableItemId);
            durableConfig.baseItemId = baseItemId;
            durableConfig.effect_weapon = utils.clone(baseConfig.effect_weapon);
            durableConfig.effect_weapon.id = String(durableItemId);
            durableConfig.effect_weapon.brokenProbability = Number((baseConfig.effect_weapon.brokenProbability * this.DURABLE_BROKEN_MULTIPLIER).toFixed(4));
            if (durableConfig.effect_tool && durableConfig.effect_tool.id !== undefined) {
                durableConfig.effect_tool = utils.clone(durableConfig.effect_tool);
                durableConfig.effect_tool.id = String(durableItemId);
            }
            delete durableConfig.durableItemId;
            itemConfig[durableItemId] = durableConfig;
        }, this);
    },

    _registerDurableStrings: function () {
        if (typeof string === "undefined" || !string) {
            return;
        }

        this._forEachDurablePair(function (baseItemId, durableItemId) {
            if (string[durableItemId]) {
                return;
            }

            var baseString = string[baseItemId];
            if (!baseString || typeof baseString !== "object") {
                return;
            }

            string[durableItemId] = {
                title: this._buildDurableTitle(baseString.title || "", baseString.des || ""),
                des: this._buildDurableDes(baseString.des || "")
            };
        }, this);
    },

    getBaseItemId: function (itemId) {
        this.init();
        itemId = parseInt(itemId);
        return this.DURABLE_TO_BASE_ITEM_ID[itemId] || itemId;
    },

    getDurableItemId: function (itemId) {
        this.init();
        itemId = parseInt(itemId);
        return this.BASE_TO_DURABLE_ITEM_ID[itemId] || 0;
    },

    isDurableItem: function (itemId) {
        this.init();
        itemId = parseInt(itemId);
        return !!this.DURABLE_TO_BASE_ITEM_ID[itemId];
    },

    getDisplayItemId: function (itemId) {
        return this.getBaseItemId(itemId);
    },
    getDurableCraftChance: function () {
        var chance = this.DURABLE_CRAFT_CHANCE;
        if (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getDurableCraftChance === "function") {
            chance = TalentService.getDurableCraftChance(chance);
        }
        if (typeof Medal !== "undefined"
            && Medal
            && typeof Medal.getDurableCraftChanceBonus === "function") {
            chance += Medal.getDurableCraftChanceBonus();
        }
        return Math.max(0, Math.min(1, chance));
    },

    rollDurableProduce: function (produceList) {
        this.init();
        if (!Array.isArray(produceList)) {
            return produceList;
        }

        var self = this;
        var durableCraftChance = this.getDurableCraftChance();
        return produceList.map(function (item) {
            if (!item) {
                return item;
            }

            var outputItem = utils.clone(item);
            var baseItemId = parseInt(outputItem.itemId);
            var durableItemId = self.getDurableItemId(baseItemId);
            if (!durableItemId || parseInt(outputItem.num) !== 1) {
                return outputItem;
            }

            if (Math.random() < durableCraftChance) {
                outputItem.itemId = durableItemId;
            }
            return outputItem;
        });
    }
};

WeaponCraftService.init();
