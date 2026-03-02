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
    },
    
   
    onload(frm) {

        if (frm.is_new() && (!frm.doc.items || frm.doc.items.length === 0)) {

            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Item",
                    filters: [
                        ["Item Group", "parent_item_group", "=", "Raw Material"],
                        ["Item", "disabled", "=", 0],
                        ["Item", "is_stock_item", "=", 1]
                    ],
                    fields: ["name"],
                    limit_page_length: 1000
                },
                callback: function(r) {
                    if (r.message) {

                        r.message.forEach(function(d) {
                            let row = frm.add_child("items");
                            row.item = d.name;
                        });

                        frm.refresh_field("items");
                    }
                }
            });

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