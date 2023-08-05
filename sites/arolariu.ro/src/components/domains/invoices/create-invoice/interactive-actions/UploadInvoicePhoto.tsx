/** @format */

"use client";

import useExtractImageData from "@/hooks/useExtractImageData";
import Image from "next/image";
import {useState} from "react";

const RenderImageConditionally = ({image}) => {
	if (image != null) {
		// TODO: this conditional should be more explicit and clear - we need to avoid arrow coding as well.
		if (image.type === "application/pdf") {
			return (
				<div className="mx-auto mb-10 w-2/3 md:w-1/2 lg:w-1/3 xl:w-1/4">
					<iframe
						title="Submitted receipt PDF"
						src={URL.createObjectURL(image)}
						width="100%"
						height="600px"></iframe>
				</div>
			);
		} else {
			return (
				<Image
					className="mx-auto mb-10 block w-2/3 rounded object-cover object-center md:w-1/2 lg:w-1/3 xl:w-1/4"
					alt="Submitted receipt image"
					src={URL.createObjectURL(image)}
					width={600}
					height={900}
				/>
			);
		}
	} else {
		return (
			<Image
				className="mx-auto mb-10 block w-2/3 rounded object-cover object-center md:w-1/2 lg:w-1/3 xl:w-1/4"
				alt="Default dummy image"
				src="https://dummyimage.com/600x900&text=placeholder"
				width={600}
				height={900}
			/>
		);
	}
};

const RenderNextStepButtonConditionally = ({
	image,
	setImage,
	setCurrentStep,
	setInvoiceIdentifier,
}) => {
	const {imageData, imageError, additionalMetadata} = useExtractImageData(image);

	// TODO: since this is a major method, maybe it should be extracted into the /lib folder?
	const sendInvoiceToBackend = async () => {
		const url = "https://api.arolariu.ro/api/invoices";
		if (imageError) {
			console.log("Error while extracting image data.");
			console.log(imageError);
		} else {
			const payload = {
				invoiceBase64Photo: imageData,
				additionalMetadata: additionalMetadata,
			};

			const options = {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			};

			const response = await fetch(url, options);
			const data = await response.json();
			console.log(data);

			const id = data.invoiceId;
			console.log("invoice id: " + id);

			if (id !== undefined || id !== null) {
				const payload = {id};

				const options = {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				};

				const response = await fetch(`https://api.arolariu.ro/api/invoices/${id}/analyze`, options);

				const data = await response.json();
				console.log(data);
				console.log("Kept id: " + id);
				setInvoiceIdentifier(id);
				setCurrentStep(2);
			}
		}
	};

	if (image != null) {
		return (
			<>
				<button
					className="btn btn-primary mx-auto mt-4"
					type="button"
					onClick={() => sendInvoiceToBackend(image)}>
					Continue to the next step
				</button>
				<button
					className="btn btn-secondary mx-auto mt-4"
					type="button"
					onClick={() => setImage(null)}>
					Clear image
				</button>
			</>
		);
	} else {
		return null;
	}
};

const RenderFormConditionally = ({handlePhotoUpload}) => {
	return (
		<div className="flex w-full flex-col text-center">
			<h1 className="title-font mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl font-medium text-transparent">
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
					className="file-input file-input-bordered w-full max-w-xs"
					onChange={handlePhotoUpload}
				/>
				<button type="submit" style={{display: "none"}} />
			</form>
		</div>
	);
};

const RenderErrorAlertConditionally = ({imageError}) => {
	return (
		<div
			className={`${
				imageError ? "opacity-100" : "h-0 w-0 overflow-hidden bg-black opacity-0"
			} container alert alert-error mx-auto flex w-1/2 flex-col transition-opacity duration-[1250ms] ease-in`}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span className="text-center">
				Error! Currently, we only accept receipts that have been saved as either:
			</span>
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

export default function UploadInvoicePhoto({setCurrentStep, setInvoiceIdentifier}) {
	const [image, setImage] = useState(null);
	const [imageError, setImageError] = useState(null);

	const handlePhotoUpload = async (event) => {
		event.preventDefault();
		const photo = event.target.files[0];
		const allowedFormats = ["image/jpeg", "image/png", "application/pdf"];
		if (allowedFormats.includes(photo.type)) {
			setImage(photo);
			setImageError(false);
		} else {
			setImageError(true);
			setTimeout(() => {
				setImageError(false);
			}, 7500);
		}
	};

	return (
		<div className="container flex flex-col">
			<RenderImageConditionally image={image} />
			<RenderFormConditionally handlePhotoUpload={handlePhotoUpload} />
			<RenderNextStepButtonConditionally
				image={image}
				setImage={setImage}
				setCurrentStep={setCurrentStep}
				setInvoiceIdentifier={setInvoiceIdentifier}
			/>
			<RenderErrorAlertConditionally imageError={imageError} />
		</div>
	);
}
