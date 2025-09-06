import * as config from '../../../../snTableConfigurations.json'
import jsonLoose from 'json-loose';

export default function snListHelper() {
  const ALLOWED_TABLES = Object.keys(config.default).reduce((acc, key) => {
    if(key === 'defaultFields')
      return acc;

    acc.push({
      table: key,
      serverScriptField: config.default[key].mainScriptField,
    })

    return acc;
  } , []);

  const TABLE_LIST = ALLOWED_TABLES.map((t) => t.table);

  let dialog = null;
  let dialogContent = null;
  let parsedScripts = [];
  let parsedScriptIncludes = [];
  let loaded = false;
  let dialogState = (()=> {
    try{ return JSON.parse(localStorage.getItem('sn-blame-helper-detail-state')) || {
      "sn-blame-gr-detail": "open",
      "sn-blame-script-calls-detail": "open",
      "sn-blame-script-include-detail": "open",
    }}
    catch(e){return {}}
  })();

  const createDialog = () => {
    dialog = document.createElement("dialog");
    dialog.classList.add("sn-blame-dialog");

    let dialogWrapper = document.createElement("div");
    dialogWrapper.classList.add("sn-blame-dialog-wrapper");

    dialog.appendChild(dialogWrapper);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    let dialogHeader = document.createElement("header");
    dialogHeader.classList.add("sn-blame-dialog-header");
    dialogHeader.innerHTML = `
      <div>
        <h2 class="sn-blame-h2">SN Blame - Script Execution Detail</h2>
        <h3 class="sn-blame-sub-title-h2"></h3>
      </div>`;

    let dialogCloseButton = document.createElement("button");
    dialogCloseButton.classList.add("sn-blame-close");
    dialogCloseButton.onclick = () => dialog.close();
    dialogCloseButton.innerHTML = '<i class="icon-cross"></i>';
    dialogHeader.appendChild(dialogCloseButton);

    dialogWrapper.appendChild(dialogHeader);
    dialogContent = document.createElement("div");
    dialogContent.classList.add("sn-blame-dialog-content");
    dialogWrapper.appendChild(dialogContent);

    document.body.appendChild(dialog);
  };

  const parseScriptInfo = (scriptInfo, table) => {
    /** TODO move all HTML to a html file on template tags*/
    let glideRecordHTML =
      scriptInfo.glideRecord.filter(gr => !gr.notInitializedOnBlock).reduce(
        (htmlStr, element) => {
          if (element.variable && typeof element.table === "string") {
            htmlStr += `
            <tr class="sn-blame-gr-table">
            <td class="sn-blame-gr-variable">${element.variable}</th>
            <td class="sn-blame-gr-table"><a href="/${element.table}_list.do?sys_id=${element.table}">${element.table}<a></th>
          </tr>`;
          }

          if (element.variable && typeof element.table !== "string") {
            htmlStr += `<tr class="sn-blame-gr-table">
            <td class="sn-blame-gr-variable">${element.variable}</th>
            <td class="sn-blame-gr-table">Type: ${element.table.type} - ${element.table.value}</th>
          </tr>`;
          }

          return htmlStr;
        },
        `<details ${dialogState["sn-blame-gr-detail"]} id="sn-blame-gr-detail">
            <summary>
              <h4><i class="icon-search-database"></i>GlideRecord Calls</h4>
            </summary>
            <table class='sn-blame-dialog-list'>
              <tr>
                <th>Variable</th>
                <th>Table</th>
              </tr>`
      ) + "</table></details>";

    let scriptIncludeHTML =
      scriptInfo.scriptIncludeCalls
        .sort((a, b) => a.scriptInclude.localeCompare(b.scriptInclude))
        .reduce((acc, scriptCall) => {
          let callExists = acc.find((s => s.id === scriptCall.id && s.method === scriptCall.method))
          if(callExists){
            callExists.line += ', ' + scriptCall.line;
          }else
            acc.push(scriptCall);
            return acc;
        },[])
        .reduce(
          (htmlStr, scriptCall, index, arr) => {
            if (scriptCall.id === scriptInfo.sys_id) {
              return htmlStr;
            }

            if (scriptCall.scriptInclude) {
              let sameAsPrevious =
                arr[index - 1] &&
                scriptCall.id === arr[index - 1].id;

              htmlStr += `<tr class="sn-blame-si-table ${sameAsPrevious ? `no-border-top-bottom` : ""}">
            <td class="sn-blame-si-script-include">${sameAsPrevious ? "" : `<a href="/sys_script_include.do?sys_id=${scriptCall.id}">${scriptCall.scriptInclude}<a>`}</td>
            <td class="sn-blame-si-method">${scriptCall.method || ""}</td>
            <td class="sn-blame-si-line">${scriptCall.line}</td>
          </tr>`;
            }
            return htmlStr;
          },
          `<details ${dialogState["sn-blame-script-calls-detail"]}  id="sn-blame-script-calls-detail">
            <summary>
              <h4><i class="icon-document-code"></i>Script Include Calls</h4>
            </summary>
              <table class='sn-blame-dialog-list'>
                <tr>
                  <th>Script Include</th>
                  <th>Method</th>
                  <th>Line(s)</th>
                </tr>`
        ) + "</table></details>";

    let scriptContent = `<h4><i class="icon-global"></i>Scope: ${scriptInfo.scope}</h4>`;

    let scriptContext;
    let getHTMLByType = (type, value) => {
      if(type === 'boolean')
        return `<i class="icon-checkbox-${value === 'true' ? 'checked' : 'empty'}"></i>`;
      
      if(!value)
        return `<span></span>`

      return `<span>${value}</span>`
    }

    let getCompositeColumn = (columns, types, scriptInfo) =>{
      return columns.reduce((acc, col)=>{
        let {label, field} = col;
        acc += `<div class="sn-blame-composite-field"><span>${label}</span><span>${getHTMLByType(types[field], scriptInfo[field])}</span></div>`

        return acc
      },'')
    }

    let getScriptIncludeTableRowHTML = (method, propertyDef) => {
      const COLOR_MAP = {
        Literal: "#E57373",
        ObjectExpression: "#64B5F6",
        FunctionExpression: "#81C784",
        ArrayExpression: "#FFD54F",
        Identifier: "#BA68C8",
        BinaryExpression: "#4DB6AC",
        CallExpression: "#FF8A65",
        MemberExpression: "#9575CD",
        AssignmentExpression: "#F06292",
        ConditionalExpression: "#4FC3F7",
        ReturnStatement: "#AED581",
        VariableDeclaration: "#FFF176",
        ImportDeclaration: "#90CAF9",
        ExportDeclaration: "#A1887F",
        ThisExpression: "#F48FB1",
      };

      let value = propertyDef;
      if (propertyDef.type === "ObjectExpression") {
        try {
          value = `<pre style="white-space: pre-wrap;">${JSON.stringify(JSON.parse(jsonLoose(propertyDef.value)), null, 2)}</pre>`;
        } catch (e) {
          value = propertyDef.value || propertyDef;
        }
      }

      if (propertyDef.type === "ArrayExpression") {
        value = JSON.stringify(propertyDef.value);
        value = value.substring(1, value.length-1);
      }

      if (propertyDef.type === "CallExpression") {
        value = JSON.stringify(propertyDef.value);
        value = value.substring(1, value.length-1);
      }

      if (propertyDef.type === "FunctionExpression"){
        if(propertyDef.args.length)
          value = `( ${propertyDef.args.join(", ")} )`;
        else
          value = '';
      }
        

      return `<tr>
            <td>static ${method}</td>
            <td 
              class="sn-blame-node-type" 
              style="color:${COLOR_MAP[propertyDef.type || "Literal"] || "#F44336"}">
              <span sn-blame-title="${propertyDef.type || "Literal"}">${(propertyDef.type || "Literal")[0].toUpperCase()}</span>
            </td>
            <td>${(!propertyDef.type) ? '"' + value + '"' : value}</td>
          </tr>`;
    };

    let tableConfig = config.default[table]  

    if(table && tableConfig && tableConfig.modalContext){
      scriptContext = tableConfig.modalContext.reduce((acc, column) => {
        let {label, field} = column;
        if(!field)
          return acc;

        acc += 
        `<tr>
          <td>${label}<td>
          <td>${typeof field === 'string'? 
            getHTMLByType(tableConfig?.dataFields[field], scriptInfo[field]) : 
            getCompositeColumn(field, tableConfig.dataFields, scriptInfo)
          }
          <td>`;

        return acc
      }, `<h4>Context</h4>
            <table class='sn-blame-dialog-list'>
              <tbody>
            `
        ) + `</tbody></table>`;
    }

    let scriptIncludeDetailsHTML = '';
    let currentScriptIncldeParsedDetails = scriptInfo.scriptIncludesInfo[scriptInfo.sys_name] || scriptInfo.scriptIncludesInfo[scriptInfo.api_name];
    if(currentScriptIncldeParsedDetails){
      scriptIncludeDetailsHTML+= `
        <details ${dialogState["sn-blame-script-include-detail"]}  id="sn-blame-script-include-detail">
          <summary>
            <h4>${scriptInfo.api_name || scriptInfo.sys_name}</h4>
          </summary>`
        
      scriptIncludeDetailsHTML+= `<div> Constructor: <br/> 
        <pre>new ${scriptInfo.api_name || scriptInfo.sys_name}(${currentScriptIncldeParsedDetails['methods'].initialize?.args || ''})</pre>
      <div>`

      if(currentScriptIncldeParsedDetails.extends){
        let extendeHirerachy = [currentScriptIncldeParsedDetails.extends];

        let lastIndexClass = extendeHirerachy[extendeHirerachy.length-1];
        while(parsedScriptIncludes[lastIndexClass]?.extends){
          extendeHirerachy.push(parsedScriptIncludes[lastIndexClass].extends);
          lastIndexClass = extendeHirerachy[extendeHirerachy.length-1];
        }

        scriptIncludeDetailsHTML+= '<h5>Extends<h5>';
        scriptIncludeDetailsHTML+=  extendeHirerachy.reduce((acc ,ext) => {
          acc += `<ul><li><a href="/sys_script_include.do?sys_id=${parsedScriptIncludes[ext].sys_id}">${ext}</a>`
          return acc
        }, '') + extendeHirerachy.map(e=> '</li></ul>').join('');
      }

      scriptIncludeDetailsHTML+= `<table class='sn-blame-dialog-list sn-blame-object-props'><tbody>
        <tr>
          <th>Property</th>
          <th>Type</th>
          <th>Arguments/Value</th>
        </tr>
      `
      Object.keys(currentScriptIncldeParsedDetails['static']).forEach(
        method => {
          let propertyDef = currentScriptIncldeParsedDetails['static'][method];
          if(!propertyDef) return

          scriptIncludeDetailsHTML+= getScriptIncludeTableRowHTML(method, propertyDef)
        }
      )
      Object.keys(currentScriptIncldeParsedDetails['methods']).forEach(
        method => {
          let propertyDef = currentScriptIncldeParsedDetails['methods'][method];
          if(method === 'initialize' || !propertyDef) return

          scriptIncludeDetailsHTML+= getScriptIncludeTableRowHTML(method, propertyDef)
        }
      )

      scriptIncludeDetailsHTML+= `</tbody></table></details>`;
    }

    if (scriptContext)
      scriptContent += `<hr> ${scriptContext}`;

     if(scriptIncludeDetailsHTML){
      scriptContent += `<hr> ${scriptIncludeDetailsHTML}`;
    }

    if (scriptInfo.glideRecord.length > 0)
      scriptContent += `<hr> ${glideRecordHTML}`;

    if (scriptInfo.scriptIncludeCalls.length > 0)
      scriptContent += `<hr> ${scriptIncludeHTML}`;

    return scriptContent;
  };

  const createlistButton = (table, recordID) => {
    let div = document.createElement("div");
    div.classList.add("sn-blame", `sn-blame-sys-id_${recordID}`);
    div.setAttribute("sys_id", recordID);

    let button = document.createElement("button");
    button.classList.add("btn", "btn-sn-blame", "compact", "icon-glasses");

    button.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      dialogContent.innerHTML = "";
      dialog.setAttribute("sys_id", recordID);
      dialog.setAttribute("table", table);

      let scriptInfo = parsedScripts.find((s) => s.sys_id === recordID);
      if (!scriptInfo) return;

      let scriptContent = document.createElement("div");
      scriptContent.innerHTML = parseScriptInfo(scriptInfo, table);
      dialogContent.appendChild(scriptContent);

      let details = Array.from(scriptContent.querySelectorAll('details'))
      details.forEach(detail => detail.addEventListener('toggle', (event)=>{
        dialogState[event.target.id] = event.newState;
       
        try{
          localStorage.setItem('sn-blame-helper-detail-state', JSON.stringify(dialogState));
        } catch(e){

        };

      }));

      dialog.querySelector(".sn-blame-sub-title-h2").textContent =
        `${typeof g_list?.title === 'undefined' ? document.title.split('|')[0].trim() : g_list.title}: ${scriptInfo.displayName || recordID}`;

      dialog.showModal();
    };

    div.appendChild(button);

    return div;
  };

  const hookSNBlameListHelper = () => {
    let table = location.pathname
      .replace(/_list(\.do)?$/i, "")
      .slice(1)
      .toLowerCase();

    if (TABLE_LIST.indexOf(table) === -1) return;

    let snTableNode = document.querySelector(`#${table}_table`);
    if (!snTableNode) return;

    let tableObject = ALLOWED_TABLES.find((t) => t.table === table);
    createDialog();

    let sysIDList = Array.from(document.querySelectorAll(`#${table}_table tr`))
      .map((e) => {
        let recordID = e.getAttribute("sys_id");
        if (!recordID) return null;

        e.querySelectorAll(".list_decoration_cell")[1].prepend(
          createlistButton(table, recordID)
        );

        return recordID;
      })
      .filter((e) => e);

    window.dispatchEvent(
      new CustomEvent("sn-list-helper", {
        detail: {
          table,
          sysIDList,
          g_ck: window.g_ck,
          field: tableObject.serverScriptField || null,
          clientFields: tableObject.clientFields || null,
        },
      })
    );
  };

  if (!/_list(\.do)?$/i.test(location.pathname)) return;

  window.addEventListener("sn-list-helper-response", (event) => {
    ({ parsedScripts , parsedScriptIncludes} = event.detail);
    document.querySelectorAll(".sn-blame").forEach((el) => {
      el.style.visibility = "visible";
      if (
        !el.getAttribute("sys_id") ||
        parsedScripts.find((s) => s.sys_id === el.getAttribute("sys_id"))
          ?.protected === true
      ) {
        el.querySelector("button").setAttribute("disabled", "disabled");
        el.setAttribute("title", "Script is protected, no analysis available");
      }
    });
  });

  window.addEventListener("sn-list-helper-start", (event) => {
    if(!loaded){
      hookSNBlameListHelper(event);
      loaded = true;
    }
  });

  CustomEvent.on ? CustomEvent.on("partial.page.reload", (event) => {
    if(loaded)
      hookSNBlameListHelper(event);
  }): console.log('can\'t listen to partial.page.reload event');
}
