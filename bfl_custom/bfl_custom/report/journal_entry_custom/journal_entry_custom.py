import frappe
from frappe.utils import getdate, add_months, date_format
from datetime import datetime


def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data


def get_columns():
    return [
        {"label": "Voucher", "fieldname": "voucher", "fieldtype": "Link", "options": "Journal Entry", "width": 120},
        {"label": "Posting Date", "fieldname": "posting_date", "fieldtype": "Date", "width": 100},
        {"label": "Account", "fieldname": "account", "fieldtype": "Link", "options": "Account", "width": 180},
        {"label": "Counter Details", "fieldname": "counter", "fieldtype": "Data", "width": 250},
        {"label": "Remark", "fieldname": "remark", "fieldtype": "Data", "width": 200},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 90},
        {"label": "Payment Type", "fieldname": "payment_type", "fieldtype": "Data", "width": 120},
        {"label": "Debit", "fieldname": "debit", "fieldtype": "Currency", "width": 120},
        {"label": "Credit", "fieldname": "credit", "fieldtype": "Currency", "width": 120},
        {"label": "Running Balance", "fieldname": "running_balance", "fieldtype": "Currency", "width": 150},
    ]


def get_data(filters):
    account = filters.get("account")

    from_date, to_date = get_date_range(filters)

    # --------------------------
    # Opening Balance
    # --------------------------
    opening = frappe.db.sql("""
        SELECT COALESCE(SUM(debit_in_account_currency - credit_in_account_currency), 0)
        FROM `tabJournal Entry Account` jea
        JOIN `tabJournal Entry` je ON je.name = jea.parent
        WHERE jea.account = %s
        AND je.posting_date < %s
        AND je.docstatus = 1
    """, (account, from_date))[0][0]

    data = []

    running_balance = opening

    # Opening Row
    data.append({
        "voucher": "Opening",
        "posting_date": from_date,
        "account": account,
        "counter": "",
        "remark": "Opening Balance",
        "status": "",
        "payment_type": "",
        "debit": 0,
        "credit": 0,
        "running_balance": running_balance
    })

    # --------------------------
    # Main Entries
    # --------------------------
    entries = frappe.db.sql("""
        SELECT
            je.name,
            je.posting_date,
            je.remark,
            je.docstatus,
            je.custom_payment_type,
            jea.name as row_name,
            jea.debit_in_account_currency,
            jea.credit_in_account_currency
        FROM `tabJournal Entry` je
        JOIN `tabJournal Entry Account` jea ON je.name = jea.parent
        WHERE jea.account = %s
        AND je.posting_date BETWEEN %s AND %s
        AND je.docstatus = 1
        ORDER BY je.posting_date, je.name, jea.name
    """, (account, from_date, to_date), as_dict=True)

    for e in entries:

        counter = get_counter_details(e.name, e.row_name)

        debit = e.debit_in_account_currency
        credit = e.credit_in_account_currency

        running_balance += (debit - credit)

        data.append({
            "voucher": e.name,
            "posting_date": e.posting_date,
            "account": account,
            "counter": counter,
            "remark": e.remark,
            "status": "Submitted",
            "payment_type": e.custom_payment_type,
            "debit": debit,
            "credit": credit,
            "running_balance": running_balance
        })

    return data


def get_counter_details(parent, row_name):

    rows = frappe.db.sql("""
        SELECT account, party, debit_in_account_currency, credit_in_account_currency
        FROM `tabJournal Entry Account`
        WHERE parent = %s AND name != %s
    """, (parent, row_name), as_dict=True)

    details = []

    for r in rows:
        party_part = f" ({r.party})" if r.party else ""
        details.append(
            f"{r.account}{party_part} D:{r.debit_in_account_currency} C:{r.credit_in_account_currency}"
        )

    return "; ".join(details)


def get_date_range(filters):

    month = filters.get("month")
    year = filters.get("year")
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    # If month selected → calculate automatically
    if month and year:
        month_number = datetime.strptime(month, "%B").month
        from_date = datetime(int(year), month_number, 1).date()
        to_date = add_months(from_date, 1)
        to_date = to_date.replace(day=1)
        to_date = add_months(from_date, 1) - frappe.utils.timedelta(days=1)

    return getdate(from_date), getdate(to_date)