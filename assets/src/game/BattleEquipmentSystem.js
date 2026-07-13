if (typeof cc === "undefined" || !cc) {
    var cc = require("../test/testBattle");
    var utils = require("../util/utils");
    var itemConfig = require("../data/itemConfig");
    var CombatResolver = require("./CombatResolver");
    var BattleConst = require("./constants").BattleConst;
}

var BattleEquipmentSystem = (function () {
    var CONFIG = {
        LINE_LENGTH: 6
    };
    var roundBattleTime = function (value) {
        return Number((Number(value) || 0).toFixed(3));
    };
    var addBattleTime = function (start, delta) {
        return roundBattleTime((Number(start) || 0) + (Number(delta) || 0));
    };
    var EQUIPMENT_KIND = {
        BOMB: "bomb",
        TRAP: "trap",
        MELEE: "melee",
        GUN: "gun",
        ELECTRIC_GUN: "electric_gun"
    };

    var weaponSoundConfig = {
        melee: {
            1302043: "ATTACK_1",
            1302011: "ATTACK_2",
            1: "PUNCH"
        },
        gun: {
            1301022: "ATTACK_3",
            1301052: "ATTACK_3",
            1301011: "ATTACK_4",
            1301041: "ATTACK_4",
            1301033: "ATTACK_5",
            1301063: "ATTACK_5"
        }
    };
    var getTalentService = function () {
        return (typeof TalentService !== "undefined" && TalentService) ? TalentService : null;
    };
    var getBattleEquipmentRuntimePlayer = function () {
        if (typeof GameRuntime !== "undefined"
            && GameRuntime
            && typeof GameRuntime.getPlayer === "function") {
            return GameRuntime.getPlayer();
        }
        return typeof player !== "undefined" ? player : null;
    };

    var callTalentRuntime = function (methodName, defaultValue) {
        var args = Array.prototype.slice.call(arguments, 2);
        var talentService = getTalentService();
        try {
            if (talentService
                && typeof talentService[methodName] === "function") {
                return talentService[methodName].apply(talentService, args);
            }
        } catch (e) {
            cc.error("BattleEquipmentSystem talent runtime call failed: " + methodName + ", " + e);
        }
        return defaultValue;
    };

    var applyTalentPreciseBonus = function (precise) {
        return callTalentRuntime("getPreciseEffect", precise, precise);
    };

    var applyStatusPreciseAdjustments = function (precise, options) {
        options = options || {};
        var adjustedPrecise = precise;
        var runtimePlayer = getBattleEquipmentRuntimePlayer();

        if (runtimePlayer && runtimePlayer.weather && typeof runtimePlayer.weather.getValue === "function") {
            adjustedPrecise += runtimePlayer.weather.getValue("gun_precise");
        }

        var spiritPenalty = RoleRuntimeService.getSpiritPrecisePenalty(runtimePlayer);
        if (spiritPenalty > 0) {
            adjustedPrecise -= spiritPenalty;
            if (options.logPenalty) {
                cc.log("spirit " + memoryUtil.decode(runtimePlayer.spirit));
                cc.log("decPreciseBySpirit " + spiritPenalty);
            }
        }

        var vigourPenalty = RoleRuntimeService.getVigourPrecisePenalty
            ? RoleRuntimeService.getVigourPrecisePenalty(runtimePlayer)
            : 0;
        if (vigourPenalty > 0) {
            adjustedPrecise -= vigourPenalty;
            if (options.logPenalty) {
                cc.log("vigour " + memoryUtil.decode(runtimePlayer.vigour));
                cc.log("decPreciseByVigour " + vigourPenalty);
            }
        }

        return adjustedPrecise;
    };
    var getShotCountFromWeaponAttr = function (attr) {
        attr = attr || {};
        var minShots = Number(attr.bulletMin);
        var maxShots = Number(attr.bulletMax);

        if (!(maxShots > 0)) {
            return 0;
        }
        if (!(minShots > 0)) {
            minShots = maxShots;
        }
        if (minShots > maxShots) {
            minShots = maxShots;
        }
        if (minShots === maxShots) {
            return maxShots;
        }
        return Math.floor(Math.random() * (maxShots - minShots + 1)) + minShots;
    };

    var getItemTypePrefix = function (itemId) {
        var id = Number(itemId) || 0;
        if (id <= 0) {
            return 0;
        }
        return Math.floor(id / 1000);
    };

    var classifyEquipmentKind = function (itemId) {
        var id = Number(itemId) || 0;
        if (!id) {
            return null;
        }

        if (id === Equipment.HAND) {
            return EQUIPMENT_KIND.MELEE;
        }

        var itemInfo = itemConfig[id];
        if (!itemInfo || !itemInfo.effect_weapon) {
            return null;
        }

        if (itemInfo.effect_weapon.equipmentKind) {
            return itemInfo.effect_weapon.equipmentKind;
        }

        var typePrefix = getItemTypePrefix(id);
        if (typePrefix === 1302) {
            return EQUIPMENT_KIND.MELEE;
        }
        if (typePrefix === 1301) {
            return EQUIPMENT_KIND.GUN;
        }

        var bulletMax = Number(itemInfo.effect_weapon.bulletMax) || 0;
        if (bulletMax > 0) {
            return EQUIPMENT_KIND.GUN;
        }
        return EQUIPMENT_KIND.MELEE;
    };

    var BattleEquipment = cc.Class.extend({
        ctor: function (id, battlePlayer) {
            this.id = id;
            this.battlePlayer = battlePlayer;

            if (this.id === Equipment.HAND) {
                this.itemConfig = utils.clone(itemConfig[1302011]);
                this.itemConfig.name = stringUtil.getString(1063);
                this.itemConfig.effect_weapon.atk = 20;
                this.itemConfig.effect_weapon.atkCD = 1;
            } else {
                this.itemConfig = utils.clone(itemConfig[this.id]);
                this.itemConfig.name = stringUtil.getString(this.id).title;
            }

            this.attr = this.itemConfig.effect_weapon;
            this.attr = callTalentRuntime("applyElitePistolWeaponEffect", this.attr, this.id, this.attr);
            this.itemConfig.effect_weapon = this.attr;

            var elitePistolDisplay = callTalentRuntime("getElitePistolDisplayInfo", null, this.id, {title: this.itemConfig.name, des: ""});
            if (elitePistolDisplay && elitePistolDisplay.title) {
                this.itemConfig.name = elitePistolDisplay.title;
            }

            this.cooldownEndsAt = 0;
        },
        resolveBattleTime: function (battleTime) {
            battleTime = Number(battleTime);
            if (battleTime >= 0) {
                return battleTime;
            }
            if (this.battlePlayer && typeof this.battlePlayer.getBattleTime === "function") {
                return this.battlePlayer.getBattleTime();
            }
            return 0;
        },
        isCooldownActive: function (battleTime) {
            battleTime = this.resolveBattleTime(battleTime);
            return this.cooldownEndsAt > battleTime;
        },
        action: function (battleTime) {
            battleTime = this.resolveBattleTime(battleTime);
            if (this.isCooldownActive(battleTime)) {
                return false;
            }
            cc.d(this.itemConfig.name + " action");
            if (this.beforeCd() === false) {
                return false;
            }
            var cooldown = this.getCooldownDuration();
            this.cooldownEndsAt = addBattleTime(battleTime, cooldown);
            return true;
        },
        getCooldownDuration: function () {
            var atkCD = Number(this.attr && this.attr.atkCD);
            if (!(atkCD > 0)) {
                atkCD = 0.1;
            }
            return roundBattleTime(atkCD * getBattleEquipmentRuntimePlayer().vigourEffect());
        },
        update: function (battleTime) {
            battleTime = this.resolveBattleTime(battleTime);
            if (!(this.cooldownEndsAt > 0) || battleTime < this.cooldownEndsAt) {
                return;
            }
            this.cooldownEndsAt = 0;
            if (!this.battlePlayer || !this.battlePlayer.battle || this.battlePlayer.battle.isBattleEnd) {
                return;
            }
            this.afterCd();
        },
        _action: function () {
        },
        beforeCd: function () {
            return true;
        },
        afterCd: function () {
        },
        cost: function () {
            this.battlePlayer.toolNum--;
        },
        isEnough: function () {
            return this.battlePlayer.toolNum > 0;
        }
    });

    var BattleBomb = BattleEquipment.extend({
        ctor: function (id, battlePlayer) {
            this._super(id, battlePlayer);
            this.deadMonsterNum = 0;
        },
        _action: function () {
            if (!this.isEnough()) {
                console.log(this.id + " not enough");
                return false;
            }
            audioManager.playEffect(audioManager.sound.BOMB);
            this.battlePlayer.battle.recordToolUse();

            var monsters = this.battlePlayer.battle.monsters.concat();
            var harm = this.attr.atk;
            var self = this;
            monsters.forEach(function (monster) {
                monster.underAtk(self);
            });
            this.cost();
            this.battlePlayer.battle.processLog(stringUtil.getString(1050, this.itemConfig.name), cc.color(255, 128, 0));
            this.battlePlayer.battle.processLog(stringUtil.getString(1053, harm), cc.color(255, 128, 0));

            if (this.deadMonsterNum > 0) {
                var logStr = stringUtil.getString(stringUtil.getString(1056, this.deadMonsterNum, ""));
                if (cc.sys.localStorage.getItem("language") === cc.sys.LANGUAGE_ENGLISH && this.deadMonsterNum == 1) {
                    logStr = logStr.replace("zombies", "zombie");
                }
                this.battlePlayer.battle.processLog(logStr);
                this.deadMonsterNum = 0;
                this.battlePlayer.battle.checkGameEnd();
            }
            return true;
        },
        afterCd: function () {
            this._action();
        }
    });

    var BattleTrap = BattleEquipment.extend({
        _action: function () {
            if (!this.isEnough()) {
                console.log(this.id + " not enough");
                return false;
            }
            audioManager.playEffect(audioManager.sound.TRAP);
            this.battlePlayer.battle.recordToolUse();
            this.battlePlayer.battle.isMonsterStop = true;
            this.cost();
            this.battlePlayer.battle.processLog(stringUtil.getString(1050, this.itemConfig.name));
            this.battlePlayer.battle.processLog(stringUtil.getString(1055));
            return true;
        },
        afterCd: function () {
            this._action();
            this.battlePlayer.battle.isMonsterStop = false;
        }
    });

    var BattleWeapon = BattleEquipment.extend({
        playEffect: function (soundName) {
            if (this.effectId) {
                audioManager.stopEffect(this.effectId);
            }
            this.effectId = audioManager.playEffect(soundName);
        },
        _action: function () {
            var monster = this.getTarget();
            if (monster && this.isInRange(monster) && !monster.isDie()) {
                this.battlePlayer.battle.recordWeaponUse(2);
                monster.underAtk(this);

                var soundKey = weaponSoundConfig.melee[this.id] || "ATTACK_6";
                this.playEffect(audioManager.sound[soundKey]);
                return true;
            }
            return false;
        },
        beforeCd: function () {
            return this._action();
        },
        getTarget: function () {
            return this.battlePlayer.battle.targetMon;
        },
        getMonsterDodgeRate: function () {
            var runtimeConfig = this.battlePlayer && this.battlePlayer.runtimeConfig;
            return CombatResolver.normalizeRate(runtimeConfig && runtimeConfig.monsterDodgeRate, 0);
        },
        getMeleeHitChance: function () {
            var precise = Number(this.attr.precise);
            if (isNaN(precise)) {
                precise = 1;
            }
            precise = applyTalentPreciseBonus(precise);
            precise = applyStatusPreciseAdjustments(precise);
            return CombatResolver.normalizeRate(precise, 1);
        },
        resolveMeleeHitResult: function () {
            return CombatResolver.resolveTwoPhaseHit(this.getMeleeHitChance(), this.getMonsterDodgeRate());
        },
        getAttackResult: function (monster) {
            return {
                harm: this.getHarm(monster),
                isHeadshot: false
            };
        },
        getHarm: function (monster) {
            if (monster && !this.resolveMeleeHitResult().success) {
                return 0;
            }
            return callTalentRuntime("getMeleeDamageEffect", this.attr.atk, this.attr.atk);
        },
        isInRange: function (monster) {
            return !!(monster.line && this.attr.range >= monster.line.index);
        }
    });

    var BattleGun = BattleWeapon.extend({
        ctor: function (id, battlePlayer) {
            this._super(id, battlePlayer);
            this.bulletConfig = utils.clone(itemConfig[BattleConst.BULLET_ID].effect_weapon);
        },
        _action: function () {
            var monster = this.getTarget();
            var attackTriggered = false;
            var hasRecordedUse = false;
            if (monster && this.isInRange(monster)) {
                this.atkTimes = 0;
                var shotCount = getShotCountFromWeaponAttr(this.attr);
                for (var i = 0; i < shotCount; i++) {
                    if (this.isEnough() && !monster.isDie()) {
                        if (!hasRecordedUse) {
                            this.battlePlayer.battle.recordWeaponUse(1);
                            var soundKey = weaponSoundConfig.gun[this.id] || "ATTACK_4";
                            this.playEffect(audioManager.sound[soundKey]);
                            hasRecordedUse = true;
                            attackTriggered = true;
                        }
                        this.atkTimes++;
                        this.cost();
                        monster.underAtk(this);
                    } else {
                        break;
                    }
                }
            }
            return attackTriggered || this.atkTimes > 0;
        },
        getHarm: function (monster) {
            return this.getAttackResult(monster).harm;
        },
        getAttackResult: function (monster) {
            var dtLineIndex = CONFIG.LINE_LENGTH - 1 - monster.line.index;
            var precise = this.attr.precise + this.attr.dtPrecise * dtLineIndex;
            var deathHit = this.attr.deathHit + this.attr.dtDeathHit * dtLineIndex;
            precise = applyTalentPreciseBonus(precise);
            deathHit = callTalentRuntime("getHeadshotEffect", deathHit, deathHit);
            if (callTalentRuntime("isElitePistolItem", false, this.id)) {
                precise += callTalentRuntime("getElitePistolPreciseBonus", 0);
                deathHit += callTalentRuntime("getElitePistolHeadshotBonus", 0);
            }
            precise = applyStatusPreciseAdjustments(precise, {logPenalty: true});

            precise = cc.clampf(precise, 0, 1);
            deathHit = cc.clampf(deathHit, 0, 1);

            var rand = Math.random();
            if (rand <= deathHit) {
                return {
                    harm: this.getBulletHarm() * 2,
                    isHeadshot: true
                };
            }

            rand = Math.random();
            cc.e("precise: " + precise);
            if (rand <= precise) {
                return {
                    harm: this.getBulletHarm(),
                    isHeadshot: false
                };
            }

            return {
                harm: 0,
                isHeadshot: false
            };
        },
        cost: function () {
            this.battlePlayer.bulletNum--;
            this.battlePlayer.battle.recordBulletConsumed();

            if (this.battlePlayer.bulletNum === 0) {
                this.battlePlayer.battle.processLog(stringUtil.getString(1164));
            }
        },
        isEnough: function () {
            return this.battlePlayer.bulletNum > 0;
        },
        getBulletHarm: function () {
            return callTalentRuntime("getGunDamageEffect", this.bulletConfig.atk, this.bulletConfig.atk);
        }
    });

    var BattleElectricGun = BattleGun.extend({
        _action: function () {
            var monster = this.getTarget();
            var attackTriggered = false;
            var hasRecordedUse = false;
            if (monster && this.isInRange(monster)) {
                this.atkTimes = 0;
                var shotCount = getShotCountFromWeaponAttr(this.attr);
                for (var i = 0; i < shotCount; i++) {
                    if (this.isEnough() && !monster.isDie()) {
                        if (!hasRecordedUse) {
                            this.battlePlayer.battle.recordWeaponUse(1);

                            var soundName = null;
                            var weaponEntry = itemConfig[this.id] && itemConfig[this.id].effect_weapon;
                            if (weaponEntry && weaponEntry.attackSound) {
                                soundName = audioManager.sound[weaponEntry.attackSound];
                            }
                            this.playEffect(soundName);
                            hasRecordedUse = true;
                            attackTriggered = true;
                        }
                        this.atkTimes++;
                        monster.underAtk(this);
                        this.cost();
                    } else {
                        break;
                    }
                }
            }
            return attackTriggered || this.atkTimes > 0;
        },
        cost: function () {
        },
        isEnough: function () {
            return getBattleEquipmentRuntimePlayer().map.getSite(WORK_SITE).isActive;
        },
        getBulletHarm: function () {
            return this.attr.atk;
        }
    });

    var createEquipment = function (id, battlePlayer) {
        cc.log("weapon id=" + id);
        if (!id) {
            return null;
        }

        var context = "BattleEquipmentSystem.createEquipment";
        var normalizedId = Number(id);
        var kind = classifyEquipmentKind(normalizedId);
        switch (kind) {
            case EQUIPMENT_KIND.BOMB:
                return ErrorHandler.safeExecute(function () {
                    return new BattleBomb(normalizedId, battlePlayer);
                }, context, null);
            case EQUIPMENT_KIND.TRAP:
                return ErrorHandler.safeExecute(function () {
                    return new BattleTrap(normalizedId, battlePlayer);
                }, context, null);
            case EQUIPMENT_KIND.MELEE:
                return ErrorHandler.safeExecute(function () {
                    return new BattleWeapon(normalizedId, battlePlayer);
                }, context, null);
            case EQUIPMENT_KIND.ELECTRIC_GUN:
                return ErrorHandler.safeExecute(function () {
                    return new BattleElectricGun(normalizedId, battlePlayer);
                }, context, null);
            case EQUIPMENT_KIND.GUN:
                return ErrorHandler.safeExecute(function () {
                    return new BattleGun(normalizedId, battlePlayer);
                }, context, null);
            default:
                cc.error("Unknown battle equipment id: " + id);
                return null;
        }
    };

    return {
        createEquipment: createEquipment,
        Equipment: BattleEquipment,
        Bomb: BattleBomb,
        Trap: BattleTrap,
        Weapon: BattleWeapon,
        Gun: BattleGun,
        ElectricGun: BattleElectricGun
    };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = BattleEquipmentSystem;
}
