/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */
var RateLayer = cc.Layer.extend({
    ctor: function () {
        this._super();
        this.addChild(new cc.LayerColor(cc.color(0, 0, 0, 220)));

        var winsize = cc.director.getWinSize();

        var des = new cc.LabelTTF(stringUtil.getString(1275), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        des.setPosition(winsize.width / 2, winsize.height / 2 + 200);
        this.addChild(des, 1);

        var btn1 = uiUtil.createCommonBtnWhite(stringUtil.getString(1030), this, function () {
            CommonUtil.setRated();
            this.removeFromParent();
            CommonUtil.gotoAppstore();
        });
        btn1.setPosition(winsize.width / 2, des.y - 100);
        this.addChild(btn1);

        var btn2 = uiUtil.createCommonBtnWhite(stringUtil.getString(1270), this, function () {
            this.removeFromParent();
        });
        btn2.setPosition(winsize.width / 2, btn1.y - 100);
        this.addChild(btn2);

        var btn3 = uiUtil.createCommonBtnWhite(stringUtil.getString(1276), this, function () {
            CommonUtil.setRated();
            this.removeFromParent();
        });
        btn3.setPosition(winsize.width / 2, btn2.y - 100);
        this.addChild(btn3);
        cc.eventManager.addListener(cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                return true;
            },
            onTouchMoved: function (touch, event) {
            },
            onTouchEnded: function (touch, event) {
            }
        }), this);
    }
});
var EndLayer = cc.Layer.extend({
    ctor: function () {
        this._super();
        return true;
    },

    onExit: function () {
        this.uploadGameData();
        this._super();
    },

    onEnter: function () {
        this._super();

        var bg = autoSpriteFrameController.getSpriteFromSpriteName("#end_bg.png");
        bg.x = cc.winSize.width / 2;
        bg.y = cc.winSize.height / 2;
        this.addChild(bg);
        bg.setName("bg");

        var leftEdge = 42;
        var rightEdge = bg.width - leftEdge;

        var label1 = new cc.LabelTTF(stringUtil.getString(1226), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        label1.anchorX = 0;
        label1.x = leftEdge;
        label1.y = 736;
        bg.addChild(label1);

        var labelDay = new cc.LabelTTF(cc.timer.formatTime().d || "0", uiUtil.fontFamily.normal, 110);
        labelDay.setPosition(132, 630);
        labelDay.setColor(UITheme.colors.TEXT_TITLE);
        bg.addChild(labelDay);

        var timeStrArray = cc.timer.getTimeHourStr().split(':');
        var labelHour = new cc.LabelTTF(timeStrArray[0], uiUtil.fontFamily.normal, 110);
        labelHour.setPosition(320, 630);
        labelHour.setColor(UITheme.colors.TEXT_TITLE);
        bg.addChild(labelHour);

        var labelMinute = new cc.LabelTTF(timeStrArray[1], uiUtil.fontFamily.normal, 110);
        labelMinute.setPosition(508, 630);
        labelMinute.setColor(UITheme.colors.TEXT_TITLE);
        bg.addChild(labelMinute);

        var liveDays = cc.timer.formatTime().d;
        if (PurchaseAndroid.payType === PurchaseAndroid.PAY_TYPE_GOOGLE_PLAY && liveDays >= 30 && !CommonUtil.getRated()) {
            var r = new RateLayer();
            this.addChild(r);
        }

        var editText = new cc.EditBox(cc.size(343, 46), autoSpriteFrameController.getScale9Sprite("edit_text_bg.png", cc.rect(4, 4, 1, 1)));
        editText.setDelegate({
            editBoxReturn: function (editBox) {
                var str = editBox.getString();
                var reg = str.match(/[,|]/g);
                if (reg) {
                    uiUtil.showTinyInfoDialog(1234);
                    editBox.setString("");
                } else {
                    if (str) {
                        var realLen = 0;
                        var realStr = "";
                        var len = 12;
                        for (var i = 0; i < str.length; i++) {
                            var charCode = str.charCodeAt(i);

                            if (charCode >= 65 && charCode <= 90)
                                realLen += 1.5;
                            else if (charCode >= 0 && charCode <= 128)
                                realLen += 1;
                            else
                                realLen += 2;
                            realStr += str[i];
                            if (realLen >= len) {
                                break;
                            }
                        }
                        editBox.setString(realStr);
                        Record.setUsername(realStr);
                    }
                }
            }
        });
        editText.anchorX = 0;
        editText.x = leftEdge;
        editText.y = 786;
        bg.addChild(editText);
        editText.setName("editText");
        editText.setReturnType(cc.KEYBOARD_RETURNTYPE_SEND);
        editText.setPlaceHolder(stringUtil.getString(1161));
        var username = Record.getUsername();
        if (username) {
            editText.setString(username);
        }

        //var agreeStr = utils.splitLog(stringUtil.getString(1172), 70, 70).join("\n");
        var agreeStr = stringUtil.getString(1172);
        var agreementLabel = new cc.LabelTTF(agreeStr, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3 - 4, cc.size(500, 0), cc.TEXT_ALIGNMENT_CENTER);
        agreementLabel.setAnchorPoint(0.5, 0.5);
        agreementLabel.setPosition(bg.width / 2, 42);
        bg.addChild(agreementLabel);

        var checkBox = new CheckBox(Record.getAgreement(), "checkbox_bg.png", "checkbox_on.png");
        checkBox.setClickListener(this, function (sender) {
            var on = sender.on;
            Record.setAgreement(on)
        });
        checkBox.setAnchorPoint(1, 0.5);
        checkBox.x = agreementLabel.x - agreementLabel.width / 2 - 3;
        checkBox.y = agreementLabel.y;
        bg.addChild(checkBox);
        checkBox.setName("agreement");

        var btn1 = uiUtil.createSpriteBtn({normal: "btn_share.png"}, this, function () {
            var url;
            //var lan = cc.sys.language;
            //if (lan === cc.sys.LANGUAGE_CHINESE) {
            //    url = "http://bt.dice7.net";
            //} else {
            url = "https://itunes.apple.com/app/id1014920360";
            //}
            if (cc.sys.os == cc.sys.OS_IOS) {
                CommonUtil.share(stringUtil.getString(1166, cc.timer.getFinalTimeStr()), url, "");
            } else if (cc.sys.os == cc.sys.OS_ANDROID) {
                CommonUtil.share(stringUtil.getString(1166, cc.timer.getFinalTimeStr()), "http://www.locojoy.com", stringUtil.getString(1231));
            }
        });
        btn1.x = leftEdge + (rightEdge - leftEdge) / 4 * 1;
        btn1.y = 432;
        bg.addChild(btn1);
        btn1.setName("btn_1");
        btn1.setVisible(false);

        var btn2 = uiUtil.createSpriteBtn({normal: "btn_home.png"}, this, function () {
            game.newGame();
            cc.director.runScene(new MenuScene());
        });
        btn2.x = leftEdge + (rightEdge - leftEdge) / 4 * 2;
        btn2.y = 432;
        bg.addChild(btn2);
        btn2.setName("btn2");


        if (!CommonUtil.adStatus) {
            btn1.setVisible(true);
            btn2.x = leftEdge + (rightEdge - leftEdge) / 4 * 3;
        }

        if (cc.sys.isNative && CommonUtil.getMetaData("wxId") !== "null") {
            networkUtil.requestData("getAdStatus", null, this, function (response) {
                if (response.statusCode === 200) {
                    game.adStatus = response.data;
                    CommonUtil.adStatus = game.adStatus;
                    if (!game.adStatus) {
                        btn1.setVisible(true);
                        btn2.x = leftEdge + (rightEdge - leftEdge) / 4 * 3;
                        networkUtil.requestData("canGetItemByShare", {userId: CommonUtil.getUUID()}, this, function (res) {
                            if (res.statusCode == 200) {
                                if (res.data["canGetItem"]) {
                                    var shareLabel = new cc.LabelTTF(stringUtil.getString(1202), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(600, 0), cc.TEXT_ALIGNMENT_CENTER);
                                    shareLabel.setAnchorPoint(0.5, 1);
                                    shareLabel.setPosition(bg.width / 2, 320);
                                    bg.addChild(shareLabel);
                                } else {
                                    var timeRetain = res.data["timeRetain"];
                                    var timeStr = utils.getTimeShareRetainStr(timeRetain);
                                    var shareLabel = new cc.LabelTTF(stringUtil.getString(1242, timeStr), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(600, 0), cc.TEXT_ALIGNMENT_CENTER);
                                    shareLabel.setAnchorPoint(0.5, 1);
                                    shareLabel.setPosition(bg.width / 2, 320);
                                    bg.addChild(shareLabel);

                                    var scheduleFunc = function (dt) {
                                        timeRetain -= 1000;
                                        if (timeRetain >= 0) {
                                            timeStr = utils.getTimeShareRetainStr(timeRetain);
                                            shareLabel.setString(stringUtil.getString(1242, timeStr));
                                        } else {
                                            timeRetain = 0;
                                            networkUtil.requestData("canGetItemByShare", {userId: CommonUtil.getUUID()}, this, function (scheduleRes) {
                                                if (scheduleRes.statusCode == 200 && scheduleRes.data["canGetItem"]) {
                                                    shareLabel.setString(stringUtil.getString(1202));
                                                } else {
                                                    shareLabel.setString(stringUtil.getString(1242, utils.getTimeShareRetainStr(scheduleRes.data["timeRetain"])));
                                                }
                                                this.unschedule(scheduleFunc);
                                            })
                                        }
                                    }
                                    this.schedule(scheduleFunc, 1);
                                }
                            }
                        })
                    }
                } else {
                    cc.e(JSON.stringify(response));
                }
            });
        }


        this.newGetMedal = Medal.getCompletedForOneGame();
        if (this.newGetMedal) {
            this.showMedalGet();
        }
    },
    showMedalGet: function () {

        var self = this;

        var medal = this.newGetMedal.shift();
        if (medal) {
            var medalDialog = new medalShowDialog(medal);
            medalDialog.setPosition(0, cc.winSize.height - 250);
            //medalDialog.runAction(cc.sequence(cc.moveBy(1, 0, -250), cc.delayTime(3), cc.moveBy(1, 0, 250), cc.callFunc(function () {
            medalDialog.setCascadeOpacityEnabled(true);
            medalDialog.setOpacity(0);
            medalDialog.runAction(cc.sequence(cc.fadeIn(1), cc.delayTime(2), cc.fadeOut(1), cc.callFunc(function () {
                medalDialog.removeFromParent();
                self.showMedalGet();
            })));
            this.addChild(medalDialog);
        }
    },

    uploadGameData: function () {

        var self = this;
        var uploadData = function (d) {
            var agreementOn = self.getChildByName("bg").getChildByName("agreement").on;
            if (agreementOn) {
                cc.d("updateGameData:" + JSON.stringify(d));
                networkUtil.requestData("uploadGameData", data);
            }
        };

        var data = {};
        data.uuid = Record.getUUID();
        data.username = Record.getUsername();
        data.time = cc.timer.time;
        data.deviceId = CommonUtil.getUUID();
        //data.siteIds = Object.keys(player.map.siteMap);
        //data.npcIds = Object.keys(player.map.npcMap);
        //
        //var obj = {};
        //
        //var buildIds = Object.keys(player.room.map);
        //buildIds.forEach(function (bid) {
        //    obj[bid] = player.room.getBuildLevel(bid);
        //});
        //data.build = obj;
        //
        //obj = {};
        //player.storage.forEach(function (itemId, num) {
        //    obj[itemId.id] = num;
        //});
        //data.storage = obj;


        if (cc.sys.isNative) {
            data.countryCode = CommonUtil.getLocaleCountryCode();
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    if (position) {
                        var geo = [
                            position.coords.latitude,
                            position.coords.longitude
                        ];
                        data.geo = geo;
                    } else {
                        data.countryCode = 'CN';
                    }
                    uploadData(data);
                }, function (error) {

                    switch (error.code) {
                        case error.TIMEOUT:
                            cc.log("A timeout occured! Please try again!");
                            break;
                        case error.POSITION_UNAVAILABLE:
                            cc.log('We can\'t detect your location. Sorry!');
                            break;
                        case error.PERMISSION_DENIED:
                            cc.log('Please allow geolocation access for this to work.');
                            break;
                        case error.UNKNOWN_ERROR:
                            cc.log('An unknown error occured!');
                            break;
                    }

                    data.countryCode = 'CN';
                    uploadData(data);
                }, {
                    // 指示浏览器获取高精度的位置，默认为false
                    //enableHighAcuracy: true,
                    // 指定获取地理位置的超时时间，默认不限时，单位为毫秒
                    timeout: 5000,
                    // 最长有效期，在重复获取地理位置时，此参数指定多久再次获取位置。
                    maximumAge: 3000
                });

                return;
            } else {
                data.countryCode = 'CN';
            }
        }
        var lastScore = {};
        lastScore.time = data.time;
        lastScore.countryCode = data.countryCode;
        Record.setLastScore(lastScore);

        uploadData(data);
    }

});


var EndScene = BaseScene.extend({
    ctor: function () {
        this._super(APP_NAVIGATION.GAME);
        autoSpriteFrameController.addSpriteFrames("res/end.plist");
    },
    onEnter: function () {
        this._super();
        var layer = new EndLayer();
        this.addChild(layer);
    },
    onExit: function () {
        this._super();
    }
});
