import frappe

@frappe.whitelist()
def get_data(pi):
    pi_doc = frappe.get_doc("Purchase Invoice", pi)

    current_items = [
        {
            "item_code": d.item_code,
            "item_name": d.item_name,
            "qty": d.qty,
            "rate": d.rate,
            "uom": d.uom,
            "rejected_qty": d.rejected_qty
        }
        for d in pi_doc.items
    ]

    history = {}

    for d in pi_doc.items:
        history[d.item_code] = frappe.db.sql("""
            SELECT
                pi.name,
                pi.supplier,
                pi.posting_date,
                pi.bill_no,
                pi.bill_date,
                pi.remarks,
                pi.status,
                pii.item_name,
                pii.qty,
                pii.rate,
                pii.uom,
                pii.rejected_qty
            FROM `tabPurchase Invoice Item` pii
            JOIN `tabPurchase Invoice` pi ON pi.name = pii.parent
            WHERE
                pii.item_code = %s
                AND pi.docstatus != 2
                AND pi.name != %s
            ORDER BY pi.posting_date DESC
            LIMIT 5
        """, (d.item_code, pi), as_dict=True)

    return {
        "pi": {
            "name": pi_doc.name,
            "supplier": pi_doc.supplier,
            "posting_date": pi_doc.posting_date,
            "bill_no": pi_doc.bill_no,
            "bill_date": pi_doc.bill_date,
            "place_of_supply":pi_doc.place_of_supply,
            "supplier_gstin":pi_doc.supplier_gstin,
            "remarks":pi_doc.remarks,
            "contact_number":pi_doc.contact_mobile
            
        },
        "current_items": current_items,
        "history": history
    }

