/* eslint-disable arrow-body-style */
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
const qs = require('querystring');

const _makeHttpsRequest = (options) => {
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
		req.setTimeout(5000, () => {
			req.abort();
		});
		req.once('error', (e) => {
			reject(e);
		});
		req.end();
	});
};

const reverseGeo = async (lat, lon) => {
	try {
		const query = {
			format: 'json', // [xml|json|jsonv2]
			// osm_type: 'N',	// [N|W|R] node / way / relation, preferred over lat,lon
			lat,	// The location to generate an address for
			lon,	// The location to generate an address for
			zoom: 18, // [0-18]	Level of detail required where 0 is country and 18 is house/building
			addressdetails: 1,	// [0|1] Include a breakdown of the address into elements
			email: 'gruijter@hotmail.com', // <valid email address> only used to contact you in the event of a problem, see Usage Policy
			// extratags: 1,	// [0|1] Include additional information in the result if available, e.g. wikipedia link, opening hours.
			// namedetails: 1,	// [0|1] Include a list of alternative names in the results. language variants, references, operator and brand
		};
		const headers = {
			'Content-Length': 0,
		};
		const options = {
			hostname: 'nominatim.openstreetmap.org',
			path: `/reverse?${qs.stringify(query)}`,
			headers,
			'User-Agent': 'Homey VirtualRadar',
			method: 'GET',
		};
		const result = await _makeHttpsRequest(options, '');
		if (result.statusCode !== 200 || result.headers['content-type'] !== 'application/json; charset=UTF-8') {
			return this.error(`reverse geo service error: ${result.statusCode}`);
		}
		const jsonData = JSON.parse(result.body);
		// this.log(util.inspect(jsonData, { depth: null, colors: true }));
		return Promise.resolve(jsonData);
	} catch (error) {
		if (error.code === 'ECONNRESET') {
			this.error('reverse geo service timeout');
		} else this.error(error);
		return error;
	}
};

const getAclocString = async (ac) => {
	try {
		let locString;
		if (!ac) {	// no aircraft data available
			locString = '-';
			return locString;
		}
		if (!ac.lat || !ac.lon) {	// no lat/long data available
			locString = '-';
			return locString;
		}
		const loc = await reverseGeo(ac.lat, ac.lon);
		if (!loc.address) {	// no reverse geolocation available
			locString = 'Intl. Water';	// aircraft over sea maybe?
			return locString;
		}
		const alt = ac.gAlt || ac.bAlt;
		const countryCode = loc.address.country_code.toUpperCase();
		let local = loc.address.state;
		if (alt < 2000) {
			local = loc.address.city || loc.address.county || loc.address.state_district || local;
		}
		if (alt < 500) {
			local = loc.address.village || loc.address.town || local;
		}
		if (alt < 200) {
			local = loc.address.suburb || local;
		}
		locString = `${countryCode} ${local}`;
		return Promise.resolve(locString);
	} catch (error) {
		return Promise.reject(error);
	}
};

module.exports.getAclocString = getAclocString;


/*
{ place_id: 81479432,
  licence: 'Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright',
  osm_type: 'way',
  osm_id: 27687816,
  lat: '52.374028',
  lon: '4.91789314639283',
  display_name: 'Marinekazerne Amsterdam, Dijksgrachtkade, Oostelijke Eilanden, Amsterdam, Noord-Holland, Nederland, 1019BT, Nederland',
  address:
   { address29: 'Marinekazerne Amsterdam',
     road: 'Dijksgrachtkade',
     neighbourhood: 'Oostelijke Eilanden',
     suburb: 'Amsterdam',
     city: 'Amsterdam',
     state: 'Noord-Holland',
     postcode: '1019BT',
     country: 'Nederland',
     country_code: 'nl' },
  boundingbox: [ '52.3725587', '52.3759276', '4.9143916', '4.9210072' ] }
*/
