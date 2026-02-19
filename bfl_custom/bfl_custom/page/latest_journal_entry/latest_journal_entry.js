frappe.pages['latest_journal_entry'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'None',
		single_column: true
	});
	
	let account = page.add_field({
        label: 'Account',
        fieldtype: 'Link',
        fieldname: 'account',
        options: 'Account',
        reqd: 1
    });

    let from_date = page.add_field({
        label: 'From Date',
        fieldtype: 'Date',
        fieldname: 'from_date',
        reqd: 1
    });

    page.add_inner_button('Load', () => load_data());

    let $table = $('<div class="mt-4"></div>').appendTo(page.body);

    function load_data() {

        frappe.call({
            method: 'your_app.your_app.page.latest_journal_entry.latest_journal_entry.get_latest_journal_entries',
            args: {
                account: account.get_value(),
                from_date: from_date.get_value()
            },
            callback: function(r) {

                if (!r.message) return;

                render_table(r.message);
            }
        });
    }

    function render_table(res) {

        let data = res.rows;

        let html = `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Voucher</th>
                        <th>Posting Date</th>
                        <th>Account</th>
                        <th>Counter Details</th>
                        <th>Remark</th>
                        <th>Status</th>
                        <th>Payment Type</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th>Running Balance</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(row => {

            html += `
                <tr>
                    <td>${row.voucher}</td>
                    <td>${row.posting_date || ''}</td>
                    <td>${row.cash_account || ''}</td>
                    <td>${row.counter_details || ''}</td>
                    <td>${row.remark || ''}</td>
                    <td>${row.status || ''}</td>
                    <td>${row.custom_payment_type || ''}</td>
                    <td>${row.debit || 0}</td>
                    <td>${row.credit || 0}</td>
                    <td>${row.running_balance || 0}</td>
                </tr>
            `;
        });

        // ⭐ TOTAL ROW
        html += `
            <tr style="font-weight:bold; background:#f5f5f5;">
                <td colspan="7" style="text-align:right;">TOTAL</td>
                <td>${res.total_debit}</td>
                <td>${res.total_credit}</td>
                <td></td>
            </tr>
        `;

        html += `</tbody></table>`;

        $table.html(html);
    }
};