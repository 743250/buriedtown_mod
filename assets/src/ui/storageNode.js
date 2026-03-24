/**
 * Created by lancelot on 15/4/23.
 */
/**
 * Created by lancelot on 15/4/22.
 */
var getStorageNodeRuntimePlayer = function () {
    return GameRuntime.getPlayer();
};

var getStorageNodeRuntimeEmitter = function () {
    return GameRuntime.getEmitter();
};

var getStorageNodeRuntimeRecord = function () {
    return GameRuntime.getRecord();
};

var StorageNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);
    },
    _init: function () {
        this.setName(Navigation.nodeName.STORAGE_NODE);
        var runtimePlayer = getStorageNodeRuntimePlayer();
        this.build = runtimePlayer.room.getBuild(this.userData.bid);
        this.uiConfig = {
            title: runtimePlayer.room.getBuildCurrentName(this.build.id),
            leftBtn: true,
            rightBtn: false
        };

        runtimePlayer.setSetting("inStorage", true);

        this.tableView = new SectionTableView(cc.size(640, 750));
        this.tableView.setPosition((this.bgRect.width - this.tableView.getViewSize().width) / 2, 10);
        this.bg.addChild(this.tableView);

        this.updateView();

        var btnShop = new SpriteButton(cc.size(100, 70), "btn_shop.png");
        btnShop.setClickListener(this, function () {
            this.forward(Navigation.nodeName.SHOP_NODE);
        });
        btnShop.setPosition(this.bgRect.width - 60, this.actionBarBaseHeight);
        this.bg.addChild(btnShop);

        var btnShopHighlight = autoSpriteFrameController.getSpriteFromSpriteName('btn_shop_highlight.png');
        btnShopHighlight.x = btnShop.width / 2;
        btnShopHighlight.y = btnShop.height / 2;
        btnShop.addChild(btnShopHighlight);
        btnShopHighlight.runAction(cc.repeatForever((cc.sequence(cc.fadeOut(1.5), cc.fadeIn(1.5)))));
    },
    onEnter: function () {
        this._super();
        var runtimePlayer = getStorageNodeRuntimePlayer();

        this.onItemClick = this.onItemClickFunc();
        getStorageNodeRuntimeEmitter().on("item_click", this.onItemClick);

        this.onItemUse = this.onItemUseFunc();
        getStorageNodeRuntimeEmitter().on("btn_1_click", this.onItemUse);

        var self = this;
        runtimePlayer.storage.setOnItemChangeListener(function (itemId) {
            self.updateView();
        });
    },
    onExit: function () {
        this._super();
        var runtimePlayer = getStorageNodeRuntimePlayer();

        getStorageNodeRuntimeEmitter().off("item_click", this.onItemClick);
        getStorageNodeRuntimeEmitter().off("btn_1_click", this.onItemUse);

        runtimePlayer.setSetting("inStorage", false);

        runtimePlayer.storage.removeOnItemChangeListener();
    },
    onItemClickFunc: function () {
        return function (storageCell) {
            uiUtil.showItemDialog(storageCell.item.id, false, 'storage');
        }
    },
    onItemUseFunc: function () {
        var self = this;
        return function (itemId, source) {
            if (source !== 'storage')
                return;
            var runtimePlayer = getStorageNodeRuntimePlayer();
            var res = runtimePlayer.useItem(runtimePlayer.storage, itemId);
            if (res.result) {
                self.updateView();
            } else {
                cc.e("useItem fail " + res.msg);
            }
        }
    },
    updateView: function () {
        var runtimePlayer = getStorageNodeRuntimePlayer();

        var typeStrArray = stringUtil.getString(3006);
        var typeArray = [
            "1101",
            "1103",
            "1104",
            "1105",
            "1107",
            "13",
            "other"
        ];
        var itemsGroup = runtimePlayer.storage.getItemsByTypeGroup(typeArray);
        var data = typeArray.map(function (key, index) {
            return {title: typeStrArray[index], itemList: itemsGroup[key]};
        });

        this.tableView.updateView(data);

        if (userGuide.isStep(userGuide.stepName.STORAGE_BACK)) {
            uiUtil.createIconWarn(this.leftBtn);
        }

        getStorageNodeRuntimeRecord().saveAll();
    },

    onClickLeftBtn: function () {
        if (userGuide.isStep(userGuide.stepName.STORAGE_BACK)) {
            userGuide.step();
            getStorageNodeRuntimePlayer().room.createBuild(1, 0);
            getStorageNodeRuntimeEmitter().emit("nextStep");
        }
        this.back();
    },
    onClickRightBtn: function () {
    }

});
