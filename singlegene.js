(function() {

	function extractdata (html) {

		var map = html.match('<map.*?>(.*)</map>')[1];

		var formats = {};
		var maxfeatures = 0;

		var data = [];

		map.replace(/<area.*?leftcontent="(.*?)".*?rightcontent="(.*?)"/gi, function (match, left, right) {
			if (!formats[left]) { 
				formats[left] = [];
				maxfeatures = Math.max(maxfeatures, left.split('||').length);
			}
			formats[left].push(right);
		});

		for (var key in formats) {
			data.push([]);
			data.push(key.split('||'));
			formats[key].forEach(function (row) { data.push(row.split('||')); });
		}
		return data;
	}

	function toCSV (data) {
			var colDelim = '","', rowDelim = '"\r\n"';
			return '"' + data.map(function(row) {
				return row.map(function(cell) {
					return ('' + cell).replace(/"/g, '""'); // escape double quotes
				}).join(colDelim);
			}).join(rowDelim) + '"';
	}

	var origCallback = singleGeneVisualization._refreshCallback;
	singleGeneVisualization._refreshCallback = function (component, url) {

		var filename = j$('#tVisualizationTitle').text() + '.csv';
		var linkstyle = { padding: 10, margin: 10, border: '1px solid lightgrey' };

		var target = j$(component._targetId);
		target.append('<br>');

		var data = extractdata(target.html());

		// CSV export adapted from http://jsfiddle.net/terryyounghk/KPEGU/
		var exportbutton = j$('<a>Export</a>').css(linkstyle).click(function(event) {

			// Data URI
			csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(toCSV(data));

			j$(this).attr({ download: filename, href: csvData, target: '_blank' });
		});
		target.append(exportbutton);

		// copy to clipboard adapted from http://stackoverflow.com/a/30810322/1852456
		var copybutton = j$('<a>Copy</a>').css(linkstyle).click(function(event) {
			var rawtext = data.map(function (row) { return row.join('\t'); }).join('\n');

			var textArea = j$('<textarea/>')
				.css({ width: '2em',height: '2em', background: 'transparent' })
				.val(rawtext)
				.appendTo('body')
				.select();

			try {
				var successful = document.execCommand('copy');
				var msg = successful ? 'successful' : 'unsuccessful';
				target.append('<p>Copying text command was ' + msg + '</p>');
			} catch (err) {
				target.append('<p>Oops, unable to copy</p>');
			}

			textArea.remove();
		});
		target.append(copybutton);

		origCallback.apply(this, arguments);
	}

	j$.getScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.0.0/jszip.js", function() {
		j$.getScript("https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2014-11-29/FileSaver.js", function () {

			var allGenes = j$('#pListSelectorPane').find('td.fDataset');

			var zip = new JSZip();
			var foldername = "folder";
			var folder = zip.folder(foldername);

			var oldBuildUri = buildNewUriForEvent;

			function finish() {
				zip.generateAsync({type:"blob"})
				.then(function(blob) {
					saveAs(blob, "hello.zip");
				});

				buildNewUriForEvent = oldBuildUri;
			}

			var continuation;
			var currentGene;

			buildNewUriForEvent = function (action, eventUri, sourceComponent) {

				var analysisComparisons = "ac:" + Oncomine.analysisComparisons.join(",") + ";";
				var conceptComparisons = Oncomine.ConceptListSelector.conceptComparisons;
				var conceptComparisonsValue = conceptComparisons.length === 0 ? "" : ("cc:" + conceptComparisons.join(",") + ";");
				var expandedCategoryIds = "ec:[" + getExpandedCategories().join(",") + "];";
				var expandedProperties = "epv:" + getExpandedProperties().join(",") + ";";
				var request= "ui/action.html?eventValues=cmd:" + action + ";" + analysisComparisons + conceptComparisonsValue 
					+ expandedCategoryIds + expandedProperties + eventUri + "&original=g:6389;v:18"
				console.log(request);

				Oncomine.Ajax.getJSON(request, function(jsonResponse) {
					var newUriFragment = jsonResponse["uriFragment"];
					console.log(newUriFragment);

					// var url= "https://www.oncomine.org/resource/ui/component/singleGene.html?component="+newUriFragment;

					// Oncomine.Ajax.getHTML({
					// 	url: url,
					// 	timeout: 60000,
					// 	error: function(request, textStatus, errorThrown) {
					// 		console.log(textStatus);
					// 	},
					// 	complete: function(request, status) {
					// 		if (status == "success") {
					// 			console.log(url);
					// 			var data = extractdata(request.responseText);
					// 			var csv = toCSV(data);
					// 			folder.file(currentGene.find('b').text() + '.csv', csv);
					// 			continuation();
					// 		}
					// 	}
					// });
				});
			}

			var pMap = Oncomine.Util.PARAMETER_MAP;

			(function downloadAll(index) {
				if (index >= allGenes.length) return finish();

				currentGene = allGenes.eq(index);
				continuation = downloadAll.bind(null, index+1);
				buildEventUriForSelection("viewDataset", currentGene, 
								[pMap.detailType, 
								 pMap.datasetId,
								 pMap.defaultProperty], "datasetListSelector");
			})(0);
		});
	});
})()
