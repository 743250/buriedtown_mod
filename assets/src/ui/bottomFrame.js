/**
 * User: Alex
 * Date: 15/1/5
 * Time: 4:07 PM
 */
var getBuriedTownNavigationService = function () {
    if (typeof getBuriedTownAppService !== "function") {
        return null;
    }
    return getBuriedTownAppService("navigation");
};

var invokeBuriedTownNavigation = function (methodName, args, defaultValue) {
    var navigationService = getBuriedTownNavigationService();
    if (navigationService && typeof navigationService[methodName] === "function") {
        return navigationService[methodName].apply(navigationService, args || []);
    }
    cc.error("[Navigation] service unavailable: " + methodName);
    return defaultValue;
};

var Navigation = {
    _array: null,
    _map: {},
    currentMusic: null,
    nodeName: {
        BOTTOM_FRAME_NODE: "BottomFrameNode",
        HOME_NODE: "HomeNode",
        BUILD_NODE: "BuildNode",
        STORAGE_NODE: "StorageNode",
        GATE_NODE: "GateNode",
        MAP_NODE: "MapNode",
        SITE_NODE: "SiteNode",
        AD_SITE_NODE: "AdSiteNode",
        WORK_SITE_NODE: "WorkSiteNode",
        BOSS_SITE_NODE: "BossSiteNode",
        SITE_STORAGE_NODE: "SiteStorageNode",
        NPC_NODE: "NpcNode",
        NPC_STORAGE_NODE: "NpcStorageNode",
        BATTLE_AND_WORK_NODE: "BattleAndWorkNode",
        WORK_ROOM_STORAGE_NODE: "WorkRoomStorageNode",
        DEATH_NODE: "DeathNode",
        RADIO_NODE: "RadioNode",
        GATE_OUT_NODE: "GateOutNode",
        SHOP_NODE: "ShopNode"
    },
    siteMusic: null,
    forward: function (nodeName, userData) {
        return invokeBuriedTownNavigation("forward", [nodeName, userData], null);
    },
    back: function () {
        return invokeBuriedTownNavigation("back", [], null);
    },
    current: function () {
        return invokeBuriedTownNavigation("current", [], null);
    },
    getSiteMusic: function () {
        return invokeBuriedTownNavigation("getSiteMusic", [], null);
    },
    changeSiteMusic: function () {
        return invokeBuriedTownNavigation("changeSiteMusic", [], null);
    },
    stopMusic: function () {
        return invokeBuriedTownNavigation("stopMusic", [], null);
    },
    root: function (nodeName, userData) {
        return invokeBuriedTownNavigation("root", [nodeName, userData], null);
    },
    replace: function (nodeName, userData) {
        return invokeBuriedTownNavigation("replace", [nodeName, userData], null);
    },
    init: function () {
        return invokeBuriedTownNavigation("init", [], this);
    },
    getClz: function (nodeName) {
        return invokeBuriedTownNavigation("getClz", [nodeName], null);
    },
    gotoDeathNode: function () {
        return invokeBuriedTownNavigation("gotoDeathNode", [], null);
    },
    save: function () {
        return invokeBuriedTownNavigation("save", [], null);
    },
    restore: function () {
        return invokeBuriedTownNavigation("restore", [], null);
    }
};

var BottomFrameNode = cc.Node.extend({
    ctor: function (userData) {
        this._super();

        this.userData = userData;
        this.appContext = typeof getBuriedTownAppContext === "function"
            ? getBuriedTownAppContext()
            : null;

        this.initRes();

        this.bg = autoSpriteFrameController.getSpriteFromSpriteName("#frame_bg_bottom.png");
        this.bg.setAnchorPoint(0.5, 0);
        this.bg.setPosition(cc.winSize.width / 2, 18);
        this.addChild(this.bg);
        this.bgRect = cc.rect(0, 0, this.bg.width, this.bg.height);

        this.contentTopLineHeight = 770;
        this.line = autoSpriteFrameController.getSpriteFromSpriteName("#frame_line.png");
        this.line.setPosition(this.bgRect.width / 2, this.contentTopLineHeight);
        this.bg.addChild(this.line, 1);

        var actionBarBaseHeight = 803;
        this.actionBarBaseHeight = actionBarBaseHeight;
        this.title = new cc.LabelTTF("", uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_1);
        this.title.setPosition(this.bgRect.width / 2, actionBarBaseHeight);
        this.bg.addChild(this.title);

        this.leftBtn = new SpriteButton(cc.size(100, 70), "btn_back.png", null, "btn_back_disabled.png");
        this.leftBtn.setClickListener(this, this.onClickLeftBtn);
        this.leftBtn.setPosition(60, actionBarBaseHeight);
        this.bg.addChild(this.leftBtn, 2);

        this.rightBtn = new SpriteButton(cc.size(100, 70), "btn_forward.png", null, "btn_forward_disabled.png");
        this.rightBtn.setClickListener(this, this.onClickRightBtn);
        this.rightBtn.setPosition(this.bgRect.width - 60, actionBarBaseHeight);
        this.bg.addChild(this.rightBtn, 2);

        this._init();

        this.title.setString(this.uiConfig.title);
        this.leftBtn.setVisible(this.uiConfig.leftBtn);
        this.rightBtn.setVisible(this.uiConfig.rightBtn);

        return true;
    },
    _init: function () {
        this.setName(Navigation.nodeName.BOTTOM_FRAME_NODE);
        this.uiConfig = {
            title: Navigation.nodeName.BOTTOM_FRAME_NODE,
            leftBtn: false,
            rightBtn: true
        };
    },
    onClickLeftBtn: function () {
    },
    onClickRightBtn: function () {
        //this.forward(Navigation.nodeName.HOME_NODE);
    },
    getAppContext: function () {
        if (!this.appContext && typeof getBuriedTownAppContext === "function") {
            this.appContext = getBuriedTownAppContext();
        }
        return this.appContext || null;
    },
    getAppService: function (serviceName) {
        var appContext = this.getAppContext();
        if (!appContext || !appContext.services || !serviceName) {
            return null;
        }
        return appContext.services[serviceName] || null;
    },
    getNavigationService: function () {
        return this.getAppService("navigation");
    },
    getSessionService: function () {
        return this.getAppService("session");
    },
    swapBottomNode: function (node) {
        if (!node) {
            cc.error("[Navigation] target node missing, keep current node");
            return null;
        }
        var parent = this.getParent();
        if (!parent) {
            cc.error("[Navigation] parent missing for bottom node swap");
            return null;
        }
        this.removeFromParent();
        if (parent) {
            parent.addChild(node);
        }
        return node;
    },
    forward: function (nodeName, userData) {
        var navigationService = this.getNavigationService();
        var node = navigationService && typeof navigationService.forward === "function"
            ? navigationService.forward(nodeName, userData)
            : Navigation.forward(nodeName, userData);
        return this.swapBottomNode(node);
    },
    back: function () {
        var navigationService = this.getNavigationService();
        var node = navigationService && typeof navigationService.back === "function"
            ? navigationService.back()
            : Navigation.back();
        return this.swapBottomNode(node);
    },
    replace: function (nodeName, userData) {
        var navigationService = this.getNavigationService();
        var node = navigationService && typeof navigationService.replace === "function"
            ? navigationService.replace(nodeName, userData)
            : Navigation.replace(nodeName, userData);
        return this.swapBottomNode(node);
    },

    onExit: function () {
        this._super();
        utils.emitter.off("left_btn_enabled", this.func);
        utils.emitter.off("nextStep");
        this.releaseRes();
    },

    onEnter: function () {
        this._super();
        this.func = this.setLeftBtnEnabled();
        utils.emitter.on("left_btn_enabled", this.func);
    },

    buildNodeUpdate: function () {
        var self = this;
        return function () {
            self.updateUpgradeView();
            self.updateData();
            self.tableView.reloadData();
        };
    },
    setLeftBtnEnabled: function () {
        var self = this;
        return function (enabled) {
            self.leftBtn.setEnabled(enabled);
        };
    },
    initRes: function () {
    },
    releaseRes: function () {
    },
    afterInit: function () {
    }

});
