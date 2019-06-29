/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
function displayLogs(lines) {
	$('#loglines').html(lines);
}

const icaoSearch = /(?:icao: ')(.*?)(?:')/g;
const callSearch = /(?:call: ')(.*?)(?:')/g;
const regSearch = /(?:reg: ')(.*?)(?:')/g;
const locSearch = /(?:loc: ')(.*?)(?:')/g;

function updateLogs() {
	try {
		Homey.api('GET', 'getlogs/', null, (err, result) => {
			if (!err) {
				let lines = '';
				for (let i = (result.length - 1); i >= 0; i -= 1) {
					// https://www.openstreetmap.org/?mlat=57.5529102&mlon=22.5148625#map=16/57.5709/22.4579
					let line = result[i];
					line = line.replace('[log] [ManagerDrivers]', '');
					// line = line.replace(icaoSearch, `<a href="https://junzisun.com/adb/?q=$1">icao: $1</a>`);
					line = line.replace(icaoSearch, `<a href="https://www.planespotters.net/hex/$1?desktop=true" target="_blank">icao: $1</a>`);
					line = line.replace(callSearch, `<a href="https://uk.flightaware.com/live/flight/$1">call: $1</a>`);
					// line = line.replace(regSearch, `<a href="http://www.airport-data.com/aircraft/$1.html">reg: $1</a>`);
					line = line.replace(regSearch, `<a href="https://uk.flightaware.com/live/flight/$1">reg: $1</a>`);
					line = line.replace(locSearch, `<a href="http://www.osm.org/#map=13/$1" target="_blank">loc: $1</a>`);
					// line = line.replace(locSearch, `<a href=\"http://www.osm.org/?mlat=${RegExp.$1.split('/')[0]}&mlon=${RegExp.$1.split('/')[1]}#map=13/$1\" target=\"_blank\">loc: $1</a>`);
					lines += `${line}<br />`;
				}
				displayLogs(lines);
			} else {
				displayLogs(err);
			}
		});
	} catch (e) {
		displayLogs(e);
	}
}

function deleteLogs() {
	Homey.confirm(Homey.__('settings.tab2.deleteWarning'), 'warning', (error, result) => {
		if (result) {
			Homey.api('GET', 'deletelogs/', null, (err) => {
				if (err) {
					Homey.alert(err.message, 'error'); // [, String icon], Function callback )
				} else {
					Homey.alert(Homey.__('settings.tab2.deleted'), 'info');
					updateLogs();
				}
			});
		}
	});
}

function showTab(tab) {
	$('.tab').removeClass('tab-active');
	$('.tab').addClass('tab-inactive');
	$(`#tabb${tab}`).removeClass('tab-inactive');
	$(`#tabb${tab}`).addClass('active');
	$('.panel').hide();
	$(`#tab${tab}`).show();
	updateLogs();
}

function onHomeyReady(homeyReady) {
	Homey = homeyReady;
	showTab(1);
	Homey.ready();
}
