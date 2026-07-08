/**
 * User: Alex
 * Date: 15/1/5
 * Time: 下午4:07
 */
var SplashLayer = cc.Layer.extend({
    ctor: function () {
        this._super();
        return true;
    },

    onExit: function () {
        this._super();
    },

    onEnter: function () {
        this._super();

        var bg = new cc.Sprite("res/splash.png");
        bg.x = cc.winSize.width / 2;
        bg.y = cc.winSize.height / 2;
        this.addChild(bg);

        this.scheduleOnce(function () {
            cc.director.runScene(new MenuScene());
        }, 3);

        return true;
    }

});


var SplashScene = cc.Scene.extend({
    ctor: function () {
        this._super();
    },
    onEnter: function () {
        this._super();
        var layer = new SplashLayer();
        this.addChild(layer);
    },
    onExit: function () {
        this._super();
    }
});
