/**
 * Keeps map travel dialog construction out of uiUtil so map interaction code
 * can evolve without growing the generic UI utility file further.
 */
var MapTravelDialogHelper = {
    _isHomeSiteEntity: function (entity) {
        return entity
            && entity.baseSite instanceof Site
            && entity.baseSite.id == HOME_SITE;
    },
    _applyLogLabelRtl: function (label, dialog) {
        if (!cc.RTL || !label || !dialog) {
            return;
        }
        label.anchorX = 1;
        label.x = dialog.rightEdge;
    },
    _addTravelTimeLabel: function (dialog, time, topPadding) {
        if (!dialog || !dialog.contentNode) {
            return null;
        }
        var log = dialog.contentNode.getChildByName("log");
        if (!log) {
            return null;
        }

        var label = new cc.LabelTTF(utils.getTimeDistanceStr(time), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label.setAnchorPoint(0, 1);
        label.setPosition(dialog.leftEdge, log.getContentSize().height - (topPadding || 10));
        label.setColor(UITheme.colors.TEXT_TITLE);
        log.addChild(label);
        this._applyLogLabelRtl(label, dialog);
        return label;
    },
    _createNpcTravelConfig: function (entity, okCb, cancelCb) {
        var npc = entity.baseSite;
        var config = typeof NpcDialogHelper !== "undefined"
            && NpcDialogHelper
            && typeof NpcDialogHelper.createBaseConfig === "function"
            ? NpcDialogHelper.createBaseConfig(npc)
            : {
                title: {},
                content: {log: true},
                action: {}
            };

        config.content.des = npc.getDes();
        config.action.btn_1 = {
            txt: stringUtil.getString(1031),
            target: entity,
            cb: cancelCb
        };
        config.action.btn_2 = {
            txt: stringUtil.getString(1138),
            target: entity,
            cb: okCb
        };
        return config;
    },
    _createSiteTravelConfig: function (entity, okCb, cancelCb, isHomeSite) {
        var config = utils.clone(stringUtil.getString(5000));
        config.title.icon = "#site_" + entity.baseSite.id + ".png";
        config.title.title = entity.baseSite.getName();
        config.title.txt_1 = isHomeSite ? null : cc.formatStr(config.title.txt_1, entity.baseSite.getProgressStr());
        config.title.txt_2 = isHomeSite ? null : cc.formatStr(config.title.txt_2, entity.baseSite.getAllItemNum());
        config.content.log = true;
        config.content.dig_des = "#site_dig_" + entity.baseSite.id + ".png";
        config.content.des = entity.baseSite.getDes();
        config.action.btn_1.target = entity;
        config.action.btn_1.cb = cancelCb;
        config.action.btn_2.target = entity;
        config.action.btn_2.cb = okCb;
        return config;
    },
    _createSiteTravelDialog: function (entity, time, okCb, cancelCb, isHomeSite) {
        var dialog = new DialogBig(this._createSiteTravelConfig(entity, okCb, cancelCb, isHomeSite));
        dialog.contentNode.getChildByName("dig_des").setScale(0.8);
        var des = dialog.contentNode.getChildByName("des");
        des.y = des.y + 20;
        this._addTravelTimeLabel(dialog, time, 10);
        return dialog;
    },
    showTravelDialog: function (entity, time, okCb, cancelCb) {
        if (entity.baseSite instanceof Site) {
            if (this._isHomeSiteEntity(entity)) {
                this.showHomeDialog(entity, time, okCb, cancelCb);
            } else {
                this.showSiteDialog(entity, time, okCb, cancelCb);
            }
        } else {
            this.showNpcDialog(entity, time, okCb, cancelCb);
        }
    },
    showNpcDialog: function (entity, time, okCb, cancelCb) {
        var npc = entity.baseSite;
        var dialog = new NpcDialog(this._createNpcTravelConfig(entity, okCb, cancelCb));
        var log = dialog.contentNode.getChildByName("log");

        var label1 = this._addTravelTimeLabel(dialog, time, 30);

        var label2 = new cc.LabelTTF(stringUtil.getString(1137, npc.storage.getItemSortNum()), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label2.setAnchorPoint(0, 1);
        label2.setPosition(dialog.leftEdge, label1.y - label1.height - 10);
        label2.setColor(UITheme.colors.TEXT_TITLE);
        log.addChild(label2);
        this._applyLogLabelRtl(label2, dialog);

        dialog.show();
    },
    showSiteDialog: function (entity, time, okCb, cancelCb) {
        var dialog = this._createSiteTravelDialog(entity, time, okCb, cancelCb, false);

        var txt1 = dialog.titleNode.getChildByName("txt_1");
        var txt2 = dialog.titleNode.getChildByName("txt_2");
        var icon = dialog.titleNode.getChildByName("icon");
        txt1.x = icon.x;
        txt2.x = txt1.x + txt1.width + 35;

        dialog.show();

        if (userGuide.isStep(userGuide.stepName.MAP_SITE_GO) && userGuide.isSite(entity.baseSite.id)) {
            uiUtil.createIconWarn(dialog.actionNode.getChildByName("btn_2"));
        }
    },
    showHomeDialog: function (entity, time, okCb, cancelCb) {
        var dialog = this._createSiteTravelDialog(entity, time, okCb, cancelCb, true);

        dialog.show();

        if (userGuide.isStep(userGuide.stepName.MAP_SITE_HOME_GO) && this._isHomeSiteEntity(entity)) {
            uiUtil.createIconWarn(dialog.actionNode.getChildByName("btn_2"));
        }
    }
};
