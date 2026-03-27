var getPurchaseUiService = function () {
    return GameKernel.require("PurchaseService", "PurchaseUiHelper.js");
};

var getPurchaseUiRuntimeEmitter = function () {
    return GameRuntime.getEmitter();
};

var PurchaseUiHelper = {
    getDisplayIconMeta: function (purchaseId, purchaseConfig) {
        var roleType = this.getRoleTypeByPurchaseId(purchaseId);
        if (roleType) {
            return {
                type: "role",
                roleType: roleType,
                iconName: uiUtil.getRolePortraitFrameName(roleType, false),
                fallbackName: uiUtil.getDefaultSpriteName("character", false)
            };
        }
        return {
            type: purchaseId >= 200 ? "support" : "purchase",
            roleType: null,
            iconName: uiUtil.getPurchaseIconFrameName(purchaseId, false),
            fallbackName: uiUtil.getDefaultSpriteName("purchase", false),
            purchaseConfig: purchaseConfig || null
        };
    },

    createDisplayIcon: function (purchaseId, purchaseConfig) {
        var meta = this.getDisplayIconMeta(purchaseId, purchaseConfig);
        var icon = null;

        if (meta.type === "role") {
            icon = uiUtil.getCharacterPortraitSpriteByRoleType(meta.roleType, meta.fallbackName);
        } else if (meta.type === "support") {
            icon = uiUtil.getSpriteByNameOptional(meta.iconName);
            if (!icon) {
                icon = uiUtil.createSupportPackPreviewIcon(purchaseConfig ? purchaseConfig.effect : null);
            }
        } else {
            icon = uiUtil.getPurchaseIconSprite(purchaseId, meta.fallbackName);
        }

        if (!icon) {
            icon = new cc.Sprite();
        }

        return {
            icon: icon,
            isRolePortrait: meta.type === "role",
            isSupportPackIcon: meta.type === "support"
        };
    },

    getTitleIconConfig: function (purchaseId, purchaseConfig) {
        var meta = this.getDisplayIconMeta(purchaseId, purchaseConfig);
        if (meta.type === "role") {
            return {
                // Shop cards keep the large dig portrait, while the text-heavy pay dialog
                // uses the compact npc head icon in its title bar.
                iconName: uiUtil.getNpcMapFrameName(meta.roleType, true),
                fallbackName: "#npc_1.png"
            };
        }
        if (meta.type === "support" && purchaseConfig && purchaseConfig.effect && purchaseConfig.effect.length > 0) {
            return {
                iconName: uiUtil.getItemIconFrameName(purchaseConfig.effect[0].itemId, true),
                fallbackName: uiUtil.getDefaultSpriteName("item", true)
            };
        }
        return {
            iconName: meta.iconName,
            fallbackName: meta.fallbackName
        };
    },

    isOperatorPromoPurchase: function (purchaseId, shopState) {
        return !!this.getPurchaseUiSnapshot(purchaseId, null, shopState).isOperatorPromoPurchase;
    },

    getPurchaseDisplayName: function (purchaseId, defaultName, shopState) {
        var displayNameOverride = this.getPurchaseUiSnapshot(purchaseId, null, shopState).displayNameOverride;
        if (displayNameOverride) {
            return displayNameOverride;
        }
        return defaultName || "";
    },

    shouldShowSaleIcon: function (purchaseId, shopState) {
        return !!this.getPurchaseUiSnapshot(purchaseId, null, shopState).showSaleIcon;
    },
    getPurchaseStringConfig: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)) {
            return {
                name: "",
                des: "",
                effect: ""
            };
        }

        var strConfig = stringUtil.getString("p_" + purchaseId);
        if (!strConfig || typeof strConfig !== "object") {
            strConfig = {};
        } else {
            strConfig = utils.clone(strConfig);
        }

        if (typeof strConfig.name !== "string" || strConfig.name.length === 0) {
            strConfig.name = "ID " + purchaseId;
        }
        if (typeof strConfig.des !== "string") {
            strConfig.des = "";
        }
        if (typeof strConfig.effect !== "string") {
            strConfig.effect = "";
        }

        if (/^ID\s+\d+$/.test(strConfig.name)
            && typeof ConfigValidator !== "undefined"
            && ConfigValidator
            && typeof ConfigValidator.warnIfInvalid === "function") {
            if (this.isTalentPurchase(purchaseId)) {
                ConfigValidator.warnIfInvalid("talent", purchaseId, "PurchaseUiHelper.getPurchaseStringConfig");
            } else {
                var roleType = this.getRoleTypeByPurchaseId(purchaseId);
                if (roleType !== null && roleType !== undefined) {
                    ConfigValidator.warnIfInvalid("role", roleType, "PurchaseUiHelper.getPurchaseStringConfig");
                }
            }
        }

        if (/^ID\s+\d+$/.test(strConfig.name)) {
            var exchangeConfig = this.getPrimaryExchangeConfigByPurchaseId(purchaseId);
            if (exchangeConfig && exchangeConfig.type === "character") {
                var roleInfo = null;
                if (typeof role !== "undefined" && role && typeof role.getRoleInfo === "function") {
                    roleInfo = role.getRoleInfo(exchangeConfig.targetId);
                }
                if (roleInfo) {
                    strConfig.name = roleInfo.name || strConfig.name;
                    if (!strConfig.des) {
                        strConfig.des = roleInfo.des || "";
                    }
                    if (!strConfig.effect) {
                        strConfig.effect = roleInfo.effect || "";
                    }
                } else if (exchangeConfig.name) {
                    strConfig.name = exchangeConfig.name;
                }
            }
        }

        return strConfig;
    },
_talentLevelTextMap: {
        1: "\u4e00",
        2: "\u4e8c",
        3: "\u4e09"
    },
    getTalentDisplayInfo: function (purchaseId, baseName, purchaseUiState) {
        if (!purchaseUiState || !purchaseUiState.isTalentPurchase) {
            return null;
        }

        purchaseId = parseInt(purchaseId);
        var currentLevel = Number(purchaseUiState.currentTalentLevel) || 0;
        var maxLevel = Number(purchaseUiState.maxTalentLevel) || 0;
        if (!(maxLevel > 0)
            && typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getTalentMaxLevel === "function") {
            maxLevel = Number(TalentService.getTalentMaxLevel(purchaseId));
        }
        maxLevel = maxLevel > 0 ? parseInt(maxLevel) : 3;
        var nextLevel = currentLevel >= maxLevel ? maxLevel : (currentLevel + 1);

        var strConfig = this.getPurchaseStringConfig(purchaseId);
        var levelTextMap = this._talentLevelTextMap;
        var talentName = baseName || strConfig.name || "";
        var baseDes = (strConfig.des || "").replace(/\\n/g, "\n");

        var effectList = (typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getTalentTierEffectTextList === "function")
            ? TalentService.getTalentTierEffectTextList(purchaseId)
            : [];
        if (effectList.length === 0) {
            var fallbackEffect = (strConfig.effect || "").replace(/\\n/g, "\n") || "\u6548\u679c\u589e\u5f3a";
            effectList = [];
            for (var effectIndex = 0; effectIndex < maxLevel; effectIndex++) {
                effectList.push(fallbackEffect);
            }
        }

        var tierLines = [];
        for (var level = 1; level <= maxLevel; level++) {
            var tierEffectText = effectList[level - 1] || effectList[effectList.length - 1] || "\u6548\u679c\u589e\u5f3a";
            tierLines.push((levelTextMap[level] || String(level)) + "\u7ea7 " + tierEffectText);
        }

        var currentEffectText = currentLevel >= 1
            ? (effectList[Math.max(0, Math.min(effectList.length - 1, currentLevel - 1))] || "")
            : "\u65e0";
        var nextEffectText = currentLevel >= maxLevel
            ? "\u65e0"
            : (effectList[Math.max(0, Math.min(effectList.length - 1, nextLevel - 1))] || "");

        var desParts = [];
        if (baseDes) {
            desParts.push(baseDes);
        }
        if (desParts.length === 0) {
            desParts.push("\u80fd\u529b\u63cf\u8ff0: \u6682\u65e0");
        }

        var effectParts = [];
        effectParts.push("\u5f53\u524d\u80fd\u529b\u6548\u679c: " + currentEffectText);
        effectParts.push("\u4e0b\u4e00\u9636\u6bb5\u80fd\u529b\u6548\u679c: " + nextEffectText);

        var cardName = talentName;
        if (currentLevel >= maxLevel) {
            cardName = talentName + "\uff08\u5df2\u6ee1\u7ea7\uff09";
        } else if (currentLevel >= 1) {
            cardName = talentName + "\uff08\u5347\u81f3" + (levelTextMap[nextLevel] || String(nextLevel)) + "\u7ea7\uff09";
        } else {
            cardName = talentName + "\uff08\u89e3\u9501" + (levelTextMap[nextLevel] || String(nextLevel)) + "\u7ea7\uff09";
        }

        return {
            currentLevel: currentLevel,
            nextLevel: nextLevel,
            isMaxLevel: currentLevel >= maxLevel,
            displayName: talentName,
            cardName: cardName,
            desText: desParts.join("\n\n"),
            effectText: effectParts.join("\n"),
            tierLines: tierLines
        };
    },
    getExchangeIdsByPurchaseId: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)) {
            return [];
        }

        var purchaseService = getPurchaseUiService();
        if (!purchaseService
            || typeof purchaseService.getExchangeIdsByPurchaseId !== "function") {
            return [];
        }
        return purchaseService.getExchangeIdsByPurchaseId(purchaseId) || [];
    },
    getExchangeIdByPurchaseId: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)) {
            return null;
        }

        var purchaseService = getPurchaseUiService();
        if (purchaseService
            && typeof purchaseService.getExchangeIdByPurchaseId === "function") {
            return purchaseService.getExchangeIdByPurchaseId(purchaseId);
        }

        var exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);
        return exchangeIds.length > 0 ? exchangeIds[0] : null;
    },
    getPrimaryExchangeConfigByPurchaseId: function (purchaseId) {
        if (typeof ExchangeAchievementConfig === "undefined" || !ExchangeAchievementConfig) {
            return null;
        }

        var exchangeIds = this.getExchangeIdsByPurchaseId(purchaseId);
        if (exchangeIds.length === 0) {
            return null;
        }
        return ExchangeAchievementConfig[exchangeIds[0]] || null;
    },
    getRoleTypeByPurchaseId: function (purchaseId) {
        var exchangeConfig = this.getPrimaryExchangeConfigByPurchaseId(purchaseId);
        if (exchangeConfig && exchangeConfig.type === "character" && isFinite(exchangeConfig.targetId)) {
            return parseInt(exchangeConfig.targetId);
        }

        if (typeof role !== "undefined"
            && role
            && typeof role.getRoleTypeByPurchaseId === "function") {
            return role.getRoleTypeByPurchaseId(purchaseId);
        }
        return null;
    },
    isExchangePurchase: function (purchaseId, shopState) {
        return !!this.getPurchaseUiSnapshot(purchaseId, null, shopState).isExchangePurchase;
    },
    isTalentPurchase: function (purchaseId, shopState) {
        return !!this.getPurchaseUiSnapshot(purchaseId, null, shopState).isTalentPurchase;
    },
    shouldRequestRemotePayInfo: function (purchaseId, shopState) {
        var snapshot = this.getPurchaseUiSnapshot(purchaseId, null, shopState);
        if (!snapshot || snapshot.purchaseId === null) {
            return false;
        }
        if (snapshot.isExchangePurchase) {
            return false;
        }
        if (snapshot.isConsumablePurchase) {
            return false;
        }
        return true;
    },

    getAchievementPoints: function () {
        return getPurchaseUiService().getAchievementPoints();
    },

    getAchievementPointsText: function () {
        var points = this.getAchievementPoints();
        return "\u6210\u5c31\u70b9 " + points;
    },

    refreshAchievementPointsLabel: function (label) {
        if (!label || typeof label.setString !== "function") {
            return;
        }
        label.setString(this.getAchievementPointsText());
    },

    isPurchaseChangeRelevant: function (changeInfo, purchaseIds) {
        var purchaseId = changeInfo && changeInfo.purchaseId;
        if (purchaseId === null || purchaseId === undefined) {
            return true;
        }

        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId) || !purchaseIds || !purchaseIds.length) {
            return false;
        }
        return purchaseIds.indexOf(purchaseId) !== -1;
    },
    getResolvedPurchaseConfig: function (purchaseId, purchaseConfig) {
        if (purchaseConfig) {
            return purchaseConfig;
        }
        return getPurchaseUiService().getPurchaseConfig(purchaseId);
    },
    getResolvedShopState: function (purchaseId, shopState) {
        if (shopState !== undefined) {
            return shopState;
        }
        return getPurchaseUiService().getShopUiState(purchaseId);
    },

    getPurchaseUiSnapshot: function (purchaseId, purchaseConfig, shopState) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)) {
            return {
                purchaseId: null,
                purchaseConfig: null,
                shopState: null,
                isExchangePurchase: false,
                isTalentPurchase: false,
                isUnlocked: false,
                isOperatorPromoPurchase: false,
                currentTalentLevel: 0,
                displayNameOverride: "",
                showSaleIcon: false,
                priceText: "",
                priceOff: 0,
                canBuy: false,
                canCancel: false,
                shouldHideBuyButton: false,
                badgeText: "",
                hideBadge: false
            };
        }

        var resolvedPurchaseConfig = this.getResolvedPurchaseConfig(purchaseId, purchaseConfig);
        var resolvedShopState = this.getResolvedShopState(purchaseId, shopState);
        resolvedShopState = resolvedShopState || null;
        var priceOff = resolvedShopState && isFinite(resolvedShopState.priceOff)
            ? Math.max(0, parseInt(resolvedShopState.priceOff))
            : 0;

        return {
            purchaseId: purchaseId,
            purchaseConfig: resolvedPurchaseConfig,
            shopState: resolvedShopState,
            isExchangePurchase: !!(resolvedShopState && resolvedShopState.isExchangePurchase),
            isTalentPurchase: !!(resolvedShopState && resolvedShopState.isTalentPurchase),
            isConsumablePurchase: !!(resolvedShopState && resolvedShopState.isConsumablePurchase),
            isUnlocked: !!(resolvedShopState && resolvedShopState.isUnlocked),
            isFullyUnlocked: !!(resolvedShopState && resolvedShopState.isFullyUnlocked),
            exchangeIds: resolvedShopState && resolvedShopState.exchangeIds ? resolvedShopState.exchangeIds.slice() : [],
            isOperatorPromoPurchase: !!(resolvedShopState && resolvedShopState.isOperatorPromoPurchase),
            currentTalentLevel: resolvedShopState && resolvedShopState.currentTalentLevel !== undefined && resolvedShopState.currentTalentLevel !== null
                ? resolvedShopState.currentTalentLevel
                : 0,
            maxTalentLevel: resolvedShopState && resolvedShopState.maxTalentLevel !== undefined && resolvedShopState.maxTalentLevel !== null
                ? resolvedShopState.maxTalentLevel
                : 0,
            achievementPrice: resolvedShopState && resolvedShopState.achievementPrice !== undefined && resolvedShopState.achievementPrice !== null
                ? resolvedShopState.achievementPrice
                : null,
            displayNameOverride: resolvedShopState && resolvedShopState.displayNameOverride ? resolvedShopState.displayNameOverride : "",
            showSaleIcon: !!(resolvedShopState && resolvedShopState.showSaleIcon),
            priceText: resolvedShopState && resolvedShopState.priceText ? resolvedShopState.priceText : "",
            priceOff: priceOff,
            canBuy: !!(resolvedShopState && resolvedShopState.canBuy),
            canCancel: !!(resolvedShopState && resolvedShopState.canCancel),
            shouldHideBuyButton: !!(resolvedShopState && resolvedShopState.shouldHideBuyButton),
            badgeText: resolvedShopState && resolvedShopState.badgeText ? resolvedShopState.badgeText : "",
            hideBadge: !!(resolvedShopState && resolvedShopState.hideBadge),
            unlockReward: resolvedShopState && resolvedShopState.unlockReward ? utils.clone(resolvedShopState.unlockReward) : null,
            failureReason: resolvedShopState && resolvedShopState.failureReason ? resolvedShopState.failureReason : "",
            shopStateVersion: resolvedShopState && resolvedShopState.shopStateVersion ? resolvedShopState.shopStateVersion : 0
        };
    },
    isPurchaseUnlocked: function (purchaseId, shopState) {
        return !!this.getPurchaseUiSnapshot(purchaseId, null, shopState).isUnlocked;
    },
    _buildDialogSections: function (purchaseDisplayContext) {
        if (!purchaseDisplayContext || purchaseDisplayContext.purchaseId === null) {
            return [];
        }

        var sections = [];
        if (purchaseDisplayContext.isConsumablePurchase) {
            sections.push({
                type: "label",
                text: (purchaseDisplayContext.strConfig.des || "").replace(/\\n/g, "\n"),
                color: UITheme.colors.TEXT_TITLE,
                gapAfter: 8
            });
            sections.push({
                type: "label",
                text: stringUtil.getString(1215),
                color: UITheme.colors.TEXT_TITLE,
                gapAfter: 8
            });
            sections.push({
                type: "richText",
                effectList: purchaseDisplayContext.purchaseConfig ? purchaseDisplayContext.purchaseConfig.effect : null,
                color: UITheme.colors.TEXT_TITLE,
                gapAfter: 0
            });
            return sections;
        }

        sections.push({
            type: "label",
            text: purchaseDisplayContext.detailDescriptionText,
            color: UITheme.colors.TEXT_TITLE,
            gapAfter: 10
        });
        if (purchaseDisplayContext.detailEffectText && purchaseDisplayContext.detailEffectText.length > 0) {
            sections.push({
                type: "label",
                text: purchaseDisplayContext.detailEffectText,
                color: UITheme.colors.TEXT_ERROR,
                gapAfter: 0
            });
        }
        return sections;
    },
    getPurchaseDisplayContext: function (purchaseId, purchaseConfig, shopState) {
        var purchaseUiState = this.getPurchaseUiSnapshot(purchaseId, purchaseConfig, shopState);
        if (purchaseUiState.purchaseId === null) {
            return {
                purchaseId: null,
                strConfig: {
                    name: "",
                    des: "",
                    effect: ""
                },
                displayBaseName: "",
                purchaseConfig: null,
                shopState: null,
                purchaseUiState: purchaseUiState,
                talentDisplayInfo: null,
                purchaseIconMeta: null,
                titleIconConfig: null,
                titleText: "",
                cardTitleText: "",
                infoDialogContentText: "",
                detailDescriptionText: "",
                detailEffectText: "",
                priceText: "",
                buyButtonText: stringUtil.getString(1227),
                shouldHideTitleIcon: false,
                dialogSections: [],
                isRolePortrait: false,
                isSupportPackPurchase: false,
                isExchangePurchase: false,
                isConsumablePurchase: false
            };
        }

        purchaseId = purchaseUiState.purchaseId;
        var strConfig = this.getPurchaseStringConfig(purchaseId);
        var resolvedPurchaseConfig = purchaseUiState.purchaseConfig || null;
        var resolvedShopState = purchaseUiState.shopState || null;
        strConfig.name = this.getPurchaseDisplayName(purchaseId, strConfig.name, resolvedShopState);
        var talentDisplayInfo = this.getTalentDisplayInfo(purchaseId, strConfig.name, purchaseUiState);
        var purchaseIconMeta = this.getDisplayIconMeta(purchaseId, resolvedPurchaseConfig);
        var titleIconConfig = this.getTitleIconConfig(purchaseId, resolvedPurchaseConfig);
        var detailDescriptionText = talentDisplayInfo
            ? talentDisplayInfo.desText
            : (strConfig.des || "").replace(/\\n/g, "\n");
        var detailEffectText = talentDisplayInfo
            ? talentDisplayInfo.effectText
            : (strConfig.effect || "").replace(/\\n/g, "\n");
        var infoDialogContentText = talentDisplayInfo
            ? talentDisplayInfo.effectText
            : ((strConfig.effect || strConfig.des || "").replace(/\\n/g, "\n"));

        var purchaseDisplayContext = {
            purchaseId: purchaseId,
            strConfig: strConfig,
            displayBaseName: strConfig.name,
            purchaseConfig: resolvedPurchaseConfig,
            shopState: resolvedShopState,
            purchaseUiState: purchaseUiState,
            talentDisplayInfo: talentDisplayInfo,
            purchaseIconMeta: purchaseIconMeta,
            titleIconConfig: titleIconConfig,
            titleText: talentDisplayInfo ? talentDisplayInfo.displayName : strConfig.name,
            cardTitleText: talentDisplayInfo ? (talentDisplayInfo.cardName || talentDisplayInfo.displayName) : strConfig.name,
            infoDialogContentText: infoDialogContentText,
            detailDescriptionText: detailDescriptionText,
            detailEffectText: detailEffectText,
            priceText: purchaseUiState.priceText || "",
            buyButtonText: purchaseUiState.isConsumablePurchase ? stringUtil.getString(1213) : stringUtil.getString(1227),
            shouldHideTitleIcon: !!purchaseUiState.isConsumablePurchase,
            isRolePortrait: !!(purchaseIconMeta && purchaseIconMeta.type === "role"),
            isSupportPackPurchase: !!(purchaseIconMeta && purchaseIconMeta.type === "support"),
            isExchangePurchase: !!purchaseUiState.isExchangePurchase,
            isConsumablePurchase: !!purchaseUiState.isConsumablePurchase
        };
        purchaseDisplayContext.dialogSections = this._buildDialogSections(purchaseDisplayContext);
        return purchaseDisplayContext;
    },

    applyPayNodeState: function (purchaseId, payNode, shopState) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId) || !payNode) {
            return;
        }

        var snapshot = this.getPurchaseUiSnapshot(purchaseId, null, shopState);
        var state = snapshot.shopState;

        if (typeof payNode.applyShopState === "function") {
            payNode.applyShopState(state || null);
            return;
        }

        if (typeof payNode.updateStatus === "function") {
            payNode.updateStatus(state || null);
            if (state || typeof payNode.updatePrice !== "function") {
                return;
            }
        } else if (state || typeof payNode.updatePrice !== "function") {
            return;
        }

        if (snapshot.priceText !== undefined
            && snapshot.priceText !== null
            && snapshot.priceText !== "") {
            payNode.updatePrice(snapshot.priceText);
        }
    },
    applyPayDialogState: function (purchaseId, payDialog, shopState) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId) || !payDialog) {
            return;
        }

        var snapshot = this.getPurchaseUiSnapshot(purchaseId, null, shopState);
        var titleNode = payDialog.titleNode;
        var priceLabel = titleNode && typeof titleNode.getChildByName === "function"
            ? titleNode.getChildByName("price")
            : null;
        if (priceLabel && typeof priceLabel.setString === "function") {
            priceLabel.setString(snapshot.priceText || "");
        }

        var buyButton = payDialog.actionNode && typeof payDialog.actionNode.getChildByName === "function"
            ? payDialog.actionNode.getChildByName("btn_2")
            : null;
        if (buyButton && typeof buyButton.setEnabled === "function") {
            buyButton.setEnabled(!!snapshot.canBuy);
        }

        var offIcon = titleNode && typeof titleNode.getChildByName === "function"
            ? titleNode.getChildByName("offIcon")
            : null;
        if (!offIcon) {
            return;
        }

        var priceOff = snapshot && isFinite(snapshot.priceOff)
            ? Math.max(0, parseInt(snapshot.priceOff))
            : 0;
        if (!(priceOff > 0)) {
            offIcon.setVisible(false);
            return;
        }
        offIcon.setVisible(true);
        if (typeof offIcon.updateOff === "function") {
            offIcon.updateOff(priceOff);
        }
    },

    refreshPayNodeMap: function (nodeMap) {
        if (!nodeMap) {
            return;
        }

        for (var purchaseId in nodeMap) {
            if (!nodeMap.hasOwnProperty(purchaseId)) {
                continue;
            }
            this.applyPayNodeState(purchaseId, nodeMap[purchaseId]);
        }
    },

    refreshPayNodeMapWithPoints: function (nodeMap, pointsLabel) {
        this.refreshPayNodeMap(nodeMap);
        this.refreshAchievementPointsLabel(pointsLabel);
    },
    getRemotePayInfoRequestIds: function (purchaseIds) {
        var uniqueMap = {};
        var requestIds = [];
        if (!purchaseIds || !purchaseIds.length) {
            return requestIds;
        }

        purchaseIds.forEach(function (purchaseId) {
            purchaseId = parseInt(purchaseId);
            if (isNaN(purchaseId)
                || uniqueMap[purchaseId]
                || !this.shouldRequestRemotePayInfo(purchaseId)) {
                return;
            }
            uniqueMap[purchaseId] = true;
            requestIds.push(purchaseId);
        }, this);

        return requestIds;
    },
    getRemotePayInfoPurchaseIds: function (purchaseIds) {
        return this.getRemotePayInfoRequestIds(purchaseIds);
    },
    _getRemotePayInfoRefreshState: function (target) {
        var host = target || this;
        if (!host._purchaseUiRemotePayInfoState) {
            host._purchaseUiRemotePayInfoState = {
                inFlight: null
            };
        }
        return host._purchaseUiRemotePayInfoState;
    },
    _isRemotePayInfoRequestCovered: function (coveredIds, requestIds) {
        if (!coveredIds || !coveredIds.length || !requestIds || !requestIds.length) {
            return false;
        }

        var coveredMap = {};
        coveredIds.forEach(function (purchaseId) {
            coveredMap[parseInt(purchaseId)] = true;
        });

        for (var i = 0; i < requestIds.length; i++) {
            if (!coveredMap[parseInt(requestIds[i])]) {
                return false;
            }
        }
        return true;
    },
    _buildRemotePayInfoRefreshInfo: function (requestIds, payload, extra) {
        extra = extra || {};
        return {
            requestedIds: requestIds.slice(),
            purchaseIds: requestIds.slice(),
            hasRemotePurchases: requestIds.length > 0,
            payload: payload || {},
            reusedInFlight: !!extra.reusedInFlight
        };
    },
    refreshRemotePayInfoIfNeeded: function (target, purchaseIds, cb) {
        var purchaseIdList = Array.isArray(purchaseIds) ? purchaseIds : [];
        var requestIds = this.getRemotePayInfoRequestIds(purchaseIdList);
        if (!requestIds.length) {
            if (cb) {
                cb.call(target, null, {
                    requestedIds: [],
                    purchaseIds: [],
                    hasRemotePurchases: false,
                    payload: {}
                });
            }
            return;
        }

        var refreshState = this._getRemotePayInfoRefreshState(target);
        if (refreshState.inFlight
            && this._isRemotePayInfoRequestCovered(refreshState.inFlight.requestIds, requestIds)) {
            if (cb) {
                refreshState.inFlight.waiters.push({
                    target: target,
                    cb: cb,
                    requestIds: requestIds.slice()
                });
            }
            return;
        }

        refreshState.inFlight = {
            requestIds: requestIds.slice(),
            waiters: cb ? [{
                target: target,
                cb: cb,
                requestIds: requestIds.slice()
            }] : []
        };
        getPurchaseUiService().refreshRemotePayInfo(target, function (err, payload) {
            var inFlight = refreshState.inFlight;
            refreshState.inFlight = null;

            var waiters = inFlight && inFlight.waiters ? inFlight.waiters.slice() : [];
            waiters.forEach(function (waiter) {
                if (!waiter || typeof waiter.cb !== "function") {
                    return;
                }
                waiter.cb.call(waiter.target, err, PurchaseUiHelper._buildRemotePayInfoRefreshInfo(
                    waiter.requestIds || requestIds,
                    payload,
                    {
                        reusedInFlight: waiter.requestIds && waiter.requestIds.length !== requestIds.length
                    }
                ));
            });
        }, requestIds.slice());
    },
    createPayItemNode: function (purchaseId, target, cb) {
        var node = new cc.Node();
        var purchaseDisplayContext = this.getPurchaseDisplayContext(purchaseId);
        var purchaseConfig = purchaseDisplayContext.purchaseConfig || null;

        var bgName = "";
        if (purchaseId <= 120) {
            bgName = "frame_iap_bg_talent.png";
        } else if (purchaseId < 200) {
            bgName = "frame_iap_bg_formula.png";
        } else {
            bgName = "frame_iap_bg_item.png";
        }

        var bg = uiUtil.getSpriteByNameSafe(bgName, "frame_iap_bg_talent.png");
        node.setContentSize(bg.getContentSize());
        bg.x = node.width / 2;
        bg.y = node.height / 2;
        node.addChild(bg);

        var itemDisplayName = purchaseDisplayContext.cardTitleText || purchaseDisplayContext.displayBaseName;
        var name = new cc.LabelTTF(itemDisplayName, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(node.width - 20, 44), cc.TEXT_ALIGNMENT_CENTER);
        name.anchorY = 1;
        name.x = node.width / 2;
        name.y = node.height - 8;
        name.color = UITheme.colors.TEXT_TITLE;
        node.addChild(name);

        var price = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(bg.width - 20, 0), cc.TEXT_ALIGNMENT_RIGHT);
        price.anchorX = 1;
        price.anchorY = 0.5;
        price.x = bg.width - 10;
        price.y = 26;
        price.color = UITheme.colors.TEXT_TITLE;
        node.addChild(price);

        var purchaseIconInfo = this.createDisplayIcon(purchaseId, purchaseConfig);
        var icon = purchaseIconInfo.icon;
        var isRolePortrait = purchaseIconInfo.isRolePortrait;
        var isSupportPackIcon = purchaseIconInfo.isSupportPackIcon;
        var fitSpriteScaleToBox = function (sprite, maxWidth, maxHeight, fallbackScale, maxScale) {
            if (!sprite || !maxWidth || !maxHeight) {
                return fallbackScale || 1;
            }

            var spriteSize = sprite.getContentSize ? sprite.getContentSize() : null;
            var spriteWidth = spriteSize ? spriteSize.width : sprite.width;
            var spriteHeight = spriteSize ? spriteSize.height : sprite.height;
            if (!spriteWidth || !spriteHeight) {
                return fallbackScale || 1;
            }

            var fitScale = Math.min(maxWidth / spriteWidth, maxHeight / spriteHeight);
            if (maxScale !== undefined && maxScale !== null) {
                fitScale = Math.min(fitScale, maxScale);
            }
            if (!isFinite(fitScale) || fitScale <= 0) {
                return fallbackScale || 1;
            }
            return fitScale;
        };
        icon.x = bg.width / 2;
        icon.y = 118;
        if (isRolePortrait) {
            var roleScale = fitSpriteScaleToBox(icon, bg.width * 0.9, 170, 0.62, 1.26);
            roleScale = Math.min(1.42, roleScale * 1.18);
            icon.setScale(roleScale);
            icon.y = 110;
        } else if (isSupportPackIcon) {
            var supportScale = fitSpriteScaleToBox(icon, bg.width * 0.72, 132, 1, 1.32);
            if (purchaseId === 208 || purchaseId === 209) {
                supportScale *= 1.16;
            }
            icon.setScale(Math.min(1.5, supportScale));
            icon.y = 116;
        }
        node.addChild(icon);

        var offIcon = uiUtil.createSaleOffIcon();
        offIcon.x = 6;
        offIcon.y = 36;
        node.addChild(offIcon);
        offIcon.setVisible(false);

        if (this.shouldShowSaleIcon(purchaseId)) {
            var saleIcon = autoSpriteFrameController.getSpriteFromSpriteName("icon_sale.png");
            saleIcon.x = 45;
            saleIcon.y = 54;
            node.addChild(saleIcon);
        }

        var btnSize = cc.size(bg.width - 20, bg.height - 20);
        var btnIcon = new ButtonWithPressed(btnSize);
        btnIcon.x = bg.width / 2;
        btnIcon.y = bg.height / 2;
        node.addChild(btnIcon);
        btnIcon.setClickListener(this, function () {
            PurchaseUiHelper.showPayDialogWithRefresh(purchaseId, function () {
                utils.pay(purchaseId, target, cb);
            }, target);
        });

        var unlockName = "\u5df2\u8d2d";
        var unlock = new cc.LabelTTF(unlockName, uiUtil.fontFamily.normal, 40, cc.size(node.width, 0), cc.TEXT_ALIGNMENT_CENTER);
        unlock.x = icon.x;
        unlock.y = icon.y;
        node.addChild(unlock);
        unlock.setVisible(false);
        unlock.enableStroke(UITheme.colors.TEXT_TITLE, 8);
        node.purchaseId = purchaseId;
        node.updateName = function (shopState) {
            var nextDisplayContext = PurchaseUiHelper.getPurchaseDisplayContext(purchaseId, purchaseConfig, shopState);
            name.setString(nextDisplayContext.cardTitleText || nextDisplayContext.displayBaseName || "");
        };
        node.updateStatus = function (shopState) {
            node.updateName(shopState);
            var snapshot = PurchaseUiHelper.getPurchaseUiSnapshot(purchaseId, purchaseConfig, shopState);
            var badgeText = snapshot.badgeText ? snapshot.badgeText : "";
            unlock.setString(badgeText || unlockName);
            unlock.setVisible(!!(badgeText && !snapshot.hideBadge));
            price.setString(snapshot.priceText || "");
            var off = snapshot.priceOff || 0;
            if (off > 0) {
                offIcon.setVisible(true);
                offIcon.updateOff(off);
            } else {
                offIcon.setVisible(false);
            }
        };

        node.updatePrice = function (priceStr) {
            price.setString(priceStr);
        };
        node.applyShopState = function (shopState) {
            node.updateStatus(shopState);
        };

        node.updateStatus(purchaseDisplayContext.shopState);
        return node;
    },
    showPayDialogWithRefresh: function (purchaseId, cb, ownerLayer, target, afterShow) {
        var contextTarget = target || ownerLayer || this;
        var shownDialog = null;
        var showDialog = function (err) {
            shownDialog = PurchaseUiHelper.showPayDialog(purchaseId, cb, ownerLayer);
            if (afterShow) {
                afterShow.call(contextTarget, err || null, shownDialog);
            }
        };

        this.refreshRemotePayInfoIfNeeded(contextTarget, [purchaseId], function (err) {
            showDialog(err);
        });
        return shownDialog;
    },
    createLockNode: function (size, purchaseId, cb, isWhite) {
        var n = new ButtonWithPressed(size);

        if (!isWhite) {
            var drawNode = new cc.DrawNode();
            drawNode.setName("normalBg");
            n.addChild(drawNode, -1);
            drawNode.drawRect(cc.p(0, 0), cc.p(n.width, n.height), cc.color(0, 0, 0, 155), 1, cc.color(0, 0, 0, 10));

            var lock = autoSpriteFrameController.getSpriteFromSpriteName("icon_iap_lock.png");
            lock.x = n.width / 2;
            lock.y = n.height / 2;
            lock.scale = 0.6;
            n.addChild(lock);
            lock.setName("lock");
        }

        n.setClickListener(this, function () {
            PurchaseUiHelper.showPayDialogWithRefresh(purchaseId, function () {
                utils.pay(purchaseId, this, cb);
            }, null, this);
        });

        return n;
    },
    showUnlockDialog: function (purchaseId) {
        var config = {
            title: {},
            content: {},
            action: {btn_1: {}, btn_2: {}}
        };
        var roleType = this.getRoleTypeByPurchaseId(purchaseId);
        if (roleType) {
            config.content.des = stringUtil.getString(1316);
        } else {
            config.content.des = stringUtil.getString(1224);
        }
        config.action.btn_1.txt = stringUtil.getString(1031);
        config.action.btn_2.txt = stringUtil.getString(1225);
        config.action.btn_2.target = null;
        config.action.btn_2.cb = function () {
            cc.director.pushScene(new ShopScene({purchaseId: purchaseId}));
        };
        var dialog = new DialogTiny(config);
        dialog.show();
    },
    showRoleInfoDialog: function (roleType, locked) {
        if (typeof RoleTalentUiHelper !== "undefined"
            && RoleTalentUiHelper
            && typeof RoleTalentUiHelper.showRoleInfoDialog === "function") {
            RoleTalentUiHelper.showRoleInfoDialog(roleType, locked);
        }
    },
    rebuildPayNodeGrid: function (container, purchaseIds, target, onPayResult, layoutConfig) {
        if (!container || !purchaseIds || !purchaseIds.length) {
            return {};
        }

        var config = layoutConfig || {};
        var nodeMap = {};
        var columns = Math.max(1, parseInt(config.columns) || 1);
        var nodeScale = config.nodeScale !== undefined ? config.nodeScale : 1;
        var nodeWidth = config.nodeWidth || 0;
        var nodeHeight = config.nodeHeight || 0;
        var widthPadding = config.widthPadding || 0;
        var heightPadding = config.heightPadding || 0;
        var totalHeight = config.totalHeight || nodeHeight;
        var offsetX = config.offsetX || 0;

        if (config.clearExisting !== false && typeof container.removeAllChildren === "function") {
            container.removeAllChildren(true);
        }

        purchaseIds.forEach(function (purchaseId, index) {
            try {
                var payNode = PurchaseUiHelper.createPayItemNode(purchaseId, target, onPayResult);
                if (!payNode) {
                    return;
                }
                payNode.anchorX = 0;
                payNode.anchorY = 1;
                if (typeof payNode.setScale === "function") {
                    payNode.setScale(nodeScale);
                }
                payNode.x = offsetX + (index % columns) * (widthPadding + nodeWidth);
                payNode.y = totalHeight - Math.floor(index / columns) * (heightPadding + nodeHeight);
                container.addChild(payNode);
                nodeMap[purchaseId] = payNode;
            } catch (e) {
                cc.e("createPayItemNode failed. purchaseId=" + purchaseId + ", err=" + e);
            }
        });

        return nodeMap;
    },

    bindShopStateListener: function (host, handler) {
        var runtimeEmitter = getPurchaseUiRuntimeEmitter();
        if (!host
            || host._shopStateListener
            || typeof handler !== "function"
            || !runtimeEmitter) {
            return;
        }

        host._shopStateListener = function (changeInfo) {
            handler.call(host, changeInfo);
        };
        runtimeEmitter.on(getPurchaseUiService().getShopStateChangeEventName(), host._shopStateListener);
    },

    unbindShopStateListener: function (host) {
        var runtimeEmitter = getPurchaseUiRuntimeEmitter();
        if (!host
            || !host._shopStateListener
            || !runtimeEmitter) {
            if (host) {
                host._shopStateListener = null;
            }
            return;
        }

        runtimeEmitter.off(getPurchaseUiService().getShopStateChangeEventName(), host._shopStateListener);
        host._shopStateListener = null;
    },

    refreshShopOwnerLayer: function (ownerLayer, purchaseId, reason) {
        var refreshLayer = function (layer) {
            if (!layer) {
                return false;
            }
            if (typeof layer._onShopStateChanged === "function") {
                layer._onShopStateChanged({
                    purchaseId: purchaseId,
                    reason: reason || ""
                });
                return true;
            }
            if (typeof layer._refreshAllPayNodes === "function") {
                layer._refreshAllPayNodes();
                if (typeof layer._refreshAllPayNodesDeferred === "function") {
                    layer._refreshAllPayNodesDeferred();
                }
                return true;
            }
            if (typeof layer._refreshAllNodes === "function") {
                layer._refreshAllNodes();
                return true;
            }
            return false;
        };

        if (refreshLayer(ownerLayer)) {
            return true;
        }

        var runningScene = cc.director.getRunningScene ? cc.director.getRunningScene() : null;
        if (runningScene && typeof runningScene.getChildByName === "function") {
            return refreshLayer(runningScene.getChildByName("keyEventLayer"));
        }
        return false;
    },

    showPurchaseFailedTip: function (result) {
        if (!result || result.isSuccess) {
            return false;
        }

        var failureReason = result.failureReason || result.failedReason || "";
        if (failureReason === getPurchaseUiService().FAIL_REASON.ALREADY_UNLOCKED
            || failureReason === getPurchaseUiService().FAIL_REASON.MAX_LEVEL) {
            uiUtil.showTip("\u5df2\u8d2d\u6216\u5df2\u6ee1\u7ea7");
        } else if (failureReason === getPurchaseUiService().FAIL_REASON.INSUFFICIENT_POINTS) {
            uiUtil.showTip("\u6210\u5c31\u70b9\u4e0d\u8db3");
        } else {
            uiUtil.showTip("\u8d2d\u4e70\u5931\u8d25");
        }
        return true;
    },

    showPayDialog: function (purchaseId, cb, ownerLayer) {
        var purchaseDisplayContext = this.getPurchaseDisplayContext(purchaseId);
        var strConfig = purchaseDisplayContext.strConfig;
        var purchaseConfig = purchaseDisplayContext.purchaseConfig;
        var d = new PayDialog(purchaseId, cb, ownerLayer, purchaseDisplayContext);

        var viewWidth = d.rightEdge - d.leftEdge;
        var viewHeight = Math.max(80, d.contentNode.getContentSize().height - 8);
        var container = new cc.Layer();
        var scrollView = new cc.ScrollView(cc.size(viewWidth, viewHeight), container);
        scrollView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        scrollView.setBounceable(false);
        scrollView.setClippingToBounds(true);
        scrollView.x = d.leftEdge;
        scrollView.y = 4;
        d.contentNode.addChild(scrollView);

        var contentSections = [];
        var appendSection = function (node, gapAfter) {
            if (!node) {
                return;
            }
            contentSections.push({
                node: node,
                gapAfter: gapAfter || 0
            });
        };

        if (!purchaseDisplayContext.isConsumablePurchase) {
            var desstr = purchaseDisplayContext.detailDescriptionText;
            var effectstr = purchaseDisplayContext.detailEffectText;

            var des = new cc.LabelTTF(desstr, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(viewWidth, 0));
            des.setColor(UITheme.colors.TEXT_TITLE);
            appendSection(des, 10);

            if (effectstr && effectstr.length > 0) {
                var effect = new cc.LabelTTF(effectstr, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(viewWidth, 0));
                effect.setColor(UITheme.colors.TEXT_ERROR);
                appendSection(effect, 0);
            }
        } else {
            var titleIcon = d.titleNode.getChildByName("icon");
            if (titleIcon) {
                titleIcon.setVisible(false);
            }
            var titleLabel = d.titleNode.getChildByName("title");
            if (titleLabel && typeof titleLabel.updateView === "function") {
                titleLabel.updateView();
            }
            var supportDes = new cc.LabelTTF(strConfig.des.replace(/\\n/g, "\n"), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(viewWidth, 0));
            supportDes.setColor(UITheme.colors.TEXT_TITLE);
            appendSection(supportDes, 8);

            var itemLabel = new cc.LabelTTF(stringUtil.getString(1215), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(viewWidth, 0));
            itemLabel.setColor(UITheme.colors.TEXT_TITLE);
            appendSection(itemLabel, 8);

            var richText = new ItemRichText(purchaseConfig.effect, viewWidth, 3, 0.5, UITheme.colors.TEXT_TITLE);
            richText.setName("richText");
            appendSection(richText, 0);
        }

        var totalHeight = 6;
        contentSections.forEach(function (section) {
            totalHeight += section.node.getContentSize().height + section.gapAfter;
        });
        totalHeight = Math.max(viewHeight, totalHeight);

        var cursorY = totalHeight - 4;
        contentSections.forEach(function (section) {
            section.node.setAnchorPoint(0, 1);
            section.node.setPosition(0, cursorY);
            container.addChild(section.node);
            cursorY -= section.node.getContentSize().height + section.gapAfter;
        });

        scrollView.setContentSize(viewWidth, totalHeight);
        var offset = scrollView.getContentOffset();
        offset.y = scrollView.getViewSize().height - totalHeight;
        scrollView.setContentOffset(offset);

        d.show();
        return d;
    }
};
