import frappe

@frappe.whitelist()
def get_data(pi, item=None):
    pi_doc = frappe.get_doc("Purchase Invoice", pi)

    # ✅ CURRENT ITEMS
    current_items = []
    for d in pi_doc.items:

        if item and d.item_code != item:
            continue   # 🔥 filter only when item selected

        current_items.append({
            "item_code": d.item_code,
            "item_name": d.item_name,
            "qty": d.qty,
            "rate": d.rate,
            "uom": d.uom,
            "rejected_qty": d.rejected_qty
        })

    history = {}

    for d in pi_doc.items:

        if item and d.item_code != item:
            continue   # 🔥 same here

        item_doc = frappe.get_doc("Item", d.item_code)
        template_item = item_doc.variant_of or d.item_code

        variants = frappe.get_all(
            "Item",
            filters={"variant_of": template_item},
            pluck="name"
        )

        item_list = variants + [template_item]

        history[d.item_code] = frappe.db.sql("""
            SELECT
                pi.supplier,
                pi.name,
                pi.bill_no,
                pi.remarks,
                pi.status,
                pi.posting_date,
                pii.item_code,
                pii.uom,
                pii.qty,
                pii.rate
            FROM `tabPurchase Invoice Item` pii
            INNER JOIN `tabPurchase Invoice` pi
                ON pi.name = pii.parent
            WHERE
                pii.item_code IN %(item_list)s
                AND pi.docstatus != 2
                AND pi.name != %(current_pi)s
            ORDER BY pi.posting_date DESC
            LIMIT 5
        """, {
            "item_list": item_list,
            "current_pi": pi_doc.name
        }, as_dict=True)

    return {
        "pi": {
            "name": pi_doc.name,
            "supplier": pi_doc.supplier,
            "posting_date": pi_doc.posting_date,
            "bill_no": pi_doc.bill_no,
            "bill_date": pi_doc.bill_date,
            "place_of_supply": pi_doc.place_of_supply,
            "supplier_gstin": pi_doc.supplier_gstin,
            "status":pi_doc.status,
            "remarks": pi_doc.remarks,
            "contact_number": pi_doc.contact_mobile
        },
        "current_items": current_items,
        "history": history
    }



