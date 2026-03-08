// Copyright (c) 2026, r and contributors
// For license information, please see license.txt

frappe.ui.form.on("Packing Production", {
	 after_save(frm) {
        frappe.new_doc("Packing Production");
    }
});
