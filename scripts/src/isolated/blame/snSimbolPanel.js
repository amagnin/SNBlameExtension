export default function () {
  const LISTENERS = {
    "sn-blame-init": (event) => {
      const { g_ck, table, sys_id, fields } = event.detail;

      Object.keys(fields).forEach((field) => {
        let editorElement = document.querySelector(
          `[id='element.${fields[field].id}'] #debugContainer`
        );

        let symbolPanel = document.createElement('DIV');
        symbolPanel.className = 'sn-blame-symbol-panel'
        symbolPanel.innerHTML = 
            `<div><h3>Symbols</h3></div>
            <div id="sn-symbol-content"></div>`

        editorElement.append(symbolPanel);
      });
    },
  };

  Object.keys(LISTENERS).forEach((key) => {
    window.addEventListener(key, LISTENERS[key]);
  });
}
