/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */
var ChooseLayer = cc.Layer.extend({
    ctor: function () {
        this._super();

        var titleRole = new cc.LabelTTF(stringUtil.getString(1310), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        titleRole.x = cc.winSize.width / 2;
        titleRole.y = cc.visibleRect.height - 50;
        this.addChild(titleRole);

        var sliderView = new SlideView(cc.size(600, 320));
        sliderView.x = cc.visibleRect.width / 2;
        sliderView.y = 870;
        this.addChild(sliderView);

        sliderView.onSlideBegin = function () {
            cc.log('onSlidBegin');
            btn2.setEnabled(false);
        };
        sliderView.onSlideEnd = function (index) {
            if (index === 0) {
                btn2.setEnabled(true);
            } else if (index === 1 && role.isRoleUnlocked(RoleType.LUO)) {
                btn2.setEnabled(true);
            } else if (index === 2 && role.isRoleUnlocked(RoleType.YAZI)) {
                btn2.setEnabled(true);
            } else {
                btn2.setEnabled(false);
            }
        };


        var title = new cc.LabelTTF(stringUtil.getString(1217), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        title.x = cc.winSize.width / 2;
        title.y = 616;
        this.addChild(title);

        var NODE_WIDTH = 181;
        var NODE_HEIGHT = 196;
        var widthPadding = (cc.winSize.width - 3 * NODE_WIDTH ) / 4;
        var widthPadding2 = (cc.winSize.width - 2 * NODE_WIDTH ) / 3;
        var heightPadding = 50;
        var data = [0, 101, 102, 103, 104];
        var self = this;
        this.btnList = [];
        data.forEach(function (purchaseId, index) {
            var btn = new ButtonAtChooseScene("icon_iap_" + purchaseId + ".png");
            btn.anchorX = 0;
            btn.anchorY = 1;
            if (index < 3) {
                btn.x = widthPadding + (index % 3) * (widthPadding + NODE_WIDTH);
                btn.y = title.y - 80 - (10 + Math.floor(index / 3) * (heightPadding + NODE_HEIGHT) );
            } else {
                btn.x = widthPadding2 + ((index - 3) % 2) * (widthPadding2 + NODE_WIDTH);
                btn.y = title.y - 80 - (10 + Math.floor(index / 3) * (heightPadding + NODE_HEIGHT) );
            }
            self.addChild(btn);
            btn.purchaseId = purchaseId;
            btn.index = index;
            self.btnList.push(btn);
            btn.setClickListener(self, function (sender) {
                var i = sender.index;
                sender.setChecked(true);
                IAPPackage.chooseTalent(sender.purchaseId);
                this.btnList.forEach(function (b, ii) {
                    if (i !== ii && b.isEnabled()) {
                        b.setChecked(false);
                    }
                });
            });

            btn.setChecked(purchaseId == IAPPackage.getChosenTalentPurchaseId());

            var strConfig = stringUtil.getString("p_" + purchaseId);

            var name = new cc.LabelTTF(strConfig.name, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
            name.anchorY = 0;
            name.x = btn.width / 2;
            name.y = btn.height + 5;
            btn.addChild(name);

            //var des = new cc.LabelTTF(strConfig.effect, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(btn.width + 120, 0), cc.TEXT_ALIGNMENT_CENTER);
            //des.anchorY = 1;
            //des.x = btn.width / 2;
            //des.y = -20;
            //btn.addChild(des);
        });

        this.btnList.forEach(function (btn) {
            btn.setEnabled(IAPPackage.isIAPUnlocked(btn.purchaseId));
        });

        var btn1 = uiUtil.createCommonBtnWhite(stringUtil.getString(1193), this, function () {
            cc.director.runScene(new MenuScene());
        });
        btn1.setPosition(cc.winSize.width / 4, 60);
        this.addChild(btn1);
        btn1.setName("btn_1");

        var btn2 = uiUtil.createCommonBtnWhite(stringUtil.getString(1030), this, function () {
            if (cc.sys.isNative && cc.sys.os == cc.sys.OS_IOS) {
                CommonUtil.afOnRegister();
            }

            var positionIndex = sliderView.getChosenPositionIndex();
            if (positionIndex == 1) {
                if (role.isRoleUnlocked(RoleType.LUO)) {
                    role.chooseRoleType(RoleType.LUO);
                } else {
                    return;
                }
            } else if (positionIndex == 2) {
                if (role.isRoleUnlocked(RoleType.YAZI)) {
                    role.chooseRoleType(RoleType.YAZI);
                } else {
                    return;
                }
            } else {
                role.chooseRoleType(RoleType.STRANGER);
            }

            cc.director.runScene(new StoryScene());
        });
        btn2.setPosition(cc.winSize.width / 4 * 3, 60);
        this.addChild(btn2);
        btn2.setName("btn_2");

        return true;
    },

    onExit: function () {
        this._super();
    },

    onEnter: function () {
        this._super();
    }
});


var ChooseScene = BaseScene.extend({
    ctor: function () {
        this._super(APP_NAVIGATION.GAME);

        var layer = new ChooseLayer();
        this.addChild(layer);
    },
    onEnter: function () {
        this._super();
        //this.removeAllChildren();
    },
    onExit: function () {
        this._super();
    }
});

var SlideView = cc.Node.extend({
    ctor: function (size) {
        this._super();

        this.setContentSize(size);
        this.anchorX = 0.5;
        this.anchorY = 0.5;

        //可视的格子数
        this.visibleCellNum = 3;
        //实际角色数量
        this.roleNums = 4;
        //总格子数
        this.totalCellNum = this.roleNums + 2;

        var cellWidth = this.width / this.visibleCellNum;
        this.positionList = [];
        for (var i = 0; i < this.roleNums; i++) {
            var x = 0 - (cellWidth * i);
            this.positionList.push(x);
        }

        this.data = [];
        this.data.push(null);
        this.data.push({
            name: stringUtil.getString(1311),
            des: stringUtil.getString(1312),
            id: 6
        });
        this.data.push({
            name: stringUtil.getString(1313),
            des: stringUtil.getString(1314),
            id: 1
        });
        this.data.push({
            name: stringUtil.getString(1321),
            des: stringUtil.getString(1322),
            id: 4
        });
        this.data.push({name: '???', des: stringUtil.getString(1315), id: 0});
        this.data.push(null);

        this.createTableView();

        var self = this;
        cc.eventManager.addListener(cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            touchBeganPos: null,
            onTouchBegan: function (touch, event) {
                self.onSlideBegin(self.getChosenPositionIndex());
                return true;
            },
            onTouchMoved: function (touch, event) {
            },
            onTouchEnded: function (touch, event) {
                var index = self.findNearestPositionIndex();
                self.setChosenPositionIndex(index);
                self.onSlideEnd(self.getChosenPositionIndex());
                var positionX = self.getPositionX(self.getChosenPositionIndex());
                self.scrollToPosition(positionX, true);
            }
        }), this);


        this.indicator = new SliderIndicator(this.roleNums, cc.size(this.roleNums * 20, 16));
        this.indicator.x = this.width / 2;
        this.indicator.y = -20;
        this.addChild(this.indicator);

        var rolePositionMap = {};
        rolePositionMap[RoleType.STRANGER] = 0;
        rolePositionMap[RoleType.LUO] = 1;
        rolePositionMap[RoleType.YAZI] = 2;

        if (role.getChoosenRoleType() === RoleType.LUO) {
            this.setChosenPositionIndex(1);
        } else if (role.getChoosenRoleType() === RoleType.YAZI) {
            this.setChosenPositionIndex(2);
        } else {
            this.setChosenPositionIndex(0);
        }

        this.scrollToPosition(this.getPositionX(this.getChosenPositionIndex()));


        var leftMask = new cc.LayerColor();
        leftMask.setColor(cc.color(0, 0, 0, 155));
        leftMask.setOpacity(200);
        this.addChild(leftMask, 0);

        var rightMask = new cc.LayerColor();
        rightMask.setColor(cc.color(0, 0, 0, 155));
        rightMask.setOpacity(200);
        this.addChild(rightMask, 0);

        var roleChooseBg = autoSpriteFrameController.getSpriteFromSpriteName("frame_role_choose.png");
        roleChooseBg.setPosition(this.width / 2, this.height / 2);
        this.addChild(roleChooseBg);

        leftMask.setContentSize((this.width - roleChooseBg.width) / 2, this.height);
        leftMask.anchorX = 0;
        leftMask.anchorY = 0;
        leftMask.x = 0;
        leftMask.y = 0;

        rightMask.setContentSize((this.width - roleChooseBg.width) / 2, this.height);
        rightMask.anchorX = 0;
        rightMask.anchorY = 0;
        rightMask.x = leftMask.width + roleChooseBg.width;
        rightMask.y = 0;
    },
    getChosenPositionIndex: function () {
        return this.choosenPositionIndex;
    },
    setChosenPositionIndex: function (index) {
        this.choosenPositionIndex = index;
        this.indicator.setIndex(index);
    },
    getPositionX: function (positionIndex) {
        var positionX = this.positionList[positionIndex];
        return positionX;
    },
    findNearestPositionIndex: function () {
        var offset = this.tableView.getContentOffset();
        var x = offset.x;
        var index = 0;
        var distance = Number.MAX_VALUE;
        for (var i = 0; i < this.positionList.length; i++) {
            var d = Math.abs(x - this.positionList[i]);
            if (d < distance) {
                distance = d;
                index = i;
            }
        }
        return index;
    },
    scrollToPosition: function (x, withAnim) {
        var c = this.tableView.getContainer();
        if (withAnim) {
            var v = 100;
            var distance = Math.abs(x - c.x);
            var during = distance / v;
        }
        var offset = this.tableView.getContentOffset();
        offset.x = x;
        var self = this;
        this.scheduleOnce(function () {
            self.tableView.setContentOffset(offset, during);
        }, 0.01);
    },
    onSlideBegin: function (index) {
    },
    onSlideEnd: function (index) {
    },
    createTableView: function () {
        this.tableView = new cc.TableView(this, this.getContentSize());
        this.tableView.setDirection(cc.SCROLLVIEW_DIRECTION_HORIZONTAL);
        this.tableView.setVerticalFillOrder(cc.TABLEVIEW_FILL_TOPDOWN);
        this.tableView.x = 0;
        this.tableView.y = 0;
        this.tableView.setDelegate(this);
        this.tableView.setBounceable(false);
        this.addChild(this.tableView);
        this.tableView.reloadData();

        this.scrollToPosition(this.positionList[2]);

    },
    tableCellTouched: function (table, cell) {
        cc.log("cell touched at index: " + cell.getIdx());
    },

    tableCellSizeForIndex: function (table, idx) {
        var size = this.getContentSize();
        return cc.size(size.width / this.visibleCellNum, size.height);
    },

    tableCellAtIndex: function (table, idx) {
        var cell = table.dequeueCell();
        var size = this.tableCellSizeForIndex(idx);
        if (!cell) {
            cell = new cc.TableViewCell();
            var node = new cc.Node();
            node.setContentSize(size);
            node.anchorX = 0.5;
            node.anchorY = 0.5;
            node.x = size.width / 2;
            node.y = size.height / 2;
            node.setName('content');
            cell.addChild(node);
        }

        var content = cell.getChildByName('content');
        content.removeAllChildren();

        var d = this.data[idx];
        if (d) {

            var name = new cc.LabelTTF(d.name, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2);
            name.setPosition(size.width / 2, size.height - 10);
            content.addChild(name);

            var headerBg = autoSpriteFrameController.getSpriteFromSpriteName("role_bg.png");
            headerBg.setPosition(size.width / 2, size.height / 2);
            content.addChild(headerBg);

            var header = autoSpriteFrameController.getSpriteFromSpriteName("npc_dig_" + d.id + ".png");
            header.setPosition(headerBg.width / 2, headerBg.height / 2);
            headerBg.addChild(header);
            header.scale = 0.8;

            var des = new cc.LabelTTF(d.des, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2);
            des.setPosition(size.width / 2, 10);
            content.addChild(des);

            var info = new SpriteButton(cc.size(100, 100), 'icon_iap_info.png');
            info.x = headerBg.width - 19;
            info.y = headerBg.height - 19;
            headerBg.addChild(info);
            info.setClickListener(this, function () {
                uiUtil.showRoleInfoDialog(d.id);
            });

            if ((d.id == 1 && !role.isRoleUnlocked(RoleType.LUO)) ||
                (d.id == 4 && !role.isRoleUnlocked(RoleType.YAZI))) {
                info.setVisible(false);

                var lock = new SpriteButton(null, 'icon_iap_lock.png');
                lock.x = headerBg.width - 27;
                lock.y = headerBg.height - 27;
                headerBg.addChild(lock);
                lock.setClickListener(this, function () {
                    uiUtil.showRoleInfoDialog(d.id, true);
                });
            }

        }

        return cell;
    },

    numberOfCellsInTableView: function (table) {
        return this.data.length;
    }

});

var SliderIndicator = cc.Node.extend({
    ctor: function (num, size) {
        this._super();

        this.setContentSize(size);
        this.anchorX = 0.5;
        this.anchorY = 0.5;

        var WIDTH = 16;
        var HEIGHT = 16;

        this.num = num;
        this.indicators = [];
        var paddingX = (size.width - this.num * WIDTH) / (this.num + 1);
        for (var i = 0; i < this.num; i++) {
            var indicatorBg = autoSpriteFrameController.getSpriteFromSpriteName('page_view_indicator_1.png');
            indicatorBg.x = paddingX + WIDTH / 2 + i * (paddingX + WIDTH);
            indicatorBg.y = this.height / 2;
            this.addChild(indicatorBg);

            var indicator = autoSpriteFrameController.getSpriteFromSpriteName('page_view_indicator_2.png');
            indicator.x = indicator.width / 2;
            indicator.y = indicatorBg.height / 2;
            indicator.setName('indicator');
            indicatorBg.addChild(indicator);

            this.indicators.push(indicatorBg);
        }
        this.setIndex(0);
    },
    setIndex: function (index) {
        this.index = index;
        for (var i = 0; i < this.indicators.length; i++) {
            this.indicators[i].getChildByName('indicator').setVisible(index == i);
        }
    }
});
