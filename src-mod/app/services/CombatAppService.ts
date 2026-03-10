import { getGlobalScope } from "../../shared/global";

export class CombatAppService {
    createBattle(battleInfo: any, isDodge?: boolean): any {
        const globalScope = getGlobalScope();
        if (typeof globalScope.Battle !== "function") {
            return null;
        }
        return new globalScope.Battle(battleInfo, !!isDodge);
    }
}

