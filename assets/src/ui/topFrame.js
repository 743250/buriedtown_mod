/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */
var TopFrameNode = cc.Node.extend({
    ctor: function () {
        this._super();

        var bg = autoSpriteFrameController.getSpriteFromSpriteName("#frame_bg_top.png")
        bg.setAnchorPoint(0.5, 1);
        bg.setPosition(cc.winSize.width / 2, cc.winSize.height - 18);
        this.addChild(bg, 6, 1);

        this.firstLine = new cc.Node();
        this.firstLine.setAnchorPoint(0, 0);
        this.firstLine.setPosition(6, 190);
        this.firstLine.setContentSize(584, 50);
        bg.addChild(this.firstLine);

        var btnSize = cc.size(this.firstLine.width / 6, this.firstLine.height); //TODO MrC 游戏顶部菜单添加一个MoreGame按钮区域

        var season = new StatusButton(btnSize, "#icon_season_0.png", "", {
            scale: 0.5,
            noLabel: true
        });
        season.setClickListener(this, function (sender) {
            var label = sender.getChildByName("label");
            showStatusDialog(2, label.getString(), sender.spriteFrameName);
        });
        season.setPosition(this.firstLine.getContentSize().width / 12 * 3, this.firstLine.getContentSize().height / 2);
       //season.setPosition(btnSize.width*1.5, this.firstLine.getContentSize().height / 2); //TODO MrC 游戏顶部菜单添加一个MoreGame按钮区域，原菜单调整坐标
        season.setName("season");
        this.firstLine.addChild(season);

        var weather = new StatusButton(btnSize, "#icon_weather_" + player.weather.weatherId + ".png", player.weather.getWeatherName(), {
            scale: 0.5,
            noLabel: true
        });
        weather.setClickListener(this, function (sender) {
            var label = sender.getChildByName("label");
            showStatusDialog(11, label.getString(), sender.spriteFrameName);
        });
        weather.setPosition(this.firstLine.getContentSize().width / 12 * 9, this.firstLine.getContentSize().height / 2);
        //weather.setPosition(btnSize.width*3.5, this.firstLine.getContentSize().height / 2); //TODO MrC 游戏顶部菜单添加一个MoreGame按钮区域，原菜单调整坐标
        weather.setName("weather");
        this.firstLine.addChild(weather);
        utils.emitter.on("weather_change", function (weatherId) {
            weather.updateView("icon_weather_" + weatherId + ".png", player.weather.getWeatherName());
        });

        var day = new StatusButton(btnSize, "#icon_day.png", "", {scale: 0.5});
        day.setClickListener(this, function (sender) {
            var label = sender.getChildByName("label");
            showStatusDialog(1, cc.timer.getTimeDayStr(), sender.spriteFrameName);
        });
        day.setPosition(this.firstLine.getContentSize().width / 12 * 1, this.firstLine.getContentSize().height / 2);
        //day.setPosition(btnSize.width*0.5, this.firstLine.getContentSize().height / 2); //TODO MrC 游戏顶部菜单添加一个MoreGame按钮区域，原菜单调整坐标
        day.setName("day");
        this.firstLine.addChild(day);

        var time = new StatusButton(btnSize, "#icon_time.png", "", {scale: 0.5});
        time.setClickListener(this, function (sender) {
            var label = sender.getChildByName("label");
            showStatusDialog(4, label.getString(), sender.spriteFrameName);
        });
        time.setPosition(this.firstLine.getContentSize().width / 12 * 5, this.firstLine.getContentSize().height / 2);
        //time.setPosition(btnSize.width*2.5, this.firstLine.getContentSize().height / 2); //TODO MrC 游戏顶部菜单添加一个MoreGame按钮区域，原菜单调整坐标
        time.setName("time");
        this.firstLine.addChild(time);

        var roleTalent = new StatusButton(btnSize, "icon_iap_info.png", "", {scale: 0.5, noLabel: true});
        roleTalent.setClickListener(this, function () {
            showRoleTalentDialog();
        });
        roleTalent.setPosition(this.firstLine.getContentSize().width / 12 * 7, this.firstLine.getContentSize().height / 2);
        roleTalent.setName("role_talent");
        this.firstLine.addChild(roleTalent);

        this.updateByTime();

        var temperature = new StatusButton(btnSize, "#icon_temperature_0.png", memoryUtil.decode(player.temperature), {scale: 0.5});
        temperature.setClickListener(this, function (sender) {
            var label = sender.getChildByName("label");
            showStatusDialog(3, label.getString(), sender.spriteFrameName);
        });
        temperature.setPosition(this.firstLine.width / 12 * 11, this.firstLine.height / 2);
        //temperature.setPosition(btnSize.width*4.5, this.firstLine.getContentSize().height / 2); //TODO MrC 游戏顶部菜单添加一个MoreGame按钮区域，原菜单调整坐标
        temperature.setName("temperature");
        this.firstLine.addChild(temperature);
        utils.emitter.on("temperature_change", function (value) {
            temperature.updateView(null, memoryUtil.decode(player.temperature));
        });

        //TODO MrC 游戏顶部菜单添加一个MoreGame按钮区域
        /*var moregame = new StatusButton(btnSize, "#icon_moregame.png", "", {scale: 0.5});
        moregame.setClickListener(this, function (sender) {
            var paramObj = {"id":"moregame","cmd":1000};
            utils.doBridgeCall(paramObj);
            //jsb.reflection.callStaticMethod("com/locojoytj/sdk/Bridge", "doJsCallJava", "(Ljava/lang/String;)Ljava/lang/String;", JSON.stringify(paramObj));
        });
        moregame.setPosition(btnSize.width*5.5, this.firstLine.getContentSize().height / 2);
        moregame.setName("moregame");
        this.firstLine.addChild(moregame);
        //TODO End*/

        this.secondLine = new cc.Node();
        this.secondLine.setAnchorPoint(0, 0);
        this.secondLine.setPosition(6, 134);
        this.secondLine.setContentSize(584, 50);
        bg.addChild(this.secondLine);

        var btnSize2 = cc.size(this.secondLine.width / 6, this.secondLine.height);
        var createAttrButton = function (attr, needStatusStr, stringId, reversPercentage, warnRange) {
            var btn = new AttrButton(btnSize2, attr, "", warnRange, {scale: 0.5});
            btn.setClickListener(this, function () {
                showAttrStatusDialog(stringId, attr);
            });
            btn.setName(attr);
            utils.emitter.on(attr + "_change", function (value) {
                btn.updateAttrBtn();
            });
            btn.updateAttrBtn = function () {
                if (cc.sys.isObjectValid(btn)) {
                    btn.updateView(reversPercentage ? 1 - player.getAttrPercentage(attr) : player.getAttrPercentage(attr), needStatusStr ? player.getAttrStr(attr) : null);
                }
            };
            btn.updateAttrBtn();
            return btn;
        };

        var injury = createAttrButton("injury", false, 10, true, new Range("[0,0.5]"));
        injury.setPosition(this.secondLine.width / 12 * 1, this.secondLine.height / 2);
        this.secondLine.addChild(injury);

        var infect = createAttrButton("infect", false, 9, true, new Range("[0,0.75]"));
        infect.setPosition(this.secondLine.width / 12 * 3, this.secondLine.height / 2);
        this.secondLine.addChild(infect);

        var starve = createAttrButton("starve", false, 6, false, new Range("[0,0.5]"));
        starve.setPosition(this.secondLine.width / 12 * 5, this.secondLine.height / 2);
        this.secondLine.addChild(starve);

        var vigour = createAttrButton("vigour", false, 7, false, new Range("[0,0.5]"));
        vigour.setPosition(this.secondLine.width / 12 * 7, this.secondLine.height / 2);
        this.secondLine.addChild(vigour);

        var spirit = createAttrButton("spirit", false, 8, false, new Range("[0,0.5]"));
        spirit.setPosition(this.secondLine.width / 12 * 9, this.secondLine.height / 2);
        this.secondLine.addChild(spirit);

        var hp = createAttrButton("hp", false, 5, false, new Range("[0,0.5]"));
        hp.setPosition(this.secondLine.width / 12 * 11, this.secondLine.height / 2);
        this.secondLine.addChild(hp);

        //this.thirdLine = new cc.Node();
        this.thirdLine = new ButtonWithPressed(cc.size(584, 122));
        this.thirdLine.setAnchorPoint(0, 0);
        this.thirdLine.setPosition(6, 6);
        //this.thirdLine.setContentSize(584, 122);
        bg.addChild(this.thirdLine);
        this.createLogBar();

        var self = this;
        utils.emitter.on("logChanged", function (msg) {
            if (cc.sys.isObjectValid(self.thirdLine)) {
                self.thirdLine.updateLog(msg.txt);
                self.logTablebg.getChildByName("logView").addLog(msg);
            }
        });

        return true;
    },
    updateByTime: function () {
        var timeObj = cc.timer.formatTime();

        var seasonStr = stringUtil.getString(3000);
        var s = cc.timer.getSeason(timeObj);
        this.firstLine.getChildByName("season").updateView("#icon_season_" + s + ".png", seasonStr[s]);
        this.firstLine.getChildByName("day").updateView(null, cc.timer.formatTime().d + 1);
        this.firstLine.getChildByName("time").updateView(null, cc.timer.getTimeHourStr());
    },

    onExit: function () {
        this._super();
        utils.emitter.off("logChanged");
        if (this.tcb) {
            cc.timer.removeTimerCallback(this.tcb);
        }
    },

    onEnter: function () {
        this._super();
        var self = this;
        if (utils.emitter.listeners("logChanged").length < 1) {
            utils.emitter.on("logChanged", function (msg) {
                self.thirdLine.updateLog(msg.txt);
                self.logTablebg.getChildByName("logView").addLog(msg);
            });
        }

        this.tcb = cc.timer.addTimerCallback(new TimerCallback(60, this, {
            end: function () {
                self.updateByTime();
            }
        }, TimerManager.REPEAT_FOREVER));
    },

    createLogBar: function () {

        this.thirdLine.setClickListener(this, function () {
            this.bgNode.setVisible(!this.bgNode.isVisible());
            if (this.bgNode.isVisible()) {
                audioManager.playEffect(audioManager.sound.LOG_POP_UP);
            }
        });
        var self = this;

        for (var i = 0; i < 4; i++) {
            if (cc.sys.os === cc.sys.OS_ANDROID) {
                var label = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(580, 0));
            } else {
                var label = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(580, uiUtil.fontSize.COMMON_3));
            }
            label.setAnchorPoint(0, 0);
            label.setPosition(0, i * 30 + 4);
            label.setName("log_" + i);
            label.setColor(UITheme.colors.WHITE);
            this.thirdLine.addChild(label);
        }

        this.thirdLine.updateLog = function (log) {
            var logs = utils.splitLog(log, 55, 55);
            logs.forEach(function (llog) {
                self.thirdLine.updateLogSingleLine(llog);
            });
        };

        this.thirdLine.updateLogSingleLine = function (log) {
            for (var i = 3; i >= 0; i--) {
                var label = this.getChildByName("log_" + i);
                if (i === 0) {
                    label.setString(log);
                } else {
                    var lastLabel = this.getChildByName("log_" + (i - 1));
                    label.setString(lastLabel.getString());
                }
            }
        };


        this.createLogTableView();
    },

    createLogTableView: function () {
        this.bgNode = new cc.Node();
        this.addChild(this.bgNode, 5);

        var bgColor = new cc.LayerColor();
        bgColor.setColor(cc.color(0, 0, 0, 155));
        bgColor.setOpacity(200);
        this.bgNode.addChild(bgColor, 0);

        this.logTablebg = autoSpriteFrameController.getSpriteFromSpriteName("#frame_bg_bottom.png");
        this.logTablebg.setAnchorPoint(0.5, 0);
        this.logTablebg.setPosition(cc.winSize.width / 2, 18);
        this.bgNode.addChild(this.logTablebg, 10);

        var self = this;
        var btn = new ButtonInScrollView(this.logTablebg.getContentSize());
        btn.setAnchorPoint(0, 0);
        btn.setPosition(0, 0);
        this.logTablebg.addChild(btn);
        btn.setClickListener(this, function () {
            if (self.bgNode.isVisible()) {
                self.bgNode.setVisible(false);
            }
        });

        var logView = new LogView(cc.size(this.logTablebg.width, this.logTablebg.height - 20));
        logView.setPosition(7, 5);
        logView.setName("logView");
        this.logTablebg.addChild(logView, 1);

        this.bgNode.setVisible(false);
    }

});

var showStatusDialog = function (stringId, value, iconName) {
    var config = utils.clone(stringUtil.getString("statusDialog"));
    var strConfig = stringUtil.getString(stringId);
    config.title.icon = iconName;
    config.title.title = strConfig.title;
    config.title.txt_1 = cc.formatStr(config.title.txt_1, value);
    config.content.des = strConfig.des;
    var dialog = new DialogSmall(config);
    pauseTimeWhileDialogVisible(dialog);
    dialog.show();
};

var pauseTimeWhileDialogVisible = function (dialog) {
    if (!cc.timer) {
        return;
    }

    cc.timer.pause();
    var oldDismissListener = dialog.onDismissListener;
    dialog.setOnDismissListener({
        target: dialog,
        cb: function () {
            if (oldDismissListener && oldDismissListener.cb) {
                oldDismissListener.cb.call(oldDismissListener.target);
            }
            cc.timer.resume();
        }
    });
};

var showRoleTalentDialog = function () {
    var formatMultiline = function (str) {
        return (str || "").replace(/\\n/g, "\n");
    };
    var fitSpriteToSize = function (sprite, maxWidth, maxHeight) {
        if (!sprite || sprite.width <= 0 || sprite.height <= 0) {
            return;
        }
        var scale = Math.min(maxWidth / sprite.width, maxHeight / sprite.height);
        sprite.setScale(scale);
    };

    var currentRoleType = Number(player.roleType);
    if (isNaN(currentRoleType) || currentRoleType <= 0) {
        currentRoleType = RoleType.STRANGER;
    }

    var roleInfo = role.getRoleInfo(currentRoleType) || {};
    var roleName = roleInfo && roleInfo.name ? roleInfo.name : "";
    var roleDes = roleInfo && roleInfo.des ? roleInfo.des : "";
    var roleEffect = roleInfo && roleInfo.effect ? roleInfo.effect : "";
    roleDes = formatMultiline(roleDes);
    roleEffect = formatMultiline(roleEffect);

    var config = {
        title: {title: "人物信息", icon: "icon_iap_info.png"},
        content: {},
        action: {btn_1: {}}
    };
    config.action.btn_1.txt = stringUtil.getString(1030);

    var layout = {
        dialogScale: 1.2,
        dialogOffsetX: -8,
        dialogOffsetY: 0,
        dialogBaseY: 29,
        dialogBaseHeight: 839,
        minViewHeight: 80,
        viewHeightPaddingBottom: 8,
        sectionTitleFontSize: uiUtil.fontSize.COMMON_3 - 1,
        infoTitleFontSize: uiUtil.fontSize.COMMON_3 - 1,
        infoBodyFontSize: uiUtil.fontSize.COMMON_3 - 3,
        topPadding: 10,
        bottomPadding: 10,
        sectionGap: 8,
        blockGap: 12,
        rowGap: 8,
        roleAvatarCenterX: 34,
        roleTextX: 66,
        roleTextMinWidth: 128,
        roleTextRightPadding: 8,
        talentTextX: 78,
        talentTextMinWidth: 120,
        talentTextRightPadding: 8,
        roleAvatarBgSize: 68,
        roleAvatarScaleRatio: 1.1,
        rolePanelMinHeight: 108,
        rolePanelExtraHeight: 22,
        roleNameTopPadding: 10,
        textBlockGap: 4,
        panelBgOpacity: 72,
        rowBgOpacity: 72,
        scrollViewY: 4,
        talentRowMinHeight: 72,
        talentIconSize: 62,
        talentIconX: 40,
        talentNameTopPadding: 9
    };

    var dialog = new DialogBig(config);
    var dialogSize = dialog.bgNode.getContentSize();
    dialog.bgNode.setScale(layout.dialogScale);
    dialog.bgNode.setPosition(
        (cc.winSize.width - dialogSize.width * layout.dialogScale) / 2 + layout.dialogOffsetX,
        layout.dialogBaseY + (layout.dialogBaseHeight - dialogSize.height * layout.dialogScale) / 2 + layout.dialogOffsetY
    );

    var content = dialog.contentNode;
    var contentWidth = dialog.rightEdge - dialog.leftEdge;
    var viewHeight = Math.max(layout.minViewHeight, content.getContentSize().height - layout.viewHeightPaddingBottom);
    var roleTextWidth = Math.max(layout.roleTextMinWidth, contentWidth - layout.roleTextX - layout.roleTextRightPadding);
    var talentTextWidth = Math.max(layout.talentTextMinWidth, contentWidth - layout.talentTextX - layout.talentTextRightPadding);

    var roleSectionTitle = new cc.LabelTTF("当前人物", uiUtil.fontFamily.normal, layout.sectionTitleFontSize);
    var roleAvatarBg = uiUtil.getSpriteByNameSafe("role_bg.png", "icon_iap_info.png");
    fitSpriteToSize(roleAvatarBg, layout.roleAvatarBgSize, layout.roleAvatarBgSize);
    var roleAvatarFallback = role.getAvatarFallbackByRoleType(currentRoleType);
    var roleAvatar = uiUtil.getCharacterPortraitSpriteByRoleType(currentRoleType, roleAvatarFallback);
    fitSpriteToSize(roleAvatar, roleAvatarBg.width * layout.roleAvatarScaleRatio, roleAvatarBg.height * layout.roleAvatarScaleRatio);

    var roleNameLabel = new cc.LabelTTF(roleName || "未知角色", uiUtil.fontFamily.normal, layout.infoTitleFontSize, cc.size(roleTextWidth, 0), cc.TEXT_ALIGNMENT_LEFT);
    var roleDesLabel = new cc.LabelTTF(roleDes || "暂无人物描述", uiUtil.fontFamily.normal, layout.infoBodyFontSize, cc.size(roleTextWidth, 0), cc.TEXT_ALIGNMENT_LEFT);
    var roleEffectLabel = new cc.LabelTTF(roleEffect ? ("人物特性：" + roleEffect) : "人物特性：无", uiUtil.fontFamily.normal, layout.infoBodyFontSize, cc.size(roleTextWidth, 0), cc.TEXT_ALIGNMENT_LEFT);
    var rolePanelHeight = Math.max(layout.rolePanelMinHeight, roleNameLabel.height + roleDesLabel.height + roleEffectLabel.height + layout.rolePanelExtraHeight);

    var talentSectionTitle = new cc.LabelTTF("当前天赋", uiUtil.fontFamily.normal, layout.sectionTitleFontSize);
    var chosenTalentIds = TalentService.getChosenTalentPurchaseIds();
    var noTalentLabel = null;
    var talentRows = [];
    if (chosenTalentIds.length === 0) {
        noTalentLabel = new cc.LabelTTF("当前未选择天赋", uiUtil.fontFamily.normal, layout.infoBodyFontSize, cc.size(contentWidth, 0), cc.TEXT_ALIGNMENT_LEFT);
    } else {
        chosenTalentIds.forEach(function (purchaseId) {
            var talentCfg = stringUtil.getString("p_" + purchaseId) || {};
            var baseTalentName = talentCfg.name || ("天赋ID " + purchaseId);
            var talentLevel = Medal.getTalentLevel ? Medal.getTalentLevel(purchaseId) : 0;
            var levelText = talentLevel > 0 ? " Lv." + talentLevel : "";
            var talentName = baseTalentName + levelText;

            var talentDes = "";
            if (talentLevel > 0
                && typeof TalentService !== "undefined"
                && TalentService
                && typeof TalentService.getTalentTierEffectTextList === "function") {
                var tierEffectTextList = TalentService.getTalentTierEffectTextList(purchaseId);
                talentDes = tierEffectTextList[talentLevel - 1] || "";
            }
            if (!talentDes) {
                talentDes = talentCfg.effect || talentCfg.des || "暂无天赋描述";
            }
            talentDes = formatMultiline(talentDes);

            var nameLabel = new cc.LabelTTF(talentName, uiUtil.fontFamily.normal, layout.infoTitleFontSize, cc.size(talentTextWidth, 0), cc.TEXT_ALIGNMENT_LEFT);
            var desLabel = new cc.LabelTTF(talentDes, uiUtil.fontFamily.normal, layout.infoBodyFontSize, cc.size(talentTextWidth, 0), cc.TEXT_ALIGNMENT_LEFT);
            var rowHeight = Math.max(layout.talentRowMinHeight, nameLabel.height + desLabel.height + 18);
            talentRows.push({
                purchaseId: purchaseId,
                nameLabel: nameLabel,
                desLabel: desLabel,
                rowHeight: rowHeight
            });
        });
    }

    var talentBlockHeight = 0;
    if (noTalentLabel) {
        talentBlockHeight = noTalentLabel.height;
    } else {
        talentRows.forEach(function (row) {
            talentBlockHeight += row.rowHeight;
        });
        if (talentRows.length > 1) {
            talentBlockHeight += layout.rowGap * (talentRows.length - 1);
        }
    }

    var totalHeight = layout.topPadding
        + roleSectionTitle.height + layout.sectionGap + rolePanelHeight
        + layout.blockGap
        + talentSectionTitle.height + layout.sectionGap + talentBlockHeight
        + layout.bottomPadding;
    totalHeight = Math.max(viewHeight, totalHeight);

    var container = new cc.Layer();
    var scrollView = new cc.ScrollView(cc.size(contentWidth, viewHeight), container);
    scrollView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
    scrollView.setBounceable(false);
    scrollView.setClippingToBounds(true);
    scrollView.setAnchorPoint(0, 0);
    scrollView.x = dialog.leftEdge;
    scrollView.y = layout.scrollViewY;
    content.addChild(scrollView);
    scrollView.setContentSize(contentWidth, totalHeight);

    var cursorY = totalHeight - layout.topPadding;

    roleSectionTitle.setAnchorPoint(0, 1);
    roleSectionTitle.setPosition(0, cursorY);
    roleSectionTitle.setColor(UITheme.colors.TEXT_TITLE);
    container.addChild(roleSectionTitle);

    cursorY = roleSectionTitle.y - roleSectionTitle.height - layout.sectionGap;

    var rolePanel = new cc.Node();
    rolePanel.setAnchorPoint(0, 1);
    rolePanel.setPosition(0, cursorY);
    rolePanel.setContentSize(contentWidth, rolePanelHeight);
    container.addChild(rolePanel);

    var rolePanelBg = new cc.LayerColor();
    rolePanelBg.setColor(cc.color(255, 255, 255));
    rolePanelBg.setOpacity(layout.panelBgOpacity);
    rolePanelBg.setContentSize(rolePanel.getContentSize());
    rolePanel.addChild(rolePanelBg);

    roleAvatarBg.setAnchorPoint(0.5, 0.5);
    roleAvatarBg.setPosition(layout.roleAvatarCenterX, rolePanelHeight / 2);
    rolePanel.addChild(roleAvatarBg);

    roleAvatar.setPosition(roleAvatarBg.width / 2, roleAvatarBg.height / 2);
    roleAvatarBg.addChild(roleAvatar);

    roleNameLabel.setAnchorPoint(0, 1);
    roleNameLabel.setPosition(layout.roleTextX, rolePanelHeight - layout.roleNameTopPadding);
    roleNameLabel.setColor(UITheme.colors.TEXT_TITLE);
    rolePanel.addChild(roleNameLabel);

    roleDesLabel.setAnchorPoint(0, 1);
    roleDesLabel.setPosition(layout.roleTextX, roleNameLabel.y - roleNameLabel.height - layout.textBlockGap);
    roleDesLabel.setColor(UITheme.colors.TEXT_TITLE);
    rolePanel.addChild(roleDesLabel);

    roleEffectLabel.setAnchorPoint(0, 1);
    roleEffectLabel.setPosition(layout.roleTextX, roleDesLabel.y - roleDesLabel.height - layout.textBlockGap);
    roleEffectLabel.setColor(cc.color(36, 82, 36));
    rolePanel.addChild(roleEffectLabel);

    cursorY = rolePanel.y - rolePanelHeight - layout.blockGap;

    talentSectionTitle.setAnchorPoint(0, 1);
    talentSectionTitle.setPosition(0, cursorY);
    talentSectionTitle.setColor(UITheme.colors.TEXT_TITLE);
    container.addChild(talentSectionTitle);

    cursorY = talentSectionTitle.y - talentSectionTitle.height - layout.sectionGap;

    if (noTalentLabel) {
        noTalentLabel.setAnchorPoint(0, 1);
        noTalentLabel.setPosition(0, cursorY);
        noTalentLabel.setColor(UITheme.colors.TEXT_TITLE);
        container.addChild(noTalentLabel);
    } else {
        talentRows.forEach(function (rowData) {
            var row = new cc.Node();
            row.setAnchorPoint(0, 1);
            row.setPosition(0, cursorY);
            row.setContentSize(contentWidth, rowData.rowHeight);
            container.addChild(row);

            var rowBg = new cc.LayerColor();
            rowBg.setColor(cc.color(255, 255, 255));
            rowBg.setOpacity(layout.rowBgOpacity);
            rowBg.setContentSize(row.getContentSize());
            row.addChild(rowBg);

            var talentIcon = uiUtil.getSpriteByNameSafe("icon_iap_" + rowData.purchaseId + ".png", "icon_iap_101.png");
            fitSpriteToSize(talentIcon, layout.talentIconSize, layout.talentIconSize);
            talentIcon.setPosition(layout.talentIconX, rowData.rowHeight / 2);
            row.addChild(talentIcon);

            rowData.nameLabel.setAnchorPoint(0, 1);
            rowData.nameLabel.setPosition(layout.talentTextX, rowData.rowHeight - layout.talentNameTopPadding);
            rowData.nameLabel.setColor(UITheme.colors.TEXT_TITLE);
            row.addChild(rowData.nameLabel);

            rowData.desLabel.setAnchorPoint(0, 1);
            rowData.desLabel.setPosition(layout.talentTextX, rowData.nameLabel.y - rowData.nameLabel.height - layout.textBlockGap);
            rowData.desLabel.setColor(UITheme.colors.TEXT_TITLE);
            row.addChild(rowData.desLabel);

            cursorY = row.y - rowData.rowHeight - layout.rowGap;
        });
    }

    var scrollOffset = scrollView.getContentOffset();
    scrollOffset.y = scrollView.getViewSize().height - totalHeight;
    scrollView.setContentOffset(scrollOffset);

    pauseTimeWhileDialogVisible(dialog);
    dialog.show();
};

var showAttrStatusDialog = function (stringId, attr) {
    var config = utils.clone(stringUtil.getString("statusDialog"));
    var strConfig = stringUtil.getString(stringId);
    config.title.icon = "#icon_" + attr + "_0.png";
    config.title.title = strConfig.title;
    var attrWithMaxValue = {
        hp: true,
        spirit: true,
        vigour: true,
        starve: true,
        infect: true,
        injury: true
    };
    if (attrWithMaxValue[attr]) {
        config.title.txt_1 = cc.formatStr(config.title.txt_1, memoryUtil.decode(player[attr]) + "/" + memoryUtil.decode(player[attr + "Max"]));
    } else {
        config.title.txt_1 = player.getAttrStr(attr);
    }
    config.content.des = strConfig.des;
    var dialog = new DialogSmall(config);
    dialog.autoDismiss = false;

    var des = dialog.contentNode.getChildByName('des');

    var buffEffect = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(dialog.rightEdge - dialog.leftEdge, 0));
    buffEffect.anchorX = 0;
    buffEffect.anchorY = 1;
    buffEffect.x = dialog.leftEdge;
    buffEffect.y = des.y - des.height - 10;
    dialog.contentNode.addChild(buffEffect);
    buffEffect.setColor(cc.color(0, 162, 53));
    buffEffect.setVisible(false);

    var buffLastTime = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(dialog.rightEdge - dialog.leftEdge, 0));
    buffLastTime.anchorX = 0;
    buffLastTime.anchorY = 1;
    buffLastTime.x = dialog.leftEdge;
    dialog.contentNode.addChild(buffLastTime);
    buffLastTime.setColor(cc.color(0, 162, 53));
    buffLastTime.setVisible(false);

    var updateBuff = function () {
        if ((attr === 'hp' && player.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107012))
            || (attr === 'infect' && player.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107022))
            || (attr === 'vigour' && player.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107032))
            || (attr === 'starve' && player.buffManager.isBuffEffect(BuffItemEffectType.ITEM_1107042))) {
            buffEffect.setVisible(true);
            buffLastTime.setVisible(true);

            var buff = player.buffManager.getBuff();
            buffEffect.setString(stringUtil.getString(1296, stringUtil.getString(buff.itemId).title) + stringUtil.getString('b_' + buff.itemId));
            buffLastTime.setString(stringUtil.getString(1297) + utils.getBuffTimeStr(buff.lastTime));
            buffLastTime.y = buffEffect.y - buffEffect.height - 6;
        } else {
            buffEffect.setVisible(false);
            buffLastTime.setVisible(false);
        }
    };

    updateBuff();

    var storage;
    if (player.isAtHome()) {
        storage = player.storage;
    } else {
        if (player.tmpBag) {
            storage = player.tmpBag;
        } else {
            storage = player.bag;
        }
    }

    //fix bug: NPC交易时快捷使用物品带来的不正确
    if (!player.tmpBag) {
        var itemList = [];
        if (attr === 'starve') {
            itemList = storage.getItemsByType("1103");
            var a = storage.getItemsByType("1107042");
            itemList = itemList.concat(a)
            //itemList.sort(function (a, b) {
            //    var aConfig = itemConfig[a.item.id];
            //    var bConfig = itemConfig[b.item.id];
            //    return aConfig.effect_food.starve < bConfig.effect_food.starve;
            //});
        } else if (attr === 'infect') {
            itemList = storage.getItemsByType("1104");
            itemList = itemList.filter(function (storageCell) {
                return storageCell.item.id != '1104011';
            });
            var a = storage.getItemsByType("1107022");
            itemList = itemList.concat(a)
        } else if (attr === 'injury') {
            itemList = storage.getItemsByType("1104");
            itemList = itemList.filter(function (storageCell) {
                return storageCell.item.id == '1104011';
            });
        } else if (attr === 'vigour') {
            var a = storage.getItemsByType("1107032");
            itemList = itemList.concat(a)
        } else if (attr === 'hp') {
            var a = storage.getItemsByType("1107012");
            itemList = itemList.concat(a)
        }

        var itemTableView = uiUtil.createItemListSliders(itemList);
        itemTableView.x = 20;
        itemTableView.y = 2;
        dialog.contentNode.addChild(itemTableView);

        var onItemUse = function (itemId, source) {
            if (source !== 'top')
                return;
            var res = player.useItem(storage, itemId);
            if (res.result) {
                itemTableView.updateData();
                itemTableView.reloadData();
                Record.saveAll();
            } else {
                cc.e("useItem fail " + res.msg);
            }
        };

        utils.emitter.on("btn_1_click", onItemUse);
        dialog.setOnDismissListener({
            target: dialog, cb: function () {
                utils.emitter.off('btn_1_click', onItemUse);
            }
        });
    }

    pauseTimeWhileDialogVisible(dialog);
    dialog.show();
};
