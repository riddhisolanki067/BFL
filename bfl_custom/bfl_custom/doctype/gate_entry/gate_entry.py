# Copyright (c) 2026, r and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class GATEENTRY(Document):
    pass


import frappe
from frappe.model.mapper import get_mapped_doc



@frappe.whitelist()
def validate_pending_po_qty(doc):
    doc = frappe.parse_json(doc)

    supplier = doc.get("supplier")
    items = doc.get("item", [])   # your child table is named "item"

    if not supplier:
        return []

    po_data = frappe.db.sql("""
        SELECT
            poi.item_code,
            SUM(poi.qty - IFNULL(poi.received_qty, 0)) AS pending_qty
        FROM `tabPurchase Order` po
        JOIN `tabPurchase Order Item` poi ON poi.parent = po.name
        WHERE
            po.docstatus = 1
            AND po.supplier = %s
            AND (poi.qty - IFNULL(poi.received_qty, 0)) > 0
        GROUP BY poi.item_code
    """, supplier, as_dict=True)

    pending_qty_map = {
        row.item_code: row.pending_qty
        for row in po_data
    }

    exceeded_items = []

    for row in items:
        item_code = row.get("product")  # your field is "product"
        qty = row.get("qty", 0)

        pending_qty = pending_qty_map.get(item_code, 0)

        if qty > pending_qty:
            exceeded_items.append(
                f"{item_code} → Gate Qty: {qty}, PO Pending: {pending_qty}"
            )

    return exceeded_items
@frappe.whitelist()
def make_purchase_invoice(gate_entry):
    gate_entry_doc = frappe.get_doc("GATE ENTRY", gate_entry)

    if not gate_entry_doc.supplier:
        frappe.throw("Supplier is mandatory to create Purchase Invoice")

    pi = frappe.new_doc("Purchase Invoice")
    pi.supplier = gate_entry_doc.supplier
    pi.posting_date = frappe.utils.today()
    pi.due_date = frappe.utils.today()
    pi.set_posting_time = 1
    pi.update_stock = 1
    pi.custom_gate_entry = gate_entry_doc.name
    # optional link field

    for row in gate_entry_doc.item:
        pi.append("items", {
            "item_code": row.product,
            "qty": row.qty,    
            "rate": row.value or 0,
            
        })

    pi.insert(ignore_permissions=True)
    gate_entry_doc.purchase_invoice = pi.name
    gate_entry_doc.save(ignore_permissions=True)

    frappe.db.commit()
    


    return pi.name

def update_attachment_flag(doc, method):
    print("method is calling------------------")
    attachments = frappe.get_all(
        "File",
        filters={
            "attached_to_doctype": "GATE ENTRY",
            "attached_to_name": doc.name
        },
        limit=1
    )
    # print(attachments)
    frappe.db.set_value(
        "GATE ENTRY",
        doc.name,
        "had_attachments",
        1 if attachments else 0
    )

    