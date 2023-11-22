"use client";

import {API_URL} from "@/lib/constants";
import CreateInvoiceDto from "@/types/DTOs/CreateInvoiceDto";
import {KeyValuePair} from "@/types/KvPair";
import {useUser} from "@clerk/nextjs";
import {useState} from "react";
import CreateInvoiceImagePreview from "./CreateInvoiceImagePreview";
import CreateInvoiceNextStepsButtons from "./CreateInvoiceNextStepsButtons";

interface Props {
	// eslint-disable-next-line no-unused-vars
	setCurrentStep: (step: number) => void;
	// eslint-disable-next-line no-unused-vars
	setInvoiceIdentifier: (identifier: string) => void;
}

const AlertNotification = () => {
	return (
		<div className="container alert alert-error mx-auto flex w-1/2 flex-col opacity-100 transition-opacity duration-[1250ms] ease-in">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="w-6 h-6 stroke-current shrink-0"
				fill="none"
				viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span className="text-center">Error! Currently, we only accept receipts that have been saved as either:</span>
			<ol>
				<li>
					1. <strong>JPG / JPEG</strong> format.
				</li>
				<li>
					2. <strong>PNG</strong> format.
				</li>
				<li>
					3. <strong>PDF</strong> format.
				</li>
			</ol>
			<span>Please upload a new digital scan of your physical receipt.</span>
		</div>
	);
};

export default function UploadInvoicePhoto({setCurrentStep, setInvoiceIdentifier}: Props) {
	const {user} = useUser();
	const [imageBlob, setImageBlob] = useState<Blob>(null!);
	const [imageError, setImageError] = useState<boolean>(false);

	const handlePhotoUpload = async (event: any) => {
		event.preventDefault();
		const photo = event.target.files[0] as Blob;
		const allowedFormats = ["image/jpeg", "image/png", "application/pdf"];
		if (allowedFormats.includes(photo.type)) {
			setImageBlob(photo);
			setImageError(false);
		} else {
			setImageError(true);
			setTimeout(() => {
				setImageError(false);
			}, 7500);
		}
	};

	const sendInvoiceToBackend = async (image: Blob) => {
		const imageBuffer = await image.arrayBuffer();
		const base64Image = Buffer.from(imageBuffer).toString("base64");
		const dataUrl = `data:${image.type};base64,${base64Image}`;
		console.log("Data Url:" + dataUrl)

		const photoLocation = "https://test.com";
		const photoMetadata: KeyValuePair<string, object>[] = [];

		// check if user is authenticated, if so, add his metadata:
		if (user) {
			photoMetadata.push({key: "user", value: user});
		}

		const payload = {photoLocation, photoMetadata} satisfies CreateInvoiceDto;
		const response = await fetch(API_URL + "/rest/invoices", {
			method: "POST",
			body: JSON.stringify(payload),
			headers: {"Content-Type": "application/json"},
		});
		console.log("Response: " + response)

		// TODO: uncomment after backend is ready
		//const json = await response.json();
		//const id = json.id;
		setInvoiceIdentifier("f7cfcf2c-1b38-4fa1-b0ff-ef38c7694dd7");
		setCurrentStep(2);
		return //json;
	};

	return (
		<div className="container flex flex-col">
			{/* Image preview */}
			<CreateInvoiceImagePreview image={imageBlob} />

			{/* Call to action */}
			<div className="flex flex-col w-full text-center">
				<h1 className="mb-4 text-xl font-medium text-transparent title-font bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
					<strong>UPLOAD A PICTURE OF THE PAPER RECEIPT</strong>
				</h1>
				<p className="mx-auto text-base leading-relaxed lg:w-2/3">
					Carefully photograph or scan your paper receipt. <br />
					Attach the digital image from your device, here.
				</p>

				<form className="container my-5">
					<input
						type="file"
						name="file"
						className="w-full max-w-xs file-input file-input-bordered"
						title="Test"
						onChange={handlePhotoUpload}
					/>
					<button type="submit" title="Submit" className="hidden" />
				</form>
			</div>

			{/* Next steps */}
			<CreateInvoiceNextStepsButtons
				imageBlob={imageBlob}
				sendInvoiceToBackend={sendInvoiceToBackend}
				setImageBlob={setImageBlob}
			/>

			{/* Alert notification */}
			{imageError && <AlertNotification />}
		</div>
	);
}
