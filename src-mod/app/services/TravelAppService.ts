import { getGlobalScope } from "../../shared/global";

export class TravelAppService {
    buildPlan(startPos: any, endPos: any): any {
        const globalScope = getGlobalScope();
        if (!globalScope.TravelService || typeof globalScope.TravelService.buildPlan !== "function") {
            return null;
        }

        const player = globalScope.player || {};
        return globalScope.TravelService.buildPlan({
            startPos: startPos,
            endPos: endPos,
            storage: player.storage || null,
            weather: player.weather || null,
            ziplineNetwork: player.ziplineNetwork || null,
            map: player.map || null
        });
    }
}

