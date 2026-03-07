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
        summaryPoints: "累计成就点数: ",
        summaryClaimed: "已领取阶段: ",
        summaryReady: "待领取: ",
        currentTarget: "当前目标",
        finishedAll: "本系列全部阶段已领取",
        activeStage: "当前阶段",
        stageProgress: "阶段进度",
        rewardPrefix: "奖励: ",
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
        seriesGoal: "系列目标"
    },
    en: {
        title: "Achievements",
        pageFormat: "%d/%d",
        summaryPoints: "Achievement Points: ",
        summaryClaimed: "Claimed: ",
        summaryReady: "Ready: ",
        currentTarget: "Current Goal",
        finishedAll: "All stages in this series are claimed",
        activeStage: "Current Stage",
        stageProgress: "Stage Progress",
        rewardPrefix: "Reward: ",
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
        seriesGoal: "Series Goal"
    }
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
        .replace(/\([^)]*Grade[^)]*\)/ig, "")
        .replace(/^\s+|\s+$/g, "");
}

function medalViewStageBadgeText(level) {
    if (medalViewIsEnglish()) {
        var enMap = {3: "III", 2: "II", 1: "I"};
        return enMap[level] || String(level || "");
    }
    var zhMap = {3: "三", 2: "二", 1: "一"};
    return zhMap[level] || String(level || "");
}

function medalViewGetStarSprite(level, medalInfo) {
    if (level == 1 && medalInfo && medalInfo.completed) {
        return autoSpriteFrameController.getSpriteFromSpriteName("#star_3.png");
    }
    return autoSpriteFrameController.getSpriteFromSpriteName("#star_" + (3 - level) + ".png");
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

function medalViewTotalClaimedCount() {
    return Medal.getClaimedStageCount();
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

    ctor: function (initialCategory) {
        this._super();

        this._categoryIds = Medal.getCategoryIds();
        this._tabButtons = [];

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

        var paperBase = uiUtil.createColorRect(cc.size(fullWidth, fullHeight), cc.color(232, 228, 218, 255), 255);
        this.addChild(paperBase);

        bg.setAnchorPoint(0, 0);
        bg.setOpacity(46);
        bg.setPosition((fullWidth - bg.width) / 2, fullHeight - bg.height);
        this.addChild(bg);

        var headerPanel = uiUtil.createPaperPanel(cc.size(316, 86), {
            shadowOpacity: 16,
            fillColor: cc.color(244, 240, 233, 255),
            fillOpacity: 250,
            frameColor: cc.color(178, 162, 142, 255),
            frameOpacity: 156
        });
        headerPanel.setAnchorPoint(0.5, 1);
        headerPanel.setPosition(this.width / 2, this.height - 12);
        this.addChild(headerPanel);

        var headerAccent = uiUtil.createColorRect(cc.size(208, 4), cc.color(117, 87, 59, 255), 185);
        headerAccent.setPosition((headerPanel.width - 208) / 2, 12);
        headerPanel.addChild(headerAccent);

        this._pageIndicator = new cc.LabelTTF("", uiUtil.fontFamily.normal, 22);
        medalViewApplyLabelStyle(this._pageIndicator, {
            color: cc.color(112, 96, 79, 255),
            strokeColor: cc.color(247, 243, 236, 255),
            strokeSize: 1
        });
        this._pageIndicator.setPosition(this.width / 2, this.height - 44);
        this._pageIndicator.setVisible(false);
        this.addChild(this._pageIndicator);

        this._titleLabel = new cc.LabelTTF(medalViewText("title"), uiUtil.fontFamily.normal, 38);
        medalViewApplyLabelStyle(this._titleLabel, {
            color: cc.color(46, 34, 25, 255),
            strokeColor: cc.color(249, 245, 237, 255),
            strokeSize: 1
        });
        this._titleLabel.setPosition(this.width / 2, this.height - 86);
        this.addChild(this._titleLabel);

        this._tabBaseline = uiUtil.createColorRect(cc.size(520, 2), cc.color(185, 176, 165, 255), 105);
        this._tabBaseline.setPosition((this.width - 520) / 2, this.height - 206);
        this.addChild(this._tabBaseline);

        this._tabMarker = uiUtil.createColorRect(cc.size(74, 4), cc.color(104, 80, 60, 255), 220);
        this._tabMarker.setAnchorPoint(0.5, 1);
        this._tabMarker.setPosition(this.width / 2, this.height - 202);
        this.addChild(this._tabMarker, 5);

        this._buildTabs();

        this._summaryRibbon = uiUtil.createPaperPanel(cc.size(568, 54), {
            shadowOpacity: 12,
            fillColor: cc.color(244, 240, 234, 255),
            fillOpacity: 248,
            frameColor: cc.color(191, 180, 166, 255),
            frameOpacity: 132
        });
        this._summaryRibbon.setAnchorPoint(0.5, 0.5);
        this._summaryRibbon.setPosition(this.width / 2, this.height - 252);
        this.addChild(this._summaryRibbon);

        this._summaryLabel = new cc.LabelTTF("", uiUtil.fontFamily.normal, 21, cc.size(520, 0), cc.TEXT_ALIGNMENT_CENTER);
        medalViewApplyLabelStyle(this._summaryLabel, {
            color: cc.color(54, 45, 36, 255),
            strokeColor: cc.color(247, 242, 235, 255),
            strokeSize: 1
        });
        this._summaryLabel.setPosition(this.width / 2, this.height - 252);
        this.addChild(this._summaryLabel);

        this._buildScrollArea();

        var btnShop = uiUtil.createCommonBtnWhite(medalViewText("shop"), this, function () {
            uiUtil.safeRunScene(function () {
                return new ShopScene();
            });
        });
        btnShop.setPosition(this.width / 2 - 120, 62);
        this.addChild(btnShop);

        var btnBack = uiUtil.createCommonBtnBlack(stringUtil.getString(1193), this, function () {
            uiUtil.safeRunScene(function () {
                return new MenuScene();
            });
        });
        btnBack.setPosition(this.width / 2 + 120, 62);
        this.addChild(btnBack);
    },

    _buildScrollArea: function () {
        var viewWidth = 576;
        var scrollBottomY = 128;
        var scrollTopY = this.height - 304;
        var viewHeight = Math.max(220, scrollTopY - scrollBottomY);

        this._scrollView = new MedalSeriesScrollView(cc.size(viewWidth, viewHeight), this);
        this._scrollView.setPosition((this.width - viewWidth) / 2, scrollBottomY);
        this.addChild(this._scrollView);

        this._scrollTrack = uiUtil.createColorRect(cc.size(6, viewHeight), cc.color(178, 168, 156, 255), 88);
        this._scrollTrack.setPosition(this._scrollView.x + viewWidth + 10, scrollBottomY);
        this.addChild(this._scrollTrack, 4);

        this._scrollThumb = uiUtil.createColorRect(cc.size(6, 86), cc.color(92, 74, 56, 255), 220);
        this._scrollThumb.setAnchorPoint(0.5, 1);
        this._scrollThumb.setPosition(this._scrollTrack.x + 3, scrollBottomY + viewHeight);
        this.addChild(this._scrollThumb, 5);
    },

    _buildTabs: function () {
        var self = this;
        var tabY = this.height - 180;
        var count = Math.max(1, this._categoryIds.length);
        var tabSpacing = count === 1 ? 0 : Math.min(174, 500 / (count - 1));
        var startX = this.width / 2 - tabSpacing * (count - 1) / 2;

        this._categoryIds.forEach(function (categoryId, idx) {
            var tabBtn = uiUtil.createTextTabButton(
                medalViewCategoryLabel(categoryId),
                self,
                function (sender) {
                    self._switchCategory(sender.categoryId);
                },
                {
                    size: cc.size(166, 38),
                    fontSize: 26,
                    color: cc.color(88, 77, 67, 255),
                    selectedColor: cc.color(36, 28, 22, 255),
                    pressedColor: cc.color(36, 28, 22, 255)
                }
            );
            tabBtn.categoryId = categoryId;
            tabBtn.setPosition(startX + idx * tabSpacing, tabY);
            self.addChild(tabBtn, 6);

            var tabLabel = tabBtn.getChildByName("label");
            medalViewApplyLabelStyle(tabLabel, {
                strokeColor: cc.color(246, 242, 236, 255),
                strokeSize: 1
            });
            tabBtn._tabScale.selected = 1;

            var warnIcon = autoSpriteFrameController.getSpriteFromSpriteName("#medalWarn.png");
            warnIcon.setName("warnIcon");
            warnIcon.setScale(0.28);
            warnIcon.setPosition(tabBtn.getContentSize().width - 18, 18);
            warnIcon.setVisible(false);
            tabBtn.addChild(warnIcon, 3);

            self._tabButtons.push(tabBtn);
        });
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
                self._tabMarker.setPosition(tabBtn.x, tabBtn.y - 18);
            }
        });
    },

    _updateSummary: function () {
        var summaryText = medalViewText("summaryPoints") + Medal.getAchievementPoints();
        this._summaryLabel.setString(summaryText);
    },

    _countCategoryClaimable: function (categoryId) {
        var total = 0;
        Medal.getSeriesIdsByCategory(categoryId).forEach(function (seriesId) {
            total += Medal.getSeriesState(seriesId).claimableCount;
        });
        return total;
    },

    _renderCategoryContent: function (preserveOffsetY) {
        var container = this._scrollView.containerNode;
        container.removeAllChildren(true);
        container.cleanup();

        var viewWidth = this._scrollView.getViewSize().width;
        var viewHeight = this._scrollView.getViewSize().height;
        var seriesIds = Medal.getSeriesIdsByCategory(this._currentCategory);
        var blocks = [];
        var totalHeight = 10;
        var gap = 14;
        var i;

        if (!seriesIds.length) {
            var emptyPanel = uiUtil.createPaperPanel(cc.size(560, 136), {
                shadowOpacity: 14,
                fillColor: cc.color(238, 234, 226, 255),
                fillOpacity: 242,
                frameColor: cc.color(188, 179, 168, 255),
                frameOpacity: 126
            });
            var emptyLabel = new cc.LabelTTF(medalViewText("emptyCategory"), uiUtil.fontFamily.normal, 24, cc.size(460, 0), cc.TEXT_ALIGNMENT_CENTER);
            emptyLabel.setColor(cc.color(84, 78, 70, 255));
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
        totalHeight += 10;

        var contentHeight = Math.max(totalHeight, viewHeight);
        container.setContentSize(viewWidth, contentHeight);
        this._scrollView.setContentSize(viewWidth, contentHeight);

        var currentY = contentHeight - 10;
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
        var panelWidth = 560;
        var topPadding = 22;
        var bottomPadding = 24;
        var leftPadding = 24;
        var rightPadding = 24;
        var rightColumnWidth = 144;
        var sideGap = 18;
        var bodyTextWidth = panelWidth - leftPadding - rightPadding - 132 - sideGap;
        var topTextWidth = panelWidth - leftPadding - rightPadding - rightColumnWidth - sideGap;
        var badgeSize = 42;

        var title = uiUtil.createLabel(medalViewSeriesTitle(seriesId), "title", {
            width: topTextWidth,
            fontSize: 30,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: cc.color(38, 29, 21, 255),
            strokeColor: cc.color(250, 245, 237, 255),
            strokeSize: 1
        });

        var progressPill = uiUtil.createStatusPill(
            medalViewText("stageProgress") + " " + state.claimedCount + "/" + state.totalCount,
            {
                size: cc.size(rightColumnWidth, 32),
                bgColor: cc.color(79, 64, 49, 255),
                textColor: cc.color(248, 242, 233, 255),
                fontSize: 16
            }
        );
        progressPill.setAnchorPoint(1, 1);

        var metaText = medalViewText("finishedAll");
        if (!state.allClaimed && stageInfo) {
            metaText = medalViewText("seriesGoal") + ": " + stageStrings.condition;
        }
        var metaLabel = uiUtil.createLabel(metaText, "meta", {
            width: topTextWidth,
            fontSize: 18,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: cc.color(85, 72, 58, 255),
            strokeColor: cc.color(247, 242, 235, 255),
            strokeSize: 1
        });

        var activeTitleText = medalViewText("activeStage");
        if (stageStrings.name) {
            activeTitleText += " · " + stageStrings.name;
        }
        var activeTitle = uiUtil.createLabel(activeTitleText, "sectionTitle", {
            width: bodyTextWidth,
            fontSize: 23,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: cc.color(36, 28, 20, 255),
            strokeColor: cc.color(250, 245, 237, 255),
            strokeSize: 1
        });

        var currentTag = null;
        if (!state.allClaimed && stageInfo && stageInfo.claimed !== 1) {
            currentTag = uiUtil.createStatusPill(medalViewText("currentTag"), {
                size: cc.size(54, 24),
                bgColor: cc.color(120, 95, 58, 255),
                textColor: cc.color(247, 242, 232, 255),
                fontSize: 14
            });
            currentTag.setAnchorPoint(1, 1);
        }

        var progressText = null;
        var progressNode = null;
        if (stageInfo) {
            progressText = uiUtil.createLabel(stageInfo.aimCompleted + "/" + stageInfo.aim, "meta", {
                fontSize: 18,
                anchorX: 1,
                anchorY: 1,
                color: cc.color(72, 61, 49, 255),
                strokeColor: cc.color(248, 242, 234, 255),
                strokeSize: 1
            });
            progressNode = this._createProgressNode(stageInfo, bodyTextWidth);
        }

        var condition = uiUtil.createLabel(stageStrings.condition, "body", {
            width: bodyTextWidth,
            fontSize: 18,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: cc.color(52, 42, 33, 255),
            strokeColor: cc.color(249, 244, 236, 255),
            strokeSize: 1
        });

        var rewardText = medalViewText("rewardPrefix");
        if (stageInfo) {
            rewardText += "+" + stageInfo.points + medalViewText("pointSuffix");
            if (stageStrings.des) {
                rewardText += " · " + stageStrings.des;
            }
        }
        var reward = uiUtil.createLabel(rewardText, "caption", {
            width: bodyTextWidth,
            fontSize: 17,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            anchorX: 0,
            anchorY: 1,
            color: cc.color(84, 72, 59, 255),
            strokeColor: cc.color(247, 242, 235, 255),
            strokeSize: 1
        });

        var actionNode = this._createStageActionNode(state, stageInfo);
        actionNode.setAnchorPoint(1, 0);

        var infoRowHeight = stageInfo ? Math.max(
            progressText ? progressText.getContentSize().height : 0,
            currentTag ? currentTag.height : 0
        ) : 0;
        var progressNodeHeight = progressNode ? progressNode.getContentSize().height : 0;
        var contentHeight = topPadding
            + title.getContentSize().height + 8
            + metaLabel.getContentSize().height + 14
            + badgeSize + 14
            + 1 + 12
            + activeTitle.getContentSize().height;

        if (stageInfo) {
            contentHeight += 8 + infoRowHeight + 8 + progressNodeHeight + 12;
        } else {
            contentHeight += 12;
        }

        contentHeight += condition.getContentSize().height + 8 + reward.getContentSize().height + bottomPadding;

        var panelHeight = Math.max(244, contentHeight);
        var panel = uiUtil.createPaperPanel(cc.size(panelWidth, panelHeight), {
            shadowOpacity: 14,
            fillColor: cc.color(246, 242, 235, 255),
            fillOpacity: 250,
            frameColor: stageInfo && stageInfo.completed === 1 && stageInfo.claimed !== 1
                ? cc.color(158, 129, 94, 255)
                : cc.color(190, 178, 164, 255),
            frameOpacity: 146
        });

        var medalIcon = autoSpriteFrameController.getSpriteFromSpriteName("#medalIcon_" + state.iconId + ".png");
        medalIcon.setScale(0.38);
        medalIcon.setOpacity(20);
        medalIcon.setPosition(panelWidth - rightPadding - 58, panelHeight - topPadding - 70);
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
        contentStack.add(metaLabel, {gapAfter: 14});

        var chipStartX = leftPadding + badgeSize / 2;
        var chipY = contentStack.getY() - badgeSize / 2;
        var self = this;
        state.stageIds.forEach(function (stageId, idx) {
            var badge = self._createStageBadge(stageId, state);
            badge.setAnchorPoint(0.5, 0.5);
            badge.setPosition(chipStartX + idx * 48, chipY);
            panel.addChild(badge, uiUtil.zOrder.CONTENT);
        });
        contentStack.reserve(badgeSize, 14);

        var divider = uiUtil.createColorRect(cc.size(panelWidth - leftPadding - rightPadding, 1), cc.color(196, 186, 176, 255), 95);
        divider.setPosition(leftPadding, contentStack.getY());
        panel.addChild(divider, uiUtil.zOrder.CONTENT);
        contentStack.reserve(1, 12);
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
            currentY -= (progressNodeHeight + 12);
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
        var barWidth = Math.max(200, width || 320);
        node.setContentSize(barWidth, 20);
        node.width = barWidth;
        node.height = 20;

        var pbBg = autoSpriteFrameController.getSpriteFromSpriteName("#pb_bg.png");
        var pbScaleX = barWidth / pbBg.getContentSize().width;
        pbBg.setAnchorPoint(0, 0.5);
        pbBg.setScaleX(pbScaleX);
        pbBg.setScaleY(1.04);
        pbBg.setPosition(0, 10);
        node.addChild(pbBg);

        var pb = new cc.ProgressTimer(autoSpriteFrameController.getSpriteFromSpriteName("#pb.png"));
        pb.type = cc.ProgressTimer.TYPE_BAR;
        pb.midPoint = cc.p(0, 0);
        pb.barChangeRate = cc.p(1, 0);
        pb.setAnchorPoint(0, 0.5);
        pb.setScaleX(pbScaleX);
        pb.setScaleY(1.04);
        pb.setPosition(0, 10);
        pb.setPercentage(medalViewProgressPercent(stageInfo));
        node.addChild(pb);

        return node;
    },

    _createStageActionNode: function (state, stageInfo) {
        if (!stageInfo) {
            return uiUtil.createStatusPill(medalViewText("notReady"), {
                size: cc.size(132, 40),
                bgColor: cc.color(191, 183, 174, 255),
                textColor: cc.color(98, 92, 86, 255),
                fontSize: 16
            });
        }

        if (stageInfo.completed === 1 && stageInfo.claimed === 0) {
            var stageId = state.activeStageId;
            var btn = uiUtil.createSpriteBtn({
                normal: "btn_common_black_normal.png",
                fontInfo: {
                    txt: medalViewText("claimPrefix") + stageInfo.points + medalViewText("pointSuffix"),
                    fontSize: 18
                }
            }, this, function () {
                this._claimStageReward(stageId);
            }, cc.rect(1, 1, 1, 1));
            btn.setPreferredSize(cc.size(132, 40));
            btn.setZoomOnTouchDown(false);
            btn.setTitleColorForState(cc.color(247, 243, 236, 255), cc.CONTROL_STATE_NORMAL);
            btn.setTitleColorForState(cc.color(210, 205, 198, 255), cc.CONTROL_STATE_HIGHLIGHTED);
            return btn;
        }

        if (stageInfo.claimed === 1) {
            return uiUtil.createStatusPill(medalViewText("claimed"), {
                size: cc.size(132, 40),
                bgColor: cc.color(93, 80, 63, 255),
                textColor: cc.color(245, 239, 228, 255),
                fontSize: 16
            });
        }

        return uiUtil.createStatusPill(medalViewText("inProgress"), {
            size: cc.size(132, 40),
            bgColor: cc.color(158, 147, 133, 255),
            textColor: cc.color(248, 243, 235, 255),
            fontSize: 16
        });
    },

    _createStageBadge: function (stageId, seriesState) {
        var stageInfo = Medal._map[stageId];
        var stageLevel = stageInfo && stageInfo.stageLevel ? stageInfo.stageLevel : (stageId % 100);
        var isCurrent = stageId === seriesState.activeStageId && !seriesState.allClaimed;
        var bgColor = cc.color(168, 162, 154, 255);
        var textColor = cc.color(66, 61, 57, 255);

        if (stageInfo && stageInfo.claimed === 1) {
            bgColor = cc.color(84, 71, 56, 255);
            textColor = cc.color(246, 239, 224, 255);
        } else if (stageInfo && stageInfo.completed === 1) {
            bgColor = cc.color(144, 116, 77, 255);
            textColor = cc.color(248, 241, 229, 255);
        } else if (isCurrent) {
            bgColor = cc.color(121, 101, 74, 255);
            textColor = cc.color(248, 241, 229, 255);
        }

        return uiUtil.createStatusPill(medalViewStageBadgeText(stageLevel), {
            size: cc.size(42, 42),
            bgColor: bgColor,
            textColor: textColor,
            fontSize: 16
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
        var thumbHeight = Math.max(48, trackHeight * viewHeight / contentHeight);
        var maxOffset = 0;
        var minOffset = viewHeight - contentHeight;
        var offsetY = this._scrollView.getContentOffset().y;
        var ratio = maxOffset === minOffset ? 0 : (maxOffset - offsetY) / (maxOffset - minOffset);
        ratio = Math.max(0, Math.min(1, ratio));

        this._scrollThumb.setContentSize(cc.size(6, thumbHeight));
        this._scrollThumb.setPosition(
            this._scrollTrack.x + 3,
            this._scrollTrack.y + trackHeight - (trackHeight - thumbHeight) * ratio
        );
    }
});
