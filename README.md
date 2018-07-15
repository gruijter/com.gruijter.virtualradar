# ADS-B Virtual Radar #

Turn Homey into an aircraft radar or tracker. The radar information is based on
ADS-B tracker info from adsbexchange.com

* Ever wanted to know where that plane over your house is heading?
* Do you want to track the local Police Helicopter?
* Do you need a record of small planes flying over your estate too low?
* Interested in knowing where Military airplanes are?
* Do you want to track your pilot husband all over the world?
* Do you want a push message when your wife is taking the helicopter again?

### Radar: Live data from aircrafts in radar range ###
For each radar you can see the number of aircraft in reach, and information from
the nearest aircraft:

![image][mobile-card-image1]
![image][mobile-card-image2]

### Tracker: Track an individual aircraft ###
For each tracker you can see the location, direction, altitude, speed,
destination airport and track time:

![image][mobile-card-image3]
![image][mobile-card-image4]

### Action flow cards ###

* Aircraft entering airspace
* Aircraft moving in airspace
* Aircraft leaving airspace
* Tracker came online
* Tracker info was updated
* Tracker went offline
* Aircraft went airborne (tracker)
* Aircraft landed (tracker)

![image][flow-cards-image]
![image][flow-cards-image2]

With the flow cards you get the following tokens:

- dist: The distance to the aircraft in kilometres.
- bearing: The bearing from the radar to the aircraft clockwise from 0° north
- alt: The altitude in meters adjusted for local air pressure.
- ground: True if the aircraft is on the ground
- km/h: The ground speed in km/h
- vert.: Vertical speed in meter per minute.
- species: The species of the aircraft (helicopter, jet etc.)
- mil: True if the aircraft appears to be operated by the military.
- icao: ICAO unique ID
- reg: The registration
- call: The callsign
- model: A description of the aircraft's model. Usually also includes the manufacturer's name.
- oprtr: The name of the aircraft's operator.
- from: The code and name of the departure airport.
- to: The code and name of the arrival airport.
- help: True if the aircraft is transmitting an emergency squawk.

![image][flow-tokens-image]

### Radar setup ###
You can setup multiple radars anywhere in the world. As default it will be setup
on the location of your Homey. For each radar you can set:
* location (long, lat)
* range (km)
* min and max altitudes (m)
* scan interval (seconds)

![image][radar-setup-image]

You can filter the results with a number of options:

![image][radar-types-image]
![image][radar-filters-image]

### Tracker setup ###
You can setup multiple trackers. For each tracker you can set:
* home location (long, lat). This is used to calculate the distance token.
* ICAO or Registration or Callsign
* scan interval (seconds)

![image][tracker-setup-image]

### Donate: ###
If you like the app you can show your appreciation by posting it in the [forum].
If you really like the app you can buy me a beer.

[![Paypal donate][pp-donate-image]][pp-donate-link]

This app uses:
* ADSBexchange for virtual radar data: https://www.adsbexchange.com/legal-and-privacy/
* OpenStreetMap for reverse geocoding: https://osm.org/copyright

===============================================================================

Version changelog

```
v2.0.3	2018.07.15 fix flow cards with undefined tokens
v2.0.2	2018.07.12 fix re-adding devices after removal of device.
v2.0.1	2018.07.08 Http optimizations. Added html links in logs.
v2.0.0	2018.06.23 Added emergency filter and help token. Added tracker driver.
v0.0.8	2018.06.17 Initial release

```

[forum]: https://forum.athom.com/discussion/5286
[pp-donate-link]: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=VB7VKG5Y28M6N
[pp-donate-image]: https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif
[mobile-card-image1]: https://forum.athom.com/uploads/editor/15/ihdfxcz99gqi.png
[mobile-card-image2]: https://forum.athom.com/uploads/editor/q9/d6qm30f4xoos.png
[flow-cards-image]: https://forum.athom.com/uploads/editor/9v/dtfe6xypxix2.png
[flow-tokens-image]: https://forum.athom.com/uploads/editor/ne/zgzazfbn41dt.png
[radar-setup-image]: https://forum.athom.com/uploads/editor/90/2xgahii2cc4v.png
[radar-types-image]: https://forum.athom.com/uploads/editor/iw/0arsbn5puffo.png
[radar-filters-image]: https://forum.athom.com/uploads/editor/pd/3kianuxsn1wy.png
[mobile-card-image3]: https://forum.athom.com/uploads/editor/dw/ww0hxtpi15su.png
[mobile-card-image4]: https://forum.athom.com/uploads/editor/hc/i0j0jp9ws0s8.png
[flow-cards-image2]: https://forum.athom.com/uploads/editor/yo/jbfshkqiizzo.png
[tracker-setup-image]: https://forum.athom.com/uploads/editor/n1/0hcbmperxz5j.png
