$(document).ready(function () {
  if (!sessionStorage.getItem("session_default_dialog_shown")) {
    frappe.ui.toolbar.setup_session_defaults();
    sessionStorage.setItem("session_default_dialog_shown", "1");
  }

  changeNavbarStyle();

  const newButton = $('<button/>').text("Select Company");
  newButton.on("click", function () {
    frappe.ui.toolbar.setup_session_defaults();
  });
});
const original_logout = frappe.app.logout;

frappe.app.logout = function () {
  // clear your flag so next login runs the dialog
  sessionStorage.removeItem("session_default_dialog_shown");

  // call original logout
  return original_logout.apply(this, arguments);
};