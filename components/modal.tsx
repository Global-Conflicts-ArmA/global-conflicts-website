import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useEffect, useRef, useState } from "react";

export default function Modal({ show, onClose }) {
   let refDiv = useRef(null)
	return (
		<Dialog open={show} onClose={() => onClose(false)}>
			<Dialog.Overlay />

			<Dialog.Title>Deactivate account</Dialog.Title>
			<Dialog.Description>
				This will permanently deactivate your account
			</Dialog.Description>


         <div ref={refDiv}>
         <p>
				Are you sure you want to deactivate your account? All of your data will be
				permanently removed. This action cannot be undone.
			</p>
         </div>
		
		</Dialog>
	);
}
