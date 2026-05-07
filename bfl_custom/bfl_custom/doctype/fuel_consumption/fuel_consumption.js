frappe.ui.form.on("Fuel Consumption Detail", {

    burner_1_qty: calculate_values,
    burner_2_qty: calculate_values,
    burner_3_qty: calculate_values,
    start_time: calculate_values,
    end_time: calculate_values,
    burner_breakdown: calculate_values

});



function calculate_values(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    // TOTAL CONSUMPTION
    row.total_consumption =
        (flt(row.burner_1_qty) || 0) +
        (flt(row.burner_2_qty) || 0) +
        (flt(row.burner_3_qty) || 0);

    // WORKING HOURS
    if (row.start_time && row.end_time) {

        let start = moment(row.start_time, "HH:mm:ss");
        let end = moment(row.end_time, "HH:mm:ss");

        let total_minutes = end.diff(start, "minutes");

        // BREAKDOWN
        let breakdown_minutes = 0;

        if (row.burner_breakdown) {

            let breakdown = moment.duration(row.burner_breakdown);

            breakdown_minutes = breakdown.asMinutes();
        }

        let working_minutes = total_minutes - breakdown_minutes;

        row.total_working_hour = working_minutes / 60;
        row.total_consumption = row.burner_1_qty_consumed + row.burner_2_qty_consumed + row.burner_3_qty_consumed;
        // CONSUMPTION PER HOUR
        if (row.total_working_hour > 0) {

            row.consumption_per_hour =
                row.total_consumption /
                row.total_working_hour;
        }
    }

    refresh_field("items");
}