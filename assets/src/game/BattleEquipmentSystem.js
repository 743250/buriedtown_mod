if (typeof cc === "undefined" || !cc) {
    var cc = require("../test/testBattle");
    var utils = require("../util/utils");
    var itemConfig = require("../data/itemConfig");
    var CombatResolver = require("./CombatResolver");
}

var BattleEquipmentSystem = (function () {
    var CONFIG = {
        LINE_LENGTH: 6,
        BULLET_ID: 1305011
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

    var applyTalentPreciseBonus = function (precise) {
        if (IAPPackage.getPreciseEffect) {
            return IAPPackage.getPreciseEffect(precise);
        }
        return precise;
    };

    var applyStatusPreciseAdjustments = function (precise, options) {
        options = options || {};
        var adjustedPrecise = precise;

        if (player && player.weather && typeof player.weather.getValue === "function") {
            adjustedPrecise += player.weather.getValue("gun_precise");
        }

        var spiritPenalty = RoleRuntimeService.getSpiritPrecisePenalty(player);
        if (spiritPenalty > 0) {
            adjustedPrecise -= spiritPenalty;
            if (options.logPenalty) {
                cc.log("spirit " + memoryUtil.decode(player.spirit));
                cc.log("decPreciseBySpirit " + spiritPenalty);
            }
        }

        var vigourPenalty = RoleRuntimeService.getVigourPrecisePenalty
            ? RoleRuntimeService.getVigourPrecisePenalty(player)
            : 0;
        if (vigourPenalty > 0) {
            adjustedPrecise -= vigourPenalty;
            if (options.logPenalty) {
                cc.log("vigour " + memoryUtil.decode(player.vigour));
                cc.log("decPreciseByVigour " + vigourPenalty);
            }
        }

        return adjustedPrecise;
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
        if (id === 1303022) {
            return EQUIPMENT_KIND.TRAP;
        }
        if (id === 1303012 || id === 1303033 || id === 1303044) {
            return EQUIPMENT_KIND.BOMB;
        }
        if (id === 1301071 || id === 1301082) {
            return EQUIPMENT_KIND.ELECTRIC_GUN;
        }

        var itemInfo = itemConfig[id];
        if (!itemInfo || !itemInfo.effect_weapon) {
            return null;
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
            if (IAPPackage.applyElitePistolWeaponEffect) {
                this.attr = SafetyHelper.safeCallWithFallback(IAPPackage.applyElitePistolWeaponEffect, this.attr, this.id, this.attr);
                this.itemConfig.effect_weapon = this.attr;
            }
            if (IAPPackage.getElitePistolDisplayInfo) {
                var elitePistolDisplay = SafetyHelper.safeCallWithFallback(IAPPackage.getElitePistolDisplayInfo, null, this.id, {title: this.itemConfig.name, des: ""});
                if (elitePistolDisplay && elitePistolDisplay.title) {
                    this.itemConfig.name = elitePistolDisplay.title;
                }
            }

            this.isInAtkCD = false;
        },
        action: function () {
            if (this.isInAtkCD) {
                return false;
            }
            if (this.usesSharedAttackCooldown()
                && this.battlePlayer
                && typeof this.battlePlayer.isInSharedAttackCooldown === "function"
                && this.battlePlayer.isInSharedAttackCooldown()) {
                return false;
            }
            cc.d(this.itemConfig.name + " action");
            if (this.beforeCd() === false) {
                return false;
            }
            this.isInAtkCD = true;
            var atkCD = Number(this.attr && this.attr.atkCD);
            if (!(atkCD > 0)) {
                atkCD = 0.1;
            }
            var cooldown = atkCD * player.vigourEffect();
            if (this.usesSharedAttackCooldown()
                && this.battlePlayer
                && typeof this.battlePlayer.enterSharedAttackCooldown === "function") {
                this.battlePlayer.enterSharedAttackCooldown(cooldown);
            }
            var self = this;
            var finishCooldown = function () {
                self.isInAtkCD = false;
                cc.director.getScheduler().unscheduleCallbackForTarget(self, finishCooldown);
                if (!self.battlePlayer.battle.isBattleEnd) {
                    self.afterCd();
                }
            };
            cc.director.getScheduler().scheduleCallbackForTarget(this, finishCooldown, cooldown, 1);
            return true;
        },
        _action: function () {
        },
        usesSharedAttackCooldown: function () {
            return false;
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
        usesSharedAttackCooldown: function () {
            return true;
        },
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
        getHarm: function (monster) {
            if (monster && !this.resolveMeleeHitResult().success) {
                return 0;
            }
            return SafetyHelper.safeCallWithFallback(IAPPackage.getMeleeDamageEffect, this.attr.atk, this.attr.atk);
        },
        isInRange: function (monster) {
            return !!(monster.line && this.attr.range >= monster.line.index);
        }
    });

    var BattleGun = BattleWeapon.extend({
        ctor: function (id, battlePlayer) {
            this._super(id, battlePlayer);
            this.bulletConfig = utils.clone(itemConfig[CONFIG.BULLET_ID].effect_weapon);
        },
        _action: function () {
            var monster = this.getTarget();
            var attackTriggered = false;
            if (monster && this.isInRange(monster)) {
                if (this.isEnough()) {
                    this.battlePlayer.battle.recordWeaponUse(1);
                    var soundKey = weaponSoundConfig.gun[this.id] || "ATTACK_4";
                    this.playEffect(audioManager.sound[soundKey]);
                    attackTriggered = true;
                }
                this.atkTimes = 0;
                for (var i = 0; i < this.attr.bulletMax; i++) {
                    if (this.isEnough() && !monster.isDie()) {
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
            var dtLineIndex = CONFIG.LINE_LENGTH - 1 - monster.line.index;
            var precise = this.attr.precise + this.attr.dtPrecise * dtLineIndex;
            var deathHit = this.attr.deathHit + this.attr.dtDeathHit * dtLineIndex;

            precise = applyTalentPreciseBonus(precise);
            deathHit = IAPPackage.getHeadshotEffect(deathHit);
            if (IAPPackage.isElitePistolItem && IAPPackage.isElitePistolItem(this.id)) {
                precise += IAPPackage.getElitePistolPreciseBonus ? IAPPackage.getElitePistolPreciseBonus() : 0;
                deathHit += IAPPackage.getElitePistolHeadshotBonus ? IAPPackage.getElitePistolHeadshotBonus() : 0;
            }
            precise = applyStatusPreciseAdjustments(precise, {logPenalty: true});

            precise = cc.clampf(precise, 0, 1);
            deathHit = cc.clampf(deathHit, 0, 1);

            var rand = Math.random();
            if (rand <= deathHit) {
                return Number.MAX_VALUE;
            }

            rand = Math.random();
            cc.e("precise: " + precise);
            if (rand <= precise) {
                return this.getBulletHarm();
            }

            return 0;
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
            return IAPPackage.getGunDamageEffect(this.bulletConfig.atk);
        }
    });

    var BattleElectricGun = BattleGun.extend({
        _action: function () {
            var monster = this.getTarget();
            var attackTriggered = false;
            if (monster && this.isInRange(monster)) {
                if (this.isEnough()) {
                    this.battlePlayer.battle.recordWeaponUse(1);

                    var soundName;
                    if (this.id == 1301071) {
                        soundName = audioManager.sound.ATTACK_7;
                    } else if (this.id == 1301082) {
                        soundName = audioManager.sound.ATTACK_8;
                    }
                    this.playEffect(soundName);
                    attackTriggered = true;
                }
                this.atkTimes = 0;
                for (var i = 0; i < this.attr.bulletMax; i++) {
                    if (this.isEnough() && !monster.isDie()) {
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
            return player.map.getSite(WORK_SITE).isActive;
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
