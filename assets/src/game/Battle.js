if (typeof cc === "undefined" || !cc) {
    var cc = require("../test/testBattle");
    var utils = require("../util/utils");
    var BattleActors = require("./BattleActors");
    var BattleSummary = require("./BattleSummary");
    var BattleSettlementService = require("./BattleSettlementService");

    var testBattleConfig;

}

var BattleConfig = {
    LINE_LENGTH: 6,
    //现实距离,m
    MAX_REAL_DISTANCE: 1000,
    REAL_DISTANCE_PER_LINE: 100,
    //逃生时间
    ESCAPE_TIME: 1.5,
    BULLET_ID: 1305011
}

var Battle = cc.Class.extend({
    ctor: function (battleInfo, isDodge) {
        cc.log(JSON.stringify(battleInfo));
        //player.log.addMsg(JSON.stringify(battleInfo));
        this.battleInfo = battleInfo;
        this.isDodge = isDodge;
        var monsterList = this.battleInfo.monsterList;

        this.indicateLines = [];
        for (var i = 0; i < 6; i++) {
            this.indicateLines.push({
                index: i,
                monster: null
            });
        }

        var self = this;
        this.monsters = monsterList.map(function (monId) {
            return new BattleActors.Monster(self, monId);
        });
        this.updateTargetMonster();
        this.monsters[0].moveToLine(this.getLastLine());
        this.processLog(stringUtil.getString(1045, this.monsters.length));

        cc.director.getScheduler().scheduleCallbackForTarget(this, this.updateMonster, 1, cc.REPEAT_FOREVER);
        cc.director.getScheduler().scheduleCallbackForTarget(this, this.updatePlayer, 0.1, cc.REPEAT_FOREVER);
        if (this.isDodge) {
            this.dodgeTime = 5;
            this.dodgePassTime = 0;
            cc.director.getScheduler().scheduleCallbackForTarget(this, this.dodgeEnd, 0.1, cc.REPEAT_FOREVER);
        }

        this.player = new BattleActors.Player(this, BattleActors.createBattlePlayerSnapshot({
            testBattleConfig: testBattleConfig,
            bulletItemId: BattleConfig.BULLET_ID
        }), {
            escapeTime: BattleConfig.ESCAPE_TIME
        });

        this.isMonsterStop = false;

        this.summary = new BattleSummary(this.battleInfo.id, this.isDodge);
        this.sumRes = this.summary.getData();

        cc.timer.pause();
        audioManager.insertMusic(audioManager.music.BATTLE);

        this.isBattleEnd = false;
    },
    dodgeEnd: function (dt) {
        this.dodgePassTime += dt;
        utils.emitter.emit("battleDodgePercentage", this.dodgePassTime / this.dodgeTime * 100);
        if (this.dodgePassTime >= this.dodgeTime) {

            this.gameEnd(true);
        }
    },
    updatePlayer: function (dt) {
        //cc.log("updatePlayer");
        if (!this.isDodge) {
            this.player.action();
        }
    },
    updateMonster: function (dt) {
        //cc.log("updateMonster");
        if (!this.isMonsterStop) {
            this.monsters.forEach(function (mon) {
                mon.move();
            });
        }
    },
    removeMonster: function (monster) {
        var targetIndex = -1;
        this.monsters.forEach(function (mon, index) {
            if (mon == monster) {
                targetIndex = index;
            }
        });

        if (targetIndex != -1) {
            this.monsters.splice(targetIndex, 1);
        }


        utils.emitter.emit("battleMonsterLength", this.monsters.length);

        this.updateTargetMonster();
    },

    checkGameEnd: function () {
        if (this.monsters.length === 0) {
            this.gameEnd(true);
            return true;
        } else {
            return false;
        }
    },

    gameEnd: function (isWin) {
        this.isBattleEnd = true;

        cc.e(this.battleInfo.id + " gameEnd " + isWin);
        cc.e(JSON.stringify(this.sumRes));
        this.isMonsterStop = true;
        cc.director.getScheduler().unscheduleCallbackForTarget(this, this.updateMonster);
        cc.director.getScheduler().unscheduleCallbackForTarget(this, this.updatePlayer);
        if (this.isDodge) {
            cc.director.getScheduler().unscheduleCallbackForTarget(this, this.dodgeEnd);
        }
        BattleActors.resetMonsterIds();
        BattleSettlementService.settle({
            isWin: isWin,
            isDodge: this.isDodge,
            summary: this.summary,
            battlePlayer: this.player,
            bulletItemId: BattleConfig.BULLET_ID,
            testBattleConfig: testBattleConfig
        });

        if (this.gameEndListener) {
            this.gameEndListener.call(this, this.sumRes);
        }
        cc.timer.resume();

        audioManager.resumeMusic();
    },

    getLastLine: function () {
        return this.indicateLines[this.indicateLines.length - 1];
    },

    updateTargetMonster: function () {
        this.targetMon = this.monsters[0];
    },

    setGameEndListener: function (listener) {
        this.gameEndListener = listener;
    },

    processLog: function (log, color, bigger) {
        utils.emitter.emit("battleProcessLog", {
            log: log,
            color: color,
            bigger: bigger
        });
    },

    recordWeaponUse: function (slotType) {
        this.summary.recordWeaponUse(slotType);
    },

    recordToolUse: function () {
        this.summary.recordToolUse();
    },

    recordBulletConsumed: function () {
        this.summary.recordBulletConsumed();
    },

    recordMonsterKill: function () {
        this.summary.recordMonsterKill();
    },

    recordPlayerUnderAttack: function (harm) {
        this.summary.recordPlayerUnderAttack(harm);
    }

});
var B = module.exports;
B.Battle = Battle;
B.config = function (c) {
    testBattleConfig = c;
}
