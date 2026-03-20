/**
 * Achievement scene view isolated from legacy scene wiring.
 */

var MedalUiCategoryConfig = {
    1: {zh: "生存成就", en: "Survival"},
    2: {zh: "战斗成就", en: "Combat"},
    3: {zh: "探索成就", en: "Exploration"}
};

var MedalUiTextMap = {
    zh: {
        title: "成就",
        pageFormat: "%d/%d",
        summaryPoints: "成就点",
        summaryClaimed: "已领取",
        summaryReady: "待领取",
        currentTarget: "当前目标",
        finishedAll: "本系列阶段已全部领取",
        activeStage: "当前阶段",
        stageProgress: "阶段",
        rewardPrefix: "奖励",
        claimPrefix: "领取 +",
        pointSuffix: "点",
        inProgress: "进行中",
        claimed: "已领取",
        notReady: "未达成",
        shop: "兑换商店",
        claimTip: "获得成就点: ",
        currentTag: "当前",
        openError: "成就界面打开失败",
        emptyCategory: "该分类暂无成就",
        seriesGoal: "目标"
    },
    en: {
        title: "Achievements",
        pageFormat: "%d/%d",
        summaryPoints: "Points",
        summaryClaimed: "Claimed",
        summaryReady: "Ready",
        currentTarget: "Current Goal",
        finishedAll: "All stages in this series are claimed",
        activeStage: "Current Stage",
        stageProgress: "Stages",
        rewardPrefix: "Reward",
        claimPrefix: "Claim +",
        pointSuffix: " pts",
        inProgress: "In Progress",
        claimed: "Claimed",
        notReady: "Locked",
        shop: "Exchange",
        claimTip: "Achievement points +",
        currentTag: "Now",
        openError: "Failed to open achievements",
        emptyCategory: "No achievements in this category",
        seriesGoal: "Goal"
    }
};

var MedalUiTheme = {
    background: cc.color(18, 18, 18, 255),
    textureTint: cc.color(255, 255, 255, 255),
    headerFill: cc.color(30, 30, 30, 255),
    summaryFill: cc.color(34, 34, 34, 255),
    cardFill: cc.color(30, 30, 30, 255),
    emptyFill: cc.color(28, 28, 28, 255),
    darkFill: cc.color(246, 246, 246, 255),
    mediumFill: cc.color(112, 112, 112, 255),
    softFill: cc.color(64, 64, 64, 255),
    frame: cc.color(236, 236, 236, 255),
    lightFrame: cc.color(148, 148, 148, 255),
    shadow: cc.color(0, 0, 0, 255),
    title: cc.color(252, 252, 252, 255),
    text: cc.color(236, 236, 236, 255),
    mutedText: cc.color(192, 192, 192, 255),
    inverseText: cc.color(18, 18, 18, 255),
    track: cc.color(64, 64, 64, 255),
    thumb: cc.color(246, 246, 246, 255),
    divider: cc.color(92, 92, 92, 255),
    progressBg: cc.color(72, 72, 72, 255),
    progressFill: cc.color(246, 246, 246, 255)
};

function medalViewIsEnglish() {
    return cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_ENGLISH;
}

function medalViewText(key) {
    var localeKey = medalViewIsEnglish() ? "en" : "zh";
    return MedalUiTextMap[localeKey][key] || MedalUiTextMap.zh[key] || "";
}

function medalViewCategoryLabel(categoryId) {
    var config = MedalUiCategoryConfig[categoryId];
    if (!config) {
        return medalViewIsEnglish() ? "Category " + categoryId : "分类 " + categoryId;
    }
    return medalViewIsEnglish() ? config.en : config.zh;
}

function medalViewGetStrings(medalId) {
    var medalStrings = stringUtil.getString("m_" + medalId) || {};
    return {
        name: medalStrings.name || (medalViewIsEnglish() ? "Achievement " + medalId : "成就 " + medalId),
        condition: medalStrings.condition || "",
        des: medalStrings.des || ""
    };
}

function medalViewProgressPercent(medalInfo) {
    if (!medalInfo || !medalInfo.aim) {
        return 0;
    }
    var percentage = medalInfo.aimCompleted / medalInfo.aim * 100;
    if (percentage < 0) {
        return 0;
    }
    if (percentage > 100) {
        return 100;
    }
    return percentage;
}

function medalViewSeriesTitle(seriesId) {
    var stageIds = Medal.getStageIdsBySeries(seriesId);
    if (!stageIds.length) {
        return "";
    }
    var name = medalViewGetStrings(stageIds[0]).name;
    return name
        .replace(/（[^）]+）/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/^\s+|\s+$/g, "");
}

function medalViewStageBadgeText(level) {
    var levelMap = {3: "1", 2: "2", 1: "3"};
    return levelMap[level] || String(level || "");
}

function medalViewGetStarSprite(level, medalInfo) {
    var displayLevel = parseInt(medalViewStageBadgeText(level), 10) || 0;
    displayLevel = Math.max(0, Math.min(3, displayLevel));

    var bgSprite = autoSpriteFrameController.getSpriteFromSpriteName("#medalStarBg.png");
    var starSprite = autoSpriteFrameController.getSpriteFromSpriteName("#star_" + displayLevel + ".png");
    var fallbackSize = cc.size(120, 28);
    var size = bgSprite ? bgSprite.getContentSize() : (starSprite ? starSprite.getContentSize() : fallbackSize);

    var node = new cc.Node();
    node.setContentSize(size);
    node.width = size.width;
    node.height = size.height;

    if (bgSprite) {
        bgSprite.setColor(medalInfo && medalInfo.claimed === 1 ? MedalUiTheme.darkFill : MedalUiTheme.mediumFill);
        bgSprite.setOpacity(236);
        bgSprite.setPosition(size.width / 2, size.height / 2);
        node.addChild(bgSprite);
    } else {
        var bgRect = uiUtil.createColorRect(size, medalInfo && medalInfo.claimed === 1 ? MedalUiTheme.darkFill : MedalUiTheme.mediumFill, 236);
        bgRect.setPosition(0, 0);
        node.addChild(bgRect);
    }

    if (starSprite) {
        starSprite.setColor(medalInfo && medalInfo.completed === 1 ? MedalUiTheme.inverseText : MedalUiTheme.softFill);
        starSprite.setOpacity(medalInfo && medalInfo.completed === 1 ? 255 : 228);
        starSprite.setPosition(size.width / 2, size.height / 2);
        node.addChild(starSprite, 1);
    } else {
        var starLabel = new cc.LabelTTF(String(displayLevel), uiUtil.fontFamily.normal, 18);
        starLabel.setColor(medalInfo && medalInfo.completed === 1 ? MedalUiTheme.inverseText : MedalUiTheme.softFill);
        starLabel.setPosition(size.width / 2, size.height / 2);
        node.addChild(starLabel, 1);
    }

    return node;
}

function medalViewSeriesState(seriesId) {
    var state = Medal.getSeriesState(seriesId);
    if (state.activeStageId) {
        state.activeStrings = medalViewGetStrings(state.activeStageId);
    } else {
        state.activeStrings = null;
    }
    return state;
}

function medalViewApplyLabelStyle(label, opt) {
    if (uiUtil && typeof uiUtil.applyLabelStyle === "function") {
        return uiUtil.applyLabelStyle(label, opt);
    }
    opt = opt || {};
    if (!label) {
        return label;
    }
    if (opt.color) {
        label.setColor(opt.color);
    }
    if (opt.strokeColor && label.enableStroke) {
        label.enableStroke(opt.strokeColor, opt.strokeSize || 1);
    }
    return label;
}

function medalViewCreateTabButton(txt, target, cb) {
    var size = cc.size(166, 42);
    var btn = new ButtonWithPressed(size);

    var bg = autoSpriteFrameController.getScale9Sprite("btn_common_white_normal.png", cc.rect(1, 1, 1, 1));
    bg.setName("bg");
    bg.setContentSize(size);
    bg.setColor(MedalUiTheme.headerFill);
    bg.setPosition(size.width / 2, size.height / 2);
    btn.addChild(bg, -1);

    var border = uiUtil.createColorRect(cc.size(size.width - 2, 2), MedalUiTheme.frame, 235);
    border.setName("border");
    border.setPosition(1, size.height - 3);
    btn.addChild(border, 1);

    var label = new cc.LabelTTF(txt || "", uiUtil.fontFamily.normal, 24, cc.size(size.width - 12, 0), cc.TEXT_ALIGNMENT_CENTER);
    label.setName("label");
    label.setPosition(size.width / 2, size.height / 2);
    label.setColor(MedalUiTheme.text);
    btn.addChild(label, 2);

    btn._tabBg = bg;
    btn._tabLabel = label;
    btn._tabBorder = border;
    btn._tabSelected = false;
    btn._tabScale = {selected: 1, normal: 1};

    btn.setSelectedState = function (selected) {
        this._tabSelected = !!selected;
        this._tabBg.setColor(selected ? MedalUiTheme.darkFill : MedalUiTheme.headerFill);
        this._tabLabel.setColor(selected ? MedalUiTheme.inverseText : MedalUiTheme.title);
        this._tabBorder.setColor(selected ? MedalUiTheme.darkFill : MedalUiTheme.frame);
        this.setOpacity(selected ? 255 : 242);
    };
    btn.setSelectedState(false);
    btn.setClickListener(target, cb);
    return btn;
}

function medalViewCreateSummaryCard(title) {
    var node = uiUtil.createPaperPanel(cc.size(176, 62), {
        shadowOffset: cc.p(4, -4),
        shadowOpacity: 22,
        shadowColor: MedalUiTheme.shadow,
        fillColor: MedalUiTheme.summaryFill,
        fillOpacity: 250,
        frameColor: MedalUiTheme.frame,
        frameOpacity: 180
    });

    var titleLabel = uiUtil.createLabel(title, "caption", {
        width: 140,
        fontSize: 18,
        hAlignment: cc.TEXT_ALIGNMENT_CENTER,
        anchorX: 0.5,
        anchorY: 1,
        color: MedalUiTheme.mutedText
    });
    titleLabel.setPosition(node.width / 2, node.height - 10);
    node.addChild(titleLabel);

    var valueLabel = uiUtil.createLabel("0", "title", {
        width: 140,
        fontSize: 30,
        hAlignment: cc.TEXT_ALIGNMENT_CENTER,
        anchorX: 0.5,
        anchorY: 0.5,
        color: MedalUiTheme.title
    });
    valueLabel.setPosition(node.width / 2, 24);
    node.addChild(valueLabel);

    node.valueLabel = valueLabel;
    return node;
}

function medalViewBuildRewardText(stageInfo, stageStrings) {
    var rewardText = medalViewText("rewardPrefix") + ": +" + stageInfo.points + medalViewText("pointSuffix");
    if (stageStrings && stageStrings.des) {
        rewardText += " · " + stageStrings.des;
    }
    return rewardText;
}

function medalViewGetAchievementPoints() {
    if (typeof PurchaseUiHelper !== "undefined"
        && PurchaseUiHelper
        && typeof PurchaseUiHelper.getAchievementPoints === "function") {
        return PurchaseUiHelper.getAchievementPoints();
    }
    return 0;
}

var MedalSeriesScrollView = cc.ScrollView.extend({
    ctor: function (size, owner) {
        this.containerNode = new cc.Layer();
        this.owner = owner;
        this._super(size, this.containerNode);

        this.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        this.setBounceable(false);
        this.setClippingToBounds(true);
        this.setDelegate(this);

        return true;
    },
    scrollViewDidScroll: function (view) {
        if (this.owner && typeof this.owner.onSeriesScrollChanged === "function") {
            this.owner.onSeriesScrollChanged(view);
        }
    },
    scrollViewDidZoom: function (view) {
        if (this.owner && typeof this.owner.onSeriesScrollChanged === "function") {
            this.owner.onSeriesScrollChanged(view);
        }
    }
});

var MedalSceneView = cc.Node.extend({
    _currentCategory: 1,
    _categoryIds: null,
    _tabButtons: null,
    _summaryCards: null,
    _scrollView: null,
    _scrollTrack: null,
    _scrollThumb: null,

    ctor: function (initialCategory) {
        this._super();

        this._categoryIds = Medal.getCategoryIds();
        this._tabButtons = [];
        this._summaryCards = {};

        if (this._categoryIds.length > 0) {
            this._currentCategory = this._categoryIds[0];
        }
        initialCategory = Number(initialCategory);
        if (this._categoryIds.indexOf(initialCategory) !== -1) {
            this._currentCategory = initialCategory;
        }

        this._buildLayout();
        this._switchCategory(this._currentCategory);
    },

    _buildLayout: function () {
        var bg = autoSpriteFrameController.getSpriteFromSpriteName("#medalBg.png");
        var fullWidth = Math.max(bg.width, cc.winSize.width);
        var fullHeight = Math.max(bg.height, cc.winSize.height);
        this.setContentSize(cc.size(fullWidth, fullHeight));
        this.width = fullWidth;
        this.height = fullHeight;

        var paperBase = uiUtil.createColorRect(cc.size(fullWidth, fullHeight), MedalUiTheme.background, 255);
        this.addChild(paperBase);

        bg.setAnchorPoint(0, 0);
        bg.setColor(MedalUiTheme.textureTint);
        bg.setOpacity(22);
        bg.setPosition((fullWidth - bg.width) / 2, fullHeight - bg.height);
        this.addChild(bg);

        var headerPanel = uiUtil.createPaperPanel(cc.size(332, 92), {
            shadowOffset: cc.p(4, -4),
            shadowOpacity: 24,
            shadowColor: MedalUiTheme.shadow,
            fillColor: MedalUiTheme.headerFill,
            fillOpacity: 252,
            frameColor: MedalUiTheme.frame,
            frameOpacity: 200
        });
        headerPanel.setAnchorPoint(0.5, 1);
        headerPanel.setPosition(this.width / 2, this.height - 16);
        this.addChild(headerPanel);

        var headerAccent = uiUtil.createColorRect(cc.size(228, 4), MedalUiTheme.darkFill, 220);
        headerAccent.setPosition((headerPanel.width - 228) / 2, 12);
        headerPanel.addChild(headerAccent);

        this._pageIndicator = new cc.LabelTTF("", uiUtil.fontFamily.normal, 20);
        medalViewApplyLabelStyle(this._pageIndicator, {
            color: MedalUiTheme.mutedText,
            strokeColor: MedalUiTheme.background,
            strokeSize: 1
        });
        this._pageIndicator.setPosition(this.width / 2, this.height - 46);
        this._pageIndicator.setVisible(false);
        this.addChild(this._pageIndicator);

        this._titleLabel = new cc.LabelTTF(medalViewText("title"), uiUtil.fontFamily.normal, 40);
        medalViewApplyLabelStyle(this._titleLabel, {
            color: MedalUiTheme.title,
            strokeColor: MedalUiTheme.background,
            strokeSize: 1
        });
        this._titleLabel.setPosition(this.width / 2, this.height - 74);
        this.addChild(this._titleLabel);

        this._tabBaseline = uiUtil.createColorRect(cc.size(540, 2), MedalUiTheme.frame, 96);
        this._tabBaseline.setPosition((this.width - 540) / 2, this.height - 212);
        this.addChild(this._tabBaseline);

        this._tabMarker = uiUtil.createColorRect(cc.size(92, 4), MedalUiTheme.darkFill, 255);
        this._tabMarker.setAnchorPoint(0.5, 1);
        this._tabMarker.setPosition(this.width / 2, this.height - 208);
        this.addChild(this._tabMarker, 5);

        this._buildTabs();
        this._buildSummaryRow();
        this._buildScrollArea();

        var btnShop = uiUtil.createCommonBtnWhite(medalViewText("shop"), this, function () {
            uiUtil.safeRunScene(function () {
                return new ShopScene();
            });
        });
        btnShop.setPosition(this.width / 2 - 124, 62);
        this.addChild(btnShop);

        var btnBack = uiUtil.createCommonBtnBlack(stringUtil.getString(1193), this, function () {
            uiUtil.safeRunScene(function () {
                return new MenuScene();
            });
        });
        btnBack.setPosition(this.width / 2 + 124, 62);
        this.addChild(btnBack);
    },

    _buildTabs: function () {
        var self = this;
        var tabY = this.height - 180;
        var count = Math.max(1, this._categoryIds.length);
        var tabSpacing = count === 1 ? 0 : Math.min(184, 520 / (count - 1));
        var startX = this.width / 2 - tabSpacing * (count - 1) / 2;

        this._categoryIds.forEach(function (categoryId, idx) {
            var tabBtn = medalViewCreateTabButton(medalViewCategoryLabel(categoryId), self, function (sender) {
                self._switchCategory(sender.categoryId);
            });
            tabBtn.categoryId = categoryId;
            tabBtn.setPosition(startX + idx * tabSpacing, tabY);
            self.addChild(tabBtn, 6);

            var warnIcon = autoSpriteFrameController.getSpriteFromSpriteName("#medalWarn.png");
            warnIcon.setName("warnIcon");
            warnIcon.setScale(0.28);
            warnIcon.setPosition(tabBtn.getContentSize().width - 18, 18);
            warnIcon.setVisible(false);
            tabBtn.addChild(warnIcon, 3);

            self._tabButtons.push(tabBtn);
        });
    },

    _buildSummaryRow: function () {
        var keys = ["summaryPoints", "summaryClaimed", "summaryReady"];
        var names = ["points", "claimed", "ready"];
        var cardSpacing = 194;
        var startX = this.width / 2 - cardSpacing;
        var summaryY = this.height - 262;

        for (var i = 0; i < keys.length; i++) {
            var card = medalViewCreateSummaryCard(medalViewText(keys[i]));
            card.setAnchorPoint(0.5, 0.5);
            card.setPosition(startX + i * cardSpacing, summaryY);
            this.addChild(card, 2);
            this._summaryCards[names[i]] = card;
        }
    },

    _buildScrollArea: function () {
        var viewWidth = 586;
        var scrollBottomY = 128;
        var scrollTopY = this.height - 320;
        var viewHeight = Math.max(220, scrollTopY - scrollBottomY);

        this._scrollView = new MedalSeriesScrollView(cc.size(viewWidth, viewHeight), this);
        this._scrollView.setPosition((this.width - viewWidth) / 2, scrollBottomY);
        this.addChild(this._scrollView);

        this._scrollTrack = uiUtil.createColorRect(cc.size(10, viewHeight), MedalUiTheme.track, 235);
        this._scrollTrack.setPosition(this._scrollView.x + viewWidth + 10, scrollBottomY);
        this.addChild(this._scrollTrack, 4);

        this._scrollThumb = uiUtil.createColorRect(cc.size(10, 88), MedalUiTheme.thumb, 255);
        this._scrollThumb.setAnchorPoint(0.5, 1);
        this._scrollThumb.setPosition(this._scrollTrack.x + 5, scrollBottomY + viewHeight);
        this.addChild(this._scrollThumb, 5);
    },

    _switchCategory: function (categoryId, preserveOffsetY) {
        if (this._categoryIds.indexOf(categoryId) === -1 && this._categoryIds.length) {
            categoryId = this._categoryIds[0];
        }
        this._currentCategory = categoryId;
        this._updateHeader();
        this._updateTabs();
        this._updateSummary();
        this._renderCategoryContent(preserveOffsetY);
    },

    _updateHeader: function () {
        var pageIndex = this._categoryIds.indexOf(this._currentCategory);
        if (pageIndex < 0) {
            pageIndex = 0;
        }
        this._pageIndicator.setString(cc.formatStr(medalViewText("pageFormat"), pageIndex + 1, Math.max(1, this._categoryIds.length)));
    },

    _updateTabs: function () {
        var self = this;
        this._tabButtons.forEach(function (tabBtn) {
            var isSelected = tabBtn.categoryId === self._currentCategory;
            if (typeof tabBtn.setSelectedState === "function") {
                tabBtn.setSelectedState(isSelected);
            }
            var warnIcon = tabBtn.getChildByName("warnIcon");
            if (warnIcon) {
                warnIcon.setVisible(Medal.getClaimableCountByCategory(tabBtn.categoryId) > 0);
            }
            if (isSelected) {
                self._tabMarker.setPosition(tabBtn.x, tabBtn.y - 22);
            }
        });
    },

    _updateSummary: function () {
        if (this._summaryCards.points) {
            this._summaryCards.points.valueLabel.setString(String(medalViewGetAchievementPoints()));
        }
        if (this._summaryCards.claimed) {
            this._summaryCards.claimed.valueLabel.setString(String(Medal.getClaimedStageCount()));
        }
        if (this._summaryCards.ready) {
            this._summaryCards.ready.valueLabel.setString(String(Medal.getTotalClaimableCount()));
        }
    },

    _renderCategoryContent: function (preserveOffsetY) {
        var container = this._scrollView.containerNode;
        container.removeAllChildren(true);
        container.cleanup();

        var viewWidth = this._scrollView.getViewSize().width;
        var viewHeight = this._scrollView.getViewSize().height;
        var seriesIds = Medal.getSeriesIdsByCategory(this._currentCategory);
        var blocks = [];
        var totalHeight = 12;
        var gap = 16;
        var i;

        if (!seriesIds.length) {
            var emptyPanel = uiUtil.createPaperPanel(cc.size(568, 142), {
                shadowOffset: cc.p(4, -4),
                shadowOpacity: 22,
                shadowColor: MedalUiTheme.shadow,
                fillColor: MedalUiTheme.emptyFill,
                fillOpacity: 248,
                frameColor: MedalUiTheme.lightFrame,
                frameOpacity: 170
            });
            var emptyLabel = new cc.LabelTTF(medalViewText("emptyCategory"), uiUtil.fontFamily.normal, 24, cc.size(460, 0), cc.TEXT_ALIGNMENT_CENTER);
            emptyLabel.setColor(MedalUiTheme.text);
            emptyLabel.setPosition(emptyPanel.width / 2, emptyPanel.height / 2);
            emptyPanel.addChild(emptyLabel);
            blocks.push(emptyPanel);
        } else {
            for (i = 0; i < seriesIds.length; i++) {
                blocks.push(this._createSeriesPanel(seriesIds[i]));
            }
        }

        for (i = 0; i < blocks.length; i++) {
            totalHeight += blocks[i].height;
            if (i < blocks.length - 1) {
                totalHeight += gap;
            }
        }
        totalHeight += 12;

        var contentHeight = Math.max(totalHeight, viewHeight);
        container.setContentSize(viewWidth, contentHeight);
        this._scrollView.setContentSize(viewWidth, contentHeight);

        var currentY = contentHeight - 12;
        for (i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            block.setAnchorPoint(0.5, 1);
            block.setPosition(viewWidth / 2, currentY);
            container.addChild(block);
            currentY -= block.height + gap;
        }

        var targetOffsetY = 0;
        if (contentHeight > viewHeight) {
            if (typeof preserveOffsetY === "number") {
                targetOffsetY = Math.max(viewHeight - contentHeight, Math.min(0, preserveOffsetY));
            } else {
                targetOffsetY = viewHeight - contentHeight;
            }
        }
        this._scrollView.setContentOffset(cc.p(0, targetOffsetY));
        this._updateScrollBar();
    },

    _createSeriesPanel: function (seriesId) {
        var state = medalViewSeriesState(seriesId);
        var stageInfo = state.activeInfo;
        var stageStrings = state.activeStrings || medalViewGetStrings(state.activeStageId || seriesId);
        var panelWidth = 570;
        var topPadding = 22;
        var bottomPadding = 24;
        var leftPadding = 24;
        var rightPadding = 24;
        var rightColumnWidth = 150;
        var sideGap = 18;
        var bodyTextWidth = panelWidth - leftPadding - rightPadding - 138 - sideGap;
        var topTextWidth = panelWidth - leftPadding - rightPadding - rightColumnWidth - sideGap;
        var badgeSize = 44;

        var title = uiUtil.createLabel(medalViewSeriesTitle(seriesId), "title", {
            width: topTextWidth,
            fontSize: 34,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: MedalUiTheme.title,
            strokeColor: MedalUiTheme.cardFill,
            strokeSize: 1
        });

        var progressPill = uiUtil.createStatusPill(
            state.claimedCount + "/" + state.totalCount,
            {
                size: cc.size(rightColumnWidth, 34),
                bgColor: state.claimableCount > 0 ? MedalUiTheme.darkFill : MedalUiTheme.mediumFill,
                textColor: state.claimableCount > 0 ? MedalUiTheme.inverseText : MedalUiTheme.title,
                fontSize: 18
            }
        );
        progressPill.setAnchorPoint(1, 1);

        var metaText = medalViewText("finishedAll");
        if (!state.allClaimed && stageInfo) {
            metaText = medalViewText("seriesGoal") + ": " + stageStrings.condition;
        }
        var metaLabel = uiUtil.createLabel(metaText, "meta", {
            width: topTextWidth,
            fontSize: 20,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: MedalUiTheme.mutedText
        });

        var activeTitleText = medalViewText("activeStage");
        if (stageStrings.name) {
            activeTitleText += " · " + stageStrings.name;
        }
        var activeTitle = uiUtil.createLabel(activeTitleText, "sectionTitle", {
            width: bodyTextWidth,
            fontSize: 26,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: MedalUiTheme.title
        });

        var currentTag = null;
        if (!state.allClaimed && stageInfo && stageInfo.claimed !== 1) {
            currentTag = uiUtil.createStatusPill(medalViewText("currentTag"), {
                size: cc.size(56, 24),
                bgColor: MedalUiTheme.darkFill,
                textColor: MedalUiTheme.inverseText,
                fontSize: 14
            });
            currentTag.setAnchorPoint(1, 1);
        }

        var progressText = null;
        var progressNode = null;
        if (stageInfo) {
            progressText = uiUtil.createLabel(stageInfo.aimCompleted + "/" + stageInfo.aim, "meta", {
                fontSize: 20,
                anchorX: 1,
                anchorY: 1,
                color: MedalUiTheme.title
            });
            progressNode = this._createProgressNode(stageInfo, bodyTextWidth);
        }

        var condition = uiUtil.createLabel(stageStrings.condition, "body", {
            width: bodyTextWidth,
            fontSize: 22,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: MedalUiTheme.title
        });

        var reward = uiUtil.createLabel(
            stageInfo ? medalViewBuildRewardText(stageInfo, stageStrings) : medalViewText("rewardPrefix"),
            "caption",
            {
                width: bodyTextWidth,
                fontSize: 19,
                hAlignment: cc.TEXT_ALIGNMENT_LEFT,
                anchorX: 0,
                anchorY: 1,
                color: MedalUiTheme.mutedText
            }
        );

        var actionNode = this._createStageActionNode(state, stageInfo);
        actionNode.setAnchorPoint(1, 0);

        var infoRowHeight = stageInfo ? Math.max(
            progressText ? progressText.getContentSize().height : 0,
            currentTag ? currentTag.height : 0
        ) : 0;
        var progressNodeHeight = progressNode ? progressNode.getContentSize().height : 0;
        var contentHeight = topPadding
            + title.getContentSize().height + 8
            + metaLabel.getContentSize().height + 16
            + badgeSize + 14
            + 1 + 14
            + activeTitle.getContentSize().height;

        if (stageInfo) {
            contentHeight += 8 + infoRowHeight + 8 + progressNodeHeight + 12;
        } else {
            contentHeight += 12;
        }

        contentHeight += condition.getContentSize().height + 8 + reward.getContentSize().height + bottomPadding;

        var panelHeight = Math.max(252, contentHeight);
        var panel = uiUtil.createPaperPanel(cc.size(panelWidth, panelHeight), {
            shadowOffset: cc.p(4, -5),
            shadowOpacity: 24,
            shadowColor: MedalUiTheme.shadow,
            fillColor: MedalUiTheme.cardFill,
            fillOpacity: 252,
            frameColor: stageInfo && stageInfo.completed === 1 && stageInfo.claimed !== 1
                ? MedalUiTheme.frame
                : MedalUiTheme.lightFrame,
            frameOpacity: 190
        });

        var accent = uiUtil.createColorRect(cc.size(panelWidth - 18, 4), MedalUiTheme.darkFill, 220);
        accent.setPosition(9, panelHeight - 8);
        panel.addChild(accent, uiUtil.zOrder.FLOAT);

        var medalIcon = autoSpriteFrameController.getSpriteFromSpriteName("#medalIcon_" + state.iconId + ".png");
        medalIcon.setScale(0.4);
        medalIcon.setColor(MedalUiTheme.textureTint);
        medalIcon.setOpacity(18);
        medalIcon.setPosition(panelWidth - rightPadding - 58, panelHeight - topPadding - 72);
        panel.addChild(medalIcon, uiUtil.zOrder.DECORATION);

        var contentStack = uiUtil.createVStack({
            parent: panel,
            x: leftPadding,
            top: panelHeight - topPadding,
            zOrder: uiUtil.zOrder.CONTENT
        });

        progressPill.setPosition(panelWidth - rightPadding, panelHeight - topPadding);
        panel.addChild(progressPill, uiUtil.zOrder.FLOAT);

        contentStack.add(title, {gapAfter: uiUtil.spacing.XS});
        contentStack.add(metaLabel, {gapAfter: 16});

        var chipStartX = leftPadding + badgeSize / 2;
        var chipY = contentStack.getY() - badgeSize / 2;
        var self = this;
        state.stageIds.forEach(function (stageId, idx) {
            var badge = self._createStageBadge(stageId, state, idx);
            badge.setAnchorPoint(0.5, 0.5);
            badge.setPosition(chipStartX + idx * 50, chipY);
            panel.addChild(badge, uiUtil.zOrder.CONTENT);
        });
        contentStack.reserve(badgeSize, 14);

        var divider = uiUtil.createColorRect(cc.size(panelWidth - leftPadding - rightPadding, 1), MedalUiTheme.divider, 180);
        divider.setPosition(leftPadding, contentStack.getY());
        panel.addChild(divider, uiUtil.zOrder.CONTENT);
        contentStack.reserve(1, 14);
        contentStack.add(activeTitle, {gapAfter: 0});

        var currentY = contentStack.getY();
        if (stageInfo) {
            var rowTopY = currentY - 8;
            var rightEdge = leftPadding + bodyTextWidth;
            if (progressText) {
                progressText.setPosition(rightEdge, rowTopY);
                panel.addChild(progressText, uiUtil.zOrder.CONTENT);
                rightEdge -= progressText.getContentSize().width + 10;
            }
            if (currentTag) {
                currentTag.setPosition(rightEdge, rowTopY);
                panel.addChild(currentTag, uiUtil.zOrder.FLOAT);
            }

            currentY = rowTopY - infoRowHeight - 8;
            progressNode.setPosition(leftPadding, currentY - progressNodeHeight);
            panel.addChild(progressNode, uiUtil.zOrder.CONTENT);
            currentY -= progressNodeHeight + 12;
        } else {
            currentY -= 12;
        }

        contentStack.setY(currentY);
        contentStack.add(condition, {gapAfter: uiUtil.spacing.XS});
        contentStack.add(reward, {gapAfter: 0});

        actionNode.setPosition(panelWidth - rightPadding, bottomPadding);
        panel.addChild(actionNode, uiUtil.zOrder.FLOAT);

        return panel;
    },

    _createProgressNode: function (stageInfo, width) {
        var node = new cc.Node();
        var barWidth = Math.max(210, width || 320);
        var barHeight = 22;
        var percent = medalViewProgressPercent(stageInfo) / 100;
        var innerWidth = barWidth - 4;
        var innerHeight = barHeight - 4;
        var fillWidth = percent <= 0 ? 0 : Math.max(8, Math.round(innerWidth * percent));
        fillWidth = Math.min(innerWidth, fillWidth);

        node.setContentSize(barWidth, barHeight);
        node.width = barWidth;
        node.height = barHeight;

        var frame = uiUtil.createColorRect(cc.size(barWidth, barHeight), MedalUiTheme.frame, 235);
        frame.setPosition(0, 0);
        node.addChild(frame);

        var pbBg = uiUtil.createColorRect(cc.size(innerWidth, innerHeight), MedalUiTheme.progressBg, 255);
        pbBg.setPosition(2, 2);
        node.addChild(pbBg);

        if (fillWidth > 0) {
            var fill = uiUtil.createColorRect(cc.size(fillWidth, innerHeight), MedalUiTheme.progressFill, 255);
            fill.setPosition(2, 2);
            node.addChild(fill);
        }

        return node;
    },

    _createStageActionNode: function (state, stageInfo) {
        if (!stageInfo) {
            return uiUtil.createStatusPill(medalViewText("notReady"), {
                size: cc.size(136, 40),
                bgColor: MedalUiTheme.softFill,
                textColor: MedalUiTheme.title,
                fontSize: 18
            });
        }

        if (stageInfo.completed === 1 && stageInfo.claimed === 0) {
            var stageId = state.activeStageId;
            var btn = uiUtil.createSpriteBtn({
                normal: "btn_common_black_normal.png",
                fontInfo: {
                    txt: medalViewText("claimPrefix") + stageInfo.points + medalViewText("pointSuffix"),
                    fontSize: 20
                }
            }, this, function () {
                this._claimStageReward(stageId);
            }, cc.rect(1, 1, 1, 1));
            btn.setPreferredSize(cc.size(136, 40));
            btn.setZoomOnTouchDown(false);
            btn.setTitleColorForState(MedalUiTheme.inverseText, cc.CONTROL_STATE_NORMAL);
            btn.setTitleColorForState(cc.color(48, 48, 48, 255), cc.CONTROL_STATE_HIGHLIGHTED);
            return btn;
        }

        if (stageInfo.claimed === 1) {
            return uiUtil.createStatusPill(medalViewText("claimed"), {
                size: cc.size(136, 40),
                bgColor: MedalUiTheme.darkFill,
                textColor: MedalUiTheme.inverseText,
                fontSize: 18
            });
        }

        return uiUtil.createStatusPill(medalViewText("inProgress"), {
            size: cc.size(136, 40),
            bgColor: MedalUiTheme.mediumFill,
            textColor: MedalUiTheme.title,
            fontSize: 18
        });
    },

    _createStageBadge: function (stageId, seriesState) {
        var stageInfo = Medal._map[stageId];
        var stageLevel = stageInfo && stageInfo.stageLevel ? stageInfo.stageLevel : (stageId % 100);
        var isCurrent = stageId === seriesState.activeStageId && !seriesState.allClaimed;
        var bgColor = MedalUiTheme.softFill;
        var textColor = MedalUiTheme.text;

        if (stageInfo && stageInfo.claimed === 1) {
            bgColor = MedalUiTheme.darkFill;
            textColor = MedalUiTheme.inverseText;
        } else if (stageInfo && stageInfo.completed === 1) {
            bgColor = MedalUiTheme.mediumFill;
            textColor = MedalUiTheme.inverseText;
        } else if (isCurrent) {
            bgColor = MedalUiTheme.frame;
            textColor = MedalUiTheme.inverseText;
        }

        return uiUtil.createStatusPill(medalViewStageBadgeText(stageLevel), {
            size: cc.size(44, 44),
            bgColor: bgColor,
            textColor: textColor,
            fontSize: 18
        });
    },

    _claimStageReward: function (stageId) {
        if (!stageId || !Medal._map[stageId]) {
            return;
        }

        var medalInfo = Medal._map[stageId];
        var oldOffset = this._scrollView.getContentOffset();
        if (Medal.claimAchievement(stageId)) {
            uiUtil.showTip(medalViewText("claimTip") + medalInfo.points);
            this._updateTabs();
            this._updateSummary();
            this._renderCategoryContent(oldOffset.y);
        }
    },

    onSeriesScrollChanged: function () {
        this._updateScrollBar();
    },

    _updateScrollBar: function () {
        if (!this._scrollView || !this._scrollTrack || !this._scrollThumb) {
            return;
        }

        var viewHeight = this._scrollView.getViewSize().height;
        var contentHeight = this._scrollView.getContentSize().height;
        if (contentHeight <= viewHeight) {
            this._scrollThumb.setVisible(false);
            return;
        }

        this._scrollThumb.setVisible(true);
        var trackHeight = this._scrollTrack.getContentSize().height;
        var thumbHeight = Math.max(54, trackHeight * viewHeight / contentHeight);
        var maxOffset = 0;
        var minOffset = viewHeight - contentHeight;
        var offsetY = this._scrollView.getContentOffset().y;
        var ratio = maxOffset === minOffset ? 0 : (offsetY - minOffset) / (maxOffset - minOffset);
        ratio = Math.max(0, Math.min(1, ratio));

        this._scrollThumb.setContentSize(cc.size(10, thumbHeight));
        this._scrollThumb.setPosition(
            this._scrollTrack.x + 5,
            this._scrollTrack.y + trackHeight - (trackHeight - thumbHeight) * ratio
        );
    }
});
