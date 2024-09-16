let gutter = {};
let serverDiff = {};

new SNBlameOptions();

(chrome || browser).runtime.onMessage.addListener(function (msg) {
  let blameOptions = new SNBlameOptions();

  Object.keys(msg.blameOptions).forEach(option => {
    blameOptions.setOption(option, msg.blameOptions[option], false)
  });

  Object.keys(gutter).forEach(field => gutter[field].updateGutter());
});

window.addEventListener(
  "message",
  function (event) {
    if (event.data?.action === "init") {
      const { g_ck, table, sys_id, fields } = event.data.options;

      getVersions(g_ck, table, sys_id, Object.keys(fields)).then((versions) => {
        Object.keys(fields).forEach((field) => {
          serverDiff[field] = getBlame(versions, field);
          let currentDiff = getDiffsWithCurrent(
            fields[field].lines,
            serverDiff[field]
          );

          window.postMessage({ type: "diff-update", diff: currentDiff, field });

          let editorElement = document.querySelector(
            `[id='element.${fields[field].id}'] #debugContainer`
          );
          gutter[field] = new MonacoBlameGutter(editorElement, currentDiff);
          gutter[field].updateGutter();
        });
      });
    }

    if (event.data?.action === "scroll") {
      const { scroll, field } = event.data;
      if (!gutter[field]) return;
      gutter[field].scroll(scroll);
      gutter[field].updateGutter();
    }

    if (event.data?.action === "model-change") {
      const { lines, field } = event.data;
      if (!gutter[field]) return;
      let currentDiff = getDiffsWithCurrent(lines, serverDiff[field]);

      window.postMessage({ type: "diff-update", diff: currentDiff, field });
      gutter[field].updateLines(currentDiff);
    }

    if (event.data === "sn-blame-toggle-user-update-set") {
      let options = new SNBlameOptions();
      options.setOption("showUser", !options.getOption("showUser"));
      Object.keys(gutter).forEach((field) => gutter[field].updateGutter());
    }

    if (event.data === "sn-blame-toggle-gutter-date") {
      let options = new SNBlameOptions();
      options.setOption("hideGutterDate", !options.getOption("hideGutterDate"));
      Object.keys(gutter).forEach((field) => gutter[field].updateGutter());
    }

    if (event.data === "sn-blame-toggle-line-numbers") {
      let options = new SNBlameOptions();
      options.setOption(
        "debugLineNumbers",
        !options.getOption("debugLineNumbers")
      );
      Object.keys(gutter).forEach((field) => gutter[field].updateGutter());
    }
  },
  false
);

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
    let record = parser.xml_str2json(b.payload.value).record_update[table];
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
    res.source = b.source

    return res;
  });

  return removeReverted(
    result.sort(function (a, b) {
      return Number("0x" + b.sys_recorded_at) - Number("0x" + a.sys_recorded_at);
    })
  );
}

function removeReverted(versions) {
  var result = [];
  var next = null;

  versions.forEach(function (element) {
    if (next == null || next === element.sys_id ) {
      result.push(element);
      next = element.reverted_from || null;
      return
    }    
  });

  return result.reverse();
}

function getBlame(versions, key) {
  if(versions.length === 0) return []

  const initialVersion = versions[0];
  const ignoreWhiteSpace = new SNBlameOptions().getOption("ignoreWhiteSpace");

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

function getDiffsWithCurrent(newModelValue, serverValue) {
  const ignoreWhiteSpace = new SNBlameOptions().getOption("ignoreWhiteSpace");

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
