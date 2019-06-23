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
// const util = require('util');

function getTokens(ac) {
	const tokens = {
		dst: ac.dst / 1000 || 0, // The distance to the aircraft in kilometres.
		brng: ac.brng || 0, // The bearing from the browser to the aircraft clockwise from 0° north
		alt: ac.gAlt || 0, // Geometric altitude in meters. Can be null.
		spd: ac.spd || 0, // Velocity over ground in m/s. Can be null.
		vsi: ac.vsi || 0, // Vertical rate in m/s.
		gnd: ac.gnd || false, // true or false
		sqk: ac.sqk || '',
		help: ac.sqk === '7500' || ac.sqk === '7600' || ac.sqk === '7700', // True if the aircraft is transmitting an emergency squawk
		// 7500 = Hijack code, 7600 = Lost Communications, radio problem, 7700 = Emergency
		icao: ac.icao || '-',
		call: ac.call || '-', // The callsign
		oc: ac.oc || '-', // The origin country
		// posTime: ac.posTime, // Unix timestamp (seconds) for the last position update
		from: ac.from || '-', // the departure airport
		to: ac.to || '-', // the destination airport
		op: ac.op || '-', // the operator
		mdl: ac.mdl || '-', // the aircraft model (and make?)
		reg: ac.reg || '-', // the aircraft registration
		// species: ac.species || '-', // the aircraft species
		mil: ac.mil || false, // true if known military aircraft
	};
	return tokens;
}

class RadarDevice extends Homey.Device {

	// this method is called when the Device is inited
	onInit() {
		this.log(`device init ${this.getClass()} ${this.getName()}}`);
		clearInterval(this.intervalIdDevicePoll);	// if polling, stop polling
		this.settings = this.getSettings();
		this.radar = new Radar[this.settings.service](this.settings);
		this.acList = [];
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
		this.log(`radar added: ${this.getData().id}`);
	}

	// this method is called when the Device is deleted
	onDeleted() {
		this.log(`radar deleted: ${this.getData().id}`);
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
			const acArray = await this.radar.getAcInRange();
			// filter out unwanted settings
			const newAcList = acArray
				.filter(ac => !this.settings.onlyGnd || ac.gnd)	// on_ground
				.filter(ac => !this.settings.onlyAir || !ac.gnd)	// not on_ground
				.filter(ac => !this.settings.int || ac.spi)	// interesting / special purpose indicator
				.filter(ac => this.settings.sqk === '' || this.settings.sqk === ac.sqk);	// squawk filter is set
			// check for present in airspace here
			newAcList.forEach((ac) => {
				// check for entering airspace here
				const knownAc = this.acList.filter(sac => sac.icao === ac.icao).length;
				const tokens = getTokens(ac);
				if (!knownAc) {
					this.log(`icao: '${ac.icao}' entering airspace!`);
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
			const leftAc = this.acList.filter(ac => newAcList.filter(tac => tac.icao === ac.icao).length === 0);
			leftAc.forEach((ac) => {
				this.log(`icao: '${ac.icao}', leaving airspace!`);
				const tokens = getTokens(ac);
				// this.log(tokens);
				this.flowCards.acLeftTrigger
					.trigger(this, tokens)
					.catch(this.error);
			});
			// find nearest ac
			const nearestAc = newAcList.reduce((acc, current) => {
				if (current.dst <= acc.dst) {
					return current;
				}
				return acc;
			}, newAcList[0]);
			// set capabilities
			this.setCapability('ac_number', newAcList.length || 0);
			if (nearestAc) {
				const dist = Math.round(nearestAc.dst / 100) / 10;
				const alt = Math.round(nearestAc.gAlt || nearestAc.bAlt || 0);
				this.setCapability('dst', dist);
				this.setCapability('alt', alt);
				this.setCapability('oc', nearestAc.oc || '-');
				this.setCapability('op', nearestAc.op || '-');
				this.setCapability('to', nearestAc.to || '-');
				this.setCapability('mdl', nearestAc.mdl || '-');
			} else {
				this.setCapability('dst', 0);
				this.setCapability('alt', 0);
				this.setCapability('oc', '-');
				this.setCapability('op', '-');
				this.setCapability('to', '-');
				this.setCapability('mdl', '-');
			}
			this.acList = newAcList;
			return Promise.resolve(acArray);
		} catch (error) {
			if (error.code === 'ECONNRESET') {
				this.error('openSky service timeout');
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

}

module.exports = RadarDevice;
