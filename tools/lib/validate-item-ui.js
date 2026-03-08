const gameData = require("./game-data");

function pushIssue(issueList, itemId, issue) {
    issueList.push("[" + itemId + "] " + issue);
}

function normalizeItemIds(itemIds, itemConfig) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return Object.keys(itemConfig).map(function (id) {
            return parseInt(id, 10);
        }).sort(function (a, b) {
            return a - b;
        });
    }

    return itemIds.map(function (itemId) {
        return parseInt(itemId, 10);
    }).filter(function (itemId) {
        return Number.isFinite(itemId);
    }).sort(function (a, b) {
        return a - b;
    });
}

function validate(options) {
    const opts = options || {};
    const strictText = !!opts.strictText;
    const context = gameData.loadItemValidationContext(opts.rootDir);
    const itemConfig = context.itemConfig;
    const zhStrings = context.zhStrings;
    const enStrings = context.enStrings;
    const iconPlist = context.iconPlist;
    const digItemPlist = context.digItemPlist;
    const uiIssues = [];
    const textWarnings = [];
    const itemIds = normalizeItemIds(opts.itemIds, itemConfig);

    itemIds.forEach(function (itemId) {
        const config = itemConfig[itemId];
        const displayItemId = gameData.getDisplayItemId(itemId, itemConfig);

        if (!config) {
            pushIssue(uiIssues, itemId, "missing itemConfig entry");
            return;
        }

        if (!zhStrings[itemId] || !zhStrings[itemId].title || !zhStrings[itemId].des) {
            pushIssue(textWarnings, itemId, "missing zh title/des");
        }
        if (!enStrings[itemId] || !enStrings[itemId].title || !enStrings[itemId].des) {
            pushIssue(textWarnings, itemId, "missing en title/des");
        }

        if (config.displayItemId !== undefined && !itemConfig[config.displayItemId]) {
            pushIssue(uiIssues, itemId, "displayItemId points to a missing item: " + config.displayItemId);
        }

        if (!Number.isFinite(displayItemId)) {
            pushIssue(uiIssues, itemId, "display item id is invalid");
            return;
        }

        if (!gameData.hasSpriteFrame(iconPlist, "icon_item_" + displayItemId + ".png")) {
            pushIssue(uiIssues, itemId, "missing icon sprite: icon_item_" + displayItemId + ".png");
        }
        if (!gameData.hasSpriteFrame(digItemPlist, "dig_item_" + displayItemId + ".png")) {
            pushIssue(uiIssues, itemId, "missing detail sprite: dig_item_" + displayItemId + ".png");
        }
    });

    return {
        name: "item-ui",
        checkedIds: itemIds.length,
        strictText: strictText,
        uiIssues: uiIssues,
        textWarnings: textWarnings,
        ok: uiIssues.length === 0 && (!strictText || textWarnings.length === 0)
    };
}

function printResult(result, logger) {
    const output = logger || console;

    if (result.textWarnings.length > 0) {
        output.warn("Item text warnings:");
        result.textWarnings.forEach(function (issue) {
            output.warn(issue);
        });
    }

    if (result.uiIssues.length > 0) {
        output.error("Item UI validation failed.");
        result.uiIssues.forEach(function (issue) {
            output.error(issue);
        });
        return 1;
    }

    if (result.strictText && result.textWarnings.length > 0) {
        output.error("Item text validation failed in strict mode.");
        return 1;
    }

    output.log("Item UI validation passed for " + result.checkedIds + " items.");
    return 0;
}

module.exports = {
    validate: validate,
    printResult: printResult
};
