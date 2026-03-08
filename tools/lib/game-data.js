const fs = require("fs");
const path = require("path");
const vm = require("vm");

function getRootDir() {
    return path.resolve(__dirname, "..", "..");
}

function loadVar(filePath, variableName) {
    const code = fs.readFileSync(filePath, "utf8");
    const context = {};
    vm.createContext(context);
    vm.runInContext(code, context, { filename: filePath });
    return context[variableName];
}

function hasSpriteFrame(plistText, spriteName) {
    return plistText.indexOf("<key>" + spriteName + "</key>") !== -1;
}

function getDisplayItemId(itemId, itemConfig) {
    const normalizedId = parseInt(itemId, 10);
    if (!Number.isFinite(normalizedId)) {
        return null;
    }

    const config = itemConfig[normalizedId];
    if (config && config.displayItemId !== undefined) {
        const displayItemId = parseInt(config.displayItemId, 10);
        if (Number.isFinite(displayItemId)) {
            return displayItemId;
        }
    }

    if (normalizedId === 1301091) {
        return 1301011;
    }

    return normalizedId;
}

function loadItemValidationContext(rootDir) {
    const resolvedRootDir = rootDir || getRootDir();
    return {
        itemConfig: loadVar(path.join(resolvedRootDir, "assets/src/data/itemConfig.js"), "itemConfig"),
        zhStrings: loadVar(path.join(resolvedRootDir, "assets/src/data/string/string_zh.js"), "string"),
        enStrings: loadVar(path.join(resolvedRootDir, "assets/src/data/string/string_en.js"), "string"),
        iconPlist: fs.readFileSync(path.join(resolvedRootDir, "assets/res/icon.plist"), "utf8"),
        digItemPlist: fs.readFileSync(path.join(resolvedRootDir, "assets/res/dig_item.plist"), "utf8")
    };
}

module.exports = {
    getRootDir: getRootDir,
    getDisplayItemId: getDisplayItemId,
    hasSpriteFrame: hasSpriteFrame,
    loadVar: loadVar,
    loadItemValidationContext: loadItemValidationContext
};
