// frappe.ui.form.on("GATE ENTRY", {
//     refresh:function(frm) {
//        console.log("ass")
//             frm.add_custom_button(("Purchase Invoice"),
//                 function() {
//                     frappe.call({
//                         method: "bfl_custom.bfl_custom.doctype.gate_entry.gate_entry.make_purchase_invoice",
//                         args: {
//                             gate_entry: frm.doc.name
//                         },
//                         callback(r) {
//                             if (r.message) {
//                                 frappe.set_route("Form", "Purchase Invoice", r.message);
//                             }
//                         }
//                     });
//                 },
//                 __("Create")
//             );
//         },
//     before_save(frm) {

//         if (!frm.doc.supplier) return;

//         return frappe.call({
//             method: "bfl_custom.bfl_custom.doctype.gate_entry.gate_entry.validate_pending_po_qty",
//             args: {
//                 doc: frm.doc
//             },
//             callback(r) {
//                 if (r.message && r.message.length) {

//                     let message = r.message.join("<br>");

//                     return new Promise((resolve, reject) => {
//                         frappe.confirm(
//                             `Following items exceed pending PO quantity:<br><br>${message}<br><br>Do you want to ignore and continue?`,
//                             () => resolve(),     // Ignore → Save
//                             () => reject()      // Cancel Save
//                         );
//                     });
//                 }
//             }
//         })
//     }
// }); 