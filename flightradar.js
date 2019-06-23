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

// const regexTitle = new RegExp(/<meta.*?name="title".*?content="(.*?)".*?>/i);
// const regexDescription = new RegExp(/<meta.*?property="og:description".*?content="(.*?)".*?>/i);
// const regexOrigin = new RegExp(/<meta.*?name="origin".*?content="(.*?)".*?>/i);
// const regexDestination = new RegExp(/<meta.*?name="destination".*?content="(.*?)".*?>/i);
// const regexAirline = new RegExp(/<meta.*?name="airline".*?content="(.*?)".*?>/i);
// const regexAircrafttype = new RegExp(/<meta.*?name="aircrafttype".*?content="(.*?)".*?>/i);
// const regexAircraftmake = new RegExp(/('aircraft_make'.*?'(.*?)'.*?)/i);
// const regexAircraftmodel = new RegExp(/('aircraft_model'.*?'(.*?)'.*?)/i);
// const regexEnginecategory = new RegExp(/('engine_category'.*?'(.*?)'.*?)/i);
// const regexEnginetype = new RegExp(/('engine_type'.*?'(.*?)'.*?)/i);

// this class represents a session with planeFinder
class PlaneFinder {
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
				hostname: 'www.flightradar24.com',
				path: `/${(callSign)}`,
				headers,
				method: 'GET',
			};
			const result = await this._makeHttpsRequest(options);
			if ((result.statusCode !== 200) && (result.statusCode !== 301)) {
				throw Error(`Service: ${result.statusCode} ${result.body.substring(0, 40)}`);
			}
			// console.log(result.body);
			// const description = regexDescription.exec(result.body) || [];
			// const title = regexTitle.exec(result.body) || [];
			// const origin = regexOrigin.exec(result.body) || [];
			// const destination = regexDestination.exec(result.body) || [];
			// const airline = regexAirline.exec(result.body) || [];
			// const aircraftType = regexAircrafttype.exec(result.body) || [];
			// const aircraftMake = regexAircraftmake.exec(result.body) || [];
			// const aircraftModel = regexAircraftmodel.exec(result.body) || [];
			// const engineCategory = regexEnginecategory.exec(result.body) || [];
			// const engineType = regexEnginetype.exec(result.body) || [];

			// const info = {
			// 	description: description[1],
			// 	title: title[1],
			// 	origin: origin[1],
			// 	destination: destination[1],
			// 	airline: airline[1],
			// 	aircraftType: aircraftType[1],
			// 	aircraftMake: aircraftMake[2],
			// 	aircraftModel: aircraftModel[2],
			// 	engineCategory: engineCategory[2],
			// 	engineType: engineType[2],
			// };
			const info = {};
			return Promise.resolve(info);
		} catch (error) {
			// console.log(error);
			return Promise.resolve({});
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
			req.setTimeout(this.timeout, () => {
				req.abort();
			});
			req.once('error', (e) => {
				reject(e);
			});
			req.end();
		});
	}

}

module.exports = PlaneFinder;
