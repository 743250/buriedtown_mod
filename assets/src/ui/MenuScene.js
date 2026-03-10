/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */
//下载服务器地址
var updatePackageUrl = "http://berrytown.update.locojoy.com/";
//缓存新版本文件信息
var tempVersionConfig;
var MenuLayer = cc.Layer.extend({
    ctor: function () {
        this._super();

        ClientData.CHANNEL = "" + CommonUtil.getMetaDataInt("channelId");
        ClientData.CLIENT_VERSION = CommonUtil.getMetaData("versionName");
        paramManager.init();
        PurchaseService.initPackage();
        var sdkType = CommonUtil.getMetaData("sdk_type");
        // Google Play native pay init will eagerly surface the platform profile/account prompt.
        // Keep payType for UI branching, but skip startup init so launch stays silent.
        var shouldBypassNativePayInit = PurchaseService.isPaySdkBypassedForTest()
            || sdkType === PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY;
        if (shouldBypassNativePayInit) {
            PurchaseAndroid.payType = sdkType || PurchaseAndroid.PAY_TYPE_TEST;
        } else {
            PurchaseAndroid.init(sdkType, {});
        }
        adHelper.init(paramManager.getAdType());
        networkUtil.init();
        DataLog.loadFromLocal();
        Medal.init();
        // Avoid startup platform-account popup (Google Play player info).
        if (!cc.sys.localStorage.getItem("AccountId")) {
            cc.sys.localStorage.setItem("AccountId", Record.getUUID());
        }
        return true;
    },

    onExit: function () {
        this._super();
    },

    onEnter: function () {
        this._super();

        var bgName = "#menu_bg.png";
        var bg = autoSpriteFrameController.getSpriteFromSpriteName(bgName);
        bg.x = cc.winSize.width / 2;
        bg.y = cc.winSize.height / 2;
        this.addChild(bg);

        var logoName;
        if (cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_CHINESE) {
            logoName = 'top_logo_en.png';
        } else {
            logoName = 'top_logo_en.png';
        }
        var logo = autoSpriteFrameController.getSpriteFromSpriteName(logoName);
        logo.x = bg.width / 2;
        logo.y = 938;
        bg.addChild(logo);

        var self = this;
        this._menuBtnActionLocked = false;
        var runSafeMenuAction = function (action) {
            if (self._menuBtnActionLocked) {
                return;
            }
            self._menuBtnActionLocked = true;
            try {
                action();
            } catch (e) {
                self._menuBtnActionLocked = false;
                cc.e("menu button action error: " + e);
            }
            self.runAction(cc.sequence(
                cc.delayTime(0.35),
                cc.callFunc(function () {
                    self._menuBtnActionLocked = false;
                })
            ));
        };
        var btn1 = uiUtil.createBigBtnWhite(stringUtil.getString(1142), this, function () {
            runSafeMenuAction(function () {
                self.openSaveSlotLayer("new");
            });
        });
        btn1.setPosition(bg.width / 2, bg.height / 2 - 200);
        bg.addChild(btn1);
        btn1.setName("btn_1");

        var btn2 = uiUtil.createBigBtnWhite(stringUtil.getString(1143), this, function () {
            runSafeMenuAction(function () {
                self.openSaveSlotLayer("continue");
            });
        });
        btn2.setPosition(bg.width / 2, bg.height / 2 - 300);
        bg.addChild(btn2);
        btn2.setName("btn_2");
        btn2.setEnabled(Record.hasAnyRecord());

        var btn3 = uiUtil.createBigBtnWhite(stringUtil.getString(1158), this, function () {
            runSafeMenuAction(function () {
                audioManager.stopMusic(audioManager.music.MAIN_PAGE);
                cc.director.runScene(new RankScene());
            });
        });
        //btn3.setPosition(bg.width / 2, bg.height / 2 - 346);
        //bg.addChild(btn3);
        btn2.setName("btn_3");

        //var switchMusic = new SwitchMusicButton(audioManager.needSound());
        //switchMusic.x = bg.width - 106 + 15;
        //switchMusic.y = bg.height - 106 + 15;
        //bg.addChild(switchMusic);
        //switchMusic.setClickListener(this, function (sender) {
        //    //var on = sender.on;
        //    //if (on) {
        //    //    audioManager.setSound(on);
        //    //    audioManager.playMusic(audioManager.music.MAIN_PAGE, true);
        //    //} else {
        //    //    audioManager.stopMusic(audioManager.music.MAIN_PAGE, true);
        //    //    audioManager.setSound(on);
        //    //}
        //
        //});
        var btn_setting = uiUtil.createSpriteBtn({normal: "btn_game_setting.png"}, this, function () {
            runSafeMenuAction(function () {
                self.addChild(new SettingLayer());
            });
        });
        btn_setting.x = bg.width - 106 + 15;
        btn_setting.y = bg.height - 106 + 15;
        bg.addChild(btn_setting);


        audioManager.playMusic(audioManager.music.MAIN_PAGE, true);

        var btn4 = uiUtil.createSpriteBtn({normal: "btn_cart.png"}, this, function () {
            runSafeMenuAction(function () {
                cc.director.runScene(new ShopScene());
            });
        });
        btn4.x = 106;
        btn4.y = 106;
        bg.addChild(btn4);

        var btn5 = uiUtil.createSpriteBtn({normal: "btn_contact.png"}, this, function () {
            runSafeMenuAction(function () {
                var d = new AboutDialog();
                d.show();
            });
        });
        btn5.x = bg.width/2 + 72;
        btn5.y = 106;
        bg.addChild(btn5);

        var btn6 = new cc.LabelTTF(stringUtil.getString(1209) + " " + ClientData.CLIENT_VERSION, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        //var btn6 = uiUtil.createBtn2(stringUtil.getString(1209) + " " + ClientData.CLIENT_VERSION, this, function () {
        //    var d = new AboutUUIDDialog();
        //    d.show();
        //});
        btn6.anchorX = 0;
        btn6.x = 10;
        btn6.y = 20;
        bg.addChild(btn6);

        var btn7 = uiUtil.createSpriteBtn({normal: "icon_medal.png"}, this, function () {
            runSafeMenuAction(function () {
                uiUtil.safeRunScene(function () {
                    return new medalScene();
                }, {errorTip: "成就界面打开失败"});
                //gameCenter.showAchievements();
            });
        });
        btn7.x = bg.width / 2 - 72;
        btn7.y = 106;
        bg.addChild(btn7);

        var btn8 = uiUtil.createSpriteBtn({normal: "btn_rate.png"}, this, function () {
            CommonUtil.gotoAppstore();
        });
        //btn8.x = 106;
        //btn8.y = 106;
        //bg.addChild(btn8);

        if (cc.sys.os == cc.sys.OS_IOS) {
            if (gameCenter.isGameCenterAvailable()) {
                gameCenter.authenticateLocalPlayer();
            }
        }

        if (cc.sys.os == cc.sys.OS_ANDROID) {

            btn4.x = bg.width / 2 - 72;
            btn7.setVisible(true);
            btn7.x = bg.width / 2 + 72;
            //} else {
            //    btn4.x = bg.width / 2;
            //    btn7.setVisible(false);
            //}

            if (PurchaseAndroid.payType !== PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY) {

                // Keep the About entry visible so players can still open changelog info.
                btn5.setVisible(true);
                btn4.x = bg.width / 2 - 140;
                btn5.x = bg.width / 2;
                btn7.x = bg.width / 2 + 140;


                //if (PurchaseAndroid.payType === PurchaseAndroid.PAY_TYPE_HEYOUXI) {
                var musicInfoRaw = jsb.reflection.callStaticMethod("net/dice7/pay/PayHelper", "getMusicInfo", "()Ljava/lang/String;");
                var musicInfo = SafetyHelper.safeJSONParse(musicInfoRaw, {}, "MenuScene.getMusicInfo");
                cc.v(JSON.stringify(musicInfo));
                if (musicInfo.enable) {
                    var on = musicInfo.musicOn;
                    if (on) {
                        audioManager.setSound(on);
                        audioManager.playMusic(audioManager.music.MAIN_PAGE, true);
                    } else {

                        audioManager.stopMusic(audioManager.music.MAIN_PAGE, true);
                        audioManager.setSound(on);
                    }
                }
                //}

                //aiyouxi 定制界面
                if ((PurchaseAndroid.payType === PurchaseAndroid.PAY_TYPE_AIYOUXI || PurchaseAndroid.payType === PurchaseAndroid.PAY_TYPE_OPERATOR)
                    && ClientData.CHANNEL == 214906000) {
                    btn8.setVisible(false);
                    btn5.setVisible(true);

                    btn4.x = bg.width - 106;

                    var btn9 = uiUtil.createBigBtnWhite("关于", this, function () {
                        PurchaseAndroid.showAboutDialog();
                    });
                    btn9.setPosition(bg.width / 2, bg.height / 2 - 456);
                    bg.addChild(btn9);

                    var btn10 = uiUtil.createBigBtnWhite("更多游戏", this, function () {
                        PurchaseAndroid.moreGame({});
                    });
                    btn10.setPosition(bg.width / 2, bg.height / 2 - 566);
                    bg.addChild(btn10);

                    btn1.y += 10;
                    btn2.y += 20;
                    btn3.y += 30;
                    btn9.y += 40;
                    btn10.y += 50;

                    btn7.x = 106;

                }

                btn8.setVisible(false);
                if (btn5.isVisible()) {
                    btn4.x = bg.width / 2 - 140;
                    btn5.x = bg.width / 2;
                    btn7.x = bg.width / 2 + 140;
                } else {
                    btn4.x = bg.width / 2 - 70;
                    btn7.x = bg.width / 2 + 70;
                }
            }

            // Test mode keeps all three bottom-entry buttons visible.
            if (PurchaseService.isPaySdkBypassedForTest()) {
                btn5.setVisible(true);
                btn4.x = bg.width / 2 - 140;
                btn5.x = bg.width / 2;
                btn7.x = bg.width / 2 + 140;
            }

            // Always keep the contact/changelog shortcut in the bottom icon row on Android.
            btn5.setVisible(true);
            btn4.x = bg.width / 2 - 140;
            btn5.x = bg.width / 2;
            btn7.x = bg.width / 2 + 140;

        }
        Achievement.init();

        //todo 替换为正式地址
        //var update = new up.UpgradeAPK(ClientData.CLIENT_VERSION, ClientData.CHANNEL, "http://192.168.2.105:8888/");
        if (!tempVersionConfig) {
            this.getVersionString(function (versionConfig) {
                cc.log("version result is " + JSON.stringify(versionConfig));

                if (versionConfig && versionConfig["version"]) {
                    if (cc.director.getRunningScene().sceneName === "MenuScene") {
                        self.castVersionConfig(versionConfig);
                    } else {
                        tempVersionConfig = versionConfig;
                    }
                }
            }, this);
        } else {
            self.castVersionConfig(tempVersionConfig);
        }
        //update.onProgress = function (percent) {
        //    cc.e(percent);
        //}
    },
    openSaveSlotLayer: function (mode) {
        var self = this;
        var slotLayer = new SaveSlotSelectLayer(mode, function (slot) {
            if (mode === "continue") {
                self.onSelectContinueGameSlot(slot);
            } else {
                self.onSelectNewGameSlot(slot);
            }
        });
        this.addChild(slotLayer, 1000);
    },
    onSelectNewGameSlot: function (slot) {
        Record.setCurrentSlot(slot);
        if (Record.hasRecord(slot)) {
            var self = this;
            uiUtil.showNewGameDialog(function () {
                self.newGame();
            });
            return;
        }
        this.newGame();
    },
    onSelectContinueGameSlot: function (slot) {
        Record.setCurrentSlot(slot);
        if (!Record.hasRecord(slot)) {
            uiUtil.showTinyInfoDialog(getSaveSlotLangConfig().emptyContinueWarn);
            return;
        }
        audioManager.stopMusic(audioManager.music.MAIN_PAGE);
        game.init();
        game.start();
        cc.director.runScene(new MainScene());
    },
    castVersionConfig: function (versionConfig) {
        if (versionConfig["isOpen"]) {
            cc.log("server version is " + JSON.stringify(versionConfig));
            var serverVersion = versionConfig["version"];
            serverVersionArray = serverVersion.split(".");
            ClientDataArray = ClientData.CLIENT_VERSION.split(".");
            var canUpdate = false;
            if (serverVersionArray[0] > ClientDataArray[0]) {
                canUpdate = true;
            }
            if (serverVersionArray[0] == ClientDataArray[0] && serverVersionArray[1] > ClientDataArray[1]) {
                canUpdate = true;
            }
            if (serverVersionArray[0] == ClientDataArray[0] && serverVersionArray[1] == ClientDataArray[1] && serverVersionArray[2] > ClientDataArray[2]) {
                canUpdate = true;
            }

            if (canUpdate) {
                var confirmLayer = new DownloadConfirmLayer(versionConfig);
                confirmLayer.show();
            }
            tempVersionConfig = null;
        }
    },
    newGame: function () {
        audioManager.stopMusic(audioManager.music.MAIN_PAGE);
        DataLog.increaseRound();
        game.newGame();
        cc.director.runScene(new ChooseScene());
    },
    getVersionString: function (cb, target) {
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("GET", updatePackageUrl + ClientData.CHANNEL + ".json");
        cc.log("server data is " + updatePackageUrl + ClientData.CHANNEL + ".json");
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onreadystatechange = function () {
            var res;
            if (xhr.readyState == 4 && (xhr.status >= 200 && xhr.status <= 207)) {
                var response = xhr.responseText;
                cc.i("version  response is :" + response);
                response = response.substring(response.indexOf("{"));
                res = SafetyHelper.safeJSONParse(response, {statusCode: 300}, "MenuScene.getVersionString");
            } else {
                res = {statusCode: 300};
            }
            cc.i("request back readyState=" + xhr.readyState + " status=" + xhr.status);
            if (cb) {
                cb.call(target, res);
            }
        };
        xhr.onerror = function () {
            if (cb) {
                cb.call(target, {"statusCode": 301});
            }
        };
        xhr.timeout = 30000;
        xhr.ontimeout = function () {
            if (cb) {
                cb.call(target, {"statusCode": 302});
            }
        }
        xhr.send("");
    }

});
var getSaveSlotLangConfig = function () {
    var lan = cc.sys.localStorage.getItem("language");
    var isChinese = (lan === cc.sys.LANGUAGE_CHINESE || lan === cc.sys.LANGUAGE_CHINESE_HANT);
    if (isChinese) {
        return {
            newTitle: "新游戏 - 选择存档",
            continueTitle: "继续游戏 - 选择存档",
            slotPrefix: "存档",
            empty: "空存档",
            saved: "已有存档",
            dayPrefix: "第",
            daySuffix: "天",
            emptyContinueWarn: "该存档为空，无法继续游戏。"
        };
    }
    return {
        newTitle: "New Game - Select Save Slot",
        continueTitle: "Continue - Select Save Slot",
        slotPrefix: "Slot",
        empty: "Empty",
        saved: "Saved",
        dayPrefix: "Day ",
        daySuffix: "",
        emptyContinueWarn: "This slot is empty."
    };
};
var SaveSlotSelectLayer = cc.Layer.extend({
    ctor: function (mode, onSelectSlot) {
        this._super();
        this.mode = mode;
        this.onSelectSlot = onSelectSlot;
        this.lang = getSaveSlotLangConfig();

        this.addChild(new cc.LayerColor(cc.color(0, 0, 0, 220)));

        var titleText = this.mode === "continue" ? this.lang.continueTitle : this.lang.newTitle;
        var title = new cc.LabelTTF(titleText, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        title.setPosition(cc.winSize.width / 2, cc.winSize.height / 2 + 280);
        this.addChild(title);

        var self = this;
        for (var slot = 1; slot <= Record.SLOT_COUNT; slot++) {
            var btn = uiUtil.createBigBtnWhite(this.getSlotButtonText(slot), this, function (sender) {
                var selectedSlot = sender._slotIndex;
                if (self.mode === "continue" && !Record.hasRecord(selectedSlot)) {
                    uiUtil.showTinyInfoDialog(self.lang.emptyContinueWarn);
                    return;
                }
                if (typeof self.onSelectSlot === "function") {
                    self.onSelectSlot(selectedSlot);
                }
                self.removeFromParent();
            });
            btn._slotIndex = slot;
            btn.setPosition(cc.winSize.width / 2, cc.winSize.height / 2 + 160 - (slot - 1) * 110);
            if (this.mode === "continue" && !Record.hasRecord(slot)) {
                btn.setEnabled(false);
            }
            this.addChild(btn);
        }

        var btnCancel = uiUtil.createCommonBtnWhite(stringUtil.getString(1031), this, function () {
            self.removeFromParent();
        });
        btnCancel.setPosition(cc.winSize.width / 2, cc.winSize.height / 2 - 220);
        this.addChild(btnCancel);

        cc.eventManager.addListener(cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function () {
                return true;
            }
        }), this);

        cc.eventManager.addListener(cc.EventListener.create({
            event: cc.EventListener.KEYBOARD,
            onKeyReleased: function (keyCode) {
                if (keyCode == cc.KEY.back) {
                    self.removeFromParent();
                }
            }
        }), this);
    },
    getSlotButtonText: function (slot) {
        var info = Record.getRecordInfo(slot);
        var status = this.lang.empty;
        if (info.hasRecord) {
            status = this.lang.saved;
            if (info.day !== null) {
                status = this.lang.dayPrefix + info.day + this.lang.daySuffix;
            }
        }
        return this.lang.slotPrefix + " " + slot + " (" + status + ")";
    }
});
var DownloadConfirmLayer = DialogBig.extend({
    ctor: function (versionConfig) {
        var self = this;


        //todo 新增配置文字
        var titleStr;
        if (PurchaseAndroid.payType === PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY) {
            titleStr = stringUtil.getString(1267, "");
        } else {
            titleStr = stringUtil.getString(1267, versionConfig["version"]);
        }
        var config = {
            title: {title: titleStr},
            action: {btn_1: {}, btn_2: {}}
        };
        // this.titleNode.getName("title").setContentSize(400,0);

        if (PurchaseAndroid.payType === PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY) {
            config.action.btn_1.cb = function () {
                CommonUtil.gotoAppstore();
            }
        } else {
            config.action.btn_1.cb = function () {
                if (CommonUtil.deviceIPAddress() === "0.0.0.0") {
                    var downloaWarnLayer = new DownloadWarnningLayer();
                    downloaWarnLayer.show();
                } else {
                    var downloadingLayer = new DownloadingLayer();
                    downloadingLayer.show();
                }

            };

        }
        config.action.btn_1.txt = stringUtil.getString(1030);
        config.action.btn_1.target = this;
        config.action.btn_2.txt = stringUtil.getString(1031);
        config.action.btn_2.target = this;
        this._super(config);

        // var contentPositionY = 0;
        // var versionTitle = new cc.LabelTTF("有新版本"+versionConfig["version"]+"可用！", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2,cc.size(400,0));
        // versionTitle.setColor(UITheme.colors.TEXT_TITLE);
        // versionTitle.setAnchorPoint(0,1);
        // versionTitle.setPosition(30,450);
        // this.contentNode.addChild(versionTitle);
        // contentPositionY = versionTitle.y - versionTitle.height - 20;

        this.titleNode.getChildByName("title").setFontSize(uiUtil.fontSize.COMMON_2);
        var updateLabel = new cc.LabelTTF(stringUtil.getString(1268), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(350, 0));
        updateLabel.setColor(UITheme.colors.TEXT_TITLE);
        updateLabel.setAnchorPoint(0, 1);
        updateLabel.setPosition(70, 450);
        this.contentNode.addChild(updateLabel);
        contentPositionY = updateLabel.y - updateLabel.height - 20;


        var updateContent = versionConfig["changeLog"]["en"];
        var localLanguage = cc.sys.localStorage.getItem("language")
        if (versionConfig["changeLog"][localLanguage]) {
            updateContent = versionConfig["changeLog"][localLanguage];
        }

        for (var key in updateContent) {
            var updateInfo = new cc.LabelTTF(Number(Number(key) + 1) + "." + updateContent[key], uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(350, 0));
            updateInfo.setColor(UITheme.colors.TEXT_TITLE);
            updateInfo.setAnchorPoint(0, 1);
            updateInfo.setPosition(100, contentPositionY);
            this.contentNode.addChild(updateInfo);
            contentPositionY = updateInfo.y - updateInfo.height - 20;
        }

        var notUpdateWarn = new cc.LabelTTF(stringUtil.getString(1269), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(400, 0));
        notUpdateWarn.setColor(UITheme.colors.TEXT_TITLE);
        notUpdateWarn.setAnchorPoint(0, 1);
        notUpdateWarn.setPosition(30, contentPositionY);
        this.contentNode.addChild(notUpdateWarn);


        if (versionConfig["necessary"]) {
            this.actionNode.getChildByName("btn_2").setEnabled(false);
        }
        this.onClickLayer = function () {
        };
    },
    onEnter: function () {
        this._super();
    }
});
var DownloadWarnningLayer = DialogTiny.extend({
    ctor: function () {
        var self = this;
        //todo 新增配置文字
        var titleStr = stringUtil.getString(1266);
        var config = {
            title: {title: titleStr},
            action: {btn_1: {}, btn_2: {}}
        };

        config.action.btn_1.cb = function () {
            var downloadingLayer = new DownloadingLayer();
            downloadingLayer.show();
        };

        config.action.btn_1.txt = stringUtil.getString(1030);
        config.action.btn_1.target = this;
        config.action.btn_2.txt = stringUtil.getString(1030);
        config.action.btn_2.target = this;
        this._super(config);
        this.titleNode.getChildByName("title").setFontSize(uiUtil.fontSize.COMMON_2);
        this.titleNode.getChildByName("title").y -= 5;
    }
})
var DownloadingLayer = DialogTiny.extend({
    ctor: function () {
        var self = this;
        var config = {
            title: {title: stringUtil.getString(1254)}
        }
        this._super(config);
        var update = new up.UpgradeAPK(ClientData.CLIENT_VERSION, ClientData.CHANNEL, updatePackageUrl);
        var versionStrConfigStr = update.getVersionString();
        var versionConfig = versionStrConfigStr ? SafetyHelper.safeJSONParse(update.getVersionString(), null, "DownloadingLayer.versionConfig") : null;

        var downloadingLabel = new cc.LabelTTF(stringUtil.getString(1255, "0"), uiUtil.fontFamily.normal, 30);
        downloadingLabel.setColor(cc.color(0, 0, 0, 255));
        this.contentNode.addChild(downloadingLabel);
        downloadingLabel.setPosition(this.contentNode.width / 2, 30);
        downloadingLabel.setFontSize(uiUtil.fontSize.COMMON_1);

        var progressNode = new cc.Node();
        var pbBg = autoSpriteFrameController.getSpriteFromSpriteName("#pb_bg.png");
        pbBg.setAnchorPoint(0.5, 0);
        pbBg.setName("pbBg");
        progressNode.addChild(pbBg);

        var pb = new cc.ProgressTimer(autoSpriteFrameController.getSpriteFromSpriteName("#pb.png"));
        pb.type = cc.ProgressTimer.TYPE_BAR;
        pb.midPoint = cc.p(0, 0);
        pb.barChangeRate = cc.p(1, 0);
        pb.setPosition(pbBg.getPositionX(), pbBg.getPositionY() + pbBg.getContentSize().height / 2);
        pb.setPercentage(0);
        pb.setName("pb");
        progressNode.addChild(pb);

        progressNode.setPosition(this.contentNode.width / 2, 20);
        this.bgNode.addChild(progressNode);
        this.onClickLayer = function () {
        };
        update.upgrade();
        update.onProgress = function (percent) {
            downloadingLabel.setString(stringUtil.getString(1255, percent));
            pb.setPercentage(percent);
        }
        update.onError = function (code) {
            switch (code) {
                case 2:
                    self.titleNode.getChildByName("title").setString(stringUtil.getString(1256));
                    break;
                case 3:
                    self.titleNode.getChildByName("title").setString(stringUtil.getString(1257));
                    break;
                case 4:
                    self.titleNode.getChildByName("title").setString(stringUtil.getString(1258));
                    break;
            }
        }
    }
});
var SettingLayer = cc.Layer.extend({
    ctor: function () {
        this._super();

        var self = this;
        this.addChild(new cc.LayerColor(cc.color(0, 0, 0, 220)));

        this.label_music = new cc.LabelTTF(stringUtil.getString(1248), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2);
        this.label_music.setPosition(cc.winSize.width / 2, 950);
        this.addChild(this.label_music);

        this.btn_music = new SettingButton("", true);
        this.btn_music.on = audioManager.needSound();
        if (this.btn_music.on) {
            this.btn_music.setTitle(stringUtil.getString(1249));
        } else {
            this.btn_music.setTitle(stringUtil.getString(1250));
        }
        this.btn_music.setPosition(cc.winSize.width / 2, 900);
        this.addChild(this.btn_music);
        this.btn_music.setClickListener(this, function (sender) {
            self.openMusicSelector(sender.on);
        })


        this.label_lan = new cc.LabelTTF(stringUtil.getString(1251), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2);
        this.label_lan.setPosition(cc.winSize.width / 2, 750);
        this.addChild(this.label_lan);

        this.btn_lan = new SettingButton("", true);
        this.lan = cc.sys.localStorage.getItem("language");
        if (!this.lan)
            this.lan = cc.sys.language;
        this.btn_lan.setTitle(stringName[this.lan]);
        this.btn_lan.setPosition(cc.winSize.width / 2, 750);
        this.addChild(this.btn_lan);
        this.btn_lan.setClickListener(this, function (sender) {
            self.openLanguageSelector();
        })

        /*if (cc.sys.os == cc.sys.OS_ANDROID) {
            if (PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY) {
                this.btn_gameCenter = uiUtil.createSpriteBtn({normal: "icon_google_game.png"}, this, function () {
                    gameCenter.showAchievements();
                });
                this.btn_gameCenter.setPosition(cc.winSize.width / 2, 300);
                this.addChild(this.btn_gameCenter);
            }
        } else if (cc.sys.os == cc.sys.OS_IOS) {
            this.btn_gameCenter = new SettingButton("");
            this.btn_gameCenter.setTitle("GameCenter");
            this.btn_gameCenter.setPosition(cc.winSize.width / 2, 500);
            this.addChild(this.btn_gameCenter);
            this.btn_gameCenter.setClickListener(this, function (sender) {
                gameCenter.showAchievements();
            });
        }
        */

        /*this.btn_moregame = new SettingButton("");
        this.btn_moregame.setTitle(stringUtil.getString(1274));
        this.btn_moregame.setPosition(cc.winSize.width / 2, 600);
        this.addChild(this.btn_moregame);
        this.btn_moregame.setClickListener(this, function (sender) {
            var d = new DialogMoreGame();
            d.show();
        });
        this.btn_moregame.setVisible(paramManager.isMoreGame());
        */

        /*if (PurchaseAndroid.payType == PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY) {
            this.btn_invite = new SettingButton("");
            this.btn_invite.setTitle("Invite");
            this.btn_invite.setPosition(cc.winSize.width / 2, 450);
            this.addChild(this.btn_invite);
            this.btn_invite.setClickListener(this, function (sender) {
                facebook.invite();
            });
            if (!this.btn_moregame.isVisible()) {
                this.btn_invite.y = this.btn_moregame.y;
            }
            var fbIcon = autoSpriteFrameController.getSpriteFromSpriteName('icon_fb_invite.png');
            fbIcon.x = this.btn_invite.width / 4 - 10;
            fbIcon.y = this.btn_invite.height / 2;
            this.btn_invite.addChild(fbIcon);
        }*/


        this.btn_back = uiUtil.createBigBtnWhite(stringUtil.getString(1030), this, function () {
            this.removeFromParent();
        });
        this.btn_back.setPosition(cc.winSize.width / 2, 150);
        this.addChild(this.btn_back);
        cc.eventManager.addListener(cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                return true;
            },
            onTouchMoved: function (touch, event) {
            },
            onTouchEnded: function (touch, event) {
                self.closeMusicSelector();
                self.closeLanguageSelector();
            }
        }), this);

        var self = this;
        var keyboardListener = cc.EventListener.create({
            event: cc.EventListener.KEYBOARD,
            onKeyReleased: function (keyCode, event) {
                cc.log("pressed Keycode = " + keyCode);
                if (keyCode == cc.KEY.back) {
                    self.removeFromParent();
                }
            }
        });
        cc.eventManager.addListener(keyboardListener, this);
    },
    onEnter: function () {
        this._super();
        var runningScene = cc.director.getRunningScene ? cc.director.getRunningScene() : null;
        var keyEventLayer = runningScene ? runningScene.getChildByName("keyEventLayer") : null;
        if (keyEventLayer) {
            cc.v("pause eventManager");
            cc.eventManager.pauseTarget(keyEventLayer);
        }
    },
    onExit: function () {
        this._super();
        var runningScene = cc.director.getRunningScene ? cc.director.getRunningScene() : null;
        var keyEventLayer = runningScene ? runningScene.getChildByName("keyEventLayer") : null;
        if (keyEventLayer) {
            keyEventLayer.scheduleOnce(function () {
                cc.v("resume eventManger");
                cc.eventManager.resumeTarget(keyEventLayer);
            }, 0.1)
        }
    },
    openMusicSelector: function (nowState) {
        var self = this;
        if (this.btn_music_selector)
            return;
        this.btn_music_selector = new SettingButton(nowState ? stringUtil.getString(1250) : stringUtil.getString(1249));
        this.btn_music_selector.on = !nowState;
        this.btn_music_selector.setClickListener(this, function (sender) {
            var on = sender.on;
            if (on) {
                audioManager.setSound(on);
                audioManager.playMusic(audioManager.music.MAIN_PAGE, true);
            } else {

                audioManager.stopMusic(audioManager.music.MAIN_PAGE, true);
                audioManager.setSound(on);
            }
            self.refreshThisLayer();
        });
        this.btn_music_selector.setPosition(this.btn_music.x, this.btn_music.y - this.btn_music.height);
        this.addChild(this.btn_music_selector);
    },
    closeMusicSelector: function () {
        if (this.btn_music_selector) {
            this.btn_music_selector.removeFromParent();
            this.btn_music_selector = null;
        }
    },
    openLanguageSelector: function () {
        var self = this;
        if (this.languageSelector)
            return;
        this.languageSelector = new cc.Node();
        var listView = new ccui.ListView();

        var btn = new ccui.Button("btn_language_bg.png", "btn_language_bg_opa.png", "btn_language_bg.png", 1);
        btn.setName("btn");
        btn.setAnchorPoint(0, 0);

        var label = new ccui.Text("test", "", uiUtil.fontSize.COMMON_2);
        label.setColor(cc.color(0, 0, 0, 0));
        label.setName("label");
        label.setPosition(btn.width / 2, btn.height / 2);

        var listItem = new ccui.Layout();
        listItem.addChild(btn);
        listItem.addChild(label, 1);
        listItem.setContentSize(272, 62);

        listView.setItemModel(listItem);
        listView.setContentSize(272, 340);
        listView.setAnchorPoint(0.5, 1);


        var lans = utils.clone(lanSupports);
        lans.push("zh-Hant");
        for (var key in lans) {
            if (lans[key] != this.lan)
                listView.pushBackDefaultItem();
        }

        var items = listView.getItems();
        var lanIndex = 0;
        for (var key in items) {
            if (lans[lanIndex] == this.lan) {
                lanIndex++;
            }
            items[key].getChildByName("label").setString(stringName[lans[lanIndex]]);
            var button = items[key].getChildByName("btn");
            button.lan = lans[lanIndex];
            button.addTouchEventListener(function (sender, type) {
                if (type == ccui.Widget.TOUCH_ENDED) {
                    cc.sys.localStorage.setItem("language", sender.lan);

                    if (jsb.fileUtils.isFileExist("src/data/string/string_" + sender.lan + ".js") || jsb.fileUtils.isFileExist("src/data/string/string_" + sender.lan + ".jsc")) {
                        __cleanScript("src/data/string/string_" + self.lan + ".js");
                        require("src/data/string/string_" + sender.lan + ".js")
                        if (sender.lan == cc.sys.LANGUAGE_ARABIC) {
                            cc.RTL = true;
                        } else {
                            cc.RTL = false;
                        }
                    }
                    uiUtil.fontFamily.normal = cc.sys.isNative && ((cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_CHINESE && !cc.sys.LANGUAGE_CHINESE_HANT) || cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_ENGLISH) ? "FZDaHei-B02S" : ""

                    cc.director.runScene(new MenuScene(true));
                }
            }, this)

            lanIndex++;

        }

        this.languageSelector.addChild(listView);
        this.languageSelector.setPosition(cc.pSub(this.btn_lan.getPosition(), cc.p(0, this.btn_lan.height / 2)));
        this.addChild(this.languageSelector);
    },
    closeLanguageSelector: function () {
        if (this.languageSelector) {
            this.languageSelector.removeFromParent();
            this.languageSelector = null;
        }
    },
    refreshThisLayer: function () {
        var parent = this.getParent();
        this.removeFromParent();
        parent.addChild(new SettingLayer());
    },
    onEnter: function () {
        this._super();
    },
    onExit: function () {
        this._super();
    },
});


var MenuScene = BaseScene.extend({
    ctor: function (openSetting) {
        this._super(APP_NAVIGATION.MENU);
        this.openSetting = openSetting;
        this.sceneName = "MenuScene";

        autoSpriteFrameController.addSpriteFrames("res/ui.plist");
        autoSpriteFrameController.addSpriteFrames("res/menu.plist");
        autoSpriteFrameController.addSpriteFrames("res/icon.plist");
        autoSpriteFrameController.addSpriteFrames("res/npc.plist");
        autoSpriteFrameController.addSpriteFrames("res/medal.plist");


    },
    onEnter: function () {
        this._super();

        Record.validateRecord();

        var layer = new MenuLayer();
        this.addChild(layer);

        if (this.openSetting) {
            var settingLayer = new SettingLayer();
            this.addChild(settingLayer);
        }
    },
    onExit: function () {
        this._super();
    }
});
