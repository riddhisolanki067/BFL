// Copyright (c) 2026, r and contributors
// For license information, please see license.txt

frappe.ui.form.on("MIXING PRODUCTION BATCH", {
    refresh(frm) {
        render_batch_matrix(frm);
    },
    batch_count(frm) {
        update_batch_data_for_count(frm);
        render_batch_matrix(frm);
    },
     before_save(frm) {
        update_batch_data_for_count(frm);
        render_batch_matrix(frm);
    },
    product: function(frm) {
        if (!frm.doc.product) {
            frm.clear_table('items_table');
            frm.refresh_field('items_table');
            render_batch_matrix(frm);
            return;
        }

        frappe.db.get_list('RECIPE MASTER', {
            filters: {
                product: frm.doc.product
            },
            fields: ['name'],
            limit: 1
        }).then((records) => {
            if (!records || !records.length) {
                frm.clear_table('items_table');
                frm.refresh_field('items_table');
                render_batch_matrix(frm);
                frappe.msgprint(__('No Recipe Master found for product {0}', [frm.doc.product]));
                return;
            }

            let receipt_master_name = records[0].name;

            frappe.model.with_doc('RECIPE MASTER', receipt_master_name, function() {
                let source_doc = frappe.model.get_doc('RECIPE MASTER', receipt_master_name);

                frm.clear_table('items_table');

                (source_doc.items || []).forEach(row => {
                    let d = frm.add_child('items_table');
                    d.item = row.material;
                    d.qty = row.qty;
                    d.uom = row.uom;
                    d.batch_data = '';
                });

                frm.refresh_field('items_table');

               
            });
        });
    }
});


frappe.ui.form.on('Mixing Production Batch Item', {
   items_table_add(frm) {
        render_batch_matrix(frm);
    },
    items_table_remove(frm) {
        render_batch_matrix(frm);
    },
    item(frm, cdt, cdn) {
        render_batch_matrix(frm);
    },
    qty(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.batch_data || row.batch_data.trim() === "") {
            let count = cint(frm.doc.batch_count || 0);
            let data = {};
            for (let i = 1; i <= count; i++) {
                data[i] = row.qty || 0;
            }
            frappe.model.set_value(cdt, cdn, 'batch_data', JSON.stringify(data));
        }
        render_batch_matrix(frm);
    }
});

function update_batch_data_for_count(frm) {
    let count = cint(frm.doc.batch_count || 0);

    (frm.doc.items_table || []).forEach(row => {
        let data = {};

        if (row.batch_data && row.batch_data.trim() !== "") {
            try {
                data = JSON.parse(row.batch_data);
            } catch (e) {
                data = {};
            }
        }

        if (Object.keys(data).length === 0) {
            for (let i = 1; i <= count; i++) {
                data[i] = row.qty || 0;
            }
        } else {
            for (let i = 1; i <= count; i++) {
                if (!(i in data)) {
                    data[i] = row.qty || 0;
                }
            }

            Object.keys(data).forEach(key => {
                if (cint(key) > count) {
                    delete data[key];
                }
            });
        }

        row.batch_data = JSON.stringify(data);
    });

    frm.dirty();
    frm.refresh_field('items_table');
}

function render_batch_matrix(frm) {
    let count = cint(frm.doc.batch_count || 0);
    let rows = frm.doc.items_table || [];
    let html = `
        <div style="overflow:auto">
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th style="min-width:200px">Item</th>
                        <th style="min-width:120px">Qty</th>
    `;

    for (let i = 1; i <= count; i++) {
        html += `<th style="min-width:100px; text-align:center">${i}</th>`;
    }

    html += `<th style="min-width:120px; text-align:center">Total</th>
            </tr>
        </thead>
        <tbody>`;

    rows.forEach(row => {
        let data = {};

        if (row.batch_data && row.batch_data.trim() !== "") {
            try {
                data = JSON.parse(row.batch_data);
            } catch (e) {
                data = {};
            }
        }

        let row_total = 0;

        html += `
            <tr>
                <td>${frappe.utils.escape_html(row.item || '')}</td>
                <td>${row.qty || 0}</td>
        `;

        for (let i = 1; i <= count; i++) {
            let val = data[i] ?? row.qty ?? 0;
            row_total += flt(val);

            html += `
                <td>
                    <input
                        type="number"
                        class="form-control batch-cell"
                        data-rowname="${row.name}"
                        data-batch="${i}"
                        value="${val}"
                    >
                </td>
            `;
        }

        html += `<td style="text-align:right; font-weight:bold;">${row_total}</td>`;
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;

    let wrapper = frm.get_field('table').$wrapper;
    wrapper.html(html);

    wrapper.find('.batch-cell').on('change', function () {
        let rowname = $(this).attr('data-rowname');
        let batch = cint($(this).attr('data-batch'));
        let value = $(this).val();

        let row = (frm.doc.items_table || []).find(d => d.name === rowname);
        if (!row) return;

        let data = {};
        if (row.batch_data && row.batch_data.trim() !== "") {
            try {
                data = JSON.parse(row.batch_data);
            } catch (e) {
                data = {};
            }
        }

        for (let i = 1; i <= count; i++) {
            if (!(i in data)) {
                data[i] = row.qty || 0;
            }
        }

        for (let i = batch; i <= count; i++) {
            data[i] = value;
        }

        frappe.model.set_value(row.doctype, row.name, 'batch_data', JSON.stringify(data));
        frm.dirty();
        render_batch_matrix(frm);
    });
}