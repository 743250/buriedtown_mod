//
// Javascript Bindigns helper file
//

// DO NOT ALTER THE ORDER
require('script/jsb_cocos2d_constants.js');
require('script/jsb_cocos2d.js');
require('script/jsb_common.js');
require('script/jsb_property_impls.js');
require('script/jsb_property_apis.js');
require('script/jsb_create_apis.js');

if (cc.GLNode) {
    cc.GLNode.extend = cc.Class.extend; // move from jsb_cocos2d_extension
}

if (window.ccui) {
    // move from jsb_boot.js line 912
    //start------------------------------
    cc.EditBox = ccui.EditBox;
    delete ccui.EditBox;

    cc.Scale9Sprite = ccui.Scale9Sprite;

    // GUI
    /**
     * @type {Object}
     * UI Helper
     */
    ccui.helper = ccui.Helper;
    //end------------------------------

    // move from jsb_cocos2d
    //start------------------------------
    ccui.Widget.extend = cc.Class.extend;
    ccui.Button.extend = cc.Class.extend;
    ccui.CheckBox.extend = cc.Class.extend;
    ccui.ImageView.extend = cc.Class.extend;
    ccui.LoadingBar.extend = cc.Class.extend;
    ccui.RichText.extend = cc.Class.extend;
    ccui.Slider.extend = cc.Class.extend;
    ccui.Text.extend = cc.Class.extend;
    ccui.TextAtlas.extend = cc.Class.extend;
    ccui.TextBMFont.extend = cc.Class.extend;
    ccui.TextField.extend = cc.Class.extend;
    ccui.Layout.extend = cc.Class.extend;
    ccui.ListView.extend = cc.Class.extend;
    ccui.PageView.extend = cc.Class.extend;
    ccui.ScrollView.extend = cc.Class.extend;
    ccui.Scale9Sprite.extend = cc.Class.extend;
    //end------------------------------

    require('script/ccui/jsb_cocos2d_ui.js');
    require('script/ccui/jsb_ccui_property_impls.js');
    require('script/ccui/jsb_ccui_property_apis.js');
    require('script/ccui/jsb_ccui_create_apis.js');
    require('script/ccui/jsb_ccui_deprecated.js');
}

if (cc.ControlButton) {
    require('script/extension/jsb_cocos2d_extension.js');
    require('script/extension/jsb_ext_property_apis.js');
    require('script/extension/jsb_ext_create_apis.js');
}

if (cc.PhysicsSprite) {
    cc.PhysicsSprite.extend = cc.Class.extend;// move from jsb_cocos2d.js
    require('script/physicsSprite/jsb_physicsSprite.js');
}

if (window.cp) {
    // chipmunk
    require('script/chipmunk/jsb_chipmunk_constants.js');
    require('script/chipmunk/jsb_chipmunk.js');
}

require('script/jsb_opengl_constants.js');
require('script/jsb_opengl.js');
require('script/jsb_cocosbuilder.js');
require('script/jsb_deprecated.js');
require('script/jsb_loaders.js');
require('script/jsb_pool.js');

if (jsb.fileUtils.isFileExist('jsb_pluginx.js')) {
    if (cc.sys.os == cc.sys.OS_IOS || cc.sys.os == cc.sys.OS_ANDROID) {
        require('jsb_pluginx.js');
    }
}

if (window.sp) {
    require('script/jsb_spine.js');
}

if (jsb.Sprite3D){
    require('script/3d/jsb_cocos2d_3d.js');
}

if (jsb.ParticleSystem3D) {
    require('script/3d/jsb_cocos2d_3d_ext.js');   
}