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
    isHomeDirectMode: function () {
        return !!(RoleRuntimeService.isZiplineHomeOnly(player.roleType)
            || RoleRuntimeService.isZiplineBuildFromSiteOnly(player.roleType));
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
        if (this.isHomeDirectMode()) {
            player.log.addMsg(mode === this.MODE.REMOVE
                ? (stringUtil.getString("zipline_map_remove_hint") || "滑索拆除模式：点击已连接家的目标即可拆除")
                : (stringUtil.getString("zipline_map_build_hint") || "滑索建立模式：点击一个地点或NPC，直接连接到家"));
        } else {
            player.log.addMsg(mode === this.MODE.REMOVE ? 1362 : 1351);
        }
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
        if (this.isHomeDirectMode()) {
            return this.handleDirectHomeBuild(baseSite);
        }

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

        if (this.isHomeDirectMode()) {
            this.handleDirectHomeRemove(baseSite);
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
        if (this.isHomeDirectMode()) {
            return this.handleDirectHomeRemove(baseSite);
        }

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
    handleDirectHomeBuild: function (baseSite) {
        if (!baseSite || baseSite.id === HOME_SITE) {
            player.log.addMsg(stringUtil.getString("zipline_site_invalid_target") || "当前目标不能建立滑索");
            return true;
        }

        var buildCost = this.getBuildCost();
        if (buildCost.length > 0 && !player.validateItemsInBag(buildCost)) {
            player.log.addMsg(stringUtil.getString("zipline_site_cost_missing") || "随身材料不足，无法建立滑索");
            return true;
        }

        var result = player.ziplineNetwork.createLink(HOME_SITE, baseSite, player.map);
        if (!result.ok) {
            if (result.reason === "duplicate") {
                player.log.addMsg(1355);
            } else if (result.reason === "max-links") {
                player.log.addMsg(1367);
            } else if (result.reason === "home-only") {
                player.log.addMsg(stringUtil.getString("zipline_site_home_only") || "滑索只能连接家与地点或NPC");
            } else if (result.reason === "invalid-site") {
                player.log.addMsg(stringUtil.getString("zipline_site_invalid_target") || "当前目标不能建立滑索");
            } else {
                player.log.addMsg(1357);
            }
            return true;
        }

        if (buildCost.length > 0) {
            player.costItemsInBag(buildCost);
            if (typeof Achievement !== "undefined" && Achievement && typeof Achievement.checkCost === "function") {
                buildCost.forEach(function (itemInfo) {
                    Achievement.checkCost(itemInfo.itemId, itemInfo.num);
                });
            }
        }

        var homeSite = player.map.getSite(HOME_SITE);
        player.log.addMsg(1356, homeSite ? homeSite.getName() : "家", baseSite.getName());
        this.finishMode();
        Record.saveAll();
        return true;
    },
    handleDirectHomeRemove: function (baseSite) {
        if (!baseSite || baseSite.id === HOME_SITE) {
            player.log.addMsg(1364);
            return true;
        }

        if (!player.ziplineNetwork.hasLink(HOME_SITE, baseSite, player.map)) {
            player.log.addMsg(1364);
            return true;
        }

        var result = player.ziplineNetwork.removeLinkBetween(HOME_SITE, baseSite, player.map);
        if (!result.ok) {
            player.log.addMsg(result.reason === "not-found" ? 1364 : 1357);
            return true;
        }

        var refundTarget = this.grantRefundItems(baseSite, this.getRefundCost());
        var homeSite = player.map.getSite(HOME_SITE);
        player.log.addMsg(1360, (homeSite ? homeSite.getName() : "家") + " <-> " + baseSite.getName());
        if (refundTarget === "bag") {
            player.log.addMsg(stringUtil.getString("zipline_site_refund_received") || "已返还50%滑索材料");
        } else if (refundTarget === "storage") {
            player.log.addMsg(stringUtil.getString("zipline_site_refund_to_site_storage") || "背包空间不足，返还材料已放入当前地点存放");
        }
        this.finishMode();
        Record.saveAll();
        return true;
    },
    getBuildCost: function () {
        return RoleRuntimeService.getZiplineBuildCost
            ? RoleRuntimeService.getZiplineBuildCost(player.roleType)
            : [];
    },
    getRefundCost: function () {
        return RoleRuntimeService.getZiplineRefundCost
            ? RoleRuntimeService.getZiplineRefundCost(player.roleType)
            : [];
    },
    canFitItemsInBag: function (itemList) {
        var tempBag = player.bag.clone();
        for (var i = 0; i < itemList.length; i++) {
            var itemInfo = itemList[i];
            if (!tempBag.validateItemWeight(itemInfo.itemId, itemInfo.num)) {
                return false;
            }
            tempBag.increaseItem(itemInfo.itemId, itemInfo.num);
        }
        return true;
    },
    grantRefundItems: function (baseSite, refundItems) {
        refundItems = utils.clone(refundItems || []);
        if (!refundItems.length) {
            return "none";
        }

        if (this.canFitItemsInBag(refundItems)) {
            player.gainItemsInBag(refundItems);
            return "bag";
        }

        if (baseSite && typeof baseSite.increaseItem === "function") {
            refundItems.forEach(function (itemInfo) {
                baseSite.increaseItem(itemInfo.itemId, itemInfo.num);
            });
            return "storage";
        }

        return "none";
    },
    getRemoveActionState: function (baseSite) {
        if (this.isHomeDirectMode()) {
            var hasHomeLink = !!(baseSite
                && baseSite.id !== HOME_SITE
                && player.ziplineNetwork
                && player.ziplineNetwork.hasLink(HOME_SITE, baseSite, player.map));
            return {
                visible: hasHomeLink,
                enabled: hasHomeLink,
                active: false,
                labelText: this.getRemoveActionLabel()
            };
        }
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
