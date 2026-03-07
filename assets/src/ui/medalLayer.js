/**
 * Legacy scene entry kept thin. View logic lives in MedalSceneView.js.
 */

var medalLayer = cc.Layer.extend({
    ctor: function (initialSeries) {
        this._super();

        autoSpriteFrameController.addSpriteFrames("res/ui.plist");
        autoSpriteFrameController.addSpriteFrames("res/medal.plist");
        autoSpriteFrameController.addSpriteFrames("res/gate.plist");

        if (!Medal._map) {
            Medal.init();
        }

        var view = new MedalSceneView(initialSeries);
        this.setContentSize(view.getContentSize());
        this.addChild(view);

        this.setPositionX((cc.winSize.width - this.getContentSize().width) / 2);
    }
});

var medalScene = BaseScene.extend({
    ctor: function (initialSeries) {
        this._super(APP_NAVIGATION.MENU_SUB);
        this.addChild(new medalLayer(initialSeries));
    }
});

var medalShowDialog = cc.Layer.extend({
    ctor: function (medalIndex) {
        this._super();

        var bg = autoSpriteFrameController.getSpriteFromSpriteName("#frame_medal_bg.png");
        bg.setAnchorPoint(0, 0);
        this.addChild(bg);

        var medalInfoIndex = Medal.getCompletedMedalIndex(medalIndex);
        if (!medalInfoIndex || !Medal._map[medalInfoIndex]) {
            return;
        }
        var medalInfo = Medal._map[medalInfoIndex];
        var medalStrings = stringUtil.getString("m_" + medalInfoIndex);

        var leftEdge = 50;
        var medalIcon = autoSpriteFrameController.getSpriteFromSpriteName("#medalIcon_" + Medal.getIconIdByMedalId(medalInfoIndex) + ".png");
        medalIcon.setPosition(leftEdge + 75, 128);
        this.addChild(medalIcon);

        var level = medalInfo.stageLevel || Number(medalInfoIndex.toString().split("").pop());
        var starBg = medalViewGetStarSprite(level, medalInfo);
        starBg.setPosition(leftEdge + 75, 16);
        this.addChild(starBg);

        var newGetLabel = new cc.LabelTTF(stringUtil.getString(1265), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        newGetLabel.setAnchorPoint(0, 0);
        newGetLabel.setColor(cc.color(255, 255, 255, 255));
        newGetLabel.setPosition(leftEdge + 218, 170);
        newGetLabel.setHorizontalAlignment(cc.TEXT_ALIGNMENT_LEFT);
        this.addChild(newGetLabel);

        var medalTitle = new cc.LabelTTF(medalStrings.name, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(300, 0));
        medalTitle.setAnchorPoint(0, 1);
        medalTitle.setColor(cc.color(255, 255, 255, 255));
        medalTitle.setPosition(leftEdge + 218, 130);
        medalTitle.setHorizontalAlignment(cc.TEXT_ALIGNMENT_LEFT);
        this.addChild(medalTitle);

        var medalCondition = new cc.LabelTTF(medalStrings.condition, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(300, 0));
        medalCondition.setAnchorPoint(0, 1);
        medalCondition.setColor(cc.color(255, 255, 255, 255));
        medalCondition.setPosition(leftEdge + 218, medalTitle.y - medalTitle.height);
        medalCondition.setHorizontalAlignment(cc.TEXT_ALIGNMENT_LEFT);
        this.addChild(medalCondition);

        var medalDes = new cc.LabelTTF(medalStrings.des, uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_2, cc.size(300, 0));
        medalDes.setAnchorPoint(0, 1);
        medalDes.setColor(cc.color(255, 255, 255, 255));
        medalDes.setPosition(leftEdge + 218, medalCondition.y - medalCondition.height);
        medalDes.setHorizontalAlignment(cc.TEXT_ALIGNMENT_LEFT);
        this.addChild(medalDes);
    }
});
