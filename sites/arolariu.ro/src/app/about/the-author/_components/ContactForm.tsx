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
				<div className="w-1/2 p-2">
					<div className="relative">
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
				</div>
				<div className="w-1/2 p-2">
					<div className="relative">
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
				</div>
				<div className="w-full p-2">
					<div className="relative">
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
				</div>
				<div className="w-full p-2">
					<button type="submit" className="flex px-8 py-2 mx-auto text-lg text-white bg-indigo-500 border-0 rounded hover:bg-indigo-600 focus:outline-none">
						Send message
					</button>
				</div>
				<div className="w-full p-2 pt-8 mt-8 text-center border-t border-gray-200">
					<p className="my-5 text-xl font-bold leading-normal text-indigo-500">THANK YOU.</p>
				</div>
			</form>
		</div>
	);
}
