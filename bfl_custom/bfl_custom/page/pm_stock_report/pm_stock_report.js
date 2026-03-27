frappe.pages['pm-stock-report'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'PM Stock Report',
		single_column: true
	});

    // -------------------------------
    // FILTER UI
    // -------------------------------
    var filterContainer = $(`
        <div class="row align-items-end" style="margin-bottom:20px;"></div>
    `).appendTo(page.body);

    function make_filter(label, fieldtype, fieldname, options=null) {
        let col = $(`<div class="col-md-2">
            <label style="font-weight:600;">${label}</label>
        </div>`).appendTo(filterContainer);

        return frappe.ui.form.make_control({
            parent: col,
            df: {
                fieldtype: fieldtype,
                fieldname: fieldname,
                options: options,
                placeholder: label
            },
            render_input: true
        });
    }

    let from_date = make_filter("From Date", "Date", "from_date");
    let to_date = make_filter("To Date", "Date", "to_date");
    let bom = make_filter("BOM", "Link", "bom", "BOM");
    let item = make_filter("Item", "Link", "item", "Item");
    let item_group = make_filter("Item Group", "Link", "item_group", "Item Group");

    // Button
let btnGroup = $(`
    <div class="col-md-10 d-flex align-items-end justify-content-between">
        <button class="no-print btn btn-primary">Get Data</button>
        
		
        
    </div>
`).appendTo(filterContainer);

btnGroup.find(".btn-primary").click(load_data);
btnGroup.find(".btn-success").click(export_excel);
btnGroup.find(".btn-secondary").click(print_report);

    // -------------------------------
    // TABLE
    // -------------------------------
  var tableContainer = $(`
    <div style="
        
        overflow-x:auto;
        margin-top:15px;
        border:1px solid #d1d8dd;
        border-radius:10px;
        background:#fff;
    ">
        <table class="table table-bordered" style="
            
           
            margin:0;
        ">
            <thead style="background:#f7fafc;">
                <tr>
                    <th>Item</th>
                    <th>Opening</th>
                    <th>In</th>
                    <th>Purchase</th>
                    <th>Out</th>
                    <th>Sale</th>
                    <th>Packing Production</th>
                    <th>Balance</th>
                    <th>Actual Stock</th>
                    <th>Wastage</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
`).appendTo(page.body);

 function export_excel() {
        let rows = [];

        let headers = [];
        tableContainer.find("thead th").each(function() {
            headers.push($(this).text().trim());
        });
        rows.push(headers);

        tableContainer.find("tbody tr").each(function() {
            let row = [];

            $(this).find("td").each(function(index) {
                if (index === 8) {
                    row.push($(this).find("input").val() || 0);
                } else {
                    row.push($(this).text().trim());
                }
            });

            rows.push(row);
        });

        let csvContent = "data:text/csv;charset=utf-8," 
            + rows.map(e => e.join(",")).join("\n");

        let link = document.createElement("a");
        link.href = encodeURI(csvContent);
        link.download = "PM_Stock_Report.csv";
        link.click();
    }

    function print_report() {
        let table_html = tableContainer.html();

        let win = window.open('', '', 'width=900,height=700');

        win.document.write(`
            <html>
                <body>
                    <h3>PM Stock Report</h3>
                    ${table_html}
                </body>
            </html>
        `);

        win.document.close();
        win.print();
    }

    // BUTTON EVENTS (after functions exist)
   

	page.add_action_item(__('Excel'), () => export_excel());


    // -------------------------------
    // LOAD DATA
    // -------------------------------
    function load_data() {

        let filters = {
            from_date: from_date.get_value(),
            to_date: to_date.get_value(),
            bom: bom.get_value(),
            item: item.get_value(),
            item_group: item_group.get_value()
        };

        if (!filters.from_date || !filters.to_date || !filters.bom) {
            frappe.msgprint("Mandatory filters missing");
            return;
        }

        if (filters.item && filters.item_group) {
            frappe.msgprint("Select either Item OR Item Group");
            return;
        }

        frappe.call({
            method: "bfl_custom.bfl_custom.page.pm_stock_report.pm_stock_report.get_pm_stock_data",
            args: { filters: filters },
            callback: function(r) {
                render_table(r.message);
            }
        });
    }

    // -------------------------------
    // RENDER TABLE
    // -------------------------------
    function render_table(data) {
        let tbody = tableContainer.find("tbody");
        tbody.empty();

        data.forEach(row => {

            let tr = $(`
                <tr>
                    <td>${row.item}</td>
                    <td>${row.opening}</td>
                    <td>${row.gate_in}</td>
                    <td>${row.purchase}</td>
                    <td>${row.gate_out}</td>
                    <td>${row.sale}</td>
                    <td>${row.packing_production}</td>
                    <td><b>${row.balance_stock}</b></td>
                    <td><input type="number" "style="width:10px" class="form-control actual"></td>
                    <td class="wastage">0</td>
                </tr>
            `);

            // LIVE calculation
            tr.find(".actual").on("input", function() {
                let actual = flt($(this).val());
                let balance = flt(row.balance_stock);

                let wastage = balance - actual;

                tr.find(".wastage").text(wastage.toFixed(2));
            });

            tbody.append(tr);
        });
    }
};

function export_excel() {
    let rows = [];
    
    // Table headers
    let headers = [];
    tableContainer.find("thead th").each(function() {
        headers.push($(this).text().trim());
    });
    rows.push(headers);

    // Table data
    tableContainer.find("tbody tr").each(function() {
        let row = [];

        $(this).find("td").each(function(index) {
            if (index === 8) {
                // Actual stock input field
                row.push($(this).find("input").val() || 0);
            } else {
                row.push($(this).text().trim());
            }
        });

        rows.push(row);
    });

    // Convert to CSV
    let csvContent = "data:text/csv;charset=utf-8," 
        + rows.map(e => e.join(",")).join("\n");

    // Download
    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "PM_Stock_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function print_report() {

    let table_html = tableContainer.html();

    let printWindow = window.open('', '', 'width=1000,height=700');

    printWindow.document.write(`
        <html>
        <head>
            <title>PM Stock Report</title>                 
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }

                h2 {
                    text-align: center;
                    margin-bottom: 10px;
                }

                .filters {
                    margin-bottom: 15px;
                    font-size: 14px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }

                th, td {
                    border: 1px solid #000;
                    padding: 6px;
                    text-align: center;
                    font-size: 12px;
                }

                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }

                input {
                    border: none;
                    width: 100%;
                    text-align: center;
                }

                   
              
            </style>
        </head>

        <body>
            <h2>PM Stock Report</h2>

            <div class="filters">
                <b>From:</b> ${from_date.get_value()} &nbsp;&nbsp;
                <b>To:</b> ${to_date.get_value()} &nbsp;&nbsp;
                <b>BOM:</b> ${bom.get_value()}
            </div>

            ${table_html}

        </body>
        </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}