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

class Radar extends Homey.Device {

	// this method is called when the Device is inited
	onInit() {
		this.log(`device init ${this.getClass()} ${this.getName()}}`);
		clearInterval(this.intervalIdDevicePoll);	// if polling, stop polling
		this.lastDv = null;
		this.acList = [];
		this.flowCards = {};
		this.registerFlowCards();
		this.intervalIdDevicePoll = setInterval(async () => {
			try {
				// this.log('polling now...');
				this.getAcData();
			} catch (error) { this.log('intervalIdDevicePoll error', error); }
		}, 1000 * this.getSetting('pollingInterval'));
	}

	// this method is called when the Device is added
	onAdded() {
		this.log(`radar added: ${this.getData().id} ${this.getName()}`);
	}

	// this method is called when the Device is deleted
	onDeleted() {
		this.log(`radar deleted: ${this.getData().id} ${this.getName()}`);
		clearInterval(this.intervalIdDevicePoll);
	}

	// this method is called when the user has changed the device's settings in Homey.
	onSettings(newSettingsObj, oldSettingsObj, changedKeysArr, callback) {
		// first stop polling the device, then start init after short delay
		clearInterval(this.intervalIdDevicePoll);
		this.log('radar device settings changed');
		this.setAvailable()
			.catch(this.error);
		setTimeout(() => {
			this.onInit();
		}, 10000);
		callback(null, true);
	}

	async getAcData() {
		try {
			const settings = this.getSettings();
			const query = {
				// ldv: this.lastDv,	 // The lastDv value from the last aircraft list fetched. Omit on first time fetching an aircraft list.
				lat: settings.lat,	// : 51.8858,	// The decimal latitude to measure distances and calculate bearings from
				lng: settings.lng, // : 4.5572,	// The decimal longitude to measure distances and calculate bearings from
				fAltL: Math.round(settings.altLm / 0.3048), //	Altitude in meters lower limit
				fAltU: Math.round(settings.altUm / 0.3048), //	Altitude in meters upper limit
				fDstL: 0, //	Distance in kilometres, lower limit
				fDstU: settings.dstU, //	Distance in kilometres, lower limit
			};
			if (settings.mil) {
				query.fMilQ = true;
			}
			if (settings.int) {
				query.fIntQ = true;
			}
			if (settings.sqk !== '0000') {
				query.fSqkQ = settings.sqk;
			}
			const headers = {
				'Content-Length': 0,
			};
			const options = {
				hostname: 'public-api.adsbexchange.com',
				path: `/VirtualRadar/AircraftList.json?${qs.stringify(query)}`,
				headers,
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
			// filter out unwanted species and Gnd settings
			const newAcList = jsonData.acList
				.filter(ac => settings[speciesList[ac.Species]])
				.filter(ac => !settings.onlyGnd || ac.Gnd)
				.filter(ac => !settings.onlyAir || !ac.Gnd);
			// check for present in airspace here
			newAcList.forEach((ac) => {
				// check for entering airspace here
				const knownAc = this.acList.filter(sac => sac.Id === ac.Id).length;
				const tokens = getTokens(ac);
				if (!knownAc) {
					// this.log(`icao: '${ac.Icao}' entering airspace!`);
					this.log(tokens);
					this.flowCards.acEnteringTrigger
						.trigger(this, tokens)
						.catch(this.error);
				}
				// this.log(`icao: '${ac.Icao}' present in airspace!`);
				this.flowCards.acPresentTrigger
					.trigger(this, tokens)
					.catch(this.error);
			});
			// check for leaving airspace here
			const leftAc = this.acList.filter(ac => newAcList.filter(tac => tac.Id === ac.Id).length === 0);
			leftAc.forEach((ac) => {
				this.log(`icao: '${ac.Icao}', leaving airspace!`);
				const tokens = getTokens(ac);
				// this.log(tokens);
				this.flowCards.acLeftTrigger
					.trigger(this, tokens)
					.catch(this.error);
			});
			// find nearest ac
			const nearestAc = newAcList.reduce((acc, current) => {
				if (current.Dst <= acc.Dst) {
					return current;
				}
				return acc;
			}, newAcList[0]);
			// set capabilities
			this.setCapabilityValue('ac_number', newAcList.length || 0);
			if (nearestAc) {
				this.setCapabilityValue('op', nearestAc.Op || '-');
				this.setCapabilityValue('to', nearestAc.To || '-');
				this.setCapabilityValue('dst', nearestAc.Dst || 0);
				this.setCapabilityValue('alt', Math.round(nearestAc.GAlt * 0.3048));
				this.setCapabilityValue('mdl', nearestAc.Mdl || '-');
			} else {
				this.setCapabilityValue('op', '-');
				this.setCapabilityValue('to', '-');
				this.setCapabilityValue('dst', 0);
				this.setCapabilityValue('alt', 0);
				this.setCapabilityValue('mdl', '-');
			}
			this.acList = newAcList;
			return Promise.resolve(jsonData);
		} catch (error) {
			if (error.code === 'ECONNRESET') {
				this.error('adsbexchange service timeout');
			} else this.error(error);
			return error;
		}
	}

	registerFlowCards() {
	// register trigger flow cards
		this.flowCards.acEnteringTrigger = new Homey.FlowCardTriggerDevice('ac_entering')
			.register();
		this.flowCards.acLeftTrigger = new Homey.FlowCardTriggerDevice('ac_left')
			.register();
		this.flowCards.acPresentTrigger = new Homey.FlowCardTriggerDevice('ac_present')
			.register();
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

module.exports = Radar;
