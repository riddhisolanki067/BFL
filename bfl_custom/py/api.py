# apps/bfl_custom/bfl_custom/py/api.py

import re
import frappe

def validate_suspense(doc, method=None):
    
    def contains_suspense(text):
        if not text:
            return False
        return re.search(r"suspense", text, re.IGNORECASE)

    # Determine party
    party_flag = False

    if doc.doctype in ["Sales Invoice", "Sales Order"]:
        party_flag = contains_suspense(doc.customer)

    elif doc.doctype in ["Purchase Invoice", "Purchase Order"]:
        party_flag = contains_suspense(doc.supplier)

    # Check items
    item_flag = any(contains_suspense(item.item_code) for item in doc.items)

    # Final condition
    if party_flag or item_flag:
        frappe.throw(
            "Not allowed: Both Party name and Item Code contain 'Suspense'."
        )

import frappe

@frappe.whitelist()
def get_pending_advances(employee, month):
    """
    Fetch all pending advance/loan rows from JE Accounts child table
    """

    data = frappe.db.sql("""
        SELECT 
            jea.name AS row_id,
            jea.parent AS journal_entry,
            jea.custom_type,
            jea.custom_month,
            (jea.debit_in_account_currency - jea.credit_in_account_currency) AS amount
        FROM `tabJournal Entry Account` jea
        JOIN `tabJournal Entry` je ON je.name = jea.parent
        WHERE 
            jea.party = %s
            AND jea.custom_month = %s
            AND jea.custom_is_deducted = 0
            
            AND jea.custom_type IN ('Advance', 'Loan')
    """, (employee, month), as_dict=True)

    return data


@frappe.whitelist()
def mark_child_rows_deducted(row_ids, salary_journal_entry):
    """
    Mark selected JE Account rows as deducted and link to salary JE
    """

    if isinstance(row_ids, str):
        row_ids = frappe.parse_json(row_ids)

    for row_id in row_ids:
        frappe.db.set_value(
            "Journal Entry Account",
            row_id,
            {
                "custom_is_deducted": 1,
                
            }
        )

    frappe.db.commit()