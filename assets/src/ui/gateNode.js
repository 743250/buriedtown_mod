/**
 * Created by lancelot on 15/4/22.
 */
var getGateNodeRuntimePlayer = function () {
    return GameRuntime.getPlayer();
};

var getGateNodeRuntimeEmitter = function () {
    return GameRuntime.getEmitter();
};

var GateNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);
    },
    _init: function () {
        var runtimePlayer = getGateNodeRuntimePlayer();
        this.build = runtimePlayer.room.getBuild(this.userData.bid);
        var title = runtimePlayer.room.getBuildCurrentName(this.build.id);
        this.setName(Navigation.nodeName.GATE_NODE);
        this.uiConfig = {
            title: title,
            leftBtn: true,
            rightBtn: true
        };

        //区分仓库
        runtimePlayer.setSetting("inGate", true);

        var equipNode = new EquipNode();
        equipNode.setAnchorPoint(0.5, 1);
        equipNode.setPosition(this.bgRect.width / 2, this.contentTopLineHeight);
        this.bg.addChild(equipNode, 1);
        equipNode.setName("equipNode");

        var itemChangeNode = new ItemChangeNode(runtimePlayer.bag, stringUtil.getString(1034), runtimePlayer.storage, stringUtil.getString(1035));
        itemChangeNode.setAnchorPoint(0.5, 0);
        itemChangeNode.setPosition(this.bgRect.width / 2, 0);
        this.bg.addChild(itemChangeNode);

        audioManager.playEffect(audioManager.sound.CLOSE_DOOR);

    },

    onEnter: function () {
        this._super();

        this.onItemClick = this.onItemClickFunc();
        getGateNodeRuntimeEmitter().on("item_click", this.onItemClick);

        var self = this;
        if(userGuide.isStep(userGuide.stepName.GATE_OUT)){
            uiUtil.createIconWarn(self.rightBtn);
        }

        getGateNodeRuntimeEmitter().on("nextStep", function () {
            if (userGuide.isStep(userGuide.stepName.GATE_OUT)) {
                uiUtil.createIconWarn(self.rightBtn);
            }
        });
    },
    onExit: function () {
        this._super();

        getGateNodeRuntimePlayer().setSetting("inGate", false);
        getGateNodeRuntimeEmitter().off("item_click", this.onItemClick);
        getGateNodeRuntimeEmitter().off("nextStep");
    },
    onItemClickFunc: function () {
        var self = this;
        return function (storageCell, id, isLongPressed) {
            if (userGuide.isStep(userGuide.stepName.GATE_EQUIP_1) && userGuide.isItemCreate(storageCell.item.id)) {
                self.bg.getChildByName("equipNode").updateIconWarn();
            }
        }
    },

    onClickLeftBtn: function () {
        this.back();
    },
    onClickRightBtn: function () {

        if (userGuide.isStep(userGuide.stepName.GATE_OUT)) {
            userGuide.step();
            //player.room.createBuild(9, 0);
        }

        this.forward(Navigation.nodeName.GATE_OUT_NODE);
        getGateNodeRuntimePlayer().log.addMsg(1110);
        getGateNodeRuntimePlayer().enterWorldMap();

        audioManager.playEffect(audioManager.sound.FOOT_STEP);

    },
    initRes: function () {
    },
    releaseRes: function () {
    }

});
