/** @format */

"use client";

import {getSession} from "next-auth/react";
import Image from "next/image";
import {useState} from "react";

interface Props {
	// eslint-disable-next-line no-unused-vars
	setCurrentStep: (step: number) => void;
	// eslint-disable-next-line no-unused-vars
	setInvoiceIdentifier: (identifier: string) => void;
}

export default function UploadInvoicePhoto({setCurrentStep, setInvoiceIdentifier}: Props) {
	const [imageBlob, setImageBlob] = useState<Blob>(null!);
	const [imageError, setImageError] = useState<boolean>(false);

	const styledAlert = " opacity-100 "; // whitespace acts as CSS guards
	const unstyledAlert = " h-0 w-0 overflow-hidden bg-black opacity-0 ";
	const isStyledAlert = imageError ? styledAlert : unstyledAlert;

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
		const session = await getSession();
		const imageBuffer = await image.arrayBuffer();
		const base64Image = Buffer.from(imageBuffer).toString("base64");
		const dataUrl = `data:${image.type};base64,${base64Image}`;

		const jsonPayload = {
			invoiceBase64Photo: dataUrl,
			additionalMetadata: [
				{
					key: "Username",
					value: session!.user?.name,
				},
				{
					key: "Email",
					value: session!.user?.email,
				},
			],
		};

		const response = await fetch("https://api.arolariu.ro/rest/invoices", {
			method: "POST",
			body: JSON.stringify(jsonPayload),
			headers: {
				"Content-Type": "application/json",
			},
		});

		const json = await response.json();
		const id = json.id;
		setInvoiceIdentifier(id);
		setCurrentStep(2);
		return json;
	};

	return (
		<div className="container flex flex-col">
			{/* ====================================== */}
			{/* Started Render Image Preview Section */}
			{/* ====================================== */}
			<RenderImagePreview image={imageBlob} />
			{/* ====================================== */}
			{/* Finished Render Image Preview Section */}
			{/* ====================================== */}

			{/* ====================================== */}
			{/* Started Render Call-To-Action Section */}
			{/* ====================================== */}
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
						title="Test"
						onChange={handlePhotoUpload}
					/>
					<button type="submit" title="Submit" className="hidden" />
				</form>
			</div>
			{/* ====================================== */}
			{/* Finished Render Call-To-Action Section */}
			{/* ====================================== */}

			{/* ====================================== */}
			{/* Started Render Next Step CTA Section */}
			{/* ====================================== */}
			{imageBlob != null && (
				<div className="container flex flex-col">
					<button
						className="btn btn-primary mx-auto mt-4"
						type="button"
						onClick={() => sendInvoiceToBackend(imageBlob)}>
						Continue to the next step
					</button>
					<button
						className="btn btn-secondary mx-auto mt-4"
						type="button"
						onClick={() => setImageBlob(null!)}>
						Clear image
					</button>
				</div>
			)}
			{/* ====================================== */}
			{/* Finished Render Next Step CTA Section */}
			{/* ====================================== */}

			{/* ====================================== */}
			{/* Started Render File Extension Alert Section */}
			{/* ====================================== */}
			<div
				className={`${isStyledAlert} container alert alert-error mx-auto flex w-1/2 flex-col transition-opacity duration-[1250ms] ease-in`}>
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
			{/* ====================================== */}
			{/* Finished Render File Extension Alert Section */}
			{/* ====================================== */}
		</div>
	);
}

const RenderImagePreview = ({image}: {image: Blob}) => {
	if (image != null) {
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
