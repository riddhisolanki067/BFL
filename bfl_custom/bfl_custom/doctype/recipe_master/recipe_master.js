// Copyright (c) 2026, r and contributors
// For license information, please see license.txt

frappe.ui.form.on("RECIPE MASTER", {
    before_save: function(frm) {

        let total_qty = 0;
        let total_yield = 0;
        let total_loss = 0;
        let total_moisture = 0;
        let total_amount = 0;

        (frm.doc.items || []).forEach(row => {
            total_qty += row.qty_in_kg || 0;
            total_yield += row.yeild || 0;
            total_loss += row.qty_loss || 0;
            total_moisture += row.mosture_loss || 0;
            total_amount += row.amount || 0;
        });

        frm.set_value("total_qty", total_qty);
        frm.set_value("total_yeild", total_yield);
        frm.set_value("total_qty_loss", total_loss);
        frm.set_value("total_moisture_loss", total_moisture);
        frm.set_value("total_amount", total_amount);

        // total box = total_yield / box weight
        if (frm.doc.box) {
            frm.set_value("total_box", total_yield / frm.doc.box);
        }
    }
});
frappe.ui.form.on("RECIPE ITEM", {
    qty_in_kg: function(frm, cdt, cdn) {
        calculate_row(frm, cdt, cdn);
    },
    mosture_loss: function(frm, cdt, cdn) {
        calculate_row(frm, cdt, cdn);
    },
    qty_loss: function(frm, cdt, cdn) {
        calculate_row(frm, cdt, cdn);
    },
    material: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.material) return;

        frappe.call({
            method: "bfl_custom.bfl_custom.doctype.recipe_master.recipe_master.get_last_purchase_rate",
            args: {
                item_code: row.material
            },
            callback: function(r) {
                frappe.model.set_value(cdt, cdn, "rate", flt(r.message) || 0);
                calculate_row(frm, cdt, cdn);
            }
        });
    },
});

function calculate_row(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    let qty = row.qty_in_kg || 0;
    let moisture = row.mosture_loss || 0;

    // qty_loss = qty - (moisture% * qty)
    let qty_loss = qty * (moisture / 100);

    // yield = qty - qty_loss
    let yield_qty = qty - qty_loss;

    row.qty_loss = qty_loss;
    row.yeild = yield_qty;

    // amount = qty * rate
    row.amount = qty * (row.rate || 0);

    frm.refresh_field("recipe_item");
}

function get_last_purchase_rate(item_code) {
    if (!item_code) {
        return Promise.resolve(0);
    }

    return frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Purchase Invoice Item",
            fields: ["rate"],
            filters: {
                item_code: item_code,
                docstatus: 1
            },
            order_by: "creation desc",
            limit_page_length: 1
        }
    }).then(r => {
        if (r.message && r.message.length) {
            return flt(r.message[0].rate);
        }
        return 0;
    });
}
