import frappe
from frappe.utils import today

@frappe.whitelist()
def get_daily_mis():
    today_date = today()

    # Purchase Invoice
    purchase = frappe.db.sql("""
        SELECT 
            pi.posting_date as date,
            pi.name as voucher,
            pi.supplier as party,
            pii.item_name as item,
            pii.qty,
            pii.rate,
            pii.amount,
            pii.amount as tax
        FROM `tabPurchase Invoice` pi
        JOIN `tabPurchase Invoice Item` pii 
            ON pi.name = pii.parent
       
        AND DATE(pi.creation) = CURDATE()
    """,as_dict=1)

    # Sales Invoice
    sales = frappe.db.sql("""
        SELECT 
            si.posting_date as date,
            si.name as voucher,
            si.customer as party,
            sii.item_name as item,
            sii.qty,
            sii.rate,
            sii.amount,
            sii.amount as tax
        FROM `tabSales Invoice` si
        JOIN `tabSales Invoice Item` sii 
            ON si.name = sii.parent
        
        AND DATE(si.creation) = CURDATE()
    """, as_dict=1)

    # Gate Entry (replace doctype if custom)
    gate = frappe.db.sql("""
        SELECT 
            ge.posting_date as date,
            ge.name as voucher,
            ge.supplier as party,
            gi.product,
            gi.qty,
            ge.entry_type,
            ge.remarks
        FROM `tabGATE ENTRY` ge
        JOIN `tabGATE ENTRY ITEM` gi
            ON ge.name = gi.parent
       
         AND DATE(ge.creation) = CURDATE()
    """, as_dict=1)

    return {
        "purchase": purchase,
        "sales": sales,
        "gate": gate
    }