/**
 * Owns map zipline mode, HUD and route drawing so MapView can stay focused on
 * travel flow and entity interaction.
 */
var MapZiplineController = cc.Class.extend({
    ctor: function (mapView, viewSize, ziplineLayer) {
        this.mapView = mapView;
        this.viewSize = viewSize;
        this.ziplineLayer = ziplineLayer;
        this.isBuildMode = false;
        this.startSiteId = null;

        this._createHud();
    },
    _createHud: function () {
        var btnSize = cc.size(150, 64);
        var ziplineBtn = new ButtonWithPressed(btnSize);
        ziplineBtn.setAnchorPoint(1, 1);
        ziplineBtn.setPosition(this.viewSize.width - 12, this.viewSize.height - 12);

        var btnBg = uiUtil.getSpriteByNameSafe("btn_common_white_normal.png");
        btnBg.setPosition(btnSize.width / 2, btnSize.height / 2);
        if (btnBg.width > 0 && btnBg.height > 0) {
            btnBg.setScaleX(btnSize.width / btnBg.width);
            btnBg.setScaleY(btnSize.height / btnBg.height);
        }
        ziplineBtn.addChild(btnBg, -1);

        var title = new cc.LabelTTF("滑索", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        title.setAnchorPoint(0.5, 1);
        title.setPosition(btnSize.width / 2, btnSize.height - 8);
        title.setColor(UITheme.colors.TEXT_TITLE);
        ziplineBtn.addChild(title);

        var action = new cc.LabelTTF("建立", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2);
        action.setAnchorPoint(0.5, 0.5);
        action.setPosition(btnSize.width / 2, 28);
        action.setColor(UITheme.colors.TEXT_TITLE);
        ziplineBtn.addChild(action);

        var hint = new cc.LabelTTF("", uiUtil.fontFamily.normal, 16, cc.size(btnSize.width - 14, 0), cc.TEXT_ALIGNMENT_CENTER);
        hint.setAnchorPoint(0.5, 0);
        hint.setPosition(btnSize.width / 2, 6);
        hint.setColor(UITheme.colors.GRAY);
        ziplineBtn.addChild(hint);

        ziplineBtn.setClickListener(this, function () {
            this.toggleBuildMode();
        });

        this.mapView.addChild(ziplineBtn, 20);
        this.ziplineBtn = ziplineBtn;
        this.ziplineBtnBg = btnBg;
        this.ziplineBtnTitle = title;
        this.ziplineBtnLabel = action;
        this.ziplineBtnHint = hint;
    },
    refresh: function () {
        this.refreshVisuals();
        this.updateHud();
    },
    updateHud: function () {
        if (!this.ziplineBtn) {
            return;
        }

        var isSelectingStart = !!this.isBuildMode && !this.startSiteId;
        var isSelectingEnd = !!this.isBuildMode && !!this.startSiteId;
        var startSite = isSelectingEnd ? player.map.siteMap[this.startSiteId] : null;
        var ziplineCount = player.ziplineManager && player.ziplineManager.getZiplines
            ? player.ziplineManager.getZiplines().length
            : 0;

        if (this.ziplineBtnBg) {
            this.ziplineBtnBg.setColor(this.isBuildMode ? cc.color(235, 220, 158, 255) : cc.color(255, 255, 255, 255));
        }
        if (this.ziplineBtnTitle) {
            this.ziplineBtnTitle.setString(this.isBuildMode ? "滑索模式" : "滑索");
        }
        if (this.ziplineBtnLabel) {
            this.ziplineBtnLabel.setString(isSelectingEnd ? "终点" : (isSelectingStart ? "起点" : "建立"));
        }
        if (this.ziplineBtnHint) {
            if (isSelectingEnd) {
                this.ziplineBtnHint.setString(startSite ? startSite.getName() : "已选起点");
            } else if (isSelectingStart) {
                this.ziplineBtnHint.setString("点击地点");
            } else {
                this.ziplineBtnHint.setString("已建" + ziplineCount + "条");
            }
        }
    },
    toggleBuildMode: function () {
        if (!this.isBuildMode) {
            this.isBuildMode = true;
            this.startSiteId = null;
            player.log.addMsg(1351);
        } else {
            this.cancelBuildMode(1352);
        }
        this.refresh();
    },
    cancelBuildMode: function (logMessageId) {
        this.isBuildMode = false;
        this.startSiteId = null;
        if (logMessageId) {
            player.log.addMsg(logMessageId);
        }
    },
    refreshVisuals: function () {
        if (this.mapView && typeof this.mapView._refreshZiplineOverlay === "function") {
            this.mapView._refreshZiplineOverlay(this.startSiteId, this.isBuildMode);
        } else if (this.isBuildMode && this.startSiteId && this.ziplineLayer) {
            var selectedStartSite = player.map.siteMap[this.startSiteId];
            if (selectedStartSite && selectedStartSite.pos) {
                this.ziplineLayer.drawDot(selectedStartSite.pos, 12, cc.color(214, 180, 72, 56));
                this.ziplineLayer.drawDot(selectedStartSite.pos, 7, cc.color(255, 239, 168, 112));
            }
        }
    },
    _resetZiplineLayer: function () {
        if (typeof this.ziplineLayer.clear === "function") {
            this.ziplineLayer.clear();
            return;
        }

        var parent = this.ziplineLayer.getParent ? this.ziplineLayer.getParent() : null;
        var localZOrder = this.ziplineLayer.getLocalZOrder ? this.ziplineLayer.getLocalZOrder() : 0;
        if (this.ziplineLayer.removeFromParent) {
            this.ziplineLayer.removeFromParent();
        }
        this.ziplineLayer = new cc.DrawNode();
        if (parent) {
            parent.addChild(this.ziplineLayer, localZOrder);
        }
    },
    handleEntityClick: function (entity) {
        if (!this.isBuildMode) {
            return false;
        }

        if (!(entity.baseSite instanceof Site)) {
            player.log.addMsg(1357);
            return true;
        }

        if (!this.startSiteId) {
            this.startSiteId = entity.baseSite.id;
            player.log.addMsg(1353, entity.baseSite.getName());
            this.refresh();
            return true;
        }

        var endSiteId = entity.baseSite.id;
        if (endSiteId === this.startSiteId) {
            player.log.addMsg(1354);
            return true;
        }

        if (player.ziplineManager && player.ziplineManager.hasZipline(this.startSiteId, endSiteId)) {
            player.log.addMsg(1355);
        } else if (player.ziplineManager && player.ziplineManager.addZipline) {
            player.ziplineManager.addZipline(this.startSiteId, endSiteId);
            player.log.addMsg(
                1356,
                player.map.siteMap[this.startSiteId].getName(),
                entity.baseSite.getName()
            );
        }

        this.cancelBuildMode(null);
        this.refresh();
        return true;
    }
});
