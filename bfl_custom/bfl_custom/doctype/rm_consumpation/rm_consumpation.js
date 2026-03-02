// Copyright (c) 2026, r and contributors
// For license information, please see license.txt
frappe.ui.form.on("RM Consumpation", {
    setup(frm) {
        if (frm.fields_dict.items) {
            frm.fields_dict.items.grid.get_field("item").get_query = function(doc, cdt, cdn) {
                return {
                    filters: [
                        ["Item", "item_group", "in", ["Raw Material", "FLAVOUR"]],
                        ["Item", "disabled", "=", 0]
                    ]
                };
            };
        }
    }
});

frappe.ui.form.on("RM Consumpation", {
	  date(frm) {
        if (frm.doc.date) {
            let day_name = frappe.datetime.str_to_obj(frm.doc.date)
                .toLocaleDateString('en-US', { weekday: 'long' });

            frm.set_value("day", day_name);
        }


    }
});