import frappe
from frappe.utils import flt


def execute(filters=None):

    columns = get_columns()

    data = get_data(filters)

    return columns, data


def get_columns():

    columns = [

        {
            "label": "ORDER NO",
            "fieldname": "order_no",
            "fieldtype": "Int",
            "width": 90
        },

        {
            "label": "ORDER DATE",
            "fieldname": "order_date",
            "fieldtype": "Date",
            "width": 110
        },

        {
            "label": "DELIVERY",
            "fieldname": "delivery_date",
            "fieldtype": "Date",
            "width": 110,
            "editable": 1
        },

        {
            "label": "PARTY NAME",
            "fieldname": "customer",
            "fieldtype": "Data",
            "width": 180
        },

        {
            "label": "ITEM",
            "fieldname": "item_code",
            "fieldtype": "Link",
            "options": "Item",
            "width": 150
        },

        {
            "label": "QTY",
            "fieldname": "qty",
            "fieldtype": "Float",
            "width": 90
        },

        {
            "label": "FINISHED GOOD STOCK",
            "fieldname": "fg_stock",
            "fieldtype": "Float",
            "width": 140
        },

        # CORRUGATED BOX
        {
            "label": "CB AVAILABLE",
            "fieldname": "cb_available",
            "fieldtype": "Float",
            "width": 120
        },

        {
            "label": "CB REQUIRED",
            "fieldname": "cb_required",
            "fieldtype": "Float",
            "width": 120
        },

        {
            "label": "CB ORDERED",
            "fieldname": "cb_ordered",
            "fieldtype": "Float",
            "width": 120
        },

        {
            "label": "CB SUPPLIER",
            "fieldname": "cb_supplier",
            "fieldtype": "Data",
            "width": 150
        },

        {
            "label": "CB DATE OF ORDER",
            "fieldname": "cb_order_date",
            "fieldtype": "Date",
            "width": 120
        },

        {
            "label": "CB DELIVERY",
            "fieldname": "cb_delivery",
            "fieldtype": "Date",
            "width": 120
        },

        # WRAPPER
        {
            "label": "WR AVAILABLE",
            "fieldname": "wr_available",
            "fieldtype": "Float",
            "width": 120
        },

        {
            "label": "WR REQUIRED",
            "fieldname": "wr_required",
            "fieldtype": "Float",
            "width": 120
        },

        {
            "label": "WR ORDERED",
            "fieldname": "wr_ordered",
            "fieldtype": "Float",
            "width": 120
        },

        {
            "label": "WR SUPPLIER",
            "fieldname": "wr_supplier",
            "fieldtype": "Data",
            "width": 150
        },

        {
            "label": "WR DATE OF ORDER",
            "fieldname": "wr_order_date",
            "fieldtype": "Date",
            "width": 120
        },

        {
            "label": "WR DELIVERY",
            "fieldname": "wr_delivery",
            "fieldtype": "Date",
            "width": 120
        },

        # POLYBAG
        {
            "label": "PB AVAILABLE",
            "fieldname": "pb_available",
            "fieldtype": "Float",
            "width": 120
        },

        {
            "label": "PB REQUIRED",
            "fieldname": "pb_required",
            "fieldtype": "Float",
            "width": 120
        },

        {
            "label": "PB ORDERED",
            "fieldname": "pb_ordered",
            "fieldtype": "Float",
            "width": 120
        },

        {
            "label": "PB SUPPLIER",
            "fieldname": "pb_supplier",
            "fieldtype": "Data",
            "width": 150
        },

        {
            "label": "PB DATE OF ORDER",
            "fieldname": "pb_order_date",
            "fieldtype": "Date",
            "width": 120
        },

        {
            "label": "PB DELIVERY",
            "fieldname": "pb_delivery",
            "fieldtype": "Date",
            "width": 120
        }

    ]

    return columns


def get_data(filters):

    so_items = frappe.db.sql("""

        SELECT
            so.name,
            so.transaction_date,
            so.delivery_date,
            so.customer,
            soi.item_code,
            soi.qty

        FROM `tabSales Order` so
        INNER JOIN `tabSales Order Item` soi
        ON soi.parent = so.name

        WHERE
            so.delivery_date BETWEEN %(from_date)s
            AND %(to_date)s

        ORDER BY so.delivery_date ASC

    """, filters, as_dict=1)

    data = []

    order_no = 1

    for row in so_items:

        fg_stock = frappe.db.get_value(
            "Bin",
            {
                "item_code": row.item_code
            },
            "actual_qty"
        ) or 0

        cb = get_group_data(row.item_code, "CORRUGATED BOX", row.qty)

        wr = get_group_data(row.item_code, "WRAPPER", row.qty)

        pb = get_group_data(row.item_code, "POLYBAG / OVER WRAP", row.qty)

        data.append({

            "order_no": order_no,
            "order_date": row.transaction_date,
            "delivery_date": row.delivery_date,
            "customer": row.customer,
            "item_code": row.item_code,
            "qty": row.qty,
            "fg_stock": fg_stock,

            # CORRUGATED
            "cb_available": cb.get("available"),
            "cb_required": cb.get("required"),
            "cb_ordered": cb.get("ordered"),
            "cb_supplier": cb.get("supplier"),
            "cb_order_date": cb.get("order_date"),
            "cb_delivery": cb.get("delivery"),

            # WRAPPER
            "wr_available": wr.get("available"),
            "wr_required": wr.get("required"),
            "wr_ordered": wr.get("ordered"),
            "wr_supplier": wr.get("supplier"),
            "wr_order_date": wr.get("order_date"),
            "wr_delivery": wr.get("delivery"),

            # POLYBAG
            "pb_available": pb.get("available"),
            "pb_required": pb.get("required"),
            "pb_ordered": pb.get("ordered"),
            "pb_supplier": pb.get("supplier"),
            "pb_order_date": pb.get("order_date"),
            "pb_delivery": pb.get("delivery")

        })

        order_no += 1

    return data


def get_group_data(fg_item, item_group, fg_qty):

    result = {
        "available": 0,
        "required": 0,
        "ordered": 0,
        "supplier": "",
        "order_date": "",
        "delivery": ""
    }

    bom = frappe.db.get_value(
        "BOM",
        {
            "item": fg_item,
            "is_active": 1,
            "is_default": 1
        }
    )

    if not bom:
        return result

    bom_items = frappe.get_all(
        "BOM Item",
        filters={
            "parent": bom
        },
        fields=["item_code", "qty"]
    )

    for b in bom_items:

        group = frappe.db.get_value(
            "Item",
            b.item_code,
            "item_group"
        )

        if group == item_group:

            available = frappe.db.get_value(
                "Bin",
                {
                    "item_code": b.item_code
                },
                "actual_qty"
            ) or 0

            required = flt(b.qty) * flt(fg_qty)

            ordered = max(required - available, 0)

            supplier = frappe.db.get_value(
                "Item Default",
                {
                    "parent": b.item_code
                },
                "default_supplier"
            ) or ""

            result = {
                "available": available,
                "required": required,
                "ordered": ordered,
                "supplier": supplier,
                "order_date": "",
                "delivery": ""
            }

            break

    return result