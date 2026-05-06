frappe.ui.form.on("GATE ENTRY", {
    refresh:function(frm) {
       console.log("ass")
       if(frm.doc.purpose !== "Loan IN" || frm.doc.purpose !== "Loan Return"){
            frm.add_custom_button(("Purchase Invoice"),
                function() {
                    frappe.call({
                        method: "bfl_custom.bfl_custom.doctype.gate_entry.gate_entry.make_purchase_invoice",
                        args: {
                            gate_entry: frm.doc.name
                        },
                        callback(r) {
                            if (r.message) {
                                frappe.set_route("Form", "Purchase Invoice", r.message);
                            }
                        }
                    });
                },
                __("Create")
                        );
                    }
        },
    before_save(frm) {

        if (!frm.doc.supplier) return;

        return frappe.call({
            method: "bfl_custom.bfl_custom.doctype.gate_entry.gate_entry.validate_pending_po_qty",
            args: {
                doc: frm.doc
            },
            callback(r) {
                if (r.message && r.message.length) {

                    let message = r.message.join("<br>");

                    return new Promise((resolve, reject) => {
                        frappe.confirm(
                            `Following items exceed pending PO quantity:<br><br>${message}<br><br>Do you want to ignore and continue?`,
                            () => resolve(),     // Ignore → Save
                            () => reject()      // Cancel Save
                        );
                    });
                }
            }
        })
    },
    party: function(frm) {
        frm.set_query("reference", function() {
            return {
                filters: {
                    party: frm.doc.party
                }
            };
        });
    }
}); 

frappe.ui.form.on("GATE ENTRY ITEM", {
	qty: function(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		let amount = (flt(row.qty) || 0) * (flt(row.rate) || 0);
		frappe.model.set_value(cdt, cdn, "value", amount);
	},

	rate: function(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		let amount = (flt(row.qty) || 0) * (flt(row.rate) || 0);
		frappe.model.set_value(cdt, cdn, "value", amount);
	}
});