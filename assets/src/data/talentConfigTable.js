/**
 * 天赋配置表 - 统一管理所有天赋的配置信息
 * 替代IAPPackage.js中分散的天赋逻辑
 */

var TalentConfigTable = {
    // 武器大师
    101: {
        talentId: 101,
        purchaseId: 101,
        displayOrder: 1,
        stringId: 'p_101',
        maxLevel: 3,
        effectType: 'weapon_broken_reduce',
        weaponBrokenMultiplierValues: [1, 0.8, 0.6, 0.4],
        durableCraftChanceBonusValues: [0, 0.1, 0.2, 0.3],
        tierEffectTextList: [
            "你开始重拾维护技巧，武器损耗减少20%，制造耐久武器概率+10%",
            "每件武器都像老朋友，你知道如何让它们更持久，损耗减少40%，制造耐久武器概率+20%",
            "武器维护已成本能，即使在恶劣环境中也能保持装备完好，损耗减少60%，制造耐久武器概率+30%"
        ]
    },

    // 石肤者
    102: {
        talentId: 102,
        purchaseId: 102,
        displayOrder: 2,
        stringId: 'p_102',
        maxLevel: 3,
        effectType: 'defense_bonus',
        defenseBonusValues: [0, 2, 3, 4],
        zeroDamageUnlockLevel: 2,
        infectIncreaseMultiplierValues: [1, 1, 1, 0.8],
        tierEffectTextList: [
            "你的身体开始适应伤害，战斗防御+2",
            "皮肤如石，轻微攻击已无法伤你，防御+3，最低受击伤害可降至0",
            "钢筋铁骨，感染也难以侵蚀你的身体，防御+4，感染增长×0.8"
        ]
    },

    // 家里蹲
    103: {
        talentId: 103,
        purchaseId: 103,
        displayOrder: 3,
        stringId: 'p_103',
        maxLevel: 3,
        effectType: 'home_produce_bonus',
        homeProduceMultiplierValues: [1, 1.1, 1.2, 1.3],
        tierEffectTextList: [
            "你开始优化据点运作，全部家园产出+10%",
            "每条产线都在你的精心调校下高效运转，产出+20%",
            "你已是据点管理大师，资源产出达到极致，产出+30%"
        ]
    },

    // 万人迷
    104: {
        talentId: 104,
        purchaseId: 104,
        displayOrder: 4,
        stringId: 'p_104',
        maxLevel: 3,
        effectType: 'social_gift_chance',
        socialExtraGiftChanceValues: [0, 0, 0.5, 1],
        socialTradeQuantityMultiplierValues: [1, 1, 1.5, 2],
        tierEffectTextList: [
            "你学会了拒绝的艺术，拒绝NPC求助不扣亲密度",
            "你的魅力让人难以抗拒，拒绝不扣好感；NPC交易货物数量+50%，额外赠礼率+50%",
            "人见人爱，NPC总想给你更多帮助，拒绝不扣好感；NPC交易货物数量+100%，额外赠礼必定触发"
        ]
    },

    // 神枪手
    120: {
        talentId: 120,
        purchaseId: 120,
        displayOrder: 5,
        stringId: 'p_120',
        maxLevel: 3,
        effectType: 'precise_headshot_bonus',
        preciseMultiplierValues: [1, 1.1, 1.15, 1.25],
        headshotMultiplierValues: [1, 1.125, 1.2, 1.25],
        elitePistolUnlockLevel: 3,
        tierEffectTextList: [
            "你重新找回了瞄准手感，精准+10%，偶尔能打出致命一击",
            "即使在混乱中也能稳住准星，精准+15%，爆头能力进一步提升",
            "每次扣下扳机都像肌肉记忆，精准+25%，致命一击信手拈来，并解锁专属手枪（永不损坏，射速×0.8，精准+15%，爆头+5%）"
        ]
    },

    // 大块头
    121: {
        talentId: 121,
        purchaseId: 121,
        displayOrder: 6,
        stringId: 'p_121',
        maxLevel: 3,
        effectType: 'bag_weight_melee_bonus',
        hpBonusValues: [0, 20, 40, 60],
        bagWeightBonusValues: [0, 8, 14, 20],
        meleeDamageMultiplierValues: [1, 1.1, 1.2, 1.25],
        tierEffectTextList: [
            "初见成效：生命+20，负重+8，近战+10%",
            "肌肉隆起：生命+40，负重+14，近战+20%，每一拳都更有力",
            "钢铁之躯：生命+60，负重+20，近战+25%，你就是行走的堡垒"
        ]
    },

    // 拾荒者
    122: {
        talentId: 122,
        purchaseId: 122,
        displayOrder: 7,
        stringId: 'p_122',
        maxLevel: 3,
        effectType: 'scavenger_double',
        doubleDropChanceValues: [0, 0.10, 0.18, 0.25],
        tierEffectTextList: [
            "你开始学会在废墟中寻找价值，10%概率双倍收获",
            "废土的每个角落都逃不过你的眼睛，18%概率双倍收获",
            "你已是废土搜刮大师，总能找到别人遗漏的宝藏，25%概率双倍收获"
        ]
    },

    // 谈判专家
    123: {
        talentId: 123,
        purchaseId: 123,
        displayOrder: 8,
        stringId: 'p_123',
        maxLevel: 3,
        effectType: 'negotiation_discount',
        negotiationDiscountValues: [0, 0.06, 0.12, 0.18],
        tierEffectTextList: [
            "你开始掌握交易技巧，跨类别交易享受6%折扣",
            "讨价还价已成习惯，你总能争取到更好的价格，折扣12%",
            "交易大师，每笔生意都是你的主场，折扣18%"
        ]
    },

    // 金刚狼
    124: {
        talentId: 124,
        purchaseId: 124,
        displayOrder: 9,
        stringId: 'p_124',
        maxLevel: 3,
        effectType: 'battle_win_recover',
        battleWinRecoverHpValues: [0, 12, 24, 40],
        tierEffectTextList: [
            "你的恢复力开始显现，每次战斗后恢复12生命值",
            "伤口愈合速度惊人，战后恢复24生命值",
            "近乎不死的恢复能力，战后恢复40生命值，伤痕转眼消失"
        ]
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = TalentConfigTable;
}
