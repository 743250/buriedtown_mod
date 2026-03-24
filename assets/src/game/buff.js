/**
 * Created by lancelot on 15/12/15.
 */

var getBuffRuntimePlayer = function () {
    if (typeof GameRuntime !== "undefined"
        && GameRuntime
        && typeof GameRuntime.getPlayer === "function") {
        return GameRuntime.getPlayer();
    }
    return typeof player !== "undefined" ? player : null;
};

var cloneBuffMap = function (source) {
    var target = {};
    if (!source || typeof source !== "object") {
        return target;
    }
    Object.keys(source).forEach(function (key) {
        target[key] = source[key];
    });
    return target;
};

var cloneNestedBuffMap = function (source) {
    var target = {};
    if (!source || typeof source !== "object") {
        return target;
    }
    Object.keys(source).forEach(function (key) {
        target[key] = cloneBuffMap(source[key]);
    });
    return target;
};

var cloneBuffOptions = function (source) {
    var target = {};
    if (!source || typeof source !== "object") {
        return target;
    }
    Object.keys(source).forEach(function (key) {
        var value = source[key];
        target[key] = Array.isArray(value) ? value.slice() : value;
    });
    return target;
};

var BuffSourceType = {
    ITEM: "item",
    RUNTIME: "runtime"
};

var BuffSlotType = {
    CONSUMABLE: "consumable",
    ENVIRONMENT: "environment",
    TREATMENT: "treatment",
    STATUS: "status"
};

var BuffPeriodType = {
    HOURLY: "hourly"
};

var RuntimeBuffType = {
    LOW_TEMPERATURE_INFECT: "low_temperature_infect",
    CURE_TREATMENT: "cure_treatment",
    BIND_TREATMENT: "bind_treatment",
    DRINK_SPIRIT_PROTECT: "drink_spirit_protect"
};

var getRuntimeBuffMeta = function (buffKey) {
    switch (buffKey) {
        case RuntimeBuffType.CURE_TREATMENT:
            return {
                key: buffKey,
                slot: BuffSlotType.TREATMENT,
                attrList: ["infect"],
                effectTargetBlockMap: {
                    infect: {
                        infect: true,
                        spirit: true
                    }
                },
                durationSeconds: 24 * 60 * 60,
                title: stringUtil.getString("status_treatment_title") || "服药保护",
                description: stringUtil.getString("status_treatment_effect") || "",
                isDebuff: false,
                saveEnabled: true
            };
        case RuntimeBuffType.BIND_TREATMENT:
            return {
                key: buffKey,
                slot: BuffSlotType.TREATMENT,
                attrList: ["injury"],
                effectTargetBlockMap: {
                    injury: {
                        infect: true,
                        spirit: true
                    }
                },
                durationSeconds: 24 * 60 * 60,
                title: stringUtil.getString("status_bandage_title") || "包扎保护",
                description: stringUtil.getString("status_bandage_effect") || "",
                isDebuff: false,
                saveEnabled: true
            };
        case RuntimeBuffType.DRINK_SPIRIT_PROTECT:
            return {
                key: buffKey,
                slot: BuffSlotType.STATUS,
                attrList: ["spirit"],
                adverseAttrChangeRateMap: {
                    spirit: 0.2
                },
                durationSeconds: 24 * 60 * 60,
                title: stringUtil.getString("status_drink_title") || "微醺",
                description: stringUtil.getString("status_drink_effect") || "",
                isDebuff: false,
                saveEnabled: true
            };
        default:
            return null;
    }
};

var BuffEffect = {
    1: "hp",
    2: "infect",
    3: "def",
    4: "starve",
    5: "injury",
    6: "atk"
};

var BuffEffectType = {
    //增加上限
    ENHANCE_MAX: 1,
    //抵御负面影响
    DEFENCE_ADVERSE_EFFECT: 2
};
var BuffItemEffectType = {
    ITEM_1107012: 1107012,
    ITEM_1107022: 1107022,
    ITEM_1107032: 1107032,
    ITEM_1107042: 1107042
};

var getItemBuffMeta = function (itemId, buffConfig) {
    itemId = Number(itemId);
    buffConfig = buffConfig || {};
    switch (itemId) {
        case BuffItemEffectType.ITEM_1107012:
            return {
                attrList: ["hp"],
                statBonusMap: {
                    hpMax: Number(buffConfig.value) || 0
                },
                value: Number(buffConfig.value) || 0
            };
        case BuffItemEffectType.ITEM_1107022:
            return {
                attrList: ["infect"],
                blockChangeAttrMap: {infect: true},
                suppressAttrEffectMap: {infect: true}
            };
        case BuffItemEffectType.ITEM_1107032:
            return {
                attrList: ["vigour"],
                blockChangeAttrMap: {vigour: true},
                suppressAttrEffectMap: {vigour: true}
            };
        case BuffItemEffectType.ITEM_1107042:
            return {
                attrList: ["starve"],
                blockChangeAttrMap: {starve: true},
                suppressAttrEffectMap: {starve: true}
            };
        default:
            return {
                attrList: []
            };
    }
};

var Buff = cc.Class.extend({
    ctor: function (opt) {
        opt = opt || {};
        this.key = opt.key || null;
        this.itemId = opt.itemId !== undefined && opt.itemId !== null ? Number(opt.itemId) : null;
        this.sourceType = opt.sourceType || BuffSourceType.ITEM;
        this.slot = opt.slot || null;
        this.attrList = Array.isArray(opt.attrList) ? opt.attrList.slice() : [];
        this.blockChangeAttrMap = cloneBuffMap(opt.blockChangeAttrMap);
        this.suppressAttrEffectMap = cloneBuffMap(opt.suppressAttrEffectMap);
        this.effectTargetBlockMap = cloneNestedBuffMap(opt.effectTargetBlockMap);
        this.adverseAttrChangeRateMap = cloneBuffMap(opt.adverseAttrChangeRateMap);
        this.statBonusMap = cloneBuffMap(opt.statBonusMap);
        this.periodicChangeMap = cloneBuffMap(opt.periodicChangeMap);
        this.periodType = opt.periodType || null;
        this.lastTime = opt.lastTime === undefined || opt.lastTime === null ? null : Number(opt.lastTime);
        this.durationSeconds = opt.durationSeconds === undefined || opt.durationSeconds === null
            ? null
            : Number(opt.durationSeconds);
        this.saveEnabled = opt.saveEnabled !== false;
        this.isDebuff = !!opt.isDebuff;
        this.title = opt.title || "";
        this.description = opt.description || "";
        this.value = opt.value !== undefined ? (Number(opt.value) || 0) : 0;
        this.manager = null;
    },
    bindManager: function (manager) {
        this.manager = manager || null;
        return this;
    },
    getOwner: function () {
        if (this.manager && typeof this.manager.getOwner === "function") {
            return this.manager.getOwner();
        }
        return getBuffRuntimePlayer();
    },
    hasDuration: function () {
        return this.lastTime !== null && this.lastTime !== undefined && !isNaN(this.lastTime);
    },
    onStart: function () {
    },
    onEnd: function () {
    },
    process: function (dt) {
        if (!this.hasDuration()) {
            return true;
        }
        this.lastTime -= dt;
        return this.lastTime > 0;
    },
    save: function () {
        return {
            key: this.key,
            itemId: this.itemId,
            sourceType: this.sourceType,
            slot: this.slot,
            lastTime: this.hasDuration() ? this.lastTime : null
        };
    },
    affectsAttr: function (attr) {
        return this.attrList.indexOf(attr) !== -1;
    },
    blocksAttrChange: function (attr) {
        return !!this.blockChangeAttrMap[attr];
    },
    suppressesAttrEffect: function (attr) {
        return !!this.suppressAttrEffectMap[attr];
    },
    blocksAttrEffectTarget: function (sourceAttr, targetAttr) {
        return !!(this.effectTargetBlockMap[sourceAttr] && this.effectTargetBlockMap[sourceAttr][targetAttr]);
    },
    getAdverseAttrChangeRate: function (attr) {
        if (!this.adverseAttrChangeRateMap.hasOwnProperty(attr)) {
            return 1;
        }
        var rate = Number(this.adverseAttrChangeRateMap[attr]);
        if (!isFinite(rate) || rate < 0) {
            return 1;
        }
        return rate;
    },
    getStatBonus: function (statKey) {
        return Number(this.statBonusMap[statKey]) || 0;
    },
    getPeriodicAttrChange: function (attr, periodType) {
        if (periodType && this.periodType && this.periodType !== periodType) {
            return 0;
        }
        return Number(this.periodicChangeMap[attr]) || 0;
    },
    getDisplayTitle: function () {
        if (this.title) {
            return this.title;
        }
        if (this.itemId !== null) {
            var itemStr = stringUtil.getString(this.itemId);
            if (itemStr && typeof itemStr === "object" && itemStr.title) {
                return itemStr.title;
            }
            return String(this.itemId);
        }
        return "";
    },
    getDisplayDescription: function () {
        if (this.description) {
            return this.description;
        }
        if (this.itemId !== null) {
            return stringUtil.getString("b_" + this.itemId) || "";
        }
        return "";
    },
    getDisplayDurationText: function () {
        if (!this.hasDuration()) {
            return "";
        }
        return stringUtil.getString(1297) + utils.getBuffTimeStr(this.lastTime);
    },
    getDisplayInfo: function () {
        return {
            key: this.key,
            itemId: this.itemId,
            title: this.getDisplayTitle(),
            description: this.getDisplayDescription(),
            durationText: this.getDisplayDurationText(),
            isDebuff: this.isDebuff
        };
    }
});

var MaxHpBuff = Buff.extend({
    onStart: function () {
        var owner = this.getOwner();
        if (owner && typeof owner.updateHpMax === "function") {
            owner.updateHpMax();
        }
    },
    onEnd: function () {
        var owner = this.getOwner();
        if (owner && typeof owner.updateHpMax === "function") {
            owner.updateHpMax();
        }
    }
});

var BuffManager = cc.Class.extend({
    buff: null,
    SAVE_VERSION: 2,
    ctor: function (owner) {
        this.owner = owner || null;
        this.buffList = [];
        this.buff = null;
    },
    bindOwner: function (owner) {
        this.owner = owner || null;
        return this;
    },
    getOwner: function () {
        return this.owner || getBuffRuntimePlayer();
    },
    _syncLegacyBuffRef: function () {
        this.buff = this.getBuff();
    },
    _findBuffIndexByKey: function (buffKey) {
        for (var i = 0; i < this.buffList.length; i++) {
            if (this.buffList[i] && this.buffList[i].key === buffKey) {
                return i;
            }
        }
        return -1;
    },
    getBuffByKey: function (buffKey) {
        var index = this._findBuffIndexByKey(buffKey);
        return index === -1 ? null : this.buffList[index];
    },
    hasBuffKey: function (buffKey) {
        return !!this.getBuffByKey(buffKey);
    },
    _getConsumableBuff: function () {
        for (var i = 0; i < this.buffList.length; i++) {
            if (this.buffList[i] && this.buffList[i].slot === BuffSlotType.CONSUMABLE) {
                return this.buffList[i];
            }
        }
        return null;
    },
    _removeBuffAtIndex: function (index) {
        if (index < 0 || index >= this.buffList.length) {
            return null;
        }
        var buff = this.buffList.splice(index, 1)[0];
        this._syncLegacyBuffRef();
        if (buff) {
            buff.onEnd();
        }
        return buff;
    },
    _addBuffInstance: function (buff, shouldStart) {
        if (!buff || !buff.key) {
            return null;
        }
        buff.bindManager(this);
        var existingIndex = this._findBuffIndexByKey(buff.key);
        if (existingIndex !== -1) {
            this._removeBuffAtIndex(existingIndex);
        }
        this.buffList.push(buff);
        this._syncLegacyBuffRef();
        if (shouldStart !== false) {
            buff.onStart();
        }
        return buff;
    },
    _normalizeSaveList: function (saveObj) {
        if (!saveObj) {
            return [];
        }
        if (Array.isArray(saveObj)) {
            return saveObj.slice();
        }
        if (Array.isArray(saveObj.buffs)) {
            return saveObj.buffs.slice();
        }
        if (saveObj.itemId) {
            return [saveObj];
        }
        return [];
    },
    createItemBuff: function (itemId, lastTime) {
        itemId = Number(itemId);
        var itemEntry = itemConfig[itemId];
        var buffConfig = itemEntry && itemEntry.effect_buff ? utils.clone(itemEntry.effect_buff) : null;
        if (!buffConfig) {
            return null;
        }

        var itemMeta = getItemBuffMeta(itemId, buffConfig);
        var buffOpt = {
            key: "item_" + itemId,
            itemId: itemId,
            sourceType: BuffSourceType.ITEM,
            slot: BuffSlotType.CONSUMABLE,
            attrList: itemMeta.attrList,
            blockChangeAttrMap: itemMeta.blockChangeAttrMap,
            suppressAttrEffectMap: itemMeta.suppressAttrEffectMap,
            adverseAttrChangeRateMap: itemMeta.adverseAttrChangeRateMap,
            statBonusMap: itemMeta.statBonusMap,
            lastTime: lastTime === undefined || lastTime === null
                ? Number(buffConfig.lastTime) * 60 * 60
                : Number(lastTime),
            value: itemMeta.value,
            saveEnabled: true
        };

        if (itemId === BuffItemEffectType.ITEM_1107012) {
            return new MaxHpBuff(buffOpt);
        }
        return new Buff(buffOpt);
    },
    createRuntimeBuff: function (opt) {
        var buffOpt = cloneBuffOptions(opt);
        buffOpt.sourceType = BuffSourceType.RUNTIME;
        if (buffOpt.saveEnabled === undefined) {
            buffOpt.saveEnabled = false;
        }
        return new Buff(buffOpt);
    },
    createPersistentRuntimeBuff: function (buffKey, lastTime) {
        var runtimeMeta = getRuntimeBuffMeta(buffKey);
        if (!runtimeMeta) {
            return null;
        }
        var buffOpt = cloneBuffOptions(runtimeMeta);
        buffOpt.key = buffKey;
        buffOpt.lastTime = lastTime === undefined || lastTime === null
            ? runtimeMeta.durationSeconds
            : Number(lastTime);
        return this.createRuntimeBuff(buffOpt);
    },
    createBuffFromSave: function (saveObj) {
        if (!saveObj) {
            return null;
        }
        if (saveObj.itemId) {
            return this.createItemBuff(saveObj.itemId, saveObj.lastTime);
        }
        if (saveObj.key) {
            return this.createPersistentRuntimeBuff(saveObj.key, saveObj.lastTime);
        }
        return null;
    },
    save: function () {
        var savedBuffs = [];
        this.buffList.forEach(function (buff) {
            if (buff && buff.saveEnabled) {
                savedBuffs.push(buff.save());
            }
        });
        if (savedBuffs.length === 0) {
            return null;
        }
        return {
            version: this.SAVE_VERSION,
            buffs: savedBuffs
        };
    },
    restore: function (saveObj) {
        this.abortAllBuffs();
        var self = this;
        this._normalizeSaveList(saveObj).forEach(function (buffSave) {
            var buff = self.createBuffFromSave(buffSave);
            if (buff) {
                self._addBuffInstance(buff, false);
            }
        });
        this._syncLegacyBuffRef();
    },
    applyBuff: function (itemId) {
        var buff = this.createItemBuff(itemId);
        if (!buff) {
            return null;
        }
        this.clearSlot(BuffSlotType.CONSUMABLE);
        return this._addBuffInstance(buff, true);
    },
    upsertRuntimeBuff: function (buffKey, buffOpt) {
        if (!buffKey) {
            return null;
        }
        if (!buffOpt) {
            return this.removeBuffByKey(buffKey);
        }
        var normalizedOpt = {};
        var runtimeMeta = getRuntimeBuffMeta(buffKey);
        if (runtimeMeta) {
            normalizedOpt = cloneBuffOptions(runtimeMeta);
        }
        var overrideOpt = cloneBuffOptions(buffOpt);
        Object.keys(overrideOpt).forEach(function (key) {
            normalizedOpt[key] = overrideOpt[key];
        });
        normalizedOpt.key = buffKey;
        if (normalizedOpt.lastTime === undefined || normalizedOpt.lastTime === null) {
            if (normalizedOpt.durationSeconds !== undefined && normalizedOpt.durationSeconds !== null) {
                normalizedOpt.lastTime = Number(normalizedOpt.durationSeconds);
            }
        }
        if (!normalizedOpt.slot) {
            normalizedOpt.slot = BuffSlotType.ENVIRONMENT;
        }
        return this._addBuffInstance(this.createRuntimeBuff(normalizedOpt), true);
    },
    removeBuffByKey: function (buffKey) {
        var index = this._findBuffIndexByKey(buffKey);
        if (index === -1) {
            return null;
        }
        return this._removeBuffAtIndex(index);
    },
    clearSlot: function (slot) {
        for (var i = this.buffList.length - 1; i >= 0; i--) {
            if (this.buffList[i] && this.buffList[i].slot === slot) {
                this._removeBuffAtIndex(i);
            }
        }
        this._syncLegacyBuffRef();
    },
    abortBuff: function () {
        this.clearSlot(BuffSlotType.CONSUMABLE);
    },
    abortAllBuffs: function () {
        for (var i = this.buffList.length - 1; i >= 0; i--) {
            this._removeBuffAtIndex(i);
        }
        this._syncLegacyBuffRef();
    },
    process: function (dt) {
        var expiredBuffKeys = [];
        this.buffList.forEach(function (buff) {
            if (buff && !buff.process(dt)) {
                expiredBuffKeys.push(buff.key);
            }
        });
        var self = this;
        expiredBuffKeys.forEach(function (buffKey) {
            self.removeBuffByKey(buffKey);
        });
        this._syncLegacyBuffRef();
    },
    getBuffs: function () {
        return this.buffList.slice();
    },
    getBuff: function () {
        return this._getConsumableBuff();
    },
    getBuffByItemId: function (itemId) {
        itemId = Number(itemId);
        for (var i = 0; i < this.buffList.length; i++) {
            var buff = this.buffList[i];
            if (buff && Number(buff.itemId) === itemId) {
                return buff;
            }
        }
        return null;
    },
    isBuffEffect: function (itemId) {
        return !!this.getBuffByItemId(itemId);
    },
    getBuffValue: function (itemId) {
        var buff = itemId ? this.getBuffByItemId(itemId) : this.getBuff();
        return buff && buff.value ? buff.value : 0;
    },
    blocksAttrChange: function (attr) {
        for (var i = 0; i < this.buffList.length; i++) {
            if (this.buffList[i] && this.buffList[i].blocksAttrChange(attr)) {
                return true;
            }
        }
        return false;
    },
    blocksAttrEffect: function (attr) {
        for (var i = 0; i < this.buffList.length; i++) {
            if (this.buffList[i] && this.buffList[i].suppressesAttrEffect(attr)) {
                return true;
            }
        }
        return false;
    },
    blocksAttrEffectTarget: function (sourceAttr, targetAttr) {
        for (var i = 0; i < this.buffList.length; i++) {
            if (this.buffList[i] && this.buffList[i].blocksAttrEffectTarget(sourceAttr, targetAttr)) {
                return true;
            }
        }
        return false;
    },
    getStatBonus: function (statKey) {
        var total = 0;
        this.buffList.forEach(function (buff) {
            if (buff) {
                total += buff.getStatBonus(statKey);
            }
        });
        return total;
    },
    getAdverseAttrChangeRate: function (attr) {
        var rate = 1;
        this.buffList.forEach(function (buff) {
            if (buff) {
                rate *= buff.getAdverseAttrChangeRate(attr);
            }
        });
        if (!isFinite(rate) || rate < 0) {
            return 1;
        }
        return rate;
    },
    getPeriodicAttrChange: function (attr, periodType) {
        var total = 0;
        this.buffList.forEach(function (buff) {
            if (buff) {
                total += buff.getPeriodicAttrChange(attr, periodType);
            }
        });
        return total;
    },
    getDisplayBuffsByAttr: function (attr) {
        var displayBuffs = [];
        this.buffList.forEach(function (buff) {
            if (buff && buff.affectsAttr(attr)) {
                displayBuffs.push(buff.getDisplayInfo());
            }
        });
        return displayBuffs;
    }
});
