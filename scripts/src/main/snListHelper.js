export default function snListHelper() {
  const ALLOWED_TABLES = [
    {
      table: "sys_script",
      fields: ["script"],
    },
    {
      table: "sys_script_include",
      fields: ["script"],
    },
    {
      table: "sp_widget",
      fields: ["script"],
      clientFields: ["client_script", "link"],
    },
  ];

  const TABLE_LIST = ALLOWED_TABLES.map((t) => t.table);

  let dialog = null;
  let dialogContent = null;
  let parsedScripts = [];

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
    dialogHeader.innerHTML = `<h2 class="sn-blame-h2">Dialog Title</h2>`;

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
  }

  const parseScriptInfo = (scriptInfo) => {
    
    let glideRecordHTML = scriptInfo.glideRecord.reduce((htmlStr, element) => {
      if (element.variable && typeof element.table === 'string') {
        htmlStr += `<tr class="sn-blame-gr-table">
            <td class="sn-blame-gr-variable">${element.variable}</th>
            <td class="sn-blame-gr-table"><a href="/${element.table}_list.do?sys_id=${element.table}">${element.table}<a></th>
          </tr>`;
      }

      if (element.variable && typeof element.table !== 'string') {
        htmlStr += `<tr class="sn-blame-gr-table">
            <td class="sn-blame-gr-variable">${element.variable}</th>
            <td class="sn-blame-gr-table">${element.table}</th>
          </tr>`;
      }

      return htmlStr;
    }, `<h4><i class="icon-search-database"></i>GlideRecord Calls</h4>
             <table class='sn-blame-dialog-list'>
             <tr>
              <th>Variable</th>
              <th>Table</th>
             </tr>`) + "</table>";

    let scriptIncludeHTML = scriptInfo.scriptIncludeCalls.reduce((htmlStr, scriptCall) => {
      if (scriptCall.scriptInclude) {
        htmlStr += `<li>
            <span class="sn-blame-si-script-include">${scriptCall.scriptInclude}</span>
            <span class="sn-blame-si-method">${scriptCall.method || ''}</span>
            <span class="sn-blame-si-line">Line: ${scriptCall.line}</span>
          </li>`;
      }
      return htmlStr
    }, `<h4><i class="icon-document-code"></i>Script Include Calls</h4><ul class='sn-blame-dialog-list'>`) + "</ul>";
 
    let scriptContent = `<h4><i class="icon-global"></i>Scope: ${scriptInfo.scope}</h4>`;
    
    if(scriptInfo.glideRecord.length > 0)
      scriptContent += `<hr> ${glideRecordHTML}`;

    if(scriptInfo.scriptIncludeCalls.length > 0)
      scriptContent += `<hr> ${scriptIncludeHTML}`;

    return scriptContent;
  }

  const createlistButton = (table, recordID) => {
    let div = document.createElement("div");
        div.classList.add("sn-blame", `sn-blame-sys-id_${recordID}`);

        let button = document.createElement("button");
        button.classList.add("btn", "btn-sn-blame", "compact", "icon-glasses");

        button.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          dialogContent.innerHTML = "";
          dialog.setAttribute("sys_id", recordID);
          dialog.setAttribute("table", table);

          let scriptInfo = parsedScripts.find((s) => s.sys_id === recordID);
          if (!scriptInfo) 
            return;

          let scriptContent = document.createElement("pre");
          scriptContent.innerHTML = parseScriptInfo(scriptInfo);
          dialogContent.appendChild(scriptContent);

          dialog.querySelector(".sn-blame-h2").textContent = `Script Analysis for ${scriptInfo.displayName || recordID}`;

          dialog.showModal();
        };

        div.appendChild(button)

        return div;
  }

  const hookSNBlameListHelper = () => {
    let table = location.pathname
      .replace(/_list(\.do)?$/i, "")
      .slice(1)
      .toLowerCase();

    if (TABLE_LIST.indexOf(table) === -1) 
        return;

    let snTableNode = document.querySelector(`#${table}_table`);
    if (!snTableNode) 
      return;

    let tableObject = ALLOWED_TABLES.find((t) => t.table === table);
    createDialog();

    let sysIDList = Array.from(
      document.querySelectorAll(`#${table}_table tr`)
    )
      .map((e) => {
        let recordID = e.getAttribute("sys_id");
        if(!recordID) 
          return null;

        e.querySelectorAll('.list_decoration_cell')[1].prepend(createlistButton(table, recordID));

        return recordID;
      })
      .filter((e) => e);

    window.dispatchEvent(
      new CustomEvent("sn-list-helper", {
        detail: {
          table,
          sysIDList,
          g_ck: window.g_ck,
          fields: tableObject.fields || null,
          clientFields: tableObject.clientFields || null,
        },
      })
    );
  }

  if (!/_list(\.do)?$/i.test(location.pathname)) 
    return;

  window.addEventListener("sn-list-helper-response", (event) => {
    document.querySelectorAll(".sn-blame").forEach((el) => {
      el.style.visibility = "visible";
    });

    parsedScripts = event.detail.parsedScripts;
    console.log(parsedScripts);
  });

  window.addEventListener("sn-list-helper-start", (event) => {
    hookSNBlameListHelper(event);
  });

  CustomEvent.on("partial.page.reload", (event) => {
    hookSNBlameListHelper(event);
  })
}
