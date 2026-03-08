var WeaponCraftService = {
    DURABLE_CRAFT_CHANCE: 0.25,
    DURABLE_BROKEN_MULTIPLIER: 0.5,
    BASE_TO_DURABLE_ITEM_ID: {
        1301011: 1301111,
        1301022: 1301122,
        1301033: 1301133,
        1301041: 1301141,
        1301052: 1301152,
        1301063: 1301163,
        1301071: 1301171,
        1301082: 1301182,
        1302011: 1302111,
        1302021: 1302121,
        1302032: 1302132,
        1302043: 1302143
    },
    DURABLE_TO_BASE_ITEM_ID: null,
    _initialized: false,

    init: function () {
        if (this._initialized) {
            return;
        }
        if (typeof itemConfig === "undefined" || !itemConfig || typeof string === "undefined" || !string) {
            return;
        }
        this._buildReverseMap();
        this._registerDurableItemConfigs();
        this._registerDurableStrings();
        this._initialized = true;
    },

    _buildReverseMap: function () {
        var reverseMap = {};
        for (var baseItemId in this.BASE_TO_DURABLE_ITEM_ID) {
            if (!this.BASE_TO_DURABLE_ITEM_ID.hasOwnProperty(baseItemId)) {
                continue;
            }
            reverseMap[this.BASE_TO_DURABLE_ITEM_ID[baseItemId]] = parseInt(baseItemId);
        }
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

        for (var baseItemId in this.BASE_TO_DURABLE_ITEM_ID) {
            if (!this.BASE_TO_DURABLE_ITEM_ID.hasOwnProperty(baseItemId)) {
                continue;
            }

            var durableItemId = this.BASE_TO_DURABLE_ITEM_ID[baseItemId];
            if (itemConfig[durableItemId]) {
                continue;
            }

            var baseConfig = itemConfig[baseItemId];
            if (!baseConfig || !baseConfig.effect_weapon) {
                continue;
            }

            var durableConfig = utils.clone(baseConfig);
            durableConfig.id = String(durableItemId);
            durableConfig.effect_weapon = utils.clone(baseConfig.effect_weapon);
            durableConfig.effect_weapon.id = String(durableItemId);
            durableConfig.effect_weapon.brokenProbability = Number((baseConfig.effect_weapon.brokenProbability * this.DURABLE_BROKEN_MULTIPLIER).toFixed(4));
            if (durableConfig.effect_tool && durableConfig.effect_tool.id !== undefined) {
                durableConfig.effect_tool = utils.clone(durableConfig.effect_tool);
                durableConfig.effect_tool.id = String(durableItemId);
            }
            itemConfig[durableItemId] = durableConfig;
        }
    },

    _registerDurableStrings: function () {
        if (typeof string === "undefined" || !string) {
            return;
        }

        for (var baseItemId in this.BASE_TO_DURABLE_ITEM_ID) {
            if (!this.BASE_TO_DURABLE_ITEM_ID.hasOwnProperty(baseItemId)) {
                continue;
            }

            var durableItemId = this.BASE_TO_DURABLE_ITEM_ID[baseItemId];
            if (string[durableItemId]) {
                continue;
            }

            var baseString = string[baseItemId];
            if (!baseString || typeof baseString !== "object") {
                continue;
            }

            string[durableItemId] = {
                title: this._buildDurableTitle(baseString.title || "", baseString.des || ""),
                des: this._buildDurableDes(baseString.des || "")
            };
        }
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

    rollDurableProduce: function (produceList) {
        this.init();
        if (!Array.isArray(produceList)) {
            return produceList;
        }

        var self = this;
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

            if (Math.random() < self.DURABLE_CRAFT_CHANCE) {
                outputItem.itemId = durableItemId;
            }
            return outputItem;
        });
    }
};

WeaponCraftService.init();
