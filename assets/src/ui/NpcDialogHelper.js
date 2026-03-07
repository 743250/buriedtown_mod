var NpcDialogHelper = {
    createBaseConfig: function (npc) {
        return {
            title: {
                title: npc.getName(),
                txt: cc.timer.getTimeDayStr() + " " + cc.timer.getTimeHourStr(),
                icon: "#icon_npc.png",
                heart: memoryUtil.decode(npc.reputation)
            },
            content: {
                log: true,
                dig_des: uiUtil.getRolePortraitFrameName(npc.id, true)
            },
            action: {}
        };
    },

    showNeedHelpDialog: function (npc, noCb, yesCb, needRestore) {
        var config = this.createBaseConfig(npc);
        config.content.des = stringUtil.getString(1065);
        config.action.btn_1 = {
            txt: stringUtil.getString(1071),
            target: npc,
            cb: noCb
        };
        config.action.btn_2 = {
            txt: stringUtil.getString(1072),
            target: npc,
            cb: yesCb
        };

        if (needRestore) {
            config.title.heart++;
        }

        var dialog = new NpcDialog(config);
        dialog.autoDismiss = false;
        var log = dialog.contentNode.getChildByName("log");
        log.height = 130;

        var label = new cc.LabelTTF(stringUtil.getString(1066), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
        label.setAnchorPoint(0, 1);
        label.setPosition(dialog.leftEdge, log.getContentSize().height - 10);
        label.setColor(UITheme.colors.TEXT_TITLE);
        log.addChild(label);

        var needItems = npc.getNeedHelpItems();
        var pass = player.validateItems(needItems);

        needItems = needItems.map(function (itemInfo) {
            return {
                itemId: itemInfo.itemId,
                num: itemInfo.num,
                color: itemInfo.haveNum >= itemInfo.num ? UITheme.colors.TEXT_TITLE : UITheme.colors.TEXT_ERROR
            };
        });

        var richText = new ItemRichText(needItems, dialog.rightEdge - dialog.leftEdge, 3, 0.5, UITheme.colors.TEXT_TITLE);
        richText.setName("richText");
        richText.setAnchorPoint(0, 1);
        richText.setPosition(dialog.leftEdge, label.getPositionY() - label.getContentSize().height - 10);
        log.addChild(richText);

        if (cc.RTL) {
            label.anchorX = 1;
            label.x = dialog.rightEdge;

            richText.anchorX = 1;
            richText.x = dialog.rightEdge;
        }

        dialog.actionNode.getChildByName("btn_2").setEnabled(pass);
        dialog.show();
        audioManager.playEffect(audioManager.sound.NPC_KNOCK);
    },

    showSendGiftDialog: function (npc) {
        var config = this.createBaseConfig(npc);
        config.action.btn_1 = {
            txt: stringUtil.getString(1073),
            target: npc
        };

        var gifts;
        var isItem;
        if (npc.needSendGiftList["item"]) {
            isItem = true;
            gifts = npc.needSendGiftList["item"];
            delete npc.needSendGiftList["item"];

            var itemMap = {};
            gifts.forEach(function (item) {
                itemMap[item.itemId] = itemMap[item.itemId] || 0;
                itemMap[item.itemId] += parseInt(item.num);
            });
            gifts = Object.keys(itemMap).map(function (itemId) {
                return {itemId: itemId, num: itemMap[itemId]};
            });

            config.content.des = stringUtil.getString(1068);
            gifts.forEach(function (gift) {
                player.log.addMsg(1103, gift.num, stringUtil.getString(gift.itemId).title, player.storage.getNumByItemId(gift.itemId));
            });
        } else {
            isItem = false;
            gifts = npc.needSendGiftList["site"];
            delete npc.needSendGiftList["site"];

            config.content.des = stringUtil.getString(1070);
            gifts.forEach(function (gift) {
                var siteName = stringUtil.getString("site_" + gift.siteId).name;
                config.content.des += stringUtil.getString(1221, siteName);
            });
        }

        config.action.btn_1.cb = function () {
            gifts.forEach(function (gift) {
                if (gift.hasOwnProperty("itemId")) {
                    player.gainItems([gift]);
                } else {
                    player.map.unlockSite(gift.siteId);
                }
            });
            if (npc.needSendGift()) {
                npc.sendGift();
            }
            Record.saveAll();
        };

        var dialog = new NpcDialog(config);

        if (isItem) {
            var log = dialog.contentNode.getChildByName("log");
            var label = new cc.LabelTTF(stringUtil.getString(1069), uiUtil.fontFamily.normal, uiUtil.fontSize.COMMON_3);
            label.setAnchorPoint(0, 1);
            label.setPosition(dialog.leftEdge, log.getContentSize().height - 10);
            label.setColor(UITheme.colors.TEXT_TITLE);
            log.addChild(label);

            var richText = new ItemRichText(gifts, dialog.rightEdge - dialog.leftEdge, 3, 0.5, UITheme.colors.TEXT_TITLE);
            richText.setName("richText");
            richText.setAnchorPoint(0, 1);
            richText.setPosition(dialog.leftEdge, label.getPositionY() - label.getContentSize().height - 10);
            log.addChild(richText);

            if (cc.RTL) {
                label.anchorX = 1;
                label.x = dialog.rightEdge;

                richText.anchorX = 1;
                richText.x = dialog.rightEdge;
            }
        }

        dialog.show();
        audioManager.playEffect(audioManager.sound.NPC_KNOCK);
    }
};
