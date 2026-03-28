import frappe
from frappe.utils import flt


def execute(filters=None):
    filters = filters or {}

    columns = get_columns()
    data = get_data(filters)

    return columns, data


# ---------------- COLUMNS ---------------- #

def get_columns():
    return [
        {"label": "Item Code", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 140},
        {"label": "Item Name", "fieldname": "item_name", "fieldtype": "Data", "width": 160},
        {"label": "Opening Stock", "fieldname": "opening_stock", "fieldtype": "Float", "width": 120},
        {"label": "Gate In", "fieldname": "gate_in", "fieldtype": "Float", "width": 100},
        {"label": "Purchase Qty", "fieldname": "purchase_qty", "fieldtype": "Float", "width": 120},
        {"label": "Gate Out", "fieldname": "gate_out", "fieldtype": "Float", "width": 100},
        {"label": "Closing Stock", "fieldname": "closing_stock", "fieldtype": "Float", "width": 120},
        {"label": "Variance", "fieldname": "variance", "fieldtype": "Float", "width": 100},
        {"label": "UOM", "fieldname": "uom", "fieldtype": "Data", "width": 90},
        {"label": "FIFO Rate", "fieldname": "fifo_rate", "fieldtype": "Currency", "width": 120},
        {"label": "Consume Value", "fieldname": "consume_value", "fieldtype": "Currency", "width": 140},
        {"label": "LIFO Rate", "fieldname": "lifo_rate", "fieldtype": "Currency", "width": 120},
        {"label": "Stock Value", "fieldname": "stock_value", "fieldtype": "Currency", "width": 140},
    ]


# ---------------- MAIN DATA ---------------- #

def get_data(filters):
    items = get_items(filters)

    data = []

    for item in items:
        item_code = item.name

        opening = get_opening(item_code, filters)
        gate_in = get_gate_in(item_code, filters)
        purchase = get_purchase(item_code, filters)
        gate_out = get_gate_out(item_code, filters)
        closing = get_closing(item_code, filters)
        variance = get_variance(item_code, filters)

        # ✅ Safe inward logic
        inward = gate_in + purchase

        consumption = opening + inward - closing - variance

        fifo_rate = get_fifo_rate(item_code)
        lifo_rate = get_lifo_rate(item_code)

        consume_value = fifo_rate * consumption
        stock_value = lifo_rate * closing

        data.append({
            "item_code": item_code,
            "item_name": item.item_name,
            "opening_stock": opening,
            "gate_in": gate_in,
            "purchase_qty": purchase,
            "gate_out": gate_out,
            "closing_stock": closing,
            "variance": variance,
            "uom": item.stock_uom,
            "fifo_rate": fifo_rate,
            "consume_value": consume_value,
            "lifo_rate": lifo_rate,
            "stock_value": stock_value
        })

    return data


# ---------------- ITEM FETCH ---------------- #

def get_items(filters):
    item_group = filters.get("item_group")
    item = filters.get("item")

    # ✅ Default Parent Group
    if not item_group:
        item_group = "Raw Material"

    conditions = ""
    values = [item_group, item_group]

    if item:
        conditions += " AND item.name = %s"
        values.append(item)

    return frappe.db.sql(f"""
        SELECT item.name, item.item_name, item.stock_uom
        FROM `tabItem` item
        WHERE item.item_group IN (
            SELECT name FROM `tabItem Group`
            WHERE lft >= (SELECT lft FROM `tabItem Group` WHERE name=%s)
            AND rgt <= (SELECT rgt FROM `tabItem Group` WHERE name=%s)
        )
        {conditions}
    """, tuple(values), as_dict=1)


# ---------------- STOCK FUNCTIONS ---------------- #
def get_opening(item_code, filters):
    res = frappe.db.sql("""
        SELECT child.opening
        FROM `tabRm Consumpation Item` child
        JOIN `tabRM Consumpation` parent ON parent.name = child.parent
        WHERE child.item=%s
        AND parent.date = %s
        ORDER BY parent.date DESC
        LIMIT 1
    """, (item_code, filters.get("from_date")), as_list=True)

    return flt(res[0][0]) if res else 0


def get_closing(item_code, filters):
    res = frappe.db.sql("""
        SELECT SUM(child.closing)
        FROM `tabRm Consumpation Item` child
        JOIN `tabRM Consumpation` parent ON parent.name = child.parent
        WHERE child.item=%s
        AND parent.date BETWEEN %s AND %s
    """, (item_code, filters.get("from_date"), filters.get("to_date")), as_list=True)

    return flt(res[0][0]) if res and res[0][0] else 0

def get_variance(item_code, filters):
    res = frappe.db.sql("""
        SELECT SUM(child.variance)
        FROM `tabRm Consumpation Item` child
        JOIN `tabRM Consumpation` parent ON parent.name = child.parent
        WHERE child.item=%s
        AND parent.date BETWEEN %s AND %s
    """, (item_code, filters.get("from_date"), filters.get("to_date")), as_list=True)

    return flt(res[0][0]) if res and res[0][0] else 0
	
def get_gate_in(item_code, filters):
    res = frappe.db.sql("""
        SELECT SUM(child.qty)
        FROM `tabGATE ENTRY ITEM` child
        JOIN `tabGATE ENTRY` parent ON parent.name = child.parent
        WHERE child.product=%s
        
        AND parent.entry_type='IN'
        AND parent.posting_date BETWEEN %s AND %s

        AND parent.name NOT IN (
            SELECT parent.custom_gate_entry
            FROM `tabPurchase Invoice` parent
            WHERE parent.custom_gate_entry IS NOT NULL
            
        )
    """, (item_code, filters.get("from_date"), filters.get("to_date")), as_list=True)

    return flt(res[0][0]) if res and res[0][0] else 0


def get_gate_out(item_code, filters):
    res = frappe.db.sql("""
        SELECT SUM(child.qty)
        FROM `tabGATE ENTRY ITEM` child
        JOIN `tabGATE ENTRY` parent ON parent.name = child.parent
        WHERE child.product=%s
        AND parent.entry_type='OUT'
        AND parent.posting_date BETWEEN %s AND %s
    """, (item_code, filters.get("from_date"), filters.get("to_date")), as_list=True)

    return flt(res[0][0]) if res and res[0][0] else 0


def get_purchase(item_code, filters):
    res = frappe.db.sql("""
        SELECT SUM(child.qty)
        FROM `tabPurchase Invoice Item` child
        JOIN `tabPurchase Invoice` parent ON parent.name = child.parent
        WHERE child.item_code=%s
        AND parent.custom_gate_entry IS NOT NULL
        AND parent.posting_date BETWEEN %s AND %s
    """, (item_code, filters.get("from_date"), filters.get("to_date")), as_list=True)

    return flt(res[0][0]) if res and res[0][0] else 0


# ---------------- FIFO / LIFO ---------------- #

def get_fifo_rate(item_code):
    res = frappe.db.sql("""
        SELECT child.rate
        FROM `tabPurchase Invoice Item` child
        JOIN `tabPurchase Invoice` parent ON parent.name = child.parent
        WHERE child.item_code=%s
        ORDER BY parent.posting_date ASC
        LIMIT 1
    """, item_code)

    return flt(res[0][0]) if res else 0


def get_lifo_rate(item_code):
    res = frappe.db.sql("""
        SELECT child.rate
        FROM `tabPurchase Invoice Item` child
        JOIN `tabPurchase Invoice` parent ON parent.name = child.parent
        WHERE child.item_code=%s
        ORDER BY parent.posting_date DESC
        LIMIT 1
    """, item_code)

    return flt(res[0][0]) if res else 0