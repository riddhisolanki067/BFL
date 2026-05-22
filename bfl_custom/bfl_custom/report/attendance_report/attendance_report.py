

import frappe
from frappe import _
from frappe.utils import getdate, get_datetime, format_time


def execute(filters=None):
    filters = frappe._dict(filters or {})
    validate_filters(filters)

    columns = get_columns(filters)
    data    = get_data(filters)

    return columns, data


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_filters(filters):
    if not filters.get("from_date"):
        frappe.throw(_("Please set From Date"))
    if not filters.get("to_date"):
        frappe.throw(_("Please set To Date"))
    if getdate(filters.from_date) > getdate(filters.to_date):
        frappe.throw(_("From Date cannot be greater than To Date"))


# ---------------------------------------------------------------------------
# Columns
# ---------------------------------------------------------------------------

def get_columns(filters):
    """
    Build dynamic date columns between from_date and to_date.
    Each date gets two sub-columns: In Time  |  Out Time
    """
    from frappe.utils import date_diff, add_days

    columns = [
        {
            "fieldname": "employee",
            "label": _("Employee"),
            "fieldtype": "Link",
            "options": "Employee",
            "width": 120,
        },
        {
            "fieldname": "employee_name",
            "label": _("Employee Name"),
            "fieldtype": "Data",
            "width": 150,
        },
        {
            "fieldname": "designation",
            "label": _("Designation"),
            "fieldtype": "Data",
            "width": 130,
        },
    ]

    # Generate one pair of columns per date
    days = date_diff(filters.to_date, filters.from_date) + 1
    for i in range(days):
        d = add_days(filters.from_date, i)
        label_date = getdate(d).strftime("%d/%m/%y")

        columns.append({
            "fieldname": f"in_{d}",
            "label": f"{label_date} IN",
            "fieldtype": "Data",
            "width": 90,
        })
        columns.append({
            "fieldname": f"out_{d}",
            "label": f"{label_date} OUT",
            "fieldtype": "Data",
            "width": 90,
        })

    columns.append({
        "fieldname": "total_hours",
        "label": _("Total Hours"),
        "fieldtype": "Data",
        "width": 100,
    })

    return columns


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

def get_data(filters):
    from frappe.utils import add_days, date_diff

    # ---- Build employee filter -------------------------------------------
    emp_condition = ""
    emp_params    = {}

    if filters.get("employee"):
        emp_condition = "AND ec.employee = %(employee)s"
        emp_params["employee"] = filters.employee

    if filters.get("department"):
        emp_condition += " AND e.department = %(department)s"
        emp_params["department"] = filters.department

    if filters.get("branch"):
        emp_condition += " AND e.branch = %(branch)s"
        emp_params["branch"] = filters.branch

    # ---- Fetch raw checkin records ---------------------------------------
    checkins = frappe.db.sql(
        f"""
        SELECT
            ec.employee,
            ec.employee_name,
            e.designation,
            DATE(ec.time)          AS checkin_date,
            TIME(ec.time)          AS checkin_time,
            ec.log_type
        FROM
            `tabEmployee Checkin` ec
            LEFT JOIN `tabEmployee` e ON e.name = ec.employee
        WHERE
            DATE(ec.time) BETWEEN %(from_date)s AND %(to_date)s
            {emp_condition}
        ORDER BY
            ec.employee, ec.time
        """,
        dict(from_date=filters.from_date, to_date=filters.to_date, **emp_params),
        as_dict=True,
    )

    if not checkins:
        return []

    # ---- Group by employee → date → [IN/OUT list] -----------------------
    from collections import defaultdict
    import datetime

    # Structure:  emp_data[employee] = { date: {"in": [...], "out": [...]} }
    emp_meta  = {}          # employee → {name, designation}
    emp_data  = defaultdict(lambda: defaultdict(lambda: {"in": [], "out": []}))

    for row in checkins:
        emp  = row.employee
        date = str(row.checkin_date)
        t    = str(row.checkin_time)[:5]   # HH:MM

        emp_meta[emp] = {
            "employee_name": row.employee_name,
            "designation":   row.designation or "",
        }

        log_type = (row.log_type or "").upper()
        if log_type in ("IN", "CHECK IN", "CHECKIN"):
            emp_data[emp][date]["in"].append(t)
        elif log_type in ("OUT", "CHECK OUT", "CHECKOUT"):
            emp_data[emp][date]["out"].append(t)
        else:
            # If log_type is missing, alternate IN/OUT by index
            existing_in  = len(emp_data[emp][date]["in"])
            existing_out = len(emp_data[emp][date]["out"])
            if existing_in == existing_out:
                emp_data[emp][date]["in"].append(t)
            else:
                emp_data[emp][date]["out"].append(t)

    # ---- For each employee+date: sort IN asc, OUT asc so
    #      ins[0]  = earliest punch-in  (FIRST IN)
    #      outs[-1] = latest punch-out  (LAST OUT)
    for emp in emp_data:
        for date in emp_data[emp]:
            emp_data[emp][date]["in"].sort()
            emp_data[emp][date]["out"].sort()

    # ---- Build date range list -------------------------------------------
    days = date_diff(filters.to_date, filters.from_date) + 1
    date_list = [
        str(add_days(filters.from_date, i)) for i in range(days)
    ]

    # ---- Compose output rows ---------------------------------------------
    result = []

    for emp in sorted(emp_meta.keys()):
        meta     = emp_meta[emp]
        total_td = datetime.timedelta()   # accumulate worked time

        row = frappe._dict(
            employee      = emp,
            employee_name = meta["employee_name"],
            designation   = meta["designation"],
        )

        for d in date_list:
            day_checkins = emp_data[emp].get(d, {"in": [], "out": []})
            ins  = day_checkins["in"]   # already sorted ascending
            outs = day_checkins["out"]  # already sorted ascending

            # FIRST IN (earliest) and LAST OUT (latest)
            first_in  = ins[0]   if ins  else ""
            last_out  = outs[-1] if outs else ""

            row[f"in_{d}"]  = first_in
            row[f"out_{d}"] = last_out

            # Accumulate worked duration: FIRST IN → LAST OUT
            if first_in and last_out:
                try:
                    t_in  = datetime.datetime.strptime(d + " " + first_in, "%Y-%m-%d %H:%M")
                    t_out = datetime.datetime.strptime(d + " " + last_out,  "%Y-%m-%d %H:%M")
                    if t_out > t_in:
                        total_td += t_out - t_in
                except Exception:
                    pass

        # Format total hours
        total_seconds      = int(total_td.total_seconds())
        hours, remainder   = divmod(total_seconds, 3600)
        minutes            = remainder // 60
        row["total_hours"] = f"{hours:02d}:{minutes:02d} hrs" if hours or minutes else ""

        result.append(row)

    return result