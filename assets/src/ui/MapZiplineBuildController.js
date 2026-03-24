/**
 * Owns the minimal map-side flow for creating ziplines.
 */
var getMapZiplineBuildRuntimePlayer = function () {
    return GameRuntime.getPlayer();
};
var getMapZiplineBuildRuntimeRecord = function () {
    return GameRuntime.getRecord();
};

var MapZiplineBuildController = cc.Class.extend({
    MODE: {
        BUILD: "build",
        REMOVE: "remove"
    },
    ctor: function (mapView, hostNode) {
        this.mapView = mapView;
        this.hostNode = hostNode;
        this.mode = null;
        this.selectedEntityKey = null;
        this.selectedEntity = null;
        this.buildButton = this.createActionButton(stringUtil.getString(1358), 12, this.toggleBuildMode);

        if (this.hostNode && this.buildButton) {
            this.hostNode.addChild(this.buildButton, 20);
        }

        this.refresh();
    },
    createActionButton: function (title, topOffset, clickHandler) {
        if (!this.hostNode) {
            return null;
        }

        var button = new SettingButton(title, false);
        button.setScale(0.55);
        button.setAnchorPoint(1, 1);
        button.setPosition(this.hostNode.width - 12, this.hostNode.height - topOffset);
        button.setClickListener(this, clickHandler);
        return button;
    },
    isAvailable: function () {
        var runtimePlayer = getMapZiplineBuildRuntimePlayer();
        if (!RoleRuntimeService.isZiplineFrameworkAvailable(runtimePlayer)) {
            return false;
        }
        return !RoleRuntimeService.isZiplineBuildFromSiteOnly(runtimePlayer.roleType);
    },
    hasAnyLinks: function () {
        var runtimePlayer = getMapZiplineBuildRuntimePlayer();
        return !!(runtimePlayer.ziplineNetwork
            && typeof runtimePlayer.ziplineNetwork.getLinkCount === "function"
            && runtimePlayer.ziplineNetwork.getLinkCount(runtimePlayer.map) > 0);
    },
    getActionService: function () {
        return ZiplineActionService;
    },
    refresh: function () {
        var isAvailable = this.isAvailable();
        this.updateActionButton(this.buildButton, this.MODE.BUILD, isAvailable, cc.color(132, 34, 20, 255));

        if (this.mapView && typeof this.mapView.refreshZiplineOverlay === "function") {
            this.mapView.refreshZiplineOverlay();
        }
    },
    updateActionButton: function (button, mode, enabled, activeColor) {
        if (!button) {
            return;
        }

        button.setVisible(this.isAvailable());
        button.setEnabled(enabled);

        var isActive = this.mode === mode;
        var icon = button.getChildByName("icon");
        if (icon) {
            if (!enabled) {
                icon.setOpacity(100);
            } else if (isActive) {
                icon.setOpacity(180);
            } else {
                icon.setOpacity(255);
            }
        }

        var label = button.getChildByName("label");
        if (label) {
            if (!enabled) {
                label.setColor(cc.color(110, 110, 110, 255));
            } else if (isActive) {
                label.setColor(activeColor);
            } else {
                label.setColor(cc.color(0, 0, 0, 255));
            }
        }
    },
    toggleBuildMode: function () {
        this.toggleMode(this.MODE.BUILD);
    },
    toggleMode: function (mode) {
        if (!this.isAvailable()) {
            return;
        }

        if (mode === this.MODE.REMOVE && !this.hasAnyLinks()) {
            return;
        }

        if (this.mode === mode) {
            this.cancelMode();
            return;
        }

        this.mode = mode;
        this.selectedEntityKey = null;
        this.setSelectedEntity(null);
        getMapZiplineBuildRuntimePlayer().log.addMsg(mode === this.MODE.REMOVE ? 1362 : 1351);
        this.refresh();
    },
    cancelMode: function () {
        if (!this.mode && !this.selectedEntityKey) {
            return;
        }

        var cancelLogId = this.mode === this.MODE.REMOVE ? 1366 : 1352;
        this.mode = null;
        this.selectedEntityKey = null;
        this.setSelectedEntity(null);
        getMapZiplineBuildRuntimePlayer().log.addMsg(cancelLogId);
        this.refresh();
    },
    finishMode: function () {
        this.mode = null;
        this.selectedEntityKey = null;
        this.setSelectedEntity(null);
        this.refresh();
    },
    handleEntityClick: function (entity) {
        if (!this.mode || !this.isAvailable()) {
            return false;
        }

        var baseSite = entity ? entity.baseSite : null;
        if (!this.isBuildableEntity(baseSite)) {
            getMapZiplineBuildRuntimePlayer().log.addMsg(1357);
            return true;
        }

        if (this.mode === this.MODE.BUILD) {
            return this.handleBuildEntityClick(entity, baseSite);
        }

        return this.handleRemoveEntityClick(entity, baseSite);
    },
    handleBuildEntityClick: function (entity, baseSite) {
        var runtimePlayer = getMapZiplineBuildRuntimePlayer();
        var currentEntityKey = runtimePlayer.ziplineNetwork.getEntityKey(baseSite, runtimePlayer.map);
        if (!currentEntityKey) {
            runtimePlayer.log.addMsg(1357);
            return true;
        }

        if (!this.selectedEntityKey) {
            this.selectedEntityKey = currentEntityKey;
            this.setSelectedEntity(entity);
            runtimePlayer.log.addMsg(1353, baseSite.getName());
            this.refresh();
            return true;
        }

        if (this.selectedEntityKey === currentEntityKey) {
            runtimePlayer.log.addMsg(1354);
            return true;
        }

        var startEntity = runtimePlayer.ziplineNetwork.resolveEntity(this.selectedEntityKey, runtimePlayer.map);
        var result = this.getActionService().createLink(this.selectedEntityKey, currentEntityKey, runtimePlayer.map);
        if (!result.ok) {
            this.logBuildFailure(result.reason);
            return true;
        }

        runtimePlayer.log.addMsg(1356, startEntity ? startEntity.getName() : "", baseSite.getName());
        this.finishMode();
        getMapZiplineBuildRuntimeRecord().saveAll();
        return true;
    },
    handleRemoveButtonClick: function (entity) {
        if (!this.isAvailable() || !entity || !entity.baseSite || this.mapView.actor.isMoving) {
            return;
        }

        var baseSite = entity.baseSite;
        if (!this.isBuildableEntity(baseSite)) {
            getMapZiplineBuildRuntimePlayer().log.addMsg(1357);
            return;
        }

        var runtimePlayer = getMapZiplineBuildRuntimePlayer();
        if (!runtimePlayer.ziplineNetwork.hasLinksForEntity(baseSite, runtimePlayer.map)) {
            runtimePlayer.log.addMsg(1365);
            return;
        }

        var currentEntityKey = runtimePlayer.ziplineNetwork.getEntityKey(baseSite, runtimePlayer.map);
        if (this.mode !== this.MODE.REMOVE) {
            this.mode = this.MODE.REMOVE;
            this.selectedEntityKey = currentEntityKey;
            this.setSelectedEntity(entity);
            runtimePlayer.log.addMsg(1363, baseSite.getName());
            this.refresh();
            return;
        }

        if (this.selectedEntityKey === currentEntityKey) {
            this.cancelMode();
            return;
        }

        this.handleRemoveEntityClick(entity, baseSite);
    },
    handleRemoveEntityClick: function (entity, baseSite) {
        var runtimePlayer = getMapZiplineBuildRuntimePlayer();
        var currentEntityKey = runtimePlayer.ziplineNetwork.getEntityKey(baseSite, runtimePlayer.map);
        if (!currentEntityKey) {
            runtimePlayer.log.addMsg(1357);
            return true;
        }

        if (!this.selectedEntityKey) {
            if (!runtimePlayer.ziplineNetwork.hasLinksForEntity(baseSite, runtimePlayer.map)) {
                runtimePlayer.log.addMsg(1365);
                return true;
            }

            this.selectedEntityKey = currentEntityKey;
            this.setSelectedEntity(entity);
            runtimePlayer.log.addMsg(1363, baseSite.getName());
            this.refresh();
            return true;
        }

        if (this.selectedEntityKey === currentEntityKey) {
            runtimePlayer.log.addMsg(1354);
            return true;
        }

        var startEntity = runtimePlayer.ziplineNetwork.resolveEntity(this.selectedEntityKey, runtimePlayer.map);
        var result = this.getActionService().removeLink(this.selectedEntityKey, currentEntityKey, runtimePlayer.map, baseSite);
        if (!result.ok) {
            this.logRemoveFailure(result.reason);
            return true;
        }

        runtimePlayer.log.addMsg(1360, (startEntity ? startEntity.getName() : this.selectedEntityKey) + " <-> " + baseSite.getName());
        this.logRefundResult(result.refundTarget);
        this.finishMode();
        getMapZiplineBuildRuntimeRecord().saveAll();
        return true;
    },
    logBuildFailure: function (reason) {
        var runtimePlayer = getMapZiplineBuildRuntimePlayer();
        switch (reason) {
        case "missing-cost":
            runtimePlayer.log.addMsg(stringUtil.getString("zipline_site_cost_missing") || "随身材料不足，无法建立滑索");
            break;
        case "duplicate":
            runtimePlayer.log.addMsg(1355);
            break;
        case "max-links":
            runtimePlayer.log.addMsg(1367);
            break;
        case "same-site":
            runtimePlayer.log.addMsg(1354);
            break;
        case "home-only":
            runtimePlayer.log.addMsg(stringUtil.getString("zipline_site_home_only") || "滑索只能连接家与地点或NPC");
            break;
        case "invalid-site":
            runtimePlayer.log.addMsg(stringUtil.getString("zipline_site_invalid_target") || "当前目标不能建立滑索");
            break;
        default:
            runtimePlayer.log.addMsg(1357);
            break;
        }
    },
    logRemoveFailure: function (reason) {
        var runtimePlayer = getMapZiplineBuildRuntimePlayer();
        if (reason === "not-found") {
            runtimePlayer.log.addMsg(1364);
        } else if (reason === "same-site") {
            runtimePlayer.log.addMsg(1354);
        } else {
            runtimePlayer.log.addMsg(1357);
        }
    },
    logRefundResult: function (refundTarget) {
        var runtimePlayer = getMapZiplineBuildRuntimePlayer();
        if (refundTarget === "bag") {
            runtimePlayer.log.addMsg(stringUtil.getString("zipline_site_refund_received") || "已返还50%滑索材料");
        } else if (refundTarget === "storage") {
            runtimePlayer.log.addMsg(stringUtil.getString("zipline_map_refund_to_target_storage")
                || "背包空间不足，返还材料已放入当前目标存放");
        }
    },
    getRemoveActionState: function (entityRef) {
        var runtimePlayer = getMapZiplineBuildRuntimePlayer();
        var entityKey = runtimePlayer.ziplineNetwork.getEntityKey(entityRef, runtimePlayer.map);
        var hasLinks = !!(entityKey && runtimePlayer.ziplineNetwork.hasLinksForEntity(entityRef, runtimePlayer.map));
        return {
            visible: this.isAvailable() && hasLinks,
            enabled: this.isAvailable() && hasLinks && !(this.mapView && this.mapView.actor && this.mapView.actor.isMoving),
            active: this.mode === this.MODE.REMOVE && this.selectedEntityKey === entityKey,
            labelText: this.getRemoveActionLabel()
        };
    },
    getOverlayState: function () {
        if (!this.mode) {
            return null;
        }

        return {
            mode: this.mode,
            startEntityKey: this.selectedEntityKey
        };
    },
    isBuildableEntity: function (site) {
        var runtimePlayer = getMapZiplineBuildRuntimePlayer();
        return !!(runtimePlayer.ziplineNetwork
            && typeof runtimePlayer.ziplineNetwork.isEligibleEntity === "function"
            && runtimePlayer.ziplineNetwork.isEligibleEntity(site, runtimePlayer.map));
    },
    getRemoveActionLabel: function () {
        var removeText = stringUtil.getString(1359) || "X";
        return removeText.charAt(0) || "X";
    },
    setSelectedEntity: function (entity) {
        if (this.selectedEntity) {
            this.selectedEntity.setHighlight(false);
        }

        this.selectedEntity = entity || null;
        if (this.selectedEntity) {
            this.selectedEntity.setHighlight(true);
        }
    }
});
