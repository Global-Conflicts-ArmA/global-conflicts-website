
# 60mm Mortar Guide

This guide will cover everything you'll need to know on how to calculate fire missions and operate the 60mm mortar.

*This guide assumes you have prior knowledge of grid coordinates, map, compass, map tool operations, and basic maths*

## The Basics
### Meet the crew
While a single person can technically calculate fire missions and operate the 60mm mortar entirely on their own, in an ideal world you'll have at least a two man crew for your battery. Typically the Crew/Section commander and a gunner, with the commander choosing where the crew goes, monitors the net for fire missions, and calculates said fire missions, before passing the information swiftly to his gunner who'll input it into the mortar, load, and fire.
A crew that regularly works with each other in missions can create very good synergy, which in return usually produces higher efficiency.

There could also be times when a Forward Observer (FO) could be part of your crew or working at head quarters level.
In theory this should greatly increase the ability for the gun crew to perform accurate and detailed fire missions due to dedicated relaying of information on enemy and friendly forces,  splash, and adjustments from the FO.

If a gun crew does not have an FO, then you'll either have to use other callsigns (who could be busy) to give you fire missions, find a direct line of sight from where you are firing, or fire blind.
### Tools of the trade
There are various different pieces of equipment you'll need to achieve being an effective crew. 

**Required**
 - 60mm Mortar (3cb variant)
 - 60mm ammo - Either: HE, HE Airburst, White phosphorus, White flare, White smoke, or Red smoke shells (All rounds weight the same, 3lb/1.3kg)
 - Map & Compass
 - Map tools

**Optional**

 - Vector/Range finder
 - GPS/Micro Dagr/Dagr
 - Radios for communication
 - Vehicle for transport and supply
 - Calculator for quick maths

## Operating the mortar
### Setting up/deploying
When setting up your mortar, there's a few things to consider such as, is the ground flat enough so it doesn't affect rounds and also placement of the mortar, do I have enough overhead clearance so my rounds don't hit something close and explode, how can I access ammo - i.e do I have a vehicles to transport supplies or do I have to run for more, is ammo cross loaded throughout your platoon, cover and concealment for your crew, and routes in and out of your area in-case you get bumped by the enemy and need to leave.

 1. Equip the M6 mortar in the launcher slot.
 2. To assemble the mortar, either drag the M6 from your inventory onto the ground and use the context menu to mount, or use the shortcut key (“3” by default) to quickly deploy and mount in one action.
 - There is also a shortcut key (“4” by default) to quickly get-out of the M6 with empty hands.

### Loading/Unloading
**Loading**
The 60mm mortar **cannot** be loaded by a 2nd person, thus a loader is useless as literally every interaction can be done by the gunner while mounted.
- Rounds can be loaded from either your backpack, on the ground or in an ammo crate near the tube, but not from a vehicle.

 1. Prepare the correct type of round. 
 This is accomplished by approaching either the M6’s ammo crate or the M6’s tube.
 Use the context menu to select a round.
 Once selected the round will turn green. This tells to the tube which round to load next when the gunner chooses to reload.
 2. Load the round, either by once again using the context menu on the M6’s tube, or by pressing “R” to reload.

**Unloading**
Let's say you load a HE round into the tube, but then get told to conduct a smoke fire mission, remember to always unload the round currently in the tube before switching to new ammo and firing.
To do so, you use the context menu to scroll and click "unload", which'll place the unspent round on the floor next to you.

### Firing

 1. Press “Ctrl-B” to bring up an integrated range table.
 - The M6 mortar has it's own range table compared to the ACE artillery rangetable, meaning if you have a 2nd man calculating fire missions, he'll have to have the "M6 Rangetable" `UK3CB_BAF_M6_RangeTable`in their inventory, to see the table you see.
 2. Press “F” to change the charge.
 3. To aim, change the traversal by moving the mouse either left or right.
 4. To change elevation use PAGE-UP/PAGE-DOWN.
 - If you need a visual assist then press “Ctrl-`” and a circle will display for 6 seconds, which'll show what you are directly looking at visually.

## Calculating fire missions
Ok so we've got a fire mission to destroy a target at a location, now we need the information to fire on the target.

 1. Find your location.
 The first step is to identify your own location, by using either GPS, landmarks, road-signs, terrain signs/types.
 -- Crossroads, religious land marks, terrain saddles, and such are identifiable features for example.
 For this example we're located at a crossroad.
 ![enter image description here](https://i.imgur.com/xw6PTFH.jpeg)
 2. Locate your target.
 For all intents and purposes here, we've been given an 8 digit grid (0443-0809) by our FO, meaning we have a target accuracy of up to 10 meters. ![enter image description here](https://i.imgur.com/9jb5auZ.jpeg)
 3. While on the mortar, open the range table with CTRL+B, then open your map and self interact to open your map tools.
 Click and drag your map tools until the little black dot in the centre is over your location.
 Rotate the map tools so the red shooting line passes through your target location.
 ![enter image description here](https://i.imgur.com/R67K3li.jpeg)
 This gives you the azimuth to rotate the mortar to.
 Here we can see we have a have an azimuth of 3240mils, so move your mouse either left or right until the compass on the mortar shows the same azimuth like so.
 ![enter image description here](https://i.imgur.com/fmGxGHM.jpeg)
 When dealing with artillery, you use azimuth and not degrees/bearings as it's a much more accurate over distance. The azimuth is displayed on the compass in the outer white ring with the larger numbers, starting at 0000-6400 for a full 360 degrees.
 Mills goes up and down in increments of 20, so each small post/black line is 0020 mils.
 
 4. Now we're dialled in on the azimuth, we need to get our elevation.
 Go back to your map and move the map tools, so "0" on the ruler is placed over your location.
 ![enter image description here](https://i.imgur.com/x2fXLTD.jpeg)
 The largest posts/black lines represent 1km, followed by 500m posts, medium posts are 100m, and the smallest posts are 20m.
 Here we we count from 0 up until are target, which will be roughly 750m.
 So we've got the distance, now come out the map and look at your range table on the right.
 ![enter image description here](https://i.imgur.com/AHRcL2s.jpeg)
 We can see that 750m at the bottom of the table is the max range for "Charge 0" shown at the top, so while we *could* use this charge to reach our target, we'll have no room to add for further ranges if we need to make adjustments, so using a higher charge might be more viable, although higher charges will also increase the Time of flight (ToF), meaning longer time until the round hits the target.
We can also see that the last four rows of the last column are empty, we have no information on elevation difference - Which we'll need!
General rule of thumb is that if the target is within range to use a lower charge, do so, but because we're at the max of charge 0, we're going to use charge 1.
Press F to cycle to charge 1
![enter image description here](https://i.imgur.com/9Vzj7Zk.jpeg)

 We start in the first column, going down each row until we find our range.
 Once we find our range, we look at the next column which'll give our elevation.
 The third column is the time of flight for the round in seconds.
 And the fourth column is the elevation different you apply to your original elevation, for every 100 meters altitude difference between you and target.
 
 So we can see our elevation for 750 meters, on charge 1, is 1229, with an elevation difference of 24mils per 100 meters.

 **How does elevation difference work?**
 Using our example above, we have 24mils to either add or subtract for every 100 meters difference in altitude.<br/>
 For this, our target is 100 meters higher then our location.<br/>
We already know our standard elevation of 1229, now we adjust for that 100 meter height difference.<br/>
 Because we are 100 meters **lower** then our target, we will add 24mils, making our final elevation to target 1253.<br/>
 If we was **above** our target by 100 meters, we'd deduct 24mils from 1229.<br/>
 For every extra 100 meters, you'd continue to add or subtract the mils in the forth column.<br/>

 Using page up or down, adjust the elevation of your mortar until the dial on the left shows the same.
 ![enter image description here](https://i.imgur.com/p4KoW1C.jpeg)

 5. At this point your gun should laid on the target correctly and ready to fire.

## The process
So you've slotted as a mortar team and now you're out on the frontline, ready to make it rain.
Lets go through the process you can/should expect from setting up, calculating, firing, and packing up (2 man crew)

**Situation:** You've received orders to move to a location where you will be capable of engaging forces in support of the assaulting element. 

**Setting up:** The battery/section commander will look for a location which'll provide optimal engagement ranges - Closer the better due to shorter time of flight of rounds, an area which'll also provide ample cover and/or concealment, with escape routes out in-case of an emergency, and ideally flat enough ground.

Once at your chosen location, the commander should quickly survey the area to see if it's okay.
If it is, the commander should be at this time contacting other callsigns to receive warning orders for fire-missions.
The gunner should be either collecting ammo into their inventory or unload an ammo create from the vehicle, as well as setting up and mouting their mortar, awaiting tasking from the battery commander.

- Commanders should also be aware of distance from nearest friendly forces. Being to separated can leave you exposed if attacked.

**Calculating:** Once a fire-mission has come through and the battery is ready to begin working.
The battery commander should ideally have his fire mission come over the radio in a format like below, which'll provide everything the battery needs to know to not only conduct the fire-mission accurately, but also prevent blue on blue, and give the required affect on target.
![enter image description here](https://i.imgur.com/U7IckYr.jpeg)
As the fire-mission is coming over the radio, the battery commander should have his map and map tools open, calculating the fire-mission, which should be the azimuth and range for the gunner.
As the commander calculates these two, he should read/speak it out loud to the gunner, who should read-back the information, which makes sure it's correct.

Confirming it's correct, the gunner will then input his azimuth into the mortar and do his range>elevation calculations.
Having input the information, the gunner will now wait for his fire orders.

**Firing:** The gunner is now waiting for the commander to tell him the affect required within this fire-mission.
At this time, the commander should relay to the gunner the follow information:

 - Type of round(s).
 - How many rounds.
 - How long to fire for.
 - When to fire.
 - The desired affect on target - Destroy, Neutralize, Harass.
 - The Nearest friendly unit - This is to help the gunner avoid shifting azimuth or elevation and hitting friendlies.

When the gunner has this final information, he should now know everything he needs to conduct that fire mission. 

**Packing up:** Leaving is the simple part, but knowing when to leave is key.
Mortars or artillery in general has a very audible and distinct noise that can easily be traced when firing.
Staying in one location to long could result in being bumped by the enemy and overrun, or even counter-battery fire.

Remember to pick up your mortar, load your ammo/equipment back into the vehicle, and relay to other callsigns that your artillery is offline and not available for X amount of time, as this allows other units to be aware of windows when they could be unsupported by fires.
