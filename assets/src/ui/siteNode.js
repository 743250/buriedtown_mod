/**
 * Created by lancelot on 15/4/22.
 */
var SiteNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);
    },
    _init: function () {
        this.site = player.map.getSite(this.userData);
        this.setName(Navigation.nodeName.SITE_NODE);
        this.uiConfig = {
            title: this.site.getName(),
            leftBtn: true,
            rightBtn: false
        };

        player.enterSite(this.site.id);

        var leftEdge = 40;
        var rightEdge = this.bgRect.width - leftEdge;

        this.title.anchorX = 0;
        this.title.anchorY = 1;
        this.title.x = this.leftBtn.x + this.leftBtn.width / 2 + 10;
        this.title.y = this.bgRect.height - 5;

        var template = stringUtil.getString(5000);
        var txt1 = new cc.LabelTTF(cc.formatStr(template.title.txt_1, this.site.getProgressStr()), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        txt1.setAnchorPoint(0, 1);
        txt1.setPosition(this.title.x, this.actionBarBaseHeight - 4);
        this.bg.addChild(txt1);

        var txt2 = new cc.LabelTTF(cc.formatStr(template.title.txt_2, this.site.storage.getAllItemNum()), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        txt2.setAnchorPoint(1, 1);
        txt2.setPosition(rightEdge + 20, this.actionBarBaseHeight - 4);
        this.bg.addChild(txt2);

        var digDes = autoSpriteFrameController.getSpriteFromSpriteName("#site_dig_" + this.site.id + ".png");
        digDes.setAnchorPoint(0.5, 1)
        digDes.setPosition(this.bgRect.width / 2, this.contentTopLineHeight - 50);
        this.bg.addChild(digDes);
        digDes.setName("dig_des");

        var des = new cc.LabelTTF(this.site.getDes(), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(rightEdge - leftEdge, 0));
        des.setAnchorPoint(0.5, 1);
        des.setPosition(this.bgRect.width / 2, digDes.y - digDes.height - 40);
        this.bg.addChild(des);
        des.setName("des");
        des.setColor(UITheme.colors.WHITE);

        this.ziplineBaseY = des.y - des.height - 35;
        this.renderZiplineSection(leftEdge, rightEdge, this.ziplineBaseY);

        //var log = new cc.Node();
        //log.setAnchorPoint(0, 0);
        //log.setPosition(0, 0);
        //log.setContentSize(this.contentNode.getContentSize().width, 200);
        //log.setName("log");
        //this.contentNode.addChild(log);

        var btn1 = uiUtil.createCommonBtnWhite(stringUtil.getString(1032), this, this.onClickBtn1);
        btn1.setPosition(this.bgRect.width / 4, 100);
        this.bg.addChild(btn1);
        btn1.setName("btn_1");

        this.notifyIcon = autoSpriteFrameController.getSpriteFromSpriteName('map_actor.png');
        this.notifyIcon.x = btn1.width - 5;
        this.notifyIcon.y = btn1.height - 5;
        btn1.addChild(this.notifyIcon);
        this.notifyIcon.setVisible(this.site.haveNewItems);

        var btn2 = uiUtil.createCommonBtnWhite(stringUtil.getString(1033), this, this.onClickBtn2);
        btn2.setPosition(this.bgRect.width / 4 * 3, 100);
        this.bg.addChild(btn2);
        btn2.setName("btn_2")
        btn2.setEnabled(!this.site.isSiteEnd());

        if (userGuide.isStep(userGuide.stepName.ENTER_SITE)) {
            uiUtil.createIconWarn(btn2);
            userGuide.step();

            btn1.setVisible(false);
            btn2.x = this.bgRect.width / 2;

        } else if (userGuide.isStep(userGuide.stepName.BACK_SITE)) {
            uiUtil.createIconWarn(this.leftBtn);
            userGuide.step();
        } else if (userGuide.isStep(userGuide.stepName.BACK_SITE)) {
            uiUtil.createIconWarn(this.leftBtn);
            userGuide.step();
        }

        if (this.site.isUnderAttacked) {
            this.site.isUnderAttacked = false;
            this.showWarnDialog();
        }
    },
    onClickBtn1: function () {
        this.forward(Navigation.nodeName.SITE_STORAGE_NODE, this.userData);
        this.site.haveNewItems = false;
    },
    onClickBtn2: function () {
        this.forward(Navigation.nodeName.BATTLE_AND_WORK_NODE, this.userData);
    },
    onEnter: function () {
        this._super();
    },
    onExit: function () {
        this._super();
    },

    onClickLeftBtn: function () {
        if (this.site.canClose()) {
            player.map.closeSite(this.site.id);
        }
        this.back();
        player.leaveSite();
    },
    onClickRightBtn: function () {
    },
    renderZiplineSection: function (leftEdge, rightEdge, topY) {
        this.bg.removeChildByName("zipline_section");

        if (player.roleType !== RoleType.BELL || !player.ziplineNetwork) {
            return;
        }

        var links = player.ziplineNetwork.getLinksForEntity(this.site, player.map);
        var totalLinks = player.ziplineNetwork.getLinkCount
            ? player.ziplineNetwork.getLinkCount(player.map)
            : player.ziplineNetwork.listLinks().length;
        var maxLinks = player.ziplineNetwork.getMaxLinks ? player.ziplineNetwork.getMaxLinks() : 3;
        var panelWidth = rightEdge - leftEdge;
        var headerHeight = 34;
        var rowHeight = 42;
        var rowCount = Math.max(1, links.length);
        var panelHeight = headerHeight + rowCount * rowHeight + 10;

        var sectionNode = new cc.Node();
        sectionNode.setName("zipline_section");
        this.bg.addChild(sectionNode);
        sectionNode.setPosition(leftEdge, topY - panelHeight);

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

        if (!links.length) {
            var emptyLabel = new cc.LabelTTF(
                stringUtil.getString("zipline_site_empty") || stringUtil.getString(1365),
                uiUtil.fontFamily.normal,
                uiUtil.fontSize.COMMON_2,
                cc.size(panelWidth - 36, 0)
            );
            emptyLabel.setAnchorPoint(0.5, 0.5);
            emptyLabel.setPosition(panelWidth / 2, (panelHeight - headerHeight) / 2);
            emptyLabel.setColor(cc.color(210, 210, 210, 255));
            sectionNode.addChild(emptyLabel);
            return;
        }

        var self = this;
        var currentEntityKey = player.ziplineNetwork.getEntityKey(this.site, player.map);
        var removeBtnSize = cc.size(52, 24);
        var removeBtnRightPadding = 8;
        var removeBtnText = stringUtil.getString(1359) || "拆除";
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            var targetEntityKey = link.startEntityKey === currentEntityKey ? link.endEntityKey : link.startEntityKey;
            var targetSite = player.ziplineNetwork.resolveEntity(targetEntityKey, player.map);
            var targetName = this.buildZiplineTargetLabel(targetSite, targetEntityKey);
            var rowBottom = panelHeight - headerHeight - (i + 1) * rowHeight;
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
                        self.onClickZiplineRemoveBtn(entityKey);
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
    onClickZiplineRemoveBtn: function (targetEntityKey) {
        if (!targetEntityKey) {
            player.log.addMsg(1364);
            return;
        }

        var targetSite = player.ziplineNetwork.resolveEntity(targetEntityKey, player.map);
        var result = player.ziplineNetwork.removeLinkBetween(this.site, targetEntityKey, player.map);
        if (!result.ok) {
            player.log.addMsg(result.reason === "not-found" ? 1364 : 1357);
            return;
        }

        player.log.addMsg(1360, this.site.getName() + " <-> " + (targetSite ? targetSite.getName() : targetEntityKey));
        Record.saveAll();
        this.renderZiplineSection(40, this.bgRect.width - 40, this.ziplineBaseY);
    },
    buildZiplineTargetLabel: function (targetSite, targetEntityKey) {
        if (!targetSite) {
            return targetEntityKey || "";
        }

        var typeLabel = targetSite instanceof NPC
            ? (stringUtil.getString("zipline_target_type_npc") || "NPC")
            : (stringUtil.getString("zipline_target_type_site") || "地点");
        return typeLabel + "：" + targetSite.getName();
    },
    showWarnDialog: function () {
        var config = {
            content: {des: stringUtil.getString(1264)},
            action: {btn_1: {}}
        };
        config.action.btn_1.txt = stringUtil.getString(1030);

        var dialog = new DialogTiny(config);
        dialog.show();
    },

});
