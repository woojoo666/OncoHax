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

/*************************** Single Gene Download **********************************/

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

/************************* Download All Genes in Selector Pane **********************/

	j$.getScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.0.0/jszip.js", function() {
		j$.getScript("https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2014-11-29/FileSaver.js", function () {

			var downloadAllButton = j$('<button>Download All</button>').click(function () {

				var allGenes = j$('#pListSelectorPane').find('td.fDataset');

				var zip = new JSZip();
				var foldername = "OncomineExport";
				var folder = zip.folder(foldername);

				var oldBuildUri = buildNewUriForEvent;

				function finish() {
					zip.generateAsync({type:"blob"})
					.then(function(blob) {
						saveAs(blob, "OncomineExport.zip");
					});

					buildNewUriForEvent = oldBuildUri;
				}

				var continuation;
				var currentGene;
				var currentGeneName;

				buildNewUriForEvent = function (action, eventUri, sourceComponent) {

					var analysisComparisons = "ac:" + Oncomine.analysisComparisons.join(",") + ";";
					var conceptComparisons = Oncomine.ConceptListSelector.conceptComparisons;
					var conceptComparisonsValue = conceptComparisons.length === 0 ? "" : ("cc:" + conceptComparisons.join(",") + ";");
					var expandedCategoryIds = "ec:[" + getExpandedCategories().join(",") + "];";
					var expandedProperties = "epv:" + getExpandedProperties().join(",") + ";";
					var g = Oncomine.currentUriFragment.match(/;g:(.*?);/)[1];
					var request= "ui/action.html?eventValues=cmd:" + action + ";" + analysisComparisons + conceptComparisonsValue 
						+ expandedCategoryIds + expandedProperties + eventUri + "&original=g:"+g+";v:18";

					Oncomine.Ajax.getJSON(request, function(jsonResponse) {
						var newUriFragment = jsonResponse["uriFragment"];

						var url= "https://www.oncomine.org/resource/ui/component/singleGene.html?component="+newUriFragment;

						Oncomine.Ajax.getHTML({
							url: url,
							timeout: 60000,
							error: function(request, textStatus, errorThrown) {
								console.log(textStatus);
							},
							complete: function(request, status) {
								if (status == "success") {
									var data = extractdata(request.responseText);
									lazyLoadDataset(currentGene, data, function () {
										var csv = toCSV(data);
										folder.file(currentGeneName + '.csv', csv);
										continuation();
									});
								}
							}
						});
					});
				}

				var pMap = Oncomine.Util.PARAMETER_MAP;

				(function downloadAll(index) {
					if (index >= allGenes.length) return finish();

					currentGene = allGenes.eq(index);
					currentGeneName = currentGene.find('b').text();
					console.log('retrieving data for ' + currentGeneName + '...');
					continuation = downloadAll.bind(null, index+1);
					buildEventUriForSelection("viewDataset", currentGene, 
									[pMap.detailType, 
									 pMap.datasetId,
									 pMap.defaultProperty], "datasetListSelector");
				})(0);
			});
			j$('#pContent').append(downloadAllButton);
		});
	});

	// copied from datasetListSelectorComponent.js
	function getUriFragmentAdjustedForCurrentAnalysisComparisons() {
		var modifiedUriFragment = decodeURIComponent(Oncomine.currentUriFragment);
		var newAnalysisComparisonStatelet = "ac:" + Oncomine.analysisComparisons.join(",")+";";
		if (modifiedUriFragment.indexOf("ac:") > -1) {
			modifiedUriFragment = modifiedUriFragment.replace(/ac:.*?;/,newAnalysisComparisonStatelet);
		} else {
			modifiedUriFragment = newAnalysisComparisonStatelet + modifiedUriFragment;
		}
		return modifiedUriFragment;
	}

	// copied and adapted from datasetListSelectorComponent.js
	function lazyLoadDataset($parentCell, data, callback) {
		var datasetId= $parentCell.attr("om4:datasetId");
		var modifiedUriFragment = getUriFragmentAdjustedForCurrentAnalysisComparisons();

		j$.ajax({
			url: "/resource/ui/component/datasetLazyLoad.html?component=datasetExpand:" + datasetId + ";" + modifiedUriFragment,
			type: 'GET',
			success: function(html) {
				data.push([]);
				data.push(['analysis','p','fold change']);
				j$(html).find('.pListSelectorItem').find('td.fAnalysis').each(function (i, subitem) {
					subitem = j$(subitem);
					var analysis = subitem.children().eq(0).text();
					var pval = subitem.find('.pPValue').text().split(/\s*=\s*/)[1];
					var fold = subitem.find('.pFoldChange').text().split(/\s*=\s*/)[1];
					data.push([analysis,pval,fold]);
				});
				callback();
			}
		});
	}

})()
