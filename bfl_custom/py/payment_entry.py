import frappe
from frappe.utils import date_diff



def payment_discount(doc,method):
    if not doc.references:
        return
    
    if doc.deductions:
        return

    # assuming single Purchase Invoice payment
    ref = doc.references[0]
    if ref.reference_doctype != "Purchase Invoice":
        return

    invoice = frappe.get_doc("Purchase Invoice", ref.reference_name)
    supplier = frappe.get_doc("Supplier", invoice.supplier)

    payment_days = date_diff(doc.posting_date, invoice.posting_date)
    doc.payment_days = payment_days

    discount_percent = 0

    for slab in supplier.custom_payment_slab:
        from_days = int(slab.from_days or 0)
        to_days = int(slab.to_days or 0)
        print(from_days)
        print(to_days)
        print(payment_days)
        print(discount_percent)

        if from_days <= payment_days <= to_days:
            discount_percent = float(slab.discount or 0)
            print(discount_percent)
            print(discount_percent)
            break

    print("Final %:", discount_percent)

    doc.discount_percentage = discount_percent

    if discount_percent > 0:

        discount_amount = (ref.allocated_amount * discount_percent) / 100
        doc.discount_amount = discount_amount

        print("Discount Amt:", discount_amount)

        # Adjust payment
        doc.paid_amount -= discount_amount
        doc.received_amount -= discount_amount

        # Prevent duplicate rows
        doc.deductions = []

        doc.append("deductions", {
            "account": "Discount Received - BFL",
            "amount": -discount_amount,
            "cost_center": "Main - RPL"
        })
        print(doc.difference_amount)
        doc.difference_amount = 0.00


    

        
