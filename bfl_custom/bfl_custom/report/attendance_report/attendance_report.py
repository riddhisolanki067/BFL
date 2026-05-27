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
    Build one column per date between from_date and to_date.
    All IN/OUT punches for that day are shown inside the single column.
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
        {
            "fieldname": "company",
            "label": _("Company"),
            "fieldtype": "Data",
            "width": 130,
        },
        {
            "fieldname": "custom_per_day_salary",
            "label": _("Per Day Salary"),
            "fieldtype": "Data",
            "width": 130,
        },
    ]

    # ONE column per date
    days = date_diff(filters.to_date, filters.from_date) + 1
    for i in range(days):
        d = add_days(filters.from_date, i)
        label_date = getdate(d).strftime("%d/%m/%y")

        columns.append({
            "fieldname": f"day_{d}",          # e.g. day_2025-01-01
            "label": label_date,              # e.g. 01/01/25
            "fieldtype": "Data",
            "width": 160,                     # wider to fit multiple punches
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
            e.company,
            e.custom_per_day_salary,
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

    # ---- Group by employee → date → ordered list of (time, log_type) ----
    from collections import defaultdict
    import datetime

    # Structure: emp_data[employee][date] = [ (HH:MM, "IN"/"OUT"), ... ]
    emp_meta = {}
    emp_data = defaultdict(lambda: defaultdict(list))

    punch_counter = defaultdict(lambda: defaultdict(int))  # for alternating fallback

    for row in checkins:
        emp  = row.employee
        date = str(row.checkin_date)
        t    = str(row.checkin_time)[:5]   # HH:MM

        emp_meta[emp] = {
            "employee_name":         row.employee_name,
            "designation":           row.designation or "",
            "company":               row.company or "",
            "custom_per_day_salary": row.custom_per_day_salary or 0,
        }

        log_type = (row.log_type or "").upper()

        if log_type in ("IN", "CHECK IN", "CHECKIN"):
            resolved_type = "IN"
        elif log_type in ("OUT", "CHECK OUT", "CHECKOUT"):
            resolved_type = "OUT"
        else:
            # Alternate IN / OUT when log_type is missing
            idx = punch_counter[emp][date]
            resolved_type = "IN" if idx % 2 == 0 else "OUT"
            punch_counter[emp][date] += 1

        emp_data[emp][date].append((t, resolved_type))

    # ---- Build date range list -------------------------------------------
    days = date_diff(filters.to_date, filters.from_date) + 1
    date_list = [str(add_days(filters.from_date, i)) for i in range(days)]

    # ---- Compose output rows ---------------------------------------------
    result = []

    for emp in sorted(emp_meta.keys()):
        meta     = emp_meta[emp]
        total_td = datetime.timedelta()

        row = frappe._dict(
            employee              = emp,
            employee_name         = meta["employee_name"],
            designation           = meta["designation"],
            company               = meta["company"],
            custom_per_day_salary = meta["custom_per_day_salary"],
        )

        for d in date_list:
            punches = emp_data[emp].get(d, [])
            # punches is already time-ordered (from ORDER BY ec.time in SQL)

            if punches:
                # Format each punch as "IN 09:00" / "OUT 18:00"
                # Join with " | " so all fit in one cell
                row[f"day_{d}"] = " | ".join(
                    f"{ptype} {ptime}" for ptime, ptype in punches
                )
            else:
                row[f"day_{d}"] = ""

            # Accumulate worked time: earliest IN → latest OUT of the day
            ins  = [ptime for ptime, ptype in punches if ptype == "IN"]
            outs = [ptime for ptime, ptype in punches if ptype == "OUT"]
            first_in  = min(ins)  if ins  else ""
            last_out  = max(outs) if outs else ""

            if first_in and last_out:
                try:
                    t_in  = datetime.datetime.strptime(d + " " + first_in,  "%Y-%m-%d %H:%M")
                    t_out = datetime.datetime.strptime(d + " " + last_out,  "%Y-%m-%d %H:%M")
                    if t_out > t_in:
                        total_td += t_out - t_in
                except Exception:
                    pass

        # Format total hours
        total_seconds    = int(total_td.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes          = remainder // 60
        row["total_hours"] = f"{hours:02d}:{minutes:02d} hrs" if (hours or minutes) else ""

        result.append(row)

    return result