import frappe

def execute(doc, method=None):
    for item in doc.items:

        # Find default BOM for the main item
        bom = frappe.db.get_value(
            "BOM",
            {"item": item.item_code, "is_default": 1, "is_active": 1},
            "name"
        )

        if not bom:
            continue

        # Get BOM child items
        bom_items = frappe.get_all(
            "BOM Item",
            filters={"parent": bom},
            fields=["item_code", "qty"]
        )

        for bom_row in bom_items:

            # Find same item in packing material table
            for pack_row in doc.custom_packing_materials:

                if pack_row.item == bom_row.item_code:

                    # multiply SO qty × BOM qty
                    pack_row.qty = item.qty * bom_row.qty