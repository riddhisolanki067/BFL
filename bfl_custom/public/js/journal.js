frappe.ui.form.on('Journal Entry', {
    before_Save(frm) {
       

        let employee = null;
        let month = null;
        let found_salary_row = false;

        (frm.doc.accounts || []).forEach(row => {

            if (row.custom_type === "Salary") {
                found_salary_row = true;

                if (row.employee) {
                    employee = row.employee;
                }

                if (row.month) {
                    month = row.month;
                }
            }
        });

        // stop if no salary row
        if (!found_salary_row) return;

        // stop if required data missing
        if (!employee || !month) return;


        // Fetch pending advances
        frappe.call({
            method: "bfl_custom.bfl_custom.py.api.get_pending_advances",
            args: {
                employee: employee,
                month: frm.doc.custom_month
            },
            callback: function(r) {

                if (r.message && r.message.length > 0) {
                    show_dialog(frm, r.message);
                }
            }
        });
    }
});


function show_dialog(frm, data) {

    let dialog = new frappe.ui.Dialog({
        title: "Adjust Advances / Loans",
        fields: [
            {
                fieldname: "advances",
                fieldtype: "Table",
                label: "Pending Entries",
                fields: [
                    { fieldname: "row_id", fieldtype: "Data", hidden: 1 },
                    { fieldname: "journal_entry", label: "Journal Entry", fieldtype: "Link", options: "Journal Entry" },
                    { fieldname: "type", label: "Type", fieldtype: "Data" },
                    { fieldname: "amount", label: "Amount", fieldtype: "Currency" },
                    { fieldname: "adjust", label: "Adjust", fieldtype: "Check" }
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

            // 🔹 Add deduction entry in JE
            let new_row = frm.add_child("accounts");

            new_row.account = "Advance Adjustment Account"; // change this
            new_row.debit_in_account_currency = total;

            frm.refresh_field("accounts");

            // 🔹 Mark rows deducted + link JE
            frappe.call({
                method: "bfl_custom.bfl_custom.py.api.mark_child_rows_deducted",
                args: {
                    row_ids: selected_rows,
                    salary_journal_entry: frm.doc.name || "Draft"
                }
            });

            frappe.msgprint("Advances adjusted successfully");

            dialog.hide();
        }
    });

    dialog.fields_dict.advances.df.data = data;
    dialog.fields_dict.advances.grid.refresh();

    dialog.show();
}