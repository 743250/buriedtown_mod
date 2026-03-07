if (typeof cc === "undefined" || !cc) {
    var cc = require("../test/testBattle");
    var utils = require("../util/utils");
    var SiteRewardService = require("./SiteRewardService");
}

var SiteRoomGenerator = {
    buildRooms: function (siteConfig, options) {
        options = options || {};
        var workRoomTypeLen = options.workRoomTypeLen || 3;
        var battleRooms = this.buildBattleRooms(siteConfig);
        var workRooms = SiteRewardService.buildSiteWorkRooms(siteConfig);
        var roomLen = siteConfig.battleRoom + siteConfig.workRoom;
        var rooms = [];

        if (workRooms.length > 0) {
            var endWorkRoomIndex = utils.getRandomInt(0, workRooms.length - 1);
            var endWorkRoom = workRooms.splice(endWorkRoomIndex, 1)[0];
            rooms.unshift(this._createWorkRoom(endWorkRoom, workRoomTypeLen));
            roomLen--;
        }

        while (roomLen-- > 0) {
            var index = utils.getRandomInt(0, roomLen);
            if (index > battleRooms.length - 1) {
                index -= battleRooms.length;
                rooms.unshift(this._createWorkRoom(workRooms.splice(index, 1)[0], workRoomTypeLen));
            } else {
                rooms.unshift(this._createBattleRoom(battleRooms.splice(index, 1)[0]));
            }
        }

        return rooms;
    },

    buildBattleRooms: function (siteConfig) {
        var rooms = [];
        for (var i = 0; i < siteConfig.battleRoom; i++) {
            var difficulty = utils.getRandomInt(siteConfig.difficulty[0], siteConfig.difficulty[1]);
            rooms.push({
                list: utils.getMonsterListByDifficulty(difficulty),
                difficulty: difficulty
            });
        }
        return rooms;
    },

    buildSecretRooms: function (siteConfig, secretRoomsConfig, options) {
        options = options || {};
        var workRoomTypeLen = options.workRoomTypeLen || 3;
        var rooms = [];
        var secretRoomsLength = utils.getRandomInt(secretRoomsConfig.minRooms, secretRoomsConfig.maxRooms);

        for (var i = 0; i < secretRoomsLength - 1; i++) {
            var difficulty = utils.getRandomInt(
                siteConfig.difficulty[0] + secretRoomsConfig.minDifficultyOffset,
                siteConfig.difficulty[1] + secretRoomsConfig.maxDifficultyOffset
            );
            difficulty = cc.clampf(difficulty, 1, 12);
            rooms.push(this._createBattleRoom({
                list: utils.getMonsterListByDifficulty(difficulty),
                difficulty: difficulty
            }));
        }

        var workRoom = SiteRewardService.buildFixedValueWorkLoot(secretRoomsConfig.produceValue, secretRoomsConfig.produceList);
        rooms.push(this._createWorkRoom(workRoom, workRoomTypeLen));
        return rooms;
    },

    _createBattleRoom: function (battleRoom) {
        return {
            list: battleRoom.list,
            difficulty: battleRoom.difficulty,
            type: "battle"
        };
    },

    _createWorkRoom: function (workRoom, workRoomTypeLen) {
        return {
            list: workRoom.list,
            type: "work",
            workType: utils.getRandomInt(0, workRoomTypeLen - 1),
            scavengerDoubleTriggered: !!workRoom.scavengerDoubleTriggered
        };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SiteRoomGenerator;
}
