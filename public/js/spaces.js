var spaceData;

function start() {
	// reset UI if necessary
	$('#messageWrapper').hide();
	if ( $.fn.dataTable.isDataTable( '#messagesTableDataTable' ) ) {
    $('#messagesTableDataTable').DataTable().clear();
	}
	// check to see if we have already loaded the spaces
  if ( spaceData ) {
  	$('#spacesTableWrapper').show();
  	$('#spaceWrapper').hide();
  } else {
  	$('#spacesTable').mask('<div align="center">Please Wait...<br/><img src="/img/watson.gif"></div>',200);
  	$.get("/getSpaces", formatSpacesTable, 'json')
		.fail(function(err) {
			console.log('an error occurred getting spaces:', err);
			$('#error').html(err.responseText);
			$('#loginMessage').show();
			$('#spacesTableWrapper').hide();
			$('#navBar').hide();
		}).
		always(function() {
			$('#spacesTable').unmask();
		});
  }

}


function formatSpacesTable(data) {
	spaceData = data;  // save the data into a global variable
	if ( data.redirect ) {
		window.location.href = data.redirect;
	} else {
		// filter out DMs by checking for a hyphen (some have just that as the name)
		// and for the ID (which is what others have)
		var dmTitlePattern = '[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]';
		var regex = new RegExp(dmTitlePattern);
		data = $.grep(data, function( item, i ) {
			return ( item.title !== '-' && !regex.test(item.title));
	});
		var table = $('#spacesTable').DataTable( {
	    data: data,
	    paging: false,
	    searching: false,
	    info: false,
	    autoWidth: false,
	    order: [[ 1, 'desc' ]],
	    columns: [
	    	{ "data": "title", "className": "spaceTableName" },
	      { "data": "updated" }
	    ],
	    columnDefs: [
	    	{ "className" : "spaceTableText", "targets": "_all"},
	      { "title": "Name", "targets": 0 },
	      { "title": "Last Updated", "targets": 1, render: function(data, type) {
	      		// if type is display or filter, then format the date
	      		if ( type === 'display' || type === 'filter') {
	      			return dateFormat(new Date(data), 'dd mmm yyyy h:MM:sstt');
	      		} else {
	      			// otherwise it must be for sorting so return the raw value
	      			return data;
	      		}
	      	}
	      }
	    ]
	  });
		
		// do this when user clicks on a space in the spaces table
		$('#spacesTable tbody').on('click', 'td.spaceTableName', function () {
	    var tr = $(this).closest('tr');
	    var row = table.row( tr );
	    
	    $('#spacesTableWrapper').hide();
	    $('#spaceWrapper').hide();
	    $('#pleaseWait').mask('Please Wait...<br/><img src="/img/watson.gif">',200);
	    $.get('/getSpaceDetails', { id : row.data().id}, processSpaceDetails, 'json')
	    .fail(function(err) {
	  		console.log('an error occurred:', err);
	  		$('#error').html(err.responseText);
	  	}).
	  	always(function(json){
	 		  $('#pleaseWait').unmask();
	 		  $('#spaceWrapper').show();
	 		  $('#navBar').show();
	 		  $('#spaceInfoTable').show();
	 		  $('#messagesTableHeader').show();
	 		  if ( json.conversation.messages.pageInfo.hasNextPage === true ) {
	 	 		  $('#NextButton').show(); 		  	
	 		  } else {
	 	 		  $('#NextButton').hide();
	 		  }
	 		  if ( json.conversation.messages.pageInfo.hasPreviousPage === true ) {
	 	 		  $('#PreviousButton').show(); 		  	
	 		  } else {
	 	 		  $('#PreviousButton').hide();
	 		  }
	  	});
		});
	}
}



function processSpaceDetails(json) {
	// count the apps
	var apps = $.grep(json.members.items, function( item, i ) {
	  return ( item.email == null );
	});
	var nbrOfMembers = json.members.items.length == 200 ? '200+' : json.members.items.length;
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
    order: [[ 2, 'desc' ]],
    columns: [	
      { "data": "content", "render": function(data) {
      	// format at-mentions
      	if ( data ) {
      		if ( data.includes('<@') ){
      			var stillLooking = true;
      			while (stillLooking){
      				if (data.indexOf('<@') == -1 ) {
      					stillLooking = false;
      				} else {
	      				var atMention = data.substring(data.indexOf('<@'),data.indexOf('>',data.indexOf('<@'))+1);
	      				var splitData = data.split(atMention);
	      				var name = atMention.split('|')[1].replace('>','');
	      				data = splitData[0] + '<strong>@' + name + '</strong>' + splitData[1];
      				}
      			}
      		}
      	}
      	// convert markdown to HTML, and convert \r \n to <br/>
      	var converter = new showdown.Converter();
      	var convertedData = converter.makeHtml(data);
      	if ( convertedData !== null ) {
      		return converter.makeHtml(data).replace(/(?:\r\n|\r|\n)/g, '<br/>');
      	} else {
      		return data;
      	}
      }},
      { "data": "createdBy.displayName", "className": "dpcTooltip" },
      { "data": "created"}
    ],
    columnDefs: [
    	{ "className" : "theMessage", "targets": 0},
      { "title": "Message", "targets": 0 },
      { "title": "Author", "targets": 1 },
      { "title": "When Created", "targets": 2, render: function(data, type) {
      		// if type is display or filter then format the date
      		if ( type === 'display' || type === 'filter') {
      			return dateFormat(new Date(data), 'dd mmm yyyy h:MM:sstt');
      		} else {
      			// otherwise it must be for sorting so return the raw value
      			return data;
      		}    			
      	} 
      }
    ],
    "fnCreatedRow": function( nRow, aData, iDataIndex ) {
    	// create an attribute for the message ID so we can retrieve it later when we click on this message
    	nRow.getElementsByTagName('td')[0].setAttribute('message-id', aData.id); 
    }
  });
	
	//use DataTable's 'on' event handler because the jQuery one doesn't work with paging, or else I did it wrong :-)
	messagesTable.on('click', 'td', function(){  
		// highlight chosen message
		$('.theMessage').toggleClass('chosenMessage',false); // un-highlight all msgs
		$(this).toggleClass('chosenMessage'); // now highlight just this one

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
}

function processMessageDetails(json) {
	var annotationsHeader = '';
	var sentiment = 'n/a';
	var concepts = [];
	var annotationsBody = '';
	for (var j = 0; j < json.annotations.length; j++ ) {
//		annotationsHeader += '<li><a href="#tabs-' + (j + 1) + '">Annotation ' + (j + 1) + '</a></li>';
		var annotationJSON = JSON.parse(json.annotations[j]);
		annotationsHeader += '<li><a href="#tabs-' + (j + 1) + '">' + annotationJSON.type + '</a></li>';
		annotationsBody += '<div id="tabs-' + (j + 1) + '">';	
		// payload and context are stringified JSON, so convert to JSON
		if ( annotationJSON.payload ) {
			var payload = JSON.parse(annotationJSON.payload);
			annotationJSON.payload = payload;
		}
		if ( annotationJSON.context ) {
			var context = JSON.parse(annotationJSON.context);
			annotationJSON.context = context;
		}
		if ( annotationJSON.docSentiment ) {
			sentiment = annotationJSON.docSentiment.type;
		}
		if ( annotationJSON.concepts ) {
			concepts.push(annotationJSON.concepts); // save concepts to array for rendering below
		}
		annotationsBody += '<pre>' + syntaxHighlight(JSON.stringify(annotationJSON, undefined, 2)) + '</pre>';
		annotationsBody += '</div>';
	}

	var conceptsString = [];
	if (concepts.length > 0 ) {
		for (var i = 0; i < concepts.length; i++ ) {
			for ( var j = 0; j < concepts[i].length; j++ ) {
				if ( concepts[i][j].relevance > .8) { // let's only capture concepts where the relevance > .8
					conceptsString.push(concepts[i][j].text);
				}
			}
		}
	}
	document.getElementById('keywords').innerHTML = conceptsString.length > 0 ? conceptsString.toString().replace(/,/g,', ') : 'n/a';
	document.getElementById('sentiment').innerHTML = sentiment;
	var annotationsText = 
		  '<div id="tabs"><ul>'
		+ annotationsHeader
		+ '</ul>'
		+ annotationsBody
		+ '</div>';
	$('#annotations').html(annotationsText);
	$('#tabs').tabs();
}
	
/*
 * This does some nifty formatting of the json
 */
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

/*
 * Show the next or previous set of messages
 */
function pageThroughMessages(direction) {
	var whichDirection = direction.id === 'NextButton' ? 'next' : 'previous'; 
	$('#messagesTableWrapper').hide();
  $('#pleaseWait').mask('Please Wait...<br/><img src="/img/watson.gif">',200);
  $.get("/page", { direction : whichDirection}, processSpaceDetails, 'json')
  .fail(function(err) {
		console.log('an error occurred:', err);
		$('#error').html(err.responseText);
	}).
	always(function(json){
	  if ( json.conversation.messages.pageInfo.hasNextPage === true ) {
 		  $('#NextButton').show(); 		  	
	  } else {
 		  $('#NextButton').hide();
	  }
	  if ( json.conversation.messages.pageInfo.hasPreviousPage === true ) {
 		  $('#PreviousButton').show(); 		  	
	  } else {
 		  $('#PreviousButton').hide();
	  }
		$('#messageWrapper').hide();
    $('#pleaseWait').unmask();
    $('#messagesTableWrapper').show();
	});
}

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

