/* eslint-disable prefer-destructuring */
/*
Copyright 2018, 2019, Robin de Gruijter (gruijter@hotmail.com)

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
		this.log('TrackerDriver onInit');
		// init some variables
		this.radarServices = {
			openSky: {
				name: 'openSky',
				capabilities: ['onoff', 'loc', 'brng', 'alt', 'spd', 'to', 'dst', 'tsecs'],
				APIKey: false,
			},
			adsbExchangeFeeder: {
				name: 'adsbExchangeFeeder',
				capabilities: ['onoff', 'loc', 'brng', 'alt', 'spd', 'to', 'dst', 'tsecs'],
				APIKey: true,
			},
			// adsbExchangePaid: {
			// 	name: 'adsbExchangePaid',
			// 	capabilities: ['onoff', 'loc', 'brng', 'alt', 'spd', 'to', 'dst', 'tsecs'],
			// },
		};
	}

	onPair(socket) {
		socket.on('validate', async (data, callback) => {
			try {
				this.log('save button pressed in frontend');
				const service = data.radarSelection || 'openSky';
				const id = `${this.radarServices[service].name}_${crypto.randomBytes(3).toString('hex')}`; // e.g openSky_f9b327
				const device = {
					name: id,
					data: { id },
					settings: {
						pollingInterval: 20, // seconds
						lat: Math.round(Homey.ManagerGeolocation.getLatitude() * 100000000) / 100000000,
						lon: Math.round(Homey.ManagerGeolocation.getLongitude() * 100000000) / 100000000,
						dst: 5, //	Distance in kilometres,
						ico: data.ico || '',
						reg: data.reg || '',
						call: data.call || '',
						onlyGnd: false,
						onlyAir: true,
						service: this.radarServices[service].name,
						username: data.username,
						password: data.password,
						APIKey: data.APIKey,
					},
					capabilities: this.radarServices[service].capabilities,
				};
				callback(null, JSON.stringify(device)); // report success to frontend
			}	catch (error) {
				this.error('Pair error', error);
				callback(error);
			}
		});
	}


}

module.exports = TrackerDriver;
