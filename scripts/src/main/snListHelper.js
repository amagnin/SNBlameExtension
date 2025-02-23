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

  if (!/_list(\.do)?$/i.test(location.pathname)) 
    return;

  window.addEventListener("sn-list-helper-response", (event) => {
    const { parsedScripts } = event.detail;
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

    let sysIDList = Array.from(
      document.querySelectorAll(`#${table}_table tr`)
    )
      .map((e) => e.getAttribute("sys_id"))
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
