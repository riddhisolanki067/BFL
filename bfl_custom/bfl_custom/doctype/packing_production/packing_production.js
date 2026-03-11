// Copyright (c) 2026, r and contributors
// For license information, please see license.txt

frappe.ui.form.on("Packing Production", {
	 after_save(frm) {
        frappe.new_doc("Packing Production");
    },
    date(frm) {
        if (!frm.doc.date) return;

        return frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Packing Production",
                filters: {
                    date: frm.doc.date,
                    name: ["!=", frm.doc.name]  // exclude current doc while editing
                },
                fields: ["name"],
                limit_page_length: 1
            }
        }).then(r => {
            if (r.message && r.message.length > 0) {
                frappe.throw("Packing Production already exists for this date.");
            }
        });
    }
});
