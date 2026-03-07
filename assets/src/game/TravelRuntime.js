/**
 * TravelRuntime owns per-trip movement stepping so map UI code does not need
 * to mix vector math, arrival checks and encounter step bookkeeping.
 */
var TravelRuntime = {
    CONFIG: {
        ARRIVAL_DISTANCE_SQ: 10
    },
    getEncounterStepDistance: function () {
        if (typeof RandomBattleConfig === "undefined" || !RandomBattleConfig) {
            return 0;
        }
        return RandomBattleConfig.distance || 0;
    },
    createTripState: function (options) {
        return {
            targetPos: options.targetPos,
            travelVelocity: options.travelVelocity,
            lastEncounterCheckPos: options.startPos
        };
    },
    stepTrip: function (options) {
        var tripState = options.tripState;
        var currentPos = options.currentPos;
        if (!tripState || !currentPos || !tripState.targetPos) {
            return {
                position: currentPos,
                velocity: cc.p(0, 0),
                arrived: false,
                encounterTriggered: false
            };
        }

        var vector = cc.pSub(tripState.targetPos, currentPos);
        var velocity = cc.p(0, 0);
        if (vector.x !== 0 || vector.y !== 0) {
            velocity = cc.pMult(cc.pNormalize(vector), tripState.travelVelocity || 0);
        }

        var nextPos = cc.pAdd(currentPos, cc.pMult(velocity, options.dt || 0));
        var arrived = cc.pDistanceSQ(tripState.targetPos, nextPos) <= this.CONFIG.ARRIVAL_DISTANCE_SQ;
        if (arrived) {
            nextPos = tripState.targetPos;
        }

        var encounterTriggered = false;
        var encounterStepDistance = options.encounterStepDistance;
        if (encounterStepDistance === undefined || encounterStepDistance === null) {
            encounterStepDistance = this.getEncounterStepDistance();
        }
        if (!arrived && encounterStepDistance > 0
            && cc.pDistance(tripState.lastEncounterCheckPos, nextPos) >= encounterStepDistance) {
            tripState.lastEncounterCheckPos = nextPos;
            encounterTriggered = true;
        }

        return {
            position: nextPos,
            velocity: velocity,
            arrived: arrived,
            encounterTriggered: encounterTriggered
        };
    }
};
