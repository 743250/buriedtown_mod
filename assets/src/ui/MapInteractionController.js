/**
 * Owns map entity interaction flow so MapView stays focused on rendering,
 * scrolling and movement visuals.
 */
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
        return TravelService.buildPlan({
            startPos: this.mapView.actor.getPosition(),
            endPos: entity.baseSite.pos,
            currentSiteId: player.getCurrentMapEntityId(),
            currentEntityKey: player.getCurrentMapEntityKey ? player.getCurrentMapEntityKey() : null,
            destinationSite: entity.baseSite,
            destinationEntity: entity.baseSite,
            map: player.map,
            roleType: player.roleType,
            ziplineNetwork: player.ziplineNetwork,
            storage: player.storage,
            weather: player.weather
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

        cc.timer.accelerate(travelPlan.gameTimeCost, travelPlan.accelerateRealTime);
        if (travelPlan.hasZipline) {
            player.log.addMsg(1350);
        }
        player.log.addMsg(1112, entity.baseSite.getName());

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

        player.arriveAtMapEntity(entity.baseSite);

        var mapNode = this.mapView.getParent().getParent();
        var route = MapDestinationRouter.resolve(entity.baseSite);
        MapDestinationRouter.logArrival(route, player.log);
        mapNode.forward(route.nodeName, route.userData);

        Record.saveAll();
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
