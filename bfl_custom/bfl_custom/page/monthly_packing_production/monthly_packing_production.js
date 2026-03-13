frappe.pages['monthly-packing-production'].on_page_load = function(wrapper) {

var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Monthly Packing Production Register',
    single_column: true
});

// ================= FILTER BAR =================

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


// Buttons Column
var btnCol = $(`
<div class="col-md-4 d-flex align-items-end gap-10">
</div>
`).appendTo(filterContainer);


// Fetch
var fetchButton = $(`<button class="btn btn-primary" style="margin-left:20px; margin-bottom:15px">Fetch</button>`).appendTo(btnCol);

// Print
var printBtn = $(`<button class="btn btn-success" style="margin-left:20px; margin-bottom:15px;">Print</button>`).appendTo(btnCol);

// Export
// var exportBtn = $(`<button class="btn btn-info">Export Excel</button>`).appendTo(btnCol);
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
    args: {
        from_date: from_date,
        to_date: to_date
    },
    callback: function(r) {

        render_report(r.message);
    }
});

});

printBtn.on("click", function () {

let printContents = document.getElementById("mis-data").innerHTML;

let win = window.open('', '', 'height=900,width=1200');

win.document.write('<html><head><title>Production Register</title>');
win.document.write('</head><body>');
win.document.write(printContents);
win.document.write('</body></html>');

win.document.close();
win.print();

});


// ================= EXPORT EXCEL =================

// exportBtn.on("click", function(){

// let table = document.querySelector("#mis-data table:last-of-type");

// if(!table){
//     frappe.msgprint("No data to export");
//     return;
// }

// let html = table.outerHTML;

// let url = 'data:application/vnd.ms-excel,' + encodeURIComponent(html);

// let link = document.createElement("a");

// link.href = url;
// link.download = "Monthly_Packing_Register.xls";

// document.body.appendChild(link);

// link.click();

// document.body.removeChild(link);

// });


// ================= RENDER REPORT =================

function render_report(data){

let summary = data.contractor_summary;
let rows = data.data;

let days = 31;

let highest = {};
let day_total = {};
let pivot = {};

for(let i=1;i<=31;i++){
    highest[i]=0;
    day_total[i]=0;
}

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

pivot[key].days[r.d]=r.box;
pivot[key].total += r.box;

if(r.box > highest[r.d]){
    highest[r.d] = r.box;
}

day_total[r.d] += r.box;

});


let html = `
<style>

@page{
size:A4 landscape;
margin:10mm;
}

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

.machine_total{
background:#f5f5f5;
font-weight:bold;
}

.total{
background:#d9d9d9;
font-weight:bold;
}

.green{background:#b6ffb3;}
.red{background:#ffb3b3;}

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


// ================= MAIN TABLE =================

html+=`<table>

<tr>
<th>Contractor</th>
<th>Machine</th>
<th>Item Print Name</th>`;

for(let i=1;i<=31;i++){
html+=`<th>${String(i).padStart(2,'0')}</th>`;
}

html+=`<th>Total</th>
<th>Avg</th>
</tr>`;

let grand_total = 0;

Object.values(pivot).forEach(row=>{
let working_days = Object.values(row.days).filter(v => v > 0).length || 1;
console.log(working_days)

html+=`<tr>

<td>${row.contractor}</td>
<td>${row.machine}</td>
<td>${row.item}</td>`;

for(let i=1;i<=31;i++){

let v = row.days[i] || 0;

let cls="";

if(v === highest[i] && v>0){
cls="green";
}
else if(v<400 && v>0){
cls="red";
}

html+=`<td class="${cls}">${v}</td>`;

}

html+=`
<td class="machine_total">${row.total}</td>

<td>${Math.round(row.total / working_days)}</td>
</tr>`;

grand_total += row.total;

});


html+=`<tr class="total">
<td colspan="3">GRAND TOTAL</td>`;

for(let i=1;i<=31;i++){
html+=`<td>${day_total[i]}</td>`;
}

html+=`<td>${grand_total}</td>
<td></td>
</tr>
</table>`;

dataContainer.html(html);

}

};