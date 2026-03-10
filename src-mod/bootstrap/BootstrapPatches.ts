import { getGlobalScope } from "../shared/global";

const SOUND_STORAGE_KEY = "sound";

function getCc(): any {
    return getGlobalScope().cc || null;
}

function needSound(): boolean {
    const cc = getCc();
    if (!cc || !cc.sys || !cc.sys.localStorage) {
        return true;
    }
    const rawValue = cc.sys.localStorage.getItem(SOUND_STORAGE_KEY) || 1;
    return rawValue == 1;
}

function setSound(isOn: boolean): void {
    const cc = getCc();
    if (!cc || !cc.sys || !cc.sys.localStorage) {
        return;
    }
    cc.sys.localStorage.setItem(SOUND_STORAGE_KEY, isOn ? 1 : 2);
}

const LOG_LEVEL = {
    v: { name: "verbose", level: 1 },
    i: { name: "info", level: 2 },
    w: { name: "warn", level: 3 },
    d: { name: "debug", level: 4 },
    e: { name: "error", level: 5 }
};

export const BootstrapPatches = {
    _installed: false,
    install(): void {
        const globalScope = getGlobalScope();
        const cc = globalScope.cc;
        if (!cc || this._installed) {
            return;
        }

        this._installed = true;
        globalScope.setSound = setSound;
        globalScope.needSound = needSound;

        cc.ENVIRONMENT_COCOS = cc.log ? 1 : 0;
        if (!cc.originAudioEngine) {
            cc.originAudioEngine = {};
        }
        if (cc.audioEngine) {
            cc.originAudioEngine.playEffect = function (char: string, loop: boolean) {
                if (!needSound()) {
                    return;
                }
                return cc.audioEngine.playEffect(char, loop);
            };
            cc.originAudioEngine.stopEffect = function (effectId: number) {
                if (!needSound()) {
                    return;
                }
                cc.audioEngine.stopEffect(effectId);
            };
            cc.originAudioEngine.playMusic = function (url: string, loop: boolean) {
                if (!needSound()) {
                    return;
                }
                cc.audioEngine.playMusic(url, loop);
            };
            cc.originAudioEngine.stopMusic = function (releaseData: boolean) {
                if (!needSound()) {
                    return;
                }
                cc.audioEngine.stopMusic(releaseData);
            };
        }

        if (!cc.originLog) {
            cc.originLog = cc.log ? cc.log.bind(cc) : function () {};
        }
        if (!cc._log) {
            cc._log = function (levelInfo: { name: string; level: number }, message: any) {
                if (LOG_LEVEL.v.level > levelInfo.level) {
                    return;
                }
                cc.originLog("[t " + levelInfo.name + "]" + message);
            };
        }

        cc.log = function (message: any) {
            cc._log(LOG_LEVEL.v, message);
        };
        cc.v = function (message: any) {
            cc._log(LOG_LEVEL.v, message);
        };
        cc.i = function (message: any) {
            cc._log(LOG_LEVEL.i, message);
        };
        cc.w = function (message: any) {
            cc._log(LOG_LEVEL.w, message);
        };
        cc.d = function (message: any) {
            cc._log(LOG_LEVEL.d, message);
        };
        cc.e = function (message: any) {
            cc._log(LOG_LEVEL.e, message);
        };
    }
};

