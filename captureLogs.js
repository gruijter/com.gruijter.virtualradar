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

const StdOutFixture = require('fixture-stdout');
const fs = require('fs');

class captureLogs {
	// Log object to keep logs in memory and in persistent storage
	// captures and reroutes Homey's this.log (stdout) and this.err (stderr)

	constructor(opts) {
		this.homey = opts.homey;
		this.logName = opts.name || 'log';
		this.logLength = opts.length || 50;
		this.logFile = `/userdata/${this.logName}.json`;
		this.logArray = [];
		this.captureStdOut();
		this.captureStdErr();
		this.readLogs();
	}

	readLogs() {
		try {
			const log = fs.readFileSync(this.logFile, 'utf8');
			this.logArray = JSON.parse(log);
			this.homey.log('logfile retrieved');
			return Promise.resolve(this.logArray);
		} catch (error) {
			if (error.message.includes('ENOENT')) {
				this.homey.log('logfile not found');
				return Promise.resolve(this.logArray);
			}
			this.homey.error('error parsing logfile: ', error.message);
			return Promise.reject(error);
		}
	}

	saveLogs() {
		try {
			this.homey.log('saving logfile...');
			fs.writeFileSync(this.logFile, JSON.stringify(this.logArray));
			return Promise.resolve('logfile saved');
		} catch (error) {
			this.homey.error('error writing logfile: ', error.message);
			return Promise.reject(error);
		}
	}

	deleteLogs() {
		try {
			fs.unlinkSync(this.logFile);
			this.logArray = [];
			this.homey.log('logfile deleted');
			return Promise.resolve('logfile deleted');
		} catch (error) {
			if (error.message.includes('ENOENT')) {
				this.logArray = [];
				return Promise.resolve(this.homey.log('logfile not found, in-memory logs deleted'));
			}
			this.homey.error('error deleting logfile: ', error.message);
			return Promise.reject(error);
		}
	}

	captureStdOut() {
		// Capture all writes to stdout (e.g. this.log)
		this.captureStdout = new StdOutFixture({ stream: process.stdout });
		this.captureStdout.capture((string) => {
			if (this.logArray.length >= this.logLength) {
				this.logArray.shift();
			}
			this.logArray.push(string);
			// return false;	// prevent the write to the original stream
		});
		this.homey.log('capturing stdout');
		// captureStdout.release();
	}

	captureStdErr() {
		// Capture all writes to stderr (e.g. this.error)
		this.captureStderr = new StdOutFixture({ stream: process.stderr });
		this.captureStderr.capture((string) => {
			if (this.logArray.length >= this.logLength) {
				this.logArray.shift();
			}
			this.logArray.push(string);
			// return false;	// prevent the write to the original stream
		});
		this.homey.log('capturing stderr');
		// captureStderr.release();
	}

	releaseStdOut() {
		this.captureStdout.release();
	}

	releaseStdErr() {
		this.captureStderr.release();
	}

}

module.exports = captureLogs;
