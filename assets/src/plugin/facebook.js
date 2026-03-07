/**
 * Created by lancelot on 16/1/4.
 */

var facebook = {
    login: function () {
        //jsb.reflection.callStaticMethod("FBUtil", "login");
    },
    onLogin: function (res) {
        cc.log('facebook onLogin ' + res);
    },
    invite: function () {
        jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/Facebook", "invite", "()V");
    },
    onInvite: function (res) {
        cc.log('facebook onInvite ' + res);
    }
};
