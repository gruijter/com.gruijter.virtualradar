/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

const homeyIsV2 = typeof Homey.showLoadingOverlay === 'function';
Homey.setTitle(__('pair.title'));

// if (!homeyIsV2) {
// 	Homey.showLoadingOverlay = () => {
// 		$('#discover').prop('disabled', true);
// 		$('#runTest').prop('disabled', true);
// 	};
// 	Homey.hideLoadingOverlay = () => {
// 		$('#discover').prop('disabled', false);
// 		$('#runTest').prop('disabled', false);
// 	};
// }

$('#APIKey').prop('disabled', true);
$('#APIKey').hide();
$('#APIKeyLabel').hide();

function radarSelected() {
	if ($('#radarSelection').val() === 'openSky') {
		$('#APIKey').prop('disabled', true);
		$('#APIKey').hide();
		$('#APIKeyLabel').hide();
	} else {
		$('#APIKey').prop('disabled', false);
		$('#APIKey').show();
		$('#APIKeyLabel').show();
	}
}

function testSettings() {
	const data = {
		radarSelection: $('#radarSelection').val(),
		username: $('#username').val(),
		password: $('#password').val(),
		APIKey: $('#APIKey').val(),
	};
	const trackIDSelection = $('#trackIDSelection').val();
	const trackID = $('#trackID').val();
	data[trackIDSelection] = trackID;
	// Continue to back-end, pass along data
	Homey.emit('validate', data, (error, result) => {
		if (error) {
			Homey.alert(error.message, 'error');
		} else {
			Homey.alert(`${__('pair.success')} ${result}`, 'info');
			const device = JSON.parse(result);
			Homey.addDevice(device, (err, res) => {
				if (err) { Homey.alert(err, 'error'); return; }
				setTimeout(() => {
					Homey.done();
				}, 2000);
			});
		}
	});

}
