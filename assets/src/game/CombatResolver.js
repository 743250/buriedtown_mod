var CombatResolver = (function () {
    var Outcome = {
        HIT: "hit",
        MISS: "miss",
        DODGED: "dodged"
    };

    var clampRate = function (value) {
        if (value < 0) {
            return 0;
        }
        if (value > 1) {
            return 1;
        }
        return value;
    };

    var normalizeRate = function (rate, fallback) {
        var normalizedRate = Number(rate);
        if (isNaN(normalizedRate)) {
            normalizedRate = typeof fallback === "number" ? fallback : 0;
        }
        return clampRate(normalizedRate);
    };

    var isHitByRate = function (hitRate) {
        return Math.random() <= normalizeRate(hitRate, 1);
    };

    var isDodgedByRate = function (dodgeRate) {
        return Math.random() < normalizeRate(dodgeRate, 0);
    };

    var resolveTwoPhaseHit = function (hitRate, dodgeRate) {
        if (!isHitByRate(hitRate)) {
            return {
                success: false,
                outcome: Outcome.MISS
            };
        }

        if (isDodgedByRate(dodgeRate)) {
            return {
                success: false,
                outcome: Outcome.DODGED
            };
        }

        return {
            success: true,
            outcome: Outcome.HIT
        };
    };

    var getDamageAfterDefense = function (attack, defense, minDamage) {
        var atk = Number(attack) || 0;
        var def = Number(defense) || 0;
        var min = Number(minDamage);
        if (isNaN(min)) {
            min = 0;
        }
        return Math.max(min, atk - def);
    };

    return {
        Outcome: Outcome,
        normalizeRate: normalizeRate,
        resolveTwoPhaseHit: resolveTwoPhaseHit,
        getDamageAfterDefense: getDamageAfterDefense
    };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = CombatResolver;
}
