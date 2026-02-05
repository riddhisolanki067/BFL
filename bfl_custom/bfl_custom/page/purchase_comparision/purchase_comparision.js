frappe.pages['purchase-comparision'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: null,
		single_column: true
	});

   const pi = frappe.route_options?.pi;

	console.log(pi)

    page.add_action_item(__('Print'), () => window.print());

    if (!pi) {
        page.main.html('<p>No Purchase Invoice selected</p>');
        return;
    }

    frappe.call({
        method: 'bfl_custom.py.purchase_comparison.get_data',
        args: { pi },
        callback(r) {
            page.main.html(render_html(r.message));
        }
    });
};

function render_html(data) {

    let html = `
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
        }

        h2 {
            text-align: center;
            margin-bottom:15px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }

        th, td {
            border: 1px solid #000;
            padding: 4px;
            
        }

        th {
            background: #f2f2f2;
            font-weight: bold;
        }

        .no-border td {
            border: none;
            text-align: left;
            padding: 2px 4px;
        }

        .section-title {
            font-weight: bold;
            background: #d9d9d9;
            text-align: left;
			color: red;
        }

        @media print {
            .no-print { display: none; }
        }
    </style>

    <h2>PURCHASE COMPARISION REPORT</h2>

    <!-- HEADER DETAILS -->
    <table class="no-border">
        <tr>
            <td><b>Supplier Name</b></td><td>${data.pi.supplier}</td>
            <td><b>Purchase Invoice No</b></td><td>${data.pi.name}</td>
        </tr>
        <tr>
            <td><b>Supplier GSTIN</b></td><td>${data.pi.supplier_gstin}</td>
            <td><b>Purchase Date</b></td><td>${data.pi.posting_date}</td>
        </tr>
        <tr>
            <td><b>Place of Supply</b></td><td>${data.pi.place_of_supply}</td>
            <td><b>Supplier Invoice No</b></td><td>${data.pi.bill_no}</td>
        </tr>
        <tr>
            <td><b>Payment Terms</b></td><td>-</td>
            <td><b>Supplier Invoice Date</b></td><td>${data.pi.bill_date}</td>
        </tr>
        <tr>
            <td><b>Contact Person Number</b></td><td>${data.pi.contact_number}</td>
        </tr>
    </table>

    <!-- CURRENT -->
    <table>
        <tr>
            <td colspan="14" class="section-title">CURRENT</td>
        </tr>
        <tr>
            <th>Sr</th>
            <th>INV NO</th>
            <th>DATE</th>
            <th>Item Name</th>
            <th>UOM</th>
            <th>BILL QTY</th>
            <th>ACCEPT QTY</th>
            <th>REJECTED QTY</th>
            <th>RATE</th>
            <th>Amount</th>
            <th>CREDIT DAYS</th>
           
        </tr>
    `;

    data.current_items.forEach((d, i) => {
        const amount = (d.qty * d.rate).toFixed(2);
        html += `
        <tr>
            <td>${i + 1}</td>
            <td>${data.pi.name}</td>
            <td>${data.pi.posting_date}</td>
            <td>${d.item_name}</td>
            <td>${d.uom}</td>
            <td>${d.qty}</td>
            <td>${d.qty}</td>
            <td>${d.rejected_qty}</td>
            <td>${d.rate}</td>
            <td>${amount}</td>
            <td>0</td>
            
        </tr>`;
    });

    html += `</table>`;

    html += `
    <table>
        <tr>
            <td colspan="14" class="section-title">OLD PRICE</td>
        </tr>
        <tr>
            <th>SUPPLIER</th>
            <th>SUPPLIER INVOICE</th>
            <th>INV NO</th>
            <th>DATE</th>
            <th>Item Name</th>
            <th>UOM</th>
            <th>BILL QTY</th>
            <th>ACCEPT QTY</th>
            <th>REJECTED QTY</th>
            <th>RATE</th>
            <th>Status</th>
            <th>Remarks</th>

            <th>Amount</th>
           
        </tr>
    `;

    Object.keys(data.history).forEach(item => {
        data.history[item].forEach(r => {
            const amount = (r.qty * r.rate).toFixed(2);
            html += `
            <tr>
                <td>${r.supplier}</td>
                <td>${r.bill_no}</td>
                <td>${r.name}</td>
                <td>${r.posting_date}</td>
                <td>${r.item_name}</td>
                <td>${r.uom}</td>
                <td>${r.qty}</td>
                <td>${r.qty}</td>
                <td>${r.rejected_qty}</td>
                <td>${r.rate}</td>
                <td>${amount}</td>
                <td>${r.status}</td>
                <td>${r.remarks}</td>
                
            </tr>`;
        });
    });

    html += `
    </table>

    <table class="no-border">
        <tr>
            <td><b>INVOICE REMARK:${data.pi.remarks} </b></td>
        </tr>
        <tr><td style="height:40px;"></td></tr>
    </table>

    <table class="no-border">
        <tr>
            <td style="width:50%"><b>CHECKED BY</b></td>
            <td style="width:50%"><b>VERIFIED BY</b></td>
        </tr>
    </table>
    `;

    return html;
}


function get_pi_from_anywhere() {

    // 1️⃣ From route options (first open)
    if (frappe.route_options && frappe.route_options.pi) {
        const pi = frappe.route_options.pi;
        sessionStorage.setItem('purchase_comparison_pi', pi);
        frappe.route_options = null;
        return pi;
    }

    // 2️⃣ From URL query (?pi=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const piFromUrl = urlParams.get('pi');
    if (piFromUrl) {
        sessionStorage.setItem('purchase_comparison_pi', piFromUrl);
        return piFromUrl;
    }

    // 3️⃣ From session storage (refresh case)
    return sessionStorage.getItem('purchase_comparison_pi');
}
