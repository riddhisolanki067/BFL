import frappe
from collections import defaultdict

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data


def get_columns():
    return [
        {"label": "Employee", "fieldname": "employee", "fieldtype": "Data", "width": 150},
        {"label": "Type", "fieldname": "type", "fieldtype": "Data", "width": 120},
        {"label": "Date", "fieldname": "date", "fieldtype": "Date", "width": 100},
        {"label": "Advance Amount", "fieldname": "advance", "fieldtype": "Currency", "width": 130},
        {"label": "Loan Paid", "fieldname": "loan_paid", "fieldtype": "Currency", "width": 120},
        {"label": "Deducted", "fieldname": "deducted", "fieldtype": "Currency", "width": 120},
        {"label": "Balance", "fieldname": "balance", "fieldtype": "Currency", "width": 120},
    ]


def get_data(filters):

    month = filters.get("month")
    employee_filter = filters.get("employee")

    conditions = ""
    values = []

    if month:
        conditions += " AND jea.custom_month = %s"
        values.append(month)

    if employee_filter:
        conditions += " AND jea.party = %s"
        values.append(employee_filter)

    records = frappe.db.sql(f"""
        SELECT 
            jea.party as employee,
            jea.custom_type,
            je.posting_date,
            jea.debit_in_account_currency,
            jea.credit_in_account_currency
        FROM `tabJournal Entry Account` jea
        JOIN `tabJournal Entry` je ON je.name = jea.parent
       
        {conditions}
        ORDER BY jea.party, je.posting_date
    """, values, as_dict=True)

    grouped = defaultdict(list)

    for r in records:
        grouped[r.employee].append(r)

    final_data = []

    for emp, rows in grouped.items():

        total_advance = 0
        total_loan = 0
        total_deducted = 0

        for r in rows:

            row = {
                "employee": emp,
                "date": r.posting_date
            }

            if r.custom_type == "Advance":
                amt = r.debit_in_account_currency or r.credit_in_account_currency
                row.update({
                    "type": "Advance",
                    "advance": amt
                })
                total_advance += amt

            elif r.custom_type == "Loan":
                amt = r.debit_in_account_currency or r.credit_in_account_currency

                row.update({
                    "type": "Loan",
                    "loan_paid": amt
                })

                total_loan += amt

            final_data.append(row)

        # totals row
        final_data.append({
            "employee": emp + " TOTAL",
            "advance": total_advance,
            "loan_paid": total_loan,
            "balance": total_loan - total_deducted
        })

    return final_data