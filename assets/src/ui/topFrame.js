/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */
var getTopFrameRuntimePlayer = function () {
    return GameRuntime.getPlayer();
};

var getTopFrameRuntimeTimer = function () {
    return GameRuntime.getTimer();
};

var getTopFrameRuntimeEmitter = function () {
    return GameRuntime.getEmitter();
};

var getTopFrameRuntimeRecord = function () {
    return GameRuntime.getRecord();
};

var formatTemperatureValue = function (value) {
    value = Number(value) || 0;
    value = value < 0 ? Math.ceil(value) : Math.floor(value);
    return "" + value;
};

var fitTopFrameTitleLabel = function (label, maxWidth, minFontSize) {
    if (!label || !(maxWidth > 0)) {
        return;
    }

    if (label._topFrameBaseFontSize === undefined) {
        label._topFrameBaseFontSize = label.getFontSize ? label.getFontSize() : uiUtil.fontSize.COMMON_3;
    }

    if (label.setScale) {
        label.setScale(1);
    }
    if (label.setFontSize) {
        label.setFontSize(label._topFrameBaseFontSize);
    }

    minFontSize = minFontSize || uiUtil.fontSize.COMMON_4;
    var fontSize = label.getFontSize ? label.getFontSize() : label._topFrameBaseFontSize;
    while (fontSize > minFontSize && label.width > maxWidth) {
        fontSize -= 1;
        if (label.setFontSize) {
            label.setFontSize(fontSize);
        } else {
            break;
        }
    }

    if (label.width > maxWidth && label.width > 0 && label.setScale) {
        label.setScale(maxWidth / label.width);
    }
};

var fitTopFrameStatusDialogTitle = function (dialog) {
    if (!dialog || !dialog.titleNode) {
        return;
    }

    var title = dialog.titleNode.getChildByName("title");
    if (title) {
        fitTopFrameTitleLabel(title, dialog.rightEdge - title.x, uiUtil.fontSize.COMMON_3);
    }

    var txt1 = dialog.titleNode.getChildByName("txt_1");
    if (txt1) {
        fitTopFrameTitleLabel(txt1, dialog.rightEdge - txt1.x, uiUtil.fontSize.COMMON_4);
    }
};

var TopFrameNode = cc.Node.extend({
    ctor: function () {
        this._super();
        var runtimePlayer = getTopFrameRuntimePlayer();

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

        var weather = new StatusButton(btnSize, "#icon_weather_" + runtimePlayer.weather.weatherId + ".png", runtimePlayer.weather.getWeatherName(), {
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
        getTopFrameRuntimeEmitter().on("weather_change", function (weatherId) {
            weather.updateView("icon_weather_" + weatherId + ".png", getTopFrameRuntimePlayer().weather.getWeatherName());
        });

        var day = new StatusButton(btnSize, "#icon_day.png", "", {scale: 0.5});
        day.setClickListener(this, function (sender) {
            var label = sender.getChildByName("label");
            showStatusDialog(1, getTopFrameRuntimeTimer().getTimeDayStr(), sender.spriteFrameName);
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
            RoleTalentUiHelper.showRoleTalentDialog(this);
        });
        roleTalent.setPosition(this.firstLine.getContentSize().width / 12 * 7, this.firstLine.getContentSize().height / 2);
        roleTalent.setName("role_talent");
        this.firstLine.addChild(roleTalent);

        this.updateByTime();

        var temperature = new StatusButton(btnSize, "#icon_temperature_0.png", formatTemperatureValue(memoryUtil.decode(runtimePlayer.temperature)), {scale: 0.5});
        temperature.setClickListener(this, function (sender) {
            var label = sender.getChildByName("label");
            showStatusDialog(3, label.getString() + "℃", sender.spriteFrameName);
        });
        temperature.setPosition(this.firstLine.width / 12 * 11, this.firstLine.height / 2);
        //temperature.setPosition(btnSize.width*4.5, this.firstLine.getContentSize().height / 2); //TODO MrC 游戏顶部菜单添加一个MoreGame按钮区域，原菜单调整坐标
        temperature.setName("temperature");
        this.firstLine.addChild(temperature);
        getTopFrameRuntimeEmitter().on("temperature_change", function (value) {
            temperature.updateView(null, formatTemperatureValue(memoryUtil.decode(getTopFrameRuntimePlayer().temperature)));
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
            getTopFrameRuntimeEmitter().on(attr + "_change", function (value) {
                btn.updateAttrBtn();
            });
            btn.updateAttrBtn = function () {
                if (cc.sys.isObjectValid(btn)) {
                    var buttonPlayer = getTopFrameRuntimePlayer();
                    btn.updateView(
                        reversPercentage ? 1 - buttonPlayer.getAttrPercentage(attr) : buttonPlayer.getAttrPercentage(attr),
                        needStatusStr ? buttonPlayer.getAttrStr(attr) : null
                    );
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
        getTopFrameRuntimeEmitter().on("logChanged", function (msg) {
            if (cc.sys.isObjectValid(self.thirdLine)) {
                self.thirdLine.updateLog(msg.txt);
                self.logTablebg.getChildByName("logView").addLog(msg);
            }
        });

        return true;
    },
    updateByTime: function () {
        var runtimeTimer = getTopFrameRuntimeTimer();
        var timeObj = runtimeTimer.formatTime();

        var seasonStr = stringUtil.getString(3000);
        var s = runtimeTimer.getSeason(timeObj);
        this.firstLine.getChildByName("season").updateView("#icon_season_" + s + ".png", seasonStr[s]);
        this.firstLine.getChildByName("day").updateView(null, runtimeTimer.formatTime().d + 1);
        this.firstLine.getChildByName("time").updateView(null, runtimeTimer.getTimeHourStr());
    },

    onExit: function () {
        this._super();
        getTopFrameRuntimeEmitter().off("logChanged");
        if (this.tcb) {
            getTopFrameRuntimeTimer().removeTimerCallback(this.tcb);
        }
    },

    onEnter: function () {
        this._super();
        var self = this;
        var runtimeEmitter = getTopFrameRuntimeEmitter();
        if (runtimeEmitter.listeners("logChanged").length < 1) {
            runtimeEmitter.on("logChanged", function (msg) {
                self.thirdLine.updateLog(msg.txt);
                self.logTablebg.getChildByName("logView").addLog(msg);
            });
        }

        this.tcb = getTopFrameRuntimeTimer().addTimerCallback(new TimerCallback(60, this, {
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
    fitTopFrameStatusDialogTitle(dialog);
    fitTopFrameStatusDialogTitle(dialog);
    pauseTimeWhileDialogVisible(dialog);
    dialog.show();
};

var pauseTimeWhileDialogVisible = function (dialog) {
    var runtimeTimer = getTopFrameRuntimeTimer();
    if (!runtimeTimer) {
        return;
    }

    runtimeTimer.pause();
    var oldDismissListener = dialog.onDismissListener;
    dialog.setOnDismissListener({
        target: dialog,
        cb: function () {
            if (oldDismissListener && oldDismissListener.cb) {
                oldDismissListener.cb.call(oldDismissListener.target);
            }
            runtimeTimer.resume();
        }
    });
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
    var runtimePlayer = getTopFrameRuntimePlayer();
    if (attrWithMaxValue[attr]) {
        config.title.txt_1 = cc.formatStr(config.title.txt_1, memoryUtil.decode(runtimePlayer[attr]) + "/" + memoryUtil.decode(runtimePlayer[attr + "Max"]));
    } else {
        config.title.txt_1 = runtimePlayer.getAttrStr(attr);
    }
    config.content.des = strConfig.des;
    var dialog = new DialogSmall(config);
    dialog.autoDismiss = false;

    var des = dialog.contentNode.getChildByName('des');

    var buffNodeList = [];

    var clearBuffRows = function () {
        while (buffNodeList.length > 0) {
            var buffNode = buffNodeList.pop();
            if (buffNode && typeof buffNode.removeFromParent === "function") {
                buffNode.removeFromParent();
            }
        }
    };

    var addBuffRow = function (text, y, color) {
        var label = new cc.LabelTTF(text, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3, cc.size(dialog.rightEdge - dialog.leftEdge, 0));
        label.anchorX = 0;
        label.anchorY = 1;
        label.x = dialog.leftEdge;
        label.y = y;
        label.setColor(color);
        dialog.contentNode.addChild(label);
        buffNodeList.push(label);
        return label;
    };

    var updateBuff = function () {
        clearBuffRows();

        var displayBuffs = [];
        if (runtimePlayer.buffManager && typeof runtimePlayer.buffManager.getDisplayBuffsByAttr === "function") {
            displayBuffs = runtimePlayer.buffManager.getDisplayBuffsByAttr(attr);
        }
        if (!displayBuffs || displayBuffs.length === 0) {
            return;
        }

        var currentY = des.y - des.height - 10;
        displayBuffs.forEach(function (buffInfo) {
            var color = buffInfo.isDebuff ? UITheme.colors.TEXT_ERROR : UITheme.colors.TEXT_BUFF;
            var effectText = buffInfo.title
                ? (stringUtil.getString(1296, buffInfo.title) + buffInfo.description)
                : buffInfo.description;
            var effectLabel = addBuffRow(effectText, currentY, color);
            currentY = effectLabel.y - effectLabel.height - 6;

            if (buffInfo.durationText) {
                var durationLabel = addBuffRow(buffInfo.durationText, currentY, color);
                currentY = durationLabel.y - durationLabel.height - 8;
            }
        });
    };

    updateBuff();

    var storage;
    if (runtimePlayer.isAtHome()) {
        storage = runtimePlayer.storage;
    } else {
        if (runtimePlayer.tmpBag) {
            storage = runtimePlayer.tmpBag;
        } else {
            storage = runtimePlayer.bag;
        }
    }

    //fix bug: NPC交易时快捷使用物品带来的不正确
    if (!runtimePlayer.tmpBag) {
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
            var res = runtimePlayer.useItem(storage, itemId);
            if (res.result) {
                itemTableView.updateData();
                itemTableView.reloadData();
                updateBuff();
                getTopFrameRuntimeRecord().saveAll();
            } else {
                cc.e("useItem fail " + res.msg);
            }
        };

        getTopFrameRuntimeEmitter().on("btn_1_click", onItemUse);
        dialog.setOnDismissListener({
            target: dialog, cb: function () {
                getTopFrameRuntimeEmitter().off('btn_1_click', onItemUse);
            }
        });
    }

    pauseTimeWhileDialogVisible(dialog);
    dialog.show();
};
