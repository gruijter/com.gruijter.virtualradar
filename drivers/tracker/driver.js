/*
Copyright 2018, Robin de Gruijter (gruijter@hotmail.com)

This file is part of com.gruijter.virtualradar.

com.gruijter.virtualradar is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

com.gruijter.virtualradar is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with com.gruijter.virtualradar.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

const Homey = require('homey');
const crypto = require('crypto');
// const util = require('util');

class TrackerDriver extends Homey.Driver {

	onInit() {
		this.log('ScannerDriver onInit');
		// init some variables
	}

	onPairListDevices(data, callback) {
		const id = `Radar_${crypto.randomBytes(4).toString('hex')}`; // e.g Radar_f9b327e7
		const devices = [
			{
				name: id,
				data: { id },
				settings: {
					pollingInterval: 180, // seconds
					lat: Homey.ManagerGeolocation.getLatitude(),
					lng: Homey.ManagerGeolocation.getLongitude(),
					ico: '------',
					reg: '',
					call: '',
					// filters for after recieving ac list
					onlyGnd: true,
					onlyAir: true,
				},
			},
		];
		this.log(devices);
		callback(null, devices);
	}

}

module.exports = TrackerDriver;
