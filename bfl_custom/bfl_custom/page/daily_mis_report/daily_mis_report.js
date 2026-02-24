frappe.pages['daily-mis-report'].on_page_load = function(wrapper) {

    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Daily MIS Report',
        single_column: true
    });

    load_mis_data(page);
};


function load_mis_data(page) {
    frappe.call({
        method: "bfl_custom.bfl_custom.page.daily_mis_report.daily_mis_report.get_daily_mis",  // <-- change app name if needed
        callback: function(r) {
            if (r.message) {
                render_mis(page, r.message);
            }
        }
    });
}


function render_mis(page, data) {

    let today = frappe.datetime.get_today();

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

        .mis-header h2 {
            margin: 0;
            font-weight: 600;
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
        }

        .purchase-card { background: #8ca6b8; }
        .sales-card { background: #8ca6b8; }
        .gate-card { background: #8ca6b8; }

        .summary-card h4 {
            margin: 0;
            font-size: 14px;
        }

        .summary-card h3 {
            margin: 5px 0 0 0;
            font-weight: 600;
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
			border : 1px solid black;
        }

        .mis-table th {
            background: #2a5298;
            color: white;
            padding: 8px;
            font-size: 13px;
            text-align: left;
			border : 1px solid black;

        }

        .mis-table td {
            padding: 8px;
            border: 1px solid black
            font-size: 13px;
        }

        .mis-table tr {
            background: #f9f9f9;
			border: 1px solid black
			
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
        <div class="summary-card purchase-card">
            <h4>Total Purchase</h4>
            <h3>₹ ${purchase_total.toFixed(2)}</h3>
        </div>

        <div class="summary-card sales-card">
            <h4>Total Sales</h4>
            <h3>₹ ${sales_total.toFixed(2)}</h3>
        </div>

        <div class="summary-card gate-card">
            <h4>Gate Entries</h4>
            <h3>${gate_count}</h3>
        </div>
    </div>


    <div class="mis-section">
        <h4>Purchase Invoice</h4>
        ${get_purchase_sales_table(data.purchase)}
    </div>

    <div class="mis-section">
        <h4>Gate Entry</h4>
        ${get_gate_table(data.gate)}
    </div>

    <div class="mis-section">
        <h4>Sales Invoice</h4>
        ${get_purchase_sales_table(data.sales)}
    </div>

    `;

    $(page.body).html(html);
}



function get_purchase_sales_table(rows) {

    if (!rows.length) {
        return `<div class="no-data">No Records Found</div>`;
    }

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

        total += flt(r.amount);

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
        <div class="mis-total">Section Total: ₹ ${total.toFixed(2)}</div>
    `;

    return table;
}



function get_gate_table(rows) {

    if (!rows.length) {
        return `<div class="no-data">No Records Found</div>`;
    }

    let table = `
    <table class="mis-table">
        <tr>
            <th>Date</th>
            <th>Voucher</th>
            <th>Party</th>
            <th>Item</th>
            <th>Qty </th>
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
            <td>${r.qty || 0}</td>
            <td>${r.entry_type || 0}</td>
            <td>${r.remarks || ""}</td>
        </tr>
        `;
    });

    table += `</table>`;

    return table;
}



function get_total(rows) {
    let total = 0;
    rows.forEach(r => {
        total += flt(r.amount || 0);
    });
    return total;
}