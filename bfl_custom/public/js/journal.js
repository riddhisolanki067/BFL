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
        frm.refresh();  // Refresh to show updated values
        frm.__adjustment_done = true;  // ✅ prevent loop
        frappe.validated = true;

        frm.save();  // ✅ NOW SAVE PROPERLY
        console.log("Adjustment applied for rows:", selected_rows,row_ids);
    
        }
    });

    dialog.fields_dict.advances.df.data = data;
    dialog.fields_dict.advances.grid.refresh();

    dialog.show();
}

frappe.ui.form.on('Journal Entry', {
    onload_post_render: function(frm) {
        if (frm.is_new()) {
            if (frm.doc.__islocal) {
                if (frappe.user.has_role('Expence Entry Operator')) {
                        console.log("Current user is a Cash User");
                        // add_expense_operator_rows(frm);
                        hide_fields_for_expense_operator(frm);
                        frm.add_custom_button(__("Quick Entry Custom"), function () {
                        return quick_entry(frm);
                    
                        })
                        // Small delay to make sure button is rendered
                        setTimeout(() => {
                            const quickEntryBtn = document.querySelector('button[data-label="Quick%20Entry%20Custom"]');
                            if (quickEntryBtn) {
                                quickEntryBtn.click();
                            } 
                            }, 700);
                }
            }
        }
    }
})



function hide_fields_for_expense_operator(frm) {
    // Hide specific fields (example: cheque_no, cheque_date, user_remark)
    const fields_to_hide = ['cheque_no','company_gstin', 'cheque_date', 'multi_currency','finance_book','from_template','apply_tds','reference','write_off','printing_settings','addtional_info','subscription_section'];

    fields_to_hide.forEach(f => {
        frm.set_df_property(f, 'hidden', 1);
    });
}


 function quick_entry (frm) {
		var naming_series_options = frm.fields_dict.naming_series.df.options;
		var naming_series_default =
			frm.fields_dict.naming_series.df.default || naming_series_options.split("\n")[0];

		var dialog = new frappe.ui.Dialog({
			title: __("Quick Journal Entry"),
			fields: [
			    {
            		fieldtype: "Select",
                    label: "Payment Type",
                    options: ["Pay", "Receive"],
                    fieldname: "custom_payment_type",
                    reqd: 1,

				},
				{
            		fieldtype: "Select",
                    label: "Entry Type",
                    options: ["Journal Entry","Inter Company Journal Entry","Bank Entry","Cash Entry","Credit Card Entry","Debit Note","Credit Note","Contra Entry","Excise Entry","Write Off Entry","Opening Entry","Depreciation Entry","Exchange Rate Revaluation","Exchange Gain Or Loss","Deferred Revenue","Deferred Expense","Reversal Of ITC"],
                    fieldname: "entry_type"
				},
				{ fieldtype: "Currency", fieldname: "debit", label: __("Amount"), reqd: 1 },
				{
					fieldtype: "Link",
					fieldname: "debit_account",
					label: __("Debit Account"),
					reqd: 1,
					options: "Account",
					get_query: function () {
						return erpnext.journal_entry.account_query(frm);
					},
				},
				{
					fieldtype: "Link",
					fieldname: "credit_account",
					label: __("Credit Account"),
					reqd: 1,
					options: "Account",
					get_query: function () {
						return erpnext.journal_entry.account_query(frm);
					},
				},
				{
					fieldtype: "Date",
					fieldname: "posting_date",
					label: __("Date"),
					reqd: 1,
					default: frm.doc.posting_date,
				},
				{ fieldtype: "Small Text", fieldname: "user_remark", label: __("User Remark") },
				{
					fieldtype: "Attach",
					fieldname: "voucher",
					label: __("Voucher"),
				},
				{
					fieldtype: "Select",
					fieldname: "naming_series",
					label: __("Series"),
					reqd: 1,
					options: naming_series_options,
					default: naming_series_default,
				},
			
				]
		});
		
        	dialog.fields_dict.custom_payment_type.df.onchange = async function () {
            const company = frappe.defaults.get_default("company");
            const user = frappe.session.user;
            console.log(company, user);
            let cash_account = "";
        
            if (user && company) {
                await frappe.call({
                    method: "frappe.client.get",
                    args: {
                        doctype: "Employee",
                        user_id: user
                    },
                    callback: function (r) {
                        if (r.message && r.message.accounts) {
                            console.log(r.message)
                            const accounts = r.message.accounts;
                            console.log("Employee Accounts:", accounts);
        
                            // loop through child table
                            accounts.forEach(row => {
                                if (row.company === company) {
                                    cash_account = row.cash_account;
                                }
                            });
        
                            dialog.set_value("credit_account", cash_account);
                        }
                    }
                });
            }
        };


		dialog.set_primary_action(__("Save"), function () {
			var btn = this;
			var values = dialog.get_values();

			frm.set_value("posting_date", values.posting_date);
			frm.set_value("user_remark", values.user_remark);
			frm.set_value("naming_series", values.naming_series);
			frm.set_value("voucher_type", values.entry_type);
			frm.set_value("custom_voucher", values.voucher);
			frm.set_value("custom_payment_type", values.custom_payment_type)


			// clear table is used because there might've been an error while adding child
			// and cleanup didn't happen
			frm.clear_table("accounts");

			// using grid.add_new_row() to add a row in UI as well as locals
			// this is required because triggers try to refresh the grid

			var debit_row = frm.fields_dict.accounts.grid.add_new_row();
			frappe.model.set_value(debit_row.doctype, debit_row.name, "account", values.debit_account);
			frappe.model.set_value(
				debit_row.doctype,
				debit_row.name,
				"debit_in_account_currency",
				values.debit
			);

			var credit_row = frm.fields_dict.accounts.grid.add_new_row();
			frappe.model.set_value(credit_row.doctype, credit_row.name, "account", values.credit_account);
			frappe.model.set_value(
				credit_row.doctype,
				credit_row.name,
				"credit_in_account_currency",
				values.debit
			);

			frm.save();

			dialog.hide();
		});

		dialog.show();
		
	}
	
	frappe.ui.form.on("Journal Entry", {
    after_save: function(frm) {
        frappe.msgprint({
            title: __("Success"),
            message: __("Voucher <b>{0}</b> has been saved successfully.", [frm.doc.name]),
            indicator: "green"
        });
    }
});
