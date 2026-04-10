frappe.ui.form.on('Journal Entry', {
    validate(frm) {
        console.log("Before Save Triggered");
        let employee = null;
        let month = null;
        let found_salary_row = false;

        (frm.doc.accounts || []).forEach(row => {
            console.log("Checking row:", row);
            if (row.custom_type === "Salary") {
                found_salary_row = true;
                console.log("Found Salary Row:", row);
                if (row.party_type === "Employee") {
                    employee = row.party;
                }

                if (row.custom_month) {
                    month = row.custom_month;
                }
            }
        });

        // stop if no salary row
        if (!found_salary_row) {
            console.log("No salary row found");
            return;
        }

        // stop if required data missing
        if (!employee || !month) {
            console.log("Required data missing");
            return;
        }

        // Fetch pending advances
        frappe.call({
            method: "bfl_custom.py.api.get_pending_advances",
            args: {
                employee: employee,
                month: month
            },
            callback: function(r) {
                console.log("Pending Advances Response:", r);
                if (r.message && r.message.length > 0) {
                    console.log("Showing dialog with data:", r.message);
                    show_dialog(frm, r.message);
                }
            }
        });
    }
});


function show_dialog(frm, data) {

    let dialog = new frappe.ui.Dialog({
        title: "Adjust Advances / Loans",
        size: "large", 
        fields: [
            {
                fieldname: "advances",
                fieldtype: "Table",
                label: "Pending Entries",
                fields: [
                    { fieldname: "row_id", fieldtype: "Data", hidden: 1 },
                    { fieldname: "adjust", in_list_view: 1, label: "Adjust", fieldtype: "Check" },
                    { fieldname: "journal_entry", in_list_view: 1, label: "Journal Entry", fieldtype: "Link", options: "Journal Entry" },
                    { fieldname: "amount", in_list_view: 1, label: "Amount", fieldtype: "Currency" },
                    { fieldname: "custom_month", in_list_view: 1, label: "Month", fieldtype: "Data" },
                    { fieldname: "custom_employee", in_list_view: 1, label: "Employee", fieldtype: "Data" },
                    { fieldname: "custom_type", in_list_view: 1, label: "Type", fieldtype: "Data" }
  
                ]
            }
        ],
        primary_action_label: "Apply Adjustment",

       primary_action(values) {

    let total = 0;
    let selected_rows = [];

    (values.advances || []).forEach(row => {
        if (row.adjust) {
            total += flt(row.amount);
            selected_rows.push(row.row_id);
        }
    });

    if (total === 0) {
        frappe.msgprint("No rows selected");
        return;
    }

    let adjusted = false;

    (frm.doc.accounts || []).forEach(row => {

        if (row.custom_type === "Salary") {

            if (row.credit_in_account_currency > 0) {
                row.credit_in_account_currency -= total;
                adjusted = true;
            
            } else if (row.debit_in_account_currency > 0) {
                row.debit_in_account_currency -= total;
                adjusted = true;
            
            }
        }
        
    });

    if (!adjusted) {
        frappe.msgprint("Salary row not found");
        return;
    }

    frm.refresh_field("accounts");


    // 🔹 Mark deducted in backend
    frappe.call({
        method: "bfl_custom.py.api.mark_child_rows_deducted",
        args: {
            row_ids: selected_rows,
            salary_journal_entry: frm.doc.name 
        }
    });

        frappe.msgprint("Advance adjusted in salary row");
        dialog.hide();
        console.log("Adjustment applied for rows:", selected_rows,row_ids);
    
        }
    });

    dialog.fields_dict.advances.df.data = data;
    dialog.fields_dict.advances.grid.refresh();

    dialog.show();
}