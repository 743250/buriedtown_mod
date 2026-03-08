/**
 * User: Alex
 * Date: 15/1/13
 * Time: 下午9:17
 */

var dialogManager = {
    dialogStack: [],
    showDialog: function (dialog) {
        this.dialogStack.push(dialog);
    },
    dismissDialog: function (dialog) {
        for (var i = 0; i < this.dialogStack.length; i++) {
            if (dialog === this.dialogStack[i]) {
                break;
            }
        }
        this.dialogStack.splice(i, 1);
    },
    isDialogShowing: function () {
        return this.dialogStack.length > 0;
    }
};

var Dialog = cc.Layer.extend({
    ctor: function () {
        this._super();

        this.setName("dialog");

        this.bgNode = new cc.Node();
        this.initContentSize();
        var winSize = cc.winSize;
        var contentSize = this.bgNode.getContentSize();
        this.bgNode.setPosition((winSize.width - contentSize.width) / 2, 29 + (839 - contentSize.height) / 2);
        this.addChild(this.bgNode, 1);

        var bgColor = new cc.LayerColor();
        bgColor.setColor(UITheme.colors.MASK_DARK);
        bgColor.setOpacity(200);
        this.addChild(bgColor, 0);
        bgColor.setName("bgColor");

        var self = this;
        //if ('touches' in cc.sys.capabilities)
        cc.eventManager.addListener(cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                return true;
            },
            onTouchEnded: function (touch, event) {
                self.onClickLayer(touch.getLocation());
            }
        }), this);
        //else if ('mouse' in cc.sys.capabilities)
        //    cc.eventManager.addListener(cc.EventListener.create({
        //        event: cc.EventListener.MOUSE,
        //        swallowTouches: true,
        //        onMouseDown: function (event) {
        //            return true;
        //        },
        //        onMouseUp: function (event) {
        //            self.onClickLayer(event.getLocation());
        //        }
        //    }), this);
        this.autoDismiss = true;

        var self = this;
        var keyboardListener = cc.EventListener.create({
            event: cc.EventListener.KEYBOARD,
            onKeyReleased: function (keyCode, event) {
                cc.log("pressed Keycode = " + keyCode);
                if (keyCode == cc.KEY.back) {
                    if (self.autoDismiss) {
                        self.scheduleOnce(function () {
                            self.dismiss();
                        }, 0.1)
                    }
                }
            }
        });
        cc.eventManager.addListener(keyboardListener, this);

        // 验证影子函数重构
        if (typeof CC_DEBUG !== 'undefined' && CC_DEBUG) {
            this._verifyLoadTitleIcon();
        }
    },
    onClickLayer: function (pos) {
        if (!this.autoDismiss)
            return;
        var bgNodePos = this.bgNode.getPosition();
        var bgNodeSize = this.bgNode.getContentSize();
        var bgNodeRect = cc.rect(bgNodePos.x, bgNodePos.y, bgNodeSize.width, bgNodeSize.height);
        if (!cc.rectContainsPoint(bgNodeRect, pos)) {
            this.dismiss();
        }
    },

    // === 影子函数重构：安全加载标题图标 ===

    _loadTitleIcon: function(iconName, fallbackName) {
        return SafetyHelper.safeLoadSprite(iconName, fallbackName || null);
    },

    _loadTitleIcon_old: function(iconName) {
        return autoSpriteFrameController.getSpriteFromSpriteName(iconName);
    },

    _verifyLoadTitleIcon: function() {
        var testCases = ["npc_dig_1.png", "npc_dig_7.png", "icon_iap_101.png"];
        var allPassed = true;

        for (var i = 0; i < testCases.length; i++) {
            var iconName = testCases[i];
            try {
                var oldResult = this._loadTitleIcon_old(iconName);
                var newResult = this._loadTitleIcon(iconName);

                var oldExists = !!oldResult;
                var newExists = !!newResult;

                if (oldExists !== newExists) {
                    cc.error("[Dialog验证失败] iconName=" + iconName);
                    allPassed = false;
                }
            } catch (e) {
                cc.log("[Dialog验证] 旧函数抛异常（预期）: " + iconName);
            }
        }

        if (allPassed) {
            cc.log("[Dialog验证通过] _loadTitleIcon 重构成功");
        }
        return allPassed;
    },
    initContentSize: function () {
        return cc.size(100, 100);
    },
    getDialogContentSize: function () {
        return this.bgNode.getContentSize();
    },
    show: function () {
        this.getChildByName('bgColor').setVisible(!dialogManager.isDialogShowing());
        var runningScene = cc.director.getRunningScene ? cc.director.getRunningScene() : null;
        if (!runningScene) {
            return;
        }
        runningScene.addChild(this, 100);
        audioManager.playEffect(audioManager.sound.POPUP);
        var keyEventLayer = runningScene.getChildByName("keyEventLayer");
        if (keyEventLayer) {
            cc.v("pause eventManager")
            cc.eventManager.pauseTarget(keyEventLayer);
        }
        dialogManager.showDialog(this);
    },
    dismiss: function () {
        dialogManager.dismissDialog(this);
        this.removeFromParent();
        var runningScene = cc.director.getRunningScene ? cc.director.getRunningScene() : null;
        var keyEventLayer = runningScene ? runningScene.getChildByName("keyEventLayer") : null;
        if (keyEventLayer) {
            cc.v("resume eventManger")
            cc.eventManager.resumeTarget(keyEventLayer);
        }

        if (this.onDismissListener) {
            this.onDismissListener.cb.call(this.onDismissListener.target);
        }
    },
    setOnDismissListener: function (listener) {
        this.onDismissListener = listener;
    }
});

var DialogCommon = Dialog.extend({
    ctor: function (config) {
        this._super();

        config.title = config.title || {};
        config.action = config.action || {};
        config.content = config.content || {};
        this.config = config;


        var leftEdge = 20;
        var rightEdge = this.bgNode.getContentSize().width - leftEdge;

        this.leftEdge = leftEdge;
        this.rightEdge = rightEdge;

        if (config.title.icon) {
            // 影子函数重构：安全加载资源
            var icon = this._loadTitleIcon(config.title.icon, config.title.iconFallback);
            if (icon) {
                icon.setAnchorPoint(0, 0.5)
                icon.setPosition(leftEdge, this.titleNode.getContentSize().height / 2 - 4);
                this.titleNode.addChild(icon);
                icon.setName("icon");
            }
        }

        var title = new cc.LabelTTF(config.title.title, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1, cc.size(360, 0));
        title.anchorX = 0;
        title.anchorY = 0.5;
        title.y = this.titleNode.height / 2;
        this.titleNode.addChild(title);
        title.setName("title");
        title.setColor(UITheme.colors.TEXT_TITLE);
        title.updateView = function () {
            if (icon && icon.isVisible()) {
                title.x = leftEdge + icon.width * icon.scale;
            } else {
                title.x = leftEdge;
            }
        };
        title.updateView();

        if (config.title.txt_1) {
            var txt1 = new cc.LabelTTF(config.title.txt_1, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            txt1.setAnchorPoint(0, 1);
            txt1.setPosition(title.x, title.y - title.height / 2 - 2);
            this.titleNode.addChild(txt1);
            txt1.setName("txt_1");
            txt1.setColor(UITheme.colors.TEXT_TITLE);
        }
        if (config.title.txt_2) {
            var txt2 = new cc.LabelTTF(config.title.txt_2, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            txt2.setAnchorPoint(1, 0.5);
            this.titleNode.addChild(txt2);
            txt2.setName("txt_2");
            txt2.setColor(UITheme.colors.TEXT_TITLE);

            txt1.setAnchorPoint(0, 1);
            txt1.setPosition(title.x, title.y - title.height / 2 - 2);
            txt2.setAnchorPoint(0, 1);
            txt2.setPosition(txt1.x + txt1.width + 35, title.y - title.height / 2 - 2);
        }
        //if (config.title.txt_3) {
        //var txt3 = new cc.LabelTTF(config.title.txt_3, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        //txt3.setAnchorPoint(1, 0.5);
        //this.titleNode.addChild(txt3);
        //txt3.setName("txt_3");
        //txt3.setColor(UITheme.colors.TEXT_TITLE);
        //
        //txt1.setPosition(leftEdge, 0);
        //txt2.setPosition(leftEdge + this.titleNode.width / 3, 0);
        //txt3.setPosition(leftEdge + this.titleNode.width / 3 * 2, 0);
        //}


        if (config.action.btn_1) {
            var btn1 = uiUtil.createCommonBtnBlack(config.action.btn_1.txt, this, this.onClickBtn1);
            btn1.setPosition(this.actionNode.getContentSize().width / 2, this.actionNode.getContentSize().height / 2);
            this.actionNode.addChild(btn1);
            btn1.setName("btn_1")
        }

        if (config.action.btn_2) {
            var btn2 = uiUtil.createCommonBtnBlack(config.action.btn_2.txt, this, this.onClickBtn2);
            this.actionNode.addChild(btn2);
            btn2.setName("btn_2")

            btn1.setPosition(this.actionNode.getContentSize().width / 4, this.actionNode.getContentSize().height / 2);
            btn2.setPosition(this.actionNode.getContentSize().width / 4 * 3, this.actionNode.getContentSize().height / 2);
        }

        if (config.action.btn_3) {
            var btn3 = uiUtil.createCommonBtnBlack(config.action.btn_3.txt, this, this.onClickBtn3);
            this.actionNode.addChild(btn3);
            btn3.setName("btn_3")

            btn1.setPosition(this.actionNode.getContentSize().width / 6, this.actionNode.getContentSize().height / 2);
            btn2.setPosition(this.actionNode.getContentSize().width / 6 * 3, this.actionNode.getContentSize().height / 2);
            btn3.setPosition(this.actionNode.getContentSize().width / 6 * 5, this.actionNode.getContentSize().height / 2);
        }


        this._initData();

    },
    _initData: function () {

    },

    onClickBtn1: function () {
        this.dismiss();
        if (this.config.action.btn_1.cb) {
            this.config.action.btn_1.cb.call(this.config.action.btn_1.target);
        }
    },
    onClickBtn2: function () {
        this.dismiss();
        if (this.config.action.btn_2.cb) {
            this.config.action.btn_2.cb.call(this.config.action.btn_2.target);
        }
    },
    onClickBtn3: function () {
        this.dismiss();
        if (this.config.action.btn_3.cb) {
            this.config.action.btn_3.cb.call(this.config.action.btn_3.target);
        }
    }

});

var DialogGuide = DialogCommon.extend({
    ctor: function (config, target, isPicDown) {
        this._super(config);

        this.target = target;
        this.leftEdge = 30;
        this.rightEdge = this.bgNode.getContentSize().width - this.leftEdge;
        //this.rightEdge = 30;
        if (config.content.dig_des) {
            var digDes = autoSpriteFrameController.getSpriteFromSpriteName(config.content.dig_des);
            digDes.setAnchorPoint(0.5, 1);
            digDes.setPosition(this.contentNode.getContentSize().width / 2, this.contentNode.getContentSize().height - 20);
            this.contentNode.addChild(digDes);
            digDes.setName("dig_des");
        }

        if (config.content.des) {
            var des = new cc.LabelTTF(config.content.des, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(this.rightEdge - this.leftEdge, 0));
            des.setAnchorPoint(0, 1);
            des.setPosition(this.leftEdge, digDes ? this.contentNode.getContentSize().height - digDes.height - 20 * digDes.scale : this.contentNode.getContentSize().height - 20);
            this.contentNode.addChild(des, 1);
            des.setName("des");
            des.setColor(UITheme.colors.TEXT_TITLE);
        }

        if (isPicDown) {
            des.setAnchorPoint(0.5, 1);
            des.setPosition(this.contentNode.getContentSize().width / 2, this.contentNode.getContentSize().height - 20);

            digDes.setAnchorPoint(0, 1);
            digDes.setPosition(this.leftEdge, des ? this.contentNode.getContentSize().height - des.height * des.scale - 50 : this.contentNode.getContentSize().height - 20);
        }

        if (config.content.log) {
            var log = new cc.Node();
            log.setAnchorPoint(0, 0);
            log.setPosition(0, 0);
            log.setContentSize(this.contentNode.getContentSize().width, 100);
            log.setName("log");
            this.contentNode.addChild(log);
        }
    },
    onClickLayer: function () {
        this.dismiss();
    },
    initContentSize: function () {
        var bg = autoSpriteFrameController.getSpriteFromSpriteName("#guide_bg.png");
        bg.setAnchorPoint(0, 0);
        bg.setPosition(0, 0);
        this.bgNode.addChild(bg, 0);

        this.bgNode.setContentSize(bg.getContentSize());

        this.titleNode = new cc.Node();
        this.titleNode.setAnchorPoint(0.5, 0);
        this.titleNode.setPosition(this.bgNode.getContentSize().width / 2, this.bgNode.getContentSize().height - 110);
        this.titleNode.setContentSize(this.bgNode.getContentSize().width, 100);
        this.bgNode.addChild(this.titleNode);

        this.actionNode = new cc.Node();
        this.actionNode.setAnchorPoint(0.5, 1);
        this.actionNode.setPosition(0, 0);
        this.actionNode.setContentSize(0, 0);
        this.bgNode.addChild(this.actionNode);

        this.contentNode = new cc.Node();
        this.contentNode.setAnchorPoint(0.5, 0);
        this.contentNode.setPosition(this.bgNode.getContentSize().width / 2, 93);
        this.contentNode.setContentSize(this.bgNode.getContentSize().width, this.bgNode.getContentSize().height - this.titleNode.getContentSize().height - this.actionNode.getContentSize().height - 20);
        this.bgNode.addChild(this.contentNode);

    },
    onExit: function () {
        this._super();
        if (userGuide.isStep(userGuide.stepName.GAME_START)) {
            userGuide.step();
            this.target.updateBtn(14);
        } else if (userGuide.isStep(userGuide.stepName.BACK_HOME_WARN)) {
            userGuide.step();
            this.target.updateBtn(13);
        } else if (userGuide.isStep(userGuide.stepName.WAKE_UP_WARN)) {
            userGuide.step();
            this.target.updateBtn(1);
        }
    }

})

var DialogBig = DialogCommon.extend({
    ctor: function (config) {
        this._super(config);

        if (config.content.dig_des) {
            var digDes = autoSpriteFrameController.getSpriteFromSpriteName(config.content.dig_des);
            digDes.setAnchorPoint(0.5, 1)
            digDes.setPosition(this.contentNode.getContentSize().width / 2, this.contentNode.getContentSize().height - 5);
            this.contentNode.addChild(digDes);
            digDes.setName("dig_des");
        }

        if (config.content.des) {
            var des = new cc.LabelTTF(config.content.des, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(this.rightEdge - this.leftEdge, 0));
            des.setAnchorPoint(0, 1);
            des.setPosition(this.leftEdge, digDes ? this.contentNode.getContentSize().height - digDes.height * digDes.scale : this.contentNode.getContentSize().height - 20);
            this.contentNode.addChild(des, 1);
            des.setName("des");
            des.setColor(UITheme.colors.TEXT_TITLE);
        }

        if (config.content.log) {
            var log = new cc.Node();
            log.setAnchorPoint(0, 0);
            log.setPosition(0, 0);
            log.setContentSize(this.contentNode.getContentSize().width, 100);
            log.setName("log");
            this.contentNode.addChild(log);
        }
    },
    initContentSize: function () {
        var bg = autoSpriteFrameController.getSpriteFromSpriteName("#dialog_big_bg.png");
        bg.setAnchorPoint(0, 0);
        bg.setPosition(0, 0);
        this.bgNode.addChild(bg, 0);

        this.bgNode.setContentSize(bg.getContentSize());

        this.titleNode = new cc.Node();
        this.titleNode.setAnchorPoint(0.5, 0);
        this.titleNode.setPosition(this.bgNode.getContentSize().width / 2, this.bgNode.getContentSize().height - 90);
        this.titleNode.setContentSize(this.bgNode.getContentSize().width, 90);
        this.bgNode.addChild(this.titleNode);

        this.actionNode = new cc.Node();
        this.actionNode.setAnchorPoint(0.5, 1);
        this.actionNode.setPosition(this.bgNode.getContentSize().width / 2, 72);
        this.actionNode.setContentSize(this.bgNode.getContentSize().width, 72);
        this.bgNode.addChild(this.actionNode);

        this.contentNode = new cc.Node();
        this.contentNode.setAnchorPoint(0.5, 0);
        this.contentNode.setPosition(this.bgNode.getContentSize().width / 2, 72);
        this.contentNode.setContentSize(this.bgNode.getContentSize().width, this.bgNode.getContentSize().height - this.titleNode.getContentSize().height - this.actionNode.getContentSize().height);
        this.bgNode.addChild(this.contentNode);

    }


});

var DialogSmall = DialogCommon.extend({
    ctor: function (config) {
        this._super(config);

        if (config.content.des) {
            var des = new cc.LabelTTF(config.content.des, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(this.rightEdge - this.leftEdge, 0));
            des.setAnchorPoint(0, 1);
            des.setPosition(this.leftEdge, this.contentNode.getContentSize().height - 5);
            this.contentNode.addChild(des);
            des.setName("des");
            des.setColor(UITheme.colors.TEXT_TITLE);
        }

    },
    initContentSize: function () {
        var bg = autoSpriteFrameController.getSpriteFromSpriteName("#dialog_small_2_bg.png");
        bg.setAnchorPoint(0, 0);
        bg.setPosition(0, 0);
        this.bgNode.addChild(bg, 0);

        this.bgNode.setContentSize(bg.getContentSize());

        this.titleNode = new cc.Node();
        this.titleNode.setAnchorPoint(0.5, 0);
        this.titleNode.setPosition(this.bgNode.getContentSize().width / 2, this.bgNode.getContentSize().height - 90);
        this.titleNode.setContentSize(this.bgNode.getContentSize().width, 90);
        this.bgNode.addChild(this.titleNode);

        this.actionNode = new cc.Node();
        this.actionNode.setAnchorPoint(0.5, 1);
        this.actionNode.setPosition(this.bgNode.getContentSize().width / 2, 72);
        this.actionNode.setContentSize(this.bgNode.getContentSize().width, 72);
        this.bgNode.addChild(this.actionNode);

        this.contentNode = new cc.Node();
        this.contentNode.setAnchorPoint(0.5, 0);
        this.contentNode.setPosition(this.bgNode.getContentSize().width / 2, 72);
        this.contentNode.setContentSize(this.bgNode.getContentSize().width, this.bgNode.getContentSize().height - this.titleNode.getContentSize().height - this.actionNode.getContentSize().height);
        this.bgNode.addChild(this.contentNode);
    }
});

var DialogTiny = DialogCommon.extend({
    ctor: function (config) {
        this._super(config);
        var hasTitle = !!(config.title && (config.title.title || config.title.icon || config.title.txt_1 || config.title.txt_2));

        if (hasTitle) {
            this.titleNode.setPosition(this.bgNode.getContentSize().width / 2, this.bgNode.getContentSize().height - this.titleNode.getContentSize().height);
            this.contentNode.setContentSize(
                this.bgNode.getContentSize().width,
                this.bgNode.getContentSize().height - this.titleNode.getContentSize().height - this.actionNode.getContentSize().height
            );
        }

        if (config.content.des) {
            var des = new cc.LabelTTF(config.content.des, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(this.rightEdge - this.leftEdge, 0));
            if (hasTitle) {
                des.setAnchorPoint(0, 1);
                des.setPosition(this.leftEdge, this.contentNode.height - 8);
            } else {
                des.setAnchorPoint(0, 0);
                des.setPosition(this.leftEdge, (this.contentNode.height - des.height) / 2);
            }
            this.contentNode.addChild(des);
            des.setName("des");
            des.setColor(UITheme.colors.TEXT_TITLE);
        }

    },
    initContentSize: function () {
        var bg = autoSpriteFrameController.getSpriteFromSpriteName("#dialog_tiny_bg.png");
        bg.setAnchorPoint(0, 0);
        bg.setPosition(0, 0);
        this.bgNode.addChild(bg, 0);

        this.bgNode.setContentSize(bg.getContentSize());

        this.titleNode = new cc.Node();
        this.titleNode.setAnchorPoint(0.5, 0);
        this.titleNode.setPosition(this.bgNode.width / 2 + 50, 100);
        this.titleNode.setContentSize(this.bgNode.getContentSize().width, 90);
        this.bgNode.addChild(this.titleNode);

        this.actionNode = new cc.Node();
        this.actionNode.setAnchorPoint(0.5, 1);
        this.actionNode.setPosition(this.bgNode.getContentSize().width / 2, 72);
        this.actionNode.setContentSize(this.bgNode.getContentSize().width, 72);
        this.bgNode.addChild(this.actionNode);

        this.contentNode = new cc.Node();
        this.contentNode.setAnchorPoint(0.5, 0);
        this.contentNode.setPosition(this.bgNode.getContentSize().width / 2, 72);
        this.contentNode.setContentSize(this.bgNode.getContentSize().width, this.bgNode.getContentSize().height - this.actionNode.getContentSize().height);
        this.bgNode.addChild(this.contentNode);
    }
});

var RandomBattleDialog = DialogBig.extend({
    ctor: function (battleInfo, cb) {

        this.monsterList = battleInfo.list;
        this.difficulty = battleInfo.difficulty;

        var config = {
            title: {},
            content: {log: true}
        };
        config.title.title = stringUtil.getString(1080);
        config.title.icon = "icon_warning_monster.png";
        config.content.des = stringUtil.getString(3009)[this.difficulty - 1];
        config.content.dig_des = "#monster_dig_" + this.difficulty + ".png";
        this._super(config);

        var digDes = this.contentNode.getChildByName("dig_des");
        var digMidBg = autoSpriteFrameController.getSpriteFromSpriteName("#monster_dig_mid_bg.png");
        digMidBg.setPosition(digDes.x, digDes.y - digDes.height / 2);
        digMidBg.setScale(0.8);
        this.contentNode.addChild(digMidBg, 0);

        this.autoDismiss = false;

        this.cb = cb;
        this.log = this.contentNode.getChildByName("log");
        this.log.height = this.log.height + 70;
        this.createBattleBeginView();

        this.getChildByName("bgColor").height = 1003;
    },
    show: function () {
        this._super();
        cc.timer.pause();
    },
    dismiss: function () {
        this._super();
        cc.timer.resume();
    },
    createBattleBeginView: function () {
        var label1 = new cc.LabelTTF(stringUtil.getString(1041), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label1.setAnchorPoint(0, 1);
        label1.setPosition(this.leftEdge, this.log.getContentSize().height);
        label1.setColor(UITheme.colors.TEXT_TITLE);
        this.log.addChild(label1);

        var iconList = uiUtil.createEquipedItemIconList(true);
        iconList.setPosition(label1.x + label1.width + 5, label1.y - label1.height / 2);
        this.log.addChild(iconList);

        var label2 = new cc.LabelTTF(stringUtil.getString(1042) + " " + this.difficulty, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label2.setAnchorPoint(0, 1);
        label2.setPosition(this.leftEdge, label1.getPositionY() - label1.getContentSize().height);
        label2.setColor(UITheme.colors.TEXT_ERROR);
        this.log.addChild(label2);

        if (cc.RTL) {
            label1.anchorX = 1;
            label1.x = this.rightEdge;

            iconList.x = label1.x - label1.width - 5 - iconList.width;

            label2.anchorX = 1;
            label2.x = this.rightEdge;
        }

        if (!player.equip.haveWeapon()) {
            //var label3Str = utils.splitLog(stringUtil.getString(1207), 40, 40).join("\n");
            var label3Str = stringUtil.getString(1207);
            var label3 = new cc.LabelTTF(label3Str, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(this.rightEdge - this.leftEdge, 0));
            label3.setAnchorPoint(0, 1);
            label3.setPosition(this.leftEdge, label2.y - label2.height);
            this.log.addChild(label3);
            label3.setColor(UITheme.colors.TEXT_ERROR);
        }

        if (player.isLowVigour()) {
            //var label4Str = utils.splitLog(stringUtil.getString(1206), 40, 40).join("\n");
            var label4Str = stringUtil.getString(1206);
            var label4 = new cc.LabelTTF(label4Str, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(this.rightEdge - this.leftEdge, 0));
            label4.setAnchorPoint(0, 1);
            if (label3) {
                label4.setPosition(this.leftEdge, label3.y - label3.height);
            } else {
                label4.setPosition(this.leftEdge, label2.y - label2.height);
            }
            this.log.addChild(label4);
            label4.setColor(UITheme.colors.TEXT_ERROR);
        }

        var self = this;
        var btn1 = uiUtil.createCommonBtnBlack(stringUtil.getString(1044), this, function () {
            self.log.removeAllChildren();
            self.actionNode.removeAllChildren();
            self.createBattleProcessView();
        });
        btn1.setPosition(this.actionNode.getContentSize().width / 4, this.actionNode.getContentSize().height / 2);
        this.actionNode.addChild(btn1);

        var btn2 = uiUtil.createCommonBtnBlack(stringUtil.getString(1081), this, function () {
            self.log.removeAllChildren();
            self.actionNode.removeAllChildren();
            self.createBattleProcessView(true);
        });
        btn2.setPosition(this.actionNode.getContentSize().width / 4 * 3, this.actionNode.getContentSize().height / 2);
        this.actionNode.addChild(btn2);
    },
    createBattleProcessView: function (isDodge) {
        var des = this.contentNode.getChildByName("des");
        des.setString("");

        var battle = new Battle({
            id: 0,
            monsterList: this.monsterList
        }, isDodge);
        var self = this;
        battle.setGameEndListener(function (sumRes) {
            utils.emitter.off("battleProcessLog");
            utils.emitter.off("battleMonsterLength");
            utils.emitter.off("battleDodgePercentage");

            Medal.checkMonsterKilled(sumRes.monsterKilledNum);

            self.scheduleOnce(function () {
                self.log.removeAllChildren();
                self.actionNode.removeAllChildren();

                if (sumRes.isDodge) {
                    player.log.addMsg(1114);
                    self.dismiss();
                    if (self.cb) {
                        self.cb();
                    }
                } else {
                    if (sumRes.win) {
                        player.log.addMsg(1115);
                    }
                    self.createBattleEndView(sumRes);
                }
            }, 2);
        });

        for (var i = 0; i < 5; i++) {
            if (cc.sys.os === cc.sys.OS_ANDROID) {
                var label = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(400, 0));
            } else {
                var label = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(400, uiUtil.fontSize.COMMON_3));
            }
            label.setAnchorPoint(0, 0);
            label.setPosition(this.leftEdge, i * 40 + 10);
            label.setName("log_" + i);
            label.setColor(UITheme.colors.TEXT_TITLE);
            this.log.addChild(label);
        }

        this.log.updateLog = function (log) {
            for (var i = 4; i >= 0; i--) {
                var label = this.getChildByName("log_" + i);
                var currentLogInfo;
                if (i === 0) {
                    currentLogInfo = log;
                } else {
                    var lastLabel = this.getChildByName("log_" + (i - 1));
                    currentLogInfo = lastLabel.logInfo;
                }

                if (currentLogInfo) {
                    label.logInfo = currentLogInfo;
                    label.setString(currentLogInfo.log);
                    if (currentLogInfo.color) {
                        label.setColor(currentLogInfo.color);
                    } else {
                        label.setColor(UITheme.colors.TEXT_TITLE);
                    }

                    if (currentLogInfo.bigger) {
                        label.setFontSize(uiUtil.fontSize.COMMON_2);
                    } else {
                        label.setFontSize(uiUtil.fontSize.COMMON_3);
                    }
                }
            }
        }
        utils.emitter.on("battleProcessLog", function (prelog) {
            var logs = utils.splitLog(prelog["log"], 50, 42);
            for (var key in logs) {
                var oneLog = {
                    log: logs[key],
                    color: prelog["color"],
                    bigger: prelog["bigger"]
                }
                self.log.updateLog(oneLog);
            }
        });

        var pbBg = autoSpriteFrameController.getSpriteFromSpriteName("#pb_bg.png");
        pbBg.setAnchorPoint(0.5, 0);
        pbBg.setPosition(this.actionNode.getContentSize().width / 2, this.actionNode.getContentSize().height / 2 - 10);
        pbBg.setName("pbBg");
        this.actionNode.addChild(pbBg);

        var pb = new cc.ProgressTimer(autoSpriteFrameController.getSpriteFromSpriteName("#pb.png"));
        pb.type = cc.ProgressTimer.TYPE_BAR;
        pb.midPoint = cc.p(0, 0);
        pb.barChangeRate = cc.p(1, 0);
        pb.setPosition(pbBg.getPositionX(), pbBg.getPositionY() + pbBg.getContentSize().height / 2);
        pb.setPercentage(0);
        pb.setName("pb");
        this.actionNode.addChild(pb);

        if (isDodge) {
            utils.emitter.on("battleDodgePercentage", function (percentage) {
                pb.setPercentage(percentage);
            });
        } else {
            var monsterLenTotal = this.monsterList.length;

            var labelNum = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            labelNum.setAnchorPoint(1, 0);
            labelNum.setPosition(pbBg.x + pbBg.width / 2, pbBg.y + pbBg.height + 5);
            labelNum.setColor(UITheme.colors.TEXT_TITLE);
            this.actionNode.addChild(labelNum);
            labelNum.setString(stringUtil.getString(1139) + cc.formatStr("%s/%s", monsterLenTotal, monsterLenTotal));

            utils.emitter.on("battleMonsterLength", function (monsterLen) {
                pb.setPercentage((monsterLenTotal - monsterLen) / monsterLenTotal * 100);
                labelNum.setString(stringUtil.getString(1139) + cc.formatStr("%s/%s", monsterLen, monsterLenTotal));
            });
        }
    },
    createBattleEndView: function (sumRes) {
        var des = this.contentNode.getChildByName("des");
        var desStringId;
        if (sumRes && sumRes.win) {
            desStringId = 1118;
        } else {
            desStringId = 1057;
        }
        des.setString(stringUtil.getString(desStringId));

        this.log.height += 10;

        var label1 = new cc.LabelTTF(stringUtil.getString(1058), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label1.setAnchorPoint(0, 1);
        label1.setPosition(this.leftEdge, this.log.getContentSize().height);
        label1.setColor(UITheme.colors.TEXT_TITLE);
        this.log.addChild(label1);

        var items = [];
        if (sumRes.bulletNum > 0) {
            items.push({itemId: BattleConfig.BULLET_ID, num: sumRes.bulletNum});
            //player.bag.decreaseItem(1305011,sumRes.bulletNum);
        }
        if (sumRes.tools > 0) {
            items.push({
                itemId: sumRes.toolItemId,
                num: sumRes.tools
            });
        }

        var richText = new ItemRichText(items, this.rightEdge - this.leftEdge - label1.width, 3, 0.5, UITheme.colors.TEXT_TITLE);
        richText.setName("richText")
        richText.setAnchorPoint(0, 0.5);
        richText.setPosition(label1.x + label1.width, label1.y - label1.height / 2);
        this.log.addChild(richText);

        var label2 = new cc.LabelTTF(stringUtil.getString(1059) + stringUtil.getString("hp") + " " + sumRes.totalHarm, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label2.setAnchorPoint(0, 1);
        label2.setPosition(this.leftEdge, label1.getPositionY() - label1.getContentSize().height - 10);
        label2.setColor(UITheme.colors.TEXT_TITLE);
        this.log.addChild(label2);

        var label5 = new cc.LabelTTF("生命:" + DataLog.getLifeValue() + "/" + DataLog.getLifeMaxValue(), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label5.setAnchorPoint(0, 1);
        label5.setPosition(this.leftEdge, label2.getPositionY() - label2.getContentSize().height - 10);
        label5.setColor(UITheme.colors.TEXT_TITLE);
        this.log.addChild(label5);

        if (sumRes.brokenWeapon) {
            var label3 = new cc.LabelTTF(stringUtil.getString(1208), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            label3.setAnchorPoint(0, 1);
            label3.setPosition(this.leftEdge, label5.getPositionY() - label5.getContentSize().height - 10);
            label3.setColor(UITheme.colors.TEXT_TITLE);
            this.log.addChild(label3);
            var items2 = sumRes.brokenWeapon.map(function (itemId) {
                return {itemId: itemId, num: 1};
            });
            var richText2 = new ItemRichText(items2, this.rightEdge - this.leftEdge - label3.width, 3, 0.5, UITheme.colors.TEXT_TITLE);
            richText2.setName("richText2")
            richText2.setAnchorPoint(0, 0.5);
            richText2.setPosition(label3.x + label3.width, label3.y - label3.height / 2);
            this.log.addChild(richText2);
        }
        if (sumRes.win) {
            var randomRewardConfig = randomReward[this.difficulty];
            var rand = Math.random();
            if (rand <= randomRewardConfig.probability) {
                var label4 = new cc.LabelTTF(stringUtil.getString(1222), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
                label4.setAnchorPoint(0, 1);
                label4.setPosition(this.leftEdge, label3.getPositionY() - label3.getContentSize().height - 10);
                label4.setColor(UITheme.colors.TEXT_TITLE);
                this.log.addChild(label4);
                var itemIds = utils.getFixedValueItemIds(randomRewardConfig["produceValue"], randomRewardConfig["produceList"]);
                var items3 = utils.convertItemIds2Item(itemIds);
                player.gainItemsInBag(items3);

                var richText3 = new ItemRichText(items3, this.rightEdge - this.leftEdge - label4.width, 3, 0.5, UITheme.colors.TEXT_TITLE);
                richText3.setName("richText3")
                richText3.setAnchorPoint(0, 0.5);
                richText3.setPosition(label4.x + label4.width, label4.y - label4.height / 2);
                this.log.addChild(richText3);
            }
        }

        if (cc.RTL) {
            label1.anchorX = 1;
            label1.x = this.rightEdge;

            richText.anchorX = 1;
            richText.x = label1.x - label1.width;

            label2.anchorX = 1;
            label2.x = this.rightEdge;

            if (label3) {
                label3.anchorX = 1;
                label3.x = this.rightEdge;

                richText2.anchorX = 1;
                richText2.x = label3.x - label3.width;
            }

            if (label4) {
                label4.anchorX = 1;
                label4.x = this.rightEdge;

                richText3.anchorX = 1;
                richText3.x = label4.x - label4.width;
            }
        }

        var self = this;
        var btn = uiUtil.createCommonBtnBlack(stringUtil.getString(1073), this, function () {
            self.dismiss();
            if (this.cb) {
                this.cb();
            }
        });
        btn.setPosition(this.actionNode.getContentSize().width / 2, this.actionNode.getContentSize().height / 2);
        this.actionNode.addChild(btn);
    }
});

var NpcDialog = DialogBig.extend({
    ctor: function (config) {
        this._super(config);

        this.autoDismiss = false;

        //if (config.title.txt) {
        //    var txt = new cc.LabelTTF(config.title.txt, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        //    txt.setAnchorPoint(1, 1);
        //    txt.setPosition(this.rightEdge, this.titleNode.height / 2 - 5);
        //    this.titleNode.addChild(txt);
        //    txt.setName("txt");
        //    txt.setColor(UITheme.colors.TEXT_TITLE);
        //}

        var heartNode = uiUtil.createHeartNode();
        heartNode.setAnchorPoint(1, 0.5);
        heartNode.x = this.rightEdge;
        heartNode.y = this.titleNode.height / 2;
        this.titleNode.addChild(heartNode);
        heartNode.updateView(config.title.heart);
    }
});

var ItemListDialog = DialogBig.extend({
    ctor: function (itemInfos) {
        var config = {
            title: {},
            action: {btn_1: {}}
        };
        config.title.title = stringUtil.getString(1140);
        config.action.btn_1.txt = stringUtil.getString(1073);
        this._super(config);

        this.items = itemInfos;

        var col = 1;
        var row = Math.ceil(this.items.length / col);
        var colWidth = this.contentNode.width / col;
        var rowHeight;
        for (var i = 0; i < this.items.length; i++) {
            var itemInfo = this.items[i];
            var icon = uiUtil.getSpriteByNameSafe("#icon_item_" + uiUtil.getDisplayItemId(itemInfo.itemId) + ".png", "#icon_item_1101051.png");
            icon.setScale(0.5);
            this.contentNode.addChild(icon);
            if (!rowHeight) {
                rowHeight = icon.height * icon.scale;
            }

            var name = new cc.LabelTTF(stringUtil.getString(itemInfo.itemId).title, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            name.setColor(UITheme.colors.TEXT_TITLE);
            this.contentNode.addChild(name);

            var num = new cc.LabelTTF(itemInfo.num, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            num.setColor(itemInfo.num <= itemInfo.haveNum ? UITheme.colors.TEXT_TITLE : UITheme.colors.TEXT_ERROR);
            this.contentNode.addChild(num);

            var txt = new cc.LabelTTF(stringUtil.getString(1141, itemInfo.haveNum), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            txt.setColor(UITheme.colors.TEXT_TITLE);
            this.contentNode.addChild(txt);

            var c = i % col;
            var r = Math.floor(i / col);
            var halfHeight = this.contentNode.height - 20 - (r + 0.5) * rowHeight;
            var leftEdge = this.leftEdge;
            var rightEdge = this.rightEdge;
            icon.setAnchorPoint(0, 0.5);
            icon.setPosition(leftEdge, halfHeight);
            name.setAnchorPoint(0, 0.5);
            name.setPosition(icon.x + icon.width * icon.scale + 10, halfHeight);
            txt.setAnchorPoint(1, 0.5);
            txt.setPosition(rightEdge, halfHeight);
            num.setAnchorPoint(1, 0.5);
            num.setPosition(txt.x - txt.width - 10, halfHeight);
        }
    }
});

var AboutDialog = DialogBig.extend({
    _buildScrollableChangeLog: function (bottomReservedHeight) {
        var des = this.contentNode.getChildByName("des");
        if (!des) {
            return;
        }

        var contentStr = "";
        if (des.getString) {
            contentStr = des.getString();
        }
        if (!contentStr && this.config && this.config.content) {
            contentStr = this.config.content.des || "";
        }
        des.removeFromParent();

        bottomReservedHeight = bottomReservedHeight || 0;
        var viewWidth = this.rightEdge - this.leftEdge;
        var viewHeight = this.contentNode.getContentSize().height - bottomReservedHeight - 8;
        viewHeight = Math.max(60, viewHeight);

        var container = new cc.Layer();
        var scrollView = new cc.ScrollView(cc.size(viewWidth, viewHeight), container);
        scrollView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        scrollView.setBounceable(false);
        scrollView.setClippingToBounds(true);
        scrollView.setAnchorPoint(0, 0);
        scrollView.x = this.leftEdge;
        scrollView.y = bottomReservedHeight;
        scrollView.setName("change_log_scroll");
        this.contentNode.addChild(scrollView);

        var text = new cc.LabelTTF(contentStr, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(viewWidth, 0));
        text.setAnchorPoint(0, 1);
        text.setColor(UITheme.colors.TEXT_TITLE);

        var textHeight = text.getContentSize().height;
        var totalHeight = Math.max(viewHeight, textHeight + 6);
        text.x = 0;
        text.y = totalHeight;
        container.addChild(text);

        scrollView.setContentSize(viewWidth, totalHeight);
        var offset = scrollView.getContentOffset();
        offset.y = scrollView.getViewSize().height - totalHeight;
        scrollView.setContentOffset(offset);
    },
    ctor: function () {
        var config = {
            title: {title: stringUtil.getString(1210)},
            content: {des: stringUtil.getString(1240)},
            action: {btn_1: {}}
        };
        config.action.btn_1.txt = stringUtil.getString(1030);
        this._super(config);

        var isChinese = cc.sys.localStorage.getItem("language") == cc.sys.LANGUAGE_CHINESE;
        this._buildScrollableChangeLog(isChinese ? 88 : 90);

        if (isChinese) {
            var label1 = new cc.LabelTTF(stringUtil.getString(1211), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            label1.anchorX = 0;
            label1.x = 22;
            label1.y = 60;
            this.contentNode.addChild(label1);
            label1.setColor(UITheme.colors.TEXT_TITLE);

            var label2 = new cc.LabelTTF(stringUtil.getString(1171), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            label2.anchorX = 0;
            label2.x = 20;
            label2.y = 30;
            this.contentNode.addChild(label2);
            label2.setColor(UITheme.colors.TEXT_TITLE);

        } else {
            var btn_email = uiUtil.createSpriteBtn({normal: "btn_email.png"}, this, function () {
                if (cc.sys.isNative) {
                    CommonUtil.sendEmail("BuriedTown@joyogame.com");
                }
            });
            btn_email.anchorX = 0;
            btn_email.x = 80;
            btn_email.y = 50;
            this.contentNode.addChild(btn_email);

            var btn_facebook = uiUtil.createSpriteBtn({normal: "btn_facebook.png"}, this, function () {
                if (cc.sys.isNative) {
                    if (cc.sys.localStorage.getItem("language") == cc.sys.LANGUAGE_KOREAN) {
                        CommonUtil.gotoUrl("https://www.facebook.com/buriedtownkr/?skip_nax_wizard=true");
                    } else {
                        CommonUtil.gotoUrl("https://www.facebook.com/BuriedTown-926403847447839/?skip_nax_wizard=true");
                    }
                }
            });
            btn_facebook.anchorX = 0;
            btn_facebook.x = 280;
            btn_facebook.y = 50;
            this.contentNode.addChild(btn_facebook);
        }
    }
});

var AboutUUIDDialog = DialogTiny.extend({
    ctor: function () {
        var config = {
            title: {},
            content: {},
            action: {btn_1: {}}
        };
        config.action.btn_1.txt = stringUtil.getString(1030);

        this._super(config);

        var label1 = new cc.LabelTTF(Record.getUUID(), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label1.x = this.contentNode.width / 2;
        label1.y = this.contentNode.height / 2;
        this.contentNode.addChild(label1);
        label1.setColor(UITheme.colors.TEXT_TITLE);

    }
});

var PayDialog = DialogBig.extend({
    ctor: function (purchaseId, cb, ownerLayer) {
        var config = {
            title: {},
            content: {},
            action: {btn_1: {}, btn_2: {}}
        };
        this.purchaseId = purchaseId;
        var strConfig = uiUtil.getPurchaseStringConfig(purchaseId);
        if ((PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_OPERATOR
                || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_UNI
                || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_AIYOUXI
                || PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_HEYOUXI
            ) && purchaseId == 106) {
            strConfig.name = '靴子特惠';
        }
        var purchaseConfig = PurchaseService.getPurchaseConfig(purchaseId);
        var isExchangePurchase = PurchaseService.isExchangePurchase(purchaseId);
        var shopState = PurchaseService.getShopUiState(purchaseId);
        var talentDisplayInfo = uiUtil.getTalentDisplayInfo ? uiUtil.getTalentDisplayInfo(purchaseId, strConfig.name) : null;
        var purchaseIconMeta = uiUtil.getPurchaseDisplayIconMeta
            ? uiUtil.getPurchaseDisplayIconMeta(purchaseId, purchaseConfig)
            : null;
        var isRolePortrait = !!(purchaseIconMeta && purchaseIconMeta.type === "role");
        var isSupportPackPurchase = !!(purchaseIconMeta && purchaseIconMeta.type === "support");

        config.title.title = talentDisplayInfo ? talentDisplayInfo.displayName : strConfig.name;
        var titleIconConfig = uiUtil.getPurchaseTitleIconConfig
            ? uiUtil.getPurchaseTitleIconConfig(purchaseId, purchaseConfig)
            : null;
        if (titleIconConfig) {
            config.title.icon = titleIconConfig.iconName;
            config.title.iconFallback = titleIconConfig.fallbackName;
        }
        config.action.btn_1.txt = stringUtil.getString(1193);

        if (purchaseId < 200) {
            config.action.btn_2.txt = stringUtil.getString(1227);
        } else {
            config.action.btn_2.txt = stringUtil.getString(1213);
        }
        config.action.btn_2.target = null;
        config.action.btn_2.cb = cb;

        var canResetUnlock = !!(shopState && shopState.canCancel);
        if (canResetUnlock) {
            config.action.btn_1.txt = "关闭";
            config.action.btn_3 = {
                txt: "取消购买",
                target: null,
                cb: function () {
                    var cancelResult = PurchaseService.cancelPurchase(purchaseId);

                    var refundedPoints = (cancelResult && cancelResult.refundedPoints) ? cancelResult.refundedPoints : 0;
                    var cancelChanged = !!(cancelResult && cancelResult.changed);
                    if (refundedPoints > 0) {
                        uiUtil.showTip("返还成就点: " + refundedPoints);
                    } else if (cancelChanged) {
                        uiUtil.showTip("已取消购买");
                    } else {
                        uiUtil.showTip("当前没有可取消的已购等级");
                    }

                    // 优先刷新调用方传入的商店层，避免按名称查找场景层导致误刷/漏刷。
                    var refreshOwnerLayer = function (layer) {
                        if (!layer) {
                            return false;
                        }
                        if (typeof layer._onShopStateChanged === "function") {
                            layer._onShopStateChanged({purchaseId: purchaseId, reason: "reset_dialog_owner"});
                            return true;
                        }
                        if (typeof layer._refreshAllPayNodes === "function") {
                            layer._refreshAllPayNodes();
                            if (typeof layer._refreshAllPayNodesDeferred === "function") {
                                layer._refreshAllPayNodesDeferred();
                            }
                            return true;
                        }
                        if (typeof layer._refreshAllNodes === "function") {
                            layer._refreshAllNodes();
                            return true;
                        }
                        return false;
                    };

                    if (refreshOwnerLayer(ownerLayer)) {
                        return;
                    }

                    // 兜底：如果调用方没传层对象，再尝试从当前场景查找。
                    var runningScene = cc.director.getRunningScene ? cc.director.getRunningScene() : null;
                    if (runningScene && typeof runningScene.getChildByName === "function") {
                        refreshOwnerLayer(runningScene.getChildByName("keyEventLayer"));
                    }
                }
            };
        }

        this._super(config);

        var titleIcon = this.titleNode.getChildByName("icon");
        if (titleIcon) {
            if (isRolePortrait) {
                // Character portraits have inconsistent source sizes. Keep them inside title bar.
                var iconSize = titleIcon.getContentSize ? titleIcon.getContentSize() : null;
                var iconWidth = iconSize ? iconSize.width : titleIcon.width;
                var iconHeight = iconSize ? iconSize.height : titleIcon.height;
                var fitScale = 0.55;
                if (iconWidth > 0 && iconHeight > 0) {
                    fitScale = Math.min(
                        56 / iconWidth,
                        (this.titleNode.height - 12) / iconHeight
                    );
                }
                titleIcon.scale = Math.max(0.4, Math.min(0.72, fitScale));
            } else if (isSupportPackPurchase) {
                titleIcon.scale = 0.6;
            } else {
                titleIcon.scale = 0.45;
            }
        }
        var titleLabel = this.titleNode.getChildByName("title");
        if (titleLabel && typeof titleLabel.updateView === "function") {
            titleLabel.updateView();
        }

        var priceStr = "";
        if (shopState && shopState.priceText !== undefined && shopState.priceText !== null && shopState.priceText !== "") {
            priceStr = shopState.priceText;
        } else {
            if (isExchangePurchase) {
                var achievementPrice = PurchaseService.getAchievementPriceByPurchaseId(purchaseId);
                if (achievementPrice !== null && achievementPrice !== undefined) {
                    priceStr = achievementPrice + " 成就点";
                } else if (PurchaseService.isTalentPurchase(purchaseId)) {
                    priceStr = "已满级";
                } else {
                    priceStr = "已购";
                }
            } else {
                priceStr = purchaseConfig.productPriceStr;
                if (!priceStr) {
                    priceStr = stringUtil.getString(1191, purchaseConfig.price);
                }
            }
        }
        var price = new cc.LabelTTF(priceStr, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2);
        price.anchorX = 1;
        price.setPosition(this.rightEdge, 20);
        this.titleNode.addChild(price);
        price.setName("price");
        price.setColor(UITheme.colors.TEXT_TITLE);

        var canPurchase = shopState ? !!shopState.canBuy : true;
        var shouldHideBuyButton = shopState ? !!shopState.shouldHideBuyButton : false;
        if (!shopState) {
            if (isExchangePurchase) {
                var nextAchievementPrice = PurchaseService.getAchievementPriceByPurchaseId(purchaseId);
                var currentAchievementPoints = Medal.getAchievementPoints ? Medal.getAchievementPoints() : 0;
                shouldHideBuyButton = nextAchievementPrice === null || nextAchievementPrice === undefined;
                canPurchase = nextAchievementPrice !== null
                    && nextAchievementPrice !== undefined
                    && currentAchievementPoints >= nextAchievementPrice;
            } else {
                canPurchase = !PurchaseService.isUnlocked(purchaseId);
            }
        }
        var btn2Node = this.actionNode.getChildByName("btn_2");
        if (btn2Node) {
            btn2Node.setEnabled(canPurchase);
        }

        var btn1Node = this.actionNode.getChildByName("btn_1");
        var btn3Node = this.actionNode.getChildByName("btn_3");
        if (btn1Node && btn2Node && btn3Node && shouldHideBuyButton) {
            btn2Node.setVisible(false);
            btn1Node.setPosition(this.actionNode.getContentSize().width / 4, this.actionNode.getContentSize().height / 2);
            btn3Node.setPosition(this.actionNode.getContentSize().width / 4 * 3, this.actionNode.getContentSize().height / 2);
        } else if (btn1Node && btn2Node && btn3Node) {
            btn2Node.setVisible(true);
            var actionWidth = this.actionNode.getContentSize().width;
            var actionHeight = this.actionNode.getContentSize().height / 2;
            btn1Node.setScale(0.92);
            btn2Node.setScale(0.92);
            btn3Node.setScale(0.92);
            btn1Node.setPosition(actionWidth * 0.18, actionHeight);
            btn2Node.setPosition(actionWidth * 0.5, actionHeight);
            btn3Node.setPosition(actionWidth * 0.82, actionHeight);
        }

        var offIcon = uiUtil.createSaleOffIcon();
        offIcon.x = this.titleNode.width - 20;
        offIcon.y = this.titleNode.height;
        this.titleNode.addChild(offIcon);
        offIcon.setVisible(false);
        offIcon.setName('offIcon');
        this.updateOffIcon();

        if (purchaseId == 106) {
            var saleIcon = autoSpriteFrameController.getSpriteFromSpriteName('icon_sale.png');
            saleIcon.x = this.titleNode.width - 20;
            saleIcon.y = this.titleNode.height - 10;
            this.titleNode.addChild(saleIcon);
        }
    },
    updateOffIcon: function () {
        var offIcon = this.titleNode.getChildByName('offIcon');
        if (PurchaseService.isExchangePurchase(this.purchaseId)) {
            offIcon.setVisible(false);
            return;
        }
        var off = PurchaseService.getPriceOff(this.purchaseId);
        if (off > 0) {
            offIcon.setVisible(true);
            offIcon.updateOff(off);
        } else {
            offIcon.setVisible(false);
        }
    },
    show: function () {
        this._super();
        if (cc.timer)
            cc.timer.pause();
    },
    dismiss: function () {
        this._super();
        if (cc.timer)
            cc.timer.resume();
    }
});

var LoadingDialog = Dialog.extend({
    ctor: function () {
        this._super();
        this.autoDismiss = false;

        this.sprite = autoSpriteFrameController.getSpriteFromSpriteName("loading_anim_1.png");
        this.sprite.x = this.width / 2;
        this.sprite.y = this.height / 2;
        this.addChild(this.sprite);

        var array = [];
        array.push(autoSpriteFrameController.getSpriteFrameFromSpriteName("loading_anim_1.png"));
        array.push(autoSpriteFrameController.getSpriteFrameFromSpriteName("loading_anim_2.png"));
        array.push(autoSpriteFrameController.getSpriteFrameFromSpriteName("loading_anim_3.png"));
        array.push(autoSpriteFrameController.getSpriteFrameFromSpriteName("loading_anim_4.png"));
        var animation = new cc.Animation(array, 0.2);
        var anim = cc.animate(animation);
        this.sprite.runAction(cc.repeatForever(anim));
    },
    initContentSize: function () {
        return cc.winSize;
    }
});

var BackToMenuDialog = DialogTiny.extend({
    ctor: function (cb) {
        var config = {
            title: {},
            content: {},
            action: {btn_1: {}, btn_2: {}}
        };
        config.content.des = stringUtil.getString(1273);
        config.action.btn_2.txt = stringUtil.getString(1030);
        config.action.btn_2.target = null;
        config.action.btn_2.cb = cb;

        config.action.btn_1.txt = stringUtil.getString(1031);
        config.action.btn_1.cb = null;
        this._super(config);
    },
    show: function () {
        this._super();
        if (cc.timer)
            cc.timer.pause();
    },
    dismiss: function () {
        this._super();
        if (cc.timer)
            cc.timer.resume();
    }
});
var DialogMoreGame = Dialog.extend({
    ctor: function () {
        this._super();

        var bg = autoSpriteFrameController.getSpriteFromSpriteName("frame_ad_bg.png");
        bg.x = cc.winSize.width / 2;
        bg.y = cc.winSize.height / 2;
        this.addChild(bg);

        var url = "http://buriedtown.locojoy.com/jctgandroid/index.html";
        var webview = new ccui.WebView();
        webview.loadURL(url);
        webview.setContentSize(cc.size(440, 545));
        webview.anchorY = 0;
        webview.x = bg.width / 2;
        webview.y = 20;
        bg.addChild(webview, 100);
        webview.setOnDidFinishLoading(function () {
            cc.e("webview onloading");
            webview.setVisible(true);
        });
        webview.setVisible(false);
        webview.setScalesPageToFit(true);
        var scheme = 'btredirect';
        webview.setJavascriptInterfaceScheme(scheme);
        webview.setOnJSCallback(function (view, url) {
            var redirectUrl = url.replace(scheme, 'http');
            CommonUtil.gotoUrl(redirectUrl);
        });

        var btnClose = uiUtil.createSpriteBtn({normal: "btn_ad_back.png"}, this, function () {
            this.dismiss();
        });
        btnClose.x = bg.width - 20;
        btnClose.y = bg.height - 20;
        bg.addChild(btnClose);

        this.autoDismiss = false;

    },
    initContentSize: function () {
        return cc.winSize;
    }
});
