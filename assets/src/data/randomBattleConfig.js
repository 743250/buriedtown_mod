/**
 * Created by lancelot on 15/5/8.
 */
var RandomBattleConfig = {
    distance: 100,
    day: {probability: 0.1, difficulty: [1, 3]},
    night: {probability: 0.3, difficulty: [2, 4]},
    progression: {
        startDay: 10,
        endDay: 71,
        day: {
            startDifficulty: [1, 4],
            endDifficulty: [1, 7]
        },
        night: {
            startDifficulty: [2, 5],
            endDifficulty: [7, 12]
        }
    },
    flashlightItemId: 1305053,
    flashlightNightProbabilityReduction: 0.15
};
