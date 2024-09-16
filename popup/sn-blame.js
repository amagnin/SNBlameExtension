let options = {
    showUser : false,
    hideGutterDate : false,
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

(chrome || browser).storage.sync.get("blameOptions", (data) => {
  try {
    options = JSON.parse(data.blameOptions);
    updateView();
  } catch (e) {}
});

(chrome || browser).storage.onChanged.addListener((changes, areaName) => {
  try {
    ({ showUser, hideGutterDate } = JSON.parse(changes.newValue.blameOptions));
    updateView();
  } catch (e) {}
});

let updateTabs = () => {
    (chrome || browser).tabs.query({currentWindow: true, active: true}, function (tabs){
        var activeTab = tabs[0];
        (chrome || browser).tabs.sendMessage(activeTab.id, {"blameOptions": options});
    });
}

let updateView = () => {
    document.getElementById("toggleUser").checked = options.showUser;
    document.getElementById("toggleDate").checked = options.hideGutterDate;

    document.getElementById("user-label").textContent = options.showUser ? 'Show Update Set': 'Show User';
    document.getElementById("date-label").textContent = options.hideGutterDate ? 'Show Gutter Date': 'Hide Gutter Date';
}
