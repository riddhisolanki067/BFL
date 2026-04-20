import frappe
from collections import defaultdict

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {
            "label": "Employee",
            "fieldname": "employee",
            "fieldtype": "Data",
            "width": 150
        },
        {
            "label": "Type",
            "fieldname": "type",
            "fieldtype": "Data",
            "width": 100
        },
        {
            "label": "Date",
            "fieldname": "date",
            "fieldtype": "Date",
            "width": 120
        },
        {
            "label": "Advance Amount",
            "fieldname": "advance",
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "label": "Loan Paid",
            "fieldname": "loan_paid",
            "fieldtype": "Currency",
            "width": 130
        },
        {
            "label": "Balance",
            "fieldname": "balance",
            "fieldtype": "Currency",
            "width": 130
        }
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
        conditions += " AND jea.custom_employee = %s"
        values.append(employee_filter)

    data = frappe.db.sql(f"""
        SELECT 
            jea.custom_employee as employee,
            jea.custom_type,
            je.posting_date,
            jea.debit_in_account_currency,
            jea.credit_in_account_currency
        FROM `tabJournal Entry Account` jea
        JOIN `tabJournal Entry` je ON je.name = jea.parent
        WHERE 
           
            jea.custom_type IN ('Advance', 'Loan')
            AND (
                jea.debit_in_account_currency != 0
                OR jea.credit_in_account_currency != 0
            )
            {conditions}
        ORDER BY je.posting_date
    """, values, as_dict=True)

    grouped = defaultdict(list)

    for d in data:
        grouped[d.employee].append(d)

    final = []

    for emp, rows in grouped.items():

        total_advance = 0
        total_loan = 0

        for r in rows:

            row = {
                "employee": emp,
                "date": r.posting_date
            }

            amt = r.debit_in_account_currency or r.credit_in_account_currency

            if r.custom_type == "Advance":
                row["type"] = "Advance"
                row["advance"] = amt
                total_advance += amt

            elif r.custom_type == "Loan":
                row["type"] = "Loan"
                row["loan_paid"] = amt
                total_loan += amt

            final.append(row)

        # TOTAL ROW
        final.append({
            "employee": "TOTAL",
            "advance": total_advance,
            "loan_paid": total_loan,
            "balance": total_loan
        })

    return final