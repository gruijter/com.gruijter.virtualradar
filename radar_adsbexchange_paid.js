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

const https = require('https');
const GeoPoint = require('geopoint');
// const util = require('util');
// const FlightAware = require('./flightaware');

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
// 	}
// }

// this class represents a virtual radar
class VirtualRadar {
	constructor(settings) {
		// this.username = settings.username;
		this.password = settings.password;
		this.lat = settings.lat;	//	float	WGS-84 latitude in decimal degrees. Can be null.
		this.lon = settings.lon;	//	float	WGS-84 longitude in decimal degrees. Can be null.
		this.range = settings.dst;	// float Radar range in km.
		this.lastScan = 0; // int Unix timestamp (seconds) for the last radar update.
		this.timeout = 15000; // int Timeout in ms for the http service call
		this.center = new GeoPoint(this.lat, this.lon);
		// this.fa = new FlightAware();
	}

	// returns an array of aircraft states that are in range
	async getAcInRange() {
		try {
			// const headers = {
			// 	'Content-Length': 0,
			// 	'api-auth': this.password,
			// };
			const options = {
				hostname: 'adsbexchange-com1.p.rapidapi.com',
				path: `/api/aircraft/json/lat/${this.lat}/lon/${this.lon}/dist/${this.range}/`,
				headers: {
					'Content-Length': 0,
					'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com',
					'X-RapidAPI-Key': this.password,
				},
				method: 'GET',
			};
			const result = await this._makeHttpsRequest(options);
			if (result.statusCode !== 200 || result.headers['content-type'] !== 'application/json') {
				throw Error(`Service: ${result.statusCode} ${result.body.substring(0, 40)}`);
			}
			const jsonData = JSON.parse(result.body);
			// console.log(util.inspect(jsonData, { depth: null, colors: true }));
			if (jsonData.ctime === undefined) {
				throw Error('Invalid response from API');
			}
			if (jsonData.msg) {
				throw Error(jsonData.msg);
			}
			this.lastScan = jsonData.ctime;
			if (!jsonData.ac) {
				jsonData.ac = [];
			}
			const acList = jsonData.ac
				.map(state => Promise.resolve(this._getAc(state)));
			return Promise.all(acList);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _getAc(state) {
		const ac = {
			icao: state.icao,
			callSign: state.call,
			originCountry: state.cou,
			posTime: Number(state.postime),
			// lastSeen: state[4],
			lon: Number(state.lon),
			lat: Number(state.lat),
			bAlt: Math.round((Number(state.alt || 0) * 0.3048)), // galt * 0.3048 = m
			gnd: state.gnd !== '0',
			spd: Math.round(((Number(state.spd || 0)) * 1.852)), // Spd * 1.852 = km/h,
			brng: Number(state.trak),
			vs: Math.round(((Number(state.vsi || 0)) * 1.852)), // Spd * 1.852 = km/h,
			// sensors: state[12],
			gAlt: Math.round((Number(state.galt || 0) * 0.3048)), // galt * 0.3048 = m
			sqk: state.sqk,
			spi: state.interested !== '0',
			// posSource: state[16],
		};
		// calculate the distance
		ac.dst = Math.round(this._getAcDistance(ac) * 1000);
		// // enrich from FlightAware
		// const faData = await this.fa.getFlightInfo(ac.callSign);
		// console.log(faData);
		// Object.assign(ac, faData);
		return Promise.resolve(ac);
	}

	_getAcDistance(ac) {
		const acLoc = new GeoPoint(ac.lat, ac.lon);
		return this.center.distanceTo(acLoc);
	}

	_makeHttpsRequest(options) {
		return new Promise((resolve, reject) => {
			const req = https.request(options, (res) => {
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
				});
				res.once('end', () => {
					res.body = resBody;
					return resolve(res); // resolve the request
				});
			});
			req.setTimeout(this.timeout, () => req.abort());
			req.once('error', e => reject(e));
			req.end();
		});
	}

}

module.exports = VirtualRadar;

/*
{ ac:
   [ { postime: '1559300693078',
       icao: '4845F0',
       reg: 'PH-VHD',
       type: 'SIRA',
       wtc: '1',
       spdtyp: '',
       spd: '',
       altt: '0',
       alt: '900',
       galt: '900',
       talt: '',
       lat: '52.1533',
       lon: '4.983',
       vsit: '0',
       vsi: '',
       trkh: '0',
       ttrk: '',
       trak: '264.9',
       sqk: '7000',
       call: 'PHVHD',
       gnd: '0',
       trt: '1',
       pos: '1',
       mlat: '1',
       tisb: '0',
       sat: '0',
       opicao: '',
       cou: 'Netherlands',
       mil: '0',
	   interested: '0' },
	{ postime: '1559301341505',
		icao: '4CAB6D',
		reg: 'EI-FZI',
		type: 'B738',
		wtc: '2',
		spdtyp: '',
		spd: '398.4',
		altt: '0',
		alt: '38000',
		galt: '38316',
		talt: '',
		lat: '52.134567',
		lon: '5.057602',
		vsit: '0',
		vsi: '0',
		trkh: '0',
		ttrk: '',
		trak: '262.5',
		sqk: '3440',
		call: 'RYR61TW',
		gnd: '0',
		trt: '2',
		pos: '1',
		mlat: '0',
		tisb: '0',
		sat: '0',
		opicao: 'RYR',
		cou: 'Ireland',
		mil: '0',
		interested: '0' }
	],
  total: 2,
  ctime: 1559300697832,
  ptime: 5141 }
*/
