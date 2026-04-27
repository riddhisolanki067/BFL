// Client Script – DocType: Salary Report Details
// Adds "Show Report" button that opens Salary Statement script report
// with all filter values pre-filled from this single DocType form.

frappe.ui.form.on("Salary Report Details", {

    refresh: function (frm) {
        // ── Remove any previous button to avoid duplicates on refresh ──
        frm.page.clear_primary_action();
        frm.page.clear_secondary_action();

        // ── Primary "Show Report" button in the page header ──────────
     
        // ── Also add it as a form button (inner toolbar) ──────────────
        frm.add_custom_button(__("Show Report"), function () {
            show_salary_report(frm);
        }).addClass("btn-primary").css({
            "font-weight": "600",
            "background-color": "var(--primary)",
            "color": "#fff",
            "border-color": "var(--primary)"
        });
    },
});


// ─────────────────────────────────────────────────────────────────────────────
// Core: read form values → navigate to Script Report with filters applied
// ─────────────────────────────────────────────────────────────────────────────
function show_salary_report(frm) {
    // Collect every value from the Single DocType form
    let filters = {};

    if (frm.doc.month)            filters["month"]            = frm.doc.month;
    if (frm.doc.type)             filters["type"]             = frm.doc.type;
    if (frm.doc.employment_type)  filters["employment_type"]  = frm.doc.employment_type;
    if (frm.doc.payment_type)     filters["payment_type"]     = frm.doc.payment_type;
    if (frm.doc.other_add)        filters["other_add"]        = frm.doc.other_add;
    if (frm.doc.other_deduction)  filters["other_deduction"]  = frm.doc.other_deduction;
    if (frm.doc.present_days)     filters["present_days"]     = frm.doc.present_days;

    // Navigate to the Script Report – Frappe will pre-fill the filter fields
    frappe.set_route("query-report", "Salary Details", filters);
}