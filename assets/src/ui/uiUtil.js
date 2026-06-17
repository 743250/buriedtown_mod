var uiUtil = uiUtil || {};

uiUtil.fontFamily = {
    normal: cc.sys.isNative && ((cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_CHINESE && !cc.sys.LANGUAGE_CHINESE_HANT) || cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_ENGLISH)
        ? "FZDaHei-B02S" : ""
};

uiUtil.fontSize = {
    //一般中号文字
    COMMON_0: 40,
    COMMON_1: 32,
    COMMON_2: 24,
    COMMON_3: 20,
    COMMON_4: 16
};

uiUtil.spacing = UITheme.spacing || {
    XXS: 4,
    XS: 8,
    SM: 12,
    MD: 16,
    LG: 24,
    XL: 32
};

uiUtil.zOrder = {
    BACKGROUND: -2,
    DECORATION: -1,
    CONTENT: 1,
    FLOAT: 2,
    OVERLAY: 5
};

uiUtil._buildTextPreset = function (name, defaultFontSize, defaultColor) {
    var theme = UITheme.typographyPresets[name] || {};
    return {
        fontFamily: uiUtil.fontFamily.normal,
        fontSize: theme.fontSize || defaultFontSize,
        color: theme.color || defaultColor
    };
};

uiUtil.textPreset = {
    title: uiUtil._buildTextPreset("title", uiUtil.fontSize.COMMON_1, UITheme.colors.TEXT_TITLE),
    sectionTitle: uiUtil._buildTextPreset("sectionTitle", uiUtil.fontSize.COMMON_2, UITheme.colors.TEXT_TITLE),
    body: uiUtil._buildTextPreset("body", uiUtil.fontSize.COMMON_3, UITheme.colors.TEXT_TITLE),
    meta: uiUtil._buildTextPreset("meta", uiUtil.fontSize.COMMON_4, cc.color(112, 112, 112, 255)),
    caption: uiUtil._buildTextPreset("caption", uiUtil.fontSize.COMMON_4, cc.color(96, 96, 96, 255)),
    inverse: uiUtil._buildTextPreset("inverse", uiUtil.fontSize.COMMON_4, cc.color(255, 255, 255, 255))
};

uiUtil.resolveTextPreset = function (presetName, opt) {
    var base = uiUtil.textPreset[presetName] || uiUtil.textPreset.body;
    var resolved = {};
    var key;

    for (key in base) {
        if (base.hasOwnProperty(key)) {
            resolved[key] = base[key];
        }
    }

    opt = opt || {};
    for (key in opt) {
        if (opt.hasOwnProperty(key) && opt[key] !== undefined) {
            resolved[key] = opt[key];
        }
    }

    return resolved;
};

uiUtil.applyLabelStyle = function (label, opt) {
    opt = opt || {};
    if (!label) {
        return label;
    }

    if (opt.anchorX !== undefined || opt.anchorY !== undefined) {
        var currentAnchor = label.getAnchorPoint ? label.getAnchorPoint() : {x: 0.5, y: 0.5};
        label.setAnchorPoint(
            opt.anchorX === undefined ? currentAnchor.x : opt.anchorX,
            opt.anchorY === undefined ? currentAnchor.y : opt.anchorY
        );
    }
    if (opt.color) {
        label.setColor(opt.color);
    }
    if (opt.hAlignment !== undefined && label.setHorizontalAlignment) {
        label.setHorizontalAlignment(opt.hAlignment);
    }
    if (opt.vAlignment !== undefined && label.setVerticalAlignment) {
        label.setVerticalAlignment(opt.vAlignment);
    }
    if (opt.strokeColor && label.enableStroke) {
        label.enableStroke(opt.strokeColor, opt.strokeSize || 1);
    }

    return label;
};

uiUtil.createLabel = function (txt, presetName, opt) {
    opt = opt || {};

    var dimensions = opt.dimensions || null;
    if (!dimensions && opt.width) {
        dimensions = cc.size(opt.width, opt.height || 0);
    }

    var style = uiUtil.resolveTextPreset(presetName, opt);
    var label = new cc.LabelTTF(
        txt || "",
        style.fontFamily || uiUtil.fontFamily.normal,
        style.fontSize || uiUtil.fontSize.COMMON_3,
        dimensions,
        style.hAlignment,
        style.vAlignment
    );

    return uiUtil.applyLabelStyle(label, style);
};

uiUtil.getNodeLayoutSize = function (node) {
    if (!node) {
        return cc.size(0, 0);
    }

    var size = node.getContentSize ? node.getContentSize() : null;
    var width = size && isFinite(size.width) ? size.width : (isFinite(node.width) ? node.width : 0);
    var height = size && isFinite(size.height) ? size.height : (isFinite(node.height) ? node.height : 0);
    var scaleX = node.getScaleX ? Math.abs(node.getScaleX()) : (node.scaleX !== undefined ? Math.abs(node.scaleX) : 1);
    var scaleY = node.getScaleY ? Math.abs(node.getScaleY()) : (node.scaleY !== undefined ? Math.abs(node.scaleY) : 1);

    return cc.size(width * scaleX, height * scaleY);
};

uiUtil.getNodeLayoutHeight = function (node) {
    return uiUtil.getNodeLayoutSize(node).height;
};

uiUtil.createVStack = function (opt) {
    opt = opt || {};

    return {
        parent: opt.parent || null,
        x: opt.x || 0,
        y: opt.top || 0,
        gap: opt.gap === undefined ? 0 : opt.gap,
        zOrder: opt.zOrder === undefined ? uiUtil.zOrder.CONTENT : opt.zOrder,

        add: function (node, nodeOpt) {
            nodeOpt = nodeOpt || {};
            if (!node) {
                return null;
            }

            var topY = this.y - (nodeOpt.marginTop || 0);
            var posX = nodeOpt.x === undefined ? this.x : nodeOpt.x;
            var anchorX = nodeOpt.anchorX === undefined ? 0 : nodeOpt.anchorX;
            var anchorY = nodeOpt.anchorY === undefined ? 1 : nodeOpt.anchorY;

            if (node.setAnchorPoint) {
                node.setAnchorPoint(anchorX, anchorY);
            }
            node.setPosition(posX, topY);

            if (this.parent && node.getParent() !== this.parent) {
                this.parent.addChild(node, nodeOpt.zOrder === undefined ? this.zOrder : nodeOpt.zOrder);
            }

            this.y = topY - uiUtil.getNodeLayoutHeight(node) - (nodeOpt.gapAfter === undefined ? this.gap : nodeOpt.gapAfter);
            return node;
        },

        reserve: function (height, gap) {
            this.y -= height + (gap === undefined ? this.gap : gap);
            return this.y;
        },

        setY: function (nextY) {
            this.y = nextY;
            return this;
        },

        getY: function () {
            return this.y;
        }
    };
};

uiUtil.getDisplayItemId = function (itemId) {
    if (typeof ContentBlueprint !== "undefined"
        && ContentBlueprint
        && typeof ContentBlueprint.getItemDisplayId === "function") {
        return ContentBlueprint.getItemDisplayId(itemId);
    }

    itemId = parseInt(itemId);
    if (typeof WeaponCraftService !== "undefined" && WeaponCraftService && WeaponCraftService.getDisplayItemId) {
        itemId = WeaponCraftService.getDisplayItemId(itemId);
    }
    if (typeof itemConfig !== "undefined" && itemConfig && itemConfig[itemId] && itemConfig[itemId].displayItemId !== undefined) {
        var displayItemId = parseInt(itemConfig[itemId].displayItemId);
        if (isFinite(displayItemId)) {
            itemId = displayItemId;
        }
    }
    if (itemId === 1301091) return 1301011;
    return itemId;
};

uiUtil._normalizeSpriteName = function (name, withHash) {
    if (name === undefined || name === null || name === "") {
        return "";
    }
    var hasHash = name.charAt(0) === "#";
    if (withHash) {
        return hasHash ? name : "#" + name;
    }
    return hasHash ? name.substring(1) : name;
};

uiUtil._buildSpriteName = function (prefix, id, withHash, defaultType) {
    var numericId = parseInt(id, 10);
    if (!isFinite(numericId)) {
        return uiUtil.getDefaultSpriteName(defaultType, withHash);
    }
    return uiUtil._normalizeSpriteName(prefix + numericId + ".png", withHash);
};

uiUtil.getDefaultSpriteName = function (type, withHash) {
    var name = null;
    if (typeof ResourceFallback !== "undefined" && ResourceFallback && ResourceFallback.DEFAULT_SPRITES) {
        name = ResourceFallback.DEFAULT_SPRITES[type] || null;
    }
    if (!name) {
        var defaultMap = {
            character: "npc_dig_0.png",
            talent: "icon_iap_0.png",
            purchase: "icon_iap_101.png",
            item: "icon_item_1101051.png",
            itemDetail: "dig_item_1101051.png",
            npcMap: "npc_1.png",
            site: "site_1.png"
        };
        name = defaultMap[type] || "";
    }
    return uiUtil._normalizeSpriteName(name, withHash);
};

uiUtil.getRolePortraitFrameName = function (roleType, withHash) {
    if (typeof IconHelper !== "undefined" && IconHelper && typeof IconHelper.getRolePortraitFrameName === "function") {
        return uiUtil._normalizeSpriteName(
            IconHelper.getRolePortraitFrameName(roleType, withHash, uiUtil.getDefaultSpriteName("character", withHash)),
            withHash
        );
    }
    roleType = parseInt(roleType);
    if (isNaN(roleType)) {
        return uiUtil.getDefaultSpriteName("character", withHash);
    }
    if (typeof role !== "undefined" && role && typeof role.getAvatarFallbackByRoleType === "function") {
        var avatarFallback = role.getAvatarFallbackByRoleType(roleType);
        if (avatarFallback) {
            return uiUtil._normalizeSpriteName(avatarFallback, withHash);
        }
    }
    return uiUtil._buildSpriteName("npc_dig_", roleType, withHash, "character");
};

uiUtil.getNpcMapFrameName = function (npcId, withHash) {
    if (typeof IconHelper !== "undefined" && IconHelper && typeof IconHelper.getRoleMapFrameName === "function") {
        return uiUtil._normalizeSpriteName(
            IconHelper.getRoleMapFrameName(npcId, withHash, uiUtil.getDefaultSpriteName("npcMap", withHash)),
            withHash
        );
    }
    npcId = parseInt(npcId);
    if (isNaN(npcId)) {
        return uiUtil.getDefaultSpriteName("npcMap", withHash);
    }
    if (typeof role !== "undefined" && role && typeof role.getMapRoleTypeByRoleType === "function") {
        var mapRoleType = role.getMapRoleTypeByRoleType(npcId);
        if (isFinite(mapRoleType)) {
            npcId = parseInt(mapRoleType);
        }
    }
    return uiUtil._buildSpriteName("npc_", npcId, withHash, "npcMap");
};

uiUtil.getTalentIconFrameName = function (purchaseId, withHash) {
    return uiUtil._buildSpriteName("icon_iap_", purchaseId, withHash, "talent");
};

uiUtil.getPurchaseIconFrameName = function (purchaseId, withHash) {
    return uiUtil._buildSpriteName("icon_iap_", purchaseId, withHash, "purchase");
};

uiUtil.getItemIconFrameName = function (itemId, withHash) {
    var displayItemId = uiUtil.getDisplayItemId(itemId);
    return uiUtil._buildSpriteName("icon_item_", displayItemId, withHash, "item");
};

uiUtil.getItemDetailFrameName = function (itemId, withHash) {
    var displayItemId = uiUtil.getDisplayItemId(itemId);
    return uiUtil._buildSpriteName("dig_item_", displayItemId, withHash, "itemDetail");
};

uiUtil.getSiteIconFrameName = function (siteId, withHash) {
    return uiUtil._buildSpriteName("site_", siteId, withHash, "site");
};

uiUtil._resolveIconSprite = function (defaultType, fallbackFnName, fallbackId, frameName, fallbackName) {
    var resolvedFallback = fallbackName || uiUtil.getDefaultSpriteName(defaultType, false);
    if (typeof ResourceFallback !== "undefined" && ResourceFallback && typeof ResourceFallback[fallbackFnName] === "function") {
        return ResourceFallback[fallbackFnName](fallbackId, resolvedFallback);
    }
    return SafetyHelper.safeLoadSprite(frameName, resolvedFallback);
};

uiUtil.getCharacterPortraitSpriteByRoleType = function (roleType, fallbackName) {
    return uiUtil._resolveIconSprite(
        "character", "getCharacterIcon",
        roleType, uiUtil.getRolePortraitFrameName(roleType, false),
        fallbackName
    );
};

uiUtil.getTalentIconSprite = function (purchaseId, fallbackName) {
    return uiUtil._resolveIconSprite(
        "talent", "getTalentIcon",
        purchaseId, uiUtil.getTalentIconFrameName(purchaseId, false),
        fallbackName
    );
};

uiUtil.getPurchaseIconSprite = function (purchaseId, fallbackName) {
    return uiUtil._resolveIconSprite(
        "purchase", "getPurchaseIcon",
        purchaseId, uiUtil.getPurchaseIconFrameName(purchaseId, false),
        fallbackName
    );
};

uiUtil.getItemIconSprite = function (itemId, fallbackName) {
    return uiUtil._resolveIconSprite(
        "item", "getItemIcon",
        uiUtil.getDisplayItemId(itemId), uiUtil.getItemIconFrameName(itemId, false),
        fallbackName
    );
};

uiUtil.getPurchaseDisplayIconMeta = function (purchaseId, purchaseConfig) {
    if (typeof PurchaseUiHelper !== "undefined" && PurchaseUiHelper && typeof PurchaseUiHelper.getDisplayIconMeta === "function") {
        return PurchaseUiHelper.getDisplayIconMeta(purchaseId, purchaseConfig);
    }
    return null;
};

uiUtil.createPurchaseDisplayIcon = function (purchaseId, purchaseConfig) {
    if (typeof PurchaseUiHelper !== "undefined" && PurchaseUiHelper && typeof PurchaseUiHelper.createDisplayIcon === "function") {
        return PurchaseUiHelper.createDisplayIcon(purchaseId, purchaseConfig);
    }
    return {
        icon: new cc.Sprite(),
        isRolePortrait: false,
        isSupportPackIcon: false
    };
};

uiUtil.getPurchaseTitleIconConfig = function (purchaseId, purchaseConfig) {
    if (typeof PurchaseUiHelper !== "undefined" && PurchaseUiHelper && typeof PurchaseUiHelper.getTitleIconConfig === "function") {
        return PurchaseUiHelper.getTitleIconConfig(purchaseId, purchaseConfig);
    }
    return null;
};


uiUtil.createBtn2 = function (txt, target, cb) {
    var label = new cc.LabelTTF(txt, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
    var btn = new cc.ControlButton(label);
    btn.addTargetWithActionForControlEvents(target, function (sender) {
        audioManager.playEffect(audioManager.sound.CLICK);
        utils.invokeCallback(cb, sender);
    }, cc.CONTROL_EVENT_TOUCH_UP_INSIDE);
    //btn.setZoomOnTouchDown(false);
    btn.setAdjustBackgroundImage(false);
    return btn;
}

uiUtil.createSpriteBtn = function (spriteState, target, cb, rect) {
    cc.assert(spriteState.normal, "must have normal!");

    var fontInfo = spriteState.fontInfo || {};
    var txt = fontInfo.txt || "";
    var font = fontInfo.font || uiUtil.fontFamily.normal;
    var fontSize = fontInfo.fontSize || uiUtil.fontSize.COMMON_2;

    fontSize -= 4;

    var normalSprite = autoSpriteFrameController.getScale9Sprite(spriteState.normal, rect);
    var label = new cc.LabelTTF(txt, font, fontSize, cc.size(normalSprite.width, 0), cc.TEXT_ALIGNMENT_CENTER);

    var btn = new cc.ControlButton(label, normalSprite);
    btn.setContentSize(normalSprite.getSprite().getContentSize());
    if (spriteState.pressed) {
        var pressedSprite = autoSpriteFrameController.getScale9Sprite(spriteState.pressed, rect);
        btn.setBackgroundSpriteForState(pressedSprite, cc.CONTROL_STATE_HIGHLIGHTED);
    }
    if (spriteState.disable) {
        var disableSprite = autoSpriteFrameController.getScale9Sprite(spriteState.disable, rect);
        btn.setBackgroundSpriteForState(disableSprite, cc.CONTROL_STATE_DISABLED);
    }
    if (spriteState.icon_state_1) {
        var iconState1 = autoSpriteFrameController.getSpriteFromSpriteName("#" + spriteState.icon_state_1);
        iconState1.setPosition(btn.getContentSize().width / 2, btn.getContentSize().height / 2);
        iconState1.tag = 1;
        btn.addChild(iconState1);
    }
    if (spriteState.icon_state_2) {
        var iconState2 = autoSpriteFrameController.getSpriteFromSpriteName("#" + spriteState.icon_state_2);
        iconState2.setPosition(btn.getContentSize().width / 2, btn.getContentSize().height / 2);
        iconState2.tag = 2;
        btn.addChild(iconState2);
        btn.isRadio = true;
        btn.isSelected = false;
        iconState2.setVisible(false);

        btn.changeRadio = function (seleted) {
            this.isSelected = seleted;
            if (seleted) {
                iconState1.setVisible(false);
                iconState2.setVisible(true);
            } else {
                iconState1.setVisible(true);
                iconState2.setVisible(false);
            }
        }
    }

    btn.addTargetWithActionForControlEvents(target, function (sender) {
        if (sender.isRadio) {
            sender.isSelected = !sender.isSelected;
            sender.changeRadio(sender.isSelected);
        }
        audioManager.playEffect(audioManager.sound.CLICK);
        cb.call(target, sender);
    }, cc.CONTROL_EVENT_TOUCH_UP_INSIDE);
    btn.setAdjustBackgroundImage(false);
    //btn.setZoomOnTouchDown(false);
    return btn;
}

uiUtil.createCommonBtnBlack = function (txt, target, cb) {
    var commonButtonTheme = UITheme.buttons && UITheme.buttons.common ? UITheme.buttons.common : {};
    var btn = uiUtil.createSpriteBtn({
        normal: "btn_common_black_normal.png",
        fontInfo: {
            txt: txt,
            fontSize: commonButtonTheme.fontSize || (uiUtil.fontSize.COMMON_2 + 4)
        }
    }, target, cb);
    if (commonButtonTheme.preferredSize && btn.setPreferredSize) {
        btn.setPreferredSize(commonButtonTheme.preferredSize);
    }
    if (commonButtonTheme.zoomOnTouchDown === false && btn.setZoomOnTouchDown) {
        btn.setZoomOnTouchDown(false);
    }
    btn.setTitleColorForState(commonButtonTheme.blackTextColor || UITheme.colors.WHITE, cc.CONTROL_STATE_NORMAL);
    btn.setTitleColorForState(commonButtonTheme.disabledColor || UITheme.colors.GRAY, cc.CONTROL_STATE_DISABLED);
    return btn;
}

uiUtil.createCommonBtnWhite = function (txt, target, cb) {
    var commonButtonTheme = UITheme.buttons && UITheme.buttons.common ? UITheme.buttons.common : {};
    var btn = uiUtil.createSpriteBtn({
        normal: "btn_common_white_normal.png",
        fontInfo: {
            txt: txt,
            fontSize: commonButtonTheme.fontSize || (uiUtil.fontSize.COMMON_2 + 4)
        }
    }, target, cb);
    if (commonButtonTheme.preferredSize && btn.setPreferredSize) {
        btn.setPreferredSize(commonButtonTheme.preferredSize);
    }
    if (commonButtonTheme.zoomOnTouchDown === false && btn.setZoomOnTouchDown) {
        btn.setZoomOnTouchDown(false);
    }
    btn.setTitleColorForState(commonButtonTheme.whiteTextColor || UITheme.colors.TEXT_TITLE, cc.CONTROL_STATE_NORMAL);
    btn.setTitleColorForState(commonButtonTheme.disabledColor || UITheme.colors.GRAY, cc.CONTROL_STATE_DISABLED);
    return btn;
}

uiUtil.createSmallCommonBtnWhite = function (txt, target, cb, opt) {
    opt = opt || {};

    var smallButtonTheme = UITheme.buttons && UITheme.buttons.small ? UITheme.buttons.small : {};
    var commonButtonTheme = UITheme.buttons && UITheme.buttons.common ? UITheme.buttons.common : {};
    var size = opt.size || smallButtonTheme.preferredSize || cc.size(72, 30);
    var fontSize = opt.fontSize || smallButtonTheme.fontSize || uiUtil.fontSize.COMMON_4;
    if (opt.manualClick) {
        var manualBtn = new ButtonWithPressed(size);
        var bg = autoSpriteFrameController.getScale9Sprite("btn_common_white_normal.png", cc.rect(1, 1, 1, 1));
        bg.setName("bg");
        bg.setAnchorPoint(0.5, 0.5);
        bg.setPosition(size.width / 2, size.height / 2);
        bg.setContentSize(size);
        manualBtn.addChild(bg, -1);

        var label = new cc.LabelTTF(txt || "", uiUtil.fontFamily.normal, fontSize);
        label.setName("label");
        label.setPosition(size.width / 2, size.height / 2);
        label.setColor(UITheme.colors.TEXT_TITLE);
        manualBtn.addChild(label, 1);

        if (target && cb) {
            manualBtn.setClickListener(target, cb);
        }

        return manualBtn;
    }

    var btn = uiUtil.createSpriteBtn({
        normal: "btn_common_white_normal.png",
        fontInfo: {txt: txt || "", fontSize: fontSize}
    }, target, cb, cc.rect(1, 1, 1, 1));
    btn.setPreferredSize(size);
    if (commonButtonTheme.zoomOnTouchDown === false && btn.setZoomOnTouchDown) {
        btn.setZoomOnTouchDown(false);
    }
    btn.setTitleColorForState(commonButtonTheme.whiteTextColor || UITheme.colors.TEXT_TITLE, cc.CONTROL_STATE_NORMAL);
    btn.setTitleColorForState(commonButtonTheme.disabledColor || UITheme.colors.GRAY, cc.CONTROL_STATE_DISABLED);
    return btn;
}

uiUtil.createTextActionButton = function (txt, target, cb, opt) {
    opt = opt || {};

    var size = opt.size || cc.size(64, 24);
    var fontSize = opt.fontSize || uiUtil.fontSize.COMMON_3;
    var normalColor = opt.color || UITheme.colors.WHITE;
    var pressedColor = opt.pressedColor || cc.color(200, 200, 200, 255);
    var disabledColor = opt.disabledColor || UITheme.colors.GRAY;

    var btn = new Button(size);
    var label = new cc.LabelTTF(txt || "", uiUtil.fontFamily.normal, fontSize);
    label.setName("label");
    label.setPosition(size.width / 2, size.height / 2);
    label.setColor(normalColor);
    btn.addChild(label, 1);

    btn._textActionColors = {
        normal: normalColor,
        pressed: pressedColor,
        disabled: disabledColor
    };

    btn.onPressed = function () {
        var actionLabel = this.getChildByName("label");
        if (actionLabel) {
            actionLabel.setColor(this._textActionColors.pressed);
        }
        Button.prototype.onPressed.call(this);
    };

    btn.onRelease = function (isInBound) {
        var actionLabel = this.getChildByName("label");
        if (actionLabel) {
            actionLabel.setColor(this.isEnabled() ? this._textActionColors.normal : this._textActionColors.disabled);
        }
        Button.prototype.onRelease.call(this, isInBound);
    };

    btn.setEnabled = function (enabled) {
        Button.prototype.setEnabled.call(this, enabled);
        var actionLabel = this.getChildByName("label");
        if (actionLabel) {
            actionLabel.setColor(enabled ? this._textActionColors.normal : this._textActionColors.disabled);
        }
    };

    if (target && cb) {
        btn.setClickListener(target, cb);
    }

    return btn;
}

uiUtil.createColorRect = function (size, color, opacity) {
    var rect = new cc.LayerColor();
    rect.setColor(color || cc.color(255, 255, 255, 255));
    rect.setOpacity(opacity === undefined ? 255 : opacity);
    rect.setContentSize(size);
    rect.setAnchorPoint(0, 0);
    return rect;
};

uiUtil.createPaperPanel = function (size, opt) {
    opt = opt || {};

    var node = new cc.Node();
    node.setContentSize(size);
    node.width = size.width;
    node.height = size.height;

    var shadowOffset = opt.shadowOffset || cc.p(3, -3);
    var shadow = uiUtil.createColorRect(
        size,
        opt.shadowColor || cc.color(0, 0, 0, 255),
        opt.shadowOpacity === undefined ? 18 : opt.shadowOpacity
    );
    shadow.setPosition(shadowOffset.x, shadowOffset.y);
    node.addChild(shadow, -2);

    var fill = autoSpriteFrameController.getScale9Sprite("btn_common_white_normal.png", cc.rect(1, 1, 1, 1));
    fill.setContentSize(cc.size(size.width - 6, size.height - 6));
    fill.setColor(opt.fillColor || cc.color(255, 255, 255, 255));
    fill.setOpacity(opt.fillOpacity === undefined ? 235 : opt.fillOpacity);
    fill.setPosition(size.width / 2, size.height / 2);
    node.addChild(fill, -1);

    var frame = autoSpriteFrameController.getScale9Sprite("frame_tab_content.png", cc.rect(14, 14, 1, 1));
    frame.setContentSize(size);
    frame.setColor(opt.frameColor || cc.color(172, 172, 172, 255));
    frame.setOpacity(opt.frameOpacity === undefined ? 138 : opt.frameOpacity);
    frame.setPosition(size.width / 2, size.height / 2);
    // Keep the frame behind later-added content. Many old scenes append labels/buttons after
    // panel construction and rely on default z-order.
    node.addChild(frame, 0);

    return node;
};

uiUtil.createStatusPill = function (txt, opt) {
    opt = opt || {};

    var size = opt.size || cc.size(132, 40);
    var node = new cc.Node();
    node.setContentSize(size);
    node.width = size.width;
    node.height = size.height;

    var bg = autoSpriteFrameController.getScale9Sprite("tab_content_btn_normal.png", cc.rect(1, 1, 1, 1));
    bg.setContentSize(size);
    bg.setColor(opt.bgColor || cc.color(32, 32, 32, 255));
    bg.setOpacity(opt.bgOpacity === undefined ? 235 : opt.bgOpacity);
    bg.setPosition(size.width / 2, size.height / 2);
    node.addChild(bg);

    var label = new cc.LabelTTF(txt || "", uiUtil.fontFamily.normal, opt.fontSize || 16, cc.size(size.width - 8, 0), cc.TEXT_ALIGNMENT_CENTER);
    label.setColor(opt.textColor || cc.color(255, 255, 255, 255));
    label.setPosition(size.width / 2, size.height / 2);
    node.addChild(label);

    node.setLabelString = function (text) {
        label.setString(text || "");
    };

    return node;
};

uiUtil.createTextTabButton = function (txt, target, cb, opt) {
    opt = opt || {};

    var btn = uiUtil.createTextActionButton(txt, target, cb, {
        size: opt.size || cc.size(152, 34),
        fontSize: opt.fontSize || 24,
        color: opt.color || cc.color(146, 146, 146, 255),
        pressedColor: opt.pressedColor || cc.color(58, 58, 58, 255),
        disabledColor: opt.disabledColor || cc.color(146, 146, 146, 255)
    });

    btn._tabColors = {
        selected: opt.selectedColor || cc.color(0, 0, 0, 255),
        normal: opt.color || cc.color(146, 146, 146, 255)
    };
    btn._tabScale = {
        selected: opt.selectedScale || 1.06,
        normal: 1
    };
    btn._tabOpacity = {
        selected: opt.selectedOpacity || 255,
        normal: opt.normalOpacity || 228
    };

    btn.setSelectedState = function (selected) {
        var label = this.getChildByName("label");
        if (label) {
            label.setColor(selected ? this._tabColors.selected : this._tabColors.normal);
        }
        this.setScale(selected ? this._tabScale.selected : this._tabScale.normal);
        this.setOpacity(selected ? this._tabOpacity.selected : this._tabOpacity.normal);
    };

    btn.setSelectedState(false);
    return btn;
};

uiUtil.safeRunScene = function (sceneFactoryOrScene, opt) {
    opt = opt || {};
    try {
        var scene = typeof sceneFactoryOrScene === "function"
            ? sceneFactoryOrScene()
            : sceneFactoryOrScene;
        if (!scene) {
            throw new Error("scene is null");
        }
        cc.director.runScene(scene);
        return true;
    } catch (e) {
        cc.e("safeRunScene error: " + e);
        if (e && e.stack) {
            cc.e(e.stack);
        }
        if (!opt.silentTip) {
            uiUtil.showTip(opt.errorTip || "界面打开失败");
        }
        return false;
    }
};

uiUtil.createBigBtnWhite = function (txt, target, cb) {
    var btn = uiUtil.createSpriteBtn({
        normal: "btn_big_white_normal.png",
        fontInfo: {txt: txt, fontSize: uiUtil.fontSize.COMMON_1}
    }, target, cb);
    btn.setTitleColorForState(UITheme.colors.TEXT_TITLE, cc.CONTROL_STATE_NORMAL);
    btn.setTitleColorForState(UITheme.colors.GRAY, cc.CONTROL_STATE_DISABLED);
    return btn;
};

uiUtil.createToolBtn = function (target, cb) {
    var btn = uiUtil.createSpriteBtn({
        normal: "btn_tool.png"
    }, target, cb);
    return btn;
}

uiUtil.createStatusBtn = function (txt, target, cb) {
    var label = new cc.LabelTTF(txt, "", 20);
    var btn = new cc.ControlButton(label);
    btn.label = label;
    btn.addTargetWithActionForControlEvents(target, function (sender) {
        audioManager.playEffect(audioManager.sound.CLICK);
        utils.invokeCallback(cb, sender);
    }, cc.CONTROL_EVENT_TOUCH_UP_INSIDE);
    //btn.setAdjustBackgroundImage(false);
    return btn;
}

uiUtil.createCommonToolIcon = function (contentIconName, target, cb) {
    var btn = uiUtil.createSpriteBtn({normal: "build_icon_bg.png"}, target, cb);
    var s = autoSpriteFrameController.getSpriteFromSpriteName(contentIconName);
    s.setPosition(btn.getContentSize().width / 2, btn.getContentSize().height);
    btn.addChild(s);
}
uiUtil.createCommonListItem = function (clickIcon, action1, action2) {
    var bgNode = new cc.Node();
    bgNode.setContentSize(600, 100);

    var iconBg = uiUtil.createSpriteBtn({normal: "build_icon_bg.png"}, clickIcon.target, clickIcon.cb);
    iconBg.setPosition(20 + iconBg.getContentSize().width / 2, bgNode.getContentSize().height / 2);
    iconBg.setName("iconBg");
    bgNode.addChild(iconBg);

    var contentBaseX = iconBg.getPositionX() + iconBg.getContentSize().width / 2 + 10;
    var contentRightPadding = 16;
    var contentActionGap = 12;
    var contentTopPadding = 8;
    var contentBottomPadding = 6;
    var contentBaseY = bgNode.getContentSize().height - contentTopPadding;
    var contentGap = 2;
    var progressGap = 4;
    var progressMinY = contentBottomPadding;
    var progressDefaultY = contentBottomPadding;
    var contentMinWidth = 220;
    var contentDefaultWidth = 300;

    var hintScrollBarWidth = 4;
    var hintScrollBarGap = 4;
    var hintMinHeight = uiUtil.fontSize.COMMON_3 + 6;
    var hintScrollContent = new cc.Node();
    hintScrollContent.setAnchorPoint(0, 0);
    hintScrollContent.setContentSize(contentDefaultWidth, hintMinHeight);

    var hintScrollView = new cc.ScrollView(cc.size(contentDefaultWidth, hintMinHeight), hintScrollContent);
    hintScrollView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
    hintScrollView.setBounceable(false);
    hintScrollView.setClippingToBounds(true);
    hintScrollView.setAnchorPoint(0, 0);
    hintScrollView.setPosition(contentBaseX, contentBaseY - hintMinHeight);
    hintScrollView.setName("hintScrollView");
    if (typeof hintScrollView.setTouchEnabled === "function") {
        hintScrollView.setTouchEnabled(false);
    }
    bgNode.addChild(hintScrollView);

    var hint = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(contentDefaultWidth, 0));
    hint.setAnchorPoint(0, 1);
    hint.setName("hint");
    hint.setColor(UITheme.colors.WHITE);
    hintScrollContent.addChild(hint);

    var hintScrollTrack = uiUtil.createColorRect(cc.size(hintScrollBarWidth, hintMinHeight), UITheme.colors.GRAY, 120);
    hintScrollTrack.setAnchorPoint(0, 0);
    hintScrollTrack.setPosition(contentBaseX + contentDefaultWidth + hintScrollBarGap, contentBaseY - hintMinHeight);
    hintScrollTrack.setVisible(false);
    bgNode.addChild(hintScrollTrack);

    var hintScrollThumb = uiUtil.createColorRect(cc.size(hintScrollBarWidth, hintMinHeight), UITheme.colors.WHITE, 220);
    hintScrollThumb.setAnchorPoint(0, 1);
    hintScrollThumb.setPosition(hintScrollTrack.getPositionX(), contentBaseY);
    hintScrollThumb.setVisible(false);
    bgNode.addChild(hintScrollThumb);

    var updateHintScrollThumb = function () {
        var viewSize = hintScrollView.getViewSize ? hintScrollView.getViewSize() : cc.size(contentDefaultWidth, hintMinHeight);
        var contentSize = hintScrollView.getContentSize ? hintScrollView.getContentSize() : cc.size(viewSize.width, viewSize.height);
        var trackHeight = hintScrollTrack.getContentSize().height;
        var minOffsetY = Math.min(0, viewSize.height - contentSize.height);
        var hasOverflow = contentSize.height > viewSize.height + 1 && trackHeight > 0;

        hintScrollTrack.setVisible(hasOverflow);
        hintScrollThumb.setVisible(hasOverflow);

        if (!hasOverflow) {
            return;
        }

        var thumbHeight = Math.max(14, Math.floor(trackHeight * viewSize.height / contentSize.height));
        var maxTravel = Math.max(0, trackHeight - thumbHeight);
        var offsetY = hintScrollView.getContentOffset ? hintScrollView.getContentOffset().y : minOffsetY;
        var ratio = minOffsetY === 0 ? 0 : (offsetY - minOffsetY) / (0 - minOffsetY);
        ratio = Math.max(0, Math.min(1, ratio));

        hintScrollThumb.setContentSize(cc.size(hintScrollBarWidth, thumbHeight));
        hintScrollThumb.setPosition(
            hintScrollTrack.getPositionX(),
            hintScrollTrack.getPositionY() + trackHeight - maxTravel * ratio
        );
    };

    var hintScrollDelegate = {
        scrollViewDidScroll: function () {
            updateHintScrollThumb();
        },
        scrollViewDidZoom: function () {
        }
    };
    if (typeof hintScrollView.setDelegate === "function") {
        hintScrollView.setDelegate(hintScrollDelegate);
    }

    var pbBg = autoSpriteFrameController.getSpriteFromSpriteName("#pb_bg.png");
    pbBg.setPosition(contentBaseX, progressDefaultY);
    pbBg.setAnchorPoint(0, 0);
    pbBg.setName("pbBg");
    bgNode.addChild(pbBg);

    var pb = new cc.ProgressTimer(autoSpriteFrameController.getSpriteFromSpriteName("#pb.png"));
    pb.type = cc.ProgressTimer.TYPE_BAR;
    pb.midPoint = cc.p(0, 0);
    pb.barChangeRate = cc.p(1, 0);
    pb.setPosition(pbBg.getPositionX() + pbBg.getContentSize().width / 2, pbBg.getPositionY() + pbBg.getContentSize().height / 2);
    pb.setPercentage(0);
    pb.setName("pb");
    bgNode.addChild(pb);

    if (action1) {
        var action1 = uiUtil.createSpriteBtn({
            normal: "btn_common_white_normal.png",
            fontInfo: action1.fontInfo
        }, action1.target, action1.cb);
        action1.setTitleColorForState(UITheme.colors.TEXT_TITLE, cc.CONTROL_STATE_NORMAL);
        action1.setTitleColorForState(UITheme.colors.GRAY, cc.CONTROL_STATE_DISABLED);
        action1.setPosition(bgNode.getContentSize().width - 10 - action1.getContentSize().width / 2, bgNode.getContentSize().height / 2);
        action1.setName("action1");
        bgNode.addChild(action1);
    }

    if (action2) {
        var action2 = uiUtil.createSpriteBtn({
            normal: "btn_common_white_normal.png",
            fontInfo: action2.fontInfo
        }, action2.target, action2.cb);
        action2.setTitleColorForState(UITheme.colors.TEXT_TITLE, cc.CONTROL_STATE_NORMAL);
        action2.setTitleColorForState(UITheme.colors.GRAY, cc.CONTROL_STATE_DISABLED);
        action2.setPosition(bgNode.getContentSize().width - 10 - action2.getContentSize().width / 2, bgNode.getContentSize().height / 2);
        action2.setName("action2");
        action2.setVisible(false);
        bgNode.addChild(action2);
    }

    var getVisibleActionButtons = function () {
        var buttons = [];
        if (action1 && action1.isVisible()) {
            buttons.push(action1);
        }
        if (action2 && action2.isVisible()) {
            buttons.push(action2);
        }
        return buttons;
    };

    var getContentWidth = function () {
        var rightEdge = bgNode.getContentSize().width - contentRightPadding;
        var visibleButtons = getVisibleActionButtons();
        visibleButtons.forEach(function (button) {
            rightEdge = Math.min(rightEdge, button.getPositionX() - button.getContentSize().width / 2 - contentActionGap);
        });
        return Math.max(contentMinWidth, rightEdge - contentBaseX);
    };

    var getHintContentWidth = function () {
        var contentWidth = getContentWidth();
        return Math.max(120, contentWidth - hintScrollBarWidth - hintScrollBarGap);
    };

    var updateHintWidth = function () {
        var hintContentWidth = getHintContentWidth();
        if (hint.setDimensions) {
            hint.setDimensions(cc.size(hintContentWidth, 0));
        }
        return hintContentWidth;
    };

    var ensureRichTextButton = function (richText) {
        if (!richText || richText.getChildByName("itemListBtn")) {
            return;
        }

        var itemListBtn = new ButtonWithPressed(richText.getContentSize());
        itemListBtn.setAnchorPoint(0, 0);
        itemListBtn.setPosition(0, 0);
        richText.addChild(itemListBtn);
        itemListBtn.setClickListener(richText, function () {
            uiUtil.showItemListDialog(this.itemInfos);
        });
        itemListBtn.setName("itemListBtn");
    };

    var refreshRichTextWidth = function (richText) {
        if (!richText) {
            return;
        }

        var contentWidth = getContentWidth();
        if (richText.width !== contentWidth) {
            richText.width = contentWidth;
            richText.updateView(richText.itemInfos || []);
            ensureRichTextButton(richText);
        }
    };

    var actionLayoutMode = "horizontal";
    var refreshActionButtonLayout = function () {
        if (actionLayoutMode === "stacked"
            && action1 && action1.isVisible()
            && action2 && action2.isVisible()) {
            var stackedButtons = [action2, action1];
            var stackedGap = 4;
            var stackedHeight = 0;
            stackedButtons.forEach(function (button, index) {
                stackedHeight += button.getContentSize().height;
                if (index < stackedButtons.length - 1) {
                    stackedHeight += stackedGap;
                }
            });

            var currentY = (bgNode.getContentSize().height + stackedHeight) / 2;
            var rightX = bgNode.getContentSize().width - 10;
            stackedButtons.forEach(function (button) {
                var buttonHeight = button.getContentSize().height;
                button.setPosition(rightX - button.getContentSize().width / 2, currentY - buttonHeight / 2);
                currentY -= buttonHeight + stackedGap;
            });
            return;
        }

        var visibleButtons = [];
        var rightEdge = bgNode.getContentSize().width - 10;
        var gap = 12;
        if (action2 && action2.isVisible()) {
            visibleButtons.push(action2);
        }
        if (action1 && action1.isVisible()) {
            visibleButtons.push(action1);
        }
        for (var buttonIndex = visibleButtons.length - 1; buttonIndex >= 0; buttonIndex--) {
            var button = visibleButtons[buttonIndex];
            button.setPosition(rightEdge - button.getContentSize().width / 2, bgNode.getContentSize().height / 2);
            rightEdge -= button.getContentSize().width + gap;
        }
    };
    var relayoutContent = function () {
        var hintText = hint.getString ? hint.getString() : "";
        var richText = bgNode.getChildByName("richText");
        if (richText) {
            refreshRichTextWidth(richText);
        }
        var richTextHeight = richText ? uiUtil.getNodeLayoutHeight(richText) : 0;
        var hintContentWidth = updateHintWidth();
        var nextContentY = contentBaseY;
        var hintHeight = 0;

        if (hintText) {
            hintHeight = uiUtil.getNodeLayoutHeight(hint);
            var hintAvailableHeight = contentBaseY - progressDefaultY - pbBg.getContentSize().height - progressGap;
            if (richTextHeight > 0) {
                hintAvailableHeight -= contentGap + richTextHeight;
            }
            hintAvailableHeight = Math.max(0, hintAvailableHeight);

            var hintVisibleHeight = Math.min(hintHeight, Math.max(hintMinHeight, hintAvailableHeight));
            hintScrollContent.setContentSize(hintContentWidth, Math.max(hintHeight, hintVisibleHeight));
            hint.setPosition(0, hintHeight);
            if (typeof hintScrollView.setViewSize === "function") {
                hintScrollView.setViewSize(cc.size(hintContentWidth, hintVisibleHeight));
            }
            hintScrollView.setContentSize(hintContentWidth, Math.max(hintHeight, hintVisibleHeight));
            hintScrollView.setPosition(contentBaseX, contentBaseY - hintVisibleHeight);
            hintScrollTrack.setContentSize(cc.size(hintScrollBarWidth, hintVisibleHeight));
            hintScrollTrack.setPosition(contentBaseX + hintContentWidth + hintScrollBarGap, contentBaseY - hintVisibleHeight);
            hintScrollView.setVisible(true);

            var hintOffset = hintScrollView.getContentOffset ? hintScrollView.getContentOffset() : cc.p(0, 0);
            hintOffset.y = Math.min(0, hintVisibleHeight - hintHeight);
            hintOffset.x = 0;
            if (typeof hintScrollView.setContentOffset === "function") {
                hintScrollView.setContentOffset(hintOffset);
            }
            if (typeof hintScrollView.setTouchEnabled === "function") {
                hintScrollView.setTouchEnabled(hintHeight > hintVisibleHeight + 1);
            }
            updateHintScrollThumb();
            nextContentY -= hintVisibleHeight;
        } else {
            hintScrollContent.setContentSize(hintContentWidth, hintMinHeight);
            hint.setPosition(0, 0);
            if (typeof hintScrollView.setViewSize === "function") {
                hintScrollView.setViewSize(cc.size(hintContentWidth, hintMinHeight));
            }
            hintScrollView.setContentSize(hintContentWidth, hintMinHeight);
            hintScrollView.setVisible(false);
            if (typeof hintScrollView.setTouchEnabled === "function") {
                hintScrollView.setTouchEnabled(false);
            }
            hintScrollTrack.setVisible(false);
            hintScrollThumb.setVisible(false);
        }

        if (richText) {
            if (hintText) {
                nextContentY -= contentGap;
            }
            richText.setPosition(contentBaseX, nextContentY);
            nextContentY -= uiUtil.getNodeLayoutHeight(richText);
        }

        var progressY = progressDefaultY;
        if (hintText || richText) {
            progressY = Math.max(progressMinY, nextContentY - progressGap - pbBg.getContentSize().height);
        }
        pbBg.setPosition(contentBaseX, progressY);
        pb.setPosition(pbBg.getPositionX() + pbBg.getContentSize().width / 2, pbBg.getPositionY() + pbBg.getContentSize().height / 2);
    };
    bgNode.updateItemRichText = function (items) {
        var richText = bgNode.getChildByName("richText");
        var contentWidth = getContentWidth();
        if (richText) {
            richText.width = contentWidth;
            richText.updateView(items);
        } else {
            richText = new ItemRichText(items, contentWidth, 3, 0.3);
            richText.setName("richText");
            richText.setAnchorPoint(0, 1);
            bgNode.addChild(richText);
        }
        richText.setPosition(contentBaseX, contentBaseY);
        ensureRichTextButton(richText);

    };
    bgNode.updateView = function (newData) {
        if (!cc.sys.isObjectValid(bgNode))
            return;

        actionLayoutMode = newData.actionLayout || "horizontal";

        if (newData.iconName) {
            if (iconBg.getChildByName("icon")) {
                iconBg.removeChildByName("icon");
            }
            var icon = uiUtil.getSpriteByNameSafe(newData.iconName, newData.iconFallbackName || null);
            icon.setName("icon");
            icon.setPosition(iconBg.getContentSize().width / 2, iconBg.getContentSize().height / 2);
            iconBg.addChild(icon);
        }

        if (newData.hint) {
            hint.setString(newData.hint);

            if (newData.hintColor) {
                hint.setColor(newData.hintColor);
            } else {
                hint.setColor(UITheme.colors.WHITE);
            }
        } else {
            hint.setString("");
            hint.setColor(UITheme.colors.WHITE);
        }

        if (action1) {
            if (newData.action1) {
                action1.setVisible(true);
                action1.setTitleForState(newData.action1, cc.CONTROL_STATE_NORMAL);
                action1.setEnabled(!newData.action1Disabled);
            } else {
                action1.setVisible(false);
            }
        }

        if (action2 && newData.action2) {
            action2.setVisible(true);
            action2.setTitleForState(newData.action2, cc.CONTROL_STATE_NORMAL);

            action2.setEnabled(!newData.action2Disabled);
        } else if (action2) {
            action2.setVisible(false);
        }
        refreshActionButtonLayout();

        if (newData.items) {
            this.updateItemRichText(newData.items);
        } else {
            if (bgNode.getChildByName("richText")) {
                bgNode.removeChildByName("richText");
            }
        }
        relayoutContent();

        if (newData.percentage != undefined) {
            pb.setPercentage(newData.percentage);
        }

        if (newData.btnIdx !== undefined) {
            if (iconBg) {
                iconBg.idx = newData.btnIdx;
            }
            if (action1) {
                action1.idx = newData.btnIdx;
            }
            if (action2) {
                action2.idx = newData.btnIdx;
            }
        }
    };

    bgNode.updatePercentage = function (percentage) {
        if (cc.sys.isObjectValid(pb))
            pb.setPercentage(percentage);
    };

    bgNode.updateHint = function (hintTxt) {
        hint.setString(hintTxt);
        relayoutContent();
    };
    return bgNode;
}


uiUtil.showItemDialog = function (itemId, showOnly, source) {
    var item = new Item(itemId);
    var stringId = "item_1";
    if (item.isType(ItemType.TOOL, ItemType.FOOD)) {
        stringId = "item_2";
    } else if (item.isType(ItemType.TOOL, ItemType.MEDICINE)) {
        stringId = "item_3";
    } else if (item.isType(ItemType.TOOL, ItemType.BUFF)) {
        stringId = "item_3";
    }
    var config = utils.clone(stringUtil.getString(stringId));
    var strConfig = stringUtil.getString(itemId);
    if (showOnly) {
        //元数据
        var metaConfig = utils.clone(stringUtil.getString("item_1"));
        config.action = metaConfig.action;
    } else {
        if (config.action.btn_2) {
            config.action.btn_2.target = null;
            config.action.btn_2.cb = function () {
                if (player.getSetting("inStorage", false) && userGuide.isStep(userGuide.stepName.STORAGE_EAT) && userGuide.isItemEat(itemId)) {
                    userGuide.step();
                }
                utils.emitter.emit("btn_1_click", itemId, source);
            };
        }
    }
    config.title.title = strConfig.title;
    config.title.icon = uiUtil.getItemIconFrameName(itemId, true);
    config.title.iconFallback = uiUtil.getDefaultSpriteName("item", true);
    config.content.des = strConfig.des;
    config.content.dig_des = uiUtil.getItemDetailFrameName(itemId, true);
    config.content.dig_des_fallback = uiUtil.getDefaultSpriteName("itemDetail", true);

    var dialog = new DialogBig(config);
    var txt1 = dialog.titleNode.getChildByName("txt_1");
    txt1.setString(cc.formatStr(txt1.getString(), player.storage.getNumByItemId(itemId)));
    dialog.show();

    if (item.isType(ItemType.TOOL, ItemType.BUFF)) {
        var des = dialog.contentNode.getChildByName('des');
        var buffWarn = new cc.LabelTTF(stringUtil.getString(1299), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(dialog.rightEdge - dialog.leftEdge, 0));
        buffWarn.anchorX = 0;
        buffWarn.anchorY = 1;
        buffWarn.x = dialog.leftEdge;
        buffWarn.y = des.y - des.height - 20;
        dialog.contentNode.addChild(buffWarn, 1);
        buffWarn.setName("buffWarn");
        buffWarn.setColor(UITheme.colors.TEXT_ERROR);
    }

    if (player.getSetting("inStorage", false) && userGuide.isStep(userGuide.stepName.STORAGE_EAT) && userGuide.isItemEat(itemId)) {
        uiUtil.createIconWarn(dialog.actionNode.getChildByName("btn_2"));
    }
};

uiUtil.showGuideDialog = function (str, pic, target, isPicDown) {
    var config = {
        title: {},
        content: {}
    };

    config.title.title = "";
    config.content.des = str;
    config.content.dig_des = pic;
    var dialog = new DialogGuide(config, target, isPicDown);
    dialog.show();
}

uiUtil.showBuildDialog = function (bid, level) {
    var config = utils.clone(stringUtil.getString("build"));
    var strConfig = stringUtil.getString(bid + "_" + level);
    config.title.title = strConfig.title;
    config.title.icon = "#build_" + bid + "_" + level + ".png";
    config.content.des = strConfig.des;
    config.content.dig_des = "#dig_build_" + bid + "_" + level + ".png";
    var dialog = new DialogBig(config);
    var log = dialog.contentNode.getChildByName("log");
    log.height = 130;

    var upgradeConfig = player.room.getBuild(bid).getUpgradeConfig();
    if (upgradeConfig) {

        var label = new cc.LabelTTF(cc.formatStr(config.content.log), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label.setAnchorPoint(0, 1);
        label.setPosition(dialog.leftEdge, log.getContentSize().height - 10);
        label.setColor(UITheme.colors.TEXT_TITLE);
        log.addChild(label);

        var needItems = upgradeConfig.upgradeCost;
        var pass = player.validateItems(needItems);

        needItems = needItems.map(function (itemInfo) {
            return {
                itemId: itemInfo.itemId,
                num: itemInfo.num,
                color: itemInfo.haveNum >= itemInfo.num ? UITheme.colors.TEXT_TITLE : UITheme.colors.TEXT_ERROR
            };
        });

        var richText = new ItemRichText(needItems, dialog.rightEdge - dialog.leftEdge, 3, 0.5, UITheme.colors.TEXT_TITLE);
        richText.setName("richText")
        richText.setAnchorPoint(0, 1);
        richText.setPosition(dialog.leftEdge, label.getPositionY() - label.getContentSize().height - 10);
        log.addChild(richText);

        if (cc.RTL) {
            label.anchorX = 1;
            label.x = dialog.rightEdge;

            richText.anchorX = 1;
            richText.x = dialog.rightEdge;
        }
    }

    dialog.show();
};

uiUtil.showBuildActionDialog = function (bid, index, iconIndex) {
    var config = utils.clone(stringUtil.getString("build"));
    var strConfig = stringUtil.getString("b_a_" + bid);
    var indexedStrConfig = stringUtil.getString("b_a_" + bid + "_" + index);
    if (indexedStrConfig && typeof indexedStrConfig === "object") {
        strConfig = indexedStrConfig;
    }
    if (iconIndex === undefined || iconIndex === null) {
        iconIndex = index;
        if (bid == 10 && index == 2) {
            iconIndex = 0;
        }
        if (bid == 10 && (index == 3 || index == 4 || index == 5)) {
            iconIndex = 1;
        }
    }
    config.title.title = strConfig.title;
    config.title.icon = "#build_action_" + bid + "_" + iconIndex + ".png";
    config.content.des = strConfig.des;
    var dialog = new DialogSmall(config);
    dialog.show();
};

uiUtil.showItemSliderDialog = function (itemId, storage, cb) {
    var item = new Item(itemId);
    var stringId = "item_1";
    if (item.isType(ItemType.TOOL, ItemType.FOOD)) {
        stringId = "item_2";
    } else if (item.isType(ItemType.TOOL, ItemType.MEDICINE)) {
        stringId = "item_3";
    }
    var config = utils.clone(stringUtil.getString(stringId));
    var strConfig = stringUtil.getString(itemId);
    var metaConfig = utils.clone(stringUtil.getString("item_1"));
    config.action = metaConfig.action;

    config.title.title = strConfig.title;
    config.title.icon = uiUtil.getItemIconFrameName(itemId, true);
    config.title.iconFallback = uiUtil.getDefaultSpriteName("item", true);
    config.content.des = strConfig.des;
    config.content.dig_des = uiUtil.getItemDetailFrameName(itemId, true);
    config.content.dig_des_fallback = uiUtil.getDefaultSpriteName("itemDetail", true);
    var totalNum = storage.getNumByItemId(itemId);
    var unitWeight = Number(itemConfig[itemId].weight) || 0;
    config.title.title = stringUtil.getString(itemId).title;
    config.title.txt_1 = stringUtil.getString(1028, utils.formatWeight(unitWeight));
    config.title.txt_2 = stringUtil.getString(1029, "1/" + totalNum);
    config.action.btn_1.txt = stringUtil.getString(1030);
    var dialog = new DialogBig(config);
    config.action.btn_1.target = dialog;
    config.action.btn_1.cb = function () {
        cb(this.value ? this.value : 0);
    };
    var content = dialog.contentNode;

    var slider = new cc.ControlSlider("#slider_bg.png", "#slider_content.png", "#slider_cap.png");
    slider.setMinimumValue(1); // Sets the min value of range
    slider.setMaximumValue(totalNum); // Sets the max value of range
    slider.setPosition(content.width / 2, 40);
    slider.setAnchorPoint(0.5, 0.5);
    content.addChild(slider);

    dialog.value = slider.getValue().toFixed(0);

    // When the value of the slider will change, the given selector will be call
    slider.addTargetWithActionForControlEvents(this, function (sender) {
        var value = sender.getValue().toFixed(0);
        dialog.value = value;
        var valueStr = "";
        if (value < 10) {
            valueStr = " " + value;
        } else {
            valueStr += value;
        }
        dialog.titleNode.getChildByName("txt_1").setString(
            stringUtil.getString(1028, utils.formatWeight(unitWeight * value))
        );
        dialog.titleNode.getChildByName("txt_2").setString(stringUtil.getString(1029, valueStr + "/" + totalNum));
    }, cc.CONTROL_EVENT_VALUECHANGED);
    slider.setName("slider");

    dialog.show();
};

uiUtil.showCraftCountSliderDialog = function (itemId, maxCount, makeTime, cb) {
    maxCount = Math.max(1, parseInt(maxCount, 10) || 1);
    if (maxCount <= 1) {
        cb(1);
        return;
    }

    var config = utils.clone(stringUtil.getString("item_1"));
    var strConfig = stringUtil.getString(itemId);
    var metaConfig = utils.clone(stringUtil.getString("item_1"));
    config.action = metaConfig.action;

    config.title.title = strConfig.title;
    config.title.icon = uiUtil.getItemIconFrameName(itemId, true);
    config.title.iconFallback = uiUtil.getDefaultSpriteName("item", true);
    config.content.des = strConfig.des;
    config.content.dig_des = uiUtil.getItemDetailFrameName(itemId, true);
    config.content.dig_des_fallback = uiUtil.getDefaultSpriteName("itemDetail", true);
    config.title.txt_1 = stringUtil.getString(1029, "1/" + maxCount);
    config.title.txt_2 = stringUtil.getString(1002, makeTime);
    config.action.btn_1.txt = stringUtil.getString(1030);

    var dialog = new DialogBig(config);
    config.action.btn_1.target = dialog;
    config.action.btn_1.cb = function () {
        cb(this.value ? this.value : 1);
    };
    var content = dialog.contentNode;

    var slider = new cc.ControlSlider("#slider_bg.png", "#slider_content.png", "#slider_cap.png");
    slider.setMinimumValue(1);
    slider.setMaximumValue(maxCount);
    slider.setPosition(content.width / 2, 40);
    slider.setAnchorPoint(0.5, 0.5);
    content.addChild(slider);

    dialog.value = slider.getValue().toFixed(0);

    slider.addTargetWithActionForControlEvents(this, function (sender) {
        var value = sender.getValue().toFixed(0);
        dialog.value = value;
        dialog.titleNode.getChildByName("txt_1").setString(stringUtil.getString(1029, value + "/" + maxCount));
        dialog.titleNode.getChildByName("txt_2").setString(stringUtil.getString(1002, makeTime * value));
    }, cc.CONTROL_EVENT_VALUECHANGED);
    slider.setName("slider");

    dialog.show();
};

uiUtil.showNpcNeedHelpDialog = function (npc, noCb, yesCb, needRestore) {
    if (typeof NpcDialogHelper !== "undefined" && NpcDialogHelper && typeof NpcDialogHelper.showNeedHelpDialog === "function") {
        NpcDialogHelper.showNeedHelpDialog(npc, noCb, yesCb, needRestore);
    }
};

uiUtil.showNpcSendGiftDialog = function (npc) {
    if (typeof NpcDialogHelper !== "undefined" && NpcDialogHelper && typeof NpcDialogHelper.showSendGiftDialog === "function") {
        NpcDialogHelper.showSendGiftDialog(npc);
    }
};

uiUtil.showMoonlightingDialog = function (res) {
    var config = {
        title: {},
        content: {log: true},
        action: {btn_1: {}}
    };
    //config.title.icon = "#build_" + bid + "_" + level + ".png";
    config.title.title = stringUtil.getString(1076);
    if (res.win) {
        config.content.des = stringUtil.getString(1078);
    } else {
        config.content.des = stringUtil.getString(1077);
    }
    config.content.dig_des = "#monster_dig_midnight.png";

    config.action.btn_1.txt = stringUtil.getString(1073);

    var dialog = new DialogBig(config);

    if (!res.win) {
        var log = dialog.contentNode.getChildByName("log");
        log.height = 130;
        var label = new cc.LabelTTF(stringUtil.getString(1079), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label.setAnchorPoint(0, 1);
        label.setPosition(dialog.leftEdge, log.getContentSize().height - 10);
        label.setColor(UITheme.colors.TEXT_TITLE);
        log.addChild(label);

        var richText = new ItemRichText(res.items, dialog.rightEdge - dialog.leftEdge, 3, 0.5, UITheme.colors.TEXT_TITLE);
        richText.setName("richText")
        richText.setAnchorPoint(0, 1);
        richText.setPosition(dialog.leftEdge, label.getPositionY() - label.getContentSize().height - 10);
        log.addChild(richText);
    }

    dialog.show();
    audioManager.playEffect(audioManager.sound.UNDER_ATTACK_MIDNIGHT);
};

uiUtil.showRandomBattleDialog = function (battleInfo, cb) {
    var dialog = new RandomBattleDialog(battleInfo, cb);
    dialog.show();
};

uiUtil.showTinyInfoDialog = function (msg) {
    var config = {
        title: {},
        content: {},
        action: {btn_1: {}}
    };
    if (typeof msg === 'number') {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        msg = stringUtil.getString.apply(this, args);
    }
    config.content.des = msg;
    config.action.btn_1.txt = stringUtil.getString(1073);
    var dialog = new DialogTiny(config);
    dialog.show();
};

uiUtil.checkVigour = function () {
    if (player.isLowVigour()) {
        uiUtil.showTinyInfoDialog(1133);
        return false;
    } else {
        return true;
    }
};

uiUtil.checkStarve = function () {
    if (player.isAttrMax("starve")) {
        uiUtil.showTinyInfoDialog(1128);
        return false;
    } else {
        return true;
    }
};

uiUtil.createHeartNode = function () {
    var heartPadding = 5;
    var heartNum = 5;

    var heartBgFrame = autoSpriteFrameController.getSpriteFrameFromSpriteName("icon_heart_bg.png");
    var w = (heartNum - 1 ) * heartPadding + heartNum * heartBgFrame.getRect().width;

    var node = new cc.Node();
    node.setContentSize(w, heartBgFrame.getRect().height);

    for (var i = 0; i < heartNum; i++) {
        var heartBg = autoSpriteFrameController.getSpriteFromSpriteName(heartBgFrame);
        heartBg.setAnchorPoint(0, 0.5);
        heartBg.x = i * (heartBg.width + heartPadding);
        heartBg.y = node.height / 2;
        heartBg.setName("heart_" + i);
        node.addChild(heartBg);
    }

    node.updateView = function (heart) {
        var min = Math.floor(heart / 2);
        var max = Math.ceil(heart / 2);

        for (var i = 0; i < heartNum; i++) {
            var hbg = this.getChildByName("heart_" + i);
            hbg.removeAllChildren();

            if (i < min) {
                var fullHeart = autoSpriteFrameController.getSpriteFromSpriteName("#icon_heart_full.png");
                fullHeart.x = heartBg.width / 2;
                fullHeart.y = heartBg.height / 2;
                hbg.addChild(fullHeart);
            }
            if (max !== min) {
                if (i === (max - 1)) {
                    var halfHeart = autoSpriteFrameController.getSpriteFromSpriteName("#icon_heart_half.png");
                    halfHeart.x = heartBg.width / 2;
                    halfHeart.y = heartBg.height / 2;
                    hbg.addChild(halfHeart);
                }
            }
        }
    };

    return node;
};

uiUtil.createEquipedItemIconList = function (dark) {
    var defaultColor = dark ? UITheme.colors.TEXT_TITLE : UITheme.colors.WHITE;
    var equipedItemList = player.equip.getEquipedItemList();
    equipedItemList = equipedItemList.map(function (itemId) {
        var res = {itemId: itemId};
        if (itemId !== Equipment.HAND) {
            var item = new Item(itemId);
            if (item.getType(1) === ItemType.WEAPON_TOOL) {
                res.num = player.bag.getNumByItemId(itemId);
                //特殊道具为0时不显示
                if (res.num === 0)
                    return null;
            }
        }
        return res;
    });
    var bulletNum = player.bag.getNumByItemId(BattleConfig.BULLET_ID);
    if (bulletNum > 0) {
        equipedItemList.unshift({
            itemId: BattleConfig.BULLET_ID,
            num: bulletNum
        });
    }

    var node = new cc.Node();
    var scale = 0.5;
    var x = 0;

    equipedItemList.forEach(function (itemInfo, i) {
        if (!itemInfo)
            return;
        var itemId = itemInfo.itemId;
        cc.log(itemId)
        var name;
        if (itemId === Equipment.HAND) {
            name = "#icon_tab_hand.png";
        } else {
            name = uiUtil.getItemIconFrameName(itemId, true);
        }

        var icon = uiUtil.getSpriteByNameSafe(name, itemId === Equipment.HAND ? "#icon_tab_hand.png" : uiUtil.getDefaultSpriteName("item", true));
        icon.setScale(scale);
        icon.setAnchorPoint(0, 0.5);
        icon.setPosition(x, 0);
        node.addChild(icon);

        x = icon.x + icon.width * icon.getScale() + 5;

        if (itemInfo.num) {
            var num = new cc.LabelTTF("x" + itemInfo.num, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            num.x = icon.x + icon.width * icon.getScale() + 2;
            num.y = icon.y;
            num.setAnchorPoint(0, 0.5);
            num.setColor(defaultColor);
            node.addChild(num);

            x = num.x + num.width + 5;
        }
    });

    node.width = x;

    return node;
};

uiUtil.showItemListDialog = function (itemList) {
    var newList = utils.clone(itemList);
    player.validateItems(newList);
    var dialog = new ItemListDialog(newList);
    dialog.show();
};

uiUtil.createIconWarn = function (parent, pos, name) {
    if (name === undefined || name === null) {
        name = "warn";
    }
    uiUtil.removeIconWarn(parent, name);
    var warn = autoSpriteFrameController.getSpriteFromSpriteName("#icon_warn.png");
    var warnPos = pos || cc.p(parent.width / 2, parent.height / 2);
    var offset = cc.p(warn.width / 2 - 30, warn.height / 2 - 96);
    warnPos = cc.pAdd(warnPos, offset);
    warn.setPosition(warnPos);
    //warn.runAction(cc.repeatForever((cc.sequence(cc.fadeOut(0.5), cc.fadeIn(0.5)))));
    warn.runAction(cc.repeatForever((cc.sequence(cc.spawn(cc.scaleTo(1, 0.8), cc.fadeIn(1)), cc.spawn(cc.scaleTo(1, 1), cc.fadeOut(1))))));
    warn.setName(name);
    parent.addChild(warn, 11);

    if (parent.getChildByName("buildWarn")) {
        parent.getChildByName("buildWarn").setVisible(false);
    }
};

uiUtil.createBuildWarn = function (parent, bid, pos) {
    uiUtil.removeIconWarn(parent, "buildWarn");

    var node = new cc.Node();
    node.height = 38;
    node.setAnchorPoint(0.5, 0.5);
    var pos = pos || cc.p(parent.width / 2, parent.height / 2);
    node.setPosition(pos);
    node.setName("buildWarn");
    parent.addChild(node);

    var build = player.room.getBuild(bid);
    var needWarnInfo = build.needWarn();

    var warnList = [];
    for (var key in needWarnInfo) {
        if (needWarnInfo[key]) {
            var warn = autoSpriteFrameController.getSpriteFromSpriteName("#icon_" + key + ".png");
            warn.y = node.height / 2;
            //warn.runAction(cc.repeatForever((cc.sequence(cc.fadeOut(1), cc.fadeIn(1)))));
            warn.setName(key);
            node.addChild(warn);
            warnList.push(warn);
        }
    }
    node.width = warnList.length * 38;
    var padding = node.width / (warnList.length * 2);
    warnList.forEach(function (warn, index) {
        warn.x = index * 2 * padding + padding;
    });

    if (parent.getChildByName("warn")) {
        node.setVisible(false);
    }
};

uiUtil.removeIconWarn = function (parent, name) {
    if (name === undefined || name === null) {
        name = "warn";
    }
    if (parent.getChildByName(name)) {
        parent.removeChildByName(name);
    }
};

uiUtil.showNewGameDialog = function (cb) {
    var config = {
        title: {},
        content: {},
        action: {btn_1: {}, btn_2: {}}
    };
    config.content.des = stringUtil.getString(1156);
    config.action.btn_2.txt = stringUtil.getString(1030);
    config.action.btn_2.target = null;
    config.action.btn_2.cb = cb;

    config.action.btn_1.txt = stringUtil.getString(1157);
    var dialog = new DialogTiny(config);
    dialog.show();
};

uiUtil.createSaleOffIcon = function () {
    var iconHighlight = autoSpriteFrameController.getSpriteFromSpriteName("icon_sale_highlight.png");
    var icon = autoSpriteFrameController.getSpriteFromSpriteName("icon_off.png");

    var node = new cc.Node();
    node.width = icon.width;
    node.height = icon.height;
    node.anchorX = 0.5;
    node.anchorY = 0.5;

    iconHighlight.x = node.width / 2;
    iconHighlight.y = node.height / 2;
    node.addChild(iconHighlight);
    iconHighlight.runAction(cc.repeatForever((cc.sequence(cc.fadeOut(1.5), cc.fadeIn(1.5)))));

    icon.x = node.width / 2;
    icon.y = node.height / 2;
    node.addChild(icon);

    var offLabel = new cc.LabelTTF("", uiUtil.fontFamily.normal, 36);
    offLabel.x = 26;
    offLabel.y = 28;
    offLabel.color = UITheme.colors.TEXT_TITLE;
    icon.addChild(offLabel);

    node.updateOff = function (off) {
        offLabel.setString(off);
    };

    return node;
};

uiUtil.getPurchaseStringConfig = function (purchaseId) {
    if (typeof PurchaseUiHelper !== "undefined"
        && PurchaseUiHelper
        && typeof PurchaseUiHelper.getPurchaseStringConfig === "function") {
        return PurchaseUiHelper.getPurchaseStringConfig(purchaseId);
    }
    return {
        name: "ID " + purchaseId,
        des: "",
        effect: ""
    };
};

uiUtil.getRoleTypeByPurchaseId = function (purchaseId) {
    if (typeof PurchaseUiHelper !== "undefined"
        && PurchaseUiHelper
        && typeof PurchaseUiHelper.getRoleTypeByPurchaseId === "function") {
        return PurchaseUiHelper.getRoleTypeByPurchaseId(purchaseId);
    }

    if (typeof role !== "undefined"
        && role
        && typeof role.getRoleTypeByPurchaseId === "function") {
        return role.getRoleTypeByPurchaseId(purchaseId);
    }
    return null;
};

uiUtil.getCharacterPortraitByPurchaseId = function (purchaseId) {
    var roleType = uiUtil.getRoleTypeByPurchaseId(purchaseId);
    if (!roleType) {
        return null;
    }
    return uiUtil.getRolePortraitFrameName(roleType, false);
};

uiUtil.getSpriteByNameSafe = function (spriteFrameName, fallbackName, context) {
    var sprite = null;
    if (typeof ResourceFallback !== "undefined" && ResourceFallback && typeof ResourceFallback.getSpriteByName === "function") {
        sprite = ResourceFallback.getSpriteByName(spriteFrameName, fallbackName || null, context);
    } else {
        sprite = SafetyHelper.safeLoadSprite(spriteFrameName, fallbackName || null);
    }
    return sprite || new cc.Sprite();
};

uiUtil.getSpriteByNameOptional = function (spriteFrameName) {
    if (typeof ResourceFallback !== "undefined" && ResourceFallback && typeof ResourceFallback.getOptionalSprite === "function") {
        return ResourceFallback.getOptionalSprite(spriteFrameName);
    }
    return SafetyHelper.safeLoadSprite(spriteFrameName, null);
};

uiUtil.createSupportPackPreviewIcon = function (effectList) {
    var node = new cc.Node();
    node.setAnchorPoint(0.5, 0.5);
    node.setContentSize(150, 110);

    var itemIdList = [];
    if (Array.isArray(effectList)) {
        effectList.forEach(function (obj) {
            if (!obj || obj.itemId === undefined || obj.itemId === null) {
                return;
            }
            var itemId = parseInt(obj.itemId);
            if (!isNaN(itemId) && itemIdList.indexOf(itemId) === -1) {
                itemIdList.push(itemId);
            }
        });
    }
    if (itemIdList.length === 0) {
        itemIdList.push(1101041);
    }
    itemIdList = itemIdList.slice(0, 4);

    var posList;
    if (itemIdList.length === 1) {
        posList = [cc.p(75, 56)];
    } else if (itemIdList.length === 2) {
        posList = [cc.p(52, 56), cc.p(98, 56)];
    } else if (itemIdList.length === 3) {
        posList = [cc.p(50, 74), cc.p(100, 74), cc.p(75, 38)];
    } else {
        posList = [cc.p(50, 74), cc.p(100, 74), cc.p(50, 38), cc.p(100, 38)];
    }

    itemIdList.forEach(function (itemId, index) {
        var itemIcon = uiUtil.getItemIconSprite(itemId, uiUtil.getDefaultSpriteName("item", false));
        itemIcon.setScale(0.62);
        itemIcon.setPosition(posList[index]);
        node.addChild(itemIcon);
    });

    return node;
};

uiUtil.getTalentDisplayInfo = function (purchaseId, baseName, purchaseUiState) {
    if (typeof PurchaseUiHelper !== "undefined"
        && PurchaseUiHelper
        && typeof PurchaseUiHelper.getTalentDisplayInfo === "function") {
        return PurchaseUiHelper.getTalentDisplayInfo(purchaseId, baseName, purchaseUiState);
    }
    return null;
};

uiUtil.createPayItemNode = function (purchaseId, target, cb) {
    if (typeof PurchaseUiHelper !== "undefined"
        && PurchaseUiHelper
        && typeof PurchaseUiHelper.createPayItemNode === "function") {
        return PurchaseUiHelper.createPayItemNode(purchaseId, target, cb);
    }
    return null;
};

uiUtil.showPayDialog = function (purchaseId, cb, ownerLayer) {
    if (typeof PurchaseUiHelper !== "undefined" && PurchaseUiHelper && typeof PurchaseUiHelper.showPayDialog === "function") {
        return PurchaseUiHelper.showPayDialog(purchaseId, cb, ownerLayer);
    }
    return null;
};

uiUtil.createLockNode = function (size, purchaseId, cb, isWhite) {
    if (typeof PurchaseUiHelper !== "undefined"
        && PurchaseUiHelper
        && typeof PurchaseUiHelper.createLockNode === "function") {
        return PurchaseUiHelper.createLockNode(size, purchaseId, cb, isWhite);
    }
    return new ButtonWithPressed(size);
};

var _labelTTF = cc.LabelTTF;
cc.LabelTTF = function (text, fontName, fontSize, dimensions, hAlignment, vAlignment) {
    var defaultHAlignment = null;
    if (dimensions && cc.RTL) {
        if (hAlignment === cc.TEXT_ALIGNMENT_RIGHT)
            defaultHAlignment = cc.TEXT_ALIGNMENT_LEFT;
        else if (hAlignment === cc.TEXT_ALIGNMENT_CENTER)
            defaultHAlignment = cc.TEXT_ALIGNMENT_CENTER;
        else
            defaultHAlignment = cc.TEXT_ALIGNMENT_RIGHT;
    }
    return _labelTTF(text, fontName, fontSize, dimensions, defaultHAlignment || hAlignment, vAlignment);
};

uiUtil.showLoadingView = function () {
    if (this._dialog && cc.sys.isObjectValid(this._dialog)) {
        this._dialog.dismiss();
    }
    //this._dialog = new LoadingDialog();
    //this._dialog.show();
};

uiUtil.dismissLoadingView = function () {
    if (this._dialog && cc.sys.isObjectValid(this._dialog)) {
        this._dialog.dismiss();
    }
};

uiUtil.showBackMenuDialog = function (cb) {
    var dialog = new BackToMenuDialog(cb);
    dialog.show();
};

uiUtil.createItemListSliders = function (itemList) {
    var data = [];
    var datasource = {
        tableCellSizeForIndex: function (table, idx) {
            return cc.size(100, 100);
        },
        tableCellAtIndex: function (table, idx) {
            var cell = table.dequeueCell();
            var size = this.tableCellSizeForIndex(idx);
            if (!cell) {
                cell = new cc.TableViewCell();

                var bg = autoSpriteFrameController.getSpriteFromSpriteName('item_bg.png');
                bg.x = size.width / 2;
                bg.y = size.height / 2;
                bg.setName('bg');
                cell.addChild(bg);

                var numLabel = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2);
                numLabel.anchorX = 1;
                numLabel.anchorY = 0;
                numLabel.x = bg.width - 4;
                numLabel.y = 4;
                numLabel.setName('num');
                bg.addChild(numLabel, 1);
                numLabel.enableStroke(UITheme.colors.TEXT_TITLE, 2);
            }

            var info = data[idx];

            console.log(JSON.stringify(info));
            var bg = cell.getChildByName('bg');
            if (bg.getChildByName('icon')) {
                bg.removeChildByName('icon');
            }

            var itemId = info.itemId;
            var icon = uiUtil.getItemIconSprite(itemId);
            icon.x = bg.width / 2;
            icon.y = bg.height / 2;
            icon.setName('icon');
            bg.addChild(icon);

            bg.getChildByName('num').setString(info.num);
            cell.data = info;

            return cell;
        },

        numberOfCellsInTableView: function (table) {
            cc.log('size ' + data.length)
            return data.length;
        }
    };

    var delegate = {
        tableCellTouched: function (table, cell) {
            cc.log("tableCellTouched");
            uiUtil.showItemDialog(cell.data.itemId, false, 'top');
        },

        tableCellHighlight: function (table, cell) {
            cell.getChildByName('bg').runAction(cc.scaleTo(0.1, 1.2));
        },

        tableCellUnhighlight: function (table, cell) {
            cell.getChildByName('bg').runAction(cc.scaleTo(0.1, 1));
        },
        tableCellWillRecycle: function (table, cell) {
        }

    };

    var tableView = new cc.TableView(datasource, cc.size(400, 100));
    tableView.setDirection(cc.SCROLLVIEW_DIRECTION_HORIZONTAL);
    tableView.setVerticalFillOrder(cc.TABLEVIEW_FILL_TOPDOWN);
    tableView.setDelegate(delegate);
    tableView.updateData = function () {
        data = itemList.map(function (storageCell) {
            return {
                itemId: storageCell.item.id,
                num: memoryUtil.decode(storageCell.num)
            };
        });
        console.log('data: ' + JSON.stringify(data));
    };
    tableView.updateData();
    tableView.reloadData();

    return tableView;
};

uiUtil.showUnlockDialog = function (purchaseId) {
    if (typeof PurchaseUiHelper !== "undefined"
        && PurchaseUiHelper
        && typeof PurchaseUiHelper.showUnlockDialog === "function") {
        PurchaseUiHelper.showUnlockDialog(purchaseId);
    }
};

uiUtil.showRoleInfoDialog = function (roleType, locked) {
    if (typeof RoleTalentUiHelper !== "undefined"
        && RoleTalentUiHelper
        && typeof RoleTalentUiHelper.showRoleInfoDialog === "function") {
        RoleTalentUiHelper.showRoleInfoDialog(roleType, locked);
        return;
    }
    if (typeof PurchaseUiHelper !== "undefined"
        && PurchaseUiHelper
        && typeof PurchaseUiHelper.showRoleInfoDialog === "function") {
        PurchaseUiHelper.showRoleInfoDialog(roleType, locked);
    }
};
