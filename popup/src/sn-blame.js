let options = {
    showUser : false,
    debugLineNumbers: false,
    hideGutterDate : false,
    ignoreWhiteSpace : true,
    startOnAction: true,
    gutterWidth: 200,
};

document.getElementById("toggleUser").addEventListener("change", (event)=>{
    options.showUser = event.currentTarget.checked;
    (chrome || browser).storage.sync.set({'blameOptions': JSON.stringify(options)});
    updateView();
    updateTabs();
});

document.getElementById("toggleDate").addEventListener("change", (event)=>{
    options.hideGutterDate = event.currentTarget.checked;
    (chrome || browser).storage.sync.set({'blameOptions': JSON.stringify(options)});
    updateView();
    updateTabs();
});

document.getElementById("toggleWhitespace").addEventListener("change", (event)=>{
  options.ignoreWhiteSpace = event.currentTarget.checked;
  (chrome || browser).storage.sync.set({'blameOptions': JSON.stringify(options)});
  updateView();
  updateTabs();
});

document.getElementById("toggleLoadType").addEventListener("change", (event)=>{
  options.startOnAction = event.currentTarget.checked;
  (chrome || browser).storage.sync.set({'blameOptions': JSON.stringify(options)});
});

document.getElementById("gutterSize").addEventListener("change", (event)=>{
  options.gutterWidth = event.currentTarget.value;
  document.getElementById("guttervalue").innerText = `${event.currentTarget.value}px`;
  (chrome || browser).storage.sync.set({'blameOptions': JSON.stringify(options)});
  updateTabs();
});

document.getElementById("toggleListHelper").addEventListener("change", (event)=>{
    options.listHelper = event.currentTarget.checked;
    (chrome || browser).storage.sync.set({'blameOptions': JSON.stringify(options)});
    updateTabs();
});

window.onload = function() {
  (chrome || browser).storage.sync.get("blameOptions", (data) => {
    try {
      options.showUser = false;
      options.debugLineNumbers = false;
      options.hideGutterDate = false;
      options.ignoreWhiteSpace = true;
      options.startOnAction = false;
      options.useExtensionIntelisense = true;
      options.listHelper = true;
      options.gutterWidth = 200;
      options.ignoreTableList = [];

      let userOptions = JSON.parse(data.blameOptions)

      Object.keys(userOptions).forEach((key => options[key] = userOptions[key]));
    } catch (e) {
      console.log('Error parsing Blame options')
    } finally{
      document.getElementById("guttervalue").innerText = `${options.gutterWidth}px`;
      document.getElementById("gutterSize").value = options.gutterWidth;
      updateView();
    }
  });

  (chrome || browser).storage.onChanged.addListener((changes, areaName) => {
    try {
      options.showUser = false;
      options.debugLineNumbers = false;
      options.hideGutterDate = false;
      options.ignoreWhiteSpace = true;
      options.startOnAction = false;
      options.useExtensionIntelisense = true;
      options.listHelper = true;
      options.gutterWidth = 200;
      options.ignoreTableList = [];

      let userOptions = JSON.parse(changes.blameOptions.newValue)

      Object.keys(userOptions).forEach((key => options[key] = userOptions[key]));
    } catch (e) {
      console.error('Error parsing Blame options')
    } finally{
      document.getElementById("guttervalue").innerText = `${options.gutterWidth}px`;
      document.getElementById("gutterSize").value = options.gutterWidth;
      updateView();
    }
  });
}

let updateTabs = () => {
    (chrome || browser).tabs.query({currentWindow: true, active: true}, function (tabs){
        var activeTab = tabs[0];
        (chrome || browser).tabs.sendMessage(activeTab.id, {"blameOptions": options, 'action': 'sn-blame-update-options'});
    });
}

let updateView = () => {
    document.getElementById("toggleUser").checked = options.showUser;
    document.getElementById("toggleDate").checked = options.hideGutterDate;
    document.getElementById("toggleWhitespace").checked = options.ignoreWhiteSpace;
    document.getElementById("toggleLoadType").checked = options.startOnAction;
    document.getElementById("toggleLoadType").checked = options.startOnAction;
    document.getElementById("toggleListHelper").checked = options.listHelper;

    document.getElementById("user-label").textContent = options.showUser ? 'Show Update Set': 'Show user';
    document.getElementById("date-label").textContent = options.hideGutterDate ? 'Show gutter date': 'Hide gutter date';
}

document.getElementById("sn-blame-load").addEventListener("click", ()=>{

  (chrome || browser).tabs.query({currentWindow: true, active: true}, function (tabs){
    var activeTab = tabs[0];
    (chrome || browser).tabs.sendMessage(activeTab.id, {'action': 'sn-blame-bootstrap'});
  });

});

document.getElementById("sn-blame-clear-cache").addEventListener("click", (event)=>{
  (chrome || browser).tabs.query({currentWindow: true, active: true}, function (tabs){
    var activeTab = tabs[0];
    (chrome || browser).tabs.sendMessage(activeTab.id, {'action': 'sn-blame-clear-cache'});
  });
});