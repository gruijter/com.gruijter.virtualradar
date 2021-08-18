/*
Copyright 2018 - 2021, Robin de Gruijter (gruijter@hotmail.com)

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

const https = require('https');

const regexTitle = new RegExp(/<meta.*?name="title".*?content="(.*?)".*?>/i);
const regexDescription = new RegExp(/<meta.*?property="og:description".*?content="(.*?)".*?>/i);
const regexOrigin = new RegExp(/<meta.*?name="origin".*?content="(.*?)".*?>/i);
const regexDestination = new RegExp(/<meta.*?name="destination".*?content="(.*?)".*?>/i);
const regexAirline = new RegExp(/<meta.*?name="airline".*?content="(.*?)".*?>/i);
const regexAircrafttype = new RegExp(/<meta.*?name="aircrafttype".*?content="(.*?)".*?>/i);
const regexAircraftmake = new RegExp(/('aircraft_make'.*?'(.*?)'.*?)/i);
const regexAircraftmodel = new RegExp(/('aircraft_model'.*?'(.*?)'.*?)/i);
const regexEnginecategory = new RegExp(/('engine_category'.*?'(.*?)'.*?)/i);
const regexEnginetype = new RegExp(/('engine_type'.*?'(.*?)'.*?)/i);

// // this class represents the state of an aircraft
// class AircraftState {
// 	constructor() {
// 		this.icao = ''; //	string	Unique ICAO 24-bit address of the transponder in hex string representation.
// 		this.callSign = ''; //	string	Callsign of the vehicle (8 chars). Can be null if no callsign has been received.
// 		this.reg = ''; //	string The registration.
// 		this.originCountry = ''; //	string	Country name inferred from the ICAO 24-bit address.
// 		this.posTime = 0; // int Unix timestamp (seconds) for the last position update.
// 		this.lastSeen = null; //	int	Unix timestamp (seconds) for the last update in general.
// 		this.lon = 0; //	float	WGS-84 longitude in decimal degrees.
// 		this.lat = 0; //	float	WGS-84 latitude in decimal degrees.
// 		this.bAlt = 0; // float	Barometric altitude in meters.
// 		this.gAlt = 0; //	float	Geometric altitude in meters.
// 		this.gnd = true; //	boolean	Boolean value which indicates if the position was retrieved from a surface position report.
// 		this.spd = 0; //	float	Velocity over ground in m/s.
// 		this.brng = 0; //	float	True track in decimal degrees clockwise from north (north=0°).
// 		this.vr = 0; //	float	Vertical rate in m/s. A positive value indicates that the airplane is climbing.
// 		this.receivers = []; //	IDs of the receivers which contributed to this state vector.
// 		this.sqk = ''; //	string	The transponder code aka Squawk.
// 		this.spi = false; //	boolean	Whether flight status indicates special purpose indicator.
// 		this.posSource = 0; //	int Origin of this state’s position: 0 = ADS-B, 1 = ASTERIX, 2 = MLAT
// 		this.dst = 0; // float Distance from the radar in m.
// 		this.species = 0;
// 		this.type = undefined; // The aircraft model's ICAO type code.
// 		this.mdl = ''; // string A description of the aircraft's model. Can  also include the manufacturer's name.
// 		this.op = ''; // string The name of the aircraft's operator.
// 		this.from = ''; // string The code and name of the departure airport.
// 		this.to = ''; // string  The code and name of the arrival airport.

// 		{ description:
// 			"Track China Cargo (CK) #207 flight from Shanghai Pudong Int'l to Amsterdam Schiphol",
// 		 title: 'China Cargo (CK)  #207',
// 		 origin: 'ZSPD',
// 		 destination: 'EHAM',
// 		 airline: 'CKK',
// 		 aircraftType: 'B77L',
// 		 aircraftMake: 'Boeing',
// 		 aircraftModel: '777-200LR/F',
// 		 engineCategory: 'turbine',
// 		 engineType: 'twin-jet' }
// 	}
// }

// this class represents a session with flightAware
class FlightAware {
	constructor() {
		this.timeout = 5000;
		this.info = {};
	}

	// returns an array of aircraft states that are in range
	async getFlightInfo(callSign) {
		try {
			if (!callSign || callSign === '') {
				return {};
			}
			const headers = {
				'cache-control': 'no-cache',
			};
			const options = {
				hostname: 'uk.flightaware.com',
				path: `/live/flight/${(callSign)}`,
				headers,
				method: 'GET',
			};
			const result = await this._makeHttpsRequest(options);
			if ((result.statusCode !== 200) && (result.statusCode !== 301)) {
				throw Error(`Service: ${result.statusCode}`);
			}
			// console.log(result.body);
			const description = regexDescription.exec(result.body) || [];
			const title = regexTitle.exec(result.body) || [];
			const origin = regexOrigin.exec(result.body) || [];
			const destination = regexDestination.exec(result.body) || [];
			const airline = regexAirline.exec(result.body) || [];
			const aircraftType = regexAircrafttype.exec(result.body) || [];
			const aircraftMake = regexAircraftmake.exec(result.body) || [];
			const aircraftModel = regexAircraftmodel.exec(result.body) || [];
			const engineCategory = regexEnginecategory.exec(result.body) || [];
			const engineType = regexEnginetype.exec(result.body) || [];

			const info = {
				desc: description[1],
				title: title[1],
				org: origin[1],
				dest: destination[1],
				op: airline[1],
				acType: aircraftType[1],
				// acMake: aircraftMake[2],
				// acModel: aircraftModel[2],
				acMakeModel: `${aircraftMake[2]} ${aircraftModel[2]}`,
				engineCategory: engineCategory[2],
				engineType: engineType[2],
			};
			return Promise.resolve(info);
		} catch (error) {
			// console.log(error);
			return Promise.resolve({});
		}
	}

	_makeHttpsRequest(options, postData, timeout) {
		return new Promise((resolve, reject) => {
			const opts = options;
			opts.timeout = timeout || this.timeout;
			const req = https.request(opts, (res) => {
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
				});
				res.once('end', () => {
					if (!res.complete) {
						this.error('The connection was terminated while the message was still being sent');
						return reject(Error('The connection was terminated while the message was still being sent'));
					}
					res.body = resBody;
					return resolve(res); // resolve the request
				});
			});
			req.on('error', (e) => {
				req.destroy();
				return reject(e);
			});
			req.on('timeout', () => {
				req.destroy();
			});
			// req.write(postData);
			req.end(postData || '');
		});
	}

}

module.exports = FlightAware;
