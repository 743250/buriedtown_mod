var MapNode = BottomFrameNode.extend({
    ctor: function (userData) {
        this._super(userData);
    },
    _init: function () {
        this.setName(Navigation.nodeName.MAP_NODE);
        this.uiConfig = {
            title: "",
            leftBtn: false,
            rightBtn: false
        };

        var mapView = new MapView(cc.size(this.bgRect.width - 12, this.bgRect.height - 12));
        mapView.setPosition((this.bgRect.width - mapView.getViewSize().width) / 2 + 1, 6);
        this.bg.addChild(mapView, 2);
        mapView.attachZiplineUi(this.bg);

    },
    initRes: function () {

    },
    releaseRes: function () {
    }
});

var MapView = cc.ScrollView.extend({
    ctor: function (size) {
        var container = new cc.Layer();
        this._super(size, container);

        this.bg = autoSpriteFrameController.getSpriteFromSpriteName("#map_bg.png");
        this.bg.setAnchorPoint(0, 0);
        this.bg.setName("name");
        container.addChild(this.bg);
        this.updateWeather(player.weather.weatherId);

        this.setContentSize(this.bg.getContentSize());

        this.setDirection(cc.SCROLLVIEW_DIRECTION_BOTH);
        this.setBounceable(false);

        this.setDelegate(this);

        this.actor = new MapActor(this);
        this.actor.setPosition(player.map.pos);
        container.addChild(this.actor, 1);
        this.interactionController = new MapInteractionController(this);
        this.ziplineOverlay = null;
        this.ziplineBuildController = null;

        if (this.supportsZiplineFramework()) {
            this.ziplineOverlay = new MapZiplineOverlay(this);
            this.addChild(this.ziplineOverlay, 0);
        }

        //this.locate(false);

        var self = this;

        this.entityList = [];

        player.map.forEach(function (baseSite) {
            self.createEntity(baseSite);
        });

        this.refreshZiplineOverlay();

        return true;
    },

    onEnter: function () {
        this._super();
        var self = this;
        utils.emitter.on("unlock_site", function (site) {
            self.createEntity(site);
        });
        this.func = this.createFuncOnWeatherChange();
        utils.emitter.on("weather_change", this.func);

        adHelper.updateAd();
        adHelper.addAdListener(this, function (adStatus) {
            self.entityList.forEach(function (e) {
                e.updateStatus();
            });
        });

        this.funcOnWorkSiteChange = this.createFuncOnWorkSiteChange();
        utils.emitter.on("onWorkSiteChange", this.funcOnWorkSiteChange);
    },
    onExit: function () {
        this._super();
        utils.emitter.off("unlock_site");
        utils.emitter.off("weather_change", this.func);

        adHelper.removeAdListener();

        utils.emitter.off("onWorkSiteChange", this.funcOnWorkSiteChange);
    },
    _updateAllStatus: function () {
        cc.log('onWorkSiteChange');
        this.entityList.forEach(function (e) {
            e.updateStatus();
        });
    },
    createFuncOnWorkSiteChange: function () {
        var self = this;
        return function (isWorkSiteActive) {
            self._updateAllStatus();
        };
    },
    createFuncOnWeatherChange: function () {
        var self = this;
        return function (weatherId) {
            self.updateWeather(weatherId);
        };
    },
    updateWeather: function (weatherId) {
        var weatherBg = this.bg.getChildByName("weather");
        if (weatherBg) {
            weatherBg.removeFromParent();
        }
        if (weatherId != Weather.CLOUDY) {
            weatherBg = autoSpriteFrameController.getSpriteFromSpriteName("#weather_" + weatherId + ".png");
            weatherBg.setAnchorPoint(0, 0);
            weatherBg.setName("weather");
            this.bg.addChild(weatherBg);
        }
    },
    locate: function (withAnim, cb) {
        var targetPos = this.actor.getPosition();
        targetPos = cc.pMult(targetPos, this.getZoomScale());
        var winCenterPos = cc.pSub(cc.p(cc.winSize.width / 2, cc.winSize.height / 2), this.getContentOffset());
        var vector = cc.pSub(targetPos, winCenterPos);
        var offset = this.getContentOffset();
        offset = cc.pSub(offset, vector);
        offset = this.clampOffset(offset);
        if (withAnim) {
            var animVelocity = 2000;
            var animTime = cc.pLength(vector) / animVelocity;
            this.setContentOffsetInDuration(offset, animTime);
            if (cb) {
                this.scheduleOnce(cb, animTime);
            }
        } else {
            this.setContentOffset(offset);
        }

    },

    follow: function (dtPos) {


        var offset = this.getContentOffset();
        offset = cc.pSub(offset, dtPos);
        offset = this.clampOffset(offset);

        var targetPos = this.actor.getPosition();
        targetPos = cc.pMult(targetPos, this.getZoomScale());
        var winCenterPos = cc.pSub(cc.p(cc.winSize.width / 2, cc.winSize.height / 2), this.getContentOffset());
        if (cc.pDistanceSQ(targetPos, winCenterPos) <= 5) {
            this.setContentOffset(offset);
        }


    },

    scrollViewDidScroll: function (view) {
        //cc.e("onscroll " + JSON.stringify(view.getContentOffset()));
    },
    scrollViewDidZoom: function (view) {
        //cc.e("onzoom " + JSON.stringify(view.getContentOffset()));
        var offset = view.getContentOffset();

        offset = this.clampOffset(offset);
        view.setContentOffset(offset);
    },
    clampOffset: function (offset) {
        var scale = this.getZoomScale();
        var newOffset = cc.pClamp(offset, cc.p(cc.winSize.width - this.getContentSize().width * scale, cc.winSize.height - this.getContentSize().height * scale), cc.p(0, 0));
        return newOffset;
    },
    isRenderableEntity: function (baseSite) {
        return !!(baseSite
            && baseSite.pos
            && isFinite(baseSite.pos.x)
            && isFinite(baseSite.pos.y));
    },
    createEntity: function (baseSite) {
        if (!this.isRenderableEntity(baseSite)) {
            cc.warn("[MapView] Skip invalid entity on world map: " + (baseSite && baseSite.id));
            return;
        }
        var n = new MapEntity(baseSite);
        this.addChild(n);
        this.entityList.push(n);
        n.setClickListener(this.interactionController, this.interactionController.handleEntityClick);
        if (this.ziplineBuildController) {
            n.setZiplineRemoveListener(this.ziplineBuildController, this.ziplineBuildController.handleRemoveButtonClick);
        }
        this.refreshZiplineOverlay();
    },
    supportsZiplineFramework: function () {
        return RoleRuntimeService.isZiplineFrameworkAvailable(player);
    },
    attachZiplineUi: function (hostNode) {
        if (!this.supportsZiplineFramework() || !hostNode || this.ziplineBuildController) {
            return;
        }

        this.ziplineBuildController = new MapZiplineBuildController(this, hostNode);
        for (var i = 0; i < this.entityList.length; i++) {
            this.entityList[i].setZiplineRemoveListener(this.ziplineBuildController, this.ziplineBuildController.handleRemoveButtonClick);
        }
        this.refreshZiplineOverlay();
    },
    refreshZiplineOverlay: function () {
        if (!this.ziplineOverlay) {
            return;
        }

        var buildState = this.ziplineBuildController
            ? this.ziplineBuildController.getOverlayState()
            : null;
        this.ziplineOverlay.refresh(player.ziplineNetwork, player.map, buildState);

        for (var i = 0; i < this.entityList.length; i++) {
            var entity = this.entityList[i];
            entity.updateZiplineRemoveAction(this.ziplineBuildController
                ? this.ziplineBuildController.getRemoveActionState(entity.baseSite)
                : null);
        }
    },
    findEntityBySiteId: function (siteId) {
        for (var i = 0; i < this.entityList.length; i++) {
            if (this.entityList[i].baseSite && this.entityList[i].baseSite.id === siteId) {
                return this.entityList[i];
            }
        }
        return null;
    },
    makeLine: function (startP, endP) {
        this.pathLine = new cc.Node();
        this.pathLine.setPosition(startP);
        var v = cc.pSub(endP, startP);
        var length = cc.pLength(v);
        var lineSpriteFrame = autoSpriteFrameController.getSpriteFrameFromSpriteName("map_line.png");
        var w = lineSpriteFrame.getRect().width;
        var num = Math.ceil(length / w);
        for (var i = 0; i < num; i++) {
            var l = autoSpriteFrameController.getSpriteFromSpriteName("#map_line.png");
            l.setAnchorPoint(0, 0.5);
            l.setPosition(i * w, 0);
            this.pathLine.addChild(l);
        }

        var radian = cc.pAngle(v, cc.p(1, 0));
        var angle = radian / Math.PI * 180;
        if (v.y >= 0) {
            angle = 360 - angle;
        }
        this.pathLine.setRotation(angle);
        this.addChild(this.pathLine);
    }

});
