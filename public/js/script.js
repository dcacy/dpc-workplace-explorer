

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
    order: [[ 1, 'desc' ]],
    columns: [
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



function processSpaceDetails(json) {
	console.log('this is', json);
}

