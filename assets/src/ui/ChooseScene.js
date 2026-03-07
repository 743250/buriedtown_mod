/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */

var ChooseLayer = cc.Layer.extend({
    ctor: function () {
        this._super();
        this._shopStateListener = null;
        var roleSelectionConfig = role.getRoleSelectionConfig();

        var titleRole = new cc.LabelTTF(stringUtil.getString(1310), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        titleRole.x = cc.winSize.width / 2;
        titleRole.y = cc.visibleRect.height - 50;
        this.addChild(titleRole);

        var sliderView = new SlideView(cc.size(600, 320));
        sliderView.x = cc.visibleRect.width / 2;
        sliderView.y = 870;
        this.addChild(sliderView);
        this.sliderView = sliderView;

        sliderView.onSlideBegin = function () {
            cc.log('onSlidBegin');
            btn2.setEnabled(false);
        };
        sliderView.onSlideEnd = function () {
            btn2.setEnabled(true);
        };


        var title = new cc.LabelTTF(stringUtil.getString(1217), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        title.x = cc.winSize.width / 2;
        title.y = 740;
        this.addChild(title);

        var NODE_WIDTH = 160;
        var NODE_HEIGHT = 200;
        var rowMaxNum = 3;
        var viewWidth = cc.winSize.width;
        var scrollViewBottomY = 120;
        var scrollViewTopY = title.y - 90;
        var viewHeight = scrollViewTopY - scrollViewBottomY;
        var widthPadding = (viewWidth - rowMaxNum * NODE_WIDTH ) / (rowMaxNum + 1);
        var heightPadding = 15;
        // Name labels are rendered above each button; reserve top space to avoid clipping on first row.
        var talentNameTopPadding = 36;
        var data = TalentService.getTalentPurchaseIdList();
        var rowCount = Math.ceil(data.length / rowMaxNum);
        var totalHeight = NODE_HEIGHT * rowCount + (heightPadding * (rowCount - 1)) + talentNameTopPadding;
        var talentContainer = new cc.Layer();
        var talentScrollView = new cc.ScrollView(cc.size(viewWidth, viewHeight), talentContainer);
        talentScrollView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        talentScrollView.setBounceable(false);
        talentScrollView.setClippingToBounds(true);
        talentScrollView.x = 0;
        talentScrollView.y = scrollViewBottomY;
        this.addChild(talentScrollView);
        talentScrollView.setContentSize(viewWidth, totalHeight);
        var talentOffset = talentScrollView.getContentOffset();
        talentOffset.y = talentScrollView.getViewSize().height - totalHeight;
        talentScrollView.setContentOffset(talentOffset);
        var self = this;
        this.btnList = [];
        this.selectedTalentIds = TalentService.getChosenTalentPurchaseIds();
        var configuredMaxTalentCount = parseInt(
            TalentService.getMaxChosenTalentCount && TalentService.getMaxChosenTalentCount()
        );
        this.maxChosenTalentCount = isNaN(configuredMaxTalentCount) ? 1 : Math.max(1, configuredMaxTalentCount);

        this.updateTalentCheckedState = function () {
            self.btnList.forEach(function (btn) {
                btn.setChecked(self.selectedTalentIds.indexOf(parseInt(btn.purchaseId)) !== -1);
            });
        };

        this.toggleTalentSelection = function (purchaseId) {
            var talentId = parseInt(purchaseId);
            var idx = self.selectedTalentIds.indexOf(talentId);
            if (idx !== -1) {
                self.selectedTalentIds.splice(idx, 1);
            } else if (talentId === 0) {
                self.selectedTalentIds = [0];
            } else {
                var emptyTalentIdx = self.selectedTalentIds.indexOf(0);
                if (emptyTalentIdx !== -1) {
                    self.selectedTalentIds.splice(emptyTalentIdx, 1);
                }
                self.selectedTalentIds.push(talentId);
                if (self.selectedTalentIds.length > self.maxChosenTalentCount) {
                    self.selectedTalentIds.shift();
                }
            }

            if (self.selectedTalentIds.length === 0) {
                self.selectedTalentIds = [0];
            }

            TalentService.chooseTalents(self.selectedTalentIds);
            self.updateTalentCheckedState();
        };

        data.forEach(function (purchaseId, index) {
            var btn = new ButtonAtChooseScene(uiUtil.getTalentIconFrameName(purchaseId, false), uiUtil.getDefaultSpriteName("talent", false));
            btn.anchorX = 0;
            btn.anchorY = 1;
            var row = Math.floor(index / rowMaxNum);
            var col = index % rowMaxNum;
            var rowItemNum = Math.min(rowMaxNum, data.length - row * rowMaxNum);
            var rowWidth = rowItemNum * NODE_WIDTH + (rowItemNum - 1) * widthPadding;
            var rowStartX = (viewWidth - rowWidth) / 2;
            btn.x = rowStartX + col * (widthPadding + NODE_WIDTH);
            btn.y = totalHeight - talentNameTopPadding - row * (heightPadding + NODE_HEIGHT);
            talentContainer.addChild(btn);
            btn.purchaseId = purchaseId;
            self.btnList.push(btn);
            btn.setClickListener(self, function (sender) {
                this.toggleTalentSelection(sender.purchaseId);
            });

            var strConfig = uiUtil.getPurchaseStringConfig(purchaseId);

            var name = new cc.LabelTTF(strConfig.name, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2);
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
            btn.setEnabled(PurchaseService.isUnlocked(btn.purchaseId));
        });
        this.updateTalentCheckedState();
        this.refreshUnlockState = function () {
            if (self.sliderView && self.sliderView.tableView) {
                var offset = self.sliderView.tableView.getContentOffset();
                self.sliderView.tableView.reloadData();
                self.sliderView.tableView.setContentOffset(offset);
            }

            self.btnList.forEach(function (btn) {
                btn.setEnabled(PurchaseService.isUnlocked(btn.purchaseId));
            });

            self.selectedTalentIds = self.selectedTalentIds.filter(function (id) {
                var talentId = parseInt(id);
                if (talentId === 0) {
                    return true;
                }
                return PurchaseService.isUnlocked(talentId);
            });
            if (self.selectedTalentIds.length === 0) {
                self.selectedTalentIds = [0];
            }
            TalentService.chooseTalents(self.selectedTalentIds);
            self.updateTalentCheckedState();
        };

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
            var chosenRoleType = roleSelectionConfig.positionToRoleType[positionIndex];
            if (chosenRoleType === undefined || chosenRoleType === null) {
                var unlockedRoleTypeList = roleSelectionConfig.randomRoleTypeList.filter(function (roleType) {
                    return role.isRoleUnlocked(roleType);
                });
                if (unlockedRoleTypeList.length === 0) {
                    unlockedRoleTypeList = [RoleType.STRANGER];
                }
                var randomRoleIndex = utils.getRandomInt(0, unlockedRoleTypeList.length - 1);
                chosenRoleType = unlockedRoleTypeList[randomRoleIndex];
            }

            if (role.isRolePurchaseRequired(chosenRoleType) && !role.isRoleUnlocked(chosenRoleType)) {
                uiUtil.showRoleInfoDialog(chosenRoleType, true);
                return;
            }
            role.chooseRoleType(chosenRoleType);

            cc.director.runScene(new StoryScene());
        });
        btn2.setPosition(cc.winSize.width / 4 * 3, 60);
        this.addChild(btn2);
        btn2.setName("btn_2");

        return true;
    },

    onExit: function () {
        if (this._shopStateListener && typeof utils !== "undefined" && utils && utils.emitter) {
            utils.emitter.off(PurchaseService.getShopStateChangeEventName(), this._shopStateListener);
            this._shopStateListener = null;
        }
        this._super();
    },

    onEnter: function () {
        this._super();
        if (typeof this.refreshUnlockState === "function") {
            this.refreshUnlockState();
        }
        if (!this._shopStateListener && typeof utils !== "undefined" && utils && utils.emitter) {
            var self = this;
            this._shopStateListener = function () {
                if (typeof self.refreshUnlockState === "function") {
                    self.refreshUnlockState();
                }
            };
            utils.emitter.on(PurchaseService.getShopStateChangeEventName(), this._shopStateListener);
        }
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
        var roleSelectionConfig = role.getRoleSelectionConfig();
        var roleList = roleSelectionConfig.roleList || [];
        //实际角色数量
        this.roleNums = Math.max(1, roleList.length);
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
        roleList.forEach(function (roleItem) {
            this.data.push({
                name: roleItem.name,
                des: roleItem.des,
                id: roleItem.id
            });
        }, this);
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

        var currentRoleType = role.getChoosenRoleType();
        var chosenIndex = roleSelectionConfig.roleTypeToPosition[currentRoleType];
        if (chosenIndex === undefined || chosenIndex === null) {
            chosenIndex = roleSelectionConfig.roleTypeToPosition[RoleType.STRANGER];
            if (chosenIndex === undefined || chosenIndex === null) {
                chosenIndex = 0;
            }
        }
        this.setChosenPositionIndex(chosenIndex);

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
        return this.chosenPositionIndex;
    },
    setChosenPositionIndex: function (index) {
        this.chosenPositionIndex = index;
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

        this.scrollToPosition(this.positionList[Math.min(2, Math.max(0, this.positionList.length - 1))]);

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

            var header = uiUtil.getCharacterPortraitSpriteByRoleType(d.id, uiUtil.getDefaultSpriteName("character", false));
            header.setPosition(headerBg.width / 2, headerBg.height / 2);
            headerBg.addChild(header);
            header.scale = 0.8;

            var des = new cc.LabelTTF(d.des, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            des.setPosition(size.width / 2, 10);
            content.addChild(des);

            var info = new SpriteButton(cc.size(100, 100), 'icon_iap_info.png');
            info.x = headerBg.width - 19;
            info.y = headerBg.height - 19;
            headerBg.addChild(info);
            info.setClickListener(this, function () {
                uiUtil.showRoleInfoDialog(d.id);
            });

            if (role.isRolePurchaseRequired(d.id) && !role.isRoleUnlocked(d.id)) {
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
