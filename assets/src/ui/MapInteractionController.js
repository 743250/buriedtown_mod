/**
 * Owns map entity interaction flow so MapView stays focused on rendering,
 * scrolling and movement visuals.
 */
var getMapInteractionRuntimePlayer = function () {
    return (typeof GameRuntime !== "undefined" && GameRuntime && typeof GameRuntime.getPlayer === "function")
        ? GameRuntime.getPlayer()
        : player;
};

var getMapInteractionRuntimeTimer = function () {
    return (typeof GameRuntime !== "undefined" && GameRuntime && typeof GameRuntime.getTimer === "function")
        ? GameRuntime.getTimer()
        : cc.timer;
};

var getMapInteractionRuntimeRecord = function () {
    return (typeof GameRuntime !== "undefined" && GameRuntime && typeof GameRuntime.getRecord === "function")
        ? GameRuntime.getRecord()
        : Record;
};

var MapInteractionController = cc.Class.extend({
    ctor: function (mapView) {
        this.mapView = mapView;
    },
    handleEntityClick: function (entity) {
        if (this.mapView.actor.isMoving) {
            return;
        }

        if (this.mapView.ziplineBuildController
            && this.mapView.ziplineBuildController.handleEntityClick(entity)) {
            return;
        }

        var travelPlan = this.buildTravelPlan(entity);
        this.handleSelectionGuide(entity);
        this.showTravelDialog(entity, travelPlan);
    },
    buildTravelPlan: function (entity) {
        return TravelService.buildRuntimePlan({
            startPos: this.mapView.actor.getPosition(),
            endPos: entity.baseSite.pos,
            destinationSite: entity.baseSite,
            destinationEntity: entity.baseSite
        });
    },
    handleSelectionGuide: function (entity) {
        if (userGuide.isStep(userGuide.stepName.MAP_SITE) && userGuide.isSite(entity.baseSite.id)) {
            uiUtil.removeIconWarn(entity);
            userGuide.step();
        }

        if (userGuide.isStep(userGuide.stepName.MAP_SITE_HOME) && entity.baseSite.id == HOME_SITE) {
            uiUtil.removeIconWarn(entity);
            userGuide.step();
        }
    },
    handleConfirmGuide: function (entity) {
        if (userGuide.isStep(userGuide.stepName.MAP_SITE_GO) && userGuide.isSite(entity.baseSite.id)) {
            userGuide.step();
        }

        if (userGuide.isStep(userGuide.stepName.MAP_SITE_HOME_GO) && entity.baseSite.id == HOME_SITE) {
            userGuide.step();
        }
    },
    startTravel: function (entity, travelPlan) {
        entity.setHighlight(true);
        var runtimePlayer = getMapInteractionRuntimePlayer();

        getMapInteractionRuntimeTimer().accelerate(travelPlan.gameTimeCost, travelPlan.accelerateRealTime);
        if (travelPlan.hasZipline) {
            runtimePlayer.log.addMsg(1350);
        }
        runtimePlayer.log.addMsg(1112, entity.baseSite.getName());

        this.mapView.makeLine(travelPlan.startPos, travelPlan.endPos);
        this.mapView.actor.move(travelPlan.endPos, function () {
            this.enterEntity(entity);
        }.bind(this), travelPlan.travelVelocity);
    },
    enterEntity: function (entity) {
        if (this.mapView.pathLine) {
            this.mapView.pathLine.removeFromParent();
            this.mapView.pathLine = null;
        }

        var runtimePlayer = getMapInteractionRuntimePlayer();
        runtimePlayer.arriveAtMapEntity(entity.baseSite);

        var mapNode = this.mapView.getParent().getParent();
        var route = MapDestinationRouter.resolve(entity.baseSite);
        MapDestinationRouter.logArrival(route, runtimePlayer.log);
        mapNode.forward(route.nodeName, route.userData);

        getMapInteractionRuntimeRecord().saveAll();
    },
    showTravelDialog: function (entity, travelPlan) {
        var self = this;
        var okFunc = function () {
            self.startTravel(entity, travelPlan);
            self.handleConfirmGuide(entity);
        };
        var cancelFunc = function () {
            entity.setHighlight(false);
        };

        MapTravelDialogHelper.showTravelDialog(entity, travelPlan.displayTime, okFunc, cancelFunc);
    }
});
