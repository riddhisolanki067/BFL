frappe.ui.form.on('Purchase Invoice', {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button(__('Purchase Comparison'), () => {
                frappe.set_route(
                    'purchase-comparision',
                    { pi: frm.doc.name }
                );
            });
            

        }
    },

    custom_get_items(frm){
        get_items_to_additional_costs(frm);
    }
    
});


frappe.ui.form.on('Purchase Invoice Additional Cost', {
    // When child table is added
    custom_addiional_costs: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        // Add a custom button in child table row
        row.fetch_jv = 'Fetch Voucher'; // This is a virtual field
        frm.refresh_field('additional_costs');
    },
    
    // Custom button click handler
    fetch_jv: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        // Open dialog to search Journal Entries
        let d = new frappe.ui.Dialog({
            title: 'Select Journal Entry',
            fields: [
                {fieldname: 'voucher', fieldtype:'Link', options:'Journal Entry', label:'Voucher'},
                {fieldname: 'process', fieldtype:'Button', label:'Process'}
            ]
        });

        d.get_input('process').on('click', function() {
            let voucher = d.get_value('voucher');
            if(!voucher) {
                frappe.msgprint('Please select a voucher');
                return;
            }

            // Fetch Journal Entry details
            frappe.db.get_doc('Journal Entry', voucher).then(v => {
                row.voucher = v.name;
                // Here, choose the relevant amount (total debit of the first account for simplicity)
                row.amount = v.total_debit;
                row.remarks = v.remark || '';
                
                // Find corresponding item row
                let item_row = frm.doc.items.find(i => i.item_code === row.item);
                let item_amount = item_row ? item_row.amount : 0;

                row.total_cost = item_amount + row.amount;
                frm.refresh_field('custom_addiional_costs');

                // Recalculate landed cost for this item
                 

                d.hide();
                calculate_landed_cost(frm, row.item);
            });
        });

        d.show();
    }
});

function get_items_to_additional_costs(frm) {
    let items = frm.doc.items;

    if (!items || items.length === 0) {
        frappe.msgprint('No items found in the main Purchase Invoice.');
        return;
    }

    // Clear existing additional_costs if needed
    frm.clear_table('custom_addiional_costs');

    // Add each item to Additional Costs child table
    items.forEach(item => {
        let row = frm.add_child('custom_addiional_costs', {
            item: item.item_code,
          
        });
    });

    frm.refresh_field('custom_addiional_costs');
   
}

// Function to calculate landed cost
function calculate_landed_cost(frm, item_name=null) {
    let item_rows = frm.doc.items;
    let additional_rows = frm.doc.custom_addiional_costs;

    item_rows.forEach(item => {
         // Only update relevant item if provided
        let total_additional = 0;
        additional_rows.forEach(add => {
            if(add.item === item.item_code) {
                total_additional += add.total_cost || 0;
            }
        });
        item.custom_landed_cost = (total_additional) / (item.qty || 1);
    });
    frm.refresh_field('items');
}

