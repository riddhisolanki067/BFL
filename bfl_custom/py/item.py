import frappe

def item_update(doc, method):
    if doc.item_group == "FINISHED GOOD":
        base_code = doc.item_code

        if base_code.startswith("FG-"):
            base_code = base_code[3:]

        variants = [
            {"prefix": "CB-", "item_group": "CORRUGATED BOX"},
            {"prefix": "WRP-", "item_group": "WRAPPER"},
        ]

        for row in variants:
            new_item_code = f"{row['prefix']}{base_code}"

            if not frappe.db.exists("Item", new_item_code):
                item = frappe.get_doc({
                    "doctype": "Item",
                    "item_code": new_item_code,
                    "item_name": new_item_code,
                    "item_group": row["item_group"],
                    "stock_uom": doc.stock_uom or "Nos",
                    "is_stock_item": 1,
                    "include_item_in_manufacturing": 0
                })
                item.insert(ignore_permissions=True)    if doc.item_group == "FINISHED GOOD":
        variants = [
            {"prefix": "CB - ", "item_group": "CORRUGATED BOX"},
            {"prefix": "WRP- ", "item_group": "WRAPPER"},
        ]

        for row in variants:
            new_item_code = f"{row['prefix']}{doc.item_code}"

            if not frappe.db.exists("Item", new_item_code):
                item = frappe.get_doc({
                    "doctype": "Item",
                    "item_code": new_item_code,
                    "item_name": new_item_code,
                    "item_group": row["item_group"],
                    "stock_uom": doc.stock_uom or "Nos",
                    "is_stock_item": 1,
                    "include_item_in_manufacturing": 0
                })
                item.insert(ignore_permissions=True)