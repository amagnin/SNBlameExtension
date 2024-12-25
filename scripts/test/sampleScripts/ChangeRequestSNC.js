var ChangeRequestSNC = Class.create();

// Only for legacy types.  Not for models as enforcement is done in the model
ChangeRequestSNC.ENFORCE_DATA_REQ_PROP =
  "com.snc.change_management.enforce_data_requirements";
ChangeRequestSNC.TYPE_COMPATIBILITY =
  "com.snc.change_management.change_model.type_compatibility";
ChangeRequestSNC.MANAGE_WORKFLOW =
  "com.snc.change_management.change_model.manage_workflow";

ChangeRequestSNC.CHANGE_REQUEST_FROM_NEW = "CHANGE_REQUEST_FROM_NEW";

// These constants are used for support of classic 'Mode 1' change types
ChangeRequestSNC.NORMAL = (function (pm) {
  return pm.isActive("com.snc.change_management") ? "normal" : "Comprehensive";
})(pm);

ChangeRequestSNC.STANDARD = (function (pm) {
  return pm.isActive("com.snc.change_management") ? "standard" : "Routine";
})(pm);

ChangeRequestSNC.EMERGENCY = (function (pm) {
  return pm.isActive("com.snc.change_management") ? "emergency" : "Emergency";
})(pm);

// These states are only used to provide the set*, is*, to*, changesTo/From* legacy methods
ChangeRequestSNC.LEGACY_STATE = (function (pm) {
  var stateModelActive = pm.isActive("com.snc.change_management.state_model");
  var foundationActive = pm.isActive("com.snc.change_management.foundation");

  // If state model or foundation is installed
  if (stateModelActive || foundationActive)
    return {
      NEW: "-5",
      ASSESS: "-4",
      AUTHORIZE: "-3",
      SCHEDULED: "-2",
      IMPLEMENT: "-1",
      REVIEW: "0",
      CLOSED: "3",
      CANCELED: "4",
    };

  //if the state model or foundation are not installed use old states
  return {
    NEW: ["-5", "1"], //Pending || Open
    ASSESS: null,
    AUTHORIZE: null,
    SCHEDULED: null,
    IMPLEMENT: "2", // Work in Progress
    REVIEW: "0",
    CLOSED: ["3", "4"], //Closed successful,unsuccessful
    CANCELED: "7",
  };
})(pm);

ChangeRequestSNC.prototype = {
  APPROVAL: {
    REQUESTED: "requested",
    APPROVED: "approved",
    REJECTED: "rejected",
    NOT_REQUESTED: "not requested",
  },

  STATE: "state",

  SUCCESSFUL: "successful",
  UNSUCCESSFUL: "unsuccessful",
  SUCCESSFUL_ISSUES: "successful_issues",
  REQUESTED: "requested",
  APPROVED: "approved",
  REJECTED: "rejected",
  NOT_REQUESTED: "not requested",
  EMERGENCY_WORKFLOW: "Change Request - Emergency",
  STANDARD_WORKFLOW: "Change Request - Standard",
  NORMAL_WORKFLOW: "Change Request - Normal",

  initialize: function (changeGr) {
    this._log = new GSLog(ChangeCommon.LOG_PROPERTY, this.type);
    this._gr = changeGr;
    this._typeCompatibility =
      gs.getProperty(ChangeRequestSNC.TYPE_COMPATIBILITY, "false") === "true";

    this.plugin = {
      change_management: pm.isActive("com.snc.change_management"),
      foundation: pm.isActive("com.snc.change_management.foundation"),
      state_model: pm.isActive("com.snc.change_management.state_model"),
      change_model: pm.isActive("com.snc.change_management.change_model"),
      best_practice: {
        jakarta: pm.isActive("com.snc.best_practice.change.jakarta"),
        kingston: pm.isActive("com.snc.best_practice.change.kingston"),
      },
    };

    this._api = null; // The API in use

    // Used to checks if the gr has been navigated without instanciating a new object
    this._idChk = null;
  },

  // Returns the appropriate API to use for the given change request
  _getAPI: function () {
    if (this._api !== null && this._idChk === this._gr.getUniqueValue())
      return this._api;

    this._idChk = this._gr.getUniqueValue();

    if (
      this.plugin.change_model &&
      this._gr.isValidField("chg_model") &&
      !this._gr.chg_model.nil()
    ) {
      this._api = new ChangeModelChgReqAPI(this._gr);
      return this._api;
    }

    if (this.plugin.state_model) {
      this._api = new ChangeTypeChgReqAPI(this._gr);
      return this._api;
    }

    this._api = new ChangeRequestChgReqAPI(this._gr);
    return this._api;
  },

  // Returns the value of field configured to hold state for this type/model of CHange Request
  getState: function () {
    return this._gr.getValue(this.getStateFieldName());
  },

  // New Model Methods

  //Returns the name of the field configured to hold state for the type/model of this Change Request
  getStateFieldName: function () {
    var api = this._getAPI();
    if (!api.getStateFieldName) return this.STATE;

    return api.getStateFieldName();
  },

  // Returns the initial state value for the type/model of this Change Request
  getInitialState: function () {
    var api = this._getAPI();
    if (!api.getInitialState) {
      var defaultValue = sys_meta.change_request.state.default_value;
      if (defaultValue === "" || defaultValue.startsWith("javascript:"))
        return "-5"; //New in both state models
      else return defaultValue;
    }

    return api.getInitialState();
  },

  // Returns true if this Change Request is in the initial state for this type/model
  isInitialState: function () {
    return this._getAPI().isInitialState();
  },

  //Returns true if the Change Request changes to the initial state
  changesToInitialState: function () {
    var api = this._getAPI();
    if (api.changesToInitialState) return api.changesToInitialState();

    return api.changesToNew();
  },

  //Returns true if the Change Request changes from the initial state
  changesFromInitialState: function () {
    var api = this._getAPI();
    if (api.changesFromInitialState) return api.changesFromInitialState();

    return api.changesFromNew();
  },

  // Reverts the Change Request to the initial state defined for this type/model
  revertToInitialState: function () {
    return this._getAPI().revertToInitialState();
  },

  // Returns true if this Change Request is in a Terminal State.  A Terminal State is defined as
  // a state without any transitions.
  isTerminalState: function () {
    return this._getAPI().isTerminalState();
  },

  // Returns true if the Change Request state is equivalent to the provided state
  isState: function (stateValue) {
    return this._getAPI().isState(stateValue);
  },

  // Returns true if the provided state is valid as a transition for the current Change Request
  isNextState: function (stateValue) {
    return this._getAPI().isNextState(stateValue);
  },

  // Returns true if the provided state is valid as a non-automated transition for the current Change Request
  // Defaults to isNextState
  isNextManualState: function (stateValue) {
    var api = this._getAPI();
    if (api.isNextManualState) return api.isNextManualState(stateValue);

    return this.isNextState(stateValue);
  },

  // Returns a list of all transition states available from the Change Request's current state
  getNextStates: function () {
    return this._getAPI().getNextStates();
  },

  // Returns a list of manual transition states available for the Change Request's current state
  // Defaults to getNextStates
  getNextManualStates: function () {
    var api = this._getAPI();
    if (api.getNextManualStates) return api.getNextManualStates();

    return this.getNextStates();
  },

  // Sets the state field configured for this Change Request to the provided value
  // if the Change Request can move to that value
  moveTo: function (stateValue) {
    return this._getAPI().moveTo(stateValue);
  },

  //Returns true if the Change Request can move from it's current state to the provided state
  canMoveTo: function (stateValue) {
    return this._getAPI().canMoveTo(stateValue);
  },

  /* Evaluates a move to the provided state from the Change Request's current state
   * This method returns the evaluation information for the state move.  As a minimum
   * it will return the following structure:
   * {
   *		from_state: "current state value",
   *		to_state: "transition state value",
   *		transiton_available: true/false
   * }
   *
   * If Change Models are being used aditional information is returned:
   * {
   *		sys_id: "sys_id of the sttrm_state_transition evaluated",
   *		display_value: "Display Value of the sttrm_state_transition",
   *		from_state: "current state value",
   *		to_state: "transition state value",
   *		transition_available: true/false,
   *		conditions: [ // An array of conditions evaluated for the transition
   *		{
   *			"passed": true/false,
   *			"condition": {
   *				"name": "Name given to the condition",
   *				"description": "Description of the condition",
   *				"sys_id": "sys_id of the condition"
   *			}
   *		}
   *		...
   *		]
   * }
   */
  evaluateMoveTo: function (stateValue, returnAll) {
    return this._getAPI().evaluateMoveTo(stateValue, returnAll);
  },

  // Returns true if the Change Request is in the defined 'implementation' state
  canImplement: function () {
    var api = this._getAPI();
    if (api.canImplement) return api.canImplement();

    return api.isImplement();
  },

  // Legacy state specific methods.  In all cases use the new state agnostic methods (above) instead.
  isNew: function () {
    return this._getAPI().isNew();
  },

  changesToNew: function () {
    return this._getAPI().changesToNew();
  },

  changesFromNew: function () {
    return this._getAPI().changesFromNew();
  },

  setNew: function () {
    return this._getAPI().setNew();
  },

  toNew: function () {
    return this._getAPI().toNew();
  },

  // Legacy method from type change requests.  Use revertToInitialState with an update instead.
  revertToNew: function () {
    var api = this._getAPI();
    if (!api.revertToNew) {
      if (api.revertToInitialState()) return !!this._gr.update();

      return false;
    }

    return api.revertToNew();
  },

  /**
   * Assess -- used internally by the change request workflows.
   */
  isAssess: function () {
    return this._getAPI().isAssess();
  },

  changesToAssess: function () {
    return this._getAPI().changesToAssess();
  },

  setAssess: function () {
    return this._getAPI().setAssess();
  },

  assess: function () {
    return this._getAPI().assess();
  },

  isAuthorize: function () {
    return this._getAPI().isAuthorize();
  },

  changesToAuthorize: function () {
    return this._getAPI().changesToAuthorize();
  },

  setAuthorize: function () {
    return this._getAPI().setAuthorize();
  },

  authorize: function () {
    return this._getAPI().authorize();
  },

  isScheduled: function () {
    return this._getAPI().isScheduled();
  },

  changesToScheduled: function () {
    return this._getAPI().changesToScheduled();
  },

  setScheduled: function () {
    return this._getAPI().setScheduled();
  },

  scheduled: function () {
    return this._getAPI().scheduled();
  },

  isImplement: function () {
    return this._getAPI().isImplement();
  },

  changesToImplement: function () {
    return this._getAPI().changesToImplement();
  },

  setImplement: function () {
    return this._getAPI().setImplement();
  },

  implement: function () {
    return this._getAPI().implement();
  },

  isReview: function () {
    return this._getAPI().isReview();
  },

  changesToReview: function () {
    return this._getAPI().changesToReview();
  },

  setReview: function () {
    return this._getAPI().setReview();
  },

  review: function () {
    return this._getAPI().review();
  },

  /**
   * Close
   */
  isClosed: function () {
    return this._getAPI().isClosed();
  },

  changesToClosed: function () {
    return this._getAPI().changesToClosed();
  },

  isClosedSuccessful: function () {
    return this._getAPI().isClosedSuccessful();
  },

  isClosedSuccessfulWithIssues: function () {
    return this._getAPI().isClosedSuccessfulWithIssues();
  },

  isClosedUnsuccessful: function () {
    return this._getAPI().isClosedUnsuccessful();
  },

  setClose: function (closeCode, closeNotes) {
    return this._getAPI().setClose(closeCode, closeNotes);
  },

  close: function (closeCode, closeNotes) {
    return this._getAPI().close(closeCode, closeNotes);
  },

  closeSuccessful: function (closeNotes) {
    return this._getAPI().closeSuccessful(closeNotes);
  },

  closeSuccessfulWithIssues: function (closeNotes) {
    return this._getAPI().closeSuccessfulWithIssues(closeNotes);
  },

  closeUnsuccessful: function (closeNotes) {
    return this._getAPI().closeUnsuccessful(closeNotes);
  },

  /**
   * Cancel
   */
  isCanceled: function () {
    return this._getAPI().isCanceled();
  },

  changesToCanceled: function () {
    return this._getAPI().changesToCanceled();
  },

  setCancel: function () {
    return this._getAPI().setCancel();
  },

  cancel: function () {
    return this._getAPI().cancel();
  },

  /**
   * Approvals
   */
  isApprovalRequested: function () {
    var api = this._getAPI();
    if (api.isApprovalRequested) return api.isApprovalRequested();

    return this._gr.getValue("approval") === this.APPROVAL.REQUESTED;
  },

  isApproved: function () {
    var api = this._getAPI();
    if (api.isApproved) return api.isApproved();

    return this._gr.getValue("approval") === this.APPROVAL.APPROVED;
  },

  isRejected: function () {
    var api = this._getAPI();
    if (api.isRejected) return api.isRejected();

    return this._gr.getValue("approval") === this.APPROVAL.REJECTED;
  },

  // Legacy transition method.  The transtition to an approval state may not exist in a Change model
  // Use moveTo(state) as an alternative
  setRequestApproval: function () {
    var api = this._getAPI();
    if (api.setRequestApproval) return api.setRequestApproval();

    this._gr.setValue("approval", this.APPROVAL.REQUESTED);
    return true;
  },

  // Legacy method.  The transtition to an approval state may not exist in a Change model
  // Use moveTo(state) and update the record  as an alternative
  requestApproval: function () {
    var api = this._getAPI();
    if (api.requestApproval) return api.requestApproval();

    if (this.setRequestApproval()) return !!this._gr.update();
    return false;
  },

  isOnHold: function () {
    if (this.plugin.state_model || this.plugin.foundation)
      return this._gr.getValue("on_hold") === "1";

    return false;
  },

  onHoldChanges: function () {
    if (this.plugin.state_model || this.plugin.foundation)
      return this._gr.on_hold.changes();

    return false;
  },

  onHoldReasonChanges: function () {
    if (this.plugin.state_model || this.plugin.foundation)
      return this._gr.on_hold_reason.changes();

    return false;
  },

  syncOnHoldTasks: function () {
    if (
      !this.plugin.best_practice.jakarta &&
      !this.plugin.best_practice.kingston
    )
      return;

    var updatedTasks = [];

    if (!this._gr.on_hold_task.nil())
      updatedTasks = this._gr.getValue("on_hold_task").split(",");

    var cTaskGR = new GlideRecord("change_task");
    cTaskGR.addQuery("change_request", this._gr.getUniqueValue());
    cTaskGR.addActiveQuery();

    cTaskGR.query();
    while (cTaskGR.next()) {
      if (this._gr.on_hold) {
        if (cTaskGR.on_hold_reason.nil()) {
          new ChangeTask(cTaskGR).onHold(
            this._gr.on_hold,
            this._gr.getValue("on_hold_reason")
          );
          updatedTasks.push(cTaskGR.getUniqueValue());
        }
      } else {
        if (updatedTasks.indexOf(cTaskGR.getUniqueValue()) > -1)
          new ChangeTask(cTaskGR).onHold(this._gr.on_hold, "");
      }
    }

    if (this._gr.on_hold)
      this._gr.setValue("on_hold_task", updatedTasks.join());
    else this._gr.setValue("on_hold_task", "");

    this._gr.update();
  },

  updateOnHoldReason: function () {
    if (
      !this.plugin.best_practice.jakarta &&
      !this.plugin.best_practice.kingston
    )
      return;

    if (this._gr.on_hold_task.nil()) return;

    var cTaskGR = new GlideRecord("change_task");
    cTaskGR.addQuery(
      "sys_id",
      this._gr.on_hold_task.getGlideList().getValues()
    );
    cTaskGR.query();

    while (cTaskGR.next())
      new ChangeTask(cTaskGR).onHoldReason(this._gr.getValue("on_hold_reason"));
  },

  addToOnHoldTaskList: function (taskID) {
    if (
      !this.plugin.best_practice.jakarta &&
      !this.plugin.best_practice.kingston
    )
      return;

    var updatedTasks = [];
    if (!this._gr.on_hold_task.nil())
      updatedTasks = this._gr.getValue("on_hold_task").split(",");

    if (updatedTasks.indexOf(taskID) == -1) updatedTasks.push(taskID);

    this._gr.setValue("on_hold_task", updatedTasks.join());
    this._gr.update();
  },

  cancelAssociatedTasks: function () {
    if (!this.plugin.best_practice.jakarta) return;

    var cTaskGR = new GlideRecord("change_task");
    cTaskGR.addQuery("change_request", this._gr.getUniqueValue());
    cTaskGR.addActiveQuery();

    cTaskGR.query();
    while (cTaskGR.next())
      new ChangeTask(cTaskGR).cancel(
        gs.getMessage(
          "Change task cancelled due to Change request being cancelled"
        )
      );
  },

  hasOpenTasks: function () {
    var cTaskAgg = new GlideAggregate("change_task");
    cTaskAgg.addQuery("change_request", this._gr.getUniqueValue());
    cTaskAgg.addActiveQuery();
    cTaskAgg.addAggregate("COUNT");

    cTaskAgg.query();
    if (cTaskAgg.next()) return cTaskAgg.getAggregate("COUNT") > 0;

    return false;
  },

  // Legacy method to check if a change can modify it's type.  Do not use.
  modifyType: function (previousType) {
    var api = this._getAPI();
    if (api.modifyType) api.modifyType(previousType);
  },

  // Legacy method for managing workflows
  deleteDefaultWorkflowContext: function () {
    var api = this._getAPI();
    if (api.deleteDefaultWorkflowContext) api.deleteDefaultWorkflowContext();
  },

  // Legacy choice checking method
  hasValidChoice: function (field, value) {
    var choiceUtils = new TableChoiceUtils("change_request");
    var choices = choiceUtils.getChoicesForField(field);
    return choices.hasOwnProperty(value);
  },

  setValue: function (name, value) {
    this._gr.setValue(name, value);
  },

  getValue: function (name) {
    return this._gr.getValue(name);
  },

  setDisplayValue: function (name, value) {
    this._gr.setDisplayValue(name, value);
  },

  getDisplayValue: function (name) {
    return this._gr.getDisplayValue(name);
  },

  insert: function () {
    return this._gr.insert();
  },

  update: function () {
    return this._gr.update();
  },

  refreshGlideRecord: function () {
    var gr = new GlideRecord(ChangeRequest.CHANGE_REQUEST);
    if (!gr.get(this._gr.getUniqueValue())) return;

    this.initialize(gr);
  },

  isChangeRequest: function () {
    return this.isValidTable();
  },

  /**
   * Tests for change_request and its extensions
   *
   * @returns boolean
   */
  isValidTable: function () {
    if (!this._gr) return false;

    var tableName = this._gr.getValue("sys_class_name");

    // Short circuit check for change. Defer to GlideDBObjectManager if that fails
    return (
      tableName === ChangeRequest.CHANGE_REQUEST ||
      GlideDBObjectManager.get().isInstanceOf(
        tableName,
        ChangeRequest.CHANGE_REQUEST
      )
    );
  },

  isEnforceData: function () {
    return gs.getProperty(ChangeRequestSNC.ENFORCE_DATA_REQ_PROP) === "true";
  },

  setGlobalFromNew: function (value) {
    GlideController.putGlobal(
      ChangeRequestSNC.CHANGE_REQUEST_FROM_NEW,
      /* boolean */ value
    );
  },

  isGlobalFromNew: function () {
    return (
      GlideController.getGlobal(ChangeRequestSNC.CHANGE_REQUEST_FROM_NEW) +
        "" ===
      "true"
    );
  },

  toString: function () {
    return JSON.stringify(this.toJS());
  },

  toJS: function () {
    return ChangeCommon.toJS(this._gr);
  },

  deleteRecord: ChangeCommon.methods.deleteRecord,
  getGlideRecord: ChangeCommon.methods.getGlideRecord,
  setValues: ChangeCommon.methods.setValues,
  canWriteTo: ChangeCommon.methods.canWriteTo,

  type: "ChangeRequestSNC",
};

ChangeRequestSNC.getAPIClass = function () {
  // Only use the new Model based classes if it's installed and model compatibility is turned off.
  if (
    pm.isActive("com.snc.change_management.change_model") &&
    gs.getProperty(ChangeRequestSNC.TYPE_COMPATIBILITY, "false") !== "true"
  )
    return ChangeModelChgReqAPI;

  if (pm.isActive("com.snc.change_management.state_model"))
    return ChangeTypeChgReqAPI;

  return ChangeRequestChgReqAPI;
};

ChangeRequestSNC.newNormal = function () {
  return ChangeRequestSNC.getAPIClass().newNormal();
};

ChangeRequestSNC.newStandard = function () {
  return ChangeRequestSNC.getAPIClass().newStandard();
};

ChangeRequestSNC.newEmergency = function () {
  return ChangeRequestSNC.getAPIClass().newEmergency();
};

ChangeRequestSNC.newChange = function (modelSysIdOrType) {
  return ChangeRequestSNC.getAPIClass().newChange(modelSysIdOrType);
};
