function deleteUpdateSetEntry(entries) {
  let ga = new GlideAjax("DeleteUpdateSetEntryAjax");
  ga.addParam("sysparm_name", "deleteEntries");
  ga.addParam("sysparm_entry_ids", entries);

  ga.getXMLWait();
  return;
};

function deleteMultipleRecord(entries, table){
  var ajaxHelper = new GlideAjax('DeleteRecordAjax');
    ajaxHelper.addParam('sysparm_name', 'proceedWithDeleteFromList');
    ajaxHelper.addParam('sysparm_obj_list', entries);
    ajaxHelper.addParam('sysparm_table_name', table);
    ajaxHelper.getXMLWait();
    return true;
}

export default {deleteMultipleRecord, deleteUpdateSetEntry}