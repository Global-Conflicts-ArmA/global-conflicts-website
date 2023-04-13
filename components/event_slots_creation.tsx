import { TrashIcon } from "@heroicons/react/outline";
import { useFormik } from "formik";
import { useState } from "react";
import { toast } from "react-toastify";
import EventNavBarFactionItem from "./event_navbar_faction_item";
import AddIcon from "./icons/add";

import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import React from "react";
import { v4 as uuidv4 } from 'uuid';


export default function EventsSlotsCreation({ currentMission, onAddFaction, onRemoveFaction }) {


    const [newReservableSlotName, setNewReservableSlotName] = useState(null);
    const [mission, setMission] = useState(currentMission);



    const [selectedFaction, setSelectedFaction] = useState(mission.factions[0]);


    const validateSlotForm = (values) => {
        const errors = {};
        if (!values.reservedSlotName) {
            errors["reservedSlotName"] = "Required";
        }
        if (!values.reservedSlotCount) {
            errors["reservedSlotCount"] = "Required";
        }
        return errors;
    };
    const newSlotFormik = useFormik({
        initialValues: {
            reservedSlotName: "",
            reservedSlotDescription: "",
            reservedSlotCount: "",
        },
        validate: validateSlotForm,
        onSubmit: (values) => {



            const found = selectedFaction.slots.findIndex(
                (rs) => rs.name == values.reservedSlotName
            );
            if (found != -1) {
                toast.error("You already inserted a slot with this name.");
                return;
            }

            selectedFaction.slots = [
                ...selectedFaction.slots,
                {
                    name: values.reservedSlotName,
                    uuid: uuidv4(),
                    description: values.reservedSlotDescription,
                    count: values.reservedSlotCount,
                },
            ];
            setSelectedFaction({ ...selectedFaction });

            newSlotFormik.resetForm();
        },
    });

    const reorder = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        return result;
    };
    const onDragEnd = (result) => {
        if (!result.destination) {
            return;
        }
        selectedFaction.slots = reorder(
            selectedFaction.slots,
            result.source.index,
            result.destination.index
        );

        setSelectedFaction(selectedFaction);
    };


    return <>

        <aside className={"px-4 py-6 relative h-full overflow-y-auto "}>
            <nav>
                <div className="flex flex-row space-x-2 mb-5">
                    <div className="form-control flex-1">
                        <input
                            placeholder="New faction name"
                            value={newReservableSlotName}
                            onChange={(e) => {
                                if (e.target.value) {
                                    setNewReservableSlotName(e.target.value);
                                } else {
                                    setNewReservableSlotName(null);
                                }
                            }}
                            className="input input-bordered"
                        />
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            if (!newReservableSlotName) {
                                return;
                            }
                            const factionName = newReservableSlotName.trim();
                            if (factionName == "") {
                                return;
                            }
                            const newOne = {
                                name: factionName,
                                slots: [],
                            };

                            onAddFaction(newOne)
                        }}
                    >
                        <AddIcon></AddIcon>
                    </button>
                </div>
                <div key={mission.factions.lenght}>
                    {mission.factions?.map((reservableSlotsInfo) => (
                        <ul key={reservableSlotsInfo.name} className="">
                            <div className="flex flex-row items-center">
                                <EventNavBarFactionItem
                                    item={reservableSlotsInfo}
                                    isSelected={
                                        reservableSlotsInfo.name ==
                                        selectedFaction?.name
                                    }
                                    onClick={(item) => {
                                        setSelectedFaction(item);
                                    }}
                                ></EventNavBarFactionItem>

                                {mission.factions.length > 1 && (
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => {
                                            const newList = mission.factions.filter(
                                                (e) => e.name !== reservableSlotsInfo.name
                                            );
                                            const t = { ...mission, factions: newList };
                                            console.log(t)
                                            onRemoveFaction(reservableSlotsInfo)


                                        }}
                                    >
                                        <TrashIcon height={25} className="prose"></TrashIcon>
                                    </button>
                                )}
                            </div>
                        </ul>
                    ))}
                </div>
            </nav>
        </aside>
        <main className="flex-grow">
            <div>
                <form onSubmit={newSlotFormik.handleSubmit}>
                    <div className="flex flex-row space-x-2">
                        <div className="flex-1 space-y-2">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Slot name</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Rifleman AT"
                                    name="reservedSlotName"
                                    onChange={newSlotFormik.handleChange}
                                    onBlur={newSlotFormik.handleBlur}
                                    value={newSlotFormik.values.reservedSlotName}
                                    className="input input-bordered"
                                />

                                <span className="text-red-500 label-text-alt">
                                    {newSlotFormik.errors.reservedSlotName}
                                </span>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Description (Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Description"
                                    name="reservedSlotDescription"
                                    onChange={newSlotFormik.handleChange}
                                    onBlur={newSlotFormik.handleBlur}
                                    value={newSlotFormik.values.reservedSlotDescription}
                                    className="input input-bordered "
                                />
                            </div>
                        </div>
                        <div className="flex flex-col justify-between space-y-2">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Count</span>
                                </label>
                                <input
                                    placeholder="Count"
                                    name="reservedSlotCount"
                                    onBlur={newSlotFormik.handleBlur}
                                    onChange={(e) => {
                                        const re = /^[0-9\b]+$/;
                                        if (e.target.value === "" || re.test(e.target.value)) {
                                            newSlotFormik.handleChange(e);
                                        }
                                    }}
                                    value={newSlotFormik.values.reservedSlotCount}
                                    className="input input-bordered"
                                />
                                <span className="text-red-500 label-text-alt">
                                    {newSlotFormik.errors.reservedSlotCount}
                                </span>
                            </div>
                            <button className="btn btn-block" type="submit">
                                Add
                            </button>
                        </div>
                    </div>
                </form>

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="droppable">
                        {(provided, dropSnapshot) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="p-2 space-y-5 "
                            >
                                {selectedFaction?.slots?.map((item, index) => (
                                    <Draggable
                                        key={item.uuid}
                                        draggableId={item.name}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                            >
                                                <div className="flex p-5 bg-white dark:bg-gray-800 rounded-lg shadow-md outline-none py-4transition-all focus:outline-none">
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center w-full">
                                                            <div className="w-full text-sm">
                                                                <div className="flex flex-row justify-between font-medium">
                                                                    <div className="h-10">

                                                                        <input type="text"
                                                                            value={item.name}
                                                                            placeholder="Type a name for the slot"
                                                                            className="input w-full max-w-xs"
                                                                            onChange={(val) => {
                                                                                selectedFaction.slots[index].name = val.target.value;
                                                                                setSelectedFaction({ ...selectedFaction });
                                                                            }}
                                                                        />
                                                                    </div>



                                                                    <button
                                                                        className="btn btn-sm btn-ghost dark:text-white"
                                                                        onClick={() => {
                                                                            selectedFaction.slots =
                                                                                selectedFaction.slots.filter(
                                                                                    (rs) => rs.name != item.name
                                                                                );
                                                                            setSelectedFaction({ ...selectedFaction });
                                                                        }}
                                                                    >
                                                                        <TrashIcon height={15}></TrashIcon>
                                                                    </button>

                                                                </div>

                                                                <div className="flex flex-row justify-between w-full mt-3  ">
                                                                    <input type="text"
                                                                        value={item.description}
                                                                        placeholder="Type a description for the slot"
                                                                        className="input w-full max-w-xs"
                                                                        onChange={(val) => {
                                                                            selectedFaction.slots[index].description = val.target.value;
                                                                            setSelectedFaction({ ...selectedFaction });
                                                                        }}
                                                                    />


                                                                    <div className="prose">
                                                                    <input type="text"
                                                                        value={item.count}
                                                                        placeholder="#"
                                                                        className="input w-10 max-w-xs p-0 m-0 h-10 text-center"
                                                                        onBlur={(val)=>{
                                                                            if(!selectedFaction.slots[index].count ||selectedFaction.slots[index].count=="0" ){
                                                                                selectedFaction.slots[index].count = 1
                                                                                setSelectedFaction({ ...selectedFaction });
                                                                            }

                                                                        }}
                                                                        onChange={(val) => {
                                                                            selectedFaction.slots[index].count = val.target.value;
                                                                            setSelectedFaction({ ...selectedFaction });
                                                                        }}
                                                                    />  {item.count > 1 ? "slots" : "slot"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
        </main>

    </>;
}











