/**
 * Created by lancelot on 15/4/17.
 */

var getHomeRuntimePlayer = function () {
    return GameRuntime.getPlayer();
};
var getHomeRuntimeEmitter = function () {
    return GameRuntime.getEmitter();
};

var isHomeWorkSitePowered = function () {
    var runtimePlayer = getHomeRuntimePlayer();
    if (!runtimePlayer || !runtimePlayer.map || typeof runtimePlayer.map.getSite !== "function") {
        return false;
    }
    var workSiteId = (typeof WORK_SITE !== "undefined") ? WORK_SITE : 204;
    var workSite = runtimePlayer.map.getSite(workSiteId);
    return !!(workSite && workSite.isActive);
};
var canShowHomePowerStatus = function () {
    var runtimePlayer = getHomeRuntimePlayer();
    if (!runtimePlayer) {
        return false;
    }
    if (typeof RoleRuntimeService === "undefined"
        || !RoleRuntimeService
        || typeof RoleRuntimeService.getActionTags !== "function") {
        return false;
    }
    var roleTags = RoleRuntimeService.getActionTags(runtimePlayer.roleType);
    return Array.isArray(roleTags) && roleTags.indexOf("powered") !== -1;
};

var HomeNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);
        var runtimePlayer = getHomeRuntimePlayer();

        if (userData) {
            //从外面回家
            this.flushBag();
            //删除无用的副本
            runtimePlayer.map.deleteUnusableSite();
        }

        runtimePlayer.goHome();

        var homeBg = autoSpriteFrameController.getSpriteFromSpriteName("#home_bg.png");
        homeBg.setAnchorPoint(0.5, 0);
        homeBg.setPosition(this.bgRect.width / 2, 0);
        this.bg.addChild(homeBg, 2);

        //840
        var infos = [
            {bid: 1, pos: {x: 70, y: 352}},
            {bid: 2, pos: {x: 412, y: 780}},
            {bid: 3, pos: {x: 230, y: 530}},
            {bid: 4, pos: {x: 477, y: 562}},
            {bid: 6, pos: {x: 165, y: 224}},
            {bid: 8, pos: {x: 112, y: 780}},
            {bid: 9, pos: {x: 80, y: 590}},
            {bid: 10, pos: {x: 468, y: 398}},
            {bid: 13, pos: {x: 125, y: 52}},
            {bid: 14, pos: {x: 425, y: 216}},
            {bid: 15, pos: {x: 270, y: 656}}
        ];
        var roleBuildPositions = [
            {x: 503, y: 657},
            {x: 430, y: 82},
            {x: 310, y: 318}
        ];
        var roleRoomBuildStates = (typeof RoleRuntimeService !== "undefined"
            && RoleRuntimeService
            && typeof RoleRuntimeService.getRoomBuildStates === "function")
            ? RoleRuntimeService.getRoomBuildStates(runtimePlayer.roleType)
            : [];
        roleRoomBuildStates.forEach(function (buildState, index) {
            if (roleBuildPositions[index]) {
                infos.push({bid: buildState.id, pos: roleBuildPositions[index]});
            }
        });
        if (roleRoomBuildStates.length === 0) {
            infos.push({bid: 7, pos: roleBuildPositions[0]});
            infos.push({bid: 11, pos: roleBuildPositions[1]});
            infos.push({bid: 5, pos: roleBuildPositions[2]});
        }
        //由于图层问题,狗舍一定最后加入
        infos.push({bid: 12, pos: {x: 349, y: 110}});

        this.btnList = {};

        var self = this;
        infos.forEach(function (info) {
            var build = runtimePlayer.room && typeof runtimePlayer.room.getBuild === "function"
                ? runtimePlayer.room.getBuild(info.bid)
                : null;
            var buildLevel = build ? build.level : -1;
            buildLevel = Math.max(0, buildLevel);
            var btn = new ButtonAtHome("#icon_start_build_" + info.bid + "_" + buildLevel + ".png");
            btn.setClickListener(self, self.onClickBuild);
            btn.setPosition(info.pos);
            homeBg.addChild(btn);
            btn.info = info;

            self.btnList[info.bid] = btn;

            self.updateBtn(info.bid);
        });


        getHomeRuntimeEmitter().on("placed_success", function (bid) {
            self.updateBtn(bid);
        });

        if (!runtimePlayer.getSetting("initLog", false)) {
            runtimePlayer.setSetting("initLog", true);
            runtimePlayer.log.addMsg(1168);
        }

        //为大门加入发光
        var gateBtn = this.btnList[14];
        var gateLight = autoSpriteFrameController.getSpriteFromSpriteName('gate_light.png');
        gateLight.x = gateBtn.width / 2;
        gateLight.y = gateBtn.height / 2;
        gateBtn.addChild(gateLight);
        gateLight.runAction(cc.repeatForever((cc.sequence(cc.fadeOut(2), cc.fadeIn(2)))));

        this.btnRadioChat = uiUtil.createSpriteBtn({normal: "btn_contact.png"}, this, function () {
            self.forward(Navigation.nodeName.RADIO_NODE, {bid: 15});
        });
        this.btnRadioChat.setPosition(this.bgRect.width / 2, 78);
        this.bg.addChild(this.btnRadioChat, 3);
        this.btnRadioChat.setName("btn_radio_chat");

        this.btnRadioChatLabel = new cc.LabelTTF(stringUtil.getString(1148), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_4);
        this.btnRadioChatLabel.setColor(UITheme.colors.TEXT_TITLE);
        this.btnRadioChatLabel.setPosition(this.bgRect.width / 2, 26);
        this.bg.addChild(this.btnRadioChatLabel, 3);
        this.btnRadioChatLabel.setName("btn_radio_chat_label");

        this.updateRadioChatEntry();

        this.createPowerStatusHint();

    },
    updateRadioChatEntry: function () {
        var runtimePlayer = getHomeRuntimePlayer();
        var radioBuild = runtimePlayer.room && typeof runtimePlayer.room.getBuild === "function"
            ? runtimePlayer.room.getBuild(15)
            : null;
        var isVisible = !!(radioBuild && radioBuild.level >= 0);
        if (this.btnRadioChat) {
            this.btnRadioChat.setVisible(isVisible);
        }
        if (this.btnRadioChatLabel) {
            this.btnRadioChatLabel.setVisible(isVisible);
        }
    },
    createFuncOnWorkSiteChange: function () {
        var self = this;
        return function () {
            self.refreshPowerStatusHint();
        };
    },
    createPowerStatusHint: function () {
        if (!this.bg || this.bg.getChildByName("power_status_hint")) {
            return;
        }
        var powerHint = uiUtil.createLabel(
            stringUtil.getString("worksite_power_active") || "已通电",
            "caption",
            {
                anchorX: 1,
                anchorY: 1,
                color: cc.color(255, 238, 170, 255)
            }
        );
        powerHint.setPosition(this.bgRect.width - 24, this.bgRect.height - 20);
        powerHint.setName("power_status_hint");
        powerHint.setVisible(false);
        this.bg.addChild(powerHint, 4);
    },
    refreshPowerStatusHint: function () {
        var powerHint = this.bg ? this.bg.getChildByName("power_status_hint") : null;
        if (!powerHint) {
            return;
        }
        if (!canShowHomePowerStatus()) {
            powerHint.setVisible(false);
            return;
        }
        var isPowered = isHomeWorkSitePowered();
        powerHint.setString(
            stringUtil.getString(isPowered ? "worksite_power_active" : "worksite_power_inactive")
            || (isPowered ? "宸查€氱數" : "已停电")
        );
        powerHint.setVisible(true);
    },
    updateBtn: function (bid) {
        var btn = this.btnList[bid];
        var runtimePlayer = getHomeRuntimePlayer();
        var build = runtimePlayer.room && typeof runtimePlayer.room.getBuild === "function"
            ? runtimePlayer.room.getBuild(bid)
            : null;
        if (!btn || !build) {
            return;
        }
        if (build.level >= 0) {
            btn.changeType(ButtonAtHomeType.WHITE);
        } else {
            btn.changeType(ButtonAtHomeType.BLACK);
        }

        uiUtil.removeIconWarn(btn);

        if (bid === 1 && userGuide.isStep(userGuide.stepName.HOME_TOOL)) {
            uiUtil.createIconWarn(btn);
        } else if (bid === 14 && (userGuide.isStep(userGuide.stepName.HOME_GATE) || userGuide.isStep(userGuide.stepName.HOME_GATE_AGAIN))) {
            uiUtil.createIconWarn(btn);
        } else if (bid === 13 && userGuide.isStep(userGuide.stepName.HOME_STORAGE)) {
            uiUtil.createIconWarn(btn);
        } else if (bid === 9 && userGuide.isStep(userGuide.stepName.HOME_SLEEP)) {
            uiUtil.createIconWarn(btn);
        }

        uiUtil.createBuildWarn(btn, bid);
        if (bid === 15) {
            this.updateRadioChatEntry();
        }
    },
    onClickBuild: function (sender) {
        var bid = sender.info.bid;

        if (bid === 1 && userGuide.isStep(userGuide.stepName.HOME_TOOL)) {
            userGuide.step();
        } else if (bid === 14 && (userGuide.isStep(userGuide.stepName.HOME_GATE) || userGuide.isStep(userGuide.stepName.HOME_GATE_AGAIN))) {
            userGuide.step();
        } else if (bid === 13 && userGuide.isStep(userGuide.stepName.HOME_STORAGE)) {
            userGuide.step();
        } else if (bid === 9 && userGuide.isStep(userGuide.stepName.HOME_SLEEP)) {
            userGuide.step();
        }
        switch (bid) {
            case 13:
                this.forward(Navigation.nodeName.STORAGE_NODE, sender.info);
                break;
            case 14:
                var runtimePlayer = getHomeRuntimePlayer();
                var gateBuild = runtimePlayer.room && typeof runtimePlayer.room.getBuild === "function"
                    ? runtimePlayer.room.getBuild(bid)
                    : null;
                if (gateBuild && gateBuild.level >= 0) {
                    this.forward(Navigation.nodeName.GATE_NODE, sender.info);
                }
                break;
            case 15:
                this.forward(Navigation.nodeName.BUILD_NODE, sender.info);
                break;
            default:
                this.forward(Navigation.nodeName.BUILD_NODE, sender.info);
        }
    },
    _init: function () {
        this.setName(Navigation.nodeName.HOME_NODE);
        this.uiConfig = {
            title: stringUtil.getString("site_100").name,
            leftBtn: false,
            rightBtn: false
        };
    },
    onClickLeftBtn: function () {
        this.forward(Navigation.nodeName.BOTTOM_FRAME_NODE);
    },
    onClickRightBtn: function () {
    },
    flushBag: function () {
        var runtimePlayer = getHomeRuntimePlayer();
        runtimePlayer.bag.forEach(function (item, num) {
            if (!runtimePlayer.equip.isEquiped(item.id) && item.id != BattleConfig.BULLET_ID) {
                runtimePlayer.storage.increaseItem(item.id, num);
                runtimePlayer.bag.decreaseItem(item.id, num);
            }
        });
    },
    onExit: function () {
        this._super();
        getHomeRuntimeEmitter().off("placed_success");
        if (this.funcOnWorkSiteChange) {
            getHomeRuntimeEmitter().off("onWorkSiteChange", this.funcOnWorkSiteChange);
            this.funcOnWorkSiteChange = null;
        }
    },
    onEnter: function () {
        var self = this;
        this._super();
        this.updateDogHouse();
        this.refreshPowerStatusHint();
        this.funcOnWorkSiteChange = this.createFuncOnWorkSiteChange();
        getHomeRuntimeEmitter().on("onWorkSiteChange", this.funcOnWorkSiteChange);
        //新手引导文字
        this.scheduleOnce(function () {
            if (userGuide.isStep(userGuide.stepName.GAME_START)) {
                uiUtil.showGuideDialog(stringUtil.getString(1237), "#guide_pic_1.png", self);
            } else if (userGuide.isStep(userGuide.stepName.BACK_HOME_WARN)) {
                uiUtil.showGuideDialog(stringUtil.getString(1238), "#guide_pic_2.png", self, true);
            } else if (userGuide.isStep(userGuide.stepName.WAKE_UP_WARN)) {
                uiUtil.showGuideDialog(stringUtil.getString(1239), "#guide_pic_1.png", self);
            }
        }, 0.1);

    },
    initRes: function () {
        //cc.spriteFrameCache.removeSpriteFramesFromFile("res/gate.plist");
        //cc.spriteFrameCache.removeSpriteFramesFromFile("res/map.plist");
        //cc.spriteFrameCache.removeSpriteFramesFromFile("res/site.plist");


    },
    releaseRes: function () {

    },
    updateDogHouse: function () {
        var bid = 12;
        var btn = this.btnList[bid];
        var self = this;
        if (!PurchaseUiHelper.isPurchaseUnlocked(107)) {
            btn.setEnabled(false);
            var lockNode = PurchaseUiHelper.createLockNode(btn.getContentSize(), 107, function (result) {
                if (!result || !result.isSuccess) {
                    PurchaseUiHelper.showPurchaseFailedTip(result);
                    return;
                }
                var runtimePlayer = getHomeRuntimePlayer();
                if (runtimePlayer.room && runtimePlayer.room.isBuildExist(12, 0)) {
                    uiUtil.removeIconWarn(btn, 'buildWarn');
                    self.updateBtn(12);
                }
                self.updateDogHouse();
            }, true);
            lockNode.x = btn.width / 2;
            lockNode.y = btn.height / 2;
            btn.addChild(lockNode);
            lockNode.setName("lock");
        } else {
            btn.setEnabled(true);
            btn.removeChildByName("lock");
        }
    }
});
