/**
 * Visualizes a map destination and its local status indicators.
 */
var MapEntity = Button.extend({
    ctor: function (baseSite) {
        this.baseSite = baseSite;

        var bg = autoSpriteFrameController.getSpriteFromSpriteName(this.baseSite.id == HOME_SITE ? "site_big_bg.png" : "#site_bg.png");
        this._super(bg.getContentSize());

        bg.setPosition(this.getContentSize().width / 2, this.getContentSize().height / 2);
        this.addChild(bg);

        var highlightBg = autoSpriteFrameController.getSpriteFromSpriteName(this.baseSite.id == HOME_SITE ? "site_highlight_big_bg.png" : "#site_highlight_bg.png");
        highlightBg.setPosition(this.getContentSize().width / 2, this.getContentSize().height / 2);
        highlightBg.setName("highlight");
        highlightBg.setVisible(false);
        this.addChild(highlightBg);

        var icon = this.baseSite instanceof Site
            ? uiUtil.getSpriteByNameSafe("#site_" + this.baseSite.id + ".png")
            : uiUtil.getSpriteByNameSafe(uiUtil.getNpcMapFrameName(this.baseSite.id, true), "#npc_1.png");
        icon.setPosition(this.getContentSize().width / 2, this.getContentSize().height / 2);
        this.addChild(icon);

        this.setAnchorPoint(0.5, 0.5);
        this.setPosition(this.baseSite.pos);

        if (userGuide.isStep(userGuide.stepName.MAP_SITE) && userGuide.isSite(this.baseSite.id)) {
            uiUtil.createIconWarn(this);
        }

        if (userGuide.isStep(userGuide.stepName.MAP_SITE_HOME) && this.baseSite.id == HOME_SITE) {
            uiUtil.createIconWarn(this);
        }

        this._createZiplineRemoveButton();
        this.updateStatus();
    },
    onPressed: function () {
        this.getChildByName("highlight").setVisible(true);
        this._super();
    },
    onRelease: function (isInBound) {
        this.getChildByName("highlight").setVisible(false);
        this._super(isInBound);
    },
    setHighlight: function (isHighlight) {
        this.getChildByName("highlight").setVisible(isHighlight);
    },
    setZiplineRemoveListener: function (target, cb) {
        var removeButton = this.getChildByName("ziplineRemoveButton");
        if (!removeButton) {
            return;
        }
        removeButton.target = target;
        removeButton.cb = cb;
    },
    updateZiplineRemoveAction: function (state) {
        var removeButton = this.getChildByName("ziplineRemoveButton");
        if (!removeButton) {
            return;
        }

        var isVisible = !!(state && state.visible);
        var isEnabled = isVisible && state.enabled !== false;
        removeButton.setVisible(isVisible);
        removeButton.setEnabled(isEnabled);

        var label = removeButton.getChildByName("label");
        if (label) {
            label.setString(state && state.labelText ? state.labelText : "");
        }

        this._updateZiplineRemoveButtonBg(!!(state && state.active), isEnabled);
    },
    updateStatus: function () {
        var oldIcon = this.getChildByName("icon");
        if (oldIcon) {
            this.removeChildByName("icon");
        }

        if (this.baseSite instanceof AdSite) {
            if (adHelper.isAdReady()) {
                var notifyIcon = autoSpriteFrameController.getSpriteFromSpriteName("icon_ad_show.png");
                notifyIcon.x = this.width - 10;
                notifyIcon.y = this.height;
                notifyIcon.setName("icon");
                this.addChild(notifyIcon);
            }
            return;
        }

        if (this.baseSite instanceof WorkSite) {
            var workIconName = this.baseSite.isActive
                ? "icon_electric_active.png"
                : "icon_electric_inactive.png";
            var workIcon = autoSpriteFrameController.getSpriteFromSpriteName(workIconName);
            workIcon.x = this.width - 10;
            workIcon.y = this.height;
            workIcon.setName("icon");
            this.addChild(workIcon);
        }
    },
    _createZiplineRemoveButton: function () {
        var removeButton = uiUtil.createSmallCommonBtnWhite("", null, null, {
            size: cc.size(42, 24),
            fontSize: 14,
            manualClick: true
        });
        removeButton.setName("ziplineRemoveButton");
        removeButton.setAnchorPoint(0.5, 0.5);
        removeButton.setPosition(this.width - 7, 10);
        removeButton.setVisible(false);

        this.addChild(removeButton, 12);
        this._updateZiplineRemoveButtonBg(false, true);
    },
    _updateZiplineRemoveButtonBg: function (isActive, isEnabled) {
        var removeButton = this.getChildByName("ziplineRemoveButton");
        if (!removeButton) {
            return;
        }

        var bg = removeButton.getChildByName("bg");
        if (bg) {
            bg.setColor(isActive ? cc.color(245, 218, 218) : cc.color(255, 255, 255));
            bg.setOpacity(isEnabled ? 255 : 150);
        }

        var label = removeButton.getChildByName("label");
        if (label) {
            if (!isEnabled) {
                label.setColor(UITheme.colors.GRAY);
            } else if (isActive) {
                label.setColor(cc.color(132, 34, 20, 255));
            } else {
                label.setColor(UITheme.colors.TEXT_TITLE);
            }
        }
    }
});
