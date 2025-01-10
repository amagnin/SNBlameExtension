let snBlamebootstrap = (monaco) => {
  if (!monaco || typeof monaco?.editor?.getEditors !== 'function') return;

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
      id: f.join("."),
    };

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
        window.dispatchEvent(
          new CustomEvent("sn-blame-toggle-user-update-set")
        );
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
        window.dispatchEvent(new CustomEvent("sn-blame-toggle-gutter-date"));
      },
    });

    editor.addAction({
      id: "show-sn-blame-whitespace",
      label: "SNBlame: Toggle whitespace",

      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.5,
      run: function (ed) {
        window.dispatchEvent(new CustomEvent("sn-blame-toggle-whitespace"));
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
        window.dispatchEvent(new CustomEvent("sn-blame-toggle-line-numbers"));
      },
    });

    /** Mutation observer on the monaco gutter is smoother than the editor.onDidScrollChange **/
    let scrollObserver = new MutationObserver(() => {
      let scroll = {
        scrollHeight: editor.getScrollHeight(),
        scrollTop: editor.getScrollTop(),
      };
      window.dispatchEvent(
        new CustomEvent("sn-blame-scroll", { detail: { scroll, field } })
      );
    });

    let editorElement = document.querySelector(
      `[id='element.${fields[field].id}'] #debugContainer`
    );

    scrollObserver.observe(
      editorElement.querySelector(".margin-view-overlays"),
      {
        childList: true,
        subtree: true,
      }
    );

    editor.onDidChangeModelContent(function () {
      window.dispatchEvent(
        new CustomEvent("sn-blame-model-change", {
          detail: {
            lines: editor.getValue().split("\n"),
            field,
          },
        })
      );
    });

    let placeholderContentWidget = new SNBlamePlaceholderContentWidget(editor);
    window.addEventListener("sn-blame-diff-update", function (event) {
      if (event.detail.field !== field) return;

      let diff = event.detail.diff;

      placeholderContentWidget.updateDiff(diff);
      placeholderContentWidget.onCursorChange();
    });

    window.addEventListener("sn-blame-get-scroll-position", (event) => {
      if (event.detail.field !== field) return;
      let scroll = {
        scrollHeight: editor.getScrollHeight(),
        scrollTop: editor.getScrollTop(),
      };
  
      window.dispatchEvent(
        new CustomEvent("sn-blame-scroll", { detail: { scroll, field } })
      );
    });

  });

  window.dispatchEvent(
    new CustomEvent("sn-blame-init", {
      detail: {
        fields: fields,
        g_ck,
        table: g_form.getTableName(),
        sys_id: g_form.getUniqueValue(),
      },
    })
  );
};

window.addEventListener("sn-blame-start", () => {
  if (typeof monaco !== "undefined") snBlamebootstrap(monaco);
});