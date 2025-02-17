import SNBlamePlaceholderContentWidget from "./SNBlamePlaceholderContentWidget.js";

/**
 * Closure
 */
(function snBlamebootstrap(){
  /**
   * @typedef MonacoEditor
   * @type {object}
   * @see {@link https://microsoft.github.io/monaco-editor/typedoc/modules/editor.html}
   */

  const snBlameOptions = {
    useExtensionIntelisense: false,
  }



  /**
   * triggers the Blame part of the extension if the monaco global object is available on the page
   * 
   * @param {Object} monaco ServiceNow global monaco object
   * 
   */
  const snBlamebootstrap = (monaco) => {
    if (!monaco || typeof monaco?.editor?.getEditors !== 'function') return;

    let fields = {};

    let originalMonacoIntelisense = GlideEditorMonaco.prototype.addIntellisenseforScriptInclude;
    GlideEditorMonaco.prototype.addIntellisenseforScriptInclude = function(){
      if(!window.disableExtensionIntelisense) return;

      originalMonacoIntelisense.apply(this, arguments);
    }

    /**
     * @typedef MonacoToken
     * @type {Object}
     * @property offset {number} start index of the token on the line
     * @property type {string} type of token {'keyword.js' | 'identifier.js' | 'type.identifier.js'}
     * @property language {string} language of the monaco editor
    */

    /**
     * Reduce function to get array of posible script includes (classes)
     * 
     * @param {Array<string>} acc Accumulator
     * @param {MonacoToken} item Token Element from the Array to reduce
     * @param {number} index index of the item
     * @param {Array<MonacoToken>} arr full array
     * @returns {Array<string>}
     */
    const snBlameGetPosibleClassTokens = (lineContent) => (acc, item, index, arr) => {
      let startIndex = item.offset;
      let endIndex = arr[index + 1] && arr[index + 1].offset;

      let previousStartIndex = arr[index - 1] && arr[index - 1].offset;
      if(item.type === 'identifier.js' || item.type === 'type.identifier.js'){
          let prevoiusString = lineContent.substring(previousStartIndex, startIndex);
          let scope = g_scratchpad?.scope
          if(prevoiusString === '.'){
            scope = acc[acc.length - 1]?.string || g_scratchpad?.scope;
          }
          let string = lineContent.substring(startIndex, endIndex);
          acc.push({string, type:item.type, scope})
      }
      return acc;
    };

    const fullScriptIntelisense = function(editor, field){
      /*let model = editor.getModel(); 
      let lineCount = model.getLineCount();
      let count = 1;
      let tokens = []

      while(count <= lineCount){
        let lineContent = model.getLineContent(count)
        let lineTokens = monaco.editor.tokenize(lineContent, 'javascript')[0].reduce(snBlameGetPosibleClassTokens(lineContent), [])

        tokens = tokens.concat(lineTokens);
        count++;
      }*/

      window.dispatchEvent(
        new CustomEvent("sn-check-full-script",{
          detail: {
            script: editor.getValue(),
            field,
            currentScope: g_scratchpad?.scope,
          },
        })
      )
    };

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

      let model = editor.getModel();
      let updatedLines = [];
      let debounceTimer;

      let monacoDebounce = function(func, timeout = 300){
        return (...args) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
      }

      editor.onDidChangeModelContent(function(event) {
        window.dispatchEvent(
          new CustomEvent("sn-blame-model-change", {
            detail: {
              script: editor.getValue(),
              field,
            },
          })
        );

        if(window.disableExtensionIntelisense) return
        
        updatedLines = updatedLines.concat(event.changes.reduce((acc, ch)=> {
          let lineRange =  ch.range.endLineNumber - ch.range.startLineNumber;
          if(lineRange >= 0){
            let count = ch.range.startLineNumber
            while(count <= ch.range.endLineNumber){
              acc.push(count)
              count ++
            }
          }
          return acc;
        }, [])).filter((e,i,arr) => arr.indexOf(e) === i);
        
        monacoDebounce(function(){
          let tokens = updatedLines.reduce((acc, lineNumber) => {
            let lineContent = model.getLineContent(lineNumber)
            let lineTokens = monaco.editor.tokenize(lineContent, 'javascript')[0].reduce(snBlameGetPosibleClassTokens(lineContent), [])
            return acc.concat(lineTokens)
          },[]);

          window.dispatchEvent(
            new CustomEvent("sn-check-tokens",{
              detail: {
                tokens: tokens,
                field,
                currentScope: g_scratchpad?.scope,
              },
            })
          )

          updatedLines = [];
        }, 300)();      

        
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

      window.addEventListener("sn-blame-trigger-full-script-intelisense", function (event) {
        if(!window.disableExtensionIntelisense)
          fullScriptIntelisense(editor, field);
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

    window.addEventListener("sn-load-library", (event) => {
      const { libs } = event.detail;
      libs.forEach((lib)=> monaco.languages.typescript.javascriptDefaults.addExtraLib(lib));
    })
  };

  window.addEventListener("sn-blame-start", () => {
    if (typeof monaco !== "undefined") snBlamebootstrap(monaco);
  });
})();