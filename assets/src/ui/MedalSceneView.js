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
        summaryPoints: "成就点",
        currentStage: "当前阶段",
        finishedAll: "本系列已全部完成",
        rewardPrefix: "奖励",
        claimPrefix: "领取 +",
        pointSuffix: "点",
        inProgress: "进行中",
        claimed: "已领取",
        claimedReward: "已领取奖励",
        notReady: "未达成",
        shop: "兑换商店",
        claimTip: "获得成就点: ",
        emptyCategory: "该分类暂无成就",
        seriesGoal: "目标"
    },
    en: {
        title: "Achievements",
        summaryPoints: "Points",
        currentStage: "Current Stage",
        finishedAll: "This series is fully completed",
        rewardPrefix: "Reward",
        claimPrefix: "Claim +",
        pointSuffix: " pts",
        inProgress: "In Progress",
        claimed: "Claimed",
        claimedReward: "Reward Claimed",
        notReady: "Locked",
        shop: "Exchange",
        claimTip: "Achievement points +",
        emptyCategory: "No achievements in this category",
        seriesGoal: "Goal"
    }
};

var MedalUiTheme = (typeof UITheme !== "undefined" && UITheme && UITheme.preGame)
    ? UITheme.preGame
    : {
        background: cc.color(0, 0, 0, 255),
        panel: cc.color(8, 8, 8, 255),
        panelSoft: cc.color(18, 18, 18, 255),
        progressTrack: cc.color(20, 20, 20, 255),
        progressFill: cc.color(255, 255, 255, 255),
        points: cc.color(236, 200, 74, 255),
        border: cc.color(255, 255, 255, 196),
        borderStrong: cc.color(255, 255, 255, 255),
        divider: cc.color(255, 255, 255, 90),
        text: cc.color(255, 255, 255, 255),
        textSoft: cc.color(255, 255, 255, 220),
        textMuted: cc.color(255, 255, 255, 180),
        textFaint: cc.color(255, 255, 255, 120),
        pressedFill: cc.color(255, 255, 255, 32)
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
        bgSprite.setColor(MedalUiTheme.text);
        bgSprite.setOpacity(medalInfo && medalInfo.claimed === 1 ? 110 : 54);
        bgSprite.setPosition(size.width / 2, size.height / 2);
        node.addChild(bgSprite);
    } else {
        var bgRect = uiUtil.createColorRect(size, MedalUiTheme.text, medalInfo && medalInfo.claimed === 1 ? 110 : 54);
        bgRect.setPosition(0, 0);
        node.addChild(bgRect);
    }

    if (starSprite) {
        starSprite.setColor(MedalUiTheme.text);
        starSprite.setOpacity(medalInfo && medalInfo.completed === 1 ? 255 : 120);
        starSprite.setPosition(size.width / 2, size.height / 2);
        node.addChild(starSprite, 1);
    } else {
        var starLabel = new cc.LabelTTF(String(displayLevel), uiUtil.fontFamily.normal, 18);
        starLabel.setColor(MedalUiTheme.text);
        starLabel.setOpacity(medalInfo && medalInfo.completed === 1 ? 255 : 120);
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

function medalViewGetAchievementPoints() {
    if (typeof PurchaseUiHelper !== "undefined"
        && PurchaseUiHelper
        && typeof PurchaseUiHelper.getAchievementPoints === "function") {
        return PurchaseUiHelper.getAchievementPoints();
    }
    return 0;
}

function medalViewCreateOutlinePanel(size, opt) {
    opt = opt || {};
    return uiUtil.createPreGameOutlinePanel(size, {
        fillColor: opt.fillColor || MedalUiTheme.panel,
        fillOpacity: opt.fillOpacity,
        borderColor: opt.borderColor || MedalUiTheme.border,
        lineWidth: opt.lineWidth
    });
}

function medalViewCreateOutlineButton(txt, target, cb, opt) {
    opt = opt || {};
    return uiUtil.createPreGameOutlineButton(txt, target, cb, {
        size: opt.size || MedalUiTheme.footerButtonSize || cc.size(190, 52),
        fontSize: opt.fontSize || MedalUiTheme.footerButtonFontSize || 24,
        fillColor: opt.fillColor || MedalUiTheme.panel,
        fillOpacity: opt.fillOpacity,
        borderColor: opt.borderColor || MedalUiTheme.borderStrong,
        lineWidth: opt.lineWidth,
        textColor: opt.textColor || MedalUiTheme.text
    });
}

function medalViewCreateTabButton(txt, target, cb) {
    var size = cc.size(156, 38);
    var btn = new ButtonWithPressed(size);

    var label = new cc.LabelTTF(txt || "", uiUtil.fontFamily.normal, 21, cc.size(size.width, 0), cc.TEXT_ALIGNMENT_CENTER);
    label.setName("label");
    label.setPosition(size.width / 2, size.height / 2 + 3);
    label.setColor(MedalUiTheme.text);
    btn.addChild(label, 1);

    var underline = uiUtil.createColorRect(cc.size(size.width - 44, 2), MedalUiTheme.text, 255);
    underline.setName("underline");
    underline.setPosition(22, 4);
    underline.setVisible(false);
    btn.addChild(underline, 1);

    btn.setSelectedState = function (selected) {
        label.setOpacity(selected ? 255 : 150);
        underline.setVisible(!!selected);
    };

    btn.setSelectedState(false);

    if (target && cb) {
        btn.setClickListener(target, cb);
    }

    return btn;
}

function medalViewCreateStatusNode(txt, opt) {
    opt = opt || {};

    var size = opt.size || cc.size(144, 42);
    var node = medalViewCreateOutlinePanel(size, {
        fillColor: opt.fillColor || MedalUiTheme.panelSoft,
        fillOpacity: opt.fillOpacity === undefined ? 150 : opt.fillOpacity,
        borderColor: opt.borderColor || MedalUiTheme.border,
        lineWidth: 1
    });
    node.setName(opt.name || "statusPill");

    var label = new cc.LabelTTF(
        txt || "",
        uiUtil.fontFamily.normal,
        opt.fontSize || 19,
        cc.size(size.width - 16, 0),
        cc.TEXT_ALIGNMENT_CENTER
    );
    label.setName("label");
    label.setColor(opt.textColor || MedalUiTheme.textSoft);
    label.setPosition(size.width / 2, size.height / 2);
    node.addChild(label, 1);

    return node;
}

function medalViewCreateProgressBar(width, medalInfo) {
    var size = cc.size(width, 18);
    var node = medalViewCreateOutlinePanel(size, {
        fillColor: MedalUiTheme.progressTrack,
        fillOpacity: 170,
        borderColor: MedalUiTheme.divider,
        lineWidth: 1
    });
    var innerWidth = Math.max(0, size.width - 4);
    var percent = medalViewProgressPercent(medalInfo) / 100;
    var fillWidth = percent <= 0 ? 0 : Math.max(6, Math.round(innerWidth * percent));
    fillWidth = Math.min(innerWidth, fillWidth);

    if (fillWidth > 0) {
        var fill = uiUtil.createColorRect(cc.size(fillWidth, size.height - 4), MedalUiTheme.progressFill, 235);
        fill.setPosition(2, 2);
        node.addChild(fill, 1);
    }

    return node;
}

function medalViewBuildDetailText(stageInfo, stageStrings) {
    var parts = [];
    if (stageStrings && stageStrings.des) {
        parts.push(stageStrings.des);
    }
    if (stageInfo && stageInfo.points !== undefined && stageInfo.points !== null) {
        parts.push(medalViewText("rewardPrefix") + ": +" + stageInfo.points + medalViewText("pointSuffix"));
    }
    return parts.join("  ");
}

function medalViewResolveInitialCategory(initialCategoryOrSeries) {
    var value = Number(initialCategoryOrSeries);
    if (!isFinite(value)) {
        return null;
    }

    if (Medal.getCategoryIds().indexOf(value) !== -1) {
        return value;
    }

    var stageIds = Medal.getStageIdsBySeries(value);
    if (stageIds.length) {
        return Medal.getCategoryIdByMedalId(stageIds[0]);
    }

    return null;
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
    _scrollView: null,
    _scrollTrack: null,
    _scrollThumb: null,
    _pendingRefreshOffsetY: null,
    _recentClaimedStageId: null,

    ctor: function (initialCategoryOrSeries) {
        this._super();

        this._categoryIds = Medal.getCategoryIds();
        this._tabButtons = [];

        if (this._categoryIds.length > 0) {
            this._currentCategory = this._categoryIds[0];
        }

        var resolvedCategory = medalViewResolveInitialCategory(initialCategoryOrSeries);
        if (resolvedCategory && this._categoryIds.indexOf(resolvedCategory) !== -1) {
            this._currentCategory = resolvedCategory;
        }

        this._buildLayout();
        this._refreshCurrentCategoryView();
    },

    onEnter: function () {
        this._super();
        PurchaseUiHelper.bindShopStateListener(this, this._onShopStateChanged);
    },

    onExit: function () {
        PurchaseUiHelper.unbindShopStateListener(this);
        this._super();
    },

    _buildLayout: function () {
        var bg = autoSpriteFrameController.getSpriteFromSpriteName("#medalBg.png");
        var fullWidth = Math.max(bg ? bg.width : 640, cc.winSize.width);
        var fullHeight = Math.max(bg ? bg.height : 1136, cc.winSize.height);
        this.setContentSize(cc.size(fullWidth, fullHeight));
        this.width = fullWidth;
        this.height = fullHeight;

        var background = uiUtil.createPreGameBackground(cc.size(fullWidth, fullHeight));
        this.addChild(background);

        var header = uiUtil.createPreGameHeader({
            parent: this,
            width: fullWidth,
            height: fullHeight,
            titleText: medalViewText("title"),
            showPoints: true,
            pointsAlignRight: true,
            zOrder: 2
        });
        this._titleLabel = header.title;
        this._pointsLabel = header.points;

        this._buildTabs();
        this._buildScrollArea();

        var footerY = MedalUiTheme.footerY || 62;
        var btnShop = medalViewCreateOutlineButton(medalViewText("shop"), this, function () {
            uiUtil.safeRunScene(function () {
                return new ShopScene();
            });
        });
        var btnBack = medalViewCreateOutlineButton(stringUtil.getString(1193), this, function () {
            uiUtil.safeRunScene(function () {
                return new MenuScene();
            });
        });
        this.addChild(btnShop, 3);
        this.addChild(btnBack, 3);
        uiUtil.layoutPreGameFooter([btnShop, btnBack], {
            width: fullWidth,
            y: footerY
        });
    },

    _buildTabs: function () {
        var self = this;
        var tabY = this.height - 104;
        var count = Math.max(1, this._categoryIds.length);
        var tabSpacing = count === 1 ? 0 : Math.min(172, 492 / (count - 1));
        var startX = this.width / 2 - tabSpacing * (count - 1) / 2;

        this._categoryIds.forEach(function (categoryId, idx) {
            var tabBtn = medalViewCreateTabButton(medalViewCategoryLabel(categoryId), self, function (sender) {
                self._switchCategory(sender.categoryId);
            });
            tabBtn.categoryId = categoryId;
            tabBtn.setPosition(startX + idx * tabSpacing, tabY);
            self.addChild(tabBtn, 3);

            var warnDot = uiUtil.createColorRect(cc.size(8, 8), MedalUiTheme.text, 255);
            warnDot.setName("warnDot");
            warnDot.setPosition(tabBtn.width - 20, tabBtn.height - 16);
            warnDot.setVisible(false);
            tabBtn.addChild(warnDot, 2);

            self._tabButtons.push(tabBtn);
        });
    },

    _buildScrollArea: function () {
        var viewWidth = 588;
        var scrollBottomY = 142;
        var scrollTopY = this.height - 158;
        var viewHeight = Math.max(220, scrollTopY - scrollBottomY);

        this._scrollView = new MedalSeriesScrollView(cc.size(viewWidth, viewHeight), this);
        this._scrollView.setPosition((this.width - viewWidth) / 2, scrollBottomY);
        this.addChild(this._scrollView);

        this._scrollTrack = uiUtil.createColorRect(cc.size(3, viewHeight), MedalUiTheme.divider, 80);
        this._scrollTrack.setPosition(this._scrollView.x + viewWidth + 12, scrollBottomY);
        this.addChild(this._scrollTrack, 1);

        this._scrollThumb = uiUtil.createColorRect(cc.size(3, 84), MedalUiTheme.text, 145);
        this._scrollThumb.setPosition(this._scrollTrack.x + 1.5, scrollBottomY + viewHeight - 84);
        this.addChild(this._scrollThumb, 2);
    },

    _switchCategory: function (categoryId, preserveOffsetY) {
        if (this._categoryIds.indexOf(categoryId) === -1 && this._categoryIds.length) {
            categoryId = this._categoryIds[0];
        }

        this._currentCategory = categoryId;
        this._updateHeader();
        this._updateTabs();
        this._renderCategoryContent(preserveOffsetY);
    },

    _updateHeader: function () {
        this._titleLabel.setString(medalViewText("title"));
        this._pointsLabel.setString(medalViewText("summaryPoints") + ": " + medalViewGetAchievementPoints());
    },

    _updateTabs: function () {
        var self = this;
        this._tabButtons.forEach(function (tabBtn) {
            var isSelected = tabBtn.categoryId === self._currentCategory;
            if (typeof tabBtn.setSelectedState === "function") {
                tabBtn.setSelectedState(isSelected);
            }

            var warnDot = tabBtn.getChildByName("warnDot");
            if (warnDot) {
                warnDot.setVisible(Medal.getClaimableCountByCategory(tabBtn.categoryId) > 0);
            }
        });
    },

    _renderCategoryContent: function (preserveOffsetY) {
        var container = this._scrollView.containerNode;
        container.removeAllChildren(true);
        container.cleanup();

        var viewWidth = this._scrollView.getViewSize().width;
        var viewHeight = this._scrollView.getViewSize().height;
        var seriesIds = Medal.getSeriesIdsByCategory(this._currentCategory);
        var rows = [];
        var totalHeight = 16;
        var rowGap = 20;
        var i;

        if (!seriesIds.length) {
            var emptyPanel = medalViewCreateOutlinePanel(cc.size(568, 140), {
                fillColor: MedalUiTheme.panel,
                borderColor: MedalUiTheme.border
            });
            var emptyLabel = new cc.LabelTTF(
                medalViewText("emptyCategory"),
                uiUtil.fontFamily.normal,
                24,
                cc.size(500, 0),
                cc.TEXT_ALIGNMENT_CENTER
            );
            emptyLabel.setColor(MedalUiTheme.textSoft);
            emptyLabel.setPosition(emptyPanel.width / 2, emptyPanel.height / 2);
            emptyPanel.addChild(emptyLabel, 1);
            rows.push(emptyPanel);
        } else {
            for (i = 0; i < seriesIds.length; i++) {
                rows.push(this._createSeriesPanel(seriesIds[i]));
            }
        }

        for (i = 0; i < rows.length; i++) {
            totalHeight += rows[i].height;
            if (i < rows.length - 1) {
                totalHeight += rowGap;
            }
        }
        totalHeight += 88;

        var contentHeight = Math.max(totalHeight, viewHeight);
        container.setContentSize(viewWidth, contentHeight);
        this._scrollView.setContentSize(viewWidth, contentHeight);

        var currentY = contentHeight - 16;
        for (i = 0; i < rows.length; i++) {
            var row = rows[i];
            row.setAnchorPoint(0.5, 1);
            row.setPosition(viewWidth / 2, currentY);
            container.addChild(row, 1);
            currentY -= row.height + rowGap;
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
        if (this._recentClaimedStageId && state.stageIds.indexOf(this._recentClaimedStageId) !== -1) {
            state.activeStageId = this._recentClaimedStageId;
            state.activeInfo = Medal._map[this._recentClaimedStageId];
            state.activeStrings = medalViewGetStrings(this._recentClaimedStageId);
            state.allClaimed = false;
        }
        var stageInfo = state.activeInfo;
        var stageStrings = state.activeStrings || medalViewGetStrings(state.activeStageId || seriesId);
        var panelWidth = 570;
        var contentX = 176;
        var contentWidth = panelWidth - contentX - 28;
        var currentStageText = state.allClaimed
            ? medalViewText("finishedAll")
            : medalViewText("currentStage") + "  " + (stageStrings.name || medalViewSeriesTitle(seriesId));
        var goalText = stageStrings.condition
            ? medalViewText("seriesGoal") + ": " + stageStrings.condition
            : medalViewText("seriesGoal");
        var detailText = medalViewBuildDetailText(stageInfo, stageStrings);

        var titleLabel = uiUtil.createLabel(medalViewSeriesTitle(seriesId), "title", {
            width: contentWidth - 74,
            fontSize: 26,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: MedalUiTheme.text
        });
        var countLabel = uiUtil.createLabel(state.claimedCount + "/" + state.totalCount, "body", {
            width: 70,
            fontSize: 23,
            hAlignment: cc.TEXT_ALIGNMENT_RIGHT,
            anchorX: 1,
            anchorY: 1,
            color: MedalUiTheme.text
        });
        var goalLabel = uiUtil.createLabel(goalText, "body", {
            width: contentWidth,
            fontSize: 18,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: MedalUiTheme.textSoft
        });
        var currentLabel = uiUtil.createLabel(currentStageText, "sectionTitle", {
            width: contentWidth - 82,
            fontSize: 20,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: MedalUiTheme.text
        });
        var progressLabel = uiUtil.createLabel(
            stageInfo ? (stageInfo.aimCompleted + "/" + stageInfo.aim) : "0/0",
            "body",
            {
                width: 82,
                fontSize: 18,
                hAlignment: cc.TEXT_ALIGNMENT_RIGHT,
                anchorX: 1,
                anchorY: 1,
                color: MedalUiTheme.textSoft
            }
        );
        var detailLabel = uiUtil.createLabel(detailText, "body", {
            width: contentWidth,
            fontSize: 17,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: MedalUiTheme.textMuted
        });
        var actionNode = this._createStageActionNode(state, stageInfo);
        var progressNode = medalViewCreateProgressBar(320, stageInfo);
        var stageBadgeHeight = 32;
        var bottomAreaHeight = Math.max(58, actionNode.height + 16);
        var detailHeight = detailText ? detailLabel.getContentSize().height : 0;
        var panelHeight = Math.max(
            230,
            22 + titleLabel.getContentSize().height
            + 8 + goalLabel.getContentSize().height
            + 14 + stageBadgeHeight
            + 12 + 1 + 12
            + currentLabel.getContentSize().height
            + 10 + progressNode.height
            + 10 + detailHeight
            + bottomAreaHeight
        );

        var panel = medalViewCreateOutlinePanel(cc.size(panelWidth, panelHeight), {
            fillColor: MedalUiTheme.panel,
            borderColor: MedalUiTheme.border
        });

        var icon = autoSpriteFrameController.getSpriteFromSpriteName("#medalIcon_" + (state.iconId || 1) + ".png");
        if (icon) {
            icon.setColor(MedalUiTheme.text);
            icon.setScale(0.78);
            icon.setPosition(86, panelHeight - 88);
            panel.addChild(icon, 1);
        }

        if (state.claimableCount > 0 && icon) {
            var warnDot = uiUtil.createColorRect(cc.size(10, 10), MedalUiTheme.text, 255);
            warnDot.setPosition(icon.x + 34, icon.y + 34);
            panel.addChild(warnDot, 2);
        }

        var level = stageInfo && stageInfo.stageLevel ? stageInfo.stageLevel : (state.activeStageId ? state.activeStageId % 100 : 1);
        var starNode = medalViewGetStarSprite(level, stageInfo);
        starNode.setAnchorPoint(0.5, 0.5);
        starNode.setScale(0.78);
        starNode.setPosition(86, panelHeight - 174);
        panel.addChild(starNode, 1);

        titleLabel.setPosition(contentX, panelHeight - 22);
        panel.addChild(titleLabel, 1);

        countLabel.setPosition(panelWidth - 28, panelHeight - 22);
        panel.addChild(countLabel, 1);

        goalLabel.setPosition(contentX, titleLabel.y - titleLabel.getContentSize().height - 8);
        panel.addChild(goalLabel, 1);

        var badgeY = goalLabel.y - goalLabel.getContentSize().height - 16;
        var badgeX = contentX + 15;
        for (var i = 0; i < state.stageIds.length; i++) {
            var badge = this._createStageBadge(state.stageIds[i], state);
            badge.setAnchorPoint(0.5, 0.5);
            badge.setPosition(badgeX + i * 40, badgeY);
            panel.addChild(badge, 1);
        }

        var dividerY = badgeY - 22;
        var divider = uiUtil.createColorRect(cc.size(panelWidth - contentX - 24, 1), MedalUiTheme.divider, 255);
        divider.setPosition(contentX, dividerY);
        panel.addChild(divider, 1);

        currentLabel.setPosition(contentX, dividerY - 12);
        panel.addChild(currentLabel, 1);

        progressLabel.setPosition(panelWidth - 28, dividerY - 12);
        panel.addChild(progressLabel, 1);

        progressNode.setPosition(contentX, currentLabel.y - currentLabel.getContentSize().height - 10 - progressNode.height);
        panel.addChild(progressNode, 1);

        if (detailText) {
            detailLabel.setPosition(contentX, progressNode.y - 10);
            panel.addChild(detailLabel, 1);
        }

        actionNode.setAnchorPoint(1, 0);
        actionNode.setPosition(panelWidth - 28, 18);
        panel.addChild(actionNode, 1);

        return panel;
    },

    _createStageActionNode: function (state, stageInfo) {
        if (!stageInfo) {
            return medalViewCreateStatusNode(medalViewText("notReady"), {
                size: cc.size(144, 42),
                borderColor: MedalUiTheme.border,
                fillOpacity: 96,
                textColor: MedalUiTheme.textFaint
            });
        }

        if (stageInfo.completed === 1 && stageInfo.claimed === 0) {
            var stageId = state.activeStageId;
            return medalViewCreateOutlineButton(
                medalViewText("claimPrefix") + stageInfo.points + medalViewText("pointSuffix"),
                this,
                function () {
                    this._claimStageReward(stageId);
                },
                {
                    size: cc.size(170, 46),
                    fontSize: 20,
                    fillColor: MedalUiTheme.panelSoft,
                    fillOpacity: 220,
                    borderColor: MedalUiTheme.borderStrong,
                    textColor: MedalUiTheme.text
                }
            );
        }

        if (stageInfo.claimed === 1) {
            return medalViewCreateStatusNode(medalViewText("claimedReward"), {
                size: cc.size(164, 42),
                borderColor: MedalUiTheme.border,
                fillOpacity: 112,
                textColor: MedalUiTheme.textMuted
            });
        }

        return medalViewCreateStatusNode(medalViewText("inProgress"), {
            size: cc.size(144, 42),
            borderColor: MedalUiTheme.border,
            fillOpacity: 128,
            textColor: MedalUiTheme.textSoft
        });
    },

    _refreshCurrentCategoryView: function (preserveOffsetY) {
        this._updateHeader();
        this._updateTabs();
        this._renderCategoryContent(preserveOffsetY);
    },

    _refreshCurrentCategoryViewDeferred: function () {
        var self = this;
        var refresh = function () {
            var offsetY = 0;
            if (self._scrollView && typeof self._scrollView.getContentOffset === "function") {
                offsetY = self._scrollView.getContentOffset().y;
            }
            self._refreshCurrentCategoryView(offsetY);
        };

        if (typeof this.scheduleOnce === "function") {
            this.scheduleOnce(function () {
                refresh();
            }, 0.02);
        } else {
            refresh();
        }
    },

    _onShopStateChanged: function () {
        var self = this;
        var offsetY = typeof this._pendingRefreshOffsetY === "number"
            ? this._pendingRefreshOffsetY
            : (this._scrollView && typeof this._scrollView.getContentOffset === "function"
                ? this._scrollView.getContentOffset().y
                : 0);
        this._pendingRefreshOffsetY = null;

        if (typeof this.scheduleOnce === "function") {
            this.scheduleOnce(function () {
                self._refreshCurrentCategoryView(offsetY);
            }, 0.02);
        } else {
            this._refreshCurrentCategoryView(offsetY);
        }
    },

    _createStageBadge: function (stageId, seriesState) {
        var stageInfo = Medal._map[stageId];
        var stageLevel = stageInfo && stageInfo.stageLevel ? stageInfo.stageLevel : (stageId % 100);
        var isCurrent = stageId === seriesState.activeStageId && !seriesState.allClaimed;
        var fillOpacity = 255;
        var borderColor = MedalUiTheme.border;
        var textOpacity = 144;

        if (stageInfo && stageInfo.claimed === 1) {
            borderColor = MedalUiTheme.borderStrong;
            textOpacity = 255;
        } else if (stageInfo && stageInfo.completed === 1) {
            borderColor = MedalUiTheme.borderStrong;
            fillOpacity = 255;
            textOpacity = 220;
        } else if (isCurrent) {
            borderColor = MedalUiTheme.borderStrong;
            fillOpacity = 255;
            textOpacity = 255;
        }

        var badge = medalViewCreateOutlinePanel(cc.size(30, 30), {
            fillColor: MedalUiTheme.panelSoft,
            fillOpacity: fillOpacity,
            borderColor: borderColor,
            lineWidth: 1
        });
        var label = new cc.LabelTTF(medalViewStageBadgeText(stageLevel), uiUtil.fontFamily.normal, 18);
        label.setColor(MedalUiTheme.text);
        label.setOpacity(textOpacity);
        label.setPosition(15, 15);
        badge.addChild(label, 1);

        return badge;
    },

    _claimStageReward: function (stageId) {
        if (!stageId || !Medal._map[stageId]) {
            return;
        }

        var medalInfo = Medal._map[stageId];
        this._pendingRefreshOffsetY = this._scrollView && typeof this._scrollView.getContentOffset === "function"
            ? this._scrollView.getContentOffset().y
            : 0;
        this._recentClaimedStageId = stageId;
        if (Medal.claimAchievement(stageId)) {
            uiUtil.showTip(medalViewText("claimTip") + medalInfo.points);
            this._refreshCurrentCategoryView(this._pendingRefreshOffsetY);
        } else {
            this._recentClaimedStageId = null;
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

        this._scrollThumb.setContentSize(cc.size(3, thumbHeight));
        this._scrollThumb.setPosition(
            this._scrollTrack.x + 1.5,
            this._scrollTrack.y + (trackHeight - thumbHeight) * ratio
        );
    }
});
