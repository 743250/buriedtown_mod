/**
 * Created by lancelot on 15/4/22.
 */
var workSiteConfig = {
    costTime: 120,
    needItems: [
        {itemId: 1102063, num: 1}
    ],
    lastTime: 0,
    brokenProbability: 0.02
};
var WorkSiteNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);
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
        this.actionView = uiUtil.createCommonListItem(
            {
                target: this, cb: function () {
            }
            },
            {
                target: this, cb: self.onClickFix
            }
        );

        this.actionView.setAnchorPoint(0.5, 0.5);
        this.actionView.setPosition(this.bgRect.width / 2, 100);
        this.bg.addChild(this.actionView, 1);

        this.updateView();
    },
    onClickFix: function () {
        var pastTime = 0;
        var self = this;
        var time = workSiteConfig.costTime * 60;
        var a=0;
        if (player.roleType === RoleType.YAZI) {
            workSiteConfig.lastTime=96*60;
            workSiteConfig.brokenProbability=0.02;
        }else if (player.roleType === RoleType.KING) {
            workSiteConfig.lastTime=a;
            workSiteConfig.brokenProbability=0;
        }
        cc.timer.addTimerCallback(new TimerCallback(time, this, {
            process: function (dt) {
                pastTime += dt;
                self.actionView.updatePercentage(pastTime / (workSiteConfig.costTime * 60 ) * 100);
            },
            end: function () {
                var items = utils.clone(workSiteConfig.needItems);
                player.costItemsInBag(items);
                self.site.fix();

                Record.saveAll();

                self.updateView();
            }
        }));
        cc.timer.accelerateWorkTime(time);
    },
    updateView: function () {
        var hint;
        var needItems = utils.clone(workSiteConfig.needItems);
        var res = player.validateItemsInBag(needItems);
        needItems = needItems.map(function (itemInfo) {
            return {
                itemId: itemInfo.itemId,
                num: itemInfo.num,
                color: itemInfo.haveNum >= itemInfo.num ? UITheme.colors.WHITE : UITheme.colors.TEXT_ERROR
            };
        });

        cc.log('res ' + res + ' isActive ' + this.site.isActive);
        var actionDisabled = !res || this.site.isActive;

        this.actionView.updateView({
            iconName: "#build_action_fix.png",
            hint: hint,
            hintColor: hint ? UITheme.colors.TEXT_ERROR : null,
            items: needItems,
            action1: stringUtil.getString(1323, workSiteConfig.costTime),
            action1Disabled: actionDisabled,
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
