(function() {
	var origCallback = singleGeneVisualization._refreshCallback;
	singleGeneVisualization._refreshCallback = function (component, url) {

		var target = j$(component._targetId);
		var map = target.html().match('<map.*?>(.*)</map>')[1];

		var formats = {};
		var maxfeatures = 0;

		map.replace(/<area.*?leftcontent="(.*?)".*?rightcontent="(.*?)"/g, function (match, left, right) {
			if (!formats[left]) { 
				formats[left] = [];
				maxfeatures = Math.max(maxfeatures, left.split('||').length);
			}
			formats[left].push(right);
		});

		var table = j$('<table/>');
		var rawtext = '';
		function addRow (str) {
			data = (str||"").split('||');
			var row = j$('<tr/>');
			for ( var i = 0; i < maxfeatures; i++) {
			  row.append('<td>'+(data[i]||'')+'</td>');
			}
			table.append(row);

			rawtext += data.join('\t') + '\n';
		}
		for (var key in formats) {
			addRow();
			addRow(key);
			formats[key].forEach(addRow);
		}

		target.append(table);
		target.append(j$('<textarea/>').val(rawtext));
		origCallback.apply(this, arguments);
	}
})()
