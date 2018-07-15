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
const qs = require('querystring');
const https = require('https');
// const util = require('util');

function toHHMM(secs) {
	const secNum = parseInt(secs, 10);
	const hours = Math.floor(secNum / 3600);
	const minutes = Math.floor((secNum - (hours * 3600)) / 60);
	// const seconds = secNum - (hours * 3600) - (minutes * 60);
	let HH = `${hours}`;
	let MM = `${minutes}`;
	if (hours < 10) { HH = `0${hours}`; }
	if (minutes < 10) { MM = `0${minutes}`; }
	// if (seconds < 10) { SS = `0${seconds}`; }
	return `${HH}:${MM}`;
}

function getDirection(bearing) {
	let direction = '-';
	if (Number.isNaN(bearing)) {
		this.log(`bearing is not a number: ${bearing}`);
		return direction;
	}
	if ((bearing >= 337.5) && (bearing < 22.5)) {
		direction = 'N';
	}
	if ((bearing >= 22.5) && (bearing < 67.5)) {
		direction = 'NE';
	}
	if ((bearing >= 67.5) && (bearing < 112.5)) {
		direction = 'E';
	}
	if ((bearing >= 112.5) && (bearing < 157.5)) {
		direction = 'SE';
	}
	if ((bearing >= 157.5) && (bearing < 202.5)) {
		direction = 'S';
	}
	if ((bearing >= 202.5) && (bearing < 247.5)) {
		direction = 'SW';
	}
	if ((bearing >= 247.5) && (bearing < 292.5)) {
		direction = 'W';
	}
	if ((bearing >= 292.5) && (bearing < 337.5)) {
		direction = 'NW';
	}
	return direction;
}

const speciesList = {	// needs translation via localization?
	0: 'unknown',	// Onbekend
	1: 'land', // Luchtvaartuig
	2: 'sea', // Watervliegtuig
	3: 'amphibian', // Amfibisch
	4: 'helicopter', // Helicopter
	5: 'gyrocopter', // Gyrocopter
	6: 'tiltwing', // Tiltwing
	7: 'vehicle', // Grond voertuig
	8: 'tower', // Toren
};

function getTokens(ac) {
	const tokens = {
		dst: ac.Dst || 0, // The distance to the aircraft in kilometres.
		brng: ac.Brng || 0, // The bearing from the browser to the aircraft clockwise from 0° north
		alt: Math.round((ac.GAlt || 0) * 0.3048), // The altitude in feet adjusted for local air pressure. GAlt * 0.3048 = m
		spd: Math.round((ac.Spd || 0) * 1.852), // The ground speed in knots. Spd * 1.852 = km/h
		vsi: Math.round((ac.Vsi || 0) * 0.3048), // Vertical speed in feet per minute. Vsi * 0.3048 = m/min
		// None: 0, LandPlane: 1, SeaPlane: 2, Amphibian: 3, Helicopter: 4, Gyrocopter: 5, Tiltwing: 6, GroundVehicle: 7, Tower: 8
		gnd: ac.Gnd, // true or false
		mil: ac.Mil, // True if the aircraft appears to be operated by the military.
		help: ac.Help, // True if the aircraft is transmitting an emergency squawk
		species: speciesList[ac.Species] || '-', // number 	The species of the aircraft (helicopter, jet etc.) - see enums.js for values.
		// id: ac.Id,
		icao: ac.Icao || '-',
		reg: ac.Reg || '-', // The registration.
		call: ac.Call || '-', // The callsign
		// type: ac.Type, // The aircraft model's ICAO type code.
		mdl: ac.Mdl || '-',	// A description of the aircraft's model. Usually also includes the manufacturer's name.
		op: ac.Op || '-', // The name of the aircraft's operator.
		from: ac.From || '-', // The code and name of the departure airport.
		to: ac.To || '-', // The code and name of the arrival airport.
		// PosTime: ac.PosTime, // The time (at UTC in JavaScript ticks) that the position was last reported by the aircraft.
	};
	return tokens;
}

class Tracker extends Homey.Device {

	// this method is called when the Device is inited
	onInit() {
		this.log(`device init ${this.getClass()} ${this.getName()}}`);
		clearInterval(this.intervalIdDevicePoll);	// if polling, stop polling
		this.lastDv = null;
		this.ac = undefined;
		this.flowCards = {};
		this.registerFlowCards();
		this.intervalIdDevicePoll = setInterval(async () => {
			try {
				// this.log('polling now...');
				this.trackAc();
			} catch (error) { this.log('intervalIdDevicePoll error', error); }
		}, 1000 * this.getSetting('pollingInterval'));
	}

	// this method is called when the Device is added
	onAdded() {
		this.log(`tracker added: ${this.getData().id} ${this.getName()}`);
	}

	// this method is called when the Device is deleted
	onDeleted() {
		this.log(`tracker deleted: ${this.getData().id} ${this.getName()}`);
		clearInterval(this.intervalIdDevicePoll);
	}

	// this method is called when the user has changed the device's settings in Homey.
	onSettings(newSettingsObj, oldSettingsObj, changedKeysArr, callback) {
		// first stop polling the device, then start init after short delay
		clearInterval(this.intervalIdDevicePoll);
		this.log('tracker device settings changed');
		this.setAvailable()
			.catch(this.error);
		setTimeout(() => {
			this.onInit();
		}, 10000);
		callback(null, true);
	}

	async trackAc() {
		try {
			const ac = await this.getAcData();
			this.getAcState(ac);	// flowcards and stuff
			const locString = await this.getAclocString(ac); // reverse ReverseGeocoding
			this.setAcCapabilities(ac, locString);
			this.ac = ac;
			return ac;
		} catch (error) {
			this.error(error);
			return error;
		}
	}

	async getAcData() {
		try {
			const settings = this.getSettings();
			const query = {
				// ldv: this.lastDv,	 // The lastDv value from the last aircraft list fetched. Omit on first time fetching an aircraft list.
				lat: settings.lat,	// : 51.8858,	// The decimal latitude to measure distances and calculate bearings from
				lng: settings.lng, // : 4.5572,	// The decimal longitude to measure distances and calculate bearings from
			};
			if (settings.ico !== '') {
				query.fIcoQ = settings.ico; // ICAO equals
			}
			if (settings.reg !== '') {
				query.fRegQ = settings.reg; // Registration equals
			}
			if (settings.call !== '') {
				query.fCallQ = settings.call; // Callsign equals
			}
			const headers = {
				'Content-Length': 0,
			};
			const options = {
				hostname: 'public-api.adsbexchange.com',
				path: `/VirtualRadar/AircraftList.json?${qs.stringify(query)}`,
				headers,
				'User-Agent': 'Homey VirtualRadar',
				method: 'GET',
			};
			const result = await this._makeHttpsRequest(options, '');
			if (result.statusCode !== 200 || result.headers['content-type'] !== 'application/json') {
				return this.error(`adsbexchange service error: ${result.statusCode}`);
			}
			const jsonData = JSON.parse(result.body);
			// this.log(util.inspect(jsonData, { depth: null, colors: true }));
			if (jsonData.lastDv === undefined) {
				// this.error(result.body);
				throw Error('Invalid response from API');
			}
			this.lastDv = jsonData.lastDv;
			const ac = jsonData.acList[0];
			return Promise.resolve(ac);
		} catch (error) {
			if (error.code === 'ECONNRESET') {
				this.error('adsbexchange service timeout');
			} else this.error(error);
			return error;
		}
	}

	getAcState(ac) {
		try {
			const acName = this.getName();
			if (ac) {
				// ac is present in airspace (transmitting)
				if (!ac.Icao) {
					return undefined;
				}
				const tokens = getTokens(ac);
				// this.log(tokens);
				// aircraft entering airspace (started transmitting)
				if (!this.ac) {
					this.log(`${acName} icao: '${ac.Icao}', started transmitting loc: '${ac.Lat}/${ac.Long}'`);
					this.flowCards.trackerOnlineTrigger
						.trigger(this, tokens)
						.catch(this.error);
				}
				// aircraft present in airspace (is transmitting)
				// this.log(`${acName} ${ac.Icao} is transmitting!`);
				this.flowCards.trackerPresentTrigger
					.trigger(this, tokens)
					.catch(this.error);
				this.setCapabilityValue('onoff', !ac.Gnd);
				// aircraft went airborne
				if (!ac.Gnd && this.ac.Gnd) {
					this.log(`${acName} icao: '${ac.Icao}', just went airborne loc: '${ac.Lat}/${ac.Long}'`);
					this.flowCards.wentAirborneTrigger
						.trigger(this, tokens)
						.catch(this.error);
				}
				// aircraft just landed
				if (ac.Gnd && !this.ac.Gnd) {
					this.log(`${acName} icao: '${ac.Icao}', just landed loc: '${ac.Lat}/${ac.Long}'`);
					this.flowCards.justLandedTrigger
						.trigger(this, tokens)
						.catch(this.error);
				}
				return Promise.resolve(tokens);
			} else if (this.ac) { // aircraft left airspace (stopped transmitting)
				this.log(`${acName} icao: '${this.ac.Icao}', stopped transmitting loc: '${ac.Lat}/${ac.Long}'`);
				this.setCapabilityValue('onoff', false);
				// use last known tokens
				const tokens = getTokens(this.ac);
				this.flowCards.trackerOfflineTrigger
					.trigger(this, tokens)
					.catch(this.error);
			} else {	// there is no aircraft detected
				this.setCapabilityValue('onoff', false);
			}
			this.ac = ac;
			return ac;
		} catch (error) {
			// this.error(error);
			return error;
		}
	}

	async getAclocString(ac) {
		try {
			let locString;
			if (!ac) {	// no aircraft data available
				locString = '-';
				return locString;
			}
			if (!ac.Lat || !ac.Long) {	// no lat/long data available
				// this.log('no address');
				locString = '-';
				return locString;
			}
			const loc = await this.reverseGeo(ac.Lat, ac.Long);
			if (!loc.address) {	// no reverse geolocation available
				this.log('no address');
				locString = 'Intl. Water';	// aircraft over sea maybe?
				return locString;
			}
			const countryCode = loc.address.country_code.toUpperCase();
			let local = loc.address.state;
			if ((ac.GAlt * 0.3048) < 2000) {
				local = loc.address.city || loc.address.county || loc.address.state_district || local;
			}
			if ((ac.GAlt * 0.3048) < 500) {
				local = loc.address.village || loc.address.town || local;
			}
			if ((ac.GAlt * 0.3048) < 200) {
				local = loc.address.suburb || local;
			}
			locString = `${countryCode} ${local}`;
			return Promise.resolve(locString);
		} catch (error) {
			// this.error(error);
			return error;
		}
	}

	setAcCapabilities(ac, locString) {
		try {
			if (!ac) {	// no aircraft data available
				this.setCapabilityValue('onoff', false);
				// this.setCapabilityValue('loc', locString);
				this.setCapabilityValue('brng', '-');
				this.setCapabilityValue('alt', 0);
				this.setCapabilityValue('spd', 0);
				this.setCapabilityValue('to', '-');
				this.setCapabilityValue('tsecs', '-');
				return;
			}
			// this.setCapabilityValue('onoff', false);
			this.setCapabilityValue('loc', locString);
			this.setCapabilityValue('brng', getDirection(ac.Brng));
			this.setCapabilityValue('alt', Math.round(ac.GAlt * 0.3048));
			this.setCapabilityValue('spd', Math.round(ac.Spd * 1.852));
			this.setCapabilityValue('to', ac.To || '-');
			this.setCapabilityValue('tsecs', toHHMM(ac.TSecs));
		} catch (error) {
			this.error(error);
		}
	}


	registerFlowCards() {
	// register trigger flow cards
		this.flowCards.trackerOnlineTrigger = new Homey.FlowCardTriggerDevice('tracker_online')
			.register();
		this.flowCards.trackerOfflineTrigger = new Homey.FlowCardTriggerDevice('tracker_offline')
			.register();
		this.flowCards.trackerPresentTrigger = new Homey.FlowCardTriggerDevice('tracker_present')
			.register();
		this.flowCards.wentAirborneTrigger = new Homey.FlowCardTriggerDevice('went_airborne')
			.register();
		this.flowCards.justLandedTrigger = new Homey.FlowCardTriggerDevice('just_landed')
			.register();
	}

	async reverseGeo(lat, lon) {
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
			const result = await this._makeHttpsRequest(options, '');
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
	}

	_makeHttpsRequest(options, postData) {
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
			req.write(postData);
			req.end();
			req.setTimeout(900 * this.getSetting('pollingInterval'), () => {
				req.abort();
				// this.log('Connection timeout');
			});
			req.once('error', (e) => {
				reject(e);
			});
		});
	}

}

module.exports = Tracker;
