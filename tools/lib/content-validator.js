const fs = require("fs");
const path = require("path");
const vm = require("vm");

const gameData = require("./game-data");

const TYPE_TO_GLOBAL = {
    role: "RoleConfigTable",
    talent: "TalentConfigTable",
    item: "itemConfig",
    site: "siteConfig",
    build: "buildConfig",
    "build-action": "buildActionConfig",
    formula: "formulaConfig"
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
        buildConfig: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/data/buildConfig.js"), "buildConfig")),
        buildActionConfig: deepClone(require(path.join(rootDir, "assets/src/data/buildActionConfig.js"))),
        formulaConfig: deepClone(gameData.loadVar(path.join(rootDir, "assets/src/data/formulaConfig.js"), "formulaConfig")),
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
    context.TalentService = {
        bindIAPCompatApi: function () {}
    };
    context.EnvironmentConfig = {
        isContentValidationEnabled: function () {
            return true;
        }
    };

    vm.createContext(context);
    loadScriptIntoContext(rootDir, context, "assets/src/game/WeaponCraftService.js");
    loadScriptIntoContext(rootDir, context, "assets/src/game/IAPPackage.js");
    loadScriptIntoContext(rootDir, context, "assets/src/util/contentBlueprint.js");
    loadScriptIntoContext(rootDir, context, "assets/src/util/configValidator.js");
    return context;
}

function expandLanguages(lang) {
    if (!lang || lang === "both") {
        return ["zh"];
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

function buildReport(type, results) {
    const report = {
        type: type || "",
        total: 0,
        validCount: 0,
        invalidCount: 0,
        warningCount: 0,
        errorCount: 0,
        results: Array.isArray(results) ? results : []
    };

    report.total = report.results.length;
    report.results.forEach(function (result) {
        if (!result || result.error) {
            report.invalidCount += 1;
            report.errorCount += 1;
            return;
        }
        if (result.valid) {
            report.validCount += 1;
        } else {
            report.invalidCount += 1;
        }
        report.warningCount += (result.warnings || []).length;
        report.errorCount += (result.errors || []).length;
    });

    return report;
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
    const types = type === "all" ? ["role", "talent", "item", "site", "build", "build-action", "formula"] : [type];
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

function normalizeNumericId(value) {
    const normalized = parseInt(value, 10);
    return Number.isFinite(normalized) ? normalized : null;
}

function createPurchaseContractRuntime() {
    const rootDir = gameData.getRootDir();
    const context = createRuntime("zh");

    context.SafetyHelper = {
        isEmpty: function (value) {
            return value === undefined || value === null || value === "";
        },
        safeJSONParse: function (value, fallbackValue) {
            try {
                return JSON.parse(value);
            } catch (error) {
                return fallbackValue;
            }
        }
    };
    context.Medal = {
        isExchanged: function () {
            return false;
        },
        getAchievementPoints: function () {
            return 0;
        },
        getTalentLevel: function () {
            return 0;
        }
    };
    context.memoryUtil = {
        decode: function (value) {
            return value;
        }
    };
    context.PlayerAttr = {
        HP_MAX: 240
    };
    context.GameKernel = {
        register: function (name, service) {
            this._services[name] = service;
        },
        get: function (name) {
            return this._services[name] || null;
        },
        require: function (name) {
            return this.get(name);
        },
        _services: {}
    };

    loadScriptIntoContext(rootDir, context, "assets/src/game/role.js");
    loadScriptIntoContext(rootDir, context, "assets/src/game/TalentService.js");
    loadScriptIntoContext(rootDir, context, "assets/src/game/PurchaseService.js");
    return context;
}

function getPurchaseAvailableIds(context) {
    return sortNumericIds(Object.keys(context.PurchaseList || {}).map(function (purchaseId) {
        return parseInt(purchaseId, 10);
    }).filter(function (purchaseId) {
        return Number.isFinite(purchaseId);
    }));
}

function addToListMap(map, key, value) {
    if (!Number.isFinite(key)) {
        return;
    }
    if (!map[key]) {
        map[key] = [];
    }
    map[key].push(value);
}

function buildRolePurchaseMap(context) {
    const purchaseMap = {};
    Object.keys(context.RoleConfigTable || {}).forEach(function (roleType) {
        const normalizedRoleType = normalizeNumericId(roleType);
        const roleConfig = context.RoleConfigTable[roleType] || {};
        const purchaseId = normalizeNumericId(roleConfig.purchaseId);
        if (normalizedRoleType === null || purchaseId === null) {
            return;
        }
        addToListMap(purchaseMap, purchaseId, normalizedRoleType);
    });
    return purchaseMap;
}

function buildTalentPurchaseMap(context) {
    const purchaseMap = {};
    Object.keys(context.TalentConfigTable || {}).forEach(function (talentId) {
        const normalizedTalentId = normalizeNumericId(talentId);
        const talentConfig = context.TalentConfigTable[talentId] || {};
        const purchaseId = normalizeNumericId(talentConfig.purchaseId !== undefined ? talentConfig.purchaseId : talentId);
        if (normalizedTalentId === null || purchaseId === null) {
            return;
        }
        addToListMap(purchaseMap, purchaseId, normalizedTalentId);
    });
    return purchaseMap;
}

function getSortedExchangeIds(context, type, targetId) {
    const exchangeIds = [];
    const exchangeConfig = context.ExchangeAchievementConfig || {};

    Object.keys(exchangeConfig).forEach(function (exchangeId) {
        const normalizedExchangeId = normalizeNumericId(exchangeId);
        const config = exchangeConfig[exchangeId];
        if (normalizedExchangeId === null || !config || config.type !== type) {
            return;
        }
        if (normalizeNumericId(config.targetId) !== targetId) {
            return;
        }
        exchangeIds.push(normalizedExchangeId);
    });

    exchangeIds.sort(function (a, b) {
        const configA = exchangeConfig[a] || {};
        const configB = exchangeConfig[b] || {};
        const levelA = normalizeNumericId(configA.level) || 1;
        const levelB = normalizeNumericId(configB.level) || 1;
        if (levelA !== levelB) {
            return levelA - levelB;
        }
        return a - b;
    });

    return exchangeIds;
}

function getExpectedExchangeIdsForPurchaseId(context, purchaseId, rolePurchaseMap, talentPurchaseMap) {
    const roleTypes = rolePurchaseMap[purchaseId] || [];
    const talentIds = talentPurchaseMap[purchaseId] || [];

    if (talentIds.length === 1) {
        return getSortedExchangeIds(context, "talent", talentIds[0]);
    }
    if (roleTypes.length === 1) {
        return getSortedExchangeIds(context, "character", roleTypes[0]);
    }
    if (purchaseId >= 100 && purchaseId < 200) {
        return getSortedExchangeIds(context, "item", purchaseId);
    }
    return [];
}

function validatePurchaseLinkEntry(context, purchaseId, rolePurchaseMap, talentPurchaseMap) {
    const purchaseInfo = context.PurchaseList && context.PurchaseList[purchaseId];
    const entry = {
        id: purchaseId,
        valid: true,
        errors: [],
        warnings: []
    };
    const roleTypes = rolePurchaseMap[purchaseId] || [];
    const talentIds = talentPurchaseMap[purchaseId] || [];
    const expectedExchangeIds = getExpectedExchangeIdsForPurchaseId(context, purchaseId, rolePurchaseMap, talentPurchaseMap);
    const actualExchangeIds = context.IAPPackage.getExchangeIdsByPurchaseId(purchaseId) || [];
    const expectedIsExchange = expectedExchangeIds.length > 0;
    const actualIsExchange = !!context.IAPPackage.isExchangePurchase(purchaseId);

    if (!purchaseInfo) {
        entry.valid = false;
        entry.errors.push("缺少购买配置 - plugin/purchaseList.js");
        return entry;
    }

    if (roleTypes.length > 1) {
        entry.valid = false;
        entry.errors.push("多个角色共享同一个购买 id - data/roleConfigTable.js");
    }
    if (talentIds.length > 1) {
        entry.valid = false;
        entry.errors.push("多个天赋共享同一个购买 id - data/talentConfigTable.js");
    }
    if (roleTypes.length > 0 && talentIds.length > 0) {
        entry.valid = false;
        entry.errors.push("购买 id 同时映射了角色和天赋 - data/roleConfigTable.js / data/talentConfigTable.js");
    }

    if (JSON.stringify(actualExchangeIds) !== JSON.stringify(expectedExchangeIds)) {
        entry.valid = false;
        entry.errors.push("IAPPackage 兑换映射与配置期望不一致 - game/IAPPackage.js / game/medal.js");
    }
    if (actualIsExchange !== expectedIsExchange) {
        entry.valid = false;
        entry.errors.push("IAPPackage 兑换购买判定与配置期望不一致 - game/IAPPackage.js");
    }

    if (roleTypes.length === 1) {
        const roleType = roleTypes[0];
        const roleConfig = context.RoleConfigTable[roleType] || {};
        const configuredExchangeId = normalizeNumericId(roleConfig.exchangeId);
        const actualRoleType = context.role.getRoleTypeByPurchaseId(purchaseId);

        if (actualRoleType !== roleType) {
            entry.valid = false;
            entry.errors.push("role.getRoleTypeByPurchaseId 返回值与角色购买配置不一致 - game/role.js");
        }
        if (configuredExchangeId === null && expectedExchangeIds.length > 0) {
            entry.valid = false;
            entry.errors.push("角色购买缺少显式 exchangeId，但存在角色兑换配置 - data/roleConfigTable.js / game/medal.js");
        }
        if (configuredExchangeId !== null && expectedExchangeIds.indexOf(configuredExchangeId) === -1) {
            entry.valid = false;
            entry.errors.push("角色配置 exchangeId 与兑换表不一致 - data/roleConfigTable.js / game/medal.js");
        }
    }

    if (talentIds.length === 1) {
        const talentId = talentIds[0];
        const talentConfig = context.TalentConfigTable[talentId] || {};
        const configuredPurchaseId = normalizeNumericId(talentConfig.purchaseId !== undefined ? talentConfig.purchaseId : talentId);
        const maxLevel = Math.max(1, normalizeNumericId(talentConfig.maxLevel) || 1);
        const actualLevels = expectedExchangeIds.map(function (exchangeId) {
            const exchangeConfig = context.ExchangeAchievementConfig[exchangeId] || {};
            return normalizeNumericId(exchangeConfig.level) || 1;
        });
        const expectedLevels = [];
        let level = 1;

        if (configuredPurchaseId !== purchaseId) {
            entry.valid = false;
            entry.errors.push("天赋 purchaseId 与购买入口不一致 - data/talentConfigTable.js");
        }
        if (!context.TalentService.isTalentPurchaseId(purchaseId)) {
            entry.valid = false;
            entry.errors.push("TalentService 未将该购买识别为天赋购买 - game/TalentService.js");
        }

        for (; level <= maxLevel; level++) {
            expectedLevels.push(level);
        }
        if (JSON.stringify(actualLevels) !== JSON.stringify(expectedLevels)) {
            entry.valid = false;
            entry.errors.push("天赋兑换等级链不完整或顺序错误 - data/talentConfigTable.js / game/medal.js");
        }
    }

    return entry;
}

function validatePurchaseLinks(options) {
    const opts = options || {};
    const context = createPurchaseContractRuntime();
    const availableIds = getPurchaseAvailableIds(context);
    const ids = normalizeIds(opts.ids, availableIds);
    const rolePurchaseMap = buildRolePurchaseMap(context);
    const talentPurchaseMap = buildTalentPurchaseMap(context);
    const results = ids.map(function (purchaseId) {
        return validatePurchaseLinkEntry(context, purchaseId, rolePurchaseMap, talentPurchaseMap);
    });

    return [
        buildValidationResult("purchase", "config", "all", ids, buildReport("purchase", results))
    ];
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
        const checklist = context.ConfigValidator.getChecklist(type, normalizedId);
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
    validateLinks: validateLinks,
    validatePurchaseLinks: validatePurchaseLinks
};
