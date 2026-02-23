frappe.query_reports["Journal Entry"] = {
    filters: [
        {
            fieldname: "account",
            label: "Account",
            fieldtype: "Link",
            options: "Account",
            reqd: 1
        },
        {
            fieldname: "from_date",
            label: "From Date",
            fieldtype: "Date",
            reqd: 1
        },
        {
            fieldname: "to_date",
            label: "To Date",
            fieldtype: "Date",
            reqd: 1
        },
        {
            fieldname: "year",
            label: "Year",
            fieldtype: "Int",
            default: new Date().getFullYear()
        },
        {
            fieldname: "month",
            label: "Month",
            fieldtype: "Select",
            options: [
                "",
                "January","February","March","April","May","June",
                "July","August","September","October","November","December"
            ],
            on_change: function() {
                console.log("this is working")

                let month = frappe.query_report.get_filter_value("month");
                let year = frappe.query_report.get_filter_value("year");

                if (!month || !year) {
                    return;
                }

                let monthIndex = new Date(Date.parse(month +" 1, "+year)).getMonth();

                let firstDay = new Date(year, monthIndex, 1);
                let lastDay = new Date(year, monthIndex + 1, 0);

                frappe.query_report.set_filter_value(
                    "from_date",
                    frappe.datetime.obj_to_str(firstDay)
                );

                frappe.query_report.set_filter_value(
                    "to_date",
                    frappe.datetime.obj_to_str(lastDay)
                );
                console.log("Button Clicked")
                $(document).on("click", ".print-je", function() {
                    console.log("Button Clicked")
                    let name = $(this).data("name");
                    if (!name) return;

                    let url = `/api/method/frappe.utils.print_format.download_pdf?` +
                        `doctype=Journal Entry&name=${name}&format=Standard&no_letterhead=0`;

                    window.open(url);
                });
            },
             

  

        }
    ]
};

