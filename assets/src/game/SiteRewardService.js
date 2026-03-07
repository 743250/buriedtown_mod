if (typeof cc === "undefined" || !cc) {
    var cc = require("../test/testBattle");
    var utils = require("../util/utils");
}

var SiteRewardService = {
    rollScavengerDoubleDrop: function () {
        return !!(typeof TalentService !== "undefined" && TalentService && typeof TalentService.rollScavengerDoubleDrop === "function"
            ? TalentService.rollScavengerDoubleDrop()
            : false);
    },

    buildWorkRoomLoot: function (itemIds) {
        var roomItemIds = itemIds ? itemIds.slice() : [];
        var scavengerDoubleTriggered = roomItemIds.length > 0 && this.rollScavengerDoubleDrop();
        if (scavengerDoubleTriggered) {
            roomItemIds = roomItemIds.concat(roomItemIds);
        }
        return {
            list: utils.convertItemIds2Item(roomItemIds),
            scavengerDoubleTriggered: scavengerDoubleTriggered
        };
    },

    buildFixedValueWorkLoot: function (produceValue, produceList) {
        return this.buildWorkRoomLoot(utils.getFixedValueItemIds(produceValue, produceList));
    },

    buildSiteWorkRooms: function (siteConfig) {
        var workRooms = [];
        if (!siteConfig || siteConfig.workRoom <= 0) {
            return workRooms;
        }

        var itemIds = utils.getFixedValueItemIds(siteConfig.produceValue, siteConfig.produceList);
        var fixedProduceList = siteConfig.fixedProduceList || [];
        fixedProduceList.forEach(function (item) {
            for (var i = 0; i < item.num; i++) {
                itemIds.push(item.itemId);
            }
        });

        for (var roomIndex = 0; roomIndex < siteConfig.workRoom; roomIndex++) {
            workRooms.push({
                list: []
            });
        }
        itemIds.forEach(function (itemId) {
            var index = utils.getRandomInt(0, workRooms.length - 1);
            workRooms[index].list.push(itemId);
        });

        return workRooms.map(function (workRoom) {
            return SiteRewardService.buildWorkRoomLoot(workRoom.list);
        });
    },

    buildBattleScavengerLoot: function (options) {
        options = options || {};
        if (!options.isWin || !TalentService.hasChosenTalent(122)) {
            return null;
        }

        var produceList = options.produceList;
        if (!produceList || produceList.length === 0) {
            return null;
        }

        var baseValue = options.baseValue || 1;
        var isDouble = this.rollScavengerDoubleDrop();
        var produceValue = isDouble ? baseValue * 2 : baseValue;
        var lootItems = utils.convertItemIds2Item(utils.getFixedValueItemIds(produceValue, produceList));
        if (lootItems.length === 0) {
            return null;
        }

        return {
            lootItems: lootItems,
            scavengerDoubleTriggered: isDouble
        };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SiteRewardService;
}
