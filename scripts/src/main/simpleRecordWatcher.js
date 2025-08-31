/**
 * calls the ServiceNow websocket to watch for changes in the record
 * @param {string} table: table to watch for changes
 * @param {Function} onMessage: function to call when a message is received
 * @returns {Object} watcherChannel: the channel to watch for changes
 */

function snBlameRecordWatcher(table, onMessage) {
  var amb = typeof g_ambClient !== 'undefined'?  g_ambClient : top.g_ambClient;
  if (!amb) {
    console.warn("snBlameRecordWatcher: g_ambClient not found");
    return;
  }

  var watcherChannel = amb.getChannel(
    `/rw/default/${table}/${btoa(unescape(encodeURIComponent("sys_id!=-1"))).replace(/=/g, "-")}`
  );
  watcherChannel.subscribe(onMessage);
  amb.connect();
  return watcherChannel;
}

/**
 * Triggers the cache invalidation for the sn-blame extension
 * when a script include is changed in the ServiceNow instance
 * 
 * @returns {void}
 */
export default function listenerForCacheInvalidation() {
  snBlameRecordWatcher("sys_script_include", (message) => {
    window.dispatchEvent(
      new CustomEvent("sn-blame-invalidate-cache", {
        detail: {
          sys_id: message.data.sys_id,
          table: message.data.table_name,
          action: message.data.operation,
          scriptChange: message.data.changes.indexOf('script') !== -1,
        },
      })
    );
  });
}
