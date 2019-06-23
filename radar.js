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

const openSky = require('./radar_opensky');
const adsbExchangeFeeder = require('./radar_adsbexchange_feeder');
const adsbExchangePaid = require('./radar_adsbexchange_paid');

module.exports.openSky = openSky;

module.exports.adsbExchangeFeeder = adsbExchangeFeeder;

module.exports.adsbExchangePaid = adsbExchangePaid;
