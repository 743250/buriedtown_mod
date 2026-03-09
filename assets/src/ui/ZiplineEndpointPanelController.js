/**
 * Shared panel controller for building/removing Home-linked ziplines from
 * either a site page or an NPC page.
 */
var ZiplineEndpointPanelController = cc.Class.extend({
    ctor: function (options) {
        options = options || {};
        this.hostNode = options.hostNode || null;
        this.leftEdge = options.leftEdge || 40;
        this.rightEdge = options.rightEdge || 0;
        this.topY = options.topY || 0;
        this.sectionName = options.sectionName || "zipline_section";
        this.getEntity = options.getEntity || function () {
            return null;
        };
        this.getEntityRef = options.getEntityRef || this.getEntity;
        this.onRefreshHeader = options.onRefreshHeader || function () {};
    },
    getCurrentEntity: function () {
        return this.getEntity ? this.getEntity() : null;
    },
    getCurrentEntityRef: function () {
        return this.getEntityRef ? this.getEntityRef() : this.getCurrentEntity();
    },
    refresh: function () {
        if (!this.hostNode) {
            return;
        }

        this.hostNode.removeChildByName(this.sectionName);
        if (!RoleRuntimeService.isZiplineFrameworkAvailable(player)) {
            return;
        }

        var entity = this.getCurrentEntity();
        var entityRef = this.getCurrentEntityRef();
        if (!entity || !entityRef || !this.shouldShowPanel()) {
            return;
        }

        var links = player.ziplineNetwork.getLinksForEntity(entityRef, player.map);
        var totalLinks = player.ziplineNetwork.getLinkCount
            ? player.ziplineNetwork.getLinkCount(player.map)
            : player.ziplineNetwork.listLinks().length;
        var maxLinks = player.ziplineNetwork.getMaxLinks ? player.ziplineNetwork.getMaxLinks() : 3;
        var panelWidth = this.rightEdge - this.leftEdge;
        var headerHeight = 34;
        var rowHeight = 42;
        var rowCount = Math.max(1, links.length);
        var footerInfo = this.createFooter(panelWidth);
        var footerHeight = footerInfo ? (footerInfo.height + 8) : 0;
        var panelHeight = headerHeight + rowCount * rowHeight + 10 + footerHeight;

        var sectionNode = new cc.Node();
        sectionNode.setName(this.sectionName);
        this.hostNode.addChild(sectionNode);
        sectionNode.setPosition(this.leftEdge, this.topY - panelHeight);

        var divider = new cc.DrawNode();
        divider.drawSegment(
            cc.p(0, panelHeight - headerHeight + 2),
            cc.p(panelWidth, panelHeight - headerHeight + 2),
            1,
            cc.color(220, 220, 220, 180)
        );
        sectionNode.addChild(divider);

        var title = new cc.LabelTTF(
            (stringUtil.getString("zipline_site_panel_title") || stringUtil.getString(1358)) + " " + totalLinks + "/" + maxLinks,
            uiUtil.fontFamily.normal,
            uiUtil.fontSize.COMMON_3
        );
        title.setAnchorPoint(0, 1);
        title.setPosition(0, panelHeight - 2);
        title.setColor(cc.color(238, 238, 238, 255));
        sectionNode.addChild(title);

        var subTitle = new cc.LabelTTF(
            stringUtil.getString("zipline_site_panel_subtitle") || "可直达目标",
            uiUtil.fontFamily.normal,
            uiUtil.fontSize.COMMON_3
        );
        subTitle.setAnchorPoint(1, 1);
        subTitle.setPosition(panelWidth, panelHeight - 4);
        subTitle.setColor(cc.color(180, 180, 180, 255));
        sectionNode.addChild(subTitle);

        if (footerInfo) {
            var footerDivider = new cc.DrawNode();
            footerDivider.drawSegment(
                cc.p(0, footerHeight + 2),
                cc.p(panelWidth, footerHeight + 2),
                1,
                cc.color(220, 220, 220, 140)
            );
            sectionNode.addChild(footerDivider);

            footerInfo.node.setAnchorPoint(0, 0);
            footerInfo.node.setPosition(0, 0);
            sectionNode.addChild(footerInfo.node);
        }

        if (!links.length) {
            var emptyLabel = new cc.LabelTTF(
                stringUtil.getString("zipline_site_empty") || stringUtil.getString(1365),
                uiUtil.fontFamily.normal,
                uiUtil.fontSize.COMMON_2,
                cc.size(panelWidth - 36, 0)
            );
            emptyLabel.setAnchorPoint(0.5, 0.5);
            emptyLabel.setPosition(panelWidth / 2, footerHeight + (rowCount * rowHeight) / 2);
            emptyLabel.setColor(cc.color(210, 210, 210, 255));
            sectionNode.addChild(emptyLabel);
            return;
        }

        var self = this;
        var currentEntityKey = player.ziplineNetwork.getEntityKey(entityRef, player.map);
        var removeBtnSize = cc.size(52, 24);
        var removeBtnRightPadding = 8;
        var removeBtnText = stringUtil.getString(1359) || "拆除";
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            var targetEntityKey = link.startEntityKey === currentEntityKey ? link.endEntityKey : link.startEntityKey;
            var targetEntity = player.ziplineNetwork.resolveEntity(targetEntityKey, player.map);
            var targetName = this.buildTargetLabel(targetEntity, targetEntityKey);
            var rowBottom = footerHeight + rowCount * rowHeight - (i + 1) * rowHeight;
            var rowCenterY = rowBottom + rowHeight / 2;

            var routeLabel = new cc.LabelTTF(
                targetName,
                uiUtil.fontFamily.normal,
                uiUtil.fontSize.COMMON_2,
                cc.size(panelWidth - removeBtnSize.width - 28, 0)
            );
            routeLabel.setAnchorPoint(0, 0.5);
            routeLabel.setPosition(0, rowCenterY);
            routeLabel.setColor(cc.color(236, 236, 236, 255));
            sectionNode.addChild(routeLabel);

            var removeBtn = uiUtil.createTextActionButton(
                removeBtnText,
                this,
                (function (entityKey) {
                    return function () {
                        self.onClickRemove(entityKey);
                    };
                })(targetEntityKey),
                {
                    size: removeBtnSize,
                    fontSize: uiUtil.fontSize.COMMON_3,
                    color: cc.color(236, 236, 236, 255),
                    pressedColor: cc.color(180, 180, 180, 255)
                }
            );
            removeBtn.setPosition(panelWidth - removeBtnSize.width / 2 - removeBtnRightPadding, rowCenterY);
            sectionNode.addChild(removeBtn);
        }
    },
    shouldShowPanel: function () {
        var entity = this.getCurrentEntity();
        var entityRef = this.getCurrentEntityRef();
        return !!(RoleRuntimeService.isZiplineFrameworkAvailable(player)
            && RoleRuntimeService.isZiplineHomeOnly(player.roleType)
            && RoleRuntimeService.isZiplineBuildFromSiteOnly(player.roleType)
            && entity
            && entityRef
            && entity.id !== HOME_SITE
            && player.ziplineNetwork
            && typeof player.ziplineNetwork.isEligibleEntity === "function"
            && player.ziplineNetwork.isEligibleEntity(entityRef, player.map));
    },
    hasHomeLink: function () {
        var entityRef = this.getCurrentEntityRef();
        return !!(entityRef
            && player.ziplineNetwork
            && typeof player.ziplineNetwork.hasHomeLink === "function"
            && player.ziplineNetwork.hasHomeLink(entityRef, player.map));
    },
    getActionService: function () {
        return ZiplineActionService;
    },
    getBuildCost: function () {
        return this.getActionService().getBuildCost(player.roleType);
    },
    getRefundCost: function () {
        return this.getActionService().getRefundCost(player.roleType);
    },
    buildDisplayItems: function (itemList, compareWithBag, defaultColor) {
        var items = utils.clone(itemList || []);
        if (compareWithBag) {
            player.validateItemsInBag(items);
        }
        return items.map(function (itemInfo) {
            return {
                itemId: itemInfo.itemId,
                num: itemInfo.num,
                color: compareWithBag
                    ? (itemInfo.haveNum >= itemInfo.num ? UITheme.colors.TEXT_TITLE : UITheme.colors.TEXT_ERROR)
                    : (defaultColor || UITheme.colors.TEXT_TITLE)
            };
        });
    },
    createFooter: function (panelWidth) {
        if (!this.shouldShowPanel()) {
            return null;
        }

        var hasHomeLink = this.hasHomeLink();
        var costItems = hasHomeLink
            ? this.buildDisplayItems(this.getRefundCost(), false, cc.color(170, 220, 178, 255))
            : this.buildDisplayItems(this.getBuildCost(), true);
        var footerNode = new cc.Node();
        var buildBtnSize = cc.size(92, 24);
        var buildBtnRightPadding = 8;

        var costTitle = new cc.LabelTTF(
            stringUtil.getString(hasHomeLink ? "zipline_site_refund_title" : "zipline_site_cost_title")
                || (hasHomeLink ? "拆除返还（50%）" : "建立滑索需要"),
            uiUtil.fontFamily.normal,
            uiUtil.fontSize.COMMON_3,
            cc.size(hasHomeLink ? panelWidth : (panelWidth - buildBtnSize.width - 16), 0),
            cc.TEXT_ALIGNMENT_LEFT
        );
        costTitle.setAnchorPoint(0, 1);
        costTitle.setColor(hasHomeLink
            ? cc.color(170, 220, 178, 255)
            : cc.color(236, 236, 236, 255));
        footerNode.addChild(costTitle);

        var buildBtn = null;
        if (!hasHomeLink) {
            buildBtn = uiUtil.createTextActionButton(
                stringUtil.getString("zipline_site_build_action") || "建立到家",
                this,
                this.onClickBuild,
                {
                    size: buildBtnSize,
                    fontSize: uiUtil.fontSize.COMMON_3,
                    color: cc.color(236, 236, 236, 255),
                    pressedColor: cc.color(180, 180, 180, 255)
                }
            );
            footerNode.addChild(buildBtn);
        }

        var costRichText = new ItemRichText(
            costItems,
            panelWidth,
            3,
            0.36,
            UITheme.colors.TEXT_TITLE,
            uiUtil.fontSize.COMMON_3
        );
        costRichText.setAnchorPoint(0, 1);
        footerNode.addChild(costRichText);

        var ruleHint = new cc.LabelTTF(
            stringUtil.getString("zipline_site_rule_hint") || "仅可连接家，拆除返还50%材料",
            uiUtil.fontFamily.normal,
            uiUtil.fontSize.COMMON_3,
            cc.size(panelWidth, 0),
            cc.TEXT_ALIGNMENT_LEFT
        );
        ruleHint.setAnchorPoint(0, 1);
        ruleHint.setColor(cc.color(180, 180, 180, 255));
        footerNode.addChild(ruleHint);

        var footerHeight = costTitle.height + costRichText.height + ruleHint.height + 14;
        footerNode.setContentSize(panelWidth, footerHeight);
        footerNode.width = panelWidth;
        footerNode.height = footerHeight;

        costTitle.setPosition(0, footerHeight);
        if (buildBtn) {
            buildBtn.setPosition(panelWidth - buildBtnSize.width / 2 - buildBtnRightPadding, footerHeight - buildBtnSize.height / 2 + 2);
        }
        costRichText.setPosition(0, footerHeight - costTitle.height - 4);
        ruleHint.setPosition(0, footerHeight - costTitle.height - costRichText.height - 8);

        return {
            node: footerNode,
            height: footerHeight
        };
    },
    onClickBuild: function () {
        if (!this.shouldShowPanel() || this.hasHomeLink()) {
            return;
        }

        var entity = this.getCurrentEntity();
        var entityRef = this.getCurrentEntityRef();
        var result = this.getActionService().createHomeLink(entityRef, player.map);
        if (!result.ok) {
            switch (result.reason) {
            case "missing-cost":
                player.log.addMsg(stringUtil.getString("zipline_site_cost_missing") || "随身材料不足，无法建立滑索");
                break;
            case "duplicate":
                player.log.addMsg(1355);
                break;
            case "max-links":
                player.log.addMsg(1367);
                break;
            case "same-site":
                player.log.addMsg(1354);
                break;
            case "home-only":
                player.log.addMsg(stringUtil.getString("zipline_site_home_only") || "滑索只能连接家与地点或NPC");
                break;
            case "invalid-site":
                player.log.addMsg(stringUtil.getString("zipline_site_invalid_target") || "当前目标不能建立滑索");
                break;
            default:
                player.log.addMsg(1357);
                break;
            }
            return;
        }

        var homeSite = player.map.getSite(HOME_SITE);
        player.log.addMsg(1356, homeSite ? homeSite.getName() : "家", entity ? entity.getName() : "");
        Record.saveAll();
        this.refresh();
    },
    onClickRemove: function (targetEntityKey) {
        if (!targetEntityKey || !this.hasHomeLink()) {
            player.log.addMsg(1364);
            return;
        }

        var entity = this.getCurrentEntity();
        var entityRef = this.getCurrentEntityRef();
        var homeSite = player.map.getSite(HOME_SITE);
        var result = this.getActionService().removeHomeLink(entityRef, player.map, entity);
        if (!result.ok) {
            player.log.addMsg(result.reason === "not-found" ? 1364 : 1357);
            return;
        }

        player.log.addMsg(1360, (homeSite ? homeSite.getName() : "家") + " <-> " + (entity ? entity.getName() : entityRef));
        if (result.refundTarget === "bag") {
            player.log.addMsg(stringUtil.getString("zipline_site_refund_received") || "已返还50%滑索材料");
        } else if (result.refundTarget === "storage") {
            player.log.addMsg(stringUtil.getString("zipline_site_refund_to_site_storage") || "背包空间不足，返还材料已放入当前地点存放");
        }
        this.onRefreshHeader();
        Record.saveAll();
        this.refresh();
    },
    buildTargetLabel: function (targetEntity, targetEntityKey) {
        if (!targetEntity) {
            return targetEntityKey || "";
        }

        var typeLabel = targetEntity instanceof NPC
            ? (stringUtil.getString("zipline_target_type_npc") || "NPC")
            : (stringUtil.getString("zipline_target_type_site") || "地点");
        return typeLabel + "：" + targetEntity.getName();
    }
});
