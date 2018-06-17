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
const Logger = require('./captureLogs.js');
const https = require('https');

class VirtualRadarApp extends Homey.App {

	onInit() {
		this.log('Virtual Radar app is running!');
		this.logger = new Logger('log', 200);
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
	}

	//  stuff for frontend API
	deleteLogs() {
		return this.logger.deleteLogs();
	}
	getLogs() {
		return this.logger.logArray;
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
			req.setTimeout(30000, () => {
				req.abort();
				reject(Error('Connection timeout'));
			});
			req.write(postData);
			req.end();
		});
	}

}

module.exports = VirtualRadarApp;

// https://github.com/vradarserver/vrs
// https://www.adsbexchange.com/data/
// https://www.adsbexchange.com/datafields/
// cirle center of NL: 52.228936, 5.321492 range:171km

/*
For example, to query all aircraft between 0 and 100 km of the lat/long of Phoenix Sky Harbor Airport, use:
http://public-api.adsbexchange.com/VirtualRadar/AircraftList.json?lat=33.433638&lng=-112.008113&fDstL=0&fDstU=100

ldv	The lastDv value from the last aircraft list fetched. Omit this if this is the first time you are fetching an aircraft list.
	The server will use this value and the X-VirtualRadarServer-AircraftIds header to figure out what has changed since the last time you fetched a list and will only send the changed information.
	If you do not supply these values then you are always sent a full aircraft list.
lat	The decimal latitude to measure distances and calculate bearings from. Omit if no distance or bearing calculations are to be made.
lng	The decimal longitude to measure distances and calculate bearings from. Omit if no distance or bearing calculations are to be made.
selAc	The ID of the selected aircraft, if any. Omit if no aircraft is selected.
trFmt	The format of trails that you want to be passed. Omit if you do not want trail history to be sent for each aircraft that is transmitting a position.
	The legal values for this parameter are f for a full trail, fa for a full trail with altitudes, fs for a full trail with speeds, s for a short trail,
	sa for a short trail with altitudes and ss for a short trail with speeds. Short trails only show the last 30 seconds of positions. The duration of a short trail can be changed in the server settings.
refreshTrails	Set to 1 to force the server to send the entire trail for each aircraft. If this is missing or 0 then the server will try to only send new positions for the trail.
feed	The ID of the feed whose aircraft list you want to see. If missing or invalid then the default feed is used - this is configured on the server.

fAir	String	The to / from / via airport code
fAlt	Integer range	Altitude in feet
fCall	String	Callsign
fCou	String	Country
fDst	Number range	Distance in kilometres
fEgt	Enum	Engine type
fNoPos	Boolean	No position transmitted
fIco	String	ICAO
fMil	Boolean	Is military
fTyp	String	Model ICAO code
fOp	String	Operator name
fOpIcao	String	Operator ICAO code
fReg	String	Registration
fSpc	Enum	Aircraft species
fSqk	Intger range	Squawk
fInt	Boolean	Is flagged as interesting in database
fWtc	Enum	Wake turbulence category
fUt	String	User tag
fNBnd	Bounds	The top-most latitude of the bounds. Only returns aircraft within these bounds.
fSBnd	Bounds	The bottom-most latitude of the bounds. Only returns aircraft within these bounds.
fWBnd	Bounds	The left-most longitude of the bounds. Only returns aircraft within these bounds.
fEBnd	Bounds	The right-most longitude of the bounds. Only returns aircraft within these bounds

All filters (except the Bounds filters) are passed with a name that consists of a prefix and then a single-character code that describes the condition.
If the condition is negated / reversed (e.g. NOT equal to) then a suffix of N is also appended. The full list of conditions is as-per below:

Condition	Suffix Character	Filter Types That Can Use It
Between - lower	L	Number range
Between - upper	U	Number range
Contains	C	String
Ends with	E	String
Equals	Q	String, Boolean, Enum
Starts with	S	String
*/
