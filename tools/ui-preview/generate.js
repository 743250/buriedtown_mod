#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const gameData = require("../lib/game-data");

const ROOT_DIR = gameData.getRootDir();
const DEFAULT_OUT = path.join(ROOT_DIR, "tools/ui-preview/dist/index.html");

function parseArgs(argv) {
    const parsed = { out: DEFAULT_OUT, json: false };
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === "--help" || arg === "-h") {
            parsed.help = true;
            return parsed;
        }
        if (arg === "--json") {
            parsed.json = true;
            continue;
        }
        if (arg === "--out") {
            index += 1;
            parsed.out = path.resolve(argv[index] || "");
            continue;
        }
        parsed.error = "Unknown argument: " + arg;
        return parsed;
    }
    return parsed;
}

function printHelp() {
    console.log("Usage: node tools/ui-preview/generate.js [--out path] [--json]");
    console.log("");
    console.log("Generates a static simulation platform for high-risk UI surfaces:");
    console.log("  - ChooseScene role carousel and talent grid");
    console.log("  - RoleTalentUiHelper role and talent dialogs");
    console.log("  - PurchaseUiHelper shop and exchange cards");
    console.log("  - MedalSceneView achievement wall projections");
    console.log("  - Text overflow probes and sprite resource reports");
}

function loadVar(relativePath, variableName) {
    return gameData.loadVar(path.join(ROOT_DIR, relativePath), variableName);
}

function safeRead(filePath) {
    try {
        return fs.readFileSync(filePath, "utf8");
    } catch (error) {
        return "";
    }
}

function normalizeSpriteName(spriteName) {
    if (spriteName === undefined || spriteName === null) {
        return "";
    }
    spriteName = String(spriteName);
    return spriteName.charAt(0) === "#" ? spriteName.substring(1) : spriteName;
}

function pushUnique(list, value) {
    if (value && list.indexOf(value) === -1) {
        list.push(value);
    }
}

function collectPlistSprites() {
    const plistDir = path.join(ROOT_DIR, "assets/res");
    const result = {};
    fs.readdirSync(plistDir).forEach(function (fileName) {
        if (!/\.plist$/.test(fileName)) {
            return;
        }
        const plistPath = path.join(plistDir, fileName);
        const plistText = safeRead(plistPath);
        const re = /<key>([^<]+\.png)<\/key>/g;
        let match;
        while ((match = re.exec(plistText))) {
            result[match[1]] = "assets/res/" + fileName;
        }
    });
    return result;
}

function getStandaloneCandidateDirs(spriteName) {
    const normalized = normalizeSpriteName(spriteName);
    const dirs = [];
    if (!normalized || normalized.indexOf("/") !== -1) {
        return dirs;
    }

    if (/^npc(_dig)?_/.test(normalized)) {
        pushUnique(dirs, "assets/res/npc");
    }
    if (/^icon_/.test(normalized)) {
        pushUnique(dirs, "assets/res/icon");
        pushUnique(dirs, "assets/res/ui");
    }
    if (/^(medalIcon_|medalStar|star_)/.test(normalized)) {
        pushUnique(dirs, "assets/res/medal");
    }
    if (/^site_/.test(normalized)) {
        pushUnique(dirs, "assets/res/site");
        pushUnique(dirs, "assets/res/ui");
    }
    if (/^build(_action)?_/.test(normalized)) {
        pushUnique(dirs, "assets/res/build");
    }
    if (/^dig_build_/.test(normalized)) {
        pushUnique(dirs, "assets/res/dig_build");
    }
    if (/^dig_item_/.test(normalized)) {
        pushUnique(dirs, "assets/res/dig_item");
    }
    if (/^monster_dig_/.test(normalized)) {
        pushUnique(dirs, "assets/res/dig_monster");
    }
    if (/^work_dig_/.test(normalized)) {
        pushUnique(dirs, "assets/res/dig_work");
    }
    if (/^gate_/.test(normalized)) {
        pushUnique(dirs, "assets/res/gate");
    }
    if (/^home_/.test(normalized)) {
        pushUnique(dirs, "assets/res/home");
    }
    if (/^map_/.test(normalized)) {
        pushUnique(dirs, "assets/res/map");
    }
    if (/^menu_/.test(normalized)) {
        pushUnique(dirs, "assets/res/menu");
    }
    if (/^rank_/.test(normalized)) {
        pushUnique(dirs, "assets/res/rank");
    }
    if (/^weather_/.test(normalized)) {
        pushUnique(dirs, "assets/res/weather");
    }
    if (/^day_scene_/.test(normalized)) {
        pushUnique(dirs, "assets/res/day");
        pushUnique(dirs, "assets/res/day2");
    }
    if (/^(btn_|frame_|dialog_|checkbox_|edit_|loading_anim_|page_view_indicator_|slider_)/.test(normalized)
        || /^(build_icon_bg|guide_bg|item_bg|item_equip_bg|pb|pb_bg|role_bg|site_dig_secret|dig_death|dig_start)\.png$/.test(normalized)) {
        pushUnique(dirs, "assets/res/ui");
    }
    if (/^(btn_home|btn_share|end_bg)\.png$/.test(normalized)) {
        pushUnique(dirs, "assets/res/end");
    }
    return dirs;
}

function makePathRelativeToHtml(outPath, assetPath) {
    const fromDir = path.dirname(outPath);
    return path.relative(fromDir, path.join(ROOT_DIR, assetPath)).replace(/\\/g, "/");
}

function createSpriteResolver(outPath, plistSprites) {
    return function resolveSprite(spriteName, fallbackName) {
        const normalized = normalizeSpriteName(spriteName);
        const fallback = normalizeSpriteName(fallbackName);

        function resolveOne(name) {
            if (!name) {
                return null;
            }
            const candidateDirs = getStandaloneCandidateDirs(name);
            for (let i = 0; i < candidateDirs.length; i++) {
                const assetPath = candidateDirs[i] + "/" + name;
                if (fs.existsSync(path.join(ROOT_DIR, assetPath))) {
                    return {
                        name: name,
                        status: plistSprites[name] ? "standalone+plist" : "standalone-only",
                        url: makePathRelativeToHtml(outPath, assetPath),
                        plist: plistSprites[name] || null
                    };
                }
            }
            if (plistSprites[name]) {
                return {
                    name: name,
                    status: "plist-only",
                    url: "",
                    plist: plistSprites[name]
                };
            }
            return null;
        }

        const primary = resolveOne(normalized);
        if (primary) {
            primary.requested = normalized;
            primary.fallback = fallback || "";
            primary.usedFallback = false;
            return primary;
        }

        const fallbackResolved = resolveOne(fallback);
        if (fallbackResolved) {
            fallbackResolved.requested = normalized;
            fallbackResolved.fallback = fallback || "";
            fallbackResolved.usedFallback = true;
            fallbackResolved.missingPrimary = normalized || "";
            return fallbackResolved;
        }

        return {
            requested: normalized,
            fallback: fallback || "",
            name: normalized || fallback || "",
            status: "missing",
            url: "",
            plist: null,
            usedFallback: false,
            missingPrimary: normalized || ""
        };
    };
}

function normalizeText(value) {
    if (value === undefined || value === null) {
        return "";
    }
    return String(value).replace(/\\n/g, "\n");
}

function createStringGetter(strings) {
    return function getString(id) {
        const value = strings[id];
        if (typeof value === "string") {
            return normalizeText(value);
        }
        if (value && typeof value === "object") {
            return JSON.parse(JSON.stringify(value));
        }
        return "";
    };
}

function sortNumericKeys(table, getOrder) {
    return Object.keys(table || {}).map(function (key) {
        return parseInt(key, 10);
    }).filter(function (id) {
        return Number.isFinite(id);
    }).sort(function (a, b) {
        const orderA = getOrder ? getOrder(table[a] || {}, a) : a;
        const orderB = getOrder ? getOrder(table[b] || {}, b) : b;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a - b;
    });
}

function getPurchaseStringConfig(getString, purchaseId) {
    const config = getString("p_" + purchaseId);
    if (config && typeof config === "object") {
        return {
            name: normalizeText(config.name || ""),
            des: normalizeText(config.des || ""),
            effect: normalizeText(config.effect || "")
        };
    }
    return { name: "", des: "", effect: "" };
}

function getRoleTextFromSource(getString, source, fallbackStringId) {
    if (source && source.type === "purchase") {
        const purchaseStringConfig = getPurchaseStringConfig(getString, source.purchaseId);
        return normalizeText(purchaseStringConfig[source.field || "des"] || "");
    }
    return normalizeText(getString(fallbackStringId));
}

function getTalentLevelText(level) {
    const map = { 1: "一", 2: "二", 3: "三" };
    return map[level] || String(level);
}

function buildTalentDisplay(talent, purchaseString, level) {
    const maxLevel = Math.max(1, parseInt(talent.maxLevel || 3, 10) || 3);
    const currentLevel = Math.max(0, Math.min(maxLevel, parseInt(level || 0, 10) || 0));
    const nextLevel = currentLevel >= maxLevel ? maxLevel : currentLevel + 1;
    const effectList = Array.isArray(talent.tierEffectTextList) ? talent.tierEffectTextList.slice() : [];
    const fallbackEffect = purchaseString.effect || "效果增强";

    while (effectList.length < maxLevel) {
        effectList.push(fallbackEffect);
    }

    const currentEffectText = currentLevel >= 1 ? normalizeText(effectList[currentLevel - 1] || fallbackEffect) : "无";
    const nextEffectText = currentLevel >= maxLevel ? "无" : normalizeText(effectList[nextLevel - 1] || fallbackEffect);
    const tierLines = [];
    for (let oneLevel = 1; oneLevel <= maxLevel; oneLevel++) {
        tierLines.push(getTalentLevelText(oneLevel) + "级 " + normalizeText(effectList[oneLevel - 1] || fallbackEffect));
    }

    let cardName;
    if (currentLevel >= maxLevel) {
        cardName = purchaseString.name + "（已满级）";
    } else if (currentLevel >= 1) {
        cardName = purchaseString.name + "（升至" + getTalentLevelText(nextLevel) + "级）";
    } else {
        cardName = purchaseString.name + "（解锁" + getTalentLevelText(nextLevel) + "级）";
    }

    return {
        purchaseId: talent.purchaseId,
        currentLevel: currentLevel,
        maxLevel: maxLevel,
        nameText: currentLevel > 0 ? purchaseString.name + " " + currentLevel + "级" : purchaseString.name,
        titleText: purchaseString.name,
        cardTitleText: cardName,
        detailDescriptionText: purchaseString.des || "能力描述: 暂无",
        detailEffectText: "当前能力效果: " + currentEffectText + "\n下一阶段能力效果: " + nextEffectText,
        infoDialogText: tierLines.join("\n")
    };
}

function findExchangeConfigsByTarget(exchangeConfig, type, targetId) {
    const list = [];
    Object.keys(exchangeConfig || {}).forEach(function (exchangeId) {
        const config = exchangeConfig[exchangeId];
        if (!config || config.type !== type || parseInt(config.targetId, 10) !== parseInt(targetId, 10)) {
            return;
        }
        list.push({
            exchangeId: parseInt(exchangeId, 10),
            type: config.type,
            targetId: parseInt(config.targetId, 10),
            level: config.level === undefined ? 1 : parseInt(config.level, 10),
            cost: Number(config.cost) || 0,
            name: config.name || ""
        });
    });
    list.sort(function (a, b) {
        if (a.level !== b.level) {
            return a.level - b.level;
        }
        return a.exchangeId - b.exchangeId;
    });
    return list;
}

function getMedalStringConfig(getString, medalId) {
    const config = getString("m_" + medalId);
    if (config && typeof config === "object") {
        return {
            name: normalizeText(config.name || "成就 " + medalId),
            condition: normalizeText(config.condition || ""),
            des: normalizeText(config.des || "")
        };
    }
    return { name: "成就 " + medalId, condition: "", des: "" };
}

function compareMedalIds(medalConfig, a, b) {
    const configA = medalConfig[a] || {};
    const configB = medalConfig[b] || {};
    if ((configA.categoryId || 0) !== (configB.categoryId || 0)) {
        return (configA.categoryId || 0) - (configB.categoryId || 0);
    }
    if ((configA.seriesOrder || 0) !== (configB.seriesOrder || 0)) {
        return (configA.seriesOrder || 0) - (configB.seriesOrder || 0);
    }
    const numericSeriesA = Number(configA.seriesId);
    const numericSeriesB = Number(configB.seriesId);
    if (!isNaN(numericSeriesA) && !isNaN(numericSeriesB) && numericSeriesA !== numericSeriesB) {
        return numericSeriesA - numericSeriesB;
    }
    if (String(configA.seriesId) !== String(configB.seriesId)) {
        return String(configA.seriesId) > String(configB.seriesId) ? 1 : -1;
    }
    return (configB.stageLevel || 0) - (configA.stageLevel || 0);
}

function medalSeriesTitle(name) {
    return normalizeText(name || "")
        .replace(/（[^）]+）/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/^\s+|\s+$/g, "");
}

function buildAchievementPreview(medalConfig, getString, resolveSprite) {
    const categoryLabels = {
        1: "生存成就",
        2: "战斗成就",
        3: "探索成就"
    };
    const medalIds = Object.keys(medalConfig || {}).map(function (id) {
        return parseInt(id, 10);
    }).filter(function (id) {
        return Number.isFinite(id);
    }).sort(function (a, b) {
        return compareMedalIds(medalConfig, a, b);
    });

    const categoryMap = {};
    const seriesMap = {};
    const medals = medalIds.map(function (medalId) {
        const config = medalConfig[medalId] || {};
        const strings = getMedalStringConfig(getString, medalId);
        const categoryId = parseInt(config.categoryId, 10) || 0;
        const seriesId = String(config.seriesId);
        if (!categoryMap[categoryId]) {
            categoryMap[categoryId] = {
                id: categoryId,
                label: categoryLabels[categoryId] || ("分类 " + categoryId),
                count: 0
            };
        }
        categoryMap[categoryId].count++;
        const medal = {
            medalId: medalId,
            categoryId: categoryId,
            seriesId: seriesId,
            seriesOrder: Number(config.seriesOrder) || 0,
            stageLevel: Number(config.stageLevel) || 0,
            iconId: Number(config.iconId || config.categoryId || 1) || 1,
            progressKey: config.progressKey || "",
            progressScope: config.progressScope || "",
            aim: Number(config.aim) || 0,
            points: Number(config.points) || 0,
            effect: config.effect || null,
            strings: strings,
            icon: resolveSprite("medalIcon_" + (config.iconId || config.categoryId || 1) + ".png", null)
        };
        const seriesKey = categoryId + ":" + seriesId;
        if (!seriesMap[seriesKey]) {
            seriesMap[seriesKey] = {
                key: seriesKey,
                categoryId: categoryId,
                seriesId: seriesId,
                seriesOrder: Number(config.seriesOrder) || 0,
                title: medalSeriesTitle(strings.name) || strings.name || ("成就组 " + seriesId),
                iconId: medal.iconId,
                icon: medal.icon,
                stages: []
            };
        }
        seriesMap[seriesKey].stages.push(medal);
        return medal;
    });

    const series = Object.keys(seriesMap).map(function (key) {
        const entry = seriesMap[key];
        entry.stages.sort(function (a, b) {
            return compareMedalIds(medalConfig, a.medalId, b.medalId);
        });
        entry.totalPoints = entry.stages.reduce(function (sum, stage) {
            return sum + (Number(stage.points) || 0);
        }, 0);
        return entry;
    }).sort(function (a, b) {
        if (a.categoryId !== b.categoryId) {
            return a.categoryId - b.categoryId;
        }
        if (a.seriesOrder !== b.seriesOrder) {
            return a.seriesOrder - b.seriesOrder;
        }
        return String(a.seriesId) > String(b.seriesId) ? 1 : -1;
    });

    return {
        categories: Object.keys(categoryMap).map(function (id) { return categoryMap[id]; }).sort(function (a, b) { return a.id - b.id; }),
        series: series,
        medals: medals,
        texts: {
            title: "成就",
            points: "成就点",
            currentStage: "当前阶段",
            goal: "目标",
            reward: "奖励",
            claim: "领取 +",
            inProgress: "进行中",
            claimed: "已领取",
            notReady: "未达成",
            finishedAll: "本系列已全部完成"
        }
    };
}

function unionPush(list, value) {
    if (value !== null && value !== undefined && list.indexOf(value) === -1) {
        list.push(value);
    }
}

function buildPreviewData(outPath) {
    const strings = loadVar("assets/src/data/string/string_zh.js", "string");
    const roleConfigTable = loadVar("assets/src/data/roleConfigTable.js", "RoleConfigTable");
    const talentConfigTable = loadVar("assets/src/data/talentConfigTable.js", "TalentConfigTable");
    const purchaseList = loadVar("assets/src/plugin/purchaseList.js", "PurchaseList");
    const exchangeConfig = loadVar("assets/src/game/medal.js", "ExchangeAchievementConfig");
    const medalConfig = loadVar("assets/src/game/medal.js", "MedalConfig");
    const plistSprites = collectPlistSprites();
    const resolveSprite = createSpriteResolver(outPath, plistSprites);
    const getString = createStringGetter(strings);

    const roles = sortNumericKeys(roleConfigTable, function (config, id) {
        return Number.isFinite(config.selectionOrder) ? parseInt(config.selectionOrder, 10) : id;
    }).map(function (roleType) {
        const config = roleConfigTable[roleType] || {};
        const purchaseId = config.purchaseId === null || config.purchaseId === undefined ? null : parseInt(config.purchaseId, 10);
        const exchangeList = purchaseId ? findExchangeConfigsByTarget(exchangeConfig, "character", roleType) : [];
        const purchaseString = purchaseId ? getPurchaseStringConfig(getString, purchaseId) : null;
        const infoDescription = getRoleTextFromSource(getString, config.infoDescriptionSource, config.infoDescriptionStringId);
        const infoEffect = getRoleTextFromSource(getString, config.infoEffectSource, config.infoEffectStringId);
        return {
            roleType: roleType,
            purchaseId: purchaseId,
            exchangeCost: exchangeList.length ? exchangeList[0].cost : 0,
            name: normalizeText(getString(config.nameStringId)) || (purchaseString && purchaseString.name) || ("Role " + roleType),
            selectionDescription: normalizeText(getString(config.selectionDescriptionStringId)),
            infoDescription: infoDescription,
            infoEffect: infoEffect,
            avatarName: normalizeSpriteName(config.avatarFallback || ("npc_dig_" + roleType + ".png")),
            avatar: resolveSprite(config.avatarFallback || ("npc_dig_" + roleType + ".png"), "npc_dig_0.png"),
            mapIcon: resolveSprite("npc_" + (config.mapRoleType || roleType) + ".png", "npc_1.png"),
            purchaseIcon: purchaseId ? resolveSprite("icon_iap_" + purchaseId + ".png", "icon_iap_101.png") : null
        };
    });

    const emptyTalent = {
        purchaseId: 0,
        name: "无天赋",
        baseDescription: "保持默认生存配置。",
        baseEffect: "",
        levels: [{
            purchaseId: 0,
            currentLevel: 0,
            maxLevel: 0,
            nameText: "无天赋",
            titleText: "无天赋",
            cardTitleText: "无天赋",
            detailDescriptionText: "保持默认生存配置。",
            detailEffectText: "",
            infoDialogText: "保持默认生存配置。"
        }],
        icon: resolveSprite("icon_iap_0.png", "icon_iap_0.png"),
        exchangeCosts: []
    };

    const talents = [emptyTalent].concat(sortNumericKeys(talentConfigTable, function (config, id) {
        return Number.isFinite(config.displayOrder) ? parseInt(config.displayOrder, 10) : id;
    }).map(function (purchaseId) {
        const talent = talentConfigTable[purchaseId] || {};
        const purchaseString = getPurchaseStringConfig(getString, purchaseId);
        const maxLevel = Math.max(1, parseInt(talent.maxLevel || 3, 10) || 3);
        const levels = [];
        for (let level = 0; level <= maxLevel; level++) {
            levels.push(buildTalentDisplay({
                purchaseId: purchaseId,
                maxLevel: maxLevel,
                tierEffectTextList: talent.tierEffectTextList
            }, purchaseString, level));
        }
        return {
            purchaseId: purchaseId,
            name: purchaseString.name || ("ID " + purchaseId),
            baseDescription: purchaseString.des,
            baseEffect: purchaseString.effect,
            levels: levels,
            icon: resolveSprite("icon_iap_" + purchaseId + ".png", "icon_iap_0.png"),
            exchangeCosts: findExchangeConfigsByTarget(exchangeConfig, "talent", purchaseId).map(function (config) {
                return { level: config.level, cost: config.cost, exchangeId: config.exchangeId };
            })
        };
    }));

    const rolePurchaseIds = roles.map(function (roleInfo) { return roleInfo.purchaseId; }).filter(function (purchaseId) {
        return purchaseId && purchaseList[purchaseId];
    });
    const talentPurchaseIds = talents.map(function (talentInfo) { return talentInfo.purchaseId; }).filter(function (purchaseId) {
        return purchaseId > 0 && purchaseList[purchaseId];
    });
    const itemPurchaseIds = Object.keys(exchangeConfig || {}).map(function (exchangeId) {
        const config = exchangeConfig[exchangeId];
        if (!config || config.type !== "item") {
            return null;
        }
        const purchaseId = parseInt(config.targetId, 10);
        return purchaseList[purchaseId] ? purchaseId : null;
    }).filter(Boolean);
    const supportPurchaseIds = Object.keys(purchaseList || {}).map(function (purchaseId) {
        return parseInt(purchaseId, 10);
    }).filter(function (purchaseId) {
        return purchaseId >= 200;
    }).sort(function (a, b) { return a - b; });
    const mainShopIds = [];
    rolePurchaseIds.concat(itemPurchaseIds).concat(talentPurchaseIds).forEach(function (purchaseId) {
        unionPush(mainShopIds, purchaseId);
    });

    function getTalentPreview(purchaseId, level) {
        const talent = talents.filter(function (entry) { return entry.purchaseId === purchaseId; })[0];
        if (!talent) {
            return null;
        }
        const maxLevel = Math.max(0, talent.levels.length - 1);
        return talent.levels[Math.max(0, Math.min(maxLevel, level || 0))];
    }

    function getPurchasePreview(purchaseId, talentLevel) {
        const numericPurchaseId = parseInt(purchaseId, 10);
        const purchaseInfo = purchaseList[numericPurchaseId] || {};
        const strConfig = getPurchaseStringConfig(getString, numericPurchaseId);
        const roleInfo = roles.filter(function (entry) { return entry.purchaseId === numericPurchaseId; })[0];
        const talentInfo = talents.filter(function (entry) { return entry.purchaseId === numericPurchaseId; })[0];
        const itemExchangeList = findExchangeConfigsByTarget(exchangeConfig, "item", numericPurchaseId);
        const consumableExchangeList = findExchangeConfigsByTarget(exchangeConfig, "consumable", numericPurchaseId);
        const isSupport = numericPurchaseId >= 200;
        let title = strConfig.name || ("ID " + numericPurchaseId);
        let cardTitle = title;
        let icon = resolveSprite("icon_iap_" + numericPurchaseId + ".png", "icon_iap_101.png");
        let priceText = "";
        let type = "purchase";

        if (roleInfo) {
            title = roleInfo.name;
            cardTitle = title;
            icon = roleInfo.avatar;
            type = "role";
            priceText = (roleInfo.exchangeCost || 50) + " 成就点";
        } else if (talentInfo) {
            const talentPreview = getTalentPreview(numericPurchaseId, talentLevel || 0);
            title = talentPreview.titleText;
            cardTitle = talentPreview.cardTitleText;
            icon = talentInfo.icon;
            type = "talent";
            const costs = talentInfo.exchangeCosts || [];
            const nextCost = costs[Math.min(costs.length - 1, Math.max(0, talentLevel || 0))];
            priceText = nextCost ? (nextCost.cost + " 成就点") : "已满级";
        } else if (itemExchangeList.length) {
            type = "item";
            priceText = itemExchangeList[0].cost + " 成就点";
        } else if (consumableExchangeList.length) {
            type = "consumable";
            priceText = consumableExchangeList[0].cost + " 成就点";
        } else if (isSupport) {
            type = "support";
            const price = purchaseInfo.priceList && purchaseInfo.priceList[0] ? purchaseInfo.priceList[0].price : "";
            priceText = price !== "" ? (price + " 成就点") : "";
        }

        return {
            purchaseId: numericPurchaseId,
            type: type,
            title: title,
            cardTitle: cardTitle,
            description: normalizeText(strConfig.des || ""),
            effect: normalizeText(strConfig.effect || ""),
            priceText: priceText,
            icon: icon,
            missingPurchaseIcon: resolveSprite("icon_iap_" + numericPurchaseId + ".png", null).status === "missing",
            effectItems: Array.isArray(purchaseInfo.effect) ? purchaseInfo.effect.slice(0, 4).map(function (item) {
                return {
                    itemId: item.itemId,
                    num: item.num,
                    icon: resolveSprite("icon_item_" + item.itemId + ".png", "icon_item_1101051.png")
                };
            }) : []
        };
    }

    const allPurchaseIds = [];
    mainShopIds.concat(supportPurchaseIds).forEach(function (purchaseId) { unionPush(allPurchaseIds, purchaseId); });
    const purchases = allPurchaseIds.reduce(function (map, purchaseId) {
        map[purchaseId] = {
            level0: getPurchasePreview(purchaseId, 0),
            level1: getPurchasePreview(purchaseId, 1),
            level2: getPurchasePreview(purchaseId, 2),
            level3: getPurchasePreview(purchaseId, 3)
        };
        return map;
    }, {});

    const achievements = buildAchievementPreview(medalConfig, getString, resolveSprite);
    const statusDialogTemplate = getString("statusDialog") || {};
    const topStatusAttrs = [
        { attr: "injury", stringId: 10, nameKey: "injury_name" },
        { attr: "infect", stringId: 9, nameKey: "infect_name" },
        { attr: "starve", stringId: 6, nameKey: "starve_name" },
        { attr: "vigour", stringId: 7, nameKey: "vigour_name" },
        { attr: "spirit", stringId: 8, nameKey: "spirit_name" },
        { attr: "hp", stringId: 5, nameKey: null }
    ].map(function (entry) {
        const strConfig = getString(entry.stringId) || {};
        const names = entry.nameKey ? (getString(entry.nameKey) || []).filter(function (name) { return !!name; }) : [];
        const longestName = names.reduce(function (selected, name) {
            return String(name).length > String(selected || "").length ? name : selected;
        }, names[0] || "100/100");
        return {
            attr: entry.attr,
            title: normalizeText(strConfig.title) || entry.attr,
            description: normalizeText(strConfig.des),
            names: names,
            buttonText: normalizeText(longestName),
            numericText: entry.attr === "hp" ? "100/100" : "88/100",
            dialogCurrentText: normalizeText((statusDialogTemplate.title && statusDialogTemplate.title.txt_1) || "当前:%s").replace("%s", normalizeText(longestName)),
            icon: resolveSprite("icon_" + entry.attr + "_0.png", null)
        };
    });
    const exchangeEntries = Object.keys(exchangeConfig || {}).map(function (exchangeId) {
        const config = exchangeConfig[exchangeId] || {};
        const targetId = parseInt(config.targetId, 10);
        let targetTitle = config.name || "";
        let targetSubtitle = "";
        let icon = null;
        let purchase = null;
        if (config.type === "character") {
            const roleInfo = roles.filter(function (entry) { return entry.roleType === targetId; })[0];
            targetTitle = roleInfo ? roleInfo.name : (targetTitle || "角色 " + targetId);
            targetSubtitle = roleInfo ? roleInfo.infoEffect : "";
            icon = roleInfo ? roleInfo.avatar : resolveSprite("npc_dig_" + targetId + ".png", "npc_dig_0.png");
        } else if (config.type === "talent") {
            const talentInfo = talents.filter(function (entry) { return entry.purchaseId === targetId; })[0];
            const talentLevel = Math.max(0, (parseInt(config.level, 10) || 1) - 1);
            const levelInfo = talentInfo ? getTalentPreview(targetId, talentLevel) : null;
            targetTitle = levelInfo ? levelInfo.cardTitleText : (targetTitle || "天赋 " + targetId);
            targetSubtitle = levelInfo ? levelInfo.detailEffectText : "";
            icon = talentInfo ? talentInfo.icon : resolveSprite("icon_iap_" + targetId + ".png", "icon_iap_0.png");
        } else {
            purchase = getPurchasePreview(targetId, 0);
            targetTitle = purchase.title || targetTitle || ("购买 " + targetId);
            targetSubtitle = purchase.effect || purchase.description || "";
            icon = purchase.icon;
        }
        return {
            exchangeId: parseInt(exchangeId, 10),
            type: config.type || "unknown",
            targetId: targetId,
            level: config.level === undefined ? null : parseInt(config.level, 10),
            cost: Number(config.cost) || 0,
            name: config.name || targetTitle,
            targetTitle: targetTitle,
            targetSubtitle: normalizeText(targetSubtitle),
            icon: icon,
            purchase: purchase
        };
    }).sort(function (a, b) { return a.exchangeId - b.exchangeId; });

    const spriteRequests = [];
    function trackSprite(label, spriteMeta) {
        if (!spriteMeta) {
            return;
        }
        spriteRequests.push({
            label: label,
            requested: spriteMeta.requested,
            used: spriteMeta.name,
            fallback: spriteMeta.fallback,
            status: spriteMeta.status,
            usedFallback: !!spriteMeta.usedFallback,
            plist: spriteMeta.plist || "",
            url: spriteMeta.url || ""
        });
    }

    roles.forEach(function (roleInfo) {
        trackSprite("role portrait " + roleInfo.roleType + " " + roleInfo.name, roleInfo.avatar);
        trackSprite("role map icon " + roleInfo.roleType + " " + roleInfo.name, roleInfo.mapIcon);
        if (roleInfo.purchaseIcon) {
            trackSprite("role purchase icon " + roleInfo.purchaseId + " " + roleInfo.name, roleInfo.purchaseIcon);
        }
    });
    talents.forEach(function (talentInfo) {
        trackSprite("talent icon " + talentInfo.purchaseId + " " + talentInfo.name, talentInfo.icon);
    });
    allPurchaseIds.forEach(function (purchaseId) {
        trackSprite("purchase icon " + purchaseId, resolveSprite("icon_iap_" + purchaseId + ".png", "icon_iap_101.png"));
        const purchaseInfo = purchaseList[purchaseId] || {};
        if (Array.isArray(purchaseInfo.effect)) {
            purchaseInfo.effect.forEach(function (item) {
                trackSprite("purchase item icon " + purchaseId + " item " + item.itemId, resolveSprite("icon_item_" + item.itemId + ".png", "icon_item_1101051.png"));
            });
        }
    });
    achievements.medals.forEach(function (medalInfo) {
        trackSprite("medal icon " + medalInfo.medalId + " " + medalInfo.strings.name, medalInfo.icon);
    });

    const textProbes = [];
    topStatusAttrs.forEach(function (statusInfo) {
        textProbes.push({ id: "top-status-" + statusInfo.attr, group: "顶栏状态", label: statusInfo.title, text: statusInfo.title + "\n" + statusInfo.buttonText + "\n" + statusInfo.dialogCurrentText + "\n" + statusInfo.description, source: "TopFrameNode + StatusButton/AttrButton + statusDialog" });
    });
    roles.forEach(function (roleInfo) {
        textProbes.push({ id: "role-card-" + roleInfo.roleType, group: "角色", label: roleInfo.name + " / 选择卡", text: roleInfo.infoEffect || roleInfo.infoDescription || roleInfo.selectionDescription, source: "RoleTalentUiHelper.getRoleInfoViewModel + ChooseScene" });
        textProbes.push({ id: "role-dialog-" + roleInfo.roleType, group: "角色", label: roleInfo.name + " / 详情弹窗", text: (roleInfo.infoDescription || "") + "\n" + (roleInfo.infoEffect || ""), source: "RoleTalentUiHelper.showRoleInfoDialog" });
    });
    talents.forEach(function (talentInfo) {
        if (talentInfo.purchaseId === 0) {
            return;
        }
        talentInfo.levels.forEach(function (levelInfo) {
            textProbes.push({ id: "talent-" + talentInfo.purchaseId + "-" + levelInfo.currentLevel, group: "天赋", label: levelInfo.cardTitleText, text: levelInfo.detailDescriptionText + "\n" + levelInfo.detailEffectText + "\n" + levelInfo.infoDialogText, source: "PurchaseUiHelper.getTalentDisplayInfo + RoleTalentUiHelper.showTalentInfoDialog" });
        });
    });
    Object.keys(purchases).forEach(function (purchaseId) {
        const purchase = purchases[purchaseId].level0;
        textProbes.push({ id: "purchase-" + purchaseId, group: "商店", label: purchase.cardTitle, text: purchase.cardTitle + "\n" + purchase.description + "\n" + purchase.effect, source: "PurchaseUiHelper.createPayItemNode/showPayDialog" });
    });
    achievements.medals.forEach(function (medalInfo) {
        textProbes.push({ id: "medal-" + medalInfo.medalId, group: "成就", label: medalInfo.strings.name, text: medalInfo.strings.name + "\n" + medalInfo.strings.condition + "\n" + medalInfo.strings.des, source: "MedalSceneView._createSeriesPanel" });
    });

    const resourceIssues = spriteRequests.filter(function (entry) {
        return entry.status === "missing" || entry.usedFallback || entry.status === "standalone-only";
    });

    return {
        generatedAt: new Date().toISOString(),
        sourceRoot: ROOT_DIR,
        metrics: {
            viewport: { width: 640, height: 1000 },
            chooseScene: { roleCell: { width: 200, height: 320 }, talentNode: { width: 160, height: 200 }, talentNameTopPadding: 36 },
            topFrame: { width: 584, buttonWidth: 584 / 6, buttonHeight: 50, iconWidth: 32, minLabelFont: 14 },
            dialogs: {
                big: { width: 560, height: 650, titleHeight: 90, actionHeight: 72, contentPadding: 20 },
                small: { width: 520, height: 430, titleHeight: 90, actionHeight: 72, contentPadding: 20 },
                shopCard: { width: 246, height: 249, titleHeight: 44 },
                medalPanel: { width: 570, minHeight: 224, contentWidth: 386 }
            }
        },
        strings: {
            chooseRoleTitle: normalizeText(getString(1310)) || "选择角色",
            chooseTalentTitle: normalizeText(getString(1217)) || "选择天赋",
            back: normalizeText(getString(1193)) || "返回",
            ok: normalizeText(getString(1030)) || "确定",
            unlock: normalizeText(getString(1225)) || "去解锁"
        },
        roles: roles,
        talents: talents,
        shop: { mainPurchaseIds: mainShopIds, supportPurchaseIds: supportPurchaseIds, allPurchaseIds: allPurchaseIds },
        topStatus: {
            dialogCurrentTemplate: normalizeText((statusDialogTemplate.title && statusDialogTemplate.title.txt_1) || "当前:%s"),
            attrs: topStatusAttrs
        },
        purchases: purchases,
        achievements: achievements,
        exchange: {
            types: ["all", "character", "talent", "item", "consumable"],
            entries: exchangeEntries
        },
        textProbes: textProbes,
        resources: { spriteRequests: spriteRequests, issues: resourceIssues },
        simulator: {
            modules: [
                { id: "choose", title: "开始选择", refs: ["ChooseScene.js", "RoleTalentUiHelper.getRoleInfoViewModel", "RoleTalentUiHelper.getTalentRowViewModels"], purpose: "检查开始界面选人、选天赋和锁定状态的文案/图片/溢出。" },
                { id: "roleDialog", title: "角色弹窗", refs: ["RoleTalentUiHelper.showRoleInfoDialog", "DialogBig"], purpose: "检查角色详情说明和特性效果在 DialogBig 固定内容区里的表现。" },
                { id: "talentDialog", title: "天赋弹窗", refs: ["RoleTalentUiHelper.showTalentInfoDialog", "PurchaseUiHelper.getTalentDisplayInfo", "DialogSmall"], purpose: "检查天赋多级效果、未解锁入口和长文案。" },
                { id: "shop", title: "商店卡片", refs: ["PurchaseUiHelper.createPayItemNode", "PurchaseService.getMainShopPurchaseIds", "PurchaseList"], purpose: "检查商店卡片标题、图标、价格和礼包内容。" },
                { id: "topStatus", title: "顶栏状态", refs: ["TopFrameNode", "StatusButton", "AttrButton", "statusDialog"], purpose: "检查顶部状态按钮、感染/外伤等级名和点击弹窗标题是否超框。" },
                { id: "achievements", title: "成就墙", refs: ["MedalSceneView._createSeriesPanel", "MedalConfig", "string.m_*"], purpose: "模拟成就分类、阶段、进度、领取状态和奖励文案。" },
                { id: "exchange", title: "成就兑换", refs: ["ExchangeAchievementConfig", "PurchaseUiHelper", "Medal.exchangeAchievement"], purpose: "模拟角色、天赋、道具、消耗品的成就点兑换前端状态。" },
                { id: "textLab", title: "文案探针", refs: ["string_zh.js", "roleConfigTable.js", "talentConfigTable.js", "purchaseList.js", "medal.js"], purpose: "把高风险文案塞进常见固定尺寸文本框，快速找溢出。" },
                { id: "resources", title: "资源报告", refs: ["assets/res/*.plist", "assets/res/**", "SafetyHelper.safeLoadSprite"], purpose: "检查缺失、fallback 和 standalone-only 图片。" },
                { id: "sources", title: "场景索引", refs: ["tools/ui-preview/generate.js"], purpose: "查看每个模拟场景引用的真实前端入口，方便继续接入新验证点。" }
            ]
        }
    };
}

function escapeScriptJson(data) {
    return JSON.stringify(data, null, 2).replace(/</g, "\\u003c").replace(/-->/g, "--\\>");
}

function buildHtml(data) {
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BuriedTown UI Simulator</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0b0b;
      --panel: #171717;
      --panel-2: #242424;
      --panel-3: #303030;
      --ink: #f2f2f2;
      --muted: #aaa;
      --line: #444;
      --paper: #e8e1d2;
      --paper-2: #f4efdf;
      --paper-ink: #161616;
      --danger: #ff5c5c;
      --warn: #ffd166;
      --ok: #7bd88f;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.45 Arial, "Microsoft YaHei", sans-serif; }
    button, select, input { font: inherit; }
    .app { display: grid; grid-template-columns: 300px minmax(680px, 1fr); min-height: 100vh; }
    .sidebar { position: sticky; top: 0; height: 100vh; overflow: auto; padding: 16px; background: var(--panel); border-right: 1px solid #333; }
    .main { padding: 18px; overflow: auto; }
    h1 { margin: 0 0 4px; font-size: 20px; line-height: 1.2; font-weight: 700; }
    h2 { margin: 20px 0 10px; font-size: 15px; line-height: 1.2; }
    .meta, .section-note { color: var(--muted); font-size: 12px; }
    .tabs { display: grid; gap: 7px; margin-top: 14px; }
    .tab { width: 100%; border: 1px solid #3a3a3a; background: #202020; color: var(--ink); padding: 8px 10px; text-align: left; cursor: pointer; }
    .tab.active { border-color: #ddd; background: #303030; }
    .field { display: grid; gap: 5px; margin: 11px 0; }
    .field label { color: #ccc; font-size: 12px; }
    select, input { width: 100%; background: #252525; color: #fff; border: 1px solid #555; padding: 7px 8px; }
    input[type="range"] { padding: 0; }
    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
    .summary-card { padding: 10px; border: 1px solid #343434; background: #202020; }
    .summary-card strong { display: block; margin-bottom: 2px; font-size: 18px; }
    .summary-card.danger strong { color: var(--danger); }
    .summary-card.warn strong { color: var(--warn); }
    .stage-wrap { display: grid; justify-content: start; gap: 14px; }
    .stage { position: relative; width: 640px; min-height: 1000px; background: radial-gradient(circle at 50% 18%, rgba(255,255,255,0.08), transparent 24%), linear-gradient(#161616, #070707); border: 1px solid #444; overflow: hidden; }
    .screen-title { position: absolute; left: 0; width: 100%; color: #fff; text-align: center; font-size: 32px; font-weight: 700; text-shadow: 0 2px 3px #000; }
    .choose-role-title { top: 24px; }
    .choose-talent-title { top: 238px; font-size: 26px; }
    .role-strip { position: absolute; left: 20px; top: 70px; width: 600px; height: 320px; display: grid; grid-template-columns: repeat(3, 200px); }
    .role-cell { position: relative; width: 200px; height: 320px; padding: 0 10px; }
    .role-cell.side { opacity: 0.38; }
    .role-cell .name { height: 30px; color: #fff; text-align: center; font-size: 26px; line-height: 30px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .portrait-frame { position: absolute; left: 25px; top: 68px; width: 150px; height: 150px; border: 1px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.08); display: grid; place-items: center; overflow: hidden; }
    .portrait-frame img { max-width: 150px; max-height: 150px; object-fit: contain; }
    .placeholder { display: grid; place-items: center; width: 100%; height: 100%; min-height: 32px; color: #999; background: repeating-linear-gradient(45deg, #1f1f1f, #1f1f1f 8px, #282828 8px, #282828 16px); border: 1px dashed #555; text-align: center; padding: 8px; font-size: 12px; }
    .role-desc-anchor { position: absolute; left: 12px; right: 12px; bottom: 7px; height: 62px; border: 1px dashed rgba(255,255,255,0.22); overflow: hidden; }
    .role-desc-text { position: absolute; left: 0; right: 0; top: 31px; transform: translateY(-50%); color: #fff; font-size: 16px; line-height: 20px; text-align: center; white-space: pre-wrap; }
    .overflow { outline: 2px solid var(--danger); background: rgba(255, 92, 92, 0.13); }
    .talent-scroll { position: absolute; left: 0; right: 0; top: 345px; bottom: 120px; border-top: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
    .talent-grid { display: grid; grid-template-columns: repeat(3, 160px); column-gap: 40px; row-gap: 15px; justify-content: center; padding-top: 36px; }
    .talent-node { position: relative; width: 160px; height: 200px; }
    .talent-name { position: absolute; left: -30px; top: -34px; width: 220px; min-height: 24px; color: #fff; text-align: center; font-size: 16px; line-height: 19px; white-space: pre-wrap; border: 1px dashed transparent; }
    .talent-icon { position: absolute; left: 5px; top: 20px; width: 150px; height: 150px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.25); display: grid; place-items: center; }
    .talent-icon img { max-width: 92px; max-height: 92px; object-fit: contain; }
    .mark { position: absolute; right: 12px; bottom: 22px; width: 28px; height: 28px; border: 2px solid #fff; background: rgba(255,255,255,0.14); }
    .footer-buttons { position: absolute; left: 0; bottom: 30px; width: 100%; display: flex; justify-content: space-around; }
    .game-btn { width: 178px; height: 62px; display: grid; place-items: center; color: #111; background: var(--paper-2); border: 1px solid #777; font-size: 28px; }
    .dialog-stage, .flat-stage { width: 640px; min-height: 780px; background: linear-gradient(#101010, #060606); border: 1px solid #444; padding: 34px; }
    .dialog-stage { display: grid; place-items: center; }
    .dialog { position: relative; background: var(--paper); color: var(--paper-ink); border: 2px solid #b9ae96; box-shadow: 0 8px 30px rgba(0,0,0,0.45); }
    .dialog.big { width: 560px; min-height: 650px; }
    .dialog.small { width: 520px; min-height: 430px; }
    .dialog-title { height: 90px; display: flex; align-items: center; gap: 10px; padding: 0 20px; border-bottom: 1px solid rgba(0,0,0,0.15); font-size: 32px; font-weight: 700; }
    .dialog-title .icon { width: 56px; height: 56px; flex: 0 0 auto; display: grid; place-items: center; overflow: hidden; }
    .dialog-title .icon img { max-width: 56px; max-height: 56px; object-fit: contain; }
    .dialog-content { position: relative; margin: 0 20px; padding-top: 14px; white-space: pre-wrap; font-size: 20px; line-height: 25px; overflow: auto; }
    .dialog.big .dialog-content { height: 488px; }
    .dialog.small .dialog-content { height: 268px; }
    .dialog-effect { margin-top: 8px; color: #b01818; }
    .dialog-actions { height: 72px; display: flex; align-items: center; justify-content: center; gap: 28px; border-top: 1px solid rgba(0,0,0,0.15); }
    .dialog-actions .game-btn { height: 52px; font-size: 22px; background: #171717; color: #fff; }
    .shop-stage { width: 640px; min-height: 1000px; background: #121212; border: 1px solid #444; padding: 58px 24px 24px; }
    .top-status-stage { width: 640px; min-height: 780px; background: #101010; border: 1px solid #444; padding: 44px 28px; }
    .top-frame-sim { width: 584px; height: 66px; margin: 0 auto 24px; border: 1px solid #777; background: #191919; padding: 7px 0; }
    .top-row-sim { display: grid; grid-template-columns: repeat(6, 1fr); height: 50px; }
    .top-status-button { position: relative; min-width: 0; height: 50px; border-left: 1px solid rgba(255,255,255,0.08); overflow: hidden; }
    .top-status-button:first-child { border-left: 0; }
    .top-status-icon { position: absolute; left: 4px; top: 9px; width: 32px; height: 32px; display: grid; place-items: center; }
    .top-status-icon img { max-width: 32px; max-height: 32px; object-fit: contain; }
    .top-status-label { position: absolute; right: 4px; top: 14px; width: 56px; line-height: 22px; color: #fff; text-align: right; white-space: nowrap; transform-origin: right center; }
    .top-dialog-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .top-dialog-sample { min-height: 174px; background: var(--paper); color: var(--paper-ink); border: 2px solid #b9ae96; padding: 12px 14px; overflow: hidden; }
    .top-dialog-head { display: grid; grid-template-columns: 58px 1fr; gap: 10px; align-items: center; min-height: 72px; border-bottom: 1px solid rgba(0,0,0,0.16); }
    .top-dialog-icon { width: 54px; height: 54px; display: grid; place-items: center; overflow: hidden; }
    .top-dialog-icon img { max-width: 54px; max-height: 54px; object-fit: contain; }
    .top-dialog-text { min-width: 0; display: grid; gap: 2px; }
    .top-dialog-text strong, .top-dialog-text span { display: block; white-space: nowrap; transform-origin: left center; }
    .top-dialog-sample p { margin: 10px 0 0; font-size: 18px; line-height: 23px; white-space: pre-wrap; }
    .shop-grid { display: grid; grid-template-columns: repeat(2, 246px); gap: 10px 36px; justify-content: center; }
    .shop-card { position: relative; width: 246px; height: 249px; background: #ece5d4; color: #111; border: 2px solid #b8ad96; overflow: hidden; }
    .shop-title { position: absolute; left: 10px; top: 8px; width: 226px; height: 44px; font-size: 24px; line-height: 28px; text-align: center; white-space: pre-wrap; overflow: hidden; border: 1px dashed transparent; }
    .shop-icon { position: absolute; left: 28px; top: 60px; width: 190px; height: 122px; display: grid; place-items: center; }
    .shop-icon img { max-width: 170px; max-height: 120px; object-fit: contain; }
    .support-preview { display: grid; grid-template-columns: repeat(2, 48px); gap: 6px; place-content: center; }
    .support-preview img { max-width: 48px; max-height: 48px; }
    .price { position: absolute; right: 10px; bottom: 15px; font-size: 24px; }
    .badge { position: absolute; left: 10px; bottom: 14px; color: #b01818; font-size: 18px; }
    .medal-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
    .medal-title { font-size: 32px; font-weight: 700; }
    .medal-points { color: var(--warn); font-size: 22px; }
    .category-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
    .category-pill { padding: 8px 12px; border: 1px solid #666; color: #ddd; }
    .category-pill.active { border-color: #fff; color: #fff; }
    .medal-list, .exchange-list, .source-list, .probe-list { display: grid; gap: 10px; }
    .medal-panel { position: relative; width: 570px; min-height: 224px; padding: 18px 20px 18px 160px; border: 1px solid rgba(255,255,255,0.75); background: #090909; color: #fff; }
    .medal-icon { position: absolute; left: 28px; top: 28px; width: 100px; height: 100px; display: grid; place-items: center; }
    .medal-icon img { max-width: 90px; max-height: 90px; }
    .stage-badge { position: absolute; left: 42px; bottom: 20px; width: 72px; text-align: center; border: 1px solid rgba(255,255,255,0.7); padding: 5px 0; color: #ddd; }
    .medal-row-top { display: flex; justify-content: space-between; gap: 12px; }
    .medal-name { font-size: 28px; line-height: 32px; width: 310px; }
    .medal-count { width: 70px; text-align: right; font-size: 22px; }
    .medal-goal { margin-top: 8px; color: rgba(255,255,255,0.85); font-size: 19px; line-height: 23px; }
    .medal-current { margin-top: 14px; font-size: 22px; line-height: 27px; }
    .progress-line { height: 14px; margin: 8px 0; border: 1px solid #777; background: #333; }
    .progress-fill { height: 100%; background: #fff; }
    .medal-detail { color: rgba(255,255,255,0.72); font-size: 18px; line-height: 23px; white-space: pre-wrap; }
    .status-btn { display: inline-block; margin-top: 12px; min-width: 136px; padding: 9px 14px; border: 1px solid rgba(255,255,255,0.75); text-align: center; }
    .exchange-card { display: grid; grid-template-columns: 72px 1fr 104px; gap: 12px; align-items: center; padding: 12px; border: 1px solid #3a3a3a; background: #181818; }
    .exchange-icon { width: 72px; height: 72px; display: grid; place-items: center; background: #222; border: 1px solid #444; overflow: hidden; }
    .exchange-icon img { max-width: 70px; max-height: 70px; object-fit: contain; }
    .exchange-name { font-size: 20px; line-height: 25px; }
    .exchange-sub { margin-top: 3px; color: #bbb; white-space: pre-wrap; max-height: 52px; overflow: hidden; }
    .exchange-cost { text-align: right; }
    .exchange-state { margin-top: 6px; font-size: 12px; color: var(--ok); }
    .exchange-state.locked { color: var(--warn); }
    .probe-card, .source-card, .issue-list li { padding: 10px; border: 1px solid #333; background: #181818; }
    .probe-card code, .source-card code, .issue-list code { color: #fff; background: #111; padding: 1px 4px; }
    .probe-box-grid { display: grid; grid-template-columns: 180px 226px 1fr; gap: 12px; margin-top: 12px; }
    .probe-box { border: 1px dashed #666; padding: 8px; white-space: pre-wrap; overflow: hidden; }
    .probe-role { width: 180px; height: 86px; font-size: 20px; line-height: 24px; text-align: center; }
    .probe-shop { width: 226px; height: 44px; font-size: 24px; line-height: 28px; text-align: center; }
    .probe-dialog { height: 268px; font-size: 20px; line-height: 25px; }
    .issue-panel { width: 640px; padding: 12px; border: 1px solid #333; background: #171717; }
    .issue-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    @media (max-width: 980px) { .app { grid-template-columns: 1fr; } .sidebar { position: static; height: auto; } }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <h1>UI Simulator</h1>
      <div class="meta">Generated: <span id="generatedAt"></span></div>
      <div class="tabs" id="scenarioTabs"></div>
      <h2>Controls</h2>
      <div class="field"><label for="roleSelect">Role</label><select id="roleSelect"></select></div>
      <div class="field"><label for="talentSelect">Talent</label><select id="talentSelect"></select></div>
      <div class="field"><label for="talentLevel">Talent level: <span id="talentLevelValue">0</span></label><input id="talentLevel" type="range" min="0" max="3" value="0"></div>
      <div class="field"><label for="shopMode">Shop data</label><select id="shopMode"><option value="main">Main shop</option><option value="support">Support packs</option><option value="all">All purchases</option></select></div>
      <div class="field"><label for="achievementCategory">Achievement category</label><select id="achievementCategory"></select></div>
      <div class="field"><label for="achievementMode">Achievement state</label><select id="achievementMode"><option value="mixed">Mixed</option><option value="locked">In progress</option><option value="claimable">Claimable</option><option value="claimed">Claimed</option></select></div>
      <div class="field"><label for="achievementPoints">Achievement points: <span id="achievementPointsValue">60</span></label><input id="achievementPoints" type="range" min="0" max="500" step="5" value="60"></div>
      <div class="field"><label for="exchangeType">Exchange type</label><select id="exchangeType"></select></div>
      <div class="field"><label for="textProbeSelect">Text probe</label><select id="textProbeSelect"></select></div>
      <h2>Current Warnings</h2>
      <div class="summary">
        <div class="summary-card danger"><strong id="overflowCount">0</strong><span>overflows</span></div>
        <div class="summary-card warn"><strong id="resourceIssueCount">0</strong><span>resources</span></div>
      </div>
    </aside>
    <main class="main"><div id="preview"></div></main>
  </div>
  <script>
    window.__BT_UI_PREVIEW_DATA__ = ${escapeScriptJson(data)};
  </script>
  <script>
    const DATA = window.__BT_UI_PREVIEW_DATA__;
    const state = {
      tab: "choose",
      roleType: DATA.roles[0] ? DATA.roles[0].roleType : 6,
      talentId: DATA.talents[1] ? DATA.talents[1].purchaseId : 0,
      talentLevel: 0,
      shopMode: "main",
      achievementCategory: DATA.achievements.categories[0] ? DATA.achievements.categories[0].id : 1,
      achievementMode: "mixed",
      achievementPoints: 60,
      exchangeType: "all",
      textProbeId: DATA.textProbes[0] ? DATA.textProbes[0].id : ""
    };
    const preview = document.getElementById("preview");
    const roleSelect = document.getElementById("roleSelect");
    const talentSelect = document.getElementById("talentSelect");
    const talentLevel = document.getElementById("talentLevel");
    const talentLevelValue = document.getElementById("talentLevelValue");
    const shopMode = document.getElementById("shopMode");
    const achievementCategory = document.getElementById("achievementCategory");
    const achievementMode = document.getElementById("achievementMode");
    const achievementPoints = document.getElementById("achievementPoints");
    const achievementPointsValue = document.getElementById("achievementPointsValue");
    const exchangeType = document.getElementById("exchangeType");
    const textProbeSelect = document.getElementById("textProbeSelect");
    const renderers = {
      choose: renderChoose,
      roleDialog: renderRoleDialog,
      talentDialog: renderTalentDialog,
      shop: renderShop,
      achievements: renderAchievements,
      exchange: renderExchange,
      textLab: renderTextLab,
      topStatus: renderTopStatus,
      resources: renderResources,
      sources: renderSources
    };

    document.getElementById("generatedAt").textContent = DATA.generatedAt;
    document.getElementById("resourceIssueCount").textContent = DATA.resources.issues.length;

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function spriteHtml(sprite) {
      if (sprite && sprite.url) {
        return '<img src="' + escapeHtml(sprite.url) + '" alt="' + escapeHtml(sprite.name || "") + '">';
      }
      const label = sprite && sprite.name ? sprite.name : "missing";
      return '<div class="placeholder">' + escapeHtml(label) + '</div>';
    }
    function textUnits(char) {
      if (/[\u4e00-\u9fff]/.test(char)) return 1;
      if (/[A-Z0-9]/.test(char)) return 0.66;
      if (/[a-z]/.test(char)) return 0.52;
      if (/\s/.test(char)) return 0.3;
      return 0.5;
    }
    function estimateTextWidth(text, fontSize) {
      let units = 0;
      Array.prototype.forEach.call(String(text || ""), function (char) { units += textUnits(char); });
      return units * Math.max(1, fontSize);
    }
    function fitInlineText(text, width, baseFontSize, minFontSize) {
      let fontSize = baseFontSize;
      while (fontSize > minFontSize && estimateTextWidth(text, fontSize) > width) fontSize -= 1;
      const naturalWidth = estimateTextWidth(text, fontSize);
      const scale = naturalWidth > width ? width / naturalWidth : 1;
      return { fontSize: fontSize, scale: scale, overflow: naturalWidth * scale > width + 0.5 };
    }
    function estimateTextHeight(text, width, fontSize, lineHeight) {
      const unitWidth = Math.max(1, fontSize);
      const maxUnits = Math.max(1, width / unitWidth);
      const sourceLines = String(text || "").split("\\n");
      let lines = 0;
      sourceLines.forEach(function (line) {
        let current = 0;
        if (!line.length) { lines += 1; return; }
        Array.prototype.forEach.call(line, function (char) {
          const units = textUnits(char);
          if (current > 0 && current + units > maxUnits) { lines += 1; current = 0; }
          current += units;
        });
        lines += Math.max(1, current > 0 ? 1 : 0);
      });
      return lines * lineHeight;
    }
    function isOverflow(text, width, maxHeight, fontSize, lineHeight) {
      return estimateTextHeight(text, width, fontSize, lineHeight) > maxHeight;
    }
    function roleByType(roleType) { return DATA.roles.filter(function (role) { return String(role.roleType) === String(roleType); })[0] || DATA.roles[0]; }
    function talentById(purchaseId) { return DATA.talents.filter(function (talent) { return String(talent.purchaseId) === String(purchaseId); })[0] || DATA.talents[0]; }
    function talentLevelView(talent, level) {
      const levels = talent && talent.levels ? talent.levels : [];
      return levels[Math.max(0, Math.min(levels.length - 1, parseInt(level, 10) || 0))] || levels[0];
    }
    function probeById(id) { return DATA.textProbes.filter(function (probe) { return probe.id === id; })[0] || DATA.textProbes[0]; }

    function initTabs() {
      document.getElementById("scenarioTabs").innerHTML = DATA.simulator.modules.map(function (module) {
        return '<button class="tab" data-tab="' + escapeHtml(module.id) + '">' + escapeHtml(module.title) + '</button>';
      }).join("");
      document.querySelectorAll(".tab").forEach(function (button) {
        button.addEventListener("click", function () { setTab(button.dataset.tab); });
      });
    }
    function initControls() {
      roleSelect.innerHTML = DATA.roles.map(function (role) { return '<option value="' + role.roleType + '">' + escapeHtml(role.roleType + " - " + role.name) + '</option>'; }).join("");
      roleSelect.value = state.roleType;
      talentSelect.innerHTML = DATA.talents.map(function (talent) { return '<option value="' + talent.purchaseId + '">' + escapeHtml(talent.purchaseId + " - " + talent.name) + '</option>'; }).join("");
      talentSelect.value = state.talentId;
      achievementCategory.innerHTML = DATA.achievements.categories.map(function (category) { return '<option value="' + category.id + '">' + escapeHtml(category.label + " (" + category.count + ")") + '</option>'; }).join("");
      achievementCategory.value = state.achievementCategory;
      exchangeType.innerHTML = DATA.exchange.types.map(function (type) {
        const labels = { all: "All", character: "角色", talent: "天赋", item: "道具", consumable: "消耗品" };
        return '<option value="' + type + '">' + escapeHtml(labels[type] || type) + '</option>';
      }).join("");
      exchangeType.value = state.exchangeType;
      textProbeSelect.innerHTML = DATA.textProbes.map(function (probe) { return '<option value="' + escapeHtml(probe.id) + '">' + escapeHtml(probe.group + " - " + probe.label) + '</option>'; }).join("");
      textProbeSelect.value = state.textProbeId;
    }

    function renderRoleCell(role, mode) {
      const text = role.selectionDescription || role.infoDescription || role.infoEffect;
      const overflow = isOverflow(text, 176, 62, 16, 20);
      return '<div class="role-cell ' + (mode || "") + '" data-overflow="' + (overflow ? "1" : "0") + '">'
        + '<div class="name">' + escapeHtml(role.name) + '</div>'
        + '<div class="portrait-frame">' + spriteHtml(role.avatar) + '</div>'
        + '<div class="role-desc-anchor ' + (overflow ? "overflow" : "") + '"><div class="role-desc-text">' + escapeHtml(text) + '</div></div>'
        + '</div>';
    }
    function renderChoose() {
      const selectedIndex = Math.max(0, DATA.roles.findIndex(function (role) { return String(role.roleType) === String(state.roleType); }));
      const left = DATA.roles[(selectedIndex - 1 + DATA.roles.length) % DATA.roles.length];
      const selected = DATA.roles[selectedIndex];
      const right = DATA.roles[(selectedIndex + 1) % DATA.roles.length];
      const selectedTalentIds = [0, state.talentId].filter(function (value, index, list) { return list.indexOf(value) === index; });
      const talentNodes = DATA.talents.map(function (talent) {
        const levelView = talentLevelView(talent, talent.purchaseId === state.talentId ? state.talentLevel : 0);
        const nameText = levelView ? levelView.nameText : talent.name;
        const overflow = isOverflow(nameText, 220, DATA.metrics.chooseScene.talentNameTopPadding, 16, 19);
        return '<div class="talent-node" data-overflow="' + (overflow ? "1" : "0") + '">'
          + '<div class="talent-name ' + (overflow ? "overflow" : "") + '">' + escapeHtml(nameText) + '</div>'
          + '<div class="talent-icon">' + spriteHtml(talent.icon) + '</div>'
          + (selectedTalentIds.indexOf(talent.purchaseId) !== -1 ? '<div class="mark"></div>' : '')
          + '</div>';
      }).join("");
      preview.innerHTML = '<div class="stage-wrap"><div class="stage">'
        + '<div class="screen-title choose-role-title">' + escapeHtml(DATA.strings.chooseRoleTitle) + '</div>'
        + '<div class="role-strip">' + renderRoleCell(left, "side") + renderRoleCell(selected, "") + renderRoleCell(right, "side") + '</div>'
        + '<div class="screen-title choose-talent-title">' + escapeHtml(DATA.strings.chooseTalentTitle) + '</div>'
        + '<div class="talent-scroll"><div class="talent-grid">' + talentNodes + '</div></div>'
        + '<div class="footer-buttons"><div class="game-btn">' + escapeHtml(DATA.strings.back) + '</div><div class="game-btn">' + escapeHtml(DATA.strings.ok) + '</div></div>'
        + '</div><div class="section-note">Scenario refs: ChooseScene + RoleTalentUiHelper data projection. Red boxes are estimated fixed-frame overflows.</div></div>';
    }
    function renderRoleDialog() {
      const role = roleByType(state.roleType);
      const des = role.infoDescription || "";
      const effect = role.infoEffect || "";
      const fullText = des + (effect ? "\\n" + effect : "");
      const overflow = false;
      preview.innerHTML = '<div class="stage-wrap"><div class="dialog-stage"><div class="dialog big">'
        + '<div class="dialog-title"><div class="icon">' + spriteHtml(role.mapIcon) + '</div><div>' + escapeHtml(role.name) + '</div></div>'
        + '<div class="dialog-content ' + (overflow ? "overflow" : "") + '">' + escapeHtml(des) + (effect ? '<div class="dialog-effect">' + escapeHtml(effect) + '</div>' : '') + '</div>'
        + '<div class="dialog-actions"><div class="game-btn">' + escapeHtml(DATA.strings.ok) + '</div>' + (role.purchaseId ? '<div class="game-btn">' + escapeHtml(DATA.strings.unlock) + '</div>' : '') + '</div>'
        + '</div></div><div class="section-note">Scenario refs: RoleTalentUiHelper.showRoleInfoDialog + DialogBig. Runtime now puts long role text in a clipped vertical scroll view.</div></div>';
    }
    function renderTalentDialog() {
      const talent = talentById(state.talentId);
      const levelView = talentLevelView(talent, state.talentLevel);
      const title = levelView ? levelView.titleText : talent.name;
      const text = levelView ? ((levelView.detailDescriptionText || "") + "\\n\\n" + (levelView.infoDialogText || levelView.detailEffectText || "")) : "";
      const overflow = false;
      preview.innerHTML = '<div class="stage-wrap"><div class="dialog-stage"><div class="dialog small">'
        + '<div class="dialog-title"><div class="icon">' + spriteHtml(talent.icon) + '</div><div>' + escapeHtml(title) + '</div></div>'
        + '<div class="dialog-content ' + (overflow ? "overflow" : "") + '">' + escapeHtml(text) + '</div>'
        + '<div class="dialog-actions"><div class="game-btn">' + escapeHtml(DATA.strings.ok) + '</div>' + (talent.purchaseId ? '<div class="game-btn">' + escapeHtml(DATA.strings.unlock) + '</div>' : '') + '</div>'
        + '</div></div><div class="section-note">Scenario refs: RoleTalentUiHelper.showTalentInfoDialog + PurchaseUiHelper.getTalentDisplayInfo + DialogSmall. Runtime now puts long talent text in a clipped vertical scroll view.</div></div>';
    }
    function supportPreviewHtml(purchase) {
      if (!purchase.effectItems || !purchase.effectItems.length) return spriteHtml(purchase.icon);
      return '<div class="support-preview">' + purchase.effectItems.map(function (item) {
        if (item.icon && item.icon.url) return '<img src="' + escapeHtml(item.icon.url) + '" alt="' + escapeHtml(item.icon.name || item.itemId) + '">';
        return '<span class="placeholder">' + escapeHtml((item.icon && item.icon.name) || item.itemId) + '</span>';
      }).join("") + '</div>';
    }
    function renderTopStatus() {
      const metrics = DATA.metrics.topFrame;
      const buttonLabelWidth = metrics.buttonWidth - metrics.iconWidth - 8;
      const buttons = DATA.topStatus.attrs.map(function (statusInfo) {
        const fit = fitInlineText(statusInfo.buttonText, buttonLabelWidth, 24, metrics.minLabelFont);
        return '<div class="top-status-button" data-overflow="' + (fit.overflow ? "1" : "0") + '">'
          + '<div class="top-status-icon">' + spriteHtml(statusInfo.icon) + '</div>'
          + '<div class="top-status-label ' + (fit.overflow ? "overflow" : "") + '" style="font-size:' + fit.fontSize + 'px; transform:scale(' + fit.scale.toFixed(3) + ');">' + escapeHtml(statusInfo.buttonText) + '</div></div>';
      }).join("");
      const dialogs = DATA.topStatus.attrs.map(function (statusInfo) {
        const currentFit = fitInlineText(statusInfo.dialogCurrentText, 392, 20, 16);
        const titleFit = fitInlineText(statusInfo.title, 392, 32, 20);
        const overflow = currentFit.overflow || titleFit.overflow;
        return '<div class="top-dialog-sample" data-overflow="' + (overflow ? "1" : "0") + '">'
          + '<div class="top-dialog-head"><div class="top-dialog-icon">' + spriteHtml(statusInfo.icon) + '</div><div class="top-dialog-text"><strong style="font-size:' + titleFit.fontSize + 'px; transform:scale(' + titleFit.scale.toFixed(3) + ');">' + escapeHtml(statusInfo.title) + '</strong><span class="' + (currentFit.overflow ? "overflow" : "") + '" style="font-size:' + currentFit.fontSize + 'px; transform:scale(' + currentFit.scale.toFixed(3) + ');">' + escapeHtml(statusInfo.dialogCurrentText) + '</span></div></div>'
          + '<p>' + escapeHtml(statusInfo.description) + '</p></div>';
      }).join("");
      preview.innerHTML = '<div class="stage-wrap"><div class="top-status-stage"><div class="top-frame-sim"><div class="top-row-sim">' + buttons + '</div></div><div class="top-dialog-grid">' + dialogs + '</div></div><div class="section-note">Scenario refs: TopFrameNode + StatusButton/AttrButton + statusDialog. Runtime now shrinks single-line status labels and title metadata before positioning.</div></div>';
    }
    function renderShop() {
      let purchaseIds = DATA.shop.mainPurchaseIds;
      if (state.shopMode === "support") purchaseIds = DATA.shop.supportPurchaseIds;
      if (state.shopMode === "all") purchaseIds = DATA.shop.allPurchaseIds;
      const cards = purchaseIds.map(function (purchaseId) {
        const variants = DATA.purchases[purchaseId] || {};
        const purchase = variants["level" + state.talentLevel] || variants.level0;
        if (!purchase) return "";
        const titleOverflow = isOverflow(purchase.cardTitle, 226, 44, 16, 20);
        return '<div class="shop-card" data-overflow="' + (titleOverflow ? "1" : "0") + '">'
          + '<div class="shop-title ' + (titleOverflow ? "overflow" : "") + '">' + escapeHtml(purchase.cardTitle) + '</div>'
          + '<div class="shop-icon">' + (purchase.type === "support" || purchase.type === "consumable" ? supportPreviewHtml(purchase) : spriteHtml(purchase.icon)) + '</div>'
          + '<div class="badge">' + (purchase.missingPurchaseIcon ? 'missing icon' : '') + '</div>'
          + '<div class="price">' + escapeHtml(purchase.priceText || "") + '</div></div>';
      }).join("");
      preview.innerHTML = '<div class="stage-wrap"><div class="shop-stage"><div class="shop-grid">' + cards + '</div></div><div class="section-note">Scenario refs: PurchaseUiHelper.createPayItemNode. Runtime now shrinks card title font before clipping to the fixed 44px title box.</div></div>';
    }
    function getSeriesSimState(series, index) {
      const stages = series.stages || [];
      const mode = state.achievementMode === "mixed" ? (["locked", "claimable", "claimed"][index % 3]) : state.achievementMode;
      const stage = mode === "claimed" ? stages[stages.length - 1] : stages[0];
      const aim = stage ? stage.aim : 0;
      const progress = mode === "locked" ? Math.max(0, Math.floor(aim * 0.42)) : aim;
      const completed = mode !== "locked";
      const claimed = mode === "claimed";
      return { mode: mode, activeStage: stage, progress: progress, completed: completed, claimed: claimed, claimedCount: claimed ? stages.length : 0, claimableCount: mode === "claimable" ? 1 : 0 };
    }
    function renderAchievements() {
      const categoryId = parseInt(state.achievementCategory, 10);
      const categories = DATA.achievements.categories.map(function (category) {
        return '<div class="category-pill ' + (category.id === categoryId ? "active" : "") + '">' + escapeHtml(category.label) + '</div>';
      }).join("");
      const seriesList = DATA.achievements.series.filter(function (series) { return series.categoryId === categoryId; });
      const rows = seriesList.map(function (series, index) {
        const sim = getSeriesSimState(series, index);
        const stage = sim.activeStage || series.stages[0];
        const strings = stage ? stage.strings : { name: series.title, condition: "", des: "" };
        const currentText = sim.claimed ? DATA.achievements.texts.finishedAll : DATA.achievements.texts.currentStage + "  " + strings.name;
        const goalText = strings.condition ? DATA.achievements.texts.goal + ": " + strings.condition : DATA.achievements.texts.goal;
        const detailText = (strings.des || "") + (stage && stage.points ? "  " + DATA.achievements.texts.reward + ": +" + stage.points + "点" : "");
        const titleOverflow = isOverflow(series.title, 310, 36, 28, 32);
        const goalOverflow = isOverflow(goalText, 386, 46, 19, 23);
        const detailOverflow = isOverflow(detailText, 386, 46, 18, 23);
        const percent = stage && stage.aim ? Math.max(0, Math.min(100, Math.round(sim.progress / stage.aim * 100))) : 0;
        let statusText = DATA.achievements.texts.inProgress;
        if (sim.mode === "claimable") statusText = DATA.achievements.texts.claim + (stage ? stage.points : 0) + "点";
        if (sim.mode === "claimed") statusText = DATA.achievements.texts.claimed;
        return '<div class="medal-panel" data-overflow="' + (titleOverflow || goalOverflow || detailOverflow ? "1" : "0") + '">'
          + '<div class="medal-icon">' + spriteHtml(series.icon) + '</div><div class="stage-badge">Lv ' + escapeHtml(stage ? stage.stageLevel : "") + '</div>'
          + '<div class="medal-row-top"><div class="medal-name ' + (titleOverflow ? "overflow" : "") + '">' + escapeHtml(series.title) + '</div><div class="medal-count">' + sim.claimedCount + '/' + series.stages.length + '</div></div>'
          + '<div class="medal-goal ' + (goalOverflow ? "overflow" : "") + '">' + escapeHtml(goalText) + '</div>'
          + '<div class="medal-current">' + escapeHtml(currentText) + '</div>'
          + '<div class="progress-line"><div class="progress-fill" style="width:' + percent + '%"></div></div>'
          + '<div class="medal-detail ' + (detailOverflow ? "overflow" : "") + '">' + escapeHtml(detailText) + '</div>'
          + '<div class="status-btn">' + escapeHtml(statusText) + '</div></div>';
      }).join("");
      preview.innerHTML = '<div class="stage-wrap"><div class="flat-stage"><div class="medal-header"><div class="medal-title">' + escapeHtml(DATA.achievements.texts.title) + '</div><div class="medal-points">' + escapeHtml(DATA.achievements.texts.points) + ': ' + state.achievementPoints + '</div></div><div class="category-tabs">' + categories + '</div><div class="medal-list">' + rows + '</div></div><div class="section-note">Scenario refs: MedalSceneView._createSeriesPanel. State is simulated through the sidebar controls.</div></div>';
    }
    function renderExchange() {
      const entries = DATA.exchange.entries.filter(function (entry) { return state.exchangeType === "all" || entry.type === state.exchangeType; });
      const rows = entries.map(function (entry) {
        const enough = state.achievementPoints >= entry.cost;
        const titleOverflow = isOverflow(entry.name, 320, 30, 20, 25);
        const subOverflow = isOverflow(entry.targetSubtitle, 320, 52, 14, 18);
        return '<div class="exchange-card" data-overflow="' + (titleOverflow || subOverflow ? "1" : "0") + '">'
          + '<div class="exchange-icon">' + spriteHtml(entry.icon) + '</div>'
          + '<div><div class="exchange-name ' + (titleOverflow ? "overflow" : "") + '">' + escapeHtml(entry.name) + '</div><div class="exchange-sub ' + (subOverflow ? "overflow" : "") + '">' + escapeHtml(entry.targetTitle + (entry.level ? " / Lv " + entry.level : "") + "\\n" + (entry.targetSubtitle || "")) + '</div></div>'
          + '<div class="exchange-cost"><strong>' + entry.cost + '</strong><br>成就点<div class="exchange-state ' + (enough ? "" : "locked") + '">' + (enough ? "可兑换" : "点数不足") + '</div></div></div>';
      }).join("");
      preview.innerHTML = '<div class="stage-wrap"><div class="flat-stage"><div class="medal-header"><div class="medal-title">成就兑换</div><div class="medal-points">成就点: ' + state.achievementPoints + '</div></div><div class="exchange-list">' + rows + '</div></div><div class="section-note">Scenario refs: ExchangeAchievementConfig + PurchaseUiHelper display projection. This simulates frontend state, not actual purchase mutation.</div></div>';
    }
    function renderTextLab() {
      const probe = probeById(state.textProbeId);
      const text = probe ? probe.text : "";
      const roleOverflow = isOverflow(text, 180, 86, 20, 24);
      const shopOverflow = isOverflow(text, 226, 44, 24, 28);
      const dialogOverflow = isOverflow(text, 480, 268, 20, 25);
      preview.innerHTML = '<div class="stage-wrap"><div class="flat-stage"><div class="probe-list"><div class="probe-card"><strong>' + escapeHtml(probe ? probe.label : "") + '</strong><br><span class="meta">' + escapeHtml(probe ? probe.source : "") + '</span><div class="probe-box-grid">'
        + '<div class="probe-box probe-role ' + (roleOverflow ? "overflow" : "") + '" data-overflow="' + (roleOverflow ? "1" : "0") + '">' + escapeHtml(text) + '</div>'
        + '<div class="probe-box probe-shop ' + (shopOverflow ? "overflow" : "") + '" data-overflow="' + (shopOverflow ? "1" : "0") + '">' + escapeHtml(text) + '</div>'
        + '<div class="probe-box probe-dialog ' + (dialogOverflow ? "overflow" : "") + '" data-overflow="' + (dialogOverflow ? "1" : "0") + '">' + escapeHtml(text) + '</div>'
        + '</div></div></div></div><div class="section-note">Text probe feeds the same text into role card, shop title, and DialogSmall-sized boxes.</div></div>';
    }
    function renderResources() {
      const issues = DATA.resources.issues;
      preview.innerHTML = '<div class="stage-wrap"><div class="issue-panel"><h2>Resource issues</h2><ul class="issue-list">'
        + issues.map(function (issue) {
          return '<li><strong>' + escapeHtml(issue.label) + '</strong><br>requested <code>' + escapeHtml(issue.requested || "") + '</code>, used <code>' + escapeHtml(issue.used || "") + '</code>, status <code>' + escapeHtml(issue.status) + '</code>' + (issue.usedFallback ? '<br>fallback <code>' + escapeHtml(issue.fallback) + '</code>' : '') + (issue.plist ? '<br>plist <code>' + escapeHtml(issue.plist) + '</code>' : '') + '</li>';
        }).join("") + '</ul></div><div class="section-note">standalone-only assets can be shown by this HTML simulator, but they are absent from the plist path and should be checked on device.</div></div>';
    }
    function renderSources() {
      preview.innerHTML = '<div class="stage-wrap"><div class="flat-stage"><h2>Simulation scenarios</h2><div class="source-list">' + DATA.simulator.modules.map(function (module) {
        return '<div class="source-card"><strong>' + escapeHtml(module.title) + '</strong><br>' + escapeHtml(module.purpose) + '<br><span class="meta">refs: ' + module.refs.map(function (ref) { return '<code>' + escapeHtml(ref) + '</code>'; }).join(" ") + '</span></div>';
      }).join("") + '</div></div><div class="section-note">This platform references real data/config entrypoints and approximates Cocos fixed-size UI boxes in HTML.</div></div>';
    }
    function setTab(tab) {
      state.tab = tab;
      document.querySelectorAll(".tab").forEach(function (button) { button.classList.toggle("active", button.dataset.tab === tab); });
      render();
    }
    function render() {
      talentLevelValue.textContent = state.talentLevel;
      achievementPointsValue.textContent = state.achievementPoints;
      const renderer = renderers[state.tab] || renderChoose;
      renderer();
      const overflowCount = preview.querySelectorAll('[data-overflow="1"]').length;
      document.getElementById("overflowCount").textContent = overflowCount;
    }

    initTabs();
    initControls();
    roleSelect.addEventListener("change", function () { state.roleType = parseInt(roleSelect.value, 10); render(); });
    talentSelect.addEventListener("change", function () {
      state.talentId = parseInt(talentSelect.value, 10);
      const talent = talentById(state.talentId);
      talentLevel.max = Math.max(0, (talent.levels ? talent.levels.length - 1 : 0));
      state.talentLevel = Math.min(state.talentLevel, parseInt(talentLevel.max, 10));
      talentLevel.value = state.talentLevel;
      render();
    });
    talentLevel.addEventListener("input", function () { state.talentLevel = parseInt(talentLevel.value, 10) || 0; render(); });
    shopMode.addEventListener("change", function () { state.shopMode = shopMode.value; render(); });
    achievementCategory.addEventListener("change", function () { state.achievementCategory = parseInt(achievementCategory.value, 10); render(); });
    achievementMode.addEventListener("change", function () { state.achievementMode = achievementMode.value; render(); });
    achievementPoints.addEventListener("input", function () { state.achievementPoints = parseInt(achievementPoints.value, 10) || 0; render(); });
    exchangeType.addEventListener("change", function () { state.exchangeType = exchangeType.value; render(); });
    textProbeSelect.addEventListener("change", function () { state.textProbeId = textProbeSelect.value; render(); });
    setTab(state.tab);
  </script>
</body>
</html>
`;
}

function main() {
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed.help) {
        printHelp();
        return;
    }
    if (parsed.error) {
        console.error(parsed.error);
        console.error("");
        printHelp();
        process.exit(1);
    }

    const outPath = parsed.out || DEFAULT_OUT;
    const data = buildPreviewData(outPath);
    if (parsed.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buildHtml(data), "utf8");
    console.log("UI simulator generated: " + outPath);
    console.log("Scenarios: " + data.simulator.modules.length);
    console.log("Resource issues: " + data.resources.issues.length);
}

main();
