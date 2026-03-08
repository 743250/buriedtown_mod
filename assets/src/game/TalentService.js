/**
 * Owns talent selection state and talent-derived gameplay modifiers.
 * IAPPackage keeps purchase/exchange responsibilities and delegates talent APIs
 * here for compatibility.
 */
var TalentService = {
    _chosenTalentIds: null,
    MAX_CHOSEN_TALENT_COUNT: 3,
    ELITE_PISTOL_ITEM_ID: 1301091,
    ELITE_PISTOL_ATK_CD_MULTIPLIER: 0.8,
    ELITE_PISTOL_PRECISE_BONUS: 0.15,
    ELITE_PISTOL_HEADSHOT_BONUS: 0.05,
    _getTalentConfigTable: function () {
        if (typeof TalentConfigTable !== "undefined" && TalentConfigTable) {
            return TalentConfigTable;
        }
        return {};
    },
    _getTalentConfig: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)) {
            return null;
        }
        return this._getTalentConfigTable()[purchaseId] || null;
    },
    getTalentConfig: function (purchaseId) {
        return this._getTalentConfig(purchaseId);
    },
    _getTalentValueList: function (purchaseId, fieldName) {
        var config = this._getTalentConfig(purchaseId);
        if (!config || !Array.isArray(config[fieldName])) {
            return [];
        }
        return config[fieldName];
    },
    _getTalentValueByLevel: function (purchaseId, fieldName, level, fallbackValue) {
        var valueList = this._getTalentValueList(purchaseId, fieldName);
        if (valueList.length === 0) {
            return fallbackValue;
        }
        level = parseInt(level);
        if (isNaN(level) || level < 0) {
            level = 0;
        }
        if (level >= valueList.length) {
            level = valueList.length - 1;
        }
        var value = valueList[level];
        return value === undefined ? fallbackValue : value;
    },
    _getSortedTalentIds: function () {
        var table = this._getTalentConfigTable();
        return Object.keys(table).map(function (id) {
            return parseInt(id);
        }).filter(function (id) {
            return !isNaN(id);
        }).sort(function (a, b) {
            var configA = table[a] || {};
            var configB = table[b] || {};
            var orderA = isFinite(configA.displayOrder) ? parseInt(configA.displayOrder) : a;
            var orderB = isFinite(configB.displayOrder) ? parseInt(configB.displayOrder) : b;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return a - b;
        });
    },
    getTalentMaxLevel: function (purchaseId) {
        var config = this._getTalentConfig(purchaseId);
        if (!config || !isFinite(config.maxLevel)) {
            return 3;
        }
        return Math.max(1, parseInt(config.maxLevel));
    },
    getTalentTierEffectTextList: function (purchaseId) {
        var config = this._getTalentConfig(purchaseId);
        if (!config || !Array.isArray(config.tierEffectTextList)) {
            return [];
        }
        return config.tierEffectTextList.slice();
    },
    _getActiveTalentLevel: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId) || typeof Medal === "undefined" || !Medal || typeof Medal.getTalentLevel !== "function") {
            return 0;
        }
        if (!this.hasChosenTalent(purchaseId)) {
            return 0;
        }
        return Medal.getTalentLevel(purchaseId);
    },
    _getCompletedMedalHpBonus: function () {
        if (typeof Medal === "undefined" || !Medal) {
            return null;
        }
        if (!Medal._map && typeof Medal.init === "function") {
            Medal.init();
        }
        if (!Medal._map) {
            return null;
        }
        var sum = 0;
        ["201", "202", "203"].forEach(function (id) {
            var info = Medal._map[id];
            if (!info || info.completed !== 1 || !info.effect || !info.effect.attr) {
                return;
            }
            var hp = Number(info.effect.attr.hp || 0);
            if (isFinite(hp) && hp > 0) {
                sum += hp;
            }
        });
        return sum;
    },
    reconcilePlayerHpByTalentSelection: function (player) {
        if (!player || !player.hpMaxOrigin) {
            return;
        }

        var medalHpBonus = this._getCompletedMedalHpBonus();
        if (medalHpBonus === null) {
            return;
        }

        var baseHp = (typeof PlayerAttr !== "undefined" && PlayerAttr && PlayerAttr.HP_MAX !== undefined)
            ? Number(PlayerAttr.HP_MAX)
            : 240;
        if (!isFinite(baseHp)) {
            baseHp = 240;
        }

        var level121 = this._getActiveTalentLevel(121);
        var hpBonusByTalent = this._getTalentValueByLevel(121, "hpBonusValues", level121, 0);
        var expectedHpMaxOrigin = baseHp + medalHpBonus + hpBonusByTalent;
        var currentHpMaxOrigin = memoryUtil.decode(player.hpMaxOrigin);
        if (currentHpMaxOrigin === expectedHpMaxOrigin) {
            return;
        }

        player.hpMaxOrigin = memoryUtil.encode(expectedHpMaxOrigin);
        if (typeof player.updateHpMax === "function") {
            player.updateHpMax();
        } else {
            player.hpMax = player.hpMaxOrigin;
            var currentHp = memoryUtil.decode(player.hp);
            if (currentHp > expectedHpMaxOrigin) {
                player.hp = memoryUtil.encode(expectedHpMaxOrigin);
            }
        }
    },
    init: function (player) {
        var level121 = this._getActiveTalentLevel(121);
        if (level121 >= 1) {
            var hpBonus = this._getTalentValueByLevel(121, "hpBonusValues", level121, 0);
            player.hp += memoryUtil.changeEncode(hpBonus);
            player.hpMaxOrigin += memoryUtil.changeEncode(hpBonus);
            player.hpMax = player.hpMaxOrigin;
        }
    },
    getPreciseEffect: function (precise) {
        var level120 = this._getActiveTalentLevel(120);
        if (level120 >= 1) {
            return precise * this._getTalentValueByLevel(120, "preciseMultiplierValues", level120, 1);
        }
        return precise;
    },
    getHeadshotEffect: function (deathHit) {
        var level120 = this._getActiveTalentLevel(120);
        if (level120 >= 1) {
            var multiplier = this._getTalentValueByLevel(120, "headshotMultiplierValues", level120, 1);
            return deathHit + (0.4 - deathHit) * (multiplier - 1);
        }
        return deathHit;
    },
    getGunDamageEffect: function (damage) {
        return damage;
    },
    rollScavengerDoubleDrop: function () {
        var level122 = this._getActiveTalentLevel(122);
        if (level122 < 1) {
            return false;
        }
        return Math.random() < this._getTalentValueByLevel(122, "doubleDropChanceValues", level122, 0);
    },
    getDropEffect: function (produceValue) {
        if (this.rollScavengerDoubleDrop()) {
            return produceValue * 2;
        }
        return produceValue;
    },
    applyHomeProduceEffect: function (produceList) {
        var level103 = this._getActiveTalentLevel(103);
        if (!Array.isArray(produceList) || level103 < 1) {
            return produceList;
        }
        var multiplier = this._getTalentValueByLevel(103, "homeProduceMultiplierValues", level103, 1);
        return produceList.map(function (item) {
            if (item && item.num > 0) {
                var boostedNum = Math.floor(item.num * multiplier);
                item.num = Math.max(item.num, boostedNum);
            }
            return item;
        });
    },
    getBagWeightBonus: function () {
        var level121 = this._getActiveTalentLevel(121);
        return this._getTalentValueByLevel(121, "bagWeightBonusValues", level121, 0);
    },
    getMeleeDamageEffect: function (damage) {
        var level121 = this._getActiveTalentLevel(121);
        var multiplier = this._getTalentValueByLevel(121, "meleeDamageMultiplierValues", level121, 1);
        return Math.max(1, Math.floor(damage * multiplier));
    },
    getInfectIncreaseEffect: function (infectValue) {
        if (!(infectValue > 0)) {
            return infectValue;
        }
        var level102 = this._getActiveTalentLevel(102);
        return infectValue * this._getTalentValueByLevel(102, "infectIncreaseMultiplierValues", level102, 1);
    },
    isElitePistolUnlocked: function () {
        var config = this._getTalentConfig(120);
        var unlockLevel = config && isFinite(config.elitePistolUnlockLevel)
            ? parseInt(config.elitePistolUnlockLevel)
            : 3;
        return this._getActiveTalentLevel(120) >= unlockLevel;
    },
    isElitePistolItem: function (itemId) {
        return this.isElitePistolUnlocked() && parseInt(itemId) === this.ELITE_PISTOL_ITEM_ID;
    },
    migrateLegacyElitePistol: function () {
        return false;
    },
    getElitePistolDisplayInfo: function (itemId, fallbackInfo) {
        if (!this.isElitePistolItem(itemId)) {
            return fallbackInfo;
        }

        var title = fallbackInfo && fallbackInfo.title ? fallbackInfo.title : "";
        var isLikelyEnglish = /[A-Za-z]/.test(title) && !/[\u4e00-\u9fa5]/.test(title);
        if (isLikelyEnglish) {
            return {
                title: "Sharpshooter's Beloved Pistol",
                des: "A tuned sidearm from your old range days. It never breaks and stays deadly steady (20% faster fire rate, +15% precision, +12% headshot chance)."
            };
        }

        return {
            title: "神射手珍爱的手枪",
            des: "这是你在靶场时代就用惯的配枪，准星和扳机都校到了你的节奏上。它永不损坏，开火更快，也更容易把子弹送进要害。（射击间隔-20%，额外精准+15%，额外爆头率+12%）"
        };
    },
    getElitePistolAtkCdMultiplier: function () {
        if (!this.isElitePistolUnlocked()) {
            return 1;
        }
        return this.ELITE_PISTOL_ATK_CD_MULTIPLIER;
    },
    applyElitePistolWeaponEffect: function (itemId, weaponEffect) {
        if (!weaponEffect || !this.isElitePistolItem(itemId)) {
            return weaponEffect;
        }
        var effect = utils.clone(weaponEffect);
        effect.atkCD = parseFloat((effect.atkCD * this.getElitePistolAtkCdMultiplier()).toFixed(2));
        effect.brokenProbability = 0;
        return effect;
    },
    getElitePistolPreciseBonus: function () {
        if (!this.isElitePistolUnlocked()) {
            return 0;
        }
        return this.ELITE_PISTOL_PRECISE_BONUS;
    },
    getElitePistolHeadshotBonus: function () {
        if (!this.isElitePistolUnlocked()) {
            return 0;
        }
        return this.ELITE_PISTOL_HEADSHOT_BONUS;
    },
    isSocialEffectUnlocked: function () {
        return this.hasChosenTalent(104);
    },
    getSocialExtraGiftChance: function () {
        var level104 = this._getActiveTalentLevel(104);
        return this._getTalentValueByLevel(104, "socialExtraGiftChanceValues", level104, 0);
    },
    getTalentPurchaseIdList: function () {
        var talentIds = this._getSortedTalentIds();
        if (typeof ConfigValidator !== "undefined" && ConfigValidator && typeof ConfigValidator.warnIfInvalid === "function") {
            talentIds.forEach(function (talentId) {
                ConfigValidator.warnIfInvalid("talent", talentId, "TalentService.getTalentPurchaseIdList");
            });
        }
        return [0].concat(talentIds);
    },
    getMaxChosenTalentCount: function () {
        return this.MAX_CHOSEN_TALENT_COUNT;
    },
    getNegotiationDiscount: function () {
        var level123 = this._getActiveTalentLevel(123);
        return this._getTalentValueByLevel(123, "negotiationDiscountValues", level123, 0);
    },
    getBattleWinRecoverHp: function () {
        var level124 = this._getActiveTalentLevel(124);
        return this._getTalentValueByLevel(124, "battleWinRecoverHpValues", level124, 0);
    },
    getBattleDefenseBonus: function () {
        var level102 = this._getActiveTalentLevel(102);
        return this._getTalentValueByLevel(102, "defenseBonusValues", level102, 0);
    },
    canZeroBattleDamage: function () {
        var config = this._getTalentConfig(102);
        var unlockLevel = config && isFinite(config.zeroDamageUnlockLevel)
            ? parseInt(config.zeroDamageUnlockLevel)
            : 2;
        return this._getActiveTalentLevel(102) >= unlockLevel;
    },
    getWeaponBrokenProbability: function (brokenProbability) {
        var level101 = this._getActiveTalentLevel(101);
        var multiplier = this._getTalentValueByLevel(101, "weaponBrokenMultiplierValues", level101, 1);
        return brokenProbability * multiplier;
    },
    _isTalentUnlocked: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (purchaseId === 0) {
            return true;
        }
        if (typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.isUnlocked === "function") {
            return !!PurchaseService.isUnlocked(purchaseId);
        }
        return true;
    },
    isTalentPurchaseId: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        return !!this._getTalentConfig(purchaseId);
    },
    _normalizeChosenTalentPurchaseIds: function (purchaseIdList) {
        if (!Array.isArray(purchaseIdList)) {
            purchaseIdList = [purchaseIdList];
        }

        var validMap = {};
        this.getTalentPurchaseIdList().forEach(function (id) {
            validMap[id] = true;
        });

        var list = [];
        purchaseIdList.forEach(function (id) {
            var purchaseId = parseInt(id);
            if (validMap[purchaseId]
                && this._isTalentUnlocked(purchaseId)
                && list.indexOf(purchaseId) === -1) {
                list.push(purchaseId);
            }
        }, this);

        if (list.indexOf(0) !== -1 && list.length > 1) {
            list = list.filter(function (id) {
                return id !== 0;
            });
        }

        if (list.length > this.MAX_CHOSEN_TALENT_COUNT) {
            list = list.slice(list.length - this.MAX_CHOSEN_TALENT_COUNT);
        }

        if (list.length === 0) {
            list = [0];
        }

        return list;
    },
    chooseTalents: function (purchaseIdList) {
        var chosenTalents = this._normalizeChosenTalentPurchaseIds(purchaseIdList);
        this._chosenTalentIds = chosenTalents.slice();
        cc.sys.localStorage.setItem("chosenTalents", JSON.stringify(chosenTalents));
        cc.sys.localStorage.setItem("chosenTalent", chosenTalents[0]);
    },
    chooseTalent: function (purchaseId) {
        this.chooseTalents([purchaseId]);
    },
    getChosenTalentPurchaseIds: function () {
        if (this._chosenTalentIds && this._chosenTalentIds.length > 0) {
            return this._chosenTalentIds.slice();
        }

        var purchaseIdList = [];
        var chosenTalents = cc.sys.localStorage.getItem("chosenTalents");

        if (chosenTalents !== undefined && chosenTalents !== null && chosenTalents !== "") {
            try {
                var parsed = JSON.parse(chosenTalents);
                if (Array.isArray(parsed)) {
                    purchaseIdList = parsed;
                } else {
                    purchaseIdList = [parsed];
                }
            } catch (e) {
                purchaseIdList = chosenTalents.split(",");
            }
        }

        if (purchaseIdList.length === 0) {
            var purchaseId = cc.sys.localStorage.getItem("chosenTalent");
            if (purchaseId !== undefined && purchaseId !== null && purchaseId !== "") {
                purchaseIdList = [purchaseId];
            }
        }

        this._chosenTalentIds = this._normalizeChosenTalentPurchaseIds(purchaseIdList);
        cc.sys.localStorage.setItem("chosenTalents", JSON.stringify(this._chosenTalentIds));
        cc.sys.localStorage.setItem("chosenTalent", this._chosenTalentIds[0]);
        return this._chosenTalentIds.slice();
    },
    getChosenTalentPurchaseId: function () {
        return this.getChosenTalentPurchaseIds()[0];
    },
    hasChosenTalent: function (purchaseId) {
        return this.getChosenTalentPurchaseIds().indexOf(parseInt(purchaseId)) !== -1;
    },
    applyActiveTalentStartGifts: function (player) {
        if (!player || !player.storage || !player.bag) {
            return false;
        }
        if (player.setting && player.setting.activeTalentStartGiftsApplied) {
            return false;
        }
        if (typeof Medal === "undefined" || !Medal || !Medal._exchangeMap) {
            return false;
        }

        var changed = false;
        for (var exchangeId in Medal._exchangeMap) {
            var config = ExchangeAchievementConfig[exchangeId];
            if (!config || config.type !== "talent" || !config.effect || !Array.isArray(config.effect.items)) {
                continue;
            }
            var talentPurchaseId = parseInt(config.targetId);
            if (!this.hasChosenTalent(talentPurchaseId)) {
                continue;
            }

            config.effect.items.forEach(function (item) {
                if (!item || item.itemId === undefined || item.num === undefined) {
                    return;
                }
                var itemId = parseInt(item.itemId);
                var num = parseInt(item.num);
                if (isNaN(itemId) || isNaN(num) || num <= 0) {
                    return;
                }
                var hasInStorage = player.storage.getNumByItemId(itemId);
                var hasInBag = player.bag.getNumByItemId(itemId);
                if (hasInStorage + hasInBag === 0) {
                    player.storage.increaseItem(itemId, num);
                    changed = true;
                }
            });
        }

        player.setting = player.setting || {};
        player.setting.activeTalentStartGiftsApplied = true;
        return changed;
    },
    bindIAPCompatApi: function (target) {
        var methodNames = [
            "reconcilePlayerHpByTalentSelection",
            "init",
            "getPreciseEffect",
            "getHeadshotEffect",
            "getGunDamageEffect",
            "rollScavengerDoubleDrop",
            "getDropEffect",
            "applyHomeProduceEffect",
            "getBagWeightBonus",
            "getMeleeDamageEffect",
            "getInfectIncreaseEffect",
            "isElitePistolUnlocked",
            "isElitePistolItem",
            "migrateLegacyElitePistol",
            "getElitePistolDisplayInfo",
            "getElitePistolAtkCdMultiplier",
            "applyElitePistolWeaponEffect",
            "getElitePistolPreciseBonus",
            "getElitePistolHeadshotBonus",
            "isSocialEffectUnlocked",
            "getSocialExtraGiftChance",
            "getTalentConfig",
            "getTalentPurchaseIdList",
            "getTalentMaxLevel",
            "getTalentTierEffectTextList",
            "getMaxChosenTalentCount",
            "getNegotiationDiscount",
            "getBattleWinRecoverHp",
            "getBattleDefenseBonus",
            "canZeroBattleDamage",
            "getWeaponBrokenProbability",
            "isTalentPurchaseId",
            "chooseTalents",
            "chooseTalent",
            "getChosenTalentPurchaseIds",
            "getChosenTalentPurchaseId",
            "hasChosenTalent",
            "applyActiveTalentStartGifts"
        ];
        methodNames.forEach(function (methodName) {
            target[methodName] = function () {
                return TalentService[methodName].apply(TalentService, arguments);
            };
        });
    }
};
