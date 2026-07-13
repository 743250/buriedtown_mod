"use strict";
const {
    assert,
    loadIntoSandbox,
    readRepoFile
} = require("../../lib/core");
const {
    createVmSandbox,
    createCountStorage,
    createPurchaseRewardPlayer
} = require("../../lib/fixtures/runtime-boundaries");
const {
    stripComments,
    bootstrapRuntimeSandbox,
    SYNTHETIC_PURCHASE_IDS,
    SYNTHETIC_ITEM_IDS,
    SYNTHETIC_BUILD_ID,
    SYNTHETIC_EXCHANGE_IDS,
    createSafetyHelper,
    createSyntheticPurchaseList,
    createSyntheticRoleConfigTable,
    createSyntheticTalentConfigTable,
    createSyntheticExchangeAchievementConfig,
    capturePurchaseResult,
    createPersistenceComponent,
    createPersistencePlayer
} = require("./purchase-helpers");


function runTalentSelectionScopedStorageSmoke() {
    const sandbox = createVmSandbox();
    let chosenTalentIds = [SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA];
    sandbox.Record = {
        getCurrentSlot: function () {
            return 2;
        },
        getChosenTalentIds: function () {
            return chosenTalentIds.slice();
        },
        setChosenTalentIds: function (nextChosenTalentIds) {
            chosenTalentIds = nextChosenTalentIds.slice();
            return chosenTalentIds.slice();
        }
    };
    sandbox.TalentConfigTable = createSyntheticTalentConfigTable();
    sandbox.Medal = {
        getTalentLevel: function (purchaseId) {
            purchaseId = Number(purchaseId);
            return purchaseId === SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA
                || purchaseId === SYNTHETIC_PURCHASE_IDS.TALENT_BETA
                || purchaseId === SYNTHETIC_PURCHASE_IDS.TALENT_GAMMA
                ? 1
                : 0;
        }
    };

    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/TalentService.js");

    assert(JSON.stringify(sandbox.TalentService.getChosenTalentPurchaseIds()) === "[160]",
        "TalentService should restore current slot talent selections from Record slot meta");
    sandbox.TalentService.chooseTalents([
        SYNTHETIC_PURCHASE_IDS.TALENT_ALPHA,
        SYNTHETIC_PURCHASE_IDS.TALENT_BETA
    ]);
    assert(JSON.stringify(chosenTalentIds) === "[160,161]",
        "TalentService should persist normalized talent selections through Record slot meta only");
    assert(sandbox.cc.sys.localStorage.getItem("chosenTalents_slot_2") === null
        && sandbox.cc.sys.localStorage.getItem("chosenTalent_slot_2") === null,
        "TalentService should stop writing slot-scoped localStorage keys directly");

    return {
        name: "talent-selection-scoped-storage",
        ok: true,
        detail: "validated TalentService reads and writes chosen talents through Record slot meta ownership"
    };
}

function runRoleSelectionScopedStorageSmoke() {
    const sandbox = createVmSandbox();
    let roleUnlocked = false;
    let chosenRoleType = sandbox.RoleType ? sandbox.RoleType.BELL : 8;

    sandbox.Record = {
        getCurrentSlot: function () {
            return 2;
        },
        hasRecord: function () {
            return false;
        },
        getSelectedRoleType: function () {
            return chosenRoleType;
        },
        setSelectedRoleType: function (nextRoleType) {
            chosenRoleType = Number(nextRoleType);
            return chosenRoleType;
        }
    };
    sandbox.PurchaseService = {
        isRoleUnlocked: function (roleType) {
            return roleUnlocked && Number(roleType) === 8;
        }
    };
    sandbox.RoleConfigTable = createSyntheticRoleConfigTable();

    loadIntoSandbox(sandbox, "assets/src/game/role.js");

    assert(sandbox.role.getChoosenRoleType() === sandbox.RoleType.STRANGER,
        "role.getChoosenRoleType should ignore locked Record slot-meta role selections on a fresh run");
    assert(chosenRoleType === sandbox.RoleType.STRANGER,
        "role.getChoosenRoleType should rewrite fresh-run locked selections through Record slot meta");

    roleUnlocked = true;
    chosenRoleType = sandbox.RoleType.BELL;
    assert(sandbox.role.getChoosenRoleType() === sandbox.RoleType.BELL,
        "role.getChoosenRoleType should keep unlocked role selections from Record slot meta");

    return {
        name: "role-selection-scoped-storage",
        ok: true,
        detail: "validated role selection only uses Record slot meta ownership"
    };
}

function runSelectionSourceBoundarySmoke() {
    const roleSource = readRepoFile("assets/src/game/role.js");
    const talentSource = readRepoFile("assets/src/game/TalentService.js");

    assert(roleSource.indexOf("cc.sys.localStorage") === -1,
        "role.js should no longer read or write localStorage directly");
    assert(talentSource.indexOf("cc.sys.localStorage") === -1,
        "TalentService.js should no longer read or write localStorage directly");
    assert(/getSelectedRoleType/.test(roleSource) && /setSelectedRoleType/.test(roleSource),
        "role.js should delegate slot selection persistence through Record slot-meta helpers");
    assert(/getChosenTalentIds/.test(talentSource) && /setChosenTalentIds/.test(talentSource),
        "TalentService.js should delegate chosen-talent persistence through Record slot-meta helpers");

    return {
        name: "selection-source-boundaries",
        ok: true,
        detail: "validated role/talent selection ownership moved behind Record slot meta helpers"
    };
}


function runRoleTalentUiBoundarySmoke() {
    const chooseSource = stripComments(readRepoFile("assets/src/ui/ChooseScene.js"));
    const topFrameSource = stripComments(readRepoFile("assets/src/ui/topFrame.js"));
    const buttonSource = stripComments(readRepoFile("assets/src/ui/button.js"));
    const roleTalentHelperSource = stripComments(readRepoFile("assets/src/ui/RoleTalentUiHelper.js"));

    assert(roleTalentHelperSource.indexOf("getRoleTalentSnapshot: function") !== -1
        && roleTalentHelperSource.indexOf("getRoleInfoViewModel: function") !== -1
        && roleTalentHelperSource.indexOf("getTalentRowViewModels: function") !== -1
        && roleTalentHelperSource.indexOf("showRoleInfoDialog: function") !== -1
        && roleTalentHelperSource.indexOf("showRoleTalentDialog: function") !== -1,
        "RoleTalentUiHelper should expose the role/talent snapshot and dialog boundary");
    assert(chooseSource.indexOf("RoleTalentUiHelper.getTalentRowViewModelByPurchaseId(") !== -1
        && chooseSource.indexOf("RoleTalentUiHelper.showTalentInfoDialog(") !== -1
        && chooseSource.indexOf("RoleTalentUiHelper.showRoleInfoDialog(") !== -1
        && chooseSource.indexOf("uiUtil.getPurchaseStringConfig(") === -1
        && chooseSource.indexOf("uiUtil.showRoleInfoDialog(") === -1,
        "ChooseScene should consume RoleTalentUiHelper instead of rebuilding role/talent strings locally");
    assert(topFrameSource.indexOf("RoleTalentUiHelper.showRoleTalentDialog(") !== -1
        && topFrameSource.indexOf("stringUtil.getString(\"p_") === -1
        && topFrameSource.indexOf("TalentService.getTalentTierEffectTextList") === -1
        && topFrameSource.indexOf(" Lv.") === -1,
        "topFrame should no longer assemble role/talent dialog copy inline");
    assert(buttonSource.indexOf("setInfoClickHandler: function") !== -1
        && buttonSource.indexOf("setLockClickHandler: function") !== -1
        && buttonSource.indexOf("showInfoDialog") === -1
        && buttonSource.indexOf("uiUtil.showUnlockDialog(") === -1,
        "ButtonAtChooseScene should act as a render primitive with delegated info/lock handlers");

    return {
        name: "role-talent-ui-boundaries",
        ok: true,
        detail: "validated RoleTalentUiHelper owns role/talent view models while Choose/topFrame/button consume delegated UI semantics"
    };
}

function runRoleTalentUiProjectionSmoke() {
    const sandbox = createVmSandbox();
    const dialogCalls = [];
    const createNode = function (width, height) {
        return {
            width: width || 0,
            height: height || 0,
            children: [],
            namedChildren: {},
            setContentSize: function (sizeOrWidth, nextHeight) {
                if (typeof sizeOrWidth === "object") {
                    this.width = sizeOrWidth.width || 0;
                    this.height = sizeOrWidth.height || 0;
                    return;
                }
                this.width = sizeOrWidth || 0;
                this.height = nextHeight || 0;
            },
            getContentSize: function () {
                return {
                    width: this.width || 0,
                    height: this.height || 0
                };
            },
            setAnchorPoint: function () {},
            setPosition: function (x, y) {
                this.x = x;
                this.y = y;
            },
            addChild: function (child) {
                this.children.push(child);
                if (child && child._name) {
                    this.namedChildren[child._name] = child;
                }
            },
            getChildByName: function (name) {
                return this.namedChildren[name] || null;
            },
            setName: function (name) {
                this._name = name;
            },
            setScale: function (scale) {
                this.scale = scale;
            }
        };
    };
    const createLabel = function (text, width) {
        const label = createNode(width || 120, Math.max(24, Math.ceil(String(text || "").length / 14) * 20));
        label.text = text || "";
        label.setString = function (nextText) {
            this.text = nextText || "";
        };
        label.getString = function () {
            return this.text;
        };
        label.setColor = function () {};
        label.enableStroke = function () {};
        return label;
    };

    sandbox.cc.size = function (width, height) {
        return { width: width, height: height };
    };
    sandbox.cc.p = function (x, y) {
        return { x: x, y: y };
    };
    sandbox.cc.color = function () {
        return {};
    };
    sandbox.cc.TEXT_ALIGNMENT_LEFT = 0;
    sandbox.cc.TEXT_ALIGNMENT_CENTER = 1;
    sandbox.cc.Node = function () {
        return createNode(0, 0);
    };
    sandbox.cc.Layer = function () {
        return createNode(0, 0);
    };
    sandbox.cc.DrawNode = function () {
        return {
            drawRect: function () {}
        };
    };
    sandbox.cc.ScrollView = function (viewSize, container) {
        const scrollView = createNode(viewSize.width, viewSize.height);
        scrollView.container = container;
        scrollView._contentOffset = { x: 0, y: 0 };
        scrollView.setDirection = function () {};
        scrollView.setBounceable = function () {};
        scrollView.setClippingToBounds = function () {};
        scrollView.getViewSize = function () {
            return viewSize;
        };
        scrollView.setContentSize = function (sizeOrWidth, nextHeight) {
            if (typeof sizeOrWidth === "object") {
                this.contentWidth = sizeOrWidth.width || 0;
                this.contentHeight = sizeOrWidth.height || 0;
                return;
            }
            this.contentWidth = sizeOrWidth || 0;
            this.contentHeight = nextHeight || 0;
        };
        scrollView.getContentOffset = function () {
            return this._contentOffset;
        };
        scrollView.setContentOffset = function (offset) {
            this._contentOffset = offset;
        };
        return scrollView;
    };
    sandbox.cc.sys.LANGUAGE_ENGLISH = "en";
    sandbox.cc.sys.localStorage.getItem = function () {
        return "zh";
    };

    sandbox.UITheme = {
        statusColors: {
            accent: "accent",
            panelFill: "panelFill",
            panelFillAlt: "panelFillAlt",
            panelBorder: "panelBorder",
            divider: "divider"
        },
        cards: {
            panelOpacity: 88,
            rowOpacity: 84
        },
        typographyPresets: {
            sectionTitle: {
                color: "sectionTitle"
            }
        }
    };
    sandbox.uiUtil = {
        spacing: {
            XXS: 4,
            XS: 8,
            SM: 12,
            MD: 16,
            LG: 24
        },
        createLabel: function (text, presetName, opt) {
            return createLabel(text, opt && opt.width);
        },
        createColorRect: function (size) {
            return createNode(size.width, size.height);
        },
        getNodeLayoutHeight: function (node) {
            return node && node.height ? node.height : 0;
        },
        createVStack: function () {
            return {
                add: function () {}
            };
        },
        getDefaultSpriteName: function (type) {
            return type + "_default.png";
        },
        getRolePortraitFrameName: function (roleType) {
            return "npc_dig_" + roleType + ".png";
        },
        getTalentIconFrameName: function (purchaseId) {
            return "icon_iap_" + purchaseId + ".png";
        },
        getNpcMapFrameName: function (roleType) {
            return "npc_" + roleType + ".png";
        },
        getCharacterPortraitSpriteByRoleType: function () {
            return createNode(64, 64);
        },
        getSpriteByNameSafe: function () {
            return createNode(64, 64);
        }
    };
    sandbox.GameRuntime = {
        getPlayer: function () {
            return { roleType: 7 };
        },
        getTimer: function () {
            return null;
        }
    };
    sandbox.RoleType = {
        STRANGER: 6
    };
    sandbox.role = {
        getRoleSelectionConfig: function () {
            return {
                roleList: [{ id: 6 }, { id: 7 }],
                positionToRoleType: { 0: 6, 1: 7 },
                roleTypeToPosition: { 6: 0, 7: 1 },
                randomRoleTypeList: [6, 7]
            };
        },
        getChoosenRoleType: function () {
            return 7;
        },
        getRoleInfo: function (roleType) {
            if (Number(roleType) === 7) {
                return {
                    name: "Scout",
                    des: "Locked role description",
                    effect: "Locked role effect"
                };
            }
            return {
                name: "Stranger",
                des: "Default role description",
                effect: ""
            };
        },
        getPurchaseIdByRoleType: function (roleType) {
            return Number(roleType) === 7 ? 150 : null;
        },
        isRoleUnlocked: function (roleType) {
            return Number(roleType) !== 7;
        },
        isRolePurchaseRequired: function (roleType) {
            return Number(roleType) === 7;
        },
        getAvatarFallbackByRoleType: function (roleType) {
            return "npc_dig_" + roleType + ".png";
        }
    };
    sandbox.TalentService = {
        getChosenTalentPurchaseIds: function () {
            return [160];
        },
        getMaxChosenTalentCount: function () {
            return 2;
        },
        getTalentPurchaseIdList: function () {
            return [0, 160, 161];
        }
    };
    sandbox.PurchaseUiHelper = {
        getPurchaseDisplayContext: function (purchaseId) {
            purchaseId = Number(purchaseId);
            if (purchaseId === 160) {
                return {
                    titleText: "Focus",
                    displayBaseName: "Focus",
                    detailDescriptionText: "Focus description",
                    detailEffectText: "Focus effect",
                    infoDialogContentText: "Focus effect",
                    purchaseUiState: {
                        purchaseId: 160,
                        isUnlocked: true,
                        currentTalentLevel: 2,
                        maxTalentLevel: 3
                    }
                };
            }
            return {
                titleText: "Locked Talent",
                displayBaseName: "Locked Talent",
                detailDescriptionText: "Locked talent description",
                detailEffectText: "Locked talent effect",
                infoDialogContentText: "Locked talent effect",
                purchaseUiState: {
                    purchaseId: 161,
                    isUnlocked: false,
                    currentTalentLevel: 0,
                    maxTalentLevel: 3
                }
            };
        }
    };
    sandbox.stringUtil = {
        getString: function (id) {
            return "string-" + id;
        }
    };
    sandbox.ShopScene = function (opt) {
        this.opt = opt;
    };
    sandbox.cc.director.pushScene = function () {};
    sandbox.DialogBig = function (config) {
        this.config = config;
        this.leftEdge = 12;
        this.rightEdge = 312;
        this.titleNode = createNode(320, 60);
        this.actionNode = createNode(320, 60);
        this.contentNode = createNode(320, 220);
        const descriptionLabel = createLabel((config.content && config.content.des) || "", 300);
        descriptionLabel.y = 180;
        descriptionLabel.setName("des");
        this.contentNode.addChild(descriptionLabel);
        this.show = function () {
            dialogCalls.push({ type: "big", config: config });
        };
        this.setOnDismissListener = function () {};
    };
    sandbox.DialogSmall = function (config) {
        this.config = config;
        this.leftEdge = 12;
        this.rightEdge = 312;
        this.titleNode = createNode(320, 60);
        this.actionNode = createNode(320, 60);
        this.contentNode = createNode(320, 220);
        this.show = function () {
            dialogCalls.push({ type: "small", config: config });
        };
        this.setOnDismissListener = function () {};
    };

    loadIntoSandbox(sandbox, "assets/src/ui/RoleTalentUiHelper.js");

    const snapshot = sandbox.RoleTalentUiHelper.getRoleTalentSnapshot({ roleType: 7 }, [160]);
    const lockedRoleViewModel = sandbox.RoleTalentUiHelper.getRoleInfoViewModel(7, snapshot);
    const selectedTalentViewModel = sandbox.RoleTalentUiHelper.getTalentRowViewModelByPurchaseId(160, snapshot);
    const lockedTalentViewModel = sandbox.RoleTalentUiHelper.getTalentRowViewModelByPurchaseId(161, snapshot);

    assert(snapshot.currentRoleType === 7
        && JSON.stringify(snapshot.chosenTalentIds) === "[160]",
        "RoleTalentUiHelper snapshot should reflect the current role and chosen talents");
    assert(lockedRoleViewModel.roleType === 7
        && lockedRoleViewModel.isLocked === true
        && lockedRoleViewModel.purchaseId === 150,
        "RoleTalentUiHelper role view model should expose locked role purchase state");
    assert(selectedTalentViewModel.purchaseId === 160
        && selectedTalentViewModel.isSelected === true
        && selectedTalentViewModel.currentTalentLevel === 2
        && selectedTalentViewModel.infoDialogText.indexOf("Focus") !== -1,
        "RoleTalentUiHelper talent row view model should expose chosen talent level and dialog copy");
    assert(lockedTalentViewModel.purchaseId === 161
        && lockedTalentViewModel.isSelected === false
        && lockedTalentViewModel.isUnlocked === false,
        "RoleTalentUiHelper talent row view model should expose unselected locked talents");

    sandbox.RoleTalentUiHelper.showRoleInfoDialog(7, true);
    sandbox.RoleTalentUiHelper.showTalentInfoDialog(161, snapshot);

    assert(dialogCalls.length === 2
        && dialogCalls[0].type === "big"
        && dialogCalls[0].config.action.btn_2
        && dialogCalls[1].type === "small"
        && dialogCalls[1].config.action.btn_2,
        "RoleTalentUiHelper dialogs should expose shop CTA for locked roles and talents");

    return {
        name: "role-talent-ui-projection",
        ok: true,
        detail: "validated RoleTalentUiHelper snapshot, row view models, and locked-role/talent dialog contracts"
    };
}


module.exports = [
    runTalentSelectionScopedStorageSmoke,
    runRoleSelectionScopedStorageSmoke,
    runSelectionSourceBoundarySmoke,
    runRoleTalentUiBoundarySmoke,
    runRoleTalentUiProjectionSmoke
];
