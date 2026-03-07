/**
 * Encapsulates world-map movement and encounter stepping for the player marker.
 */
var MapActor = cc.Node.extend({
    ctor: function (mapView) {
        this._super();

        this.mapView = mapView;

        var sprite = autoSpriteFrameController.getSpriteFromSpriteName("#map_actor.png");
        this.setContentSize(sprite.getContentSize());
        this.setAnchorPoint(0.5, 0.5);
        sprite.setPosition(this.getContentSize().width / 2, this.getContentSize().height / 2);
        this.addChild(sprite);

        this.MAX_VELOCITY = TravelService.getBaseVelocity();
        this.isMoving = false;
        this.paused = false;
        this.tripState = null;

        this.scheduleUpdate();
    },
    update: function (dt) {
        if (cc.timer.isPaused()) {
            return;
        }
        this.updateActor(dt * cc.timer.timeScale);
    },
    onExit: function () {
        this._super();
        this.unscheduleUpdate();
    },
    getMaxVelocity: function () {
        return TravelService.getEffectiveVelocity(player.storage, player.weather);
    },
    updateActor: function (dt) {
        if (!this.isMoving || this.paused || !this.tripState) {
            return;
        }

        var tripResult = TravelRuntime.stepTrip({
            currentPos: this.getPosition(),
            tripState: this.tripState,
            dt: dt
        });
        this.velocity = tripResult.velocity;
        this.setPosition(tripResult.position);
        player.map.updatePos(tripResult.position);

        if (tripResult.arrived) {
            this.tripState = null;
            this.isMoving = false;
            this.afterMove();
        } else if (tripResult.encounterTriggered) {
            var self = this;
            this.paused = player.randomAttack(function () {
                self.paused = false;
            });
        }
    },
    move: function (pos, cb, travelVelocity) {
        if (this.isMoving) {
            return;
        }
        this.tripState = TravelRuntime.createTripState({
            startPos: this.getPosition(),
            targetPos: pos,
            travelVelocity: travelVelocity || this.getMaxVelocity()
        });
        this.cb = cb;
        this.beforeMove();
    },
    beforeMove: function () {
        this.isMoving = true;
    },
    afterMove: function () {
        this.isMoving = false;
        this.tripState = null;
        if (this.cb) {
            this.cb();
        }
    }
});
