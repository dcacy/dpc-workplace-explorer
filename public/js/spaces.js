var spaceData;

function start() {
//	$('#spacesTable_wrapper').remove();
//	$('#spaceWrapper').hide();
//	$('#messagesTableDataTable_wrapper').remove();
//	$('#spaceInfoTable').hide();
//	$('#messageWrapper').hide();
//	$('#messagesTableHeader').hide();
//	$('#PrevNext').hide();
//	$('#spacesTableWrapper').show();
  
  if ( spaceData ) {
  	console.log('found spaceData so just showing spaces');
  	$('#spacesTableWrapper').show();
  	$('#spaceWrapper').hide();
  } else {
  	console.log('did not find space data so calling API');
  	$('#spacesTable').mask('<div align="center">Please Wait...<br/><img src="/img/watson.gif"></div>',200);
  	$.get("/getSpaces", formatSpacesTable, 'json')
		.fail(function(err) {
			console.log('an error occurred getting spaces:', err);
			$('#error').html(err.responseText);
			$('#loginMessage').show();
		}).
		always(function() {
			$('#spacesTable').unmask();
		});
  }

}


function formatSpacesTable(data) {
//	console.log('in formatSpacesTable');// and data is ', data);
	spaceData = data;
	if ( data.redirect ) {
		window.location.href = data.redirect;
	} else {
	// filter out DMs by checking for a hyphen...not the best
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
    	{ "className" : "spaceTableText", "targets": "_all"},
      { "title": "Name", "targets": 0 },
      { "title": "Last Updated", "targets": 1 }
    ]
  });
	
	$('#spacesTable tbody').on('click', 'td.spaceTableName', function () {
		console.log('in onclick of spacesTable');
    var tr = $(this).closest('tr');
    var row = table.row( tr );
//    console.log('row is ', row);
//    console.log('tr is', tr);
//    console.log('data is', row.data());
//    $('#spacesTableWrapper').innerHTML = '';//html();
    
    $('#spacesTableWrapper').hide();
    $('#spaceWrapper').show();
    $('#messagesTableDataTable').mask('Please Wait...<br/><img src="/img/watson.gif">',200);
    $.get('/getSpaceDetails', { id : row.data().id}, processSpaceDetails, 'json')
    .fail(function(err) {
  		console.log('an error occurred:', err);
  		$('#error').html(err.responseText);
  	}).
  	always(function(){
 		  $('#messagesTableDataTable').unmask();
 		  $('#navBar').show();
 		  $('#spaceInfoTable').show();
 		  $('#messagesTableHeader').show();
//		  $('#PreviousButton').show();
 		  $('#NextButton').show();
  	});
	});
	}
}



function processSpaceDetails(json) {
//	console.log('this is', json);
	var apps = $.grep(json.members.items, function( item, i ) {
//		console.log(item);
	  return ( item.email == null );
	});
	var nbrOfMembers = json.members.items.length == 200 ? '200+' : json.members.items.length;
//	console.log('nbr of members', nbrOfMembers);
//	console.log('nbr of messages', json.conversation.messages.items.length);
//	$('#spacesTableWrapper').html('');
	$('#spaceName').html(json.title);
	$('#membersCount').html(nbrOfMembers);	
	$('#appsCount').html(apps.length);	
	
	if ( $.fn.dataTable.isDataTable( '#messagesTableDataTable' ) ) {
    $('#messagesTableDataTable').DataTable().destroy();
	}
	var messagesTable = $('#messagesTableDataTable').DataTable( {
    data: json.conversation.messages.items,
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
        { "data": "content" },
        { "data": "createdBy.displayName", "className": "dpcTooltip" },
        { "data": "created"}
    ],
    columnDefs: [
    	{ "className" : "messageContent", "targets": "_all"},
      { "title": "Name", "targets": 0 },
      { "title": "Author", "targets": 1 },
      { "title": "When Created", "targets": 2 }
    ],
    "fnCreatedRow": function( nRow, aData, iDataIndex ) {
//    	console.log('in fnCreatedRow');
//    	console.log(nRow);
//    	console.log(nRow.getElementsByTagName('td')[0]);//Attribute('role'));
    	// create an attribute for the message ID so we can retrieve it later when we click on this message
    	nRow.getElementsByTagName('td')[0].setAttribute('message-id', aData.id); 
//    	console.log(aData);
//    	console.log(iDataIndex);
    }
  });
	

	
	$('.messageContent').on('click', this, function () {
//		console.log('click');
//		console.log(this);
//		console.log(this.getAttribute('message-id'));
		$('#tabs').remove();

		$('#messageWrapper').show();
    $('#messageWrapper').mask('<div align="center" style="background-color:#fff;">Please Wait...<br/><img src="/img/watson.gif"></div>',200);
    // we set the message-id attribute earlier so that it would be here now
		$.get('/getMessageDetails', { id : this.getAttribute('message-id')}, processMessageDetails, 'json')
		.fail(function(err) {
			console.log('an error occurred getting message details:', err);
			$('#error').html(err.responseText);
			$('#loginMessage').show();
			$('#appWrapper').hide();
		}).
		always(function() {
			$('#messageWrapper').unmask();
		});
	});

	function processMessageDetails(json) {
//		console.log('in processMessageDetails and json is ', json);
//		var annotation = JSON.parse(json.annotations[0]);
//		console.log('annotation is', annotation);
//		console.log('pretty:', JSON.stringify(annotation,null,2));
//		document.getElementById('messageWrapper').innerHTML = JSON.stringify(annotation,null,2);
		var annotationsText = '<div id="tabs"><ul>';
		for (var i = 0; i < json.annotations.length; i++ ) {
			annotationsText += '<li><a href="#tabs-' + (i + 1) + '">Annotation ' + (i + 1) + '</a></li>';
		}
		annotationsText += "</ul>";
		for (var j = 0; j < json.annotations.length; j++ ) {
			annotationsText += '<div id="tabs-' + (j + 1) + '">';
			console.log('annotation:', json.annotations[j]);
			console.log('type is ', typeof json.annotations[j]);
			
			var tmp = JSON.parse(json.annotations[j]);
			console.log('tmp:', tmp);
//			tmp = tmp.split("\\\"").join("\"");
//			console.log('tmp2:', tmp);
//			var jsontmp = JSON.parse(tmp);
//			annotationsText += JSON.stringify(jsontmp, null, 2);
//			tmp = syntaxHighlight(tmp);
			annotationsText += '<pre>' + syntaxHighlight(JSON.stringify(tmp, undefined, 2)) + '</pre>';
			annotationsText += '</div>';
		}
		annotationsText += '</div>';
//		$('#tabs').remove();
//		$('#messageWrapper').html('');
		$('#messageWrapper').html(annotationsText);
//		for ( var k = 0; k < json.annotations.length; k++) {
//			var pre = document.createElement('pre');
//			pre.innerHTML = json.annotations[k];
//			document.getElementById('tabs-' + (k + 1)).appendChild(pre);
//		}
		$('#tabs').tabs();

//		$('#messageWrapper').val(JSON.stringify(annotation,null,2));
//		$('#messageWrapper').html(JSON.stringify(json.annotations,null,2));
		/*
		 * <div id="tabs">
  <ul>
    <li><a href="#tabs-1">Nunc tincidunt</a></li>
    <li><a href="#tabs-2">Proin dolor</a></li>
    <li><a href="#tabs-3">Aenean lacinia</a></li>
  </ul>
  <div id="tabs-1">
    <p>Proin elit arcu, rutrum commodo, vehicula tempus, commodo a, risus. Curabitur nec arcu. Donec sollicitudin mi sit amet mauris. Nam elementum quam ullamcorper ante. Etiam aliquet massa et lorem. Mauris dapibus lacus auctor risus. Aenean tempor ullamcorper leo. Vivamus sed magna quis ligula eleifend adipiscing. Duis orci. Aliquam sodales tortor vitae ipsum. Aliquam nulla. Duis aliquam molestie erat. Ut et mauris vel pede varius sollicitudin. Sed ut dolor nec orci tincidunt interdum. Phasellus ipsum. Nunc tristique tempus lectus.</p>
  </div>
  <div id="tabs-2">
    <p>Morbi tincidunt, dui sit amet facilisis feugiat, odio metus gravida ante, ut pharetra massa metus id nunc. Duis scelerisque molestie turpis. Sed fringilla, massa eget luctus malesuada, metus eros molestie lectus, ut tempus eros massa ut dolor. Aenean aliquet fringilla sem. Suspendisse sed ligula in ligula suscipit aliquam. Praesent in eros vestibulum mi adipiscing adipiscing. Morbi facilisis. Curabitur ornare consequat nunc. Aenean vel metus. Ut posuere viverra nulla. Aliquam erat volutpat. Pellentesque convallis. Maecenas feugiat, tellus pellentesque pretium posuere, felis lorem euismod felis, eu ornare leo nisi vel felis. Mauris consectetur tortor et purus.</p>
  </div>
  <div id="tabs-3">
    <p>Mauris eleifend est et turpis. Duis id erat. Suspendisse potenti. Aliquam vulputate, pede vel vehicula accumsan, mi neque rutrum erat, eu congue orci lorem eget lorem. Vestibulum non ante. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Fusce sodales. Quisque eu urna vel enim commodo pellentesque. Praesent eu risus hendrerit ligula tempus pretium. Curabitur lorem enim, pretium nec, feugiat nec, luctus a, lacus.</p>
    <p>Duis cursus. Maecenas ligula eros, blandit nec, pharetra at, semper at, magna. Nullam ac lacus. Nulla facilisi. Praesent viverra justo vitae neque. Praesent blandit adipiscing velit. Suspendisse potenti. Donec mattis, pede vel pharetra blandit, magna ligula faucibus eros, id euismod lacus dolor eget odio. Nam scelerisque. Donec non libero sed nulla mattis commodo. Ut sagittis. Donec nisi lectus, feugiat porttitor, tempor ac, tempor vitae, pede. Aenean vehicula velit eu tellus interdum rutrum. Maecenas commodo. Pellentesque nec elit. Fusce in lacus. Vivamus a libero vitae lectus hendrerit hendrerit.</p>
  </div>
</div>

		 */
	}
	
	
		
	
	
//	$('#messagesCount').html(json.conversation.messages.items.length);
}

function syntaxHighlight(json) {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      var cls = 'number';
      if (/^"/.test(match)) {
          if (/:$/.test(match)) {
              cls = 'key';
          } else {
              cls = 'string';
          }
      } else if (/true|false/.test(match)) {
          cls = 'boolean';
      } else if (/null/.test(match)) {
          cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
  });
}

function nextMessages() {
	console.log('click');
}
/*
 * [{"title":"Fam Bam","id":"58b86280e4b0c45b8a9e469d"},
 * {"title":"ICTS Tech Sales ðŸ‘","id":"57ae304de4b0d0e21a2dead8"},
 * {"title":"ðŸ“ Watson Minutes Project","id":"588668dee4b01624a621e562"},{"title":"ðŸ‘¨â€ðŸ’»NA ICS Ninjas","id":"57c9cc91e4b0330271ec0367"},{"title":"6854c42b-53f7-4ded-b6f6-8fdd358dbf50","id":"58aba7fbe4b0a2958289e4f2"},{"title":"Watson Workspace Integration","id":"57bc6300e4b0f6d73bc84640"},{"title":"ICS Builder Garage","id":"58488ef1e4b0429cc6d16120"},{"title":"dc8b88aa-a947-4c8f-bcf9-84c725bc57d6","id":"58a9e04ce4b0159c3438c40b"},{"title":"-","id":"58bed412e4b0ee11fcfc6c62"},{"title":"-","id":"58c8146fe4b0e1cbaf943445"},{"title":"1992f865-2975-4ba2-9f8d-7dcf7c616b6c","id":"58ce88fae4b014d4036e51a6"},{"title":"ðŸ‘ðŸ¼ Natural Theology","id":"58d11d8ee4b08542c86ef119"},{"title":"Darren's place where he works","id":"57d6cb0ae4b003653731a2f3"},{"title":"2536e778-0d4e-47b7-b286-c4b10be58e04","id":"58ac989be4b00c0b05b9769f"},{"title":"4885c287-19e5-44df-a048-398d15f94b2c","id":"58d02e8ae4b014d4036ebb21"},{"title":"NA Tech Sellers","id":"58c19747e4b08d8f7457c2e1"},{"title":"195ad890-0144-4d98-b34a-6ebf9bd570ef","id":"58a78022e4b003edf6097132"},{"title":"-","id":"58c964b0e4b0b552cfc3e9a5"},{"title":"-","id":"58c955c2e4b0b0d4b08c8294"},{"title":"01320efd-365d-4a7f-9ef1-94b1e3cd4a0e","id":"58ac987be4b0cdea294eea9c"}]
 */

$(document).ready(function(){

	start();
//	console.log('in document.ready');
//  $('#spacesWrapper').mask('Please Wait...<br/><img src="/img/watson.gif">',200);
//
//	$.get("/getSpaces", formatSpacesTable, 'json')
//	.fail(function(err) {
//		console.log('an error occurred getting spaces:', err);
//		$('#error').html(err.responseText);
//		$('#loginMessage').show();
//	}).
//	always(function() {
//		$('#spacesWrapper').unmask();
//	});
});
