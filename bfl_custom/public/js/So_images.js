frappe.ui.form.on("Packing Material", {
    item: function(frm, cdt, cdn) {
        console.log("working..")

        let row = locals[cdt][cdn];
        if (!row.item) return;

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Item",
                name: row.item
            },
            callback: function(r) {
                if (!r.message) return;

                let images = r.message.custom_images || []; // child table fieldname

                if (images.length) {
                    // sort by date desc
                    images.sort((a, b) => new Date(b.date) - new Date(a.date));

                    frappe.model.set_value(
                        cdt,
                        cdn,
                        "image",
                        images[0].image
                    );
                }
            }
        });
    }
});
frappe.ui.form.on("Sales Order", {
    refresh: function(frm) {
        if (!frm.is_new()) {

            frm.add_custom_button("Packing Purchase Order", function() {

                frappe.new_doc("Purchase Order", {}, function(po) {

                    po.company = frm.doc.company;
                    po.items = [];
                    // Loop Packing Material child table
                    frm.doc.custom_packing_materials.forEach(function(row) {

                        let child = frappe.model.add_child(po, "Purchase Order Item", "items");

                        child.item_code = row.item;
                        child.qty = row.qty;
                        child.rate = row.rate;
                       
                    });

                });

            }, "Create");
        }
    },
     onload: function(frm) {
        frm.set_query("item", "custom_packing_materials", function(doc, cdt, cdn) {
            return {
                filters: [
                    ["Item", "item_group", "in", ["WRAPPER"]]
                ]
            };
        });
    }   
});