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

            // STEP 1: Get child item groups of Raw Material
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Item Group",
                    filters: {
                        parent_item_group: "Raw Material"
                    },
                    fields: ["name"],
                    limit_page_length: 1000
                },
                callback: function(res) {

                    if (!res.message || res.message.length === 0) return;

                    let groups = res.message.map(d => d.name);

                    // STEP 2: Get Items under those groups
                    frappe.call({
                        method: "frappe.client.get_list",
                        args: {
                            doctype: "Item",
                            filters: [
                                ["item_group", "in", groups, "Raw Material"],
                                ["disabled", "=", 0],
                                ["is_stock_item", "=", 1]
                            ],
                            fields: ["name"],
                            limit_page_length: 1000,
                            order_by: "name asc"
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
            });
        }
    },
    after_save(frm) {
        frappe.new_doc("RM Consumpation");
    }
});

frappe.ui.form.on("RM Consumpation", {
	  date(frm) {
        if (frm.doc.date) {
            let day_name = frappe.datetime.str_to_obj(frm.doc.date)
                .toLocaleDateString('en-US', { weekday: 'long' });

            frm.set_value("day", day_name);
        }


    },


 validate(frm) {
        if (!frm.doc.date) return;

        return frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "RM Consumpation",
                filters: {
                    date: frm.doc.date,
                    name: ["!=", frm.doc.name]  // exclude current doc while editing
                },
                fields: ["name"],
                limit_page_length: 1
            }
        }).then(r => {
            if (r.message && r.message.length > 0) {
                frappe.throw("RM Consumpation already exists for this date.");
            }
        });
    }
});