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
    if party_flag and item_flag:
        frappe.throw(
            "Not allowed: Both Party name and Item Code contain 'Suspense'."
        )