const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox
} = require("../../lib/fixtures/runtime-boundaries");

function runRuntimeContextSmoke() {
    const sandbox = createVmSandbox();
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/TravelService.js");
    loadIntoSandbox(sandbox, "assets/src/game/BuildActionEffectService.js");

    const runtimePlayer = {
        roleType: 1,
        map: { pos: { x: 0, y: 0 } },
        ziplineNetwork: {},
        weather: { getValue: function () { return 0; } },
        storage: {
            counts: {},
            getNumByItemId: function (itemId) {
                return this.counts[itemId] || 0;
            }
        },
        room: {
            getBuildCurrentName: function () {
                return "Workbench";
            }
        },
        getCurrentMapEntityId: function () { return 100; },
        getCurrentMapEntityKey: function () { return "site:100"; },
        gainItems: function (items) {
            const storage = this.storage;
            items.forEach(function (item) {
                storage.counts[item.itemId] = (storage.counts[item.itemId] || 0) + item.num;
            });
        },
        log: {
            logs: [],
            addMsg: function () {
                this.logs.push(Array.prototype.slice.call(arguments));
            }
        }
    };

    sandbox.GameRuntime.bootstrap({
        player: runtimePlayer,
        timer: {
            pause: function () {},
            resume: function () {},
            now: function () { return 123; }
        },
        emitter: sandbox.utils.emitter,
        record: sandbox.Record
    });

    const travelPlan = sandbox.TravelService.buildRuntimePlan({ endPos: { x: 3, y: 4 } });
    assert(travelPlan && travelPlan.distance === 5, "TravelService.buildRuntimePlan failed");

    const action = {
        bid: 2,
        id: 2,
        step: 1,
        pastTime: 0,
        config: { produce: [{ itemId: 101, num: 2 }], placedTime: 5 },
        addTimer: function (time, totalTime, cb) {
            this.timerArgs = [time, totalTime];
            cb();
        },
        _finishActioning: function (opt) {
            this.finishOpt = opt || {};
        }
    };

    sandbox.BuildActionEffectService.startPlacedTimer(action, {
        itemInfo: action.config.produce[0],
        placedTime: 300
    });
    assert(action.step === 2, "BuildActionEffectService.startPlacedTimer failed");

    const produce = sandbox.BuildActionEffectService.buildPlacedProduce(action, {
        applyGreenhouseBonus: true,
        rollCraftProduce: true
    });
    sandbox.BuildActionEffectService.grantProducedItems(action, produce, {
        achievementMethod: "checkProduce",
        logMessageId: 1092,
        resetStep: 0,
        finishOptions: { enableLeftBtn: false }
    });
    assert(runtimePlayer.storage.getNumByItemId(101) === 2, "BuildActionEffectService.grantProducedItems failed");
    assert(runtimePlayer.log.logs.length > 0, "BuildActionEffectService did not log output");

    return {
        name: "runtime-context",
        ok: true,
        detail: "validated GameRuntime, travel plan and build action helpers"
    };
}

function runTalentHomeProduceSmoke() {
    const sandbox = createVmSandbox();
    sandbox.GameKernel = {
        register: function (name, service) {
            this[name] = service;
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/Item.js");
    loadIntoSandbox(sandbox, "assets/src/game/TalentService.js");

    sandbox.TalentService._getActiveTalentLevel = function () {
        return 3;
    };
    sandbox.TalentService._getTalentValueByLevel = function () {
        return 1.3;
    };

    const produce = sandbox.TalentService.applyHomeProduceEffect([
        { itemId: 1303012, num: 8 },
        { itemId: 1301011, num: 1 }
    ]);

    assert(produce[0].num === 10,
        "TalentService should apply 家里蹲 home produce bonus to explosive equipment like 自制炸药");
    assert(produce[1].num === 1,
        "TalentService should keep 家里蹲 home produce bonus excluded for standard guns");

    return {
        name: "talent-home-produce",
        ok: true,
        detail: "validated 家里蹲 home produce bonus includes explosives while keeping guns excluded"
    };
}

function runWeightPrecisionSmoke() {
    const sandbox = createVmSandbox();
    sandbox.Achievement.checkGetItem = function () {};
    sandbox.GameRuntime = {
        getPlayer: function () {
            return {
                storage: { getNumByItemId: function () { return 0; } },
                bag: { getNumByItemId: function () { return 0; } }
            };
        },
        getTimer: function () {
            return {
                formatTime: function () { return { d: 5 }; }
            };
        },
        getEmitter: function () {
            return sandbox.utils.emitter;
        },
        getRecord: function () {
            return sandbox.Record;
        }
    };
    sandbox.itemConfig = {
        9001: { id: 9001, weight: 0.02 },
        9002: { id: 9002, weight: 1 }
    };

    loadIntoSandbox(sandbox, "assets/src/game/constants.js");
    loadIntoSandbox(sandbox, "assets/src/util/emitter.js");
    loadIntoSandbox(sandbox, "assets/src/util/utils.js");
    loadIntoSandbox(sandbox, "assets/src/util/memoryUtil.js");
    loadIntoSandbox(sandbox, "assets/src/data/blackList.js");
    loadIntoSandbox(sandbox, "assets/src/game/Item.js");
    loadIntoSandbox(sandbox, "assets/src/game/Storage.js");

    assert(sandbox.utils.formatWeight(0.02) === "0.0",
        "utils.formatWeight should keep one-decimal truncation for lightweight items");

    const lightBag = new sandbox.Bag("player");
    assert(lightBag.tryIncreaseItems([{ itemId: 9001, num: 4 }]),
        "Bag.tryIncreaseItems should accept lightweight items when capacity allows");
    assert(lightBag.getCurrentWeight() === 0,
        "Bag current weight should keep four 0.02 items truncated to 0.0");
    assert(lightBag.tryIncreaseItems([{ itemId: 9001, num: 1 }]),
        "Bag.tryIncreaseItems should allow the fifth 0.02 item");
    assert(lightBag.getCurrentWeight() === 0.1,
        "Bag current weight should reach 0.1 once lightweight items total 0.10");
    assert(lightBag.tryIncreaseItems([{ itemId: 9001, num: 4 }]),
        "Bag.tryIncreaseItems should continue accepting more lightweight items");
    assert(lightBag.getCurrentWeight() === 0.1,
        "Bag current weight should keep nine 0.02 items truncated to 0.1");

    const heavyBag = new sandbox.Bag("player");
    assert(heavyBag.tryIncreaseItems([{ itemId: 9002, num: 34 }]),
        "Bag.tryIncreaseItems should accept items that fit within total capacity");
    assert(!heavyBag.tryIncreaseItems([{ itemId: 9001, num: 55 }]),
        "Bag.tryIncreaseItems should reject overweight additions instead of silently overflowing");
    assert(heavyBag.getNumByItemId(9001) === 0,
        "Bag.tryIncreaseItems should not add any items when the incoming list is overweight");

    return {
        name: "weight-precision",
        ok: true,
        detail: "validated one-decimal truncated weight totals and safe bag admission for lightweight stacked items"
    };
}

function runNpcFavorGiftDeckSmoke() {
    const sandbox = createVmSandbox();
    sandbox.BaseSite = sandbox.cc.Class.extend({
        ctor: function () {
            this.pos = { x: 0, y: 0 };
        }
    });
    sandbox.itemConfig = {
        9001: { id: 9001, value: 50 },
        9002: { id: 9002, value: 1 }
    };
    sandbox.npcConfig = {};
    sandbox.npcGiftConfig = {
        favorGiftThreshold: 100,
        favorGiftRatio: 0.5
    };
    sandbox.player = {
        log: {
            addMsg: function () {}
        }
    };
    sandbox.audioManager = {
        playEffect: function () {},
        sound: {
            GOOD_EFFECT: "good",
            BAD_EFFECT: "bad"
        }
    };
    sandbox.Achievement = {
        checkNpcReputation: function () {}
    };
    sandbox.TalentService = {
        isSocialEffectUnlocked: function () {
            return false;
        },
        getSocialTradeQuantityMultiplier: function () {
            return 1;
        },
        getSocialFavorGiftRatio: function () {
            return 0.5;
        }
    };

    loadIntoSandbox(sandbox, "assets/src/util/emitter.js");
    loadIntoSandbox(sandbox, "assets/src/util/utils.js");
    loadIntoSandbox(sandbox, "assets/src/game/npc.js");

    const fakeNpc = {
        giftInfo: [
            null,
            { itemId: "9002", num: "3" },
            { itemId: "9001", num: "1" }
        ],
        giftExtraInfo: [
            null,
            { itemId: "9002", num: "1" },
            { itemId: "9001", num: "1" }
        ]
    };

    const cardList = sandbox.NPC.prototype._getFavorGiftCardList.call(fakeNpc);
    const cardSummary = {};
    cardList.forEach(function (giftCard) {
        const itemId = giftCard.itemId;
        cardSummary[itemId] = cardSummary[itemId] || {
            cardCount: 0,
            totalNum: 0
        };
        cardSummary[itemId].cardCount += 1;
        cardSummary[itemId].totalNum += Number(giftCard.num);
    });

    assert(cardList.length === 4,
        "NPC favor gift generation should keep each configured gift entry as an independent draw card");
    assert(cardSummary[9002].cardCount === 2 && cardSummary[9002].totalNum === 4,
        "NPC favor gift deck should preserve repeated common gift entries and their configured quantities");
    assert(cardSummary[9001].cardCount === 2 && cardSummary[9001].totalNum === 2,
        "NPC favor gift deck should preserve repeated premium gift entries without merging them into a value weight");
    assert(cardList.some(function (giftCard) {
        return giftCard.itemId === 9002 && Number(giftCard.num) === 3;
    }), "NPC favor gift deck should keep larger bundled gift entries intact");

    return {
        name: "npc-favor-gift-deck",
        ok: true,
        detail: "validated NPC favor gift generation preserves configured gift entries as draw cards"
    };
}

function runNpcFavorGiftBudgetSmoke() {
    const sandbox = createVmSandbox();
    sandbox.BaseSite = sandbox.cc.Class.extend({
        ctor: function () {
            this.pos = { x: 0, y: 0 };
        }
    });
    sandbox.itemConfig = {
        9001: { id: 9001, value: 60 },
        9002: { id: 9002, value: 21 }
    };
    sandbox.npcConfig = {};
    sandbox.npcGiftConfig = {
        favorGiftThreshold: 100,
        favorGiftRatio: 0.5
    };
    sandbox.player = {
        log: {
            addMsg: function () {}
        }
    };
    sandbox.audioManager = {
        playEffect: function () {},
        sound: {
            GOOD_EFFECT: "good",
            BAD_EFFECT: "bad"
        }
    };
    sandbox.Achievement = {
        checkNpcReputation: function () {}
    };
    sandbox.TalentService = {
        isSocialEffectUnlocked: function () {
            return false;
        },
        getSocialTradeQuantityMultiplier: function () {
            return 1;
        },
        getSocialFavorGiftRatio: function () {
            return 0.5;
        }
    };

    loadIntoSandbox(sandbox, "assets/src/util/emitter.js");
    loadIntoSandbox(sandbox, "assets/src/util/utils.js");
    loadIntoSandbox(sandbox, "assets/src/game/npc.js");

    const fakeNpc = Object.create(sandbox.NPC.prototype);
    fakeNpc.id = 99;
    fakeNpc.giftInfo = [
        { itemId: "9002", num: "2" },
        { itemId: "9001", num: "1" }
    ];
    fakeNpc.giftExtraInfo = [];
    fakeNpc.giftProgress = 100;

    const giftItems = sandbox.NPC.prototype._consumeFavorGiftItems.call(fakeNpc);
    const itemMap = {};
    giftItems.forEach(function (itemInfo) {
        itemMap[itemInfo.itemId] = Number(itemInfo.num);
    });

    assert(itemMap[9002] === 2,
        "NPC favor gift generation should grant the eligible configured gift card that fits the current budget");
    assert(!itemMap[9001],
        "NPC favor gift generation should not pick a configured gift card whose value exceeds the remaining budget");
    assert(fakeNpc.giftProgress === 16,
        "NPC favor gift progress should retain the unspent portion instead of clearing all progress");

    return {
        name: "npc-favor-gift-budget",
        ok: true,
        detail: "validated NPC favor gift generation stays within budget and preserves leftover favor progress"
    };
}

module.exports = [
    runRuntimeContextSmoke,
    runTalentHomeProduceSmoke,
    runWeightPrecisionSmoke,
    runNpcFavorGiftDeckSmoke,
    runNpcFavorGiftBudgetSmoke
];
