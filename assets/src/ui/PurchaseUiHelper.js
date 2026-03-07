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

    showPayDialog: function (purchaseId, cb, ownerLayer) {
        var strConfig = uiUtil.getPurchaseStringConfig(purchaseId);
        if ((PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_OPERATOR
                || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_UNI
                || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_AIYOUXI
                || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_HEYOUXI
            ) && purchaseId == 106) {
            strConfig.name = "靴子特惠";
        }
        var purchaseConfig = PurchaseService.getPurchaseConfig(purchaseId);
        var talentDisplayInfo = uiUtil.getTalentDisplayInfo(purchaseId, strConfig.name);

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
            var desstr;
            var effectstr;
            if (talentDisplayInfo) {
                desstr = talentDisplayInfo.desText;
                effectstr = talentDisplayInfo.effectText;
            } else {
                desstr = strConfig.des.replace(/\\n/g, "\n");
                effectstr = strConfig.effect.replace(/\\n/g, "\n");
            }

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
