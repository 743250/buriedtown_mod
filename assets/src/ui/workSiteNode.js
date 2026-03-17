/**
 * Created by lancelot on 15/4/22.
 */
var workSiteConfig = {
    smallMaintenanceTime: 60,
    smallMaintenanceValue: 20,
    smallMaintenanceItems: [
        {itemId: 1101021, num: 2},
        {itemId: 1101041, num: 2},
        {itemId: 1101051, num: 1}
    ],
    largeMaintenanceTime: 120,
    largeMaintenanceItems: [
        {itemId: 1102063, num: 1}
    ]
};
var WorkSiteNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);
        this.currentMaintenanceAction = null;
    },
    _init: function () {
        this.initSiteNodeContext();

        var leftEdge = 40;
        var rightEdge = this.bgRect.width - leftEdge;

        this.alignTitleToLeftButton();

        //this.txt2 = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        //this.txt2.setAnchorPoint(1, 1);
        //this.txt2.setPosition(rightEdge + 20, this.actionBarBaseHeight - 4);
        //this.bg.addChild(this.txt2);

        var digDes = autoSpriteFrameController.getSpriteFromSpriteName("#site_dig_" + this.site.id + ".png");
        digDes.setAnchorPoint(0.5, 1);
        digDes.setPosition(this.bgRect.width / 2, this.contentTopLineHeight - 50);
        this.bg.addChild(digDes);
        digDes.setName("dig_des");

        var des = new cc.LabelTTF(this.site.getDes(), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(rightEdge - leftEdge, 0));
        des.setAnchorPoint(0.5, 1);
        des.setPosition(this.bgRect.width / 2, digDes.y - digDes.height - 40);
        this.bg.addChild(des);
        des.setName("des");
        des.setColor(UITheme.colors.WHITE);

        var self = this;
        this.statusView = uiUtil.createCommonListItem(
            {
                target: this, cb: function () {
                }
            }
        );
        this.smallMaintenanceView = uiUtil.createCommonListItem(
            {
                target: this, cb: function () {
                }
            },
            {
                target: this, cb: self.onClickSmallMaintenance
            }
        );
        this.largeMaintenanceView = uiUtil.createCommonListItem(
            {
                target: this, cb: function () {
                }
            },
            {
                target: this, cb: self.onClickLargeMaintenance
            }
        );

        var stack = uiUtil.createVStack({
            parent: this.bg,
            x: this.bgRect.width / 2,
            top: des.y - des.height - 24,
            gap: 14,
            zOrder: 1
        });
        stack.add(this.statusView, {anchorX: 0.5, anchorY: 1});
        stack.add(this.smallMaintenanceView, {anchorX: 0.5, anchorY: 1});
        stack.add(this.largeMaintenanceView, {anchorX: 0.5, anchorY: 1});

        this.updateView();
    },
    _getStatusHint: function () {
        var powerStatus = stringUtil.getString(this.site.isActive ? "worksite_power_active" : "worksite_power_inactive");
        var maintenance = stringUtil.getString(
            "worksite_maintenance_value",
            this.site.getMaintenanceValue(),
            this.site.getMaintenanceMax()
        );
        return powerStatus + "\n" + maintenance;
    },
    _buildCostItems: function (items) {
        var clonedItems = utils.clone(items);
        player.validateItemsInBag(clonedItems);
        return clonedItems.map(function (itemInfo) {
            return {
                itemId: itemInfo.itemId,
                num: itemInfo.num,
                color: itemInfo.haveNum >= itemInfo.num ? UITheme.colors.WHITE : UITheme.colors.TEXT_ERROR
            };
        });
    },
    _isMaintenanceFull: function () {
        return this.site.getMaintenanceValue() >= this.site.getMaintenanceMax();
    },
    _runMaintenanceAction: function (actionId, timeMinutes, items, endCb) {
        if (this.currentMaintenanceAction) {
            return;
        }
        var pastTime = 0;
        var self = this;
        var time = timeMinutes * 60;
        this.currentMaintenanceAction = actionId;
        this.updateView();

        cc.timer.addTimerCallback(new TimerCallback(time, this, {
            process: function (dt) {
                pastTime += dt;
                if (actionId === "small") {
                    self.smallMaintenanceView.updatePercentage(pastTime / time * 100);
                } else {
                    self.largeMaintenanceView.updatePercentage(pastTime / time * 100);
                }
            },
            end: function () {
                player.costItemsInBag(utils.clone(items));
                endCb.call(self);
                Record.saveAll();
                self.currentMaintenanceAction = null;
                self.updateView();
            }
        }));
        cc.timer.accelerateWorkTime(time);
    },
    onClickSmallMaintenance: function () {
        if (!this.site.isActive || this._isMaintenanceFull()) {
            return;
        }
        if (!player.validateItemsInBag(utils.clone(workSiteConfig.smallMaintenanceItems))) {
            return;
        }
        this._runMaintenanceAction(
            "small",
            workSiteConfig.smallMaintenanceTime,
            workSiteConfig.smallMaintenanceItems,
            function () {
                this.site.performSmallMaintenance(workSiteConfig.smallMaintenanceValue);
            }
        );
    },
    onClickLargeMaintenance: function () {
        if (this.site.isActive && this._isMaintenanceFull()) {
            return;
        }
        if (!player.validateItemsInBag(utils.clone(workSiteConfig.largeMaintenanceItems))) {
            return;
        }
        this._runMaintenanceAction(
            "large",
            workSiteConfig.largeMaintenanceTime,
            workSiteConfig.largeMaintenanceItems,
            function () {
                this.site.performLargeMaintenance();
            }
        );
    },
    updateView: function () {
        var isRepairing = !!this.currentMaintenanceAction;
        var smallCostReady = player.validateItemsInBag(utils.clone(workSiteConfig.smallMaintenanceItems));
        var largeCostReady = player.validateItemsInBag(utils.clone(workSiteConfig.largeMaintenanceItems));
        var isMaintenanceFull = this._isMaintenanceFull();

        this.statusView.updateView({
            iconName: "#build_action_fix.png",
            hint: this._getStatusHint(),
            percentage: this.site.getMaintenancePercentage()
        });

        this.smallMaintenanceView.updateView({
            iconName: "#build_action_fix.png",
            hint: !this.site.isActive ? stringUtil.getString("worksite_small_maintenance_hint") : "",
            hintColor: !this.site.isActive ? UITheme.colors.TEXT_ERROR : null,
            items: this._buildCostItems(workSiteConfig.smallMaintenanceItems),
            action1: stringUtil.getString("worksite_small_maintenance", workSiteConfig.smallMaintenanceTime),
            action1Disabled: isRepairing || !this.site.isActive || !smallCostReady || isMaintenanceFull,
            percentage: 0
        });

        this.largeMaintenanceView.updateView({
            iconName: "#build_action_fix.png",
            items: this._buildCostItems(workSiteConfig.largeMaintenanceItems),
            action1: stringUtil.getString("worksite_large_maintenance", workSiteConfig.largeMaintenanceTime),
            action1Disabled: isRepairing || !largeCostReady || (this.site.isActive && isMaintenanceFull),
            percentage: 0
        });
    },
    onEnter: function () {
        this._super();
    },
    onExit: function () {
        this._super();
    },
    
    onClickLeftBtn: function () {
        this.exitCurrentSiteNode();
    },
    onClickRightBtn: function () {
    }

});
