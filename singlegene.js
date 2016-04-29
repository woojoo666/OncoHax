(function() {
	var origCallback = singleGeneVisualization._refreshCallback;
	singleGeneVisualization._refreshCallback = function (component, url) {

		var filename = j$('#tVisualizationTitle').text() + '.csv';
		var linkstyle = { padding: 10, margin: 10, border: '1px solid lightgrey' };

		function extractdata (html) {

			var map = html.match('<map.*?>(.*)</map>')[1];

			var formats = {};
			var maxfeatures = 0;

			var data = [];

			map.replace(/<area.*?leftcontent="(.*?)".*?rightcontent="(.*?)"/g, function (match, left, right) {
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

		var target = j$(component._targetId);
		target.append('<br>');

		var data = extractdata(target.html());

		// CSV export adapted from http://jsfiddle.net/terryyounghk/KPEGU/
		var exportbutton = j$('<a>Export</a>').css(linkstyle).click(function(event) {
			var colDelim = '","', rowDelim = '"\r\n"',

			// convert data to csv format
			csv = '"' + data.map(function(row) {
				return row.map(function(cell) {
					return ('' + cell).replace(/"/g, '""'); // escape double quotes
				}).join(colDelim);
			}).join(rowDelim) + '"',

			// Data URI
			csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);

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
})()
