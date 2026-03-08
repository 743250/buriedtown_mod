const fs = require("fs");
const path = require("path");
const vm = require("vm");

const gameData = require("./game-data");

const TYPE_TO_GLOBAL = {
    role: "RoleConfigTable",
    talent: "TalentConfigTable",
    item: "itemConfig",
    site: "siteConfig"
};

function deepClone(value) {
    if (Array.isArray(value)) {
        return value.map(deepClone);
    }
    if (!value || typeof value !== "object") {
        return value;
    }

    const cloned = {};
    Object.keys(value).forEach(function (key) {
        cloned[key] = deepClone(value[key]);
    });
    return cloned;
}

function createCcStub() {
    const noop = function () {};
    return {
        log: noop,
        warn: noop,
        error: noop,
        w: noop,
        sys: {
            isNative: false,
            localStorage: {
                getItem: function () {
                    return null;
                },
                setItem: noop,
                removeItem: noop
            }
        }
    };
}

function createUtils(itemConfig, blackList) {
    return {
        clone: deepClone,
        getRandomItemId: function (itemId) {
            const itemIdStr = String(itemId);
            if (itemIdStr.indexOf("*") === -1) {
                return itemIdStr;
            }

            let itemIds = Object.keys(itemConfig);
            let index = 0;
            for (let i = 0; i < itemIdStr.length; i++) {
                if (itemIdStr[i] === "*") {
                    index += 2;
                    continue;
                }

                const len = index === 6 ? 1 : 2;
                const flag = itemIdStr.substr(i, len);
                itemIds = itemIds.filter(function (candidateId) {
                    if (blackList && Array.isArray(blackList.randomLoop) && blackList.randomLoop.indexOf(Number(candidateId)) !== -1) {
                        return false;
                    }
                    return flag === String(candidateId).substr(index, len);
                });
                i += 1;
                index += 2;
            }

            if (itemIds.length === 0) {
                return null;
            }

            itemIds.sort(function (a, b) {
                return Number(a) - Number(b);
            });
            return itemIds[0];
        }
    };
}

function createStringUtil(stringMap) {
    return {
        getString: function (stringId) {
            if (!stringMap) {
                return null;
            }
            return stringMap[stringId] || null;
        }
    };
}

function createSpriteFrameController(iconPlist, digItemPlist) {
    return {
        getSpriteFrameFromSpriteName: function (spriteName) {
            if (!spriteName) {
                return null;
            }
            const normalized = spriteName.charAt(0) === "#" ? spriteName.substring(1) : spriteName;
            if (gameData.hasSpriteFrame(iconPlist, normalized) || gameData.hasSpriteFrame(digItemPlist, normalized)) {
                return { name: normalized };
            }
            return null;
        }
    };
}

function loadScriptIntoContext(rootDir, context, relativePath) {
    const filePath = path.join(rootDir, relativePath);
    const code = fs.readFileSync(filePath, "utf8");
    vm.runInContext(code, context, { filename: filePath });
}

function createRuntime(lang) {
    const rootDir = gameData.getRootDir();
    const itemAssets = gameData.loadItemValidationContext(rootDir);
    const context = {
        cc: createCcStub(),
        Math: Math,
        JSON: JSON,
        Number: Number,
        String: String,
        Array: Array,
        Object: Object,
        parseInt: parseInt,
        parseFloat: parseFloat,
        isFinite: isFinite,
        itemConfig: deepClone(itemAssets.itemConfig),
        blackList: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/data/blackList.js"), "blackList")),
        npcConfig: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/data/npcConfig.js"), "npcConfig")),
        siteConfig: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/data/siteConfig.js"), "siteConfig")),
        secretRooms: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/data/secretRooms.js"), "secretRooms")),
        RoleConfigTable: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/data/roleConfigTable.js"), "RoleConfigTable")),
        TalentConfigTable: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/data/talentConfigTable.js"), "TalentConfigTable")),
        PurchaseList: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/plugin/purchaseList.js"), "PurchaseList")),
        ExchangeAchievementConfig: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/game/medal.js"), "ExchangeAchievementConfig")),
        string: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/data/string/string_" + lang + ".js"), "string")),
        console: console
    };

    context.utils = createUtils(context.itemConfig, context.blackList);
    context.stringUtil = createStringUtil(context.string);
    context.autoSpriteFrameController = createSpriteFrameController(itemAssets.iconPlist, itemAssets.digItemPlist);
    context.EnvironmentConfig = {
        isContentValidationEnabled: function () {
            return true;
        }
    };

    vm.createContext(context);
    loadScriptIntoContext(rootDir, context, "assets/src/game/WeaponCraftService.js");
    loadScriptIntoContext(rootDir, context, "assets/src/util/contentBlueprint.js");
    loadScriptIntoContext(rootDir, context, "assets/src/util/configValidator.js");
    loadScriptIntoContext(rootDir, context, "assets/src/util/dependencyChecker.js");
    return context;
}

function expandLanguages(lang) {
    if (!lang || lang === "both") {
        return ["zh", "en"];
    }
    return [lang];
}

function sortNumericIds(ids) {
    return ids.slice().sort(function (a, b) {
        return Number(a) - Number(b);
    });
}

function normalizeIds(ids, availableIds) {
    if (!Array.isArray(ids) || ids.length === 0) {
        return sortNumericIds(availableIds);
    }

    const requestedIds = ids.map(function (id) {
        return parseInt(id, 10);
    }).filter(function (id) {
        return Number.isFinite(id);
    });

    const availableMap = {};
    availableIds.forEach(function (id) {
        availableMap[id] = true;
    });

    return sortNumericIds(requestedIds.filter(function (id) {
        return !!availableMap[id];
    }));
}

function getAvailableIds(context, type, scope) {
    const globalName = TYPE_TO_GLOBAL[type];
    const table = globalName ? context[globalName] : null;
    if (!table) {
        return [];
    }

    let ids = Object.keys(table).map(function (id) {
        return parseInt(id, 10);
    }).filter(function (id) {
        return Number.isFinite(id);
    });

    if (type === "item" && scope === "weapons") {
        ids = ids.filter(function (id) {
            const itemType = Math.floor(id / 1000);
            return itemType >= 1301 && itemType <= 1305;
        });
    }

    return sortNumericIds(ids);
}

function buildValidationResult(type, lang, scope, ids, report) {
    return {
        name: "content-links",
        type: type,
        lang: lang,
        scope: scope || "all",
        checkedIds: ids.length,
        report: report,
        ok: report.invalidCount === 0
    };
}

function validateLinks(type, options) {
    const opts = options || {};
    const languages = expandLanguages(opts.lang);
    const types = type === "all" ? ["role", "talent", "item", "site"] : [type];
    const results = [];

    types.forEach(function (oneType) {
        languages.forEach(function (lang) {
            const context = createRuntime(lang);
            const availableIds = getAvailableIds(context, oneType, opts.scope);
            const ids = normalizeIds(opts.ids, availableIds);
            const report = context.ConfigValidator.validateMany(oneType, ids);
            results.push(buildValidationResult(oneType, lang, opts.scope, ids, report));
        });
    });

    return results;
}

function buildChecklistResult(type, lang, id, checklist) {
    const items = checklist && Array.isArray(checklist.items) ? checklist.items : [];
    return {
        name: "content-checklist",
        type: type,
        lang: lang,
        id: id,
        items: items,
        ok: items.every(function (item) {
            return !item.required || !!item.status;
        }),
        error: checklist && checklist.error ? checklist.error : null
    };
}

function getChecklist(type, id, options) {
    const opts = options || {};
    const normalizedId = parseInt(id, 10);
    const languages = expandLanguages(opts.lang);

    return languages.map(function (lang) {
        const context = createRuntime(lang);
        const checklist = context.DependencyChecker.check(type, normalizedId);
        return buildChecklistResult(type, lang, normalizedId, checklist);
    });
}

function summarizeReport(report) {
    return "total=" + report.total
        + " valid=" + report.validCount
        + " invalid=" + report.invalidCount
        + " warnings=" + report.warningCount
        + " errors=" + report.errorCount;
}

function printValidationResults(results, logger) {
    const output = logger || console;
    let exitCode = 0;

    results.forEach(function (result, index) {
        if (index > 0) {
            output.log("");
        }

        output.log("[" + result.lang + "] " + result.type + " links (" + result.scope + "): " + summarizeReport(result.report));
        result.report.results.forEach(function (entry) {
            if (!entry || entry.error) {
                exitCode = 1;
                return;
            }
            if (entry.valid && (!entry.warnings || entry.warnings.length === 0)) {
                return;
            }

            if (!entry.valid) {
                exitCode = 1;
            }
            output.warn("  - " + entry.id + " [" + (entry.valid ? "warn" : "invalid") + "]");
            (entry.errors || []).forEach(function (error) {
                output.warn("    error: " + error);
            });
            (entry.warnings || []).forEach(function (warning) {
                output.warn("    warning: " + warning);
            });
        });
    });

    return exitCode;
}

function printChecklistResults(results, logger) {
    const output = logger || console;
    let exitCode = 0;

    results.forEach(function (result, index) {
        if (index > 0) {
            output.log("");
        }

        if (result.error) {
            output.error("[" + result.lang + "] " + result.type + " " + result.id + ": " + result.error);
            exitCode = 1;
            return;
        }

        output.log("[" + result.lang + "] " + result.type + " " + result.id + " checklist");
        result.items.forEach(function (item) {
            const status = item.status ? "✓" : "✗";
            const required = item.required ? "[required]" : "[optional]";
            output.log("  " + status + " " + required + " " + item.name + " :: " + item.file);
        });

        if (!result.ok) {
            exitCode = 1;
        }
    });

    return exitCode;
}

module.exports = {
    getChecklist: getChecklist,
    printChecklistResults: printChecklistResults,
    printValidationResults: printValidationResults,
    validateLinks: validateLinks
};
