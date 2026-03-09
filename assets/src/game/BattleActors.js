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

        var playerSnapshot = {
            bulletNum: player.bag.getNumByItemId(bulletItemId),
            toolNum: player.bag.getNumByItemId(player.equip.getEquip(EquipmentPos.TOOL)),
            hp: memoryUtil.decode(player.hp),
            injury: memoryUtil.decode(player.injury),
            weapon1: player.equip.getEquip(EquipmentPos.GUN),
            weapon2: player.equip.getEquip(EquipmentPos.WEAPON),
            equip: player.equip.getEquip(EquipmentPos.TOOL)
        };
        playerSnapshot.def = player.equip.getEquip(EquipmentPos.EQUIP)
            ? itemConfig[player.equip.getEquip(EquipmentPos.EQUIP)].effect_arm.def
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
            this._attackCooldownCallback = null;
            this._isAttackScheduled = false;
        },
        playEffect: function (soundName) {
            if (this.effectId) {
                audioManager.stopEffect(this.effectId);
            }
            this.effectId = audioManager.playEffect(soundName);
        },
        _scheduleNextAttack: function () {
            if (this.dead || this.battle.isBattleEnd || !this.line || !this.isInRange() || this._isAttackScheduled) {
                return;
            }

            var cooldown = Number(this.attr.attackSpeed);
            if (!(cooldown > 0)) {
                cooldown = 0.1;
            }

            this._isAttackScheduled = true;
            var self = this;
            this._attackCooldownCallback = function () {
                self._isAttackScheduled = false;
                cc.director.getScheduler().unscheduleCallbackForTarget(self, self._attackCooldownCallback);
                self._attackCooldownCallback = null;

                if (self.dead || self.battle.isBattleEnd || !self.line || !self.isInRange()) {
                    return;
                }

                self.atk();
                self._scheduleNextAttack();
            };
            cc.director.getScheduler().scheduleCallbackForTarget(this, this._attackCooldownCallback, cooldown, 1);
        },
        _cancelAttackSchedule: function () {
            if (this._attackCooldownCallback) {
                cc.director.getScheduler().unscheduleCallbackForTarget(this, this._attackCooldownCallback);
                this._attackCooldownCallback = null;
            }
            this._isAttackScheduled = false;
        },
        move: function () {
            var targetLine;
            if (this.line) {
                var monsterSpeed = this.attr.speed + player.weather.getValue("monster_speed");
                monsterSpeed = Math.max(monsterSpeed, 1);
                var targetIndex = this.line.index - monsterSpeed;
                targetIndex = Math.max(0, targetIndex);
                for (var startIndex = this.line.index - 1, endIndex = targetIndex, i = startIndex; i >= endIndex; i--) {
                    var line = this.battle.indicateLines[i];
                    if (!line.monster) {
                        targetLine = line;
                    } else {
                        break;
                    }
                }
            } else {
                targetLine = this.battle.getLastLine();
            }
            if (targetLine && !targetLine.monster) {
                this.moveToLine(targetLine);
            }

            if (this.line && this.isInRange()) {
                this._scheduleNextAttack();
            }
        },
        moveToLine: function (line) {
            if (line === this.line) {
                return;
            }

            if (this.line) {
                this.line.monster = null;
            }
            line.monster = this;
            this.line = line;
            cc.log("monster " + this.id + " move to " + line.index);
            if (this.id == this.battle.targetMon.id) {
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
                this._cancelAttackSchedule();
            }
        },
        underAtk: function (obj) {
            var harm = 0;
            if (obj instanceof BattleEquipmentSystem.Weapon) {
                harm = obj.getHarm(this);

                if (obj instanceof BattleEquipmentSystem.Gun) {
                    this.battle.processLog(stringUtil.getString(1048, obj.itemConfig.name, stringUtil.getString("monsterType_" + this.attr.prefixType)));
                } else if (obj.id === Equipment.HAND) {
                    this.battle.processLog(stringUtil.getString(1165, stringUtil.getString("monsterType_" + this.attr.prefixType)));
                } else {
                    this.battle.processLog(stringUtil.getString(1049, obj.itemConfig.name, stringUtil.getString("monsterType_" + this.attr.prefixType)));
                }

                if (harm === Number.MAX_VALUE) {
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
            this.battle.recordMonsterKill();
            cc.e("monster " + this.id + " die");
            this.dead = true;
            this._cancelAttackSchedule();
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
            if (this.line) {
                this.line.monster = null;
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
            this.sharedAttackCooldown = false;
            this._sharedAttackCooldownCallback = null;

            this.weapon1 = BattleEquipmentSystem.createEquipment(playerObj.weapon1, this);
            this.weapon2 = BattleEquipmentSystem.createEquipment(playerObj.weapon2, this);
            this.equip = BattleEquipmentSystem.createEquipment(playerObj.equip, this);
        },
        _safeActionStep: function (actionFn, stepName) {
            try {
                actionFn.call(this);
            } catch (e) {
                cc.error("BattlePlayer action step failed (" + stepName + "): " + e);
            }
        },
        action: function () {
            this._safeActionStep(this.useWeapon1, "weapon1");
            this._safeActionStep(this.useWeapon2, "weapon2");
            this._safeActionStep(this.useEquip, "equip");
        },
        isInSharedAttackCooldown: function () {
            return this.sharedAttackCooldown === true;
        },
        enterSharedAttackCooldown: function (cooldown) {
            if (!(cooldown > 0)) {
                cooldown = 0.1;
            }

            this.sharedAttackCooldown = true;
            if (this._sharedAttackCooldownCallback) {
                cc.director.getScheduler().unscheduleCallbackForTarget(this, this._sharedAttackCooldownCallback);
            }

            var self = this;
            this._sharedAttackCooldownCallback = function () {
                self.sharedAttackCooldown = false;
                cc.director.getScheduler().unscheduleCallbackForTarget(self, self._sharedAttackCooldownCallback);
                self._sharedAttackCooldownCallback = null;
            };
            cc.director.getScheduler().scheduleCallbackForTarget(this, this._sharedAttackCooldownCallback, cooldown, 1);
        },
        getPlayerDodgeRate: function () {
            return CombatResolver.normalizeRate(this.runtimeConfig && this.runtimeConfig.playerDodgeRate, 0);
        },
        getMonsterHitChance: function (monster) {
            var precise = CombatResolver.normalizeRate(monster && monster.attr && monster.attr.precise, 0.9);
            if (typeof player !== "undefined" && player && player.weather && typeof player.weather.getValue === "function") {
                precise += Number(player.weather.getValue("monster_precise")) || 0;
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

            player.changeAttr("hp", -harm);
            if (harm !== 0) {
                player.changeAttr("injury", 1);
            }
        },
        die: function () {
            cc.e("player die");
            player.log.addMsg(1109);
            this.battle.processLog(stringUtil.getString(1057));
            this.battle.gameEnd(false);
        },
        isDie: function () {
            return this.hp <= 0;
        },
        useWeapon1: function () {
            if (!this.weapon1) {
                return;
            }
            this.weapon1.action();
            this.interruptEscape();
        },
        useWeapon2: function () {
            if (!this.weapon2) {
                return;
            }
            this.weapon2.action();
            this.interruptEscape();
        },
        useEquip: function () {
            if (!this.equip) {
                return;
            }
            this.equip.action();
            this.interruptEscape();
        },
        escape: function () {
            cc.director.getScheduler().scheduleCallbackForTarget(this, this.escapeAction, this.runtimeConfig.escapeTime, 1);
        },
        escapeAction: function () {
            this.battle.gameEnd(false);
        },
        interruptEscape: function () {
            cc.director.getScheduler().unscheduleCallbackForTarget(this, this.escapeAction);
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
