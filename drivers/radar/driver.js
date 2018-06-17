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
const https = require('https');
// const util = require('util');

class RadarDriver extends Homey.Driver {

	onInit() {
		this.log('ScannerDriver onInit');
		// init some variables
	}

	// onPair(socket) {
	// 	socket.on('save', async (data, callback) => {
	// 		try {
	// 			this.log('save button pressed in frontend');
	// 			const info = data;
	// 			this.log(info);
	// 			if (data.lat === 0 || data.long === 0) {
	// 				info.lat = Homey.ManagerGeolocation.getLatitude();
	// 				info.long = Homey.ManagerGeolocation.getLongitude();
	// 			}
	// 			info.id = `scanner_${(this.getDevices().length + 1)}`;
	// 			this.log(info);
	// 			callback(null, JSON.stringify(info)); // report success to frontend
	// 		}	catch (error) {
	// 			this.error('Pair error', error.message);
	// 			callback(error);
	// 		}
	// 	});
	// }

	onPairListDevices(data, callback) {
		const id = `Radar_${(this.getDevices().length + 1)}`;
		const devices = [
			{
				name: id,
				data: { id },
				settings: {
					pollingInterval: 20, // seconds
					lat: Homey.ManagerGeolocation.getLatitude(),
					lng: Homey.ManagerGeolocation.getLongitude(),
					altLm: 0, //	Altitude in meter lower limit
					altUm: 12000, //	Altitude in meter upper limit
					// dstL: 0, //	Distance in kilometres, lower limit
					dstU: 5, //	Distance in kilometres, Upper limit
					mil: false,
					int: false,
					// filters for after recieving ac list
					unknown: true,
					land: true,
					sea: true,
					amphibian: true,
					helicopter: true,
					gyrocopter: true,
					tiltwing: true,
					vehicle: true,
					tower: true,
					onlyGnd: false,
					onlyAir: true,
				},
			},
		];
		this.log(devices);
		callback(null, devices);
	}

	_makeHttpsRequest(options, postData) {
		return new Promise((resolve, reject) => {
			const req = https.request(options, (res) => {
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
				});
				res.on('end', () => {
					res.body = resBody;
					return resolve(res); // resolve the request
				});
			});
			req.on('error', (e) => {
				this.log(e);
				reject(e);
			});
			req.setTimeout(15000, () => {
				req.abort();
				reject(Error('Connection timeout'));
			});
			req.write(postData);
			req.end();
		});
	}

}

module.exports = RadarDriver;
