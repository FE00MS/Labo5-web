
import * as utilities from "../utilities.js";
import * as serverVariables from "../serverVariables.js";

let cachedRequestExpirationTime = serverVariables.get("main.repository.CacheExpirationTime");

// Repository file data models cache
global.cachedRequests = [];
global.cachedRequestsCleanerStarted = false;

export default class CachedRequestsManager {
    static add(url ,content,ETag="") {
        if (!cachedRequestsCleanerStarted) {
            cachedRequestsCleanerStarted = true;
            CachedRequestsManager.startCachedRequestsCleaner();
        }
        if (url != "") {
            CachedRequestsManager.clear(url);
            cachedRequests.push({
                url,
                content,
                ETag,
                Expire_Time: utilities.nowInSeconds() + cachedRequestExpirationTime
            });
            console.log(BgWhite + FgBlue, `[Content and ETag of ${url} request has been cached]`);
        }
    }
    static find(url) {
        try {
            if (url != "") {
                for (let cache of cachedRequests) {
                    if (cache.url == url) {
                        // renew cache
                        cache.Expire_Time = utilities.nowInSeconds() + cachedRequestExpirationTime;
                        console.log(BgWhite + FgBlue, `[${cache.url} content and ETag retrieved from cache]`);
                        return{content : cache.content ,ETag: cache.ETag};
                    }
                }
            }
        } catch (error) {
            console.log(BgWhite + FgRed, "[requested cache error!]", error);
        }
        return null;
    }
    static clear(url) {
        if (url != "") {
            let indexToDelete = [];
            let index = 0;
            for (let cache of cachedRequests) {
                if (cache.url == url) indexToDelete.push(index);
                index++;
            }
            utilities.deleteByIndex(cachedRequests, indexToDelete);
        }
    }

    static startCachedRequestsCleaner() {
        // periodic cleaning of expired cached repository data
        setInterval(CachedRequestsManager.flushExpired, cachedRequestExpirationTime * 1000);
        console.log(BgWhite + FgBlue, "[Periodic requests content and ETag caches cleaning process started...]");

    }

    static flushExpired() {
        let now = utilities.nowInSeconds();
        for (let cache of cachedRequests) {
            if (cache.Expire_Time <= now) {
                console.log(BgWhite + FgBlue, "Cached file content and ETag of " + cache.url + " expired");
            }
        }

        cachedRequests = cachedRequests.filter( cache => cache.Expire_Time > now);
    }

    static get(HttpContext){
        let cacherequest = CachedRequestsManager.find(HttpContext.req.url);
       if( cacherequest == null){
        CachedRequestsManager.add(HttpContext.req.url,HttpContext.content,HttpContext.ETag);
        return false;
       }else{
         HttpContext.response.JSON( cacherequest.content, cacherequest.ETag, true /* from cache */)
        return true;
        }
    }
}