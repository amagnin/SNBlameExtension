function removeVersions() {
  var gr = new GlideRecord("sys_update_version");
  gr.addEncodedQuery( "state!=current^application=9dbfe009c3f7aa106b28bb45990131d0");
  gr.query();

  gr.deleteMultiple();
}

export default removeVersions;
