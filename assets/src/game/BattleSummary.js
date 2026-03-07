if (typeof cc === "undefined" || !cc) {
    var cc = require("../test/testBattle");
}

var BattleSummary = cc.Class.extend({
    ctor: function (battleId, isDodge) {
        this.data = {
            id: battleId,
            underAtk: 0,
            totalHarm: 0,
            weapon1: 0,
            weapon2: 0,
            bulletNum: 0,
            tools: 0,
            win: false,
            isDodge: isDodge,
            monsterKilledNum: 0
        };
    },

    getData: function () {
        return this.data;
    },

    setWin: function (isWin) {
        this.data.win = isWin;
    },

    recordWeaponUse: function (slotType) {
        if (slotType === 1) {
            this.data.weapon1++;
            return;
        }
        this.data.weapon2++;
    },

    recordToolUse: function () {
        this.data.tools++;
    },

    recordBulletConsumed: function () {
        this.data.bulletNum++;
    },

    recordMonsterKill: function () {
        this.data.monsterKilledNum++;
    },

    recordPlayerUnderAttack: function (harm) {
        this.data.totalHarm += harm;
        this.data.underAtk++;
    },

    setToolItemId: function (itemId) {
        this.data.toolItemId = itemId;
    },

    setBrokenWeapons: function (itemIds) {
        this.data.brokenWeapon = itemIds;
    },

    setTalentHealHp: function (healHp) {
        this.data.talentHealHp = healHp;
    }
});

if (typeof module !== "undefined" && module.exports) {
    module.exports = BattleSummary;
}
