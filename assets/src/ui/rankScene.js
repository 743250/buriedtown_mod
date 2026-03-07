/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */
var RankLayer = cc.Layer.extend({
    ctor: function () {
        this._super();

        this.lineWidth = 540;
        this.lineHeight = 60;

        this.initView();
        return true;
    },

    onExit: function () {
        this._super();
    },

    onEnter: function () {
        this._super();
    },

    initView: function () {
        var bg = autoSpriteFrameController.getSpriteFromSpriteName("#rank_bg.png");
        bg.x = cc.winSize.width / 2;
        bg.y = cc.winSize.height / 2;
        this.addChild(bg);

        var rankLogoName;
        if (cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_CHINESE) {
            rankLogoName = 'top_logo_zh.png';
        } else {
            rankLogoName = 'top_logo_en.png';
        }
        var rankLogo = autoSpriteFrameController.getSpriteFromSpriteName(rankLogoName);
        rankLogo.x = cc.winSize.width / 2;
        rankLogo.y = 1038;
        rankLogo.scale = 0.5;
        this.addChild(rankLogo);

        var lastScore = Record.getLastScore() || {};
        lastScore.uuid = Record.getUUID();
        lastScore.username = Record.getUsername();
        networkUtil.requestData("getRankList", lastScore, this, function (response) {
            uiUtil.dismissLoadingView();
            if (response.statusCode === 200) {
                var data = response.data;
                createDataView(data);

            } else {
                cc.e(JSON.stringify(response));
            }
        });
        uiUtil.showLoadingView();

        var self = this;
        var createDataView = function (data) {
            if (data.top) {
                var table1 = self.createTable(data.top, false);
                table1.setAnchorPoint(0.5, 1);
                table1.x = bg.width / 2;
                table1.y = bg.height / 2 + 400;
                bg.addChild(table1);
            }

            if (data.best) {
                var table2 = self.createTable(data.best, true);
                table2.setAnchorPoint(0.5, 1);
                table2.x = bg.width / 2;
                table2.y = bg.height / 2 + 40;
                bg.addChild(table2);
            }

            if (data.thisTime && data.thisTime.index) {
                var userLine = self.createOneLine(data.thisTime, false);
                userLine.setAnchorPoint(0.5, 1);
                userLine.x = bg.width / 2;
                userLine.y = bg.height / 2 - 330;
                bg.addChild(userLine);
            }
        };


        var title2 = autoSpriteFrameController.getSpriteFromSpriteName("#title_best.png");
        title2.setAnchorPoint(0.5, 0);
        title2.x = bg.width / 2;
        title2.y = bg.height / 2 + 40;
        bg.addChild(title2);


        var title3 = autoSpriteFrameController.getSpriteFromSpriteName("#title_this_time.png");
        title3.setAnchorPoint(0.5, 0);
        title3.x = bg.width / 2;
        title3.y = bg.height / 2 - 330;
        bg.addChild(title3);


        var btn = uiUtil.createCommonBtnBlack(stringUtil.getString(1193), this, function () {
            cc.director.runScene(new MenuScene());
        });
        btn.setPosition(bg.width / 4, bg.height / 2 - 500);
        bg.addChild(btn);
        btn.setName("btn");

        var btn2 = uiUtil.createCommonBtnBlack(stringUtil.getString(1235), this, function () {
            cc.director.pushScene(new RankFamousScene());
        });
        btn2.setPosition(bg.width / 4 * 3, bg.height / 2 - 500);
        bg.addChild(btn2);
        btn.setName("btn2");

        var btnInfo = uiUtil.createSpriteBtn({normal: "icon_info.png"}, this, function () {
            this.showInfoDialog();
        });
        btnInfo.x = 576;
        btnInfo.y = 1066;
        bg.addChild(btnInfo);

        //var btn3 = uiUtil.createCommonBtnBlack(stringUtil.getString(1247), this, function () {
        //})
        //btn3.setPosition(bg.width / 2, bg.height / 2 - 500);
        //bg.addChild(btn3);
        //btn3.setPosition(btn3);

    },

    showInfoDialog: function () {
        var config = {
            title: {title: stringUtil.getString(1260)},
            content: {des: stringUtil.getString(1261)},
            action: {btn_1: {}}
        };
        config.action.btn_1.txt = stringUtil.getString(1030);

        var dialog = new DialogSmall(config);
        dialog.show();
    },

    getTimeStr: function (time) {
        var d = Math.floor(time / (24 * 60 * 60));
        var dTime = time % (24 * 60 * 60);
        var h = Math.floor(dTime / (60 * 60));
        var hTime = dTime % (60 * 60);
        var m = Math.floor(hTime / 60);
        var mTime = hTime % 60;
        var s = Math.floor(mTime);

        var hourStr = "";
        if (h < 10) {
            hourStr += "0" + h;
        } else {
            hourStr += h;
        }
        var minuteStr = "";
        if (m < 10) {
            minuteStr += "0" + m;
        } else {
            minuteStr += m;
        }
        return stringUtil.getString(1160, d, hourStr, minuteStr);
    },
    createOneLine: function (info, highlightMyself) {
        var node = new cc.Node();
        node.width = this.lineWidth;
        node.height = this.lineHeight;

        var rank = info.index;
        var labelIndex = new cc.LabelTTF(rank, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        labelIndex.setAnchorPoint(0.5, 0.5);
        labelIndex.x = 20;
        labelIndex.y = node.height / 2;
        node.addChild(labelIndex, 1);

        if (rank <= 3) {
            labelIndex.setColor(UITheme.colors.WHITE);

            var indexBg = autoSpriteFrameController.getSpriteFromSpriteName("#title_top.png");
            indexBg.x = labelIndex.x;
            indexBg.y = labelIndex.y;
            node.addChild(indexBg);

        } else {
            labelIndex.setColor(UITheme.colors.TEXT_TITLE);
        }

        var countryCode = info.countryCode || "CN";
        var flagName = utils.getFlagName(countryCode);

        var flag = new cc.Sprite(flagName);
        flag.setAnchorPoint(0, 0.5);
        flag.x = 45;
        flag.y = node.height / 2;
        flag.width = 48;
        flag.height = 48;
        node.addChild(flag);

        var usernameStr = info.username;
        if (!usernameStr) {
            var uuid = info.uuid;
            usernameStr = ("" + uuid).substr(8);
        }
        var username = new cc.LabelTTF(usernameStr, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        username.setAnchorPoint(0, 0.5);
        username.x = flag.x + flag.width + 5;
        username.y = node.height / 2;
        username.setColor(UITheme.colors.TEXT_TITLE);
        node.addChild(username);

        var time = new cc.LabelTTF(this.getTimeStr(info.time), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        time.setAnchorPoint(1, 0.5);
        time.x = node.width - 3;
        time.y = node.height / 2;
        time.setColor(UITheme.colors.TEXT_TITLE);
        node.addChild(time);

        if (highlightMyself) {
            if (info.uuid == Record.getUUID()) {
                var drawNode = new cc.DrawNode();
                node.addChild(drawNode);
                drawNode.drawRect(cc.p(0, 0), cc.p(node.width, node.height), cc.color(0, 0, 0, 100), 1, cc.color(0, 0, 0, 10));

            }
        }

        return node;
    },
    createTable: function (list, highlightMySelf) {
        var node = new cc.Node();
        node.width = this.lineWidth;
        node.height = this.lineHeight * list.length;

        var self = this;
        list.forEach(function (info, index) {
            var n = self.createOneLine(info, highlightMySelf);
            n.setAnchorPoint(0.5, 1);
            n.x = node.width / 2;
            n.y = node.height - index * self.lineHeight;
            node.addChild(n);
        });

        return node;
    }

});


var RankScene = BaseScene.extend({
    ctor: function () {
        this._super(APP_NAVIGATION.MENU_SUB);
        autoSpriteFrameController.addSpriteFrames("res/rank.plist");
    },
    onEnter: function () {
        this._super();
        var layer = new RankLayer();
        this.addChild(layer);
    },
    onExit: function () {
        this._super();
    }
});
