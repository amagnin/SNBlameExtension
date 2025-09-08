import snBlamebootstrap from "./blame/snBlame.js";
import snListHelper from "./listHelper/snListHelper.js";
import listenerForCacheInvalidation from "./simpleRecordWatcher.js";

/**
 * TODO oonly trigger on forms with script fields
 */
snBlamebootstrap();

snListHelper();
listenerForCacheInvalidation();

setTimeout(() => {
<<<<<<< HEAD
  if(typeof g_ck !== 'undefined')
=======
>>>>>>> main
  window.dispatchEvent(
    new CustomEvent("sn-blame-validate-cache", {
      detail: {
        g_ck,
      },
    })
  );
});
