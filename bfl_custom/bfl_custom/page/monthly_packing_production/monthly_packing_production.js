frappe.pages['monthly-packing-production'].on_page_load = function(wrapper) {

var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Monthly Packing Production Register',
    single_column: true
});

var filterContainer = $('<div class="row" style="margin-bottom:20px;"></div>').appendTo(page.body);

// From Date
var fromCol = $('<div class="col-md-3"></div>').appendTo(filterContainer);
$('<label><b>From Date</b></label>').appendTo(fromCol);
var fromDateInput = $(`<input type="date" class="form-control" value="${frappe.datetime.month_start()}">`).appendTo(fromCol);

// To Date
var toCol = $('<div class="col-md-3"></div>').appendTo(filterContainer);
$('<label><b>To Date</b></label>').appendTo(toCol);
var toDateInput = $(`<input type="date" class="form-control" value="${frappe.datetime.get_today()}">`).appendTo(toCol);

// Button
var btnCol = $('<div class="col-md-2"></div>').appendTo(filterContainer);
var fetchButton = $('<button class="btn btn-primary" style="margin-top:25px;">Fetch</button>').appendTo(btnCol);

// Data container
var dataContainer = $('<div id="mis-data"></div>').appendTo(page.body);


// ================= FETCH =================

fetchButton.on("click", function () {

let from_date = fromDateInput.val();
let to_date = toDateInput.val();

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

</tr>`;

let grand_total = 0;

Object.values(pivot).forEach(row=>{

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
<td>${Math.round(row.total/31)}</td>
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