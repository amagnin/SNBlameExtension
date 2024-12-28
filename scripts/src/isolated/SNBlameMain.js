import MonacoBlameGutterWrapper from "./MonacoBlameGutterWrapper.js";
import SNBlameOptions from "./SNBlameOptions.js";
import SNRESTFactory from "./SNRestFactory.js";

import runScriptIncludesCodeAnalisis from "../astParser/scriptIncludesStaticCodeAnalysis.js";
import getScriptIncludeLib from "../astParser/scriptIncludesToExtraLib.js";

import patienceDiff from "../../libraries/patienceDiff.js";
import X2JS from "x2js";

/** Get Updated Options from the extension popup */
(chrome || browser).runtime.onMessage.addListener(function (msg) {
  if (msg.blameOptions) {
    const blameOptions = new SNBlameOptions();

    Object.keys(msg.blameOptions).forEach((option) => {
      blameOptions.setOption(option, msg.blameOptions[option], false);
    });

    const gutters = new MonacoBlameGutterWrapper();
    gutters.updateGutterOptions();
    return;
  }

  if (msg.action === "sn-blame-bootstrap") {
    window.dispatchEvent(new CustomEvent("sn-blame-start"));
  }
});

let serverDiff = {};
let scriptIncludeCache = {};
let loaded = false;
let loadedLibs = {}

let restFactory;

let LISTENERS = {
  'focus' : ()=>{
    const delayStart = new SNBlameOptions().getOption('startOnAction')
    if(!delayStart && !loaded)
      window.dispatchEvent(new CustomEvent("sn-blame-start"));
  },
  'load': () => {
    new SNBlameOptions();
  },
  'sn-blame-init': (event) => {
    const { g_ck, table, sys_id, fields} = event.detail;
    restFactory = SNRESTFactory(g_ck);

    window.dispatchEvent(new CustomEvent("sn-get-scirpt_include_cache", {
      detail: {
        g_ck,
      },
    }));

    const ignoreTableList = new SNBlameOptions().getOption('ignoreTableList');
    if(ignoreTableList.indexOf(table) !== -1) return;

    getVersions(g_ck, table, sys_id, Object.keys(fields)).then((versions) => {
      if(loaded === true) return;
      
      Object.keys(fields).forEach((field) => {
        let editorElement = document.querySelector(
          `[id='element.${fields[field].id}'] #debugContainer`
        );
        loaded = true;

        if(versions.length === 0){
          let warnDiv = document.createElement('DIV');
          warnDiv.innerText = 'SN BLAME: NO VERSIONS AVAILABLE, CAN\'T START BLAME';
          warnDiv.style.padding = '10px';
          warnDiv.style.backgroundColor = 'hsl(55deg 100% 12%)';
          warnDiv.style.margin = '10px';
          warnDiv.style.color = 'white';
          warnDiv.style.fontWeight = 'bold';
          
          editorElement.prepend(warnDiv);
          return;
        }

        const ignoreWhiteSpace = new SNBlameOptions().getOption("ignoreWhiteSpace");
        serverDiff[field] = getBlame(versions, field, ignoreWhiteSpace);
        let currentDiff = getDiffsWithCurrent(
          fields[field].lines,
          serverDiff[field],
          ignoreWhiteSpace
        );
        window.dispatchEvent(new CustomEvent("sn-blame-diff-update", {detail: {diff: currentDiff, field}}));

        const gutters = new MonacoBlameGutterWrapper()

        gutters.createGutter(field, editorElement, currentDiff);
        window.dispatchEvent(new CustomEvent("sn-blame-get-scroll-position", {detail: {field}}));
      });
    });
    
  },
  'sn-blame-model-change': (event) => {
    const { script, field } = event.detail;
    const lines = script.split("\n");
  
    const gutters = new MonacoBlameGutterWrapper();
    if (!gutters.gutterExists(field)) return;
  
    const ignoreWhiteSpace = new SNBlameOptions().getOption("ignoreWhiteSpace");
    const currentDiff = getDiffsWithCurrent(lines, serverDiff[field], ignoreWhiteSpace);
  
    window.dispatchEvent(new CustomEvent("sn-blame-diff-update", {detail: {diff: currentDiff, field}}));
    gutters.updateGutterLines(field, currentDiff);
  },
  'sn-check-tokens': (event) => {
    const { tokens, field } = event.detail;

    tokens.forEach((token) => {
      if(scriptIncludeCache.sys_script_include[`${token.scope}.${token.string}`]){
        if(loadedLibs[`${token.scope}.${token.string}`]) return;

        restFactory.getScriptIncludes(scriptIncludeCache.sys_script_include[`${token.scope}.${token.string}`]).then(triggerScriptIncludeLib)
      }
    })
  },
  'sn-get-scirpt_include_cache': (event) => {
    if(typeof restFactory?.getScriptIncludeCache !== 'function'){
      restFactory = SNRESTFactory(event.detail.g_ck);
    }
    restFactory.getScriptIncludeCache().then((cache)=>{
      scriptIncludeCache = cache;
    });
    
  }
};

Object.keys(LISTENERS).forEach((key) => {
  window.addEventListener(key, LISTENERS[key]);
});

async function getVersions(g_ck, table, sys_id, scriptFields) {
  let fields = [
    "payload",
    "sys_recorded_at",
    "reverted_from",
    "sys_id",
    "source",
    "state",
  ];

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Accept", "application/json");
  headers.append("X-UserToken", g_ck);

  const queryParams = new URLSearchParams({
    sysparm_display_value: "all",
    sysparm_fields: fields.join(","),
    sysparm_query: `name=${table}_${sys_id}^stateINcurrent,previous`,
  });

  const response = await fetch(
    `/api/now/table/sys_update_version?${queryParams}`,
    {
      method: "GET",
      headers,
    }
  );

  if (!response.ok) {
    console.log(response);
    return;
  }

  var parser = new X2JS();

  let body = await response.json();
  let result = body.result.map((b) => {
    let record = parser.xml2js(b.payload.value).record_update[table];
    let res = {};
    scriptFields.forEach((field) => {
      res[field] = record[field].split("\n");
    });
    res.sys_updated_by = record.sys_updated_by;
    res.sys_updated_on = record.sys_updated_on;
    res.sys_recorded_at = b.sys_recorded_at.value;
    res.reverted_from = b.reverted_from.value;
    res.sys_id = b.sys_id.value;
    res.state = b.state.value;
    res.source = b.source;

    return res;
  });

  return removeReverted(
    result.sort(function (a, b) {
      return (
        Number("0x" + b.sys_recorded_at) - Number("0x" + a.sys_recorded_at)
      );
    })
  );
}

function removeReverted(versions) {
  var result = [];
  var next = null;

  versions.forEach(function (element) {
    if (next == null || next === element.sys_id) {
      result.push(element);
      next = element.reverted_from || null;
      return;
    }
  });

  return result.reverse();
}

function getBlame(versions, key, ignoreWhiteSpace) {
  if (versions.length === 0) return [];

  const initialVersion = versions[0];

  var result = initialVersion[key].map(function (line, index) {
    return {
      index: index,
      line: ignoreWhiteSpace ? line.replace(/\s\s+/g, " ").trim() : line,
      author: versions[0].sys_updated_by,
      versionID: versions[0].sys_id,
      source: versions[0].source,
      date: versions[0].sys_updated_on,
    };
  });

  for (let i = 1; i < versions.length; i++) {
    let left = result.map(function (l) {
      return l.line;
    });
    const currentVersion = versions[i];

    let right = currentVersion[key];
    if (ignoreWhiteSpace)
      right = right.map(function (line) {
        return line.replace(/\s\s+/g, " ").trim();
      });

    let changes = patienceDiff(left, right, true);

    result = changes.lines
      .filter(function removeDeletion(diff) {
        return diff.bIndex !== -1;
      })
      .map(function (diff) {
        let resultIndex = diff.aIndex;
        let date = new Date(
          resultIndex === -1
            ? currentVersion.sys_updated_on
            : result[resultIndex].date
        );
        return {
          index: diff.bIndex,
          line: diff.line,
          author:
            resultIndex === -1
              ? currentVersion.sys_updated_by
              : result[resultIndex].author,
          versionID:
            resultIndex === -1
              ? currentVersion.sys_id
              : result[resultIndex].versionID,
          source:
            resultIndex === -1
              ? currentVersion.source
              : result[resultIndex].source,
          date: date.valueOf(),
        };
      });
  }

  return result.map(function (diff, index) {
    let res = {
      onlyWhiteSpace: diff.line.trim().length === 0,
      index: diff.index + 1,
      author: diff.author,
      versionID: diff.versionID,
      source: diff.source,
      date: diff.date,
      line: diff.line,
      sourceName: (diff.source.display_value || "[SN BLAME] Deleted").replace(
        "Update Set: ",
        ""
      ),
      updateSetNotFound: !diff.source.display_value,
    };

    return res;
  });
}

function getDiffsWithCurrent(newModelValue, serverValue, ignoreWhiteSpace) {
  var changes = patienceDiff(
    serverValue.map(function (diff) {
      if (ignoreWhiteSpace) return diff.line.replace(/\s\s+/g, " ").trim();
      return diff.line;
    }),
    ignoreWhiteSpace
      ? newModelValue.map(function (line) {
          return line.replace(/\s\s+/g, " ").trim();
        })
      : newModelValue,
    true
  );

  changes = changes.lines
    .filter(function removeDeletion(diff) {
      return diff.bIndex !== -1;
    })
    .map(function (diff) {
      let resultIndex = diff.aIndex;
      let result = {
        onlyWhiteSpace: diff.line.trim().length === 0,
        index: diff.bIndex + 1,
        line: diff.line,
        newModel: resultIndex === -1,
      };

      if (resultIndex !== -1) {
        result.author = serverValue[resultIndex].author;
        result.versionID = serverValue[resultIndex].versionID;
        result.source = serverValue[resultIndex].source;
        result.sourceName = serverValue[resultIndex].sourceName;
        result.date = serverValue[resultIndex].date;
      }

      return result;
    });

  return changes;
}

function triggerScriptIncludeLib(body){
  if(!body?.result?.script) return;
  let scriptIncludeObject = runScriptIncludesCodeAnalisis(body.result.script);

  let scriptScope = body.result.api_name.split('.')[0];
  
  // need to add script include extends

  let libs = Object.keys(scriptIncludeObject).map((className) => getScriptIncludeLib(className, scriptIncludeObject[className])) ;

  loadedLibs[`${token.scope}.${token.string}`] = {scriptIncludeObject, libs};

  window.dispatchEvent(new CustomEvent("sn-load-library", {
    detail: {
      libs,
    },
  }));
}