/**
 * Owns the minimal map-side flow for creating ziplines.
 */
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
        return RoleRuntimeService.isZiplineFrameworkAvailable(player);
    },
    hasAnyLinks: function () {
        return !!(player.ziplineNetwork
            && typeof player.ziplineNetwork.getLinkCount === "function"
            && player.ziplineNetwork.getLinkCount(player.map) > 0);
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
        player.log.addMsg(mode === this.MODE.REMOVE ? 1362 : 1351);
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
        player.log.addMsg(cancelLogId);
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
            player.log.addMsg(1357);
            return true;
        }

        if (this.mode === this.MODE.BUILD) {
            return this.handleBuildEntityClick(entity, baseSite);
        }

        return this.handleRemoveEntityClick(entity, baseSite);
    },
    handleBuildEntityClick: function (entity, baseSite) {
        var currentEntityKey = player.ziplineNetwork.getEntityKey(baseSite, player.map);
        if (!currentEntityKey) {
            player.log.addMsg(1357);
            return true;
        }

        if (!this.selectedEntityKey) {
            this.selectedEntityKey = currentEntityKey;
            this.setSelectedEntity(entity);
            player.log.addMsg(1353, baseSite.getName());
            this.refresh();
            return true;
        }

        if (this.selectedEntityKey === currentEntityKey) {
            player.log.addMsg(1354);
            return true;
        }

        var startSite = player.ziplineNetwork.resolveEntity(this.selectedEntityKey, player.map);
        var result = player.ziplineNetwork.createLink(this.selectedEntityKey, baseSite, player.map);
        if (!result.ok) {
            if (result.reason === "duplicate") {
                player.log.addMsg(1355);
            } else if (result.reason === "max-links") {
                player.log.addMsg(1367);
            } else if (result.reason === "same-site") {
                player.log.addMsg(1354);
            } else {
                player.log.addMsg(1357);
            }
            return true;
        }

        player.log.addMsg(1356, startSite ? startSite.getName() : "", baseSite.getName());
        this.finishMode();
        Record.saveAll();
        return true;
    },
    handleRemoveButtonClick: function (entity) {
        if (!this.isAvailable() || !entity || !entity.baseSite || this.mapView.actor.isMoving) {
            return;
        }

        var baseSite = entity.baseSite;
        if (!this.isBuildableEntity(baseSite)) {
            player.log.addMsg(1357);
            return;
        }

        if (!player.ziplineNetwork.hasLinksForEntity(baseSite, player.map)) {
            player.log.addMsg(1365);
            return;
        }

        var currentEntityKey = player.ziplineNetwork.getEntityKey(baseSite, player.map);
        if (this.mode !== this.MODE.REMOVE) {
            this.mode = this.MODE.REMOVE;
            this.selectedEntityKey = currentEntityKey;
            this.setSelectedEntity(entity);
            player.log.addMsg(1363, baseSite.getName());
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
        var currentEntityKey = player.ziplineNetwork.getEntityKey(baseSite, player.map);
        if (!currentEntityKey) {
            player.log.addMsg(1357);
            return true;
        }

        if (!this.selectedEntityKey) {
            if (!player.ziplineNetwork.hasLinksForEntity(baseSite, player.map)) {
                player.log.addMsg(1365);
                return true;
            }

            this.selectedEntityKey = currentEntityKey;
            this.setSelectedEntity(entity);
            player.log.addMsg(1363, baseSite.getName());
            this.refresh();
            return true;
        }

        if (this.selectedEntityKey === currentEntityKey) {
            player.log.addMsg(1354);
            return true;
        }

        var startSite = player.ziplineNetwork.resolveEntity(this.selectedEntityKey, player.map);
        var result = player.ziplineNetwork.removeLinkBetween(this.selectedEntityKey, baseSite, player.map);
        if (!result.ok) {
            if (result.reason === "not-found") {
                player.log.addMsg(1364);
            } else if (result.reason === "same-site") {
                player.log.addMsg(1354);
            } else {
                player.log.addMsg(1357);
            }
            return true;
        }

        player.log.addMsg(1360, (startSite ? startSite.getName() : this.selectedEntityKey) + " <-> " + baseSite.getName());
        this.finishMode();
        Record.saveAll();
        return true;
    },
    getRemoveActionState: function (siteId) {
        return {
            visible: false,
            enabled: false,
            active: false,
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
        return !!(player.ziplineNetwork
            && typeof player.ziplineNetwork.isEligibleEntity === "function"
            && player.ziplineNetwork.isEligibleEntity(site));
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
