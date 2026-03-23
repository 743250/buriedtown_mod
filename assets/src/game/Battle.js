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
    LINE_CAPACITY: 1,
    //现实距离,m
    MAX_REAL_DISTANCE: 1000,
    REAL_DISTANCE_PER_LINE: 100,
    PLAYER_UPDATE_INTERVAL: 0.1,
    MONSTER_MOVE_INTERVAL: 1,
    MAX_CLOCK_STEP: 0.25,
    //逃生时间
    ESCAPE_TIME: 1.5,
    BULLET_ID: 1305011,
    PLAYER_DODGE_RATE: 0,
    MONSTER_DODGE_RATE: 0
}

var createBattleRuntimeConfig = function () {
    return {
        escapeTime: BattleConfig.ESCAPE_TIME,
        playerDodgeRate: BattleConfig.PLAYER_DODGE_RATE,
        monsterDodgeRate: BattleConfig.MONSTER_DODGE_RATE
    };
};

var getBattleRuntimeTimer = function () {
    return GameRuntime.getTimer();
};

var getBattleRuntimeEmitter = function () {
    return GameRuntime.getEmitter();
};

var getBattleTimestampMs = function () {
    if (typeof Date !== "undefined" && Date && typeof Date.now === "function") {
        return Date.now();
    }
    return new Date().getTime();
};

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
                monsters: [],
                monster: null
            });
        }

        var self = this;
        this.monsters = monsterList.map(function (monId) {
            return new BattleActors.Monster(self, monId);
        });
        this.updateTargetMonster();
        if (this.monsters[0]) {
            this.monsters[0].moveToLine(this.getLastLine());
        }
        this.processLog(stringUtil.getString(1045, this.monsters.length));

        this.player = new BattleActors.Player(this, BattleActors.createBattlePlayerSnapshot({
            testBattleConfig: testBattleConfig,
            bulletItemId: BattleConfig.BULLET_ID
        }), createBattleRuntimeConfig());

        this.isMonsterStop = false;
        this.monsterMoveAccumulator = 0;
        this.battleTime = 0;
        this._lastBattleTickAtMs = getBattleTimestampMs();
        if (this.isDodge) {
            this.dodgeTime = 5;
            this.dodgePassTime = 0;
        }

        this.summary = new BattleSummary(this.battleInfo.id, this.isDodge);
        this.sumRes = this.summary.getData();

        getBattleRuntimeTimer().pause();
        audioManager.insertMusic(audioManager.music.BATTLE);

        this.isBattleEnd = false;
        cc.director.getScheduler().scheduleCallbackForTarget(
            this,
            this.updateBattle,
            BattleConfig.PLAYER_UPDATE_INTERVAL,
            cc.REPEAT_FOREVER
        );
    },
    _resolveElapsedTime: function (dt) {
        var fallback = Number(dt);
        if (!(fallback > 0)) {
            fallback = BattleConfig.PLAYER_UPDATE_INTERVAL;
        }

        var nowMs = getBattleTimestampMs();
        var deltaMs = nowMs - this._lastBattleTickAtMs;
        this._lastBattleTickAtMs = nowMs;

        if (!(deltaMs > 0) || !isFinite(deltaMs)) {
            deltaMs = fallback * 1000;
        }

        var maxStepMs = BattleConfig.MAX_CLOCK_STEP * 1000;
        if (deltaMs > maxStepMs) {
            deltaMs = maxStepMs;
        }

        var delta = Number((deltaMs / 1000).toFixed(3));
        if (!(delta > 0)) {
            delta = fallback;
        }
        this.battleTime = Number((this.battleTime + delta).toFixed(3));
        return delta;
    },
    getBattleTime: function () {
        return this.battleTime || 0;
    },
    _advanceDodge: function (delta) {
        this.dodgePassTime += delta;
        var percentage = Math.min(this.dodgePassTime / this.dodgeTime * 100, 100);
        getBattleRuntimeEmitter().emit(Battle.EVENTS.DODGE_PERCENTAGE, percentage);
        if (this.dodgePassTime >= this.dodgeTime) {
            this.gameEnd(true);
        }
    },
    _advanceMonsterMovement: function (delta) {
        if (this.isMonsterStop) {
            return;
        }

        this.monsterMoveAccumulator = Number((this.monsterMoveAccumulator + delta).toFixed(3));
        while (this.monsterMoveAccumulator >= BattleConfig.MONSTER_MOVE_INTERVAL) {
            this.monsterMoveAccumulator = Number((this.monsterMoveAccumulator - BattleConfig.MONSTER_MOVE_INTERVAL).toFixed(3));
            this.monsters.forEach(function (mon) {
                mon.move();
            });
        }
    },
    _advanceMonsterCombat: function () {
        var battleTime = this.getBattleTime();
        this.monsters.forEach(function (mon) {
            if (typeof mon.advanceCombat === "function") {
                mon.advanceCombat(battleTime);
            }
        });
    },
    updateBattle: function (dt) {
        if (this.isBattleEnd) {
            return;
        }
        var delta = this._resolveElapsedTime(dt);
        if (this.isDodge) {
            this._advanceDodge(delta);
            if (this.isBattleEnd) {
                return;
            }
        }
        if (this.player && typeof this.player.update === "function") {
            this.player.update(this.getBattleTime(), {
                autoAction: !this.isDodge
            });
            if (this.isBattleEnd) {
                return;
            }
        }
        this._advanceMonsterMovement(delta);
        if (this.isBattleEnd) {
            return;
        }
        this._advanceMonsterCombat();
    },
    getLineCapacity: function (line) {
        if (!line) {
            return 0;
        }
        return BattleConfig.LINE_CAPACITY;
    },
    getLineMonsterList: function (line) {
        if (!line) {
            return [];
        }
        if (!Array.isArray(line.monsters)) {
            line.monsters = line.monster ? [line.monster] : [];
        }
        return line.monsters;
    },
    isLineFull: function (line) {
        return this.getLineMonsterList(line).length >= this.getLineCapacity(line);
    },
    addMonsterToLine: function (line, monster) {
        if (!line || !monster) {
            return false;
        }

        var lineMonsters = this.getLineMonsterList(line);
        if (lineMonsters.indexOf(monster) !== -1) {
            line.monster = lineMonsters[0] || null;
            return true;
        }
        if (lineMonsters.length >= this.getLineCapacity(line)) {
            return false;
        }

        lineMonsters.push(monster);
        line.monster = lineMonsters[0] || null;
        return true;
    },
    removeMonsterFromLine: function (line, monster) {
        if (!line || !monster) {
            return;
        }

        var lineMonsters = this.getLineMonsterList(line);
        var index = lineMonsters.indexOf(monster);
        if (index !== -1) {
            lineMonsters.splice(index, 1);
        }
        line.monster = lineMonsters[0] || null;
    },
    removeMonster: function (monster) {
        if (monster && monster.line) {
            this.removeMonsterFromLine(monster.line, monster);
            monster.line = null;
        }

        var targetIndex = -1;
        this.monsters.forEach(function (mon, index) {
            if (mon == monster) {
                targetIndex = index;
            }
        });

        if (targetIndex != -1) {
            this.monsters.splice(targetIndex, 1);
        }


        getBattleRuntimeEmitter().emit(Battle.EVENTS.MONSTER_LENGTH, this.monsters.length);

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
        cc.director.getScheduler().unscheduleCallbackForTarget(this, this.updateBattle);
        BattleActors.resetMonsterIds();
        BattleSettlementService.settle({
            isWin: isWin,
            isDodge: this.isDodge,
            summary: this.summary,
            battlePlayer: this.player,
            bulletItemId: BattleConfig.BULLET_ID,
            testBattleConfig: testBattleConfig
        });

        if (!testBattleConfig
            && typeof Medal !== "undefined"
            && Medal
            && typeof Medal.trackBattleResult === "function") {
            Medal.trackBattleResult(this.sumRes);
        }

        if (this.gameEndListener) {
            this.gameEndListener.call(this, this.sumRes);
        }
        getBattleRuntimeTimer().resume();

        audioManager.resumeMusic();
    },

    getLastLine: function () {
        return this.indicateLines[this.indicateLines.length - 1];
    },

    updateTargetMonster: function () {
        this.targetMon = this.monsters[0] || null;
    },

    setGameEndListener: function (listener) {
        this.gameEndListener = listener;
    },

    processLog: function (log, color, bigger) {
        getBattleRuntimeEmitter().emit(Battle.EVENTS.PROCESS_LOG, {
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

    recordMonsterKill: function (itemId) {
        this.summary.recordMonsterKill(itemId);
    },

    recordPlayerUnderAttack: function (harm) {
        this.summary.recordPlayerUnderAttack(harm);
    }

});
Battle.EVENTS = {
    PROCESS_LOG: "battleProcessLog",
    MONSTER_LENGTH: "battleMonsterLength",
    DODGE_PERCENTAGE: "battleDodgePercentage"
};
var configureBattleTestRuntime = function (c) {
    testBattleConfig = c;
};
Battle.config = configureBattleTestRuntime;

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        Battle: Battle,
        config: configureBattleTestRuntime
    };
}
