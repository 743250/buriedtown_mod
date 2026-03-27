var getRoleTalentRuntimePlayer = function () {
    if (typeof GameRuntime !== "undefined"
        && GameRuntime
        && typeof GameRuntime.getPlayer === "function") {
        return GameRuntime.getPlayer();
    }
    return null;
};

var getRoleTalentRuntimeTimer = function () {
    if (typeof GameRuntime !== "undefined"
        && GameRuntime
        && typeof GameRuntime.getTimer === "function") {
        return GameRuntime.getTimer();
    }
    return null;
};

var RoleTalentUiHelper = {
    EMPTY_TALENT_ID: 0,
    _text: {
        zh: {
            dialogTitle: "\u89d2\u8272\u4e0e\u5929\u8d4b",
            roleSectionTitle: "\u5f53\u524d\u89d2\u8272",
            talentSectionTitle: "\u5df2\u9009\u5929\u8d4b",
            emptyTalentName: "\u65e0\u5929\u8d4b",
            emptyTalentDescription: "\u4fdd\u6301\u9ed8\u8ba4\u751f\u5b58\u914d\u7f6e\u3002",
            noTrait: "\u6682\u65e0\u7279\u6027",
            noTalentChosen: "\u5f53\u524d\u672a\u9009\u62e9\u5929\u8d4b",
            levelSuffix: "\u7ea7"
        },
        en: {
            dialogTitle: "Role & Talents",
            roleSectionTitle: "Current Role",
            talentSectionTitle: "Chosen Talents",
            emptyTalentName: "No Talent",
            emptyTalentDescription: "Start with the default survival setup.",
            noTrait: "No special trait",
            noTalentChosen: "No talent selected yet.",
            levelSuffix: "Lv."
        }
    },

    _isEnglish: function () {
        return cc.sys
            && cc.sys.localStorage
            && cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_ENGLISH;
    },

    _t: function (key) {
        var langKey = this._isEnglish() ? "en" : "zh";
        return this._text[langKey][key] || this._text.zh[key] || "";
    },

    _formatMultiline: function (str) {
        return (str || "").replace(/\\n/g, "\n");
    },

    _fitSpriteToSize: function (sprite, maxWidth, maxHeight) {
        if (!sprite || sprite.width <= 0 || sprite.height <= 0) {
            return;
        }
        var scale = Math.min(maxWidth / sprite.width, maxHeight / sprite.height);
        if (isFinite(scale) && scale > 0) {
            sprite.setScale(scale);
        }
    },

    _pauseTimeWhileDialogVisible: function (dialog) {
        var runtimeTimer = getRoleTalentRuntimeTimer();
        if (!dialog || !runtimeTimer) {
            return;
        }

        runtimeTimer.pause();
        var oldDismissListener = dialog.onDismissListener;
        dialog.setOnDismissListener({
            target: dialog,
            cb: function () {
                if (oldDismissListener && oldDismissListener.cb) {
                    oldDismissListener.cb.call(oldDismissListener.target);
                }
                runtimeTimer.resume();
            }
        });
    },

    _resolveRoleType: function (runtimePlayer, snapshot) {
        var roleType = runtimePlayer && isFinite(runtimePlayer.roleType)
            ? parseInt(runtimePlayer.roleType, 10)
            : null;
        if (!(roleType > 0) && snapshot && snapshot.currentRoleType > 0) {
            roleType = snapshot.currentRoleType;
        }
        if (!(roleType > 0)
            && typeof role !== "undefined"
            && role
            && typeof role.getChoosenRoleType === "function") {
            roleType = role.getChoosenRoleType();
        }
        if (!(roleType > 0) && typeof RoleType !== "undefined") {
            roleType = RoleType.STRANGER;
        }
        return roleType;
    },

    _getChosenTalentIds: function (chosenTalentIds) {
        var selectedTalentIds = Array.isArray(chosenTalentIds)
            ? chosenTalentIds.slice()
            : (typeof TalentService !== "undefined"
                && TalentService
                && typeof TalentService.getChosenTalentPurchaseIds === "function"
                ? TalentService.getChosenTalentPurchaseIds()
                : [this.EMPTY_TALENT_ID]);

        if (!selectedTalentIds.length) {
            selectedTalentIds = [this.EMPTY_TALENT_ID];
        }
        return selectedTalentIds.map(function (purchaseId) {
            return parseInt(purchaseId, 10);
        }).filter(function (purchaseId) {
            return !isNaN(purchaseId);
        });
    },

    getRoleTalentSnapshot: function (runtimePlayer, chosenTalentIds) {
        var resolvedRuntimePlayer = runtimePlayer || getRoleTalentRuntimePlayer();
        var selectedTalentIds = this._getChosenTalentIds(chosenTalentIds);

        return {
            runtimePlayer: resolvedRuntimePlayer,
            currentRoleType: this._resolveRoleType(resolvedRuntimePlayer),
            chosenTalentIds: selectedTalentIds,
            maxChosenTalentCount: typeof TalentService !== "undefined"
                && TalentService
                && typeof TalentService.getMaxChosenTalentCount === "function"
                ? TalentService.getMaxChosenTalentCount()
                : 1,
            roleSelectionConfig: typeof role !== "undefined"
                && role
                && typeof role.getRoleSelectionConfig === "function"
                ? role.getRoleSelectionConfig()
                : { roleList: [] }
        };
    },

    getRoleInfoViewModel: function (roleType, snapshot) {
        snapshot = snapshot || this.getRoleTalentSnapshot();
        roleType = arguments.length > 0 ? parseInt(roleType, 10) : this._resolveRoleType(snapshot.runtimePlayer, snapshot);
        if (!(roleType > 0) && typeof RoleType !== "undefined") {
            roleType = RoleType.STRANGER;
        }

        var roleInfo = typeof role !== "undefined"
            && role
            && typeof role.getRoleInfo === "function"
            ? (role.getRoleInfo(roleType) || {})
            : {};
        var purchaseId = typeof role !== "undefined"
            && role
            && typeof role.getPurchaseIdByRoleType === "function"
            ? role.getPurchaseIdByRoleType(roleType)
            : null;
        var isUnlocked = typeof role !== "undefined"
            && role
            && typeof role.isRoleUnlocked === "function"
            ? role.isRoleUnlocked(roleType)
            : true;
        var isPurchaseRequired = typeof role !== "undefined"
            && role
            && typeof role.isRolePurchaseRequired === "function"
            ? role.isRolePurchaseRequired(roleType)
            : false;

        return {
            roleType: roleType,
            purchaseId: purchaseId,
            isUnlocked: !!isUnlocked,
            isPurchaseRequired: !!isPurchaseRequired,
            isLocked: !!isPurchaseRequired && !isUnlocked,
            avatarFallback: typeof role !== "undefined"
                && role
                && typeof role.getAvatarFallbackByRoleType === "function"
                ? role.getAvatarFallbackByRoleType(roleType)
                : uiUtil.getDefaultSpriteName("character", false),
            name: roleInfo.name || "",
            descriptionText: this._formatMultiline(roleInfo.des || ""),
            effectText: this._formatMultiline(roleInfo.effect || ""),
            infoDialogTitle: roleInfo.name || "",
            infoDialogDescription: this._formatMultiline(roleInfo.des || ""),
            infoDialogEffect: this._formatMultiline(roleInfo.effect || "")
        };
    },

    _buildTalentInfoText: function (purchaseDisplayContext) {
        if (!purchaseDisplayContext) {
            return "";
        }

        var parts = [];
        if (purchaseDisplayContext.detailDescriptionText) {
            parts.push(purchaseDisplayContext.detailDescriptionText);
        }
        if (purchaseDisplayContext.detailEffectText
            && purchaseDisplayContext.detailEffectText !== purchaseDisplayContext.detailDescriptionText) {
            parts.push(purchaseDisplayContext.detailEffectText);
        }
        if (!parts.length && purchaseDisplayContext.infoDialogContentText) {
            parts.push(purchaseDisplayContext.infoDialogContentText);
        }
        return parts.join("\n\n");
    },

    _formatTalentLevelSuffix: function (level) {
        level = parseInt(level, 10);
        if (!(level > 0)) {
            return "";
        }
        return this._isEnglish()
            ? (" " + this._t("levelSuffix") + level)
            : (" " + level + this._t("levelSuffix"));
    },

    _createEmptyTalentViewModel: function (snapshot) {
        return {
            purchaseId: this.EMPTY_TALENT_ID,
            isEmptyOption: true,
            isUnlocked: true,
            isSelected: snapshot.chosenTalentIds.indexOf(this.EMPTY_TALENT_ID) !== -1,
            currentTalentLevel: 0,
            maxTalentLevel: 0,
            nameText: this._t("emptyTalentName"),
            descriptionText: this._t("emptyTalentDescription"),
            infoDialogTitle: this._t("emptyTalentName"),
            infoDialogText: this._t("emptyTalentDescription"),
            iconFrameName: uiUtil.getDefaultSpriteName("talent", false),
            iconFallbackName: uiUtil.getDefaultSpriteName("talent", false)
        };
    },

    _createTalentViewModel: function (purchaseId, snapshot) {
        purchaseId = parseInt(purchaseId, 10);
        if (purchaseId === this.EMPTY_TALENT_ID) {
            return this._createEmptyTalentViewModel(snapshot);
        }

        var purchaseDisplayContext = PurchaseUiHelper.getPurchaseDisplayContext(purchaseId);
        var purchaseUiState = purchaseDisplayContext.purchaseUiState || {};
        var currentTalentLevel = Number(purchaseUiState.currentTalentLevel) || 0;
        var titleText = purchaseDisplayContext.titleText
            || purchaseDisplayContext.displayBaseName
            || ("ID " + purchaseId);

        return {
            purchaseId: purchaseId,
            isEmptyOption: false,
            isUnlocked: !!purchaseUiState.isUnlocked,
            isSelected: snapshot.chosenTalentIds.indexOf(purchaseId) !== -1,
            currentTalentLevel: currentTalentLevel,
            maxTalentLevel: Number(purchaseUiState.maxTalentLevel) || 0,
            nameText: titleText + this._formatTalentLevelSuffix(currentTalentLevel),
            descriptionText: purchaseDisplayContext.detailEffectText
                || purchaseDisplayContext.detailDescriptionText
                || purchaseDisplayContext.infoDialogContentText
                || "",
            infoDialogTitle: titleText,
            infoDialogText: this._buildTalentInfoText(purchaseDisplayContext),
            iconFrameName: uiUtil.getTalentIconFrameName(purchaseId, false),
            iconFallbackName: uiUtil.getDefaultSpriteName("talent", false),
            purchaseDisplayContext: purchaseDisplayContext
        };
    },

    getTalentRowViewModels: function (snapshot) {
        snapshot = snapshot || this.getRoleTalentSnapshot();
        var purchaseIdList = typeof TalentService !== "undefined"
            && TalentService
            && typeof TalentService.getTalentPurchaseIdList === "function"
            ? TalentService.getTalentPurchaseIdList()
            : [this.EMPTY_TALENT_ID];

        return purchaseIdList.map(function (purchaseId) {
            return this._createTalentViewModel(purchaseId, snapshot);
        }, this);
    },

    getTalentRowViewModelByPurchaseId: function (purchaseId, snapshot) {
        snapshot = snapshot || this.getRoleTalentSnapshot();
        var targetId = parseInt(purchaseId, 10);
        var rowViewModels = this.getTalentRowViewModels(snapshot);
        for (var i = 0; i < rowViewModels.length; i++) {
            if (rowViewModels[i].purchaseId === targetId) {
                return rowViewModels[i];
            }
        }
        return this._createTalentViewModel(targetId, snapshot);
    },

    showRoleInfoDialog: function (roleType, locked) {
        var roleInfoViewModel = this.getRoleInfoViewModel(roleType);
        var config = {
            title: { title: roleInfoViewModel.infoDialogTitle },
            content: { des: roleInfoViewModel.infoDialogDescription },
            action: { btn_1: {} }
        };
        config.action.btn_1.txt = stringUtil.getString(1030);

        if (locked && roleInfoViewModel.purchaseId) {
            config.action.btn_1.txt = stringUtil.getString(1031);
            config.action.btn_2 = {
                txt: stringUtil.getString(1225),
                target: null,
                cb: function () {
                    cc.director.pushScene(new ShopScene({ purchaseId: roleInfoViewModel.purchaseId }));
                }
            };
        }

        var dialog = new DialogBig(config);
        if (roleInfoViewModel.infoDialogEffect) {
            var effectLabel = uiUtil.createLabel(roleInfoViewModel.infoDialogEffect, "body", {
                width: dialog.rightEdge - dialog.leftEdge,
                anchorX: 0,
                anchorY: 1,
                hAlignment: cc.TEXT_ALIGNMENT_LEFT,
                color: UITheme.statusColors.accent
            });
            effectLabel.setPosition(
                dialog.leftEdge,
                dialog.contentNode.getChildByName("des").y
                    - dialog.contentNode.getChildByName("des").height
                    - uiUtil.spacing.XS
            );
            dialog.contentNode.addChild(effectLabel);
        }
        dialog.show();
    },

    showTalentInfoDialog: function (purchaseId, snapshot) {
        var talentViewModel = this.getTalentRowViewModelByPurchaseId(purchaseId, snapshot);
        var config = {
            title: { title: talentViewModel.infoDialogTitle },
            content: { des: talentViewModel.infoDialogText },
            action: { btn_1: {} }
        };
        config.action.btn_1.txt = stringUtil.getString(1030);

        if (!talentViewModel.isEmptyOption && !talentViewModel.isUnlocked) {
            config.action.btn_2 = {
                txt: stringUtil.getString(1225),
                target: null,
                cb: function () {
                    cc.director.pushScene(new ShopScene({ purchaseId: talentViewModel.purchaseId }));
                }
            };
        }

        var dialog = new DialogSmall(config);
        dialog.show();
    },

    _createRolePanel: function (panelWidth, roleInfoViewModel) {
        var avatarSize = 76;
        var leftPadding = uiUtil.spacing.MD;
        var textStartX = leftPadding + avatarSize + uiUtil.spacing.SM;
        var textWidth = Math.max(120, panelWidth - textStartX - uiUtil.spacing.MD);

        var panel = new cc.Node();
        var titleLabel = uiUtil.createLabel(roleInfoViewModel.name || "", "sectionTitle", {
            width: textWidth,
            anchorX: 0,
            anchorY: 1,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT
        });
        var desLabel = uiUtil.createLabel(roleInfoViewModel.descriptionText || "", "body", {
            width: textWidth,
            anchorX: 0,
            anchorY: 1,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT
        });
        var effectLabel = uiUtil.createLabel(
            roleInfoViewModel.effectText || this._t("noTrait"),
            "body",
            {
                width: textWidth,
                anchorX: 0,
                anchorY: 1,
                hAlignment: cc.TEXT_ALIGNMENT_LEFT,
                color: UITheme.statusColors.accent
            }
        );

        var panelHeight = Math.max(
            124,
            titleLabel.height + desLabel.height + effectLabel.height + uiUtil.spacing.SM * 2 + uiUtil.spacing.MD
        );
        panel.setContentSize(panelWidth, panelHeight);

        var panelBg = uiUtil.createColorRect(
            cc.size(panelWidth, panelHeight),
            UITheme.statusColors.panelFill,
            UITheme.cards.panelOpacity
        );
        panelBg.setAnchorPoint(0, 0);
        panel.addChild(panelBg);

        var avatarBg = uiUtil.getSpriteByNameSafe("role_bg.png", "icon_iap_info.png");
        this._fitSpriteToSize(avatarBg, avatarSize, avatarSize);
        avatarBg.setAnchorPoint(0.5, 0.5);
        avatarBg.setPosition(leftPadding + avatarSize / 2, panelHeight / 2);
        panel.addChild(avatarBg);

        var avatar = uiUtil.getCharacterPortraitSpriteByRoleType(
            roleInfoViewModel.roleType,
            roleInfoViewModel.avatarFallback
        );
        this._fitSpriteToSize(avatar, avatarBg.width * 1.08, avatarBg.height * 1.08);
        avatar.setPosition(avatarBg.width / 2, avatarBg.height / 2);
        avatarBg.addChild(avatar);

        titleLabel.setPosition(textStartX, panelHeight - uiUtil.spacing.SM);
        panel.addChild(titleLabel);

        desLabel.setPosition(textStartX, titleLabel.y - titleLabel.height - uiUtil.spacing.XS);
        panel.addChild(desLabel);

        effectLabel.setPosition(textStartX, desLabel.y - desLabel.height - uiUtil.spacing.XS);
        panel.addChild(effectLabel);

        return panel;
    },

    _createTalentRow: function (panelWidth, talentViewModel) {
        var iconSize = 64;
        var leftPadding = uiUtil.spacing.MD;
        var textStartX = leftPadding + iconSize + uiUtil.spacing.SM;
        var textWidth = Math.max(120, panelWidth - textStartX - uiUtil.spacing.MD);

        var row = new cc.Node();
        var titleLabel = uiUtil.createLabel(talentViewModel.nameText || "", "sectionTitle", {
            width: textWidth,
            anchorX: 0,
            anchorY: 1,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT
        });
        var desLabel = uiUtil.createLabel(talentViewModel.descriptionText || "", "body", {
            width: textWidth,
            anchorX: 0,
            anchorY: 1,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT,
            color: talentViewModel.isUnlocked
                ? UITheme.typographyPresets.body.color
                : UITheme.statusColors.muted
        });
        var rowHeight = Math.max(90, titleLabel.height + desLabel.height + uiUtil.spacing.SM * 2 + uiUtil.spacing.XS);
        row.setContentSize(panelWidth, rowHeight);

        var rowBg = uiUtil.createColorRect(
            cc.size(panelWidth, rowHeight),
            talentViewModel.isSelected ? UITheme.statusColors.panelFillAlt : UITheme.statusColors.panelFill,
            UITheme.cards.rowOpacity
        );
        rowBg.setAnchorPoint(0, 0);
        row.addChild(rowBg);

        var icon = uiUtil.getSpriteByNameSafe(talentViewModel.iconFrameName, talentViewModel.iconFallbackName);
        this._fitSpriteToSize(icon, iconSize, iconSize);
        icon.setPosition(leftPadding + iconSize / 2, rowHeight / 2);
        row.addChild(icon);

        titleLabel.setPosition(textStartX, rowHeight - uiUtil.spacing.SM);
        row.addChild(titleLabel);

        desLabel.setPosition(textStartX, titleLabel.y - titleLabel.height - uiUtil.spacing.XS);
        row.addChild(desLabel);

        return row;
    },

    showRoleTalentDialog: function (ownerLayer) {
        var snapshot = this.getRoleTalentSnapshot();
        var roleInfoViewModel = this.getRoleInfoViewModel(snapshot.currentRoleType, snapshot);
        var chosenTalentIds = snapshot.chosenTalentIds.filter(function (purchaseId) {
            return parseInt(purchaseId, 10) !== RoleTalentUiHelper.EMPTY_TALENT_ID;
        });
        var chosenTalentViewModels = chosenTalentIds.map(function (purchaseId) {
            return this.getTalentRowViewModelByPurchaseId(purchaseId, snapshot);
        }, this);

        var dialog = new DialogBig({
            title: {
                title: this._t("dialogTitle"),
                icon: "icon_iap_info.png"
            },
            content: {},
            action: {
                btn_1: {
                    txt: stringUtil.getString(1030)
                }
            }
        });
        dialog.autoDismiss = false;

        var viewWidth = dialog.rightEdge - dialog.leftEdge;
        var viewHeight = Math.max(80, dialog.contentNode.getContentSize().height - uiUtil.spacing.XS);
        var container = new cc.Layer();
        var scrollView = new cc.ScrollView(cc.size(viewWidth, viewHeight), container);
        scrollView.setDirection(cc.SCROLLVIEW_DIRECTION_VERTICAL);
        scrollView.setBounceable(false);
        scrollView.setClippingToBounds(true);
        scrollView.x = dialog.leftEdge;
        scrollView.y = uiUtil.spacing.XXS;
        dialog.contentNode.addChild(scrollView);

        var sectionTitleRole = uiUtil.createLabel(this._t("roleSectionTitle"), "sectionTitle", {
            width: viewWidth,
            anchorX: 0,
            anchorY: 1,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT
        });
        var rolePanel = this._createRolePanel(viewWidth, roleInfoViewModel);
        var sectionTitleTalent = uiUtil.createLabel(this._t("talentSectionTitle"), "sectionTitle", {
            width: viewWidth,
            anchorX: 0,
            anchorY: 1,
            hAlignment: cc.TEXT_ALIGNMENT_LEFT
        });

        var rows = [];
        if (!chosenTalentViewModels.length) {
            rows.push(uiUtil.createLabel(this._t("noTalentChosen"), "body", {
                width: viewWidth,
                anchorX: 0,
                anchorY: 1,
                hAlignment: cc.TEXT_ALIGNMENT_LEFT
            }));
        } else {
            chosenTalentViewModels.forEach(function (talentViewModel) {
                rows.push(this._createTalentRow(viewWidth, talentViewModel));
            }, this);
        }

        var contentHeight = uiUtil.spacing.MD
            + sectionTitleRole.height
            + uiUtil.spacing.XS
            + rolePanel.height
            + uiUtil.spacing.LG
            + sectionTitleTalent.height
            + uiUtil.spacing.XS;

        rows.forEach(function (row, index) {
            contentHeight += uiUtil.getNodeLayoutHeight(row);
            if (index < rows.length - 1) {
                contentHeight += uiUtil.spacing.SM;
            }
        });

        contentHeight += uiUtil.spacing.MD;
        contentHeight = Math.max(viewHeight, contentHeight);

        container.setContentSize(viewWidth, contentHeight);
        scrollView.setContentSize(viewWidth, contentHeight);

        var stack = uiUtil.createVStack({
            parent: container,
            x: 0,
            top: contentHeight - uiUtil.spacing.MD,
            gap: uiUtil.spacing.SM
        });
        stack.add(sectionTitleRole);
        stack.add(rolePanel, { gapAfter: uiUtil.spacing.LG });
        stack.add(sectionTitleTalent, { gapAfter: uiUtil.spacing.XS });
        rows.forEach(function (row, index) {
            stack.add(row, {
                gapAfter: index < rows.length - 1 ? uiUtil.spacing.SM : 0
            });
        });

        var scrollOffset = scrollView.getContentOffset();
        scrollOffset.y = scrollView.getViewSize().height - contentHeight;
        scrollView.setContentOffset(scrollOffset);

        this._pauseTimeWhileDialogVisible(dialog);
        dialog.show();

        if (ownerLayer && typeof ownerLayer.addChild === "function" && dialog.getParent() !== ownerLayer) {
            // no-op hook for callers that want ownership semantics without extra branching
        }
    }
};
