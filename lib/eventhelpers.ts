import axios from 'axios';
import { toast } from 'react-toastify';

export async function callReserveSlot(
    event,
    onSuccess,
    onError,
    eventMissionList
) {
    axios
        .post("/api/events/reserve", {
            eventId: event._id,
            eventMissionList
        })
        .then((response) => {
            onSuccess();
        })
        .catch((error) => {
            toast.error(error.response.data.error);
            onError();
        });
}

export async function callCantMakeIt(event, onSuccess, onError, cantMakeIt) {
    axios
        .post("/api/events/cant_make_it", {
            eventId: event._id,

            cantMakeIt: cantMakeIt,
        })
        .then((response) => {
            onSuccess();
        })
        .catch((error) => {
            onError();
        });
}

export async function callSignUp(event, onSuccess, onError, doSignup) {
    axios
        .post("/api/events/sign_up", {
            eventId: event._id,
            doSignup: doSignup,
        })
        .then((response) => {
            onSuccess();
        })
        .catch((error) => {
            onError();
        });
}

export function hasReservableSlots(event) {
    var has = false;
    if (!event.eventMissionList) {
        return false;
    }
    for (let index = 0; index < event.eventMissionList.length; index++) {
        const mission = event.eventMissionList[index];
        for (let index = 0; index < mission.factions.length; index++) {
            const faction = mission.factions[index];
            if (faction.slots.length >= 1) {
                has = true;
            }
        }
    }
    return has;
}

export function getPreviewImage(where: string, event) {
    if (event.imageLink.includes(".webm") || event.imageLink.includes(".mp4")) {
        if (where == "twitter") {
            return "https://gc-next-website.vercel.app/twitterimage.jpg";
        }
        return "https://gc-next-website.vercel.app/twitterimage.jpg";
    } else {
        return `https://gc-next-website.vercel.app${event.imageLink}`;
    }
}

export function getSelectedSlotNameForMission(mission) {

    if (!mission.reservedSlot) {
        return "No reserved slot"
    }
    return mission.reservedFactionName + " > " + mission.reservedSlot.name;
}

export function getSlottedCount(missionId, factionId, slotId, roster) {
    if (!roster) {
        return 0;
    };
    return roster.filter(mission => mission._id == missionId)[0].factions.filter(faction => faction._id == factionId)[0].slots.filter(slot => slot._id == slotId)[0].players?.length
}

export function hasOneReservedSlot(workingEvent) {
    if (!workingEvent.eventMissionList) {
        return false;
    }
    for (const mission of workingEvent.eventMissionList) {
        if (mission.reservedSlot) {
            return true;
        }
    }
}

export function getSelectedMission(workingEvent, selectedMission) {
    return workingEvent.eventMissionList.filter((mission => { return mission._id == selectedMission._id }))[0]
}
export function getRadioOptionClasses(checked, isFull) {
    if (checked && isFull) {
        return "bg-primary cursor-pointer"
    }
    if (isFull && !checked) {
        return "dark:bg-gray-500 bg-gray-300 text-gray-500  dark:text-gray-300 cursor-not-allowed"
    }
    if (checked && !isFull) {
        return "bg-primary cursor-pointer"
    }
    if (!checked && !isFull) {
        return "dark:bg-gray-700 cursor-pointer" 
    }
}