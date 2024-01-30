"use client";

import { useState } from "react";

export default function ContactForm() {
    const [formState, setFormState] = useState({
        name: "",
        contact: "",
        message: "",
    });
    
    // TODO: Implement the form submission logic.
    // TODO: implement the anonymous contact logic.

	return (
		<div className="mx-auto md:w-2/3 lg:w-1/2">
			<form className="flex flex-wrap -m-2">
					<div className="relative w-1/2 p-2">
						<label htmlFor="name" className="text-xl leading-7">
							Name
						</label>
						<input
							type="text"
							id="name"
							name="name"
							className="w-full px-3 py-1 text-base leading-8 transition-colors duration-200 ease-in-out bg-gray-100 border border-gray-300 rounded outline-none bg-opacity-10 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:text-black"
                            onChange={(e) => setFormState({...formState, name: e.target.value})}
						/>
					</div>
					<div className="relative w-1/2 p-2">
						<label htmlFor="contact" className="text-xl leading-7">
							Contact ID
						</label>
						<input
							type="text"
							id="contact"
							name="contact"
							className="w-full px-3 py-1 text-base leading-8 transition-colors duration-200 ease-in-out bg-gray-100 border border-gray-300 rounded outline-none bg-opacity-10 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:text-black"
                            onChange={(e) => setFormState({...formState, contact: e.target.value})}
						/>
					</div>
				<div className="relative w-full p-2">
						<label htmlFor="message" className="text-xl leading-7">
							Message
						</label>
						<textarea
							id="message"
							name="message"
							className="w-full h-32 px-3 py-1 text-base leading-6 transition-colors duration-200 ease-in-out bg-gray-100 border border-gray-300 rounded outline-none resize-none bg-opacity-10 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:text-black"
                            onChange={(e) => setFormState({...formState, message: e.target.value})}
                            />
					</div>
					<button type="submit" className="p-2 px-8 py-2 mx-auto mt-4 text-lg text-white bg-indigo-500 border-0 rounded 2xsm:w-1/2 lg:w-1/4 hover:bg-indigo-600 focus:outline-none">
						Send message
					</button>
			</form>
			<p className="block pt-8 my-16 text-xl font-bold leading-normal text-center text-indigo-500 border-t border-gray-200">THANK YOU.</p>
		</div>
	);
}
