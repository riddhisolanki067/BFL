frappe.ui.form.on("Quotation Item", {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.item_code) return;

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Item",
                name: row.item_code
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
                        "custom_image_file",
                        images[0].image
                    );
                }
            }
        });
    }
});
