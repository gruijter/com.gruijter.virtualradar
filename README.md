# ADS-B Virtual Radar #

Make Homey into an aircraft radar based on ADS-B tracker info from virtualradarserver.co.uk.

* Ever wanted to know where that plane over your house is heading?
* Do you want to track the local Police Helicopter?
* Do you need a record of small planes flying over your estate too low?
* Interested in knowing where Military airplanes are?
* Do you want to track your pilot husband all over the world?
* Do you want a push message when your wife is taking the helicopter again?

### Live aircraft data ###
For each radar you can see the number of aircraft in reach, and information from
the nearest aircraft:

![image][mobile-card-image1]
![image][mobile-card-image2]

### Action flow cards ###

* Aircraft entering airspace
* Aircraft moving in airspace
* Aircraft leaving airspace

![image][flow-cards-image]

With the flow cards you get the following tokens:

dist: The distance to the aircraft in kilometres.
bearing: The bearing from the radar to the aircraft clockwise from 0° north
alt: The altitude in meters adjusted for local air pressure.
ground: True if the aircraft is on the ground
km/h: The ground speed in km/h
vert.: Vertical speed in meter per minute.
species: The species of the aircraft (helicopter, jet etc.)
mil: True if the aircraft appears to be operated by the military.
icao: ICAO unique ID
reg: The registration
call: The callsign
model: A description of the aircraft's model. Usually also includes the manufacturer's name.
oprtr: The name of the aircraft's operator.
from: The code and name of the departure airport.
to: The code and name of the arrival airport.

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


### Donate: ###
If you like the app you can show your appreciation by posting it in the [forum].
If you really like the app you can buy me a beer.

[![Paypal donate][pp-donate-image]][pp-donate-link]

===============================================================================

Version changelog

```
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
