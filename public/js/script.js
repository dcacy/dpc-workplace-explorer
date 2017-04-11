

function loginAndGetSpaces() {
	console.log('in loginAndGetSpaces');
	$.get("/login", formatSpacesTable2, 'json')
	.fail(function(err) {
		console.log('an error occurred:', err);
		$('#spaces').html(err);
	});
	
}

function formatSpacesTable2(data) {
	console.log('in formatSpacesTable2 and data is ', data);
	if ( data.redirect ) {
		window.location.href = data.redirect;
	} else {
	// filter out DMs (they have a hyphen...not the best )
	data = $.grep(data, function( item, i ) {
	  return ( !item.title.includes('-') );
	});
	var table = $('#spacesTable').DataTable( {
    data: data,
    paging: false,
    searching: false,
    info: false,
//    responsive: true,
    order: [[ 1, 'desc' ]],
    columns: [
        /*{
            "className": 'details-control',
            "defaultContent": ''
        },*/
        { "data": "title", "className": "spaceTableName" },
        { "data": "updated" }
    ],
    columnDefs: [
    	{ "className" : "spaceTableText details-control", "targets": "_all"},
      { "title": "Name", "targets": 0 },
      { "title": "Last Updated", "targets": 1 }
    ]
  });
	
	$('#spacesTable tbody').on('click', 'td.spaceTableName', function () {
		console.log('click');
    var tr = $(this).closest('tr');
    var row = table.row( tr );
    console.log('row is ', row);
    console.log('tr is', tr);
    console.log('data is', row.data());
    $.get('/getSpaceDetails', { id : row.data().id}, processSpaceDetails, 'json')
    .fail(function(err) {
  		console.log('an error occurred:', err);
  		$('#spaces').html(err);
  	});
	});
	}
}


function formatSpacesTable(data){
	
//console.log('status is ', status);
console.log('data is', data);
//console.log($('#spaces'));
//$('#spaces').html(JSON.stringify(data));
var rows = [];
$.each(data, function(key, space) {
//  console.log(space);
	if ( !space.title.includes('-') ) {
		console.log('title is ', space.title, 'and key is ', key);
		var tr = key % 2 == 0  ? '<tr class="bx--table-row bx--parent-row bx--parent-row--even" data-parent-row>' : '<tr class="bx--table-row bx--parent-row" data-parent-row>';
  var row = tr
  	+ '<td>' + space.title + '</td>'
  	+ '<td>' + space.id + '</td>'
  	+ '</tr>'
  	;
	console.log(row);
  rows.push(row);
	}
});
console.log('rows =', rows);
$('#spaces').html(
		'<div class="bx--responsive-table-container" data-responsive-table>'
		+ '<table class="bx--responsive-table bx--responsive-table--static-size" data-table>'
		+ '<thead class="bx--table-head">'
		+ '<tr class="bx--table-row">'
		+ '<th class="bx--table-header">'
    + '<span>Title</span>'
    + '</th>' 
    + '<th class="bx--table-header">'
    + 'ID'
    + '</th>'  
    + '</tr>'
    + '</thead>'
    + '<tbody class="bx--table-body"></tbody'

    + '</table>'
    + '</div>'
    );
$('#spaces').append(rows);
var dTable = document.querySelector('[data-table]');
console.log(dTable);
//import { DataTable } from 'carbon-components';
//const myModal = document.querySelector('[data-modal]');
//const myTableInstance = DataTable.components.get(dTable);
//console.log(myTableInstance);
var someVar = CarbonComponents.DataTable.init(dTable);
console.log(dTable);
console.log(someVar);
dTable.refreshRows();
console.log('done');
}

function processSpaceDetails(json) {
	console.log('this is', json);
}

/*
 * [{"title":"Fam Bam","id":"58b86280e4b0c45b8a9e469d"},
 * {"title":"ICTS Tech Sales ðŸ‘","id":"57ae304de4b0d0e21a2dead8"},
 * {"title":"ðŸ“ Watson Minutes Project","id":"588668dee4b01624a621e562"},{"title":"ðŸ‘¨â€ðŸ’»NA ICS Ninjas","id":"57c9cc91e4b0330271ec0367"},{"title":"6854c42b-53f7-4ded-b6f6-8fdd358dbf50","id":"58aba7fbe4b0a2958289e4f2"},{"title":"Watson Workspace Integration","id":"57bc6300e4b0f6d73bc84640"},{"title":"ICS Builder Garage","id":"58488ef1e4b0429cc6d16120"},{"title":"dc8b88aa-a947-4c8f-bcf9-84c725bc57d6","id":"58a9e04ce4b0159c3438c40b"},{"title":"-","id":"58bed412e4b0ee11fcfc6c62"},{"title":"-","id":"58c8146fe4b0e1cbaf943445"},{"title":"1992f865-2975-4ba2-9f8d-7dcf7c616b6c","id":"58ce88fae4b014d4036e51a6"},{"title":"ðŸ‘ðŸ¼ Natural Theology","id":"58d11d8ee4b08542c86ef119"},{"title":"Darren's place where he works","id":"57d6cb0ae4b003653731a2f3"},{"title":"2536e778-0d4e-47b7-b286-c4b10be58e04","id":"58ac989be4b00c0b05b9769f"},{"title":"4885c287-19e5-44df-a048-398d15f94b2c","id":"58d02e8ae4b014d4036ebb21"},{"title":"NA Tech Sellers","id":"58c19747e4b08d8f7457c2e1"},{"title":"195ad890-0144-4d98-b34a-6ebf9bd570ef","id":"58a78022e4b003edf6097132"},{"title":"-","id":"58c964b0e4b0b552cfc3e9a5"},{"title":"-","id":"58c955c2e4b0b0d4b08c8294"},{"title":"01320efd-365d-4a7f-9ef1-94b1e3cd4a0e","id":"58ac987be4b0cdea294eea9c"}]
 */
