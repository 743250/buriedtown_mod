if (typeof cc === "undefined" || !cc) {
    var cc = require("../test/testBattle");
    var utils = require("../util/utils");
    var itemConfig = require("../data/itemConfig");
    var monsterConfig = require("../data/monsterConfig");
    var BattleEquipmentSystem = require("./BattleEquipmentSystem");
    var CombatResolver = require("./CombatResolver");
}

var BattleActors = (function () {
    var monsterId = 0;
    var getBattleActorsRuntimePlayer = function () {
        return GameRuntime.getPlayer();
    };
    var roundBattleTime = function (value) {
        return Number((Number(value) || 0).toFixed(3));
    };
    var addBattleTime = function (start, delta) {
        return roundBattleTime((Number(start) || 0) + (Number(delta) || 0));
    };

    var createBattlePlayerSnapshot = function (options) {
        options = options || {};
        var testBattleConfig = options.testBattleConfig;
        var bulletItemId = options.bulletItemId;

        if (testBattleConfig) {
            var testPlayer = testBattleConfig.player;
            return {
                bulletNum: Number(testPlayer.weapon1_num),
                toolNum: Number(testPlayer.tool_num),
                hp: testPlayer.hp,
                def: testPlayer.def || 0,
                weapon1: testPlayer.weapon1,
                weapon2: testPlayer.weapon2,
                equip: testPlayer.tool
            };
        }

        var runtimePlayer = getBattleActorsRuntimePlayer();
        var playerSnapshot = {
            bulletNum: runtimePlayer.bag.getNumByItemId(bulletItemId),
            toolNum: runtimePlayer.bag.getNumByItemId(runtimePlayer.equip.getEquip(EquipmentPos.TOOL)),
            hp: memoryUtil.decode(runtimePlayer.hp),
            injury: memoryUtil.decode(runtimePlayer.injury),
            weapon1: runtimePlayer.equip.getEquip(EquipmentPos.GUN),
            weapon2: runtimePlayer.equip.getEquip(EquipmentPos.WEAPON),
            equip: runtimePlayer.equip.getEquip(EquipmentPos.TOOL)
        };
        playerSnapshot.def = runtimePlayer.equip.getEquip(EquipmentPos.EQUIP)
            ? itemConfig[runtimePlayer.equip.getEquip(EquipmentPos.EQUIP)].effect_arm.def
            : 0;
        return playerSnapshot;
    };

    var resetMonsterIds = function () {
        monsterId = 0;
    };

    var Monster = cc.Class.extend({
        ctor: function (battle, type) {
            this.id = monsterId++;
            this.battle = battle;
            this.attr = utils.clone(monsterConfig[type]);
            this.dead = false;
            this.line = null;
            this.attackReadyAt = 0;
        },
        playEffect: function (soundName) {
            if (this.effectId) {
                audioManager.stopEffect(this.effectId);
            }
            this.effectId = audioManager.playEffect(soundName);
        },
        getAttackCooldownDuration: function () {
            var cooldown = Number(this.attr.attackSpeed);
            if (!(cooldown > 0)) {
                cooldown = 0.1;
            }
            return cooldown;
        },
        resetAttackCadence: function () {
            this.attackReadyAt = 0;
        },
        advanceCombat: function (battleTime) {
            if (this.dead || this.battle.isBattleEnd || !this.line || !this.isInRange()) {
                this.resetAttackCadence();
                return;
            }

            if (!(this.attackReadyAt > 0)) {
                this.attackReadyAt = addBattleTime(battleTime, this.getAttackCooldownDuration());
                return;
            }
            if (battleTime < this.attackReadyAt) {
                return;
            }

            this.atk();
            if (this.dead || this.battle.isBattleEnd || !this.line || !this.isInRange()) {
                this.resetAttackCadence();
                return;
            }
            this.attackReadyAt = addBattleTime(battleTime, this.getAttackCooldownDuration());
        },
        move: function () {
            var targetLine;
            if (this.line) {
                var runtimePlayer = getBattleActorsRuntimePlayer();
                var monsterSpeed = this.attr.speed + runtimePlayer.weather.getValue("monster_speed");
                monsterSpeed = Math.max(monsterSpeed, 1);
                var targetIndex = this.line.index - monsterSpeed;
                targetIndex = Math.max(0, targetIndex);
                for (var startIndex = this.line.index - 1, endIndex = targetIndex, i = startIndex; i >= endIndex; i--) {
                    var line = this.battle.indicateLines[i];
                    if (!this.battle.isLineFull(line)) {
                        targetLine = line;
                    } else {
                        break;
                    }
                }
            } else {
                targetLine = this.battle.getLastLine();
            }
            if (targetLine && !this.battle.isLineFull(targetLine)) {
                this.moveToLine(targetLine);
            }
            if (!this.line || !this.isInRange()) {
                this.resetAttackCadence();
            }
        },
        moveToLine: function (line) {
            if (line === this.line) {
                return;
            }

            var oldLine = this.line;
            if (oldLine) {
                this.battle.removeMonsterFromLine(oldLine, this);
            }

            if (!this.battle.addMonsterToLine(line, this)) {
                if (oldLine) {
                    this.battle.addMonsterToLine(oldLine, this);
                }
                return;
            }

            this.line = line;
            cc.log("monster " + this.id + " move to " + line.index);
            if (this.battle.targetMon && this.id == this.battle.targetMon.id) {
                this.battle.processLog(stringUtil.getString(1046, stringUtil.getString("monsterType_" + this.attr.prefixType), line.index));
            }
        },
        atk: function () {
            if (this.dead === true) {
                return;
            }
            if (this.battle.isBattleEnd) {
                return;
            }
            this.playEffect(audioManager.sound.MONSTER_ATTACK);
            var battlePlayer = this.battle.player;
            battlePlayer.underAtk(this);
            if (battlePlayer.isDie()) {
                this.resetAttackCadence();
            }
        },
        underAtk: function (obj) {
            var harm = 0;
            if (obj instanceof BattleEquipmentSystem.Weapon) {
                var attackResult = (typeof obj.getAttackResult === "function")
                    ? obj.getAttackResult(this)
                    : {harm: obj.getHarm(this), isHeadshot: false};
                harm = Number(attackResult && attackResult.harm) || 0;
                var isHeadshot = !!(attackResult && attackResult.isHeadshot);

                if (obj instanceof BattleEquipmentSystem.Gun) {
                    this.battle.processLog(stringUtil.getString(1048, obj.itemConfig.name, stringUtil.getString("monsterType_" + this.attr.prefixType)));
                } else if (obj.id === Equipment.HAND) {
                    this.battle.processLog(stringUtil.getString(1165, stringUtil.getString("monsterType_" + this.attr.prefixType)));
                } else {
                    this.battle.processLog(stringUtil.getString(1049, obj.itemConfig.name, stringUtil.getString("monsterType_" + this.attr.prefixType)));
                }

                if (isHeadshot) {
                    this.battle.processLog(stringUtil.getString(1051, stringUtil.getString("monsterType_" + this.attr.prefixType)));
                } else if (harm === 0) {
                    this.battle.processLog(stringUtil.getString(1054));
                } else {
                    this.battle.processLog(stringUtil.getString(1052, stringUtil.getString("monsterType_" + this.attr.prefixType), harm));
                }
            } else if (obj instanceof BattleEquipmentSystem.Bomb) {
                harm = obj.attr.atk;
            }
            cc.d("monster " + this.id + " underAtk harm=" + harm);

            this.attr.hp -= harm;
            this.attr.hp = Math.max(0, this.attr.hp);

            if (this.attr.hp == 0) {
                this.die(obj);
            }
        },
        die: function (obj) {
            this.battle.recordMonsterKill(obj && obj.id);
            cc.e("monster " + this.id + " die");
            this.dead = true;
            this.resetAttackCadence();
            this.battle.removeMonster(this);
            if (obj instanceof BattleEquipmentSystem.Bomb) {
                obj.deadMonsterNum++;
            } else {
                var logStr = stringUtil.getString(1056, 1, stringUtil.getString("monsterType_" + this.attr.prefixType));
                if (cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_ENGLISH) {
                    logStr = logStr.replace("zombies", "zombie");
                }
                this.battle.processLog(logStr);
                this.battle.checkGameEnd();
            }
            audioManager.playEffect(audioManager.sound.MONSTER_DIE);
        },
        isInRange: function () {
            return this.line.index == 0;
        },
        isDie: function () {
            return this.dead;
        }
    });

    var BattlePlayer = cc.Class.extend({
        ctor: function (battle, playerObj, runtimeConfig) {
            this.battle = battle;
            this.runtimeConfig = runtimeConfig || {};

            this.hp = playerObj.hp;
            this.maxHp = this.hp;
            this.injury = playerObj.injury;
            this.def = playerObj.def + TalentService.getBattleDefenseBonus();

            this.bulletNum = playerObj.bulletNum;
            this.toolNum = playerObj.toolNum;
            this.sharedAttackReadyAt = 0;
            this.escapeReadyAt = 0;

            this.weapon1 = BattleEquipmentSystem.createEquipment(playerObj.weapon1, this);
            this.weapon2 = BattleEquipmentSystem.createEquipment(playerObj.weapon2, this);
            this.equip = BattleEquipmentSystem.createEquipment(playerObj.equip, this);
        },
        getBattleTime: function () {
            if (!this.battle || typeof this.battle.getBattleTime !== "function") {
                return 0;
            }
            return this.battle.getBattleTime();
        },
        _resolveBattleTime: function (battleTime) {
            battleTime = Number(battleTime);
            if (!(battleTime >= 0)) {
                return this.getBattleTime();
            }
            return battleTime;
        },
        _safeActionStep: function (actionFn, stepName, battleTime) {
            try {
                actionFn.call(this, battleTime);
            } catch (e) {
                cc.error("BattlePlayer action step failed (" + stepName + "): " + e);
            }
        },
        action: function (battleTime) {
            battleTime = this._resolveBattleTime(battleTime);
            this._safeActionStep(this.useWeapon1, "weapon1", battleTime);
            this._safeActionStep(this.useWeapon2, "weapon2", battleTime);
            this._safeActionStep(this.useEquip, "equip", battleTime);
        },
        _updateEscape: function (battleTime) {
            if (!(this.escapeReadyAt > 0)) {
                this.escapeReadyAt = 0;
                return;
            }
            if (battleTime < this.escapeReadyAt) {
                return;
            }
            this.escapeReadyAt = 0;
            this.escapeAction();
        },
        _updateEquipment: function (equipment, battleTime) {
            if (!equipment || typeof equipment.update !== "function") {
                return;
            }
            equipment.update(battleTime);
        },
        update: function (battleTime, options) {
            battleTime = this._resolveBattleTime(battleTime);
            options = options || {};
            this._updateEscape(battleTime);
            this._updateEquipment(this.weapon1, battleTime);
            this._updateEquipment(this.weapon2, battleTime);
            this._updateEquipment(this.equip, battleTime);
            if (options.autoAction === false) {
                return;
            }
            this.action(battleTime);
        },
        isInSharedAttackCooldown: function (battleTime) {
            battleTime = this._resolveBattleTime(battleTime);
            return this.sharedAttackReadyAt > battleTime;
        },
        enterSharedAttackCooldown: function (cooldown, battleTime) {
            if (!(cooldown > 0)) {
                cooldown = 0.1;
            }
            battleTime = this._resolveBattleTime(battleTime);
            this.sharedAttackReadyAt = addBattleTime(battleTime, cooldown);
        },
        getPlayerDodgeRate: function () {
            return CombatResolver.normalizeRate(this.runtimeConfig && this.runtimeConfig.playerDodgeRate, 0);
        },
        getMonsterHitChance: function (monster) {
            var precise = CombatResolver.normalizeRate(monster && monster.attr && monster.attr.precise, 0.9);
            var runtimePlayer = getBattleActorsRuntimePlayer();
            if (runtimePlayer && runtimePlayer.weather && typeof runtimePlayer.weather.getValue === "function") {
                precise += Number(runtimePlayer.weather.getValue("monster_precise")) || 0;
            }
            return CombatResolver.normalizeRate(precise, 0.9);
        },
        resolveMonsterAttackResult: function (monster) {
            return CombatResolver.resolveTwoPhaseHit(this.getMonsterHitChance(monster), this.getPlayerDodgeRate());
        },
        underAtk: function (monster) {
            var monsterType = stringUtil.getString("monsterType_" + monster.attr.prefixType);
            if (!this.resolveMonsterAttackResult(monster).success) {
                this.battle.processLog(stringUtil.getString(1368, monsterType));
                return;
            }

            var minDamage = TalentService.canZeroBattleDamage() ? 0 : 1;
            var harm = CombatResolver.getDamageAfterDefense(monster.attr.attack, this.def, minDamage);
            this.hp -= harm;

            cc.e("player underAtk hp=" + this.hp + " by monster " + monster.id);
            this.battle.processLog(stringUtil.getString(1047, monsterType, "-" + harm), cc.color.RED);
            this.battle.recordPlayerUnderAttack(harm);
            if (this.hp <= 0) {
                this.die();
            }

            var runtimePlayer = getBattleActorsRuntimePlayer();
            runtimePlayer.changeAttr("hp", -harm);
            if (harm > 0) {
                runtimePlayer.changeAttr("injury", 1);
            }
        },
        die: function () {
            cc.e("player die");
            getBattleActorsRuntimePlayer().log.addMsg(1109);
            this.battle.processLog(stringUtil.getString(1057));
            this.battle.gameEnd(false);
        },
        isDie: function () {
            return this.hp <= 0;
        },
        useWeapon1: function (battleTime) {
            if (!this.weapon1) {
                return;
            }
            if (this.weapon1.action(battleTime)) {
                this.interruptEscape();
            }
        },
        useWeapon2: function (battleTime) {
            if (!this.weapon2) {
                return;
            }
            if (this.weapon2.action(battleTime)) {
                this.interruptEscape();
            }
        },
        useEquip: function (battleTime) {
            if (!this.equip) {
                return;
            }
            if (this.equip.action(battleTime)) {
                this.interruptEscape();
            }
        },
        escape: function () {
            var escapeTime = Number(this.runtimeConfig.escapeTime);
            if (!(escapeTime > 0)) {
                escapeTime = 0.1;
            }
            this.escapeReadyAt = addBattleTime(this.getBattleTime(), escapeTime);
        },
        escapeAction: function () {
            this.battle.gameEnd(false);
        },
        interruptEscape: function () {
            this.escapeReadyAt = 0;
        }
    });

    return {
        createBattlePlayerSnapshot: createBattlePlayerSnapshot,
        resetMonsterIds: resetMonsterIds,
        Monster: Monster,
        Player: BattlePlayer
    };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = BattleActors;
}
