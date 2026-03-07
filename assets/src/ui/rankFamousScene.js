/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */
var RankFamousLayer = cc.Layer.extend({
    ctor: function () {
        this._super();

        return true;
    },

    onExit: function () {
        this._super();
    },

    onEnter: function () {
        this._super();

        this.bg = autoSpriteFrameController.getSpriteFromSpriteName("#rank_famous_bg.png");
        this.bg.x = cc.winSize.width / 2;
        this.bg.y = cc.winSize.height / 2;
        this.addChild(this.bg);

        this.data = [];
        this.skip = 0;
        this.isEnd = false;
        this.createTableView();
        this.requestData(function () {
            uiUtil.dismissLoadingView();
        });
        uiUtil.showLoadingView();

        var btn = uiUtil.createCommonBtnBlack(stringUtil.getString(1193), this, function () {
            //cc.director.runScene(new RankScene());
            cc.director.popScene();
        });
        btn.setPosition(this.bg.width / 2, this.bg.height / 2 - 500);
        this.bg.addChild(btn);
        btn.setName("btn");

        var btnInfo = uiUtil.createSpriteBtn({normal: "icon_info.png"}, this, function () {
            this.showInfoDialog();
        });
        btnInfo.x = 576;
        btnInfo.y = 1066;
        this.bg.addChild(btnInfo);

    },

    showInfoDialog: function () {
        var config = {
            title: {title: stringUtil.getString(1262)},
            content: {des: stringUtil.getString(1263)},
            action: {btn_1: {}}
        };
        config.action.btn_1.txt = stringUtil.getString(1030);

        var dialog = new DialogSmall(config);
        dialog.show();
    },

    updateView: function () {
        var offsetPos = this.tableView.getContentOffset();
        var contentSize = this.tableView.getContentSize();
        this.tableView.reloadData();
        var newContentSize = this.tableView.getContentSize();
        offsetPos.y -= newContentSize.height - contentSize.height;
        this.tableView.setContentOffset(offsetPos);

        this.tbSliderBar.updateBarSize(this.tableView.getViewSize().height / this.tableView.getContentSize().height);
    },
    requestData: function (doneCb) {
        this.loading = true;
        var self = this;
        networkUtil.requestData("getFamousList", {
            skip: this.skip,
            limit: 10
        }, this, function (response) {
            if (response.statusCode === 200) {
                var newData = response.data;
                self.data = self.data.concat(newData);
                self.updateView();
                self.skip = self.data.length;
                self.isEnd = newData.length === 0;
            } else {
                cc.e(JSON.stringify(response));
            }
            self.loading = false;
            if (doneCb) {
                doneCb();
            }
        });

    },
    createTableView: function () {
        this.tableView = new cc.TableView(this, cc.size(610, 840));
        this.tableView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        this.tableView.setVerticalFillOrder(cc.TABLEVIEW_FILL_TOPDOWN);
        this.tableView.x = 10;
        this.tableView.y = 100;
        this.tableView.setDelegate(this);
        this.bg.addChild(this.tableView);
        this.tableView.reloadData();

        this.tbSliderBar = new SliderBar(cc.size(10, 840));
        this.tbSliderBar.setAnchorPoint(1, 0);
        this.tbSliderBar.x = this.bg.width - 10;
        this.tbSliderBar.y = 100;
        this.bg.addChild(this.tbSliderBar);
        this.tbSliderBar.updateBarSize(this.tableView.getViewSize().height / this.tableView.getContentSize().height);
        this.tbSliderBar.onScroll(1);
    },
    tableCellTouched: function (table, cell) {
        cc.log("cell touched at index: " + cell.getIdx());
    },

    tableCellSizeForIndex: function (table, idx) {
        return cc.size(610, 120);
    },

    tableCellAtIndex: function (table, idx) {
        var cell = table.dequeueCell();
        var size = this.tableCellSizeForIndex(idx);
        var leftEdge = 125;
        var rightEdge = size.width - 15;
        if (!cell) {
            cell = new cc.TableViewCell();

            var tombstone = autoSpriteFrameController.getSpriteFromSpriteName('icon_tombstone.png');
            tombstone.setAnchorPoint(0, 0.5);
            tombstone.x = 10;
            tombstone.y = size.height / 2;
            cell.addChild(tombstone);

            var username = new cc.LabelTTF('', uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
            username.setAnchorPoint(0, 0.5);
            username.x = leftEdge + 53;
            username.y = size.height - 35;
            username.setColor(UITheme.colors.TEXT_TITLE);
            username.setName('username');
            cell.addChild(username);

            var createTime = new cc.LabelTTF('', uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
            createTime.setAnchorPoint(1, 0.5);
            createTime.x = rightEdge;
            createTime.y = size.height - 35;
            createTime.setColor(UITheme.colors.TEXT_TITLE);
            createTime.setName('createTime');
            cell.addChild(createTime);

            var lastWord = new cc.LabelTTF('', uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(rightEdge - leftEdge, 0));
            lastWord.setAnchorPoint(0, 0.5);
            lastWord.x = leftEdge;
            lastWord.y = 25;
            lastWord.setColor(UITheme.colors.TEXT_TITLE);
            lastWord.setName('lastWord');
            cell.addChild(lastWord);
        }

        var info = this.data[idx];

        if (cell.getChildByName('flag')) {
            cell.removeChildByName('flag');
        }
        var countryCode = info.countryCode || "CN";
        var flagName = utils.getFlagName(countryCode);
        var flag = new cc.Sprite(flagName);
        flag.setAnchorPoint(0, 0.5);
        flag.x = leftEdge;
        flag.y = size.height - 35;
        flag.width = 48;
        flag.height = 48;
        cell.addChild(flag);
        flag.setName('flag');

        var usernameStr = info.username;
        if (!usernameStr) {
            var uuid = info.uuid;
            usernameStr = ("" + uuid).substr(8);
        }
        if (!info.createTime) {
            info.createTime = new Date().getTime();
        }

        var lastWord;
        if (info.lastWord) {
            var str = info.lastWord;
            var realLen = 0;
            var realStr = "";
            var len = 35;
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
                    realStr += "...";
                    break;
                }
            }
            lastWord = realStr;
        } else {
            lastWord = stringUtil.getString(1241);
        }
        lastWord = cc.formatStr("\"%s\"", lastWord);

        cell.getChildByName('username').setString(usernameStr);
        cell.getChildByName('createTime').setString(cc.formatStr('(?-%s)', new Date(info.createTime).format('YYYY.MM.dd')));
        cell.getChildByName('lastWord').setString(lastWord);

        return cell;
    },

    numberOfCellsInTableView: function (table) {
        return this.data.length;
    },
    scrollViewDidScroll: function (view) {
        if (this.tbSliderBar) {
            this.tbSliderBar.onScroll(view.getContentOffset().y / (view.getViewSize().height - view.getContentSize().height));
        }

        if (!this.isEnd && !this.loading && view.getContentOffset().y < 0 && view.getContentOffset().y >= -150) {
            this.requestData();
        }
    }

});


var RankFamousScene = BaseScene.extend({
    ctor: function () {
        this._super(APP_NAVIGATION.MENU_THIRD);
    },
    onEnter: function () {
        this._super();
        var layer = new RankFamousLayer();
        this.addChild(layer);
    },
    onExit: function () {
        this._super();
    }
});
