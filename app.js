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

const Homey = require('homey');
// const https = require('https');
const Logger = require('./captureLogs.js');

class VirtualRadarApp extends Homey.App {

	onInit() {
		this.log('Virtual Radar app is running!');
		if (!this.logger) this.logger = new Logger({ homey: this, length: 200 });
		// register some listeners
		process.on('unhandledRejection', (error) => {
			this.error('unhandledRejection! ', error);
		});
		process.on('uncaughtException', (error) => {
			this.error('uncaughtException! ', error);
		});
		Homey
			.on('unload', () => {
				this.log('app unload called');
				// save logs to persistant storage
				this.logger.saveLogs();
			})
			.on('memwarn', () => {
				this.log('memwarn!');
			});
		// do garbage collection every 10 minutes
		this.intervalIdGc = setInterval(() => {
			global.gc();
		}, 1000 * 60 * 10);
	}

	//  stuff for frontend API
	deleteLogs() {
		return this.logger.deleteLogs();
	}

	getLogs() {
		return this.logger.logArray;
	}

	// _makeHttpsRequest(options, postData, timeout) {
	// 	return new Promise((resolve, reject) => {
	// 		const opts = options;
	// 		opts.timeout = timeout || 30000;
	// 		const req = https.request(opts, (res) => {
	// 			let resBody = '';
	// 			res.on('data', (chunk) => {
	// 				resBody += chunk;
	// 			});
	// 			res.once('end', () => {
	// 				if (!res.complete) {
	// 					this.error('The connection was terminated while the message was still being sent');
	// 					return reject(Error('The connection was terminated while the message was still being sent'));
	// 				}
	// 				res.body = resBody;
	// 				return resolve(res); // resolve the request
	// 			});
	// 		});
	// 		req.on('error', (e) => {
	// 			req.destroy();
	// 			this.error(e);
	// 			return reject(e);
	// 		});
	// 		req.on('timeout', () => {
	// 			req.destroy();
	// 		});
	// 		// req.write(postData);
	// 		req.end(postData || '');
	// 	});
	// }

}

module.exports = VirtualRadarApp;

/*
LINKS:
Search aircraft manufacturers, aircraft types, aircraft registers, airports, airlines, aviators, etc.:
https://www.aviationfanatic.com/ent_list.php?ent=15

https://github.com/vradarserver/vrs

flight search:
https://planefinder.net/flight/IBK415
https://www.flightstats.com/v2/flight-tracker/CA/934
https://www.flightradar24.com/TAP566W

icao search:
https://global.adsbexchange.com/VirtualRadar/IcaoReport.htm?icao=485875
https://junzisun.com/adb/?q=4845BB
reg search:
https://global.adsbexchange.com/VirtualRadar/RegReport.htm?reg=PH-EXY
http://www.airport-data.com/aircraft/OH-LXD.html
call search:
https://uk.flightaware.com/live/flight/LZVAR

https://developers.google.com/maps/documentation/geocoding/start#ReverseGeocoding  >> Too expensive
https://wiki.openstreetmap.org/wiki/Nominatim >> free?

http://www.airport-data.com/aircraft/ZA670.html

https://www.adsbexchange.com/data/
https://www.adsbexchange.com/datafields/
cirle center of NL: 52.228936, 5.321492 range:171km

display map:
http://maps.google.com/?q=-37.866963,144.980615
https://www.openstreetmap.org/?mlat=57.5529102&mlon=22.5148625#map=16/57.5709/22.4579

*/
