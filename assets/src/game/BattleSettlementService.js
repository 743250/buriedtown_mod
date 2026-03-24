var getBattleSettlementRuntimePlayer = function () {
    if (typeof GameRuntime !== "undefined"
        && GameRuntime
        && typeof GameRuntime.getPlayer === "function") {
        return GameRuntime.getPlayer();
    }
    return typeof player !== "undefined" ? player : null;
};

var BattleSettlementService = {
    settle: function (context) {
        var summary = context.summary;
        var sumRes = summary.getData();
        summary.setWin(context.isWin);

        if (!context.testBattleConfig) {
            this._syncConsumables(context);
        }

        if (context.isWin) {
            this._applyWinSettlement(context);
        }

        return sumRes;
    },

    _syncConsumables: function (context) {
        var battlePlayer = context.battlePlayer;
        var summary = context.summary;
        var runtimePlayer = getBattleSettlementRuntimePlayer();

        runtimePlayer.bag.setItem(context.bulletItemId, battlePlayer.bulletNum);
        if (!battlePlayer.equip) {
            return;
        }

        var toolItemId = runtimePlayer.equip.getEquip(EquipmentPos.TOOL);
        summary.setToolItemId(toolItemId);
        runtimePlayer.bag.setItem(toolItemId, battlePlayer.toolNum);
        if (battlePlayer.toolNum === 0) {
            runtimePlayer.equip.unequip(EquipmentPos.TOOL);
        }
    },

    _applyWinSettlement: function (context) {
        var runtimePlayer = getBattleSettlementRuntimePlayer();
        if (!context.isDodge) {
            runtimePlayer.log.addMsg(1118);
        }

        context.summary.setBrokenWeapons(this._collectBrokenWeapons(context.summary.getData()));

        if (!context.isDodge) {
            this._applyWinRecovery(context.summary);
        }
    },

    _collectBrokenWeapons: function (sumRes) {
        var runtimePlayer = getBattleSettlementRuntimePlayer();
        var brokenWeapon = [];
        var gunItemId = runtimePlayer.equip.getEquip(EquipmentPos.GUN);
        var gunBrokenResult = gunItemId && sumRes.weapon1 > 0 ? runtimePlayer.bag.testWeaponBroken(gunItemId) : false;
        if (gunBrokenResult) {
            brokenWeapon.push(gunBrokenResult.brokenResultItemId || gunBrokenResult.itemId || gunItemId);
        }

        var weaponItemId = runtimePlayer.equip.getEquip(EquipmentPos.WEAPON);
        var weaponBrokenResult = weaponItemId && weaponItemId != Equipment.HAND && sumRes.weapon2 > 0
            ? runtimePlayer.bag.testWeaponBroken(weaponItemId)
            : false;
        if (weaponBrokenResult) {
            brokenWeapon.push(weaponBrokenResult.brokenResultItemId || weaponBrokenResult.itemId || weaponItemId);
        }

        return brokenWeapon;
    },

    _applyWinRecovery: function (summary) {
        var recoverHp = TalentService.getBattleWinRecoverHp();
        var runtimePlayer = getBattleSettlementRuntimePlayer();
        if (recoverHp <= 0) {
            return;
        }

        var hpBeforeRecover = memoryUtil.decode(runtimePlayer.hp);
        runtimePlayer.changeHp(recoverHp);
        summary.setTalentHealHp(memoryUtil.decode(runtimePlayer.hp) - hpBeforeRecover);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = BattleSettlementService;
}
