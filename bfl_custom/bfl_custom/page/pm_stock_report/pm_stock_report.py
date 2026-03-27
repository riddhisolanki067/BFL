import frappe
import json
from frappe.utils import flt


@frappe.whitelist()
def get_pm_stock_data(filters):
    # ✅ FIX: parse string to dict
    if isinstance(filters, str):
        filters = json.loads(filters)

    filters = frappe._dict(filters)

    validate_filters(filters)
    return get_data(filters)
# -------------------------------
# VALIDATION
# -------------------------------
def validate_filters(filters):
    if not filters.get("from_date") or not filters.get("to_date"):
        frappe.throw("From Date and To Date are mandatory")

    if not filters.get("bom"):
        frappe.throw("BOM is mandatory")

    if filters.get("item") and filters.get("item_group"):
        frappe.throw("You cannot select both Item and Item Group")


# -------------------------------
# ITEMS
# -------------------------------
def get_items(filters):
    group = frappe.db.get_value("Item Group", "Packing Material", ["lft", "rgt"], as_dict=1)

    items = frappe.db.sql("""
        SELECT name FROM tabItem
        WHERE item_group IN (
            SELECT name FROM `tabItem Group`
            WHERE lft >= %s AND rgt <= %s
        )
    """, (group.lft, group.rgt), as_dict=1)

    if filters.get("item"):
        items = [d for d in items if d.name == filters.get("item")]

    elif filters.get("item_group"):
        items = frappe.db.sql("""
            SELECT name FROM tabItem
            WHERE item_group=%s
        """, (filters.get("item_group"),), as_dict=1)

    return items


# -------------------------------
# MAIN DATA
# -------------------------------
def get_data(filters):
    items = get_items(filters)
    result = []

    for item in items:
        item_code = item.name

        opening = get_opening(item_code, filters)
        gate_in = get_gate_qty(item_code, filters, "In")
        gate_out = get_gate_qty(item_code, filters, "Out")
        purchase = get_purchase(item_code, filters)
        packing_prod = get_packing_production(item_code, filters)
        sales = get_sales(item_code, filters)

        balance = (
            opening + gate_in + purchase
            - gate_out - sales - packing_prod
        )

        result.append({
            "item": item_code,
            "opening": opening,
            "gate_in": gate_in,
            "purchase": purchase,
            "gate_out": gate_out,
            "sale": sales,
            "packing_production": packing_prod,
            "balance_stock": balance,
           
        })

    return result


# -------------------------------
# CALCULATIONS
# -------------------------------

def get_opening(item, filters):
    return flt(frappe.db.sql("""
        SELECT SUM(box)
        FROM `tabPacking Production Item`
        WHERE item=%s
        AND parent IN (
            SELECT name FROM `tabPacking Production`
            WHERE date < %s
        )
    """, (item, filters.from_date))[0][0])


def get_gate_qty(item, filters, entry_type):
    return flt(frappe.db.sql("""
        SELECT SUM(qty)
        FROM `tabGATE ENTRY ITEM`
        WHERE product=%s
        AND parent IN (
            SELECT name FROM `tabGATE ENTRY`
            WHERE entry_type=%s
            AND posting_date BETWEEN %s AND %s
        )
    """, (item, entry_type, filters.from_date, filters.to_date))[0][0])


def get_purchase(item, filters):
    return flt(frappe.db.sql("""
        SELECT SUM(qty)
        FROM `tabPurchase Invoice Item`
        WHERE item_code=%s
        AND parent IN (
            SELECT name FROM `tabPurchase Invoice`
            WHERE custom_gate_entry IS NOT NULL
            AND posting_date BETWEEN %s AND %s
        )
    """, (item, filters.from_date, filters.to_date))[0][0])


def get_packing_production(item, filters):
    return flt(frappe.db.sql("""
        SELECT SUM(pp.box * bi.qty)
        FROM `tabPacking Production` p
        JOIN `tabPacking Production Item` pp ON pp.parent = p.name
        JOIN `tabBOM Item` bi ON bi.parent = %s
        WHERE bi.item_code = %s
        AND p.date BETWEEN %s AND %s
    """, (filters.bom, item, filters.from_date, filters.to_date))[0][0])


def get_sales(item, filters):
    return flt(frappe.db.sql("""
        SELECT SUM(sii.qty * bi.qty)
        FROM `tabSales Invoice Item` sii
        JOIN `tabBOM Item` bi ON bi.parent = %s
        WHERE bi.item_code = %s
        AND sii.parent IN (
            SELECT name FROM `tabSales Invoice`
            WHERE posting_date BETWEEN %s AND %s
        )
    """, (filters.bom, item, filters.from_date, filters.to_date))[0][0])