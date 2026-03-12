var PurchaseUiHelper = {
    getDisplayIconMeta: function (purchaseId, purchaseConfig) {
        var roleType = uiUtil.getRoleTypeByPurchaseId(purchaseId);
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

    isOperatorPromoPurchase: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (purchaseId !== 106
            || typeof PurchaseAndroid === "undefined"
            || !PurchaseAndroid) {
            return false;
        }

        return PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_OPERATOR
            || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_UNI
            || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_AIYOUXI
            || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_HEYOUXI;
    },

    getPurchaseDisplayName: function (purchaseId, defaultName) {
        if (this.isOperatorPromoPurchase(purchaseId)) {
            return "靴子特惠";
        }
        return defaultName || "";
    },

    shouldShowSaleIcon: function (purchaseId) {
        return parseInt(purchaseId) === 106;
    },

    getAchievementPointsText: function () {
        var points = 0;
        if (typeof Medal !== "undefined"
            && Medal
            && typeof Medal.getAchievementPoints === "function") {
            points = Medal.getAchievementPoints();
        }
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
                currentTalentLevel: 0,
                priceText: "",
                canBuy: false,
                canCancel: false,
                shouldHideBuyButton: false,
                badgeText: "",
                hideBadge: false
            };
        }

        var resolvedPurchaseConfig = purchaseConfig;
        if (!resolvedPurchaseConfig
            && typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.getPurchaseConfig === "function") {
            resolvedPurchaseConfig = PurchaseService.getPurchaseConfig(purchaseId);
        }

        var resolvedShopState = shopState;
        if (resolvedShopState === undefined
            && typeof PurchaseService !== "undefined"
            && PurchaseService
            && typeof PurchaseService.getShopUiState === "function") {
            resolvedShopState = PurchaseService.getShopUiState(purchaseId);
        }

        var isExchangePurchase = resolvedShopState && resolvedShopState.isExchangePurchase !== undefined
            ? !!resolvedShopState.isExchangePurchase
            : (typeof PurchaseService !== "undefined"
                && PurchaseService
                && typeof PurchaseService.isExchangePurchase === "function"
                ? PurchaseService.isExchangePurchase(purchaseId)
                : false);
        var isTalentPurchase = resolvedShopState && resolvedShopState.isTalentPurchase !== undefined
            ? !!resolvedShopState.isTalentPurchase
            : (typeof PurchaseService !== "undefined"
                && PurchaseService
                && typeof PurchaseService.isTalentPurchase === "function"
                ? PurchaseService.isTalentPurchase(purchaseId)
                : false);
        var isUnlocked = resolvedShopState && resolvedShopState.isUnlocked !== undefined
            ? !!resolvedShopState.isUnlocked
            : (typeof PurchaseService !== "undefined"
                && PurchaseService
                && typeof PurchaseService.isUnlocked === "function"
                ? PurchaseService.isUnlocked(purchaseId)
                : false);
        var currentTalentLevel = resolvedShopState
            && resolvedShopState.currentTalentLevel !== undefined
            && resolvedShopState.currentTalentLevel !== null
            ? resolvedShopState.currentTalentLevel
            : (isTalentPurchase
                && typeof Medal !== "undefined"
                && Medal
                && typeof Medal.getTalentLevel === "function"
                ? Medal.getTalentLevel(purchaseId)
                : 0);

        var priceText = "";
        var badgeText = "";
        var hideBadge = false;
        if (resolvedShopState
            && resolvedShopState.priceText !== undefined
            && resolvedShopState.priceText !== null
            && resolvedShopState.priceText !== "") {
            priceText = resolvedShopState.priceText;
        } else if (isExchangePurchase) {
            var achievementPrice = PurchaseService.getAchievementPriceByPurchaseId(purchaseId);
            if (achievementPrice !== null && achievementPrice !== undefined) {
                priceText = achievementPrice + " \u6210\u5c31\u70b9";
            } else if (PurchaseService.isTalentPurchase(purchaseId)) {
                priceText = "\u5df2\u6ee1\u7ea7";
            } else {
                priceText = "\u5df2\u8d2d";
            }
        } else if (resolvedPurchaseConfig) {
            priceText = resolvedPurchaseConfig.productPriceStr;
            if (!priceText) {
                priceText = stringUtil.getString(1191, resolvedPurchaseConfig.price);
            }
        }

        var canBuy = resolvedShopState ? !!resolvedShopState.canBuy : false;
        var shouldHideBuyButton = resolvedShopState ? !!resolvedShopState.shouldHideBuyButton : false;
        var canCancel = resolvedShopState ? !!resolvedShopState.canCancel : false;
        if (resolvedShopState) {
            badgeText = resolvedShopState.badgeText || "";
            hideBadge = !!resolvedShopState.hideBadge;
        }

        return {
            purchaseId: purchaseId,
            purchaseConfig: resolvedPurchaseConfig,
            shopState: resolvedShopState || null,
            isExchangePurchase: isExchangePurchase,
            isTalentPurchase: isTalentPurchase,
            isUnlocked: isUnlocked,
            currentTalentLevel: currentTalentLevel,
            priceText: priceText,
            canBuy: canBuy,
            canCancel: canCancel,
            shouldHideBuyButton: shouldHideBuyButton,
            badgeText: badgeText,
            hideBadge: hideBadge
        };
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
                isRolePortrait: false,
                isSupportPackPurchase: false,
                isExchangePurchase: false
            };
        }

        purchaseId = purchaseUiState.purchaseId;
        var strConfig = uiUtil.getPurchaseStringConfig(purchaseId);
        strConfig.name = this.getPurchaseDisplayName(purchaseId, strConfig.name);

        var resolvedPurchaseConfig = purchaseUiState.purchaseConfig || null;
        var resolvedShopState = purchaseUiState.shopState || null;
        var talentDisplayInfo = uiUtil.getTalentDisplayInfo
            ? uiUtil.getTalentDisplayInfo(purchaseId, strConfig.name)
            : null;
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

        return {
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
            isRolePortrait: !!(purchaseIconMeta && purchaseIconMeta.type === "role"),
            isSupportPackPurchase: !!(purchaseIconMeta && purchaseIconMeta.type === "support"),
            isExchangePurchase: !!purchaseUiState.isExchangePurchase
        };
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
                var payNode = uiUtil.createPayItemNode(purchaseId, target, onPayResult);
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
        if (!host
            || host._shopStateListener
            || typeof handler !== "function"
            || typeof utils === "undefined"
            || !utils
            || !utils.emitter) {
            return;
        }

        host._shopStateListener = function (changeInfo) {
            handler.call(host, changeInfo);
        };
        utils.emitter.on(PurchaseService.getShopStateChangeEventName(), host._shopStateListener);
    },

    unbindShopStateListener: function (host) {
        if (!host
            || !host._shopStateListener
            || typeof utils === "undefined"
            || !utils
            || !utils.emitter) {
            if (host) {
                host._shopStateListener = null;
            }
            return;
        }

        utils.emitter.off(PurchaseService.getShopStateChangeEventName(), host._shopStateListener);
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

        if (result.failedReason === PurchaseService.FAIL_REASON.ALREADY_UNLOCKED
            || result.failedReason === PurchaseService.FAIL_REASON.MAX_LEVEL) {
            uiUtil.showTip("\u5df2\u8d2d\u6216\u5df2\u6ee1\u7ea7");
        } else if (result.failedReason === PurchaseService.FAIL_REASON.INSUFFICIENT_POINTS) {
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
        var talentDisplayInfo = purchaseDisplayContext.talentDisplayInfo;

        var d = new PayDialog(purchaseId, cb, ownerLayer);

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

        if (purchaseId < 200) {
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
