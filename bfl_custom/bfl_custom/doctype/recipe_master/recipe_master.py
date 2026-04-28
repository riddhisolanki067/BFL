# Copyright (c) 2026, r and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class RECIPEMASTER(Document):
	pass

import frappe
from frappe.utils import flt

@frappe.whitelist()
def get_last_purchase_rate(item_code: str):
    if not item_code:
        return 0

    if not frappe.has_permission("Purchase Invoice", "read"):
        frappe.throw("Not permitted", frappe.PermissionError)

    pii = frappe.qb.DocType("Purchase Invoice Item")
    pi = frappe.qb.DocType("Purchase Invoice")

    result = (
        frappe.qb.get_query(
            pii,
            fields=[pii.rate],
            filters={
                pii.item_code: item_code,
                pi.docstatus: 1
            }
        )
        .join(pi)
        .on(pii.parent == pi.name)
        .orderby(pi.posting_date, order=frappe.qb.desc)
        .orderby(pi.creation, order=frappe.qb.desc)
        .limit(1)
        .run(as_dict=True)
    )

    return flt(result[0].rate) if result else 0