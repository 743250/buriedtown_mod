"use strict";
const {
    assert,
    loadIntoSandbox,
    readRepoFile
} = require("../../lib/core");
const {
    createVmSandbox,
    createCountStorage,
    createPurchaseRewardPlayer
} = require("../../lib/fixtures/runtime-boundaries");


function stripComments(source) {
    return (source || "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function bootstrapRuntimeSandbox(sandbox, runtimeOptions) {
    runtimeOptions = runtimeOptions || {};
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    sandbox.GameRuntime.bootstrap({
        player: runtimeOptions.player || null,
        timer: runtimeOptions.timer || {
            pause: function () {},
            resume: function () {},
            formatTime: function () {
                return { d: 0 };
            }
        },
        emitter: runtimeOptions.emitter || sandbox.utils.emitter,
        record: runtimeOptions.record || sandbox.Record
    });
}

const SYNTHETIC_PURCHASE_IDS = {
    DIRECT_UNLOCK: 150,
    ITEM_REWARD: 151,
    ITEM_TOOL: 152,
    BUILD_REWARD: 153,
    PAID_ROLE_ALPHA: 158,
    PAID_ROLE_BETA: 159,
    TALENT_ALPHA: 160,
    TALENT_BETA: 161,
    TALENT_GAMMA: 162,
    CONSUMABLE_LOW: 230,
    CONSUMABLE_HIGH: 231,
    DISCOUNT_PACK: 260
};

const SYNTHETIC_ITEM_IDS = {
    BAG: 930001,
    BOOTS: 930002
};

const SYNTHETIC_BUILD_ID = 77;

const SYNTHETIC_EXCHANGE_IDS = {
    ROLE_ALPHA: 4001,
    ROLE_BETA: 4002,
    ITEM_REWARD: 5001,
    BUILD_REWARD: 5003,
    TALENT_ALPHA_LV1: 6001,
    TALENT_ALPHA_LV2: 6101,
    TALENT_ALPHA_LV3: 6201
};

function createSafetyHelper() {
    return {
        isEmpty: function (value) {
            return value === undefined || value === null || value === "";
        },
        safeJSONParse: function (value) {
            return JSON.parse(value);
        }
    };
}

function createSyntheticPurchaseList() {
    return {
        150: {
            priceList: [
                {
                    productId: "synthetic_direct_unlock",
                    price: 12,
                    currencyCode: "USD",
                    productPriceStr: "$9.99"
                }
            ],
            multiPrice: false
        },
        151: {
            priceList: [
                {
                    productId: "synthetic_item_reward",
                    price: 6,
                    currencyCode: "USD",
                    productPriceStr: "$4.99"
                }
            ],
            unlockReward: {
                type: "item",
                itemId: SYNTHETIC_ITEM_IDS.BAG,
                num: 1
            },
            multiPrice: false
        },
        152: {
            priceList: [
                {
                    productId: "synthetic_item_tool",
                    price: 3,
                    currencyCode: "USD",
                    productPriceStr: "$2.99"
                }
            ],
            unlockReward: {
                type: "item",
                itemId: SYNTHETIC_ITEM_IDS.BOOTS,
                num: 1
            },
            multiPrice: false
        },
        153: {
            priceList: [
                {
                    productId: "synthetic_build_reward",
                    price: 5,
                    currencyCode: "USD",
                    productPriceStr: "$3.99"
                }
            ],
            unlockReward: {
                type: "build",
                bid: SYNTHETIC_BUILD_ID,
                level: 0
            },
            multiPrice: false
        },
        158: {
            priceList: [
                {
                    productId: "synthetic_role_alpha",
                    price: 12,
                    currencyCode: "USD",
                    productPriceStr: "$9.99"
                }
            ],
            multiPrice: false
        },
        159: {
            priceList: [
                {
                    productId: "synthetic_role_beta",
                    price: 12,
                    currencyCode: "USD",
                    productPriceStr: "$9.99"
                }
            ],
            multiPrice: false
        },
        160: {
            priceList: [
                {
                    productId: "synthetic_talent_alpha",
                    price: 12,
                    currencyCode: "USD",
                    productPriceStr: "$9.99"
                }
            ],
            multiPrice: false
        },
        230: {
            priceList: [
                {
                    productId: "synthetic_consumable_low",
                    price: 6,
                    currencyCode: "USD",
                    productPriceStr: "$5.99"
                }
            ],
            multiPrice: false
        },
        231: {
            priceList: [
                {
                    productId: "synthetic_consumable_high",
                    price: 18,
                    currencyCode: "USD",
                    productPriceStr: "$17.99"
                }
            ],
            multiPrice: false
        },
        260: {
            priceList: [
                {
                    productId: "synthetic_discount_pack",
                    price: 18,
                    currencyCode: "USD",
                    productPriceStr: "$17.99"
                }
            ],
            discountPercent: 50,
            multiPrice: false
        }
    };
}

function createSyntheticRoleConfigTable() {
    return {
        6: {
            roleType: 6,
            purchaseId: null,
            exchangeId: null,
            selectionOrder: 0
        },
        7: {
            roleType: 7,
            purchaseId: SYNTHETIC_PURCHASE_IDS.PAID_ROLE_ALPHA,
            exchangeId: SYNTHETIC_EXCHANGE_IDS.ROLE_ALPHA,
            selectionOrder: 1
        },
        8: {
            roleType: 8,
            purchaseId: SYNTHETIC_PURCHASE_IDS.PAID_ROLE_BETA,
            exchangeId: SYNTHETIC_EXCHANGE_IDS.ROLE_BETA,
            selectionOrder: 2
        }
    };
}

function createSyntheticTalentConfigTable() {
    return {
        160: {
            talentId: 160,
            purchaseId: SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
            displayOrder: 1,
            maxLevel: 3
        },
        161: {
            talentId: 161,
            purchaseId: SYNTHETIC_PURCHASE_IDS.TALENT_BETA,
            displayOrder: 2,
            maxLevel: 3
        },
        162: {
            talentId: 162,
            purchaseId: SYNTHETIC_PURCHASE_IDS.TALENT_GAMMA,
            displayOrder: 3,
            maxLevel: 3
        }
    };
}

function createSyntheticExchangeAchievementConfig() {
    return {
        4001: {
            type: "character",
            targetId: 7,
            cost: 50
        },
        4002: {
            type: "character",
            targetId: 8,
            cost: 50
        },
        5001: {
            type: "item",
            targetId: SYNTHETIC_PURCHASE_IDS.ITEM_REWARD,
            cost: 30
        },
        5003: {
            type: "item",
            targetId: SYNTHETIC_PURCHASE_IDS.BUILD_REWARD,
            cost: 25
        },
        6001: {
            type: "talent",
            targetId: SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
            level: 1,
            cost: 30
        },
        6101: {
            type: "talent",
            targetId: SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
            level: 2,
            cost: 50
        },
        6201: {
            type: "talent",
            targetId: SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
            level: 3,
            cost: 70
        }
    };
}


function capturePurchaseResult(sandbox, purchaseId) {
    let captured = null;
    sandbox.PurchaseService.purchase(purchaseId, null, function (result) {
        captured = result;
    });
    return captured;
}


function createPersistenceComponent(name, calls) {
    return {
        save: function () {
            calls.push(name + ".save");
            return { id: name };
        },
        restore: function (saveObj) {
            calls.push(name + ".restore");
            this.lastRestore = saveObj;
        }
    };
}

function createPersistencePlayer(calls) {
    const player = {
        hp: 0,
        hpMaxOrigin: 0,
        hpMax: 0,
        spirit: 0,
        starve: 0,
        vigour: 0,
        injury: 0,
        infect: 0,
        temperature: 0,
        roleType: 6,
        deathCausedInfect: false,
        setting: {},
        isBombActive: false,
        bag: createPersistenceComponent("bag", calls),
        storage: Object.assign(createPersistenceComponent("storage", calls), {
            increaseItem: function () {}
        }),
        dog: createPersistenceComponent("dog", calls),
        room: createPersistenceComponent("room", calls),
        equip: createPersistenceComponent("equip", calls),
        map: createPersistenceComponent("map", calls),
        npcManager: createPersistenceComponent("npcManager", calls),
        weather: createPersistenceComponent("weather", calls),
        buffManager: createPersistenceComponent("buffManager", calls),
        ziplineNetwork: {
            save: function () {
                calls.push("zipline.save");
                return { links: [] };
            },
            restore: function (saveObj, mapObj) {
                calls.push("zipline.restore");
                this.lastRestore = saveObj;
                this.lastMap = mapObj;
            }
        },
        navigationState: {
            save: function () {
                calls.push("navigation.save");
                return {
                    locationType: "home",
                    mapEntityId: 1,
                    mapEntityKey: "site:1",
                    activeSiteId: 0
                };
            },
            restore: function (saveObj) {
                calls.push("navigation.restore");
                this.lastRestore = saveObj;
            },
            syncMapEntityIdFromMap: function (mapObj) {
                calls.push("navigation.sync");
                this.lastMap = mapObj;
            }
        }
    };
    return player;
}


module.exports = {
    stripComments: stripComments,
    bootstrapRuntimeSandbox: bootstrapRuntimeSandbox,
    SYNTHETIC_PURCHASE_IDS: SYNTHETIC_PURCHASE_IDS,
    SYNTHETIC_ITEM_IDS: SYNTHETIC_ITEM_IDS,
    SYNTHETIC_BUILD_ID: SYNTHETIC_BUILD_ID,
    SYNTHETIC_EXCHANGE_IDS: SYNTHETIC_EXCHANGE_IDS,
    createSafetyHelper: createSafetyHelper,
    createSyntheticPurchaseList: createSyntheticPurchaseList,
    createSyntheticRoleConfigTable: createSyntheticRoleConfigTable,
    createSyntheticTalentConfigTable: createSyntheticTalentConfigTable,
    createSyntheticExchangeAchievementConfig: createSyntheticExchangeAchievementConfig,
    capturePurchaseResult: capturePurchaseResult,
    createPersistenceComponent: createPersistenceComponent,
    createPersistencePlayer: createPersistencePlayer
};
