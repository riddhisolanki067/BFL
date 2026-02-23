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
