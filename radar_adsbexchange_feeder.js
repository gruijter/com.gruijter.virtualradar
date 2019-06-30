/* eslint-disable no-restricted-globals */
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

const GeoPoint = require('geopoint');
const https = require('https');
// const util = require('util');

// this class represents a virtual radar
class VirtualRadar {
	constructor(settings) {
		// this.username = settings.username;
		// this.password = settings.password;
		this.APIKey = settings.APIKey;
		this.lat = settings.lat;	//	float	WGS-84 latitude in decimal degrees. Can be null.
		this.lon = settings.lon;	//	float	WGS-84 longitude in decimal degrees. Can be null.
		// this.range = settings.dst;	// float Radar range in km.
		this.rangenm = settings.dst / 1.852; // range in nm.
		this.center = new GeoPoint(this.lat, this.lon);
		this.lastScan = 0; // int Unix timestamp (seconds) for the last radar update.
		this.timeout = 15000; // int Timeout in ms for the http service call
	}

	// returns an array of aircraft states that are in range
	async getAcInRange() {
		try {
			const headers = {
				'Content-Length': 0,
				'api-auth': this.APIKey,
			};
			const options = {
				hostname: 'adsbexchange.com',
				path: `/api/aircraft/json/lat/${this.lat}/lon/${this.lon}/dist/${this.rangenm}/`,
				headers,
				method: 'GET',
			};
			const jsonData = await this._makeRequest(options);
			if (!jsonData.ac) {
				jsonData.ac = [];
			}
			const acList = jsonData.ac
				.map(state => Promise.resolve(this._getAcNormal(state)));
			return Promise.all(acList);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	// returns the state of a specific aircraft
	async getAc(ACOpts) {
		try {
			const headers = {
				'Content-Length': 0,
				'api-auth': this.APIKey,
			};
			const options = {
				hostname: 'adsbexchange.com',
				path: '/api/aircraft/',
				headers,
				method: 'GET',
			};
			if (ACOpts.ico !== '') {
				options.path = `${options.path}icao/${ACOpts.ico.toUpperCase()}`;
			}
			if (ACOpts.reg !== '') {
				options.path = `${options.path}registration/${ACOpts.reg.toUpperCase()}`;
			}
			if (ACOpts.call !== '') {
				options.path = `${options.path}callsign/${ACOpts.call.toUpperCase()}`;
			}
			const jsonData = await this._makeRequest(options);
			if (!jsonData.ac) {
				jsonData.ac = [];
			}
			const acList = jsonData.ac
				.map(state => Promise.resolve(this._getAcNormal(state)));
			return Promise.all(acList);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	// returns the normalized state of an aircraft
	_getAcNormal(state) {
		const ac = {
			icao: state.icao,
			call: state.call,
			oc: state.cou,
			posTime: Number(state.postime),
			lastseen: Number(state.postime),
			lon: Number(state.lon),
			lat: Number(state.lat),
			bAlt: Math.round((Number(state.alt || 0) * 0.3048)), // galt * 0.3048 = m
			gnd: state.gnd !== '0',
			spd: Math.round(((Number(state.spd || 0)) * 1.852)), // Spd * 1.852 = km/h,
			brng: Number(state.trak),
			vsi: Math.round(((Number(state.vsi || 0)) * 0.00508)), // Spd * 0.00508 = m/s,
			gAlt: Math.round((Number(state.galt || 0) * 0.3048)), // galt * 0.3048 = m
			sqk: state.sqk,
			spi: state.interested !== '0',
			reg: state.reg,
			from: state.from,
			to: state.to,
			op: state.opicao,
			mdl: state.type,
			dst: Math.round(Number(state.dst) * 1.852 * 1000),
			mil: state.mil === '1',
		};
		if (isNaN(ac.dst)) {
			ac.dst = Math.round(this._getAcDistance(ac) * 1000);
		}
		return Promise.resolve(ac);
	}

	_getAcDistance(ac) {
		const acLoc = new GeoPoint(ac.lat, ac.lon);
		return this.center.distanceTo(acLoc);
	}

	async _makeRequest(options) {
		try {
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
			return Promise.resolve(jsonData);
		} catch (error) {
			return Promise.reject(error);
		}
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
   [ { postime: '1560950789229',
       icao: '4AC9E5',
       reg: 'SE-ROE',
       type: 'A20N',
       wtc: '2',
       spd: '486.6',
       altt: '0',
       alt: '38975',
       galt: '38963',
       talt: '39008',
       lat: '52.14798',
       lon: '5.073166',
       vsit: '1',
       vsi: '0',
       trkh: '0',
       ttrk: '30.9375',
       trak: '40.5',
       sqk: '0645',
       call: 'SAS2572',
       gnd: '0',
       trt: '5',
       pos: '1',
       mlat: '0',
       tisb: '0',
       sat: '0',
       opicao: 'SAS',
       cou: 'Sweden',
       mil: '0',
       interested: '0',
       from: 'LFPG Charles de Gaulle Paris France',
       to: 'ESSA Stockholm-Arlanda Stockholm Sweden',
       dst: '4.25' }
	],
  total: 2,
  ctime: 1559300697832,
  ptime: 5141 }
*/
