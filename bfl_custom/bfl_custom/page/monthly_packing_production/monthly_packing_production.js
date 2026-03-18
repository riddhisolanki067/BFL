frappe.pages['monthly-packing-production'].on_page_load = function(wrapper) {

var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Monthly Packing Production Register',
    single_column: true
});

// ================= FILTER BAR =================

var filterContainer = $(`
<div class="row align-items-end" style="margin-bottom:20px; gap:10px;">
</div>
`).appendTo(page.body);

// From Date
var fromCol = $(`
<div class="col-md-3">
    <label style="font-weight:600;">From Date</label>
</div>
`).appendTo(filterContainer);

var fromDateInput = frappe.ui.form.make_control({
    parent: fromCol,
    df: {
        fieldtype: "Date",
        fieldname: "from_date",
        default: frappe.datetime.month_start()
    },
    render_input: true
});

// To Date
var toCol = $(`
<div class="col-md-3">
    <label style="font-weight:600;">To Date</label>
</div>
`).appendTo(filterContainer);

var toDateInput = frappe.ui.form.make_control({
    parent: toCol,
    df: {
        fieldtype: "Date",
        fieldname: "to_date",
        default: frappe.datetime.get_today()
    },
    render_input: true
});

// Buttons
var btnCol = $(`
<div class="col-md-4 d-flex align-items-end gap-10">
</div>
`).appendTo(filterContainer);

var fetchButton = $(`<button class="btn btn-primary" style="margin-left:20px; margin-bottom:15px">Fetch</button>`).appendTo(btnCol);
var printBtn = $(`<button class="btn btn-success" style="margin-left:20px; margin-bottom:15px;">Print</button>`).appendTo(btnCol);

var dataContainer = $('<div id="mis-data"></div>').appendTo(page.body);

// ================= FETCH =================

fetchButton.on("click", function () {

let from_date = fromDateInput.get_value();
let to_date = toDateInput.get_value();

if (!from_date || !to_date) {
    frappe.msgprint("Please select both dates");
    return;
}

let diff = frappe.datetime.get_day_diff(to_date, from_date);

if (diff > 30) {
    frappe.msgprint("Maximum allowed date range is 31 days");
    return;
}

frappe.call({
    method: "bfl_custom.bfl_custom.page.monthly_packing_production.monthly_packing_production.get_data",
    args: { from_date, to_date },
    callback: function(r) {
        render_report(r.message);
    }
});

});

// ================= PRINT =================

printBtn.on("click", function () {

let printContents = document.getElementById("mis-data").innerHTML;

let win = window.open('', '', 'height=900,width=1200');

win.document.write('<html><head><title>Production Register</title></head><body>');
win.document.write(printContents);
win.document.write('</body></html>');

win.document.close();
win.print();

});

// ================= RENDER =================

function render_report(data){

let summary = data.contractor_summary;
let rows = data.data;
let from_date = fromDateInput.get_value();
let to_date = toDateInput.get_value();

let days = 31;
let pivot = {};
let day_total_box = {};
let day_total_cw = {};
let day_total_ct = {};

for(let i=1;i<=31;i++){
    day_total_box[i]=0;
    day_total_cw[i]=0;
    day_total_ct[i]=0;
}

// -------- PIVOT BUILD --------

rows.forEach(r=>{

let key = r.contractor+"-"+r.machine+"-"+r.item_name;

if(!pivot[key]){
    pivot[key]={
        contractor:r.contractor,
        machine:r.machine,
        item:r.item_name,
        days:{},
        total:0
    }
}

pivot[key].days[r.d] = {
    box: r.box || 0,
    company_worker: r.custom_company_worker || 0,
    contractor_worker: r.custom_contractor_worker || 0
};

pivot[key].total += r.box || 0;
day_total_box[r.d] += r.box || 0;
day_total_cw[r.d] += r.company_worker || 0;
day_total_ct[r.d] += r.contractor_worker || 0;

});

// -------- HTML --------

let html = `
<style>
@page{ size:A4 landscape; margin:10mm; }

table{
width:100%;
border-collapse:collapse;
font-size:11px;
margin-bottom:20px;
}

th,td{
border:1px solid #000;
padding:4px;
text-align:center;
}

th{background:#efefef;}

.machine_total{ background:#f5f5f5; font-weight:bold; }
.total{ background:#d9d9d9; font-weight:bold; }

.green{background:#b6ffb3;}
.red{background:#ffb3b3;}

td div{ line-height:1.2; font-size:10px; }

.title{
text-align:center;
font-size:18px;
font-weight:bold;
margin-bottom:4px;
}

.month{
text-align:center;
font-size:14px;
margin-bottom:10px;
}

.summary_title{
font-weight:bold;
font-size:14px;
margin-bottom:5px;
}

@media print {

* {
-webkit-print-color-adjust: exact !important;
print-color-adjust: exact !important;
}

.green{
background:#b6ffb3 !important;
}

.red{
background:#ffb3b3 !important;
}

.total{
background:#d9d9d9 !important;
}

.machine_total{
background:#f5f5f5 !important;
}

}
</style>

<div class="title">MONTHLY PACKING PRODUCTION REGISTER</div>
<div class="month">PERIOD : ${frappe.datetime.str_to_user(from_date)} TO ${frappe.datetime.str_to_user(to_date)}</div>

<div class="summary_title">CONTRACTOR PRODUCTION SUMMARY</div>

<table>
<tr>
<th>Contractor</th>
<th>Total Boxes</th>
</tr>
`;

let summary_total = 0;

summary.forEach(s=>{
html+=`<tr>
<td>${s.contractor}</td>
<td>${s.total_box}</td>
</tr>`;
summary_total += s.total_box;
});

html+=`
<tr class="total">
<td>GRAND TOTAL</td>
<td>${summary_total}</td>
</tr>
</table>
`;

// -------- MAIN TABLE --------

html+=`<table>
<th rowspan="2">Contractor</th>
<th rowspan="2">Machine</th>
<th rowspan="2">Item</th>`;

// First header row (Dates)
for(let i=1;i<=31;i++){
    html+=`<th colspan="3">${String(i).padStart(2,'0')}</th>`;
}

html+=`<th rowspan="2">Total</th>
<th rowspan="2">Avg</th>
</tr>`;

// Second header row (BOX / CW / CT)
html+=`<tr>`;
for(let i=1;i<=31;i++){
    html+=`<th>Box</th>
            <th>CW</th>
            <th>CT</th>`;
}

let grand_total = 0;

Object.values(pivot)
.sort((a,b)=>a.contractor.localeCompare(b.contractor))
.forEach(row=>{

let working_days = Object.values(row.days).filter(v => v.box > 0).length || 1;

html+=`<tr>
<td>${row.contractor}</td>
<td>${row.machine}</td>
<td>${row.item}</td>`;

for(let i=1;i<=31;i++){
let d = row.days[i] || {};

let box = d.box || 0;
let cw = d.company_worker || 0;
let ct = d.contractor_worker || 0;

html+=`<td>${box}</td>
<td>${cw}</td>
<td>${ct}</td>`;
}

html+=`
<td class="machine_total">${row.total}</td>
<td>${Math.round(row.total / working_days)}</td>
</tr>`;

grand_total += row.total;

});

// -------- GRAND TOTAL --------

html+=`<tr class="total">
<td colspan="3">GRAND TOTAL</td>`;

for(let i=1;i<=31;i++){
    html+=`
        <td>${day_total_box[i]}</td>
        <td>${day_total_cw[i]}</td>
        <td>${day_total_ct[i]}</td>
    `;
}

html+=`<td>${grand_total}</td>
<td></td>
</tr>
</table>`;

dataContainer.html(html);

}

};