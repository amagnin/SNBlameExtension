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

  if (!/_list(\.do)?$/i.test(location.pathname)) 
    return;

  window.addEventListener("sn-list-helper-response", (event) => {
    parsedScripts = event.detail.parsedScripts;
    console.log(parsedScripts);
  });

  window.addEventListener("sn-list-helper-start", (event) => {
    let table = location.pathname
      .replace(/_list(\.do)?$/i, "")
      .slice(1)
      .toLowerCase();

    if (TABLE_LIST.indexOf(table) === -1) 
        return;

    let tableObject = ALLOWED_TABLES.find((t) => t.table === table);

    dialog = document.createElement("dialog");
    dialog.classList.add("sn-blame-dialog");

    let dialogHeader = document.createElement("header");
    dialogHeader.classList.add("sn-blame-dialog-header");
    dialogHeader.innerHTML = `<h2 class="sn-blame-h2">Dialog Title</h2>`;

    let dialogCloseButton = document.createElement("button");
    dialogCloseButton.classList.add("sn-blame-close");  
    dialogCloseButton.onclick = () => dialog.close();
    dialogCloseButton.innerHTML = '<i class="icon-cross"></i>';
    dialogHeader.appendChild(dialogCloseButton);

    dialog.appendChild(dialogHeader);
    dialogContent = document.createElement("div");
    dialogContent.classList.add("sn-blame-dialog-content");
    dialog.appendChild(dialogContent);

    document.body.appendChild(dialog);

    let sysIDList = Array.from(
      document.querySelectorAll(`#${table}_table tr`)
    )
      .map((e) => {
        let recordID = e.getAttribute("sys_id");
        if(!recordID) 
          return null;

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
          scriptContent.textContent = JSON.stringify(scriptInfo, null, 2);
          dialogContent.appendChild(scriptContent);

          dialog.showModal();
        };

        div.appendChild(button)
        e.querySelectorAll('.list_decoration_cell')[1].prepend(div)

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
  });
}
