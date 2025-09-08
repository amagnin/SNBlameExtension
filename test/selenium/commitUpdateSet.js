function commitRemoteUpdateSet(sys_id) {
  var commitInProgress = false;

  function getValidateCommitUpdateSetResponse(answer) {
    try {
      if (answer == null) {
        return;
      }
      
      var returnedInfo = answer.split(";");

      var sysId = returnedInfo[0];
      var encodedQuery = returnedInfo[1];
      var delObjList = returnedInfo[2];

      if (delObjList !== "NONE") {
        showDataLossConfirmDialog(sysId, delObjList, encodedQuery);
      } else {
        var ga = new GlideAjax("UpdateSetCommitAjax");
        ga.addParam("sysparm_type", "shouldShowConfirmAppInstall");
        ga.addParam("sysparm_rus_sys_id", sysId);
        ga.addParam("sysparm_in_hierarchy", false);
        ga.getXMLWait();
        var showDialog = ga.getAnswer();
        if (showDialog == "true") {
          var dialogClass = window.GlideModal ? GlideModal : GlideDialogWindow;
          var dialog = new dialogClass("commit_app_install_confirm");
          dialog.setTitle(getMessage("Confirm app installs"));
          dialog.setWidth(450);
          dialog.setPreference("onConfirm", runTheCommit);
          dialog.setPreference("rus_sys_id", sysId);
          dialog.setPreference("in_hierarchy", false);
          dialog.render();
        } else runTheCommit(sysId, false, false);
      }
    } catch (err) {}
  }

  function runTheCommit(sysId, skipAppInstalls, dontDisplayAgain) {
    if (dontDisplayAgain) disableConfirmAppInstallDialog();

    commitInProgress = true;
    var ajaxHelper = new GlideAjax(
      "com.glide.update.UpdateSetCommitAjaxProcessor"
    );
    ajaxHelper.addParam("sysparm_type", "commitRemoteUpdateSet");
    ajaxHelper.addParam("sysparm_remote_updateset_sys_id", sysId);
    if (
      skipAppInstalls != null &&
      typeof skipAppInstalls !== "undefined" &&
      skipAppInstalls
    )
      ajaxHelper.addParam("sysparm_skip_app_installs", true);
    else ajaxHelper.addParam("sysparm_skip_app_installs", false);

    ajaxHelper.getXMLAnswer(getCommitRemoteUpdateSetResponse);
  }

  function disableConfirmAppInstallDialog() {
    var ga = new GlideAjax("UpdateSetCommitAjax");
    ga.addParam("sysparm_type", "setShowConfirmAppInstallPreference");
    ga.addParam("sysparm_show_confirm_app_install", "false");
    ga.getXMLWait();
  }

  var dataLossConfirmDialog;
  function destroyDialog() {
    dataLossConfirmDialog.destroy();
  }

  function showDataLossConfirmDialog(sysId, delObjList, encodedQuery) {
    var dialogClass =
      typeof GlideModal != "undefined" ? GlideModal : GlideDialogWindow;
    var dlg = new dialogClass("update_set_data_loss_commit_confirm");
    dataLossConfirmDialog = dlg;
    dlg.setTitle("Confirm Data Loss");
    if (delObjList == null) {
      dlg.setWidth(300);
    } else {
      dlg.setWidth(450);
    }

    dlg.setPreference("sysparm_sys_id", sysId);
    dlg.setPreference("sysparm_encodedQuery", encodedQuery);
    dlg.setPreference("sysparm_del_obj_list", delObjList);
    dlg.render();
  }

  function getCommitRemoteUpdateSetResponse(answer) {
    try {
      if (answer == null) return;

      var map = new GwtMessage().getMessages([
        "Close",
        "Cancel",
        "Are you sure you want to cancel this update set?",
        "Update Set Commit",
        "Go to Subscription Management",
      ]);

      var returnedIds = answer.split(",");

      var workerId = returnedIds[0];
      var sysId = returnedIds[1];
      var shouldRefreshNav = returnedIds[2];
      var shouldRefreshApps = returnedIds[3];
      var dialogClass = window.GlideModal ? GlideModal : GlideDialogWindow;
      var dd = new dialogClass(
        "hierarchical_progress_viewer",
        false,
        "40em",
        "10.5em"
      );
      dd.setTitle(map["Update Set Commit"]);
      dd.setPreference("sysparm_renderer_execution_id", workerId);
      dd.setPreference("sysparm_renderer_expanded_levels", "0"); // collapsed root node by default
      dd.setPreference("sysparm_renderer_hide_drill_down", true);

      dd.setPreference(
        "sysparm_button_subscription",
        map["Go to Subscription Management"]
      );
      dd.setPreference("sysparm_button_close", map["Close"]);

      dd.on("bodyrendered", function (trackerObj) {
        var buttonsPanel = $("buttonsPanel");
        var table = new Element("table", {
          cellpadding: 0,
          cellspacing: 0,
          width: "100%",
        });
        buttonsCell = table
          .appendChild(new Element("tr"))
          .appendChild(new Element("td"));
        buttonsCell.align = "right";
        buttonsPanel.appendChild(table);

        var closeBtn = $("sysparm_button_close");
        if (closeBtn) closeBtn.disable();

        var cancelBtn = new Element("button");
        cancelBtn.id = "sysparm_button_cancel";
        cancelBtn.type = "button";
        cancelBtn.innerHTML = map["Cancel"];
        cancelBtn.onclick = function () {
          var response = confirm(
            map["Are you sure you want to cancel this update set?"]
          );
          if (response != true) return;

          var ajaxHelper = new GlideAjax("UpdateSetCommitAjax");
          ajaxHelper.addParam("sysparm_type", "cancelRemoteUpdateSet");
          ajaxHelper.addParam("sysparm_worker_id", workerId);
          ajaxHelper.getXMLAnswer(getCancelRemoteUpdateSetResponse);
        };
        buttonsCell.appendChild(cancelBtn);
      });

      dd.on("executionComplete", function (trackerObj) {
        var subBtn = $("sysparm_button_subscription");
        var tableCount = 0;
        if (trackerObj.result && trackerObj.result.custom_table_count)
          tableCount = Number(trackerObj.result.custom_table_count);

        if (tableCount > 0) {
          if (subBtn) {
            subBtn.enable();
            subBtn.onclick = function () {
              window.open(trackerObj.result.inventory_uri);
            };
          }
        } else {
          subBtn.hide();
        }

        var closeBtn = $("sysparm_button_close");
        if (closeBtn) {
          closeBtn.enable();
          closeBtn.onclick = function () {
            dd.destroy();
          };
        }

        var cancelBtn = $("sysparm_button_cancel");
        if (cancelBtn) cancelBtn.hide();
      });

      dd.on("beforeclose", function () {});

      dd.render();
    } catch (err) {}
  }

  function getCancelRemoteUpdateSetResponse(answer) {
    if (answer == null) return;
  }

  (function (sys_id) {
    if (commitInProgress) return;

    var ajaxHelper = new GlideAjax(
      "com.glide.update.UpdateSetCommitAjaxProcessor"
    );
    ajaxHelper.addParam("sysparm_type", "validateCommitRemoteUpdateSet");
    ajaxHelper.addParam("sysparm_remote_updateset_sys_id", sys_id);
    ajaxHelper.getXMLAnswer(getValidateCommitUpdateSetResponse);
  })(sys_id)
}

export default commitRemoteUpdateSet;