/* eslint-disable no-console */
/* This Source Code Form is subject to the terms of the Mozilla Public
	License, v. 2.0. If a copy of the MPL was not distributed with this
	file, You can obtain one at http://mozilla.org/MPL/2.0/.

	Copyright 2017, 2018, Robin de Gruijter <gruijter@hotmail.com> */

// INSTRUCTIONS FOR TESTING FROM DESKTOP:
// install node (https://nodejs.org)
// install this package: > npm i netgear
// run the test (from the test folder): > node test password

'use strict';

// const Radar = require('../radar_opensky');
const FlightAware = require('../flightaware');

console.log('Testing now. Hang on.....');

const testStuff = async () => {
	// const radar = new Radar(this.settings.lat, this.settings.lng, this.settings.dst * 1000);
	const flightAware = new FlightAware();
	console.log(await flightAware.getFlightInfo('CKK207'));
};

testStuff();
