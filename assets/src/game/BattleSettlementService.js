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

        player.bag.setItem(context.bulletItemId, battlePlayer.bulletNum);
        if (!battlePlayer.equip) {
            return;
        }

        var toolItemId = player.equip.getEquip(EquipmentPos.TOOL);
        summary.setToolItemId(toolItemId);
        player.bag.setItem(toolItemId, battlePlayer.toolNum);
        if (battlePlayer.toolNum === 0) {
            player.equip.unequip(EquipmentPos.TOOL);
        }
    },

    _applyWinSettlement: function (context) {
        if (!context.isDodge) {
            player.log.addMsg(1118);
        }

        context.summary.setBrokenWeapons(this._collectBrokenWeapons(context.summary.getData()));

        if (!context.isDodge) {
            this._applyWinRecovery(context.summary);
        }
    },

    _collectBrokenWeapons: function (sumRes) {
        var brokenWeapon = [];
        var gunItemId = player.equip.getEquip(EquipmentPos.GUN);
        if (gunItemId && sumRes.weapon1 > 0 && player.bag.testWeaponBroken(gunItemId)) {
            brokenWeapon.push(gunItemId);
        }

        var weaponItemId = player.equip.getEquip(EquipmentPos.WEAPON);
        if (weaponItemId && weaponItemId != Equipment.HAND && sumRes.weapon2 > 0 && player.bag.testWeaponBroken(weaponItemId)) {
            brokenWeapon.push(weaponItemId);
        }

        return brokenWeapon;
    },

    _applyWinRecovery: function (summary) {
        var recoverHp = TalentService.getBattleWinRecoverHp();
        if (recoverHp <= 0) {
            return;
        }

        var hpBeforeRecover = memoryUtil.decode(player.hp);
        player.changeHp(recoverHp);
        summary.setTalentHealHp(memoryUtil.decode(player.hp) - hpBeforeRecover);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = BattleSettlementService;
}
