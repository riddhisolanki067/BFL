import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
    filters = filters or {}
    validate_filters(filters)

    columns = get_columns()
    data = get_data(filters)
    return columns, data


def validate_filters(filters):
    if not filters.get("month"):
        frappe.throw(_("Please select Month"))


def get_columns():
    return [
        {"label": _("Employee"),        "fieldname": "employee",         "fieldtype": "Link",     "options": "Employee", "width": 140},
        {"label": _("Employee Name"),   "fieldname": "employee_name",    "fieldtype": "Data",     "width": 160},
        {"label": _("Type"),            "fieldname": "type",             "fieldtype": "Data",     "width": 140},
        {"label": _("Payment Type"),    "fieldname": "payment_type",     "fieldtype": "Data",     "width": 120},
        {"label": _("Days Present"),    "fieldname": "days_present",     "fieldtype": "Float",    "width": 120},
        {"label": _("Per Day Salary"),  "fieldname": "per_day_salary",   "fieldtype": "Currency", "width": 130},
        {"label": _("Total Salary"),    "fieldname": "total_salary",     "fieldtype": "Currency", "width": 130},
        {"label": _("Other Addings"),   "fieldname": "other_addings",    "fieldtype": "Currency", "width": 130},
        {"label": _("Other Deduction"), "fieldname": "other_deduction",  "fieldtype": "Currency", "width": 130},
        {"label": _("Amount"),          "fieldname": "amount",           "fieldtype": "Currency", "width": 120},
        {"label": _("Total Payable"),   "fieldname": "total_payable",    "fieldtype": "Currency", "width": 130},
        {"label": _("Advance Date"),    "fieldname": "advance_date",     "fieldtype": "Date",     "width": 120},
        {"label": _("Advance Amount"),  "fieldname": "advance_amount",   "fieldtype": "Currency", "width": 130},
        {"label": _("Loan Date"),       "fieldname": "loan_date",        "fieldtype": "Date",     "width": 120},
        {"label": _("Loan Amount"),     "fieldname": "loan_amount",      "fieldtype": "Currency", "width": 120},
        {"label": _("Deduction"),       "fieldname": "deduction_amount", "fieldtype": "Currency", "width": 120},
        {"label": _("Balance"),         "fieldname": "balance",          "fieldtype": "Currency", "width": 130},
    ]


def get_data(filters):
    je_employees = get_employees_from_je(filters)
    if not je_employees:
        return []

    employee_ids = list(je_employees.keys())
    emp_details = get_employee_details(employee_ids, filters)
    advance_map = get_je_type_map(employee_ids, "Advance", filters)
    loan_map = get_je_type_map(employee_ids, "Loan", filters)
    deduction_map = get_deduction_map(employee_ids, filters)

    data = []
    for eid, je_info in je_employees.items():
        emp = emp_details.get(eid)
        if not emp:
            continue

        per_day = flt(emp.get("custom_per_day_salary"))
        if not per_day and flt(emp.get("ctc")):
            per_day = flt(emp.get("ctc")) / 26

        adv = advance_map.get(eid, {})
        loan = loan_map.get(eid, {})
        ded = flt(deduction_map.get(eid, 0))

        data.append({
            "employee": eid,
            "employee_name": emp.get("employee_name") or je_info.get("employee_name") or eid,
            "type": je_info.get("type", ""),
            "payment_type": emp.get("custom_payment_type", ""),
            "days_present": 0,
            "per_day_salary": per_day,
            "total_salary": 0,
            "other_addings": 0,
            "other_deduction": 0,
            "amount": 0,
            "total_payable": 0,
            "advance_date": adv.get("posting_date"),
            "advance_amount": flt(adv.get("amount", 0)),
            "loan_date": loan.get("posting_date"),
            "loan_amount": flt(loan.get("amount", 0)),
            "deduction_amount": ded,
            "balance": 0,
        })

    return data


def get_employees_from_je(filters):
    conditions = [
        "jea.party_type = 'Employee'",
        "jea.party IS NOT NULL",
        "jea.party != ''",
        "jea.custom_month = %(month)s",
    ]
    values = {"month": filters.get("month")}

    if filters.get("type"):
        conditions.append("jea.custom_type = %(type)s")
        values["type"] = filters.get("type")

    where = " AND ".join(conditions)

    rows = frappe.db.sql(
        f"""
        SELECT
            jea.party AS employee,
            e.employee_name AS employee_name,
            jea.custom_employee AS custom_employee,
            jea.custom_type AS type
        FROM `tabJournal Entry Account` jea
        LEFT JOIN `tabEmployee` e ON e.name = jea.party
        WHERE {where}
        
        """,
        values,
        as_dict=True,
    )

    seen = {}
    for row in rows:
        eid = row.get("employee")
        if eid and eid not in seen:
            seen[eid] = {
                "employee_name": row.get("employee_name") or row.get("custom_employee")
                "type": row.get("type") or ""
            }

    return seen    
    
    conditions = [
        "jea.custom_employee IS NOT NULL",
        "jea.custom_employee != ''",
        "jea.custom_month = %(month)s",
    ]
    values = {"month": filters.get("month")}

    if filters.get("type"):
        conditions.append("jea.custom_type = %(type)s")
        values["type"] = filters.get("type")

    where = " AND ".join(conditions)

    rows = frappe.db.sql(
        f"""
        SELECT
            jea.custom_employee AS employee,
            e.name AS employee_name,
            jea.custom_type AS type
        FROM `tabJournal Entry Account` jea
        LEFT JOIN `tabEmployee` e ON e.name = jea.party
        WHERE {where}
        ORDER BY jea.modified DESC
        """,
        values,
        as_dict=True,
    )

    seen = {}
    for row in rows:
        eid = row.get("employee_name")
        if eid and eid not in seen:
            seen[eid] = {
                "employee_name": row.get("employee_name"),
                "type": row.get("type") or ""
            }

    return seen


def get_employee_details(employee_ids, filters):
    if not employee_ids:
        return {}

    conditions = ["name IN %(employees)s"]
    values = {"employees": tuple(employee_ids)}

    if filters.get("payment_type"):
        conditions.append("custom_payment_type = %(payment_type)s")
        values["payment_type"] = filters.get("payment_type")

    if filters.get("employment_type"):
        conditions.append("employment_type = %(employment_type)s")
        values["employment_type"] = filters.get("employment_type")

    where = " AND ".join(conditions)

    rows = frappe.db.sql(
        f"""
        SELECT
            name,
            employee_name,
            custom_payment_type,
            employment_type,
            ctc,
            custom_per_day_salary
        FROM `tabEmployee`
        WHERE {where}
        """,
        values,
        as_dict=True,
    )

    return {r["name"]: r for r in rows}


def get_je_type_map(employee_ids, entry_type, filters):
    if not employee_ids:
        return {}

    rows = frappe.db.sql(
        """
        SELECT
            jea.custom_employee AS employee,
            jea.posting_date AS posting_date,
            SUM(jea.debit_in_account_currency) AS amount
        FROM `tabJournal Entry Account` jea
        WHERE
            jea.custom_employee IN %(employees)s
            AND jea.custom_month = %(month)s
            AND jea.custom_type = %(entry_type)s
        GROUP BY jea.custom_employee
        """,
        {
            "employees": tuple(employee_ids),
            "month": filters.get("month"),
            "entry_type": entry_type,
        },
        as_dict=True,
    )

    return {
        r["employee"]: {
            "posting_date": r.get("posting_date"),
            "amount": flt(r.get("amount"))
        }
        for r in rows
    }


def get_deduction_map(employee_ids, filters):
    if not employee_ids:
        return {}

    rows = frappe.db.sql(
        """
        SELECT
            jea.custom_employee AS employee,
            SUM(jea.debit_in_account_currency) AS deduction_amount
        FROM `tabJournal Entry Account` jea
        WHERE
            jea.custom_employee IN %(employees)s
            AND jea.custom_month = %(month)s
            AND jea.custom_is_deducted = 1
        GROUP BY jea.custom_employee
        """,
        {
            "employees": tuple(employee_ids),
            "month": filters.get("month"),
        },
        as_dict=True,
    )

    return {r["employee"]: flt(r["deduction_amount"]) for r in rows}