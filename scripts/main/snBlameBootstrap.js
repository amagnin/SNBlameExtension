((monaco) => {
  if (!monaco) return;

  let fields = {};

  monaco.editor.getEditors().forEach((editor) => {
    let f = editor
      .getContainerDomNode()
      .siblings()
      .find(function (e) {
        return e.tagName.toUpperCase() === "TEXTAREA";
      })
      .id.split(".");

    let field = f[f.length - 1];

    fields[field] = {
        lines: editor.getValue().split("\n"),
        id: f.join('.'),
    }

    editor.addAction({
      id: "show-sn-blame-user",
      label: "SNBlame: Toggle User/Update set",

      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.F10,
        monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F10),
      ],

      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.5,
      run: function (ed) {
        window.postMessage("sn-blame-toggle-user-update-set");
      },
    });

    editor.addAction({
      id: "show-sn-blame-gutter-date",
      label: "SNBlame: Toggle gutter date",

      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.F9,
        monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F9),
      ],

      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.5,
      run: function (ed) {
        window.postMessage("sn-blame-toggle-gutter-date");
      },
    });

    editor.addAction({
      id: "debug-sn-blame-line-numbers",
      label: "SNBlame: Toggle line numbers",

      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.F8,
        monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F8),
      ],

      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.5,
      run: function (ed) {
        window.postMessage("sn-blame-toggle-line-numbers");
      },
    });

    editor.onDidScrollChange(function (scroll) {
      window.postMessage({ action: "scroll", scroll , field});
    });

    editor.onDidChangeModelContent(function () {
      window.postMessage({
        action: "model-change",
        lines: editor.getValue().split("\n"),
        field
      });
    });

    let placeholderContentWidget = new SNBlamePlaceholderContentWidget(editor);
    window.addEventListener("message", function(event){
        if(event.data.type !== 'diff-update' || event.data.field !== field)
            return;

        placeholderContentWidget.updateDiff(event.data.diff);
        placeholderContentWidget.onCursorChange();
    })
  });

  window.postMessage({
    action: "init",
    options: {
      fields : fields,
      g_ck,
      table: g_form.getTableName(),
      sys_id: g_form.getUniqueValue(),
    },
  });

})(window.monaco);
