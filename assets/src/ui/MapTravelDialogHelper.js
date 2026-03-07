/**
 * Keeps map travel dialog construction out of uiUtil so map interaction code
 * can evolve without growing the generic UI utility file further.
 */
var MapTravelDialogHelper = {
    showTravelDialog: function (entity, time, okCb, cancelCb) {
        if (entity.baseSite instanceof Site) {
            if (entity.baseSite.id == HOME_SITE) {
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
        var config = {
            title: {},
            content: {log: true},
            action: {btn_1: {}, btn_2: {}}
        };
        config.title.title = npc.getName();
        config.title.icon = "#icon_npc.png";
        config.title.heart = memoryUtil.decode(npc.reputation);
        config.content.dig_des = uiUtil.getRolePortraitFrameName(npc.id, true);
        config.content.des = npc.getDes();
        config.action.btn_1.txt = stringUtil.getString(1031);
        config.action.btn_1.target = entity;
        config.action.btn_1.cb = cancelCb;
        config.action.btn_2.txt = stringUtil.getString(1138);
        config.action.btn_2.target = entity;
        config.action.btn_2.cb = okCb;
        var dialog = new NpcDialog(config);
        var log = dialog.contentNode.getChildByName("log");

        var label1 = new cc.LabelTTF(utils.getTimeDistanceStr(time), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label1.setAnchorPoint(0, 1);
        label1.setPosition(dialog.leftEdge, log.getContentSize().height - 30);
        label1.setColor(UITheme.colors.TEXT_TITLE);
        log.addChild(label1);

        var label2 = new cc.LabelTTF(stringUtil.getString(1137, npc.storage.getItemSortNum()), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label2.setAnchorPoint(0, 1);
        label2.setPosition(dialog.leftEdge, label1.y - label1.height - 10);
        label2.setColor(UITheme.colors.TEXT_TITLE);
        log.addChild(label2);

        if (cc.RTL) {
            label1.anchorX = 1;
            label1.x = dialog.rightEdge;

            label2.anchorX = 1;
            label2.x = dialog.rightEdge;
        }

        dialog.show();
    },
    showSiteDialog: function (entity, time, okCb, cancelCb) {
        var config = utils.clone(stringUtil.getString(5000));
        config.title.icon = "#site_" + entity.baseSite.id + ".png";
        config.title.title = entity.baseSite.getName();
        config.title.txt_1 = cc.formatStr(config.title.txt_1, entity.baseSite.getProgressStr());
        config.title.txt_2 = cc.formatStr(config.title.txt_2, entity.baseSite.getAllItemNum());
        config.content.log = true;
        config.content.dig_des = "#site_dig_" + entity.baseSite.id + ".png";
        config.content.des = entity.baseSite.getDes();
        config.action.btn_1.target = entity;
        config.action.btn_1.cb = cancelCb;
        config.action.btn_2.target = entity;
        config.action.btn_2.cb = okCb;
        var dialog = new DialogBig(config);

        var txt1 = dialog.titleNode.getChildByName("txt_1");
        var txt2 = dialog.titleNode.getChildByName("txt_2");
        var icon = dialog.titleNode.getChildByName("icon");
        txt1.x = icon.x;
        txt2.x = txt1.x + txt1.width + 35;

        dialog.contentNode.getChildByName("dig_des").setScale(0.8);
        var des = dialog.contentNode.getChildByName("des");
        des.y = des.y + 20;

        var log = dialog.contentNode.getChildByName("log");
        var label = new cc.LabelTTF(utils.getTimeDistanceStr(time), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label.setAnchorPoint(0, 1);
        label.setPosition(dialog.leftEdge, log.getContentSize().height - 10);
        label.setColor(UITheme.colors.TEXT_TITLE);
        log.addChild(label);

        if (cc.RTL) {
            label.anchorX = 1;
            label.x = dialog.rightEdge;
        }

        dialog.show();

        if (userGuide.isStep(userGuide.stepName.MAP_SITE_GO) && userGuide.isSite(entity.baseSite.id)) {
            uiUtil.createIconWarn(dialog.actionNode.getChildByName("btn_2"));
        }
    },
    showHomeDialog: function (entity, time, okCb, cancelCb) {
        var config = utils.clone(stringUtil.getString(5000));
        config.title.icon = "#site_" + entity.baseSite.id + ".png";
        config.title.title = entity.baseSite.getName();
        config.title.txt_1 = null;
        config.title.txt_2 = null;
        config.content.log = true;
        config.content.dig_des = "#site_dig_" + entity.baseSite.id + ".png";
        config.content.des = entity.baseSite.getDes();
        config.action.btn_1.target = entity;
        config.action.btn_1.cb = cancelCb;
        config.action.btn_2.target = entity;
        config.action.btn_2.cb = okCb;
        var dialog = new DialogBig(config);
        dialog.contentNode.getChildByName("dig_des").setScale(0.8);
        var des = dialog.contentNode.getChildByName("des");
        des.y = des.y + 20;

        var log = dialog.contentNode.getChildByName("log");
        var label = new cc.LabelTTF(utils.getTimeDistanceStr(time), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label.setAnchorPoint(0, 1);
        label.setPosition(dialog.leftEdge, log.getContentSize().height - 10);
        label.setColor(UITheme.colors.TEXT_TITLE);
        log.addChild(label);

        if (cc.RTL) {
            label.anchorX = 1;
            label.x = dialog.rightEdge;
        }

        dialog.show();

        if (userGuide.isStep(userGuide.stepName.MAP_SITE_HOME_GO) && entity.baseSite.id == HOME_SITE) {
            uiUtil.createIconWarn(dialog.actionNode.getChildByName("btn_2"));
        }
    }
};
