function previewRemoteUpdateSet(sysId) {
	var MESSAGE_KEY_DIALOG_TITLE = "Update Set Preview";
	var MESSAGE_KEY_CLOSE_BUTTON = "Close";
	var MESSAGE_KEY_CANCEL_BUTTON = "Cancel";
	var MESSAGE_KEY_CONFIRMATION = "Confirmation";
	var MESSAGE_KEY_CANCEL_CONFIRM_DIALOG_TILE = "Are you sure you want to cancel this update set preview?";
	var map = new GwtMessage().getMessages([MESSAGE_KEY_DIALOG_TITLE, MESSAGE_KEY_CLOSE_BUTTON, MESSAGE_KEY_CANCEL_BUTTON, MESSAGE_KEY_CONFIRMATION, MESSAGE_KEY_CANCEL_CONFIRM_DIALOG_TILE]);
	var dialogClass = window.GlideModal ? GlideModal : GlideDialogWindow;
	var dd = new dialogClass("hierarchical_progress_viewer", false, "40em", "10.5em");

	dd.setTitle(map[MESSAGE_KEY_DIALOG_TITLE]);
	dd.setPreference('sysparm_ajax_processor', 'UpdateSetPreviewAjax');
	dd.setPreference('sysparm_ajax_processor_function', 'preview');
	dd.setPreference('sysparm_ajax_processor_sys_id', sysId);
	dd.setPreference('sysparm_renderer_expanded_levels', '0'); 
	dd.setPreference('sysparm_renderer_hide_drill_down', true);
	dd.setPreference('focusTrap', true);

	dd.setPreference('sysparm_button_close', map["Close"]);

    dd.on("executionStarted", function(response) {
		var trackerId = response.responseXML.documentElement.getAttribute("answer");

		var cancelBtn = new Element("button", {
			'id': 'sysparm_button_cancel',
			'type': 'button',
			'class': 'btn btn-default',
			'style': 'margin-left: 5px; float:right;'
		}).update(map[MESSAGE_KEY_CANCEL_BUTTON]);

        cancelBtn.onclick = function() {
			var dialog = new GlideModal('glide_modal_confirm', true, 300);
			dialog.setTitle(map[MESSAGE_KEY_CONFIRMATION]);
			dialog.setPreference('body', map[MESSAGE_KEY_CANCEL_CONFIRM_DIALOG_TILE]);
			dialog.setPreference('focusTrap', true);
			dialog.setPreference('callbackParam', trackerId);
			dialog.setPreference('defaultButton', 'ok_button');
			dialog.setPreference('onPromptComplete', function(param) {
				var cancelBtn2 = $("sysparm_button_cancel");
				if (cancelBtn2)
					cancelBtn2.disable();
				var ajaxHelper = new GlideAjax('UpdateSetPreviewAjax');
				ajaxHelper.addParam('sysparm_ajax_processor_function', 'cancelPreview');
				ajaxHelper.addParam('sysparm_ajax_processor_tracker_id', param);
				ajaxHelper.getXMLAnswer(_handleCancelPreviewResponse);
			});
			dialog.render();
			dialog.on("bodyrendered", function() {
				var okBtn = $("ok_button");
				if (okBtn) {
					okBtn.className += " btn-destructive";
				}
			});
        };

		var _handleCancelPreviewResponse = function(answer) {
			var cancelBtn = $("sysparm_button_cancel");
			if (cancelBtn)
				cancelBtn.remove();
		};

        var buttonsPanel = $("buttonsPanel");
        if (buttonsPanel)
        	buttonsPanel.appendChild(cancelBtn);
	});

	dd.on("executionComplete", function(trackerObj) {
		var cancelBtn = $("sysparm_button_cancel");
		if (cancelBtn)
			cancelBtn.remove();
		
		var closeBtn = $("sysparm_button_close");
		if (closeBtn) {
			closeBtn.onclick = function() {
				dd.destroy();
			};
		}
	});
	
	dd.on("beforeclose", function() {});
	dd.render();
}

export default previewRemoteUpdateSet;