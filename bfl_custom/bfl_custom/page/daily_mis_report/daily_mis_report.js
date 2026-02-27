frappe.pages['daily-mis-report'].on_page_load = function(wrapper) {

    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Daily MIS Report',
        single_column: true
    });

    // ---------------- FILTER SECTION ----------------

    var filterContainer = $('<div class="row" style="margin-bottom:20px;"></div>').appendTo(page.body);

    var fromCol = $('<div class="col-md-3"></div>').appendTo(filterContainer);
    $('<label><b>From Date</b></label>').appendTo(fromCol);
    var fromDateInput = $(`<input type="date" class="form-control" value="${frappe.datetime.get_today()}">`).appendTo(fromCol);

    var toCol = $('<div class="col-md-3"></div>').appendTo(filterContainer);
    $('<label><b>To Date</b></label>').appendTo(toCol);
    var toDateInput = $(`<input type="date" class="form-control" value="${frappe.datetime.get_today()}">`).appendTo(toCol);

    var btnCol = $('<div class="col-md-2"></div>').appendTo(filterContainer);
    var fetchButton = $('<button class="btn btn-primary" style="margin-top:25px;">Fetch</button>').appendTo(btnCol);

    var dataContainer = $('<div id="mis-data"></div>').appendTo(page.body);

    // ---------------- FETCH FUNCTION ----------------

    function fetchData() {

        let from_date = fromDateInput.val();
        let to_date = toDateInput.val();

        if (!from_date || !to_date) {
            frappe.msgprint("Please select date range");
            return;
        }

        frappe.call({
            method: "bfl_custom.bfl_custom.page.daily_mis_report.daily_mis_report.get_daily_mis",
            args: {
                from_date: from_date,
                to_date: to_date
            },
            callback: function(r) {
                if (r.message) {
                    render_mis(r.message, from_date, to_date);
                } else {
                    $('#mis-data').html("<p>No Data Found</p>");
                }
            }
        });
    }

    fetchButton.on("click", function() {
        fetchData();
    });

    fetchData(); // default load

    // ---------------- RENDER FUNCTION ----------------

    function render_mis(data, from_date, to_date) {

        let purchase_total = get_total(data.purchase);
        let sales_total = get_total(data.sales);
        let gate_count = data.gate.length;

        let html = `

        <style>

            body {
                background: #f4f6f9;
            }

            .mis-header {
                background: linear-gradient(90deg, #1e3c72, #2a5298);
                color: white;
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 25px;
            }

            .mis-summary {
                display: flex;
                gap: 15px;
                margin-bottom: 25px;
            }

            .summary-card {
                flex: 1;
                padding: 15px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                box-shadow: 0 3px 8px rgba(0,0,0,0.1);
                background: #8ca6b8;
            }

            .mis-section {
                background: white;
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 30px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.06);
            }

            .mis-section h4 {
                padding: 10px;
                background: #f0f2f5;
                border-left: 5px solid #2a5298;
                margin-bottom: 15px;
                font-weight: 600;
            }

            .mis-table {
                width: 100%;
                border-collapse: collapse;
            }

            .mis-table th {
                background: #2a5298;
                color: white;
                padding: 8px;
                font-size: 13px;
                text-align: left;
                border: 1px solid black;
            }

            .mis-table td {
                padding: 8px;
                border: 1px solid black;
                font-size: 13px;
            }

            .mis-table tr:nth-child(even) {
                background: #f9f9f9;
            }

            .mis-total {
                text-align: right;
                margin-top: 10px;
                padding: 8px;
                background: #ecf0f1;
                border-radius: 5px;
                font-weight: bold;
            }

            .no-data {
                text-align: center;
                padding: 10px;
                color: #888;
            }

        </style>

        

        <div class="mis-summary">
            <div class="summary-card">
                <h4>Total Purchase</h4>
                <h3>₹ ${purchase_total.toFixed(2)}</h3>
            </div>

            <div class="summary-card">
                <h4>Total Sales</h4>
                <h3>₹ ${sales_total.toFixed(2)}</h3>
            </div>

            <div class="summary-card">
                <h4>Gate Entries</h4>
                <h3>${gate_count}</h3>
            </div>
        </div>

        <div class="mis-section">
            <h4>Purchase Invoice</h4>
            ${get_table(data.purchase)}
        </div>

        <div class="mis-section">
            <h4>Gate Entry</h4>
            ${get_gate_table(data.gate)}
        </div>

        <div class="mis-section">
            <h4>Sales Invoice</h4>
            ${get_table(data.sales)}
        </div>
        `;

        $('#mis-data').html(html);
    }

    // ---------------- TABLE FUNCTIONS ----------------

    function get_table(rows) {

        if (!rows.length) return `<div class="no-data">No Records Found</div>`;

        let total = 0;

        let table = `
        <table class="mis-table">
            <tr>
                <th>Date</th>
                <th>Voucher</th>
                <th>Party</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Tax</th>
                <th>Amount</th>
            </tr>
        `;

        rows.forEach(r => {

            total += flt(r.amount || 0);

            table += `
            <tr>
                <td>${frappe.datetime.str_to_user(r.date)}</td>
                <td>${r.voucher}</td>
                <td>${r.party}</td>
                <td>${r.item}</td>
                <td>${r.qty}</td>
                <td>${r.rate}</td>
                <td>${r.tax || 0}</td>
                <td>${r.amount}</td>
            </tr>
            `;
        });

        table += `</table>
        <div class="mis-total">Section Total: ₹ ${total.toFixed(2)}</div>`;

        return table;
    }

    function get_gate_table(rows) {

        if (!rows.length) return `<div class="no-data">No Records Found</div>`;

        let table = `
        <table class="mis-table">
            <tr>
                <th>Date</th>
                <th>Voucher</th>
                <th>Party</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Entry Type</th>
                <th>Remark</th>
            </tr>
        `;

        rows.forEach(r => {
            table += `
            <tr>
                <td>${frappe.datetime.str_to_user(r.date)}</td>
                <td>${r.voucher}</td>
                <td>${r.party}</td>
                <td>${r.product}</td>
                <td>${r.qty}</td>
                <td>${r.entry_type}</td>
                <td>${r.remarks || ""}</td>
            </tr>
            `;
        });

        table += `</table>`;
        return table;
    }

    function get_total(rows) {
        let total = 0;
        rows.forEach(r => total += flt(r.amount || 0));
        return total;
    }

};