import frappe
from frappe.utils import today

@frappe.whitelist()
def get_daily_mis(from_date=None, to_date=None):
    today_date = today()

    # Purchase Invoice
    purchase = frappe.db.sql("""
        SELECT 
            pi.posting_date as date,
            pi.name as voucher,
            'Purchase Invoice' as doctype,
            pi.supplier as party,
            pii.item_name as item,
            pii.qty,
            pii.rate,
            pii.amount,
            pii.amount as tax
        FROM `tabPurchase Invoice` pi
        JOIN `tabPurchase Invoice Item` pii 
            ON pi.name = pii.parent
       
        WHERE DATE(pi.creation) BETWEEN %s AND %s
    """,(from_date, to_date), as_dict=1)

    # Sales Invoice
    sales = frappe.db.sql("""
        SELECT 
            si.posting_date as date,
            si.name as voucher,
            'Sales Invoice' as doctype,
             si.customer as party,
            sii.item_name as item,
            sii.qty,
            sii.rate,
            sii.amount,
            sii.amount as tax
        FROM `tabSales Invoice` si
        JOIN `tabSales Invoice Item` sii 
            ON si.name = sii.parent
        
     WHERE DATE(si.creation) BETWEEN %s AND %s
    """,(from_date, to_date), as_dict=1)

    # Gate Entry (replace doctype if custom)
    gate = frappe.db.sql("""
        SELECT 
            ge.posting_date as date,
            ge.name as voucher,
            'GATE ENTRY' as doctype,
            ge.supplier as party,
            gi.product,
            gi.qty,
            ge.entry_type,
            ge.remarks
        FROM `tabGATE ENTRY` ge
        JOIN `tabGATE ENTRY ITEM` gi
            ON ge.name = gi.parent
       
        WHERE DATE(gi.creation) BETWEEN %s AND %s
    """,(from_date, to_date), as_dict=1)

    return {
        "purchase": purchase,
        "sales": sales,
        "gate": gate
    }