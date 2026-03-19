/************************************************************
 *
 * Constructors with built in init function
 *
 ************************************************************/

jsb.EventListenerAssetsManager.prototype._ctor = function(assetsManager, callback) {
    callback !== undefined && this.init(assetsManager, callback);
};

cc.ControlButton.prototype._ctor = function(label, backgroundSprite, fontSize){
    if(fontSize != undefined)
        this.initWithTitleAndFontNameAndFontSize(label, backgroundSprite, fontSize);
    else if(backgroundSprite != undefined)
        this.initWithLabelAndBackgroundSprite(label, backgroundSprite);
    else if(label != undefined)
        this.initWithBackgroundSprite(label);
    else
        this.init();
};

cc.ControlColourPicker.prototype._ctor = function(){
    this.init();
};

cc.ControlPotentiometer.prototype._ctor = function(backgroundFile, progressFile, thumbFile){
    if (thumbFile != undefined) {
        // Prepare track for potentiometer
        var backgroundSprite = cc.Sprite.create(backgroundFile);

        // Prepare thumb for potentiometer
        var thumbSprite = cc.Sprite.create(thumbFile);

        // Prepare progress for potentiometer
        var progressTimer = cc.ProgressTimer.create(cc.Sprite.create(progressFile));
        this.initWithTrackSprite_ProgressTimer_ThumbSprite(backgroundSprite, progressTimer, thumbSprite);
    }
};

cc.ControlSlider.prototype._ctor = function(bgFile, progressFile, thumbFile){
    if (thumbFile != undefined) {
        // Prepare background for slider
        bgSprite = cc.Sprite.create(bgFile);

        // Prepare progress for slider
        progressSprite = cc.Sprite.create(progressFile);

        // Prepare thumb (menuItem) for slider
        thumbSprite = cc.Sprite.create(thumbFile);

        this.initWithSprites(bgSprite, progressSprite, thumbSprite);
    }
};

cc.ControlStepper.prototype._ctor = function(minusSprite, plusSprite){
    plusSprite !== undefined && this.initWithMinusSpriteAndPlusSprite(minusSprite, plusSprite);
};

cc.ControlSwitch.prototype._ctor = function(maskSprite, onSprite, offSprite, thumbSprite, onLabel, offLabel){
    offLabel !== undefined && this.initWithMaskSprite(maskSprite, onSprite, offSprite, thumbSprite, onLabel, offLabel);
};

cc.TableView.prototype._ctor = function(dataSouurce, size, container){
    container == undefined ? this._init(dataSouurce, size) : this._init(dataSouurce, size, container);
};

cc.ScrollView.prototype._ctor = function(size, container) {
    size == undefined ? this.init() : (container ? this.initWithViewSize(size, container) : this.initWithViewSize(size));
};