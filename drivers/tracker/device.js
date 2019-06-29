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
const Radar = require('../../radar');
const geo = require('../../reverseGeo');
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

function getTokens(ac) {
	if (!ac) return {};
	const tokens = {
		icao: ac.icao || '-',
		call: ac.call || '-', // The callsign
		oc: ac.oc || '-', // The origin country
		// posTime: ac.posTime, // Unix timestamp (seconds) for the last position update
		// lastSeen
		lon: ac.lon,
		lat: ac.lat,
		// bAlt
		alt: ac.gAlt || 0, // Geometric altitude in meters. Can be null.
		gnd: ac.gnd || false, // true or false
		spd: ac.spd || 0, // Velocity over ground in m/s. Can be null.
		brng: ac.brng || 0, // The bearing from the browser to the aircraft clockwise from 0° north
		vsi: ac.vsi || 0, // Vertical rate in m/s.
		// gAlt,
		sqk: ac.sqk || '',
		help: ac.sqk === '7500' || ac.sqk === '7600' || ac.sqk === '7700', // True if the aircraft is transmitting an emergency squawk
		// 7500 = Hijack code, 7600 = Lost Communications, radio problem, 7700 = Emergency
		// spi
		reg: ac.reg || '-', // the aircraft registration
		from: ac.from || '-', // the departure airport
		to: ac.to || '-', // the destination airport
		op: ac.op || '-', // the operator
		mdl: ac.mdl || '-', // the aircraft model (and make?)
		mil: ac.mil || false, // true if known military aircraft
		dst: ac.dst / 1000 || 0, // The distance to the aircraft in kilometres.
		loc: ac.locString || '-', // the geo location Country-Area-City
		// trackStart
		tsecs: ac.tsecs || 0, // tracking time in seconds
	};
	return tokens;
}

class Tracker extends Homey.Device {

	// this method is called when the Device is inited
	onInit() {
		this.log(`device init ${this.getClass()} ${this.getName()}}`);
		clearInterval(this.intervalIdDevicePoll);	// if polling, stop polling
		this.settings = this.getSettings();
		this.radar = new Radar[this.settings.service](this.settings);
		this.ac = undefined;
		this.flowCards = {};
		this.registerFlowCards();
		this.intervalIdDevicePoll = setInterval(async () => {
			try {
				this.scan();
			} catch (error) { this.log('intervalIdDevicePoll error', error); }
		}, 1000 * this.getSetting('pollingInterval'));
	}

	// this method is called when the Device is added
	onAdded() {
		this.log(`tracker added: ${this.getData().id}`);
	}

	// this method is called when the Device is deleted
	onDeleted() {
		this.log(`tracker deleted: ${this.getData().id}`);
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

	setCapability(capability, value) {
		if (this.hasCapability(capability)) {
			this.setCapabilityValue(capability, value)
				.catch((error) => {
					this.log(error, capability, value);
				});
		}
	}

	async scan() {
		try {
			const acName = this.getName();
			const opts = this.settings;
			const acList = await this.radar.getAc(opts);
			const ac = acList[0];
			// ac is present in airspace (transmitting)
			if (ac) {
				// calculate tracking time
				ac.trackStart = this.ac ? this.ac.trackStart : Date.now();
				ac.tsecs = Math.round((Date.now() - ac.trackStart) / 1000) || 0;
				ac.locString = await geo.getAclocString(ac); // reverse ReverseGeocoding
				const tokens = getTokens(ac);
				// this.log(tokens);
				// aircraft entering airspace (started transmitting)
				if (!this.ac || !this.ac.icao) {
					this.log(`${acName} icao: '${ac.icao}', started transmitting loc: '${ac.lat}/${ac.lon}'`);
					ac.trackStart = Date.now();
					this.flowCards.trackerOnlineTrigger
						.trigger(this, tokens)
						.catch(this.error);
				}
				// aircraft present in airspace (is transmitting)
				// this.log(`${acName} ${ac.Icao} is transmitting!`);
				this.flowCards.trackerPresentTrigger
					.trigger(this, tokens)
					.catch(this.error);
				this.setCapability('onoff', !ac.gnd);
				// aircraft went airborne
				if (!ac.gnd && this.ac && this.ac.gnd) {
					this.log(`${acName} icao: '${ac.icao}', just went airborne loc: '${ac.lat}/${ac.lon}'`);
					this.flowCards.wentAirborneTrigger
						.trigger(this, tokens)
						.catch(this.error);
				}
				// aircraft just landed
				if (ac.gnd && this.ac && !this.ac.gnd) {
					this.log(`${acName} icao: '${ac.icao}', just landed loc: '${ac.lat}/${ac.lon}'`);
					this.flowCards.justLandedTrigger
						.trigger(this, tokens)
						.catch(this.error);
				}
				this.ac = ac;
				this.setAcCapabilities(ac);
				return;
			}
			// aircraft left airspace (stopped transmitting)
			if (this.ac && this.ac.icao) {
				this.log(`${acName} icao: '${this.ac.icao}', stopped transmitting loc: '${this.ac.lat}/${this.ac.lon}'`);
				this.setCapability('onoff', false);
				// use last known tokens
				const tokens = getTokens(this.ac);
				this.flowCards.trackerOfflineTrigger
					.trigger(this, tokens)
					.catch(this.error);
				this.ac = {
					locString: this.ac.locString,
				};
				this.setAcCapabilities();
			} else {	// there is no aircraft detected
				this.setCapability('onoff', false);
			}
			return;
		} catch (error) {
			this.error(error);
		}
	}

	setAcCapabilities(ac) {
		try {
			if (!ac) {	// no aircraft data available
				this.setCapability('onoff', false);
				this.setCapability('loc', this.ac.locString || '-');
				this.setCapability('brng', '-');
				this.setCapability('alt', 0);
				this.setCapability('spd', 0);
				this.setCapability('to', '-');
				this.setCapability('dst', 0);
				this.setCapability('tsecs', '-');
				return;
			}
			const alt = Math.round(ac.gAlt || ac.bAlt || 0);
			const dst = Math.round(ac.dst / 100) / 10;
			const dir = getDirection(ac.brng);
			this.setCapability('onoff', true);
			this.setCapability('loc', ac.locString || '-');
			this.setCapability('brng', dir);
			this.setCapability('alt', alt);
			this.setCapability('spd', ac.spd);
			this.setCapability('to', ac.to || '-');
			this.setCapability('dst', dst || 0);
			this.setCapability('ttime', toHHMM(ac.tsecs));
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

}

module.exports = Tracker;
