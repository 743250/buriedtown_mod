const vm = require("vm");

function createExtendableBaseClass() {
    function BaseClass() {
        if (this.ctor) {
            this.ctor.apply(this, arguments);
        }
    }

    BaseClass.extend = function (definition) {
        const Parent = this;
        function SubClass() {
            const previousSuper = this._super;
            this._super = function () {
                if (Parent.prototype && typeof Parent.prototype.ctor === "function") {
                    return Parent.prototype.ctor.apply(this, arguments);
                }
                if (typeof Parent === "function") {
                    return Parent.apply(this, arguments);
                }
            };
            if (this.ctor) {
                this.ctor.apply(this, arguments);
            }
            this._super = previousSuper;
        }
        SubClass.prototype = Object.create(Parent.prototype || {});
        Object.keys(definition || {}).forEach(function (key) {
            SubClass.prototype[key] = definition[key];
        });
        SubClass.prototype.constructor = SubClass;
        SubClass.extend = Parent.extend;
        return SubClass;
    };

    return BaseClass;
}

function createVmSandbox() {
    const scheduler = {
        scheduleUpdateForTarget: function () {},
        unscheduleUpdateForTarget: function () {}
    };
    const localStorageState = {};
    const slotMetaState = {};
    const sandbox = {
        console: console,
        require: require,
        module: { exports: {} },
        exports: {},
        globalThis: null,
        utils: {
            emitter: {
                emitted: [],
                emit: function (name, payload) {
                    this.emitted.push([name, payload]);
                }
            },
            clone: function (value) {
                return JSON.parse(JSON.stringify(value));
            }
        },
        Record: {
            saveAll: function () {},
            init: function () {},
            restore: function () { return null; },
            getCurrentRecordName: function () { return "slot1"; },
            getCurrentSlot: function () { return 1; },
            hasRecord: function () { return false; },
            getSlotMeta: function (slot) {
                slot = slot || this.getCurrentSlot();
                const meta = slotMetaState[slot] || {};
                return JSON.parse(JSON.stringify(meta));
            },
            getSelectedRoleType: function (slot) {
                slot = slot || this.getCurrentSlot();
                const meta = slotMetaState[slot] || {};
                return meta.selectedRoleType === undefined ? null : meta.selectedRoleType;
            },
            setSelectedRoleType: function (slot, roleType) {
                if (roleType === undefined) {
                    roleType = slot;
                    slot = null;
                }
                slot = slot || this.getCurrentSlot();
                slotMetaState[slot] = slotMetaState[slot] || {};
                slotMetaState[slot].selectedRoleType = Number(roleType);
                return slotMetaState[slot].selectedRoleType;
            },
            getChosenTalentIds: function (slot) {
                slot = slot || this.getCurrentSlot();
                const meta = slotMetaState[slot] || {};
                return Array.isArray(meta.chosenTalentIds) ? meta.chosenTalentIds.slice() : [];
            },
            setChosenTalentIds: function (slot, chosenTalentIds) {
                if (chosenTalentIds === undefined) {
                    chosenTalentIds = slot;
                    slot = null;
                }
                slot = slot || this.getCurrentSlot();
                slotMetaState[slot] = slotMetaState[slot] || {};
                slotMetaState[slot].chosenTalentIds = Array.isArray(chosenTalentIds)
                    ? chosenTalentIds.slice()
                    : [];
                return slotMetaState[slot].chosenTalentIds.slice();
            },
            clearCurrentSlotCompatibilityState: function () {
                delete slotMetaState[this.getCurrentSlot()];
            }
        },
        cc: {
            Class: createExtendableBaseClass(),
            director: {
                getScheduler: function () {
                    return scheduler;
                }
            },
            sys: {
                isNative: false,
                localStorage: {
                    getItem: function (key) {
                        return Object.prototype.hasOwnProperty.call(localStorageState, key)
                            ? localStorageState[key]
                            : null;
                    },
                    setItem: function (key, value) {
                        localStorageState[key] = String(value);
                    },
                    removeItem: function (key) {
                        delete localStorageState[key];
                    }
                }
            },
            assert: function (condition, message) {
                if (!condition) {
                    throw new Error(message || "assert failed");
                }
            },
            timer: null,
            color: { WHITE: "white", RED: "red" },
            d: function () {},
            e: function () {},
            i: function () {},
            pDistance: function (a, b) {
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                return Math.sqrt(dx * dx + dy * dy);
            }
        },
        stringUtil: {
            getString: function (id) {
                return { title: "item-" + id };
            }
        },
        Achievement: {
            checkMake: function () {},
            checkProduce: function () {},
            checkCost: function () {}
        },
        TalentService: {
            applyHomeProduceEffect: function (produce) { return produce; },
            applyActiveTalentStartGifts: function () { return false; },
            getInfectIncreaseEffect: function (value) { return value; },
            migrateLegacyElitePistol: function () { return false; },
            reconcilePlayerHpByTalentSelection: function () {},
            bindIAPCompatApi: function (target) {
                const self = this;
                Object.keys(self).forEach(function (methodName) {
                    if (methodName === "bindIAPCompatApi" || typeof self[methodName] !== "function") {
                        return;
                    }
                    target[methodName] = function () {
                        return self[methodName].apply(self, arguments);
                    };
                });
            }
        },
        ItemRuntimeService: {
            applyProduceWeatherBonuses: function (produce) { return produce; },
            rollCraftProduce: function (produce) { return produce; }
        }
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    return sandbox;
}

function createCountStorage(initialCounts) {
    const counts = Object.assign({}, initialCounts || {});
    return {
        counts: counts,
        validateItem: function (itemId, num) {
            return (this.counts[itemId] || 0) >= Number(num);
        },
        getNumByItemId: function (itemId) {
            return this.counts[itemId] || 0;
        },
        increaseItem: function (itemId, num) {
            this.counts[itemId] = (this.counts[itemId] || 0) + Number(num);
        },
        decreaseItem: function (itemId, num) {
            const nextValue = (this.counts[itemId] || 0) - Number(num);
            if (nextValue > 0) {
                this.counts[itemId] = nextValue;
            } else {
                delete this.counts[itemId];
            }
        }
    };
}

function createPurchaseRewardPlayer(initialState) {
    initialState = initialState || {};
    const playerObj = {
        storage: createCountStorage(initialState.storage),
        bag: createCountStorage(initialState.bag),
        room: {
            buildLevels: Object.assign({}, initialState.buildLevels || {}),
            createCalls: [],
            isBuildExist: function (bid, level) {
                return Object.prototype.hasOwnProperty.call(this.buildLevels, bid) && this.buildLevels[bid] >= level;
            },
            createBuild: function (bid, level) {
                this.buildLevels[bid] = level;
                this.createCalls.push([bid, level]);
            }
        }
    };
    playerObj.getItemNumInPlayer = function (itemId) {
        return this.storage.getNumByItemId(itemId) + this.bag.getNumByItemId(itemId);
    };
    return playerObj;
}

module.exports = {
    createExtendableBaseClass: createExtendableBaseClass,
    createVmSandbox: createVmSandbox,
    createCountStorage: createCountStorage,
    createPurchaseRewardPlayer: createPurchaseRewardPlayer
};
